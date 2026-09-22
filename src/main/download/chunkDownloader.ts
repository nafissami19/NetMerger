import { createWriteStream } from 'node:fs'
import { request as httpRequest, type ClientRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { URL } from 'node:url'

export interface DownloadChunkOptions {
  url: string
  rangeStart: number
  rangeEnd: number
  localAddress: string
  partFilePath: string
  signal: AbortSignal
  onProgress: (bytesRead: number) => void
  onStallTimeout?: () => void
  supportsRange?: boolean
}

const STALL_TIMEOUT_MS = 15000 // 15 seconds without data = stall

export function downloadChunkToFile(options: DownloadChunkOptions): Promise<void> {
  const { url, rangeStart, rangeEnd, localAddress, partFilePath, signal, onProgress, supportsRange } = options

  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      return reject(new Error('Aborted'))
    }

    let clientReq: ClientRequest | null = null
    let stallTimer: NodeJS.Timeout | null = null
    let settled = false
    let currentRes: any = null

    const writeStream = createWriteStream(partFilePath, { flags: 'w' })

    const resetStallWatchdog = () => {
      if (stallTimer) clearTimeout(stallTimer)
      stallTimer = setTimeout(() => {
        if (!settled) {
          settled = true
          clientReq?.destroy(new Error(`Connection stalled on interface ${localAddress} (>15s idle)`))
          currentRes?.destroy()
          writeStream.destroy()
          reject(new Error('Connection stalled'))
        }
      }, STALL_TIMEOUT_MS)
    }

    const cleanup = () => {
      if (stallTimer) clearTimeout(stallTimer)
      signal.removeEventListener('abort', onAbort)
    }

    const onAbort = () => {
      if (!settled) {
        settled = true
        cleanup()
        clientReq?.destroy()
        currentRes?.destroy()
        writeStream.destroy()
        reject(new Error('Aborted'))
      }
    }

    signal.addEventListener('abort', onAbort)
    resetStallWatchdog()

    const executeRequest = (targetUrl: string, redirectCount = 0) => {
      if (redirectCount > 5) {
        settled = true
        cleanup()
        writeStream.destroy()
        return reject(new Error('Too many redirects in chunk download'))
      }

      const parsed = new URL(targetUrl)
      const isHttps = parsed.protocol === 'https:'
      const reqFn = isHttps ? httpsRequest : httpRequest

      const headers: Record<string, string> = {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NetMerger/1.0'
      }

      if (supportsRange !== false && rangeEnd >= rangeStart && rangeEnd > 0) {
        headers['Range'] = `bytes=${rangeStart}-${rangeEnd}`
      }

      const requestOptions = {
        method: 'GET',
        headers,
        // Core magic: Binds this TCP socket directly to the physical interface IP!
        localAddress: localAddress || undefined
      }

      try {
        clientReq = reqFn(targetUrl, requestOptions, (res) => {
          currentRes = res

          // Handle 3xx Redirects
          if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const nextUrl = new URL(res.headers.location, targetUrl).href
            res.resume()
            return executeRequest(nextUrl, redirectCount + 1)
          }

          // Range requests should answer 206, standard streams should answer 200
          if (res.statusCode && res.statusCode >= 400) {
            settled = true
            cleanup()
            writeStream.destroy()
            return reject(new Error(`Server responded with HTTP ${res.statusCode}`))
          }

          res.on('data', (chunk: Buffer) => {
            resetStallWatchdog()
            onProgress(chunk.length)
          })

          res.pipe(writeStream)

          writeStream.on('finish', () => {
            if (!settled) {
              settled = true
              cleanup()
              resolve()
            }
          })

          writeStream.on('error', (err) => {
            if (!settled) {
              settled = true
              cleanup()
              clientReq?.destroy()
              reject(err)
            }
          })

          res.on('error', (err) => {
            if (!settled) {
              settled = true
              cleanup()
              writeStream.destroy()
              reject(err)
            }
          })
        })

        clientReq.on('error', (err) => {
          if (!settled) {
            settled = true
            cleanup()
            writeStream.destroy()
            reject(err)
          }
        })

        clientReq.end()
      } catch (err) {
        cleanup()
        writeStream.destroy()
        reject(err)
      }
    }

    executeRequest(url, 0)
  })
}
