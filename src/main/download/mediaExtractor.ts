import { spawn, spawnSync, execFile } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import type { ProbeResult } from '../../shared/types'

// Path to bundled yt-dlp binary
export function getYtDlpPath(): string {
  const isPackaged = typeof app !== 'undefined' && app ? app.isPackaged : false
  if (isPackaged) {
    return path.join(process.resourcesPath, 'bin', 'yt-dlp.exe')
  }
  const candidates = [
    path.resolve('bin', 'yt-dlp.exe'),
    path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe'),
    path.join(__dirname, '..', '..', '..', 'bin', 'yt-dlp.exe'),
    path.resolve(process.cwd(), 'bin', 'yt-dlp.exe')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return path.resolve('bin', 'yt-dlp.exe')
}

// Path to bundled ffmpeg binary
export function getFfmpegPath(): string {
  const isPackaged = typeof app !== 'undefined' && app ? app.isPackaged : false
  if (isPackaged) {
    const p = path.join(process.resourcesPath, 'bin', 'ffmpeg.exe')
    if (fs.existsSync(p)) return p
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ffmpeg = require('ffmpeg-static')
    if (ffmpeg && fs.existsSync(ffmpeg)) return ffmpeg
  } catch {}
  const candidates = [
    path.resolve('node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(__dirname, '..', '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
    path.join(__dirname, '..', '..', 'bin', 'ffmpeg.exe')
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) return c
  }
  return ''
}

export function isMediaPlatformUrl(url: string): boolean {
  const u = url.toLowerCase()
  return /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|reddit\.com|facebook\.com|fb\.watch|soundcloud\.com|vimeo\.com|twitch\.tv/.test(
    u
  )
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').slice(0, 150)
}

export function extractMediaInfo(url: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const ytDlp = getYtDlpPath()

    execFile(
      ytDlp,
      ['--dump-json', '--no-playlist', '--js-runtimes', 'node', url],
      { maxBuffer: 10 * 1024 * 1024, timeout: 25000 },
      (err, stdout, stderr) => {
        if (err) {
          return reject(new Error(stderr || err.message))
        }

        try {
          const data = JSON.parse(stdout)
          const title = data.title || 'Video'
          const ext = 'mp4' // Standardize output to MP4
          const filename = `${sanitizeFilename(title)}.${ext}`
          const totalBytes = data.filesize || data.filesize_approx || 0

          resolve({
            url,
            filename,
            totalBytes,
            supportsRange: true,
            etag: null,
            lastModified: null,
            contentType: 'video/mp4',
            isWebPage: false,
            isMediaPlatform: true,
            thumbnail: data.thumbnail || undefined
          })
        } catch (parseErr) {
          reject(new Error('Failed to parse media metadata'))
        }
      }
    )
  })
}

export interface MediaDownloadProgress {
  percent: number
  downloadedBytes: number
  totalBytes: number
  speedBps: number
  etaSeconds: number | null
}

export function downloadMedia(
  url: string,
  destinationPath: string,
  onProgress: (prog: MediaDownloadProgress) => void,
  signal: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error('Aborted'))

    const ytDlp = getYtDlpPath()
    const ffmpeg = getFfmpegPath()

    const args = [
      '--js-runtimes',
      'node',
      '--no-playlist',
      '--merge-output-format',
      'mp4',
      '--newline',
      '--progress-template',
      'netmerger:%(progress._percent_str)s|%(progress._downloaded_bytes_str)s|%(progress._total_bytes_str)s|%(progress._speed_str)s|%(progress._eta_str)s',
      '-o',
      destinationPath,
      url
    ]

    if (ffmpeg) {
      args.unshift('--ffmpeg-location', ffmpeg)
    }

    const proc = spawn(ytDlp, args)

    let errorOutput = ''

    const onAbort = () => {
      if (proc.pid) {
        if (process.platform === 'win32') {
          try {
            spawnSync('taskkill', ['/pid', proc.pid.toString(), '/T', '/F'])
          } catch {}
        } else {
          proc.kill('SIGKILL')
        }
      }
      reject(new Error('Aborted'))
    }

    signal.addEventListener('abort', onAbort)

    let lastDownloadedBytes = 0
    let lastTotalBytes = 0

    proc.stdout.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      const lines = text.split(/\r?\n/)

      for (const line of lines) {
        if (line.startsWith('netmerger:')) {
          const parts = line.slice(10).split('|')
          if (parts.length >= 5) {
            const rawPercent = parseFloat(parts[0].replace('%', '').trim()) || 0
            let downloadedBytes = parseByteStr(parts[1].trim())
            let totalBytes = parseByteStr(parts[2].trim())
            const speedBps = parseByteStr(parts[3].trim())
            const etaSeconds = parseEta(parts[4].trim())

            if (totalBytes > 0) {
              lastTotalBytes = totalBytes
            } else if (lastTotalBytes > 0) {
              totalBytes = lastTotalBytes
            }

            if (downloadedBytes > 0) {
              lastDownloadedBytes = downloadedBytes
            } else if (rawPercent >= 99 && totalBytes > 0) {
              downloadedBytes = totalBytes
              lastDownloadedBytes = downloadedBytes
            } else if (lastDownloadedBytes > 0) {
              downloadedBytes = lastDownloadedBytes
            }

            onProgress({
              percent: rawPercent,
              downloadedBytes,
              totalBytes,
              speedBps,
              etaSeconds
            })
          }
        }
      }
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      errorOutput += chunk.toString()
    })

    proc.on('close', (code) => {
      signal.removeEventListener('abort', onAbort)
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(errorOutput || `Download process exited with code ${code}`))
      }
    })

    proc.on('error', (err) => {
      signal.removeEventListener('abort', onAbort)
      reject(err)
    })
  })
}

function parseByteStr(str: string): number {
  if (!str || str === 'NA' || str === 'Unknown') return 0
  const match = /^([\d.]+)\s*([A-Za-z]+)?/i.exec(str)
  if (!match) return 0
  const num = parseFloat(match[1])
  const unit = (match[2] || '').toUpperCase()

  if (unit.startsWith('K')) return Math.round(num * 1024)
  if (unit.startsWith('M')) return Math.round(num * 1024 * 1024)
  if (unit.startsWith('G')) return Math.round(num * 1024 * 1024 * 1024)
  if (unit.startsWith('T')) return Math.round(num * 1024 * 1024 * 1024 * 1024)
  return Math.round(num)
}

function parseEta(str: string): number | null {
  if (!str || str.includes('Unknown') || str === 'NA') return null
  const parts = str.split(':').map((p) => parseInt(p, 10))
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}
