import { promises as fs, createReadStream, createWriteStream } from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import type { ChunkInfo, DownloadTask } from '../../shared/types'
import { downloadChunkToFile } from './chunkDownloader'
import { downloadMedia } from './mediaExtractor'
import type { NetworkManager } from '../network/interfaces'

const CHUNK_SIZE = 8 * 1024 * 1024 // 8 MB default chunk size
const MAX_CONCURRENT_PER_INTERFACE = 4

export class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map()
  private abortControllers: Map<string, AbortController> = new Map()
  private speedSamples: Map<string, { bytes: number; lastTime: number }> = new Map()
  private onUpdateCallback?: (tasks: DownloadTask[]) => void

  constructor(private networkManager: NetworkManager) {
    this.startGlobalSpeedTicker()
  }

  public setOnUpdate(cb: (tasks: DownloadTask[]) => void) {
    this.onUpdateCallback = cb
  }

  private notify() {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.getAllTasks())
    }
  }

  public getAllTasks(): DownloadTask[] {
    const list = Array.from(this.tasks.values())
    for (const t of list) {
      if (t.status === 'completed' && t.downloadedBytes === 0) {
        try {
          const fs = require('node:fs')
          if (fs.existsSync(t.destinationPath)) {
            const sz = fs.statSync(t.destinationPath).size
            t.downloadedBytes = sz
            t.totalBytes = sz
            if (t.chunks[0]) {
              t.chunks[0].downloadedBytes = sz
              t.chunks[0].totalBytes = sz
              t.chunks[0].status = 'completed'
            }
          }
        } catch {}
      }
    }
    return list
  }

  public getTask(id: string): DownloadTask | undefined {
    return this.tasks.get(id)
  }

  private startGlobalSpeedTicker() {
    setInterval(() => {
      const now = Date.now()
      for (const task of this.tasks.values()) {
        if (task.status === 'downloading') {
          const sample = this.speedSamples.get(task.id)
          if (sample) {
            const timeDiff = (now - sample.lastTime) / 1000
            if (timeDiff >= 0.8) {
              const speed = Math.round(sample.bytes / timeDiff)
              task.speedBps = speed
              sample.bytes = 0
              sample.lastTime = now

              if (speed > 0 && task.totalBytes > 0) {
                const remaining = Math.max(0, task.totalBytes - task.downloadedBytes)
                task.etaSeconds = Math.round(remaining / speed)
              } else {
                task.etaSeconds = null
              }
            }
          }
        } else {
          task.speedBps = 0
          task.etaSeconds = null
        }
      }
      this.notify()
    }, 1000)
  }

  public async createDownload(
    url: string,
    filename: string,
    totalBytes: number,
    destinationDir: string,
    supportsRange: boolean,
    etag: string | null = null,
    lastModified: string | null = null,
    isMediaPlatform = false,
    thumbnail?: string
  ): Promise<string> {
    const id = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    let effectiveDir = destinationDir
    try {
      if (!effectiveDir) effectiveDir = app.getPath('downloads')
    } catch {
      effectiveDir = process.env.USERPROFILE ? `${process.env.USERPROFILE}\\Downloads` : '.'
    }
    const finalPath = path.join(effectiveDir, filename)

    // Compute chunks
    const chunks: ChunkInfo[] = []
    if (supportsRange && totalBytes > 0 && !isMediaPlatform) {
      // For small files (< 16 MB), use smaller chunks (e.g. 2 MB) to utilize multiple interfaces
      const effectiveChunkSize = totalBytes < 16 * 1024 * 1024 ? Math.max(1024 * 1024, Math.floor(totalBytes / 4)) : CHUNK_SIZE
      let currentOffset = 0
      let index = 0

      while (currentOffset < totalBytes) {
        const end = Math.min(currentOffset + effectiveChunkSize - 1, totalBytes - 1)
        chunks.push({
          index,
          start: currentOffset,
          end,
          totalBytes: end - currentOffset + 1,
          downloadedBytes: 0,
          status: 'pending'
        })
        currentOffset = end + 1
        index++
      }
    } else {
      // Single chunk fallback for media platforms or servers that don't support range
      chunks.push({
        index: 0,
        start: 0,
        end: totalBytes > 0 ? totalBytes - 1 : 0,
        totalBytes: totalBytes,
        downloadedBytes: 0,
        status: 'pending'
      })
    }

    const task: DownloadTask = {
      id,
      url,
      filename,
      destinationPath: finalPath,
      totalBytes,
      downloadedBytes: 0,
      status: 'idle',
      supportsRange,
      etag,
      lastModified,
      chunks,
      speedBps: 0,
      etaSeconds: null,
      createdAt: Date.now(),
      isMediaPlatform,
      thumbnail
    }

    this.tasks.set(id, task)
    this.speedSamples.set(id, { bytes: 0, lastTime: Date.now() })
    this.notify()

    // Start download process immediately
    this.startDownloadExecution(id)
    return id
  }

  private async getTempDir(taskId: string): Promise<string> {
    const tempBase = path.join(app.getPath('userData'), 'downloads', taskId)
    await fs.mkdir(tempBase, { recursive: true })
    return tempBase
  }

  private async startDownloadExecution(taskId: string) {
    const task = this.tasks.get(taskId)
    if (!task) return

    if (task.isMediaPlatform) {
      const abortController = new AbortController()
      this.abortControllers.set(taskId, abortController)
      task.status = 'downloading'
      this.notify()

      try {
        const destDir = path.dirname(task.destinationPath)
        await fs.mkdir(destDir, { recursive: true })

        await downloadMedia(
          task.url,
          task.destinationPath,
          (prog) => {
            task.downloadedBytes = prog.downloadedBytes
            if (prog.totalBytes > 0) {
              task.totalBytes = prog.totalBytes
              if (task.chunks[0]) task.chunks[0].totalBytes = prog.totalBytes
            }
            if (task.chunks[0]) task.chunks[0].downloadedBytes = prog.downloadedBytes
            task.speedBps = prog.speedBps
            task.etaSeconds = prog.etaSeconds
            this.notify()
          },
          abortController.signal
        )

        task.status = 'completed'
        task.speedBps = 0
        task.etaSeconds = null

        // Guarantee accurate final file size from disk
        try {
          const st = await fs.stat(task.destinationPath)
          task.downloadedBytes = st.size
          task.totalBytes = st.size
          if (task.chunks[0]) {
            task.chunks[0].downloadedBytes = st.size
            task.chunks[0].totalBytes = st.size
            task.chunks[0].status = 'completed'
          }
        } catch {
          if (task.totalBytes === 0) task.totalBytes = task.downloadedBytes
          if (task.chunks[0]) task.chunks[0].status = 'completed'
        }
        this.notify()
      } catch (err: any) {
        if (!abortController.signal.aborted) {
          task.status = 'error'
          task.errorMessage = err?.message || 'Media download failed'
          this.notify()
        }
      }
      return
    }

    task.status = 'downloading'
    this.notify()

    const abortController = new AbortController()
    this.abortControllers.set(taskId, abortController)

    const tempDir = await this.getTempDir(taskId)
    const activeInterfaces = this.networkManager.getActiveInterfaces()

    // Fallback to default if no active interfaces discovered
    const interfacesToUse =
      activeInterfaces.length > 0
        ? activeInterfaces
        : [
            {
              id: 'default',
              name: 'Default',
              description: 'Default System Interface',
              ip: '',
              kind: 'other' as const,
              enabled: true,
              color: '#3b82f6',
              currentSpeedBps: 0,
              totalBytesDownloaded: 0
            }
          ]

    // Work-stealing queue loop
    const pendingChunks = task.chunks.filter((c) => c.status !== 'completed')

    // Create worker pool: up to MAX_CONCURRENT_PER_INTERFACE workers for each network card
    const workers: Promise<void>[] = []

    for (const iface of interfacesToUse) {
      const workerCount = task.supportsRange ? MAX_CONCURRENT_PER_INTERFACE : 1
      for (let w = 0; w < workerCount; w++) {
        workers.push(
          (async () => {
            while (true) {
              if (abortController.signal.aborted || task.status !== 'downloading') {
                break
              }

              // Steal next pending chunk
              const chunk = pendingChunks.find((c) => c.status === 'pending')
              if (!chunk) break

              chunk.status = 'downloading'
              chunk.assignedInterfaceId = iface.id
              chunk.assignedColor = iface.color
              this.notify()

              const partFile = path.join(tempDir, `part_${chunk.index}.part`)

              let chunkBytesRead = 0
              try {
                await downloadChunkToFile({
                  url: task.url,
                  rangeStart: chunk.start,
                  rangeEnd: chunk.end,
                  localAddress: iface.ip,
                  partFilePath: partFile,
                  signal: abortController.signal,
                  supportsRange: task.supportsRange,
                  onProgress: (bytesRead) => {
                    chunkBytesRead += bytesRead
                    chunk.downloadedBytes += bytesRead
                    task.downloadedBytes += bytesRead

                    const sample = this.speedSamples.get(taskId)
                    if (sample) sample.bytes += bytesRead

                    this.networkManager.recordBytes(iface.id, bytesRead)
                  }
                })

                chunk.status = 'completed'
                this.notify()
              } catch (err: any) {
                // Roll back any partially recorded bytes from this failed attempt to prevent double-counting
                if (chunkBytesRead > 0) {
                  chunk.downloadedBytes = Math.max(0, chunk.downloadedBytes - chunkBytesRead)
                  task.downloadedBytes = Math.max(0, task.downloadedBytes - chunkBytesRead)
                }

                if (abortController.signal.aborted) {
                  chunk.status = 'pending'
                  break
                }

                // If error/stalled, put chunk back in queue for another worker or retry
                console.warn(`Chunk ${chunk.index} failed on ${iface.name}: ${err?.message || err}`)
                chunk.status = 'pending'
                chunk.assignedInterfaceId = undefined
                chunk.assignedColor = undefined
                // Wait briefly before retrying to avoid spinning on persistent errors
                await new Promise((r) => setTimeout(r, 1000))
              }
            }
          })()
        )
      }
    }

    try {
      await Promise.all(workers)

      if (abortController.signal.aborted || task.status !== 'downloading') {
        return
      }

      // Check if all chunks completed
      const allDone = task.chunks.every((c) => c.status === 'completed')
      if (allDone) {
        if (task.totalBytes === 0 && task.downloadedBytes > 0) {
          task.totalBytes = task.downloadedBytes
          if (task.chunks[0]) {
            task.chunks[0].totalBytes = task.downloadedBytes
          }
        }
        await this.mergeChunks(task, tempDir)
      }
    } catch (err: any) {
      if (!abortController.signal.aborted) {
        task.status = 'error'
        task.errorMessage = err?.message || 'Download failed'
        this.notify()
      }
    }
  }

  private async mergeChunks(task: DownloadTask, tempDir: string) {
    task.status = 'merging'
    this.notify()

    try {
      const destDir = path.dirname(task.destinationPath)
      await fs.mkdir(destDir, { recursive: true })

      const outStream = createWriteStream(task.destinationPath, { flags: 'w' })

      for (let i = 0; i < task.chunks.length; i++) {
        const partFile = path.join(tempDir, `part_${i}.part`)
        await new Promise<void>((resolve, reject) => {
          const inStream = createReadStream(partFile)
          inStream.pipe(outStream, { end: false })
          inStream.on('end', resolve)
          inStream.on('error', reject)
        })
      }

      outStream.end()

      await new Promise<void>((resolve, reject) => {
        outStream.on('finish', resolve)
        outStream.on('error', reject)
      })

      // Clean up part files
      try {
        await fs.rm(tempDir, { recursive: true, force: true })
      } catch {}

      task.status = 'completed'
      task.speedBps = 0
      task.etaSeconds = null
      this.notify()
    } catch (err: any) {
      task.status = 'error'
      task.errorMessage = `Merge failed: ${err.message}`
      this.notify()
    }
  }

  public async pauseDownload(id: string) {
    const task = this.tasks.get(id)
    if (!task || task.status !== 'downloading') return

    const ac = this.abortControllers.get(id)
    if (ac) {
      ac.abort()
      this.abortControllers.delete(id)
    }

    task.status = 'paused'
    task.speedBps = 0
    task.etaSeconds = null

    // Reset pending chunks back to pending status
    for (const chunk of task.chunks) {
      if (chunk.status === 'downloading') {
        chunk.status = 'pending'
      }
    }

    this.notify()
  }

  public async resumeDownload(id: string) {
    const task = this.tasks.get(id)
    if (!task || (task.status !== 'paused' && task.status !== 'error')) return

    task.errorMessage = undefined
    for (const chunk of task.chunks) {
      if (chunk.status === 'downloading' || chunk.status === 'failed') {
        chunk.status = 'pending'
      }
    }
    this.notify()
    this.startDownloadExecution(id)
  }

  public async cancelDownload(id: string) {
    const task = this.tasks.get(id)
    if (!task) return

    const ac = this.abortControllers.get(id)
    if (ac) {
      ac.abort()
      this.abortControllers.delete(id)
    }

    try {
      const tempDir = await this.getTempDir(id)
      await fs.rm(tempDir, { recursive: true, force: true })
      if (task.isMediaPlatform && task.status !== 'completed') {
        await new Promise((r) => setTimeout(r, 250))
        const destDir = path.dirname(task.destinationPath)
        const nameWithoutExt = path.basename(task.destinationPath).replace(/\.[^/.]+$/, '')
        try {
          const files = await fs.readdir(destDir)
          for (const f of files) {
            if (f.startsWith(nameWithoutExt) && (f.endsWith('.part') || f.endsWith('.ytdl'))) {
              await fs.rm(path.join(destDir, f), { force: true }).catch(() => {})
            }
          }
          await fs.rm(task.destinationPath, { force: true }).catch(() => {})
        } catch {}
      }
    } catch {}

    this.tasks.delete(id)
    this.abortControllers.delete(id)
    this.speedSamples.delete(id)
    this.notify()
  }
}
