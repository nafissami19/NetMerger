import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { NetworkManager } from './network/interfaces'
import type { DownloadManager } from './download/downloadManager'
import { probeUrl } from './download/probe'

export function startApiServer(
  networkManager: NetworkManager,
  downloadManager: DownloadManager,
  port = 5174
) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const pathname = parsedUrl.pathname

    try {
      if (req.method === 'GET' && pathname === '/api/network/interfaces') {
        const ifaces = await networkManager.refreshInterfaces()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(ifaces))
        return
      }

      if (req.method === 'GET' && pathname === '/api/downloads') {
        const downloads = downloadManager.getAllTasks()
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(downloads))
        return
      }

      if (req.method === 'POST') {
        let body = ''
        for await (const chunk of req) {
          body += chunk
        }
        const data = body ? JSON.parse(body) : {}

        if (pathname === '/api/network/toggle') {
          networkManager.toggleInterface(data.id, data.enabled)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
          return
        }

        if (pathname === '/api/download/probe') {
          const probe = await probeUrl(data.url)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify(probe))
          return
        }

        if (pathname === '/api/download/start') {
          const probe = await probeUrl(data.url)
          const filename = data.customFilename || probe.filename
          const id = await downloadManager.createDownload(
            data.url,
            filename,
            probe.totalBytes,
            data.destinationDir || process.env.USERPROFILE + '\\Downloads',
            probe.supportsRange,
            probe.etag,
            probe.lastModified,
            probe.isMediaPlatform,
            probe.thumbnail
          )
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ id }))
          return
        }

        if (pathname === '/api/download/pause') {
          await downloadManager.pauseDownload(data.id)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
          return
        }

        if (pathname === '/api/download/resume') {
          await downloadManager.resumeDownload(data.id)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
          return
        }

        if (pathname === '/api/download/cancel') {
          await downloadManager.cancelDownload(data.id)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
          return
        }
      }

      res.writeHead(404, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Not found' }))
    } catch (err: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: err.message }))
    }
  })

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[API Server] Port ${port} is already in use. Skipping server start without crash.`)
    } else {
      console.error('[API Server] Error:', err)
    }
  })

  server.listen(port, () => {
    console.log(`[API Server] Running at http://localhost:${port}`)
  })

  return server
}
