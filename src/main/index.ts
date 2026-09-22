import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { NetworkManager } from './network/interfaces'
import { DownloadManager } from './download/downloadManager'
import { probeUrl } from './download/probe'
import { startApiServer } from './apiServer'

let mainWindow: BrowserWindow | null = null
const networkManager = new NetworkManager()
const downloadManager = new DownloadManager(networkManager)
let apiServer: any = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  function createWindow(): void {
    mainWindow = new BrowserWindow({
      width: 1100,
      height: 740,
      minWidth: 850,
      minHeight: 580,
      show: false,
      autoHideMenuBar: true,
      title: 'NetMerger',
      titleBarStyle: 'hidden',
      titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#94a3b8',
        height: 44
      },
      webPreferences: {
        preload: existsSync(join(__dirname, '../preload/index.mjs'))
          ? join(__dirname, '../preload/index.mjs')
          : join(__dirname, '../preload/index.js'),
        sandbox: false,
        contextIsolation: true
      }
    })

    mainWindow.on('ready-to-show', () => {
      mainWindow?.show()
    })

    mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    if (isDev && process.env['ELECTRON_RENDERER_URL']) {
      mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.whenReady().then(() => {
  // Register IPC handlers
  ipcMain.handle('network:getInterfaces', async () => {
    return await networkManager.refreshInterfaces()
  })

  ipcMain.handle('network:toggle', async (_, id: string, enabled: boolean) => {
    networkManager.toggleInterface(id, enabled)
    mainWindow?.webContents.send('network:updated', await networkManager.refreshInterfaces())
  })

  ipcMain.handle('network:setColor', async (_, id: string, color: string) => {
    networkManager.setInterfaceColor(id, color)
    mainWindow?.webContents.send('network:updated', await networkManager.refreshInterfaces())
  })

  ipcMain.handle('download:probe', async (_, url: string) => {
    return await probeUrl(url)
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    if (!mainWindow) return null
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('download:getDefaultDirectory', () => {
    try {
      return app.getPath('downloads')
    } catch {
      return process.env.USERPROFILE ? `${process.env.USERPROFILE}\\Downloads` : ''
    }
  })

  ipcMain.handle(
    'download:start',
    async (_, url: string, destinationDir: string, customFilename?: string) => {
      const probe = await probeUrl(url)
      const filename = customFilename || probe.filename
      const effectiveDir = destinationDir || app.getPath('downloads')
      return await downloadManager.createDownload(
        probe.url || url,
        filename,
        probe.totalBytes,
        effectiveDir,
        probe.supportsRange,
        probe.etag,
        probe.lastModified,
        probe.isMediaPlatform,
        probe.thumbnail
      )
    }
  )

  ipcMain.handle('download:pause', async (_, id: string) => {
    await downloadManager.pauseDownload(id)
  })

  ipcMain.handle('download:resume', async (_, id: string) => {
    await downloadManager.resumeDownload(id)
  })

  ipcMain.handle('download:cancel', async (_, id: string) => {
    await downloadManager.cancelDownload(id)
  })

  ipcMain.handle('download:getAll', () => {
    return downloadManager.getAllTasks()
  })

  ipcMain.handle('download:openLocation', async (_, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  // Broadcast download updates to UI
  downloadManager.setOnUpdate((tasks) => {
    mainWindow?.webContents.send('download:updated', tasks)
  })

  // Broadcast interface speed updates every 2 seconds
  setInterval(async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const ifaces = await networkManager.refreshInterfaces()
      mainWindow.webContents.send('network:updated', ifaces)
    }
  }, 2000)

  apiServer = startApiServer(networkManager, downloadManager, 5174)

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

  app.on('window-all-closed', () => {
    networkManager.dispose()
    if (apiServer) {
      try {
        apiServer.close()
      } catch {}
    }
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}
