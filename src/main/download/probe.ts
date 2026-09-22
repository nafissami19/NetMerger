import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { URL } from 'node:url'
import path from 'node:path'
import type { ProbeResult } from '../../shared/types'
import { isMediaPlatformUrl, extractMediaInfo } from './mediaExtractor'

const MAX_REDIRECTS = 5

function doRequest(
  url: string,
  headers: Record<string, string>,
  method = 'GET'
): Promise<{ statusCode: number; headers: Record<string, string | string[] | undefined> }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === 'https:'
    const reqFn = isHttps ? httpsRequest : httpRequest

    let settled = false

    const req = reqFn(
      url,
      {
        method,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 NetMerger/1.0',
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          Connection: 'close',
          ...headers
        },
        timeout: 10000
      },
      (res) => {
        if (settled) return
        settled = true
        // Drain response
        res.resume()
        resolve({
          statusCode: res.statusCode || 0,
          headers: res.headers
        })
      }
    )

    req.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })

    req.on('timeout', () => {
      if (settled) return
      settled = true
      req.destroy(new Error('Probe request timed out'))
      reject(new Error('Probe request timed out'))
    })

    req.end()
  })
}

export async function probeUrl(targetUrl: string): Promise<ProbeResult> {
  if (isMediaPlatformUrl(targetUrl)) {
    try {
      return await extractMediaInfo(targetUrl)
    } catch (mediaErr) {
      console.warn('Media extraction failed, fallback to standard probe:', mediaErr)
    }
  }

  let currentUrl = targetUrl
  let redirects = 0

  while (redirects < MAX_REDIRECTS) {
    const parsed = new URL(currentUrl)

    let res: { statusCode: number; headers: Record<string, string | string[] | undefined> }

    try {
      // Primary: 1-byte range probe to detect 206 Partial Content
      res = await doRequest(currentUrl, { Range: 'bytes=0-0' }, 'GET')
    } catch {
      // Fallback: If range probe socket resets, try HEAD request
      try {
        res = await doRequest(currentUrl, {}, 'HEAD')
      } catch (err2) {
        // Last fallback: Simple GET request
        res = await doRequest(currentUrl, {}, 'GET')
      }
    }

    // Handle 3xx redirects
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      const redirectLoc = Array.isArray(res.headers.location)
        ? res.headers.location[0]
        : res.headers.location
      currentUrl = new URL(redirectLoc, currentUrl).href
      redirects++
      continue
    }

    const supportsRange =
      res.statusCode === 206 ||
      res.headers['accept-ranges'] === 'bytes' ||
      !!res.headers['content-range']

    const contentRange = (res.headers['content-range'] || '') as string
    let totalBytes = 0

    if (contentRange) {
      const match = /\/(\d+)$/.exec(contentRange)
      if (match) {
        totalBytes = parseInt(match[1], 10)
      }
    }

    if (!totalBytes && res.headers['content-length']) {
      totalBytes = parseInt(res.headers['content-length'] as string, 10) || 0
    }

    // Extract filename from Content-Disposition or URL path
    let filename = ''
    const contentDisposition = (res.headers['content-disposition'] || '') as string
    if (contentDisposition) {
      const match = /filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i.exec(contentDisposition)
      if (match && match[1]) {
        filename = decodeURIComponent(match[1].trim())
      }
    }

    if (!filename) {
      const urlPath = parsed.pathname
      filename = path.basename(urlPath) || 'download.bin'
    }

    const etag = (res.headers.etag as string) || null
    const lastModified = (res.headers['last-modified'] as string) || null
    const contentType = (res.headers['content-type'] as string) || null

    const isYouTube = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')
    const isHtml = (contentType || '').toLowerCase().includes('text/html')
    const isWebPage = isYouTube || isHtml

    let webPageMessage: string | undefined = undefined
    if (isYouTube) {
      webPageMessage = 'YouTube Web Page detected. YouTube URLs point to dynamic web pages, not direct video file links. Standard download accelerators (like IDM or Plexo) download direct file URLs (.zip, .iso, .exe, .bin, .mp4, etc.).'
      if (!filename.includes('.')) filename += '.html'
    } else if (isHtml && !supportsRange) {
      webPageMessage = 'HTML Web Page detected. This URL points to a website document rather than a direct downloadable file.'
      if (!filename.includes('.')) filename += '.html'
    }

    return {
      url: currentUrl,
      filename,
      totalBytes,
      supportsRange,
      etag,
      lastModified,
      contentType,
      isWebPage,
      webPageMessage
    }
  }

  throw new Error(`Exceeded maximum redirect limit (${MAX_REDIRECTS})`)
}
