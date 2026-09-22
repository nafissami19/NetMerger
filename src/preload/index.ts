import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI, DownloadTask, NetworkInterfaceInfo } from '../shared/types'

const api: ElectronAPI = {
  getNetworkInterfaces: () => ipcRenderer.invoke('network:getInterfaces'),
  toggleNetworkInterface: (id, enabled) => ipcRenderer.invoke('network:toggle', id, enabled),
  setInterfaceColor: (id, color) => ipcRenderer.invoke('network:setColor', id, color),

  probeUrl: (url) => ipcRenderer.invoke('download:probe', url),
  selectDownloadDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  getDefaultDownloadDirectory: () => ipcRenderer.invoke('download:getDefaultDirectory'),
  startDownload: (url, destinationDir, customFilename) =>
    ipcRenderer.invoke('download:start', url, destinationDir, customFilename),
  pauseDownload: (id) => ipcRenderer.invoke('download:pause', id),
  resumeDownload: (id) => ipcRenderer.invoke('download:resume', id),
  cancelDownload: (id) => ipcRenderer.invoke('download:cancel', id),
  openFileLocation: (filePath) => ipcRenderer.invoke('download:openLocation', filePath),
  getDownloads: () => ipcRenderer.invoke('download:getAll'),

  onDownloadsUpdated: (callback) => {
    const handler = (_event: any, tasks: DownloadTask[]) => callback(tasks)
    ipcRenderer.on('download:updated', handler)
    return () => {
      ipcRenderer.removeListener('download:updated', handler)
    }
  },

  onInterfacesUpdated: (callback) => {
    const handler = (_event: any, ifaces: NetworkInterfaceInfo[]) => callback(ifaces)
    ipcRenderer.on('network:updated', handler)
    return () => {
      ipcRenderer.removeListener('network:updated', handler)
    }
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}
