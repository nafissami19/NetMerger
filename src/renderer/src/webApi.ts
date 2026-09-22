import type { ElectronAPI, NetworkInterfaceInfo, DownloadTask } from '../../shared/types'

const API_BASE = 'http://localhost:5174'

export function createBrowserWebApi(): ElectronAPI {
  let cachedInterfaces: NetworkInterfaceInfo[] = []
  let cachedDownloads: DownloadTask[] = []

  const downloadListeners: ((tasks: DownloadTask[]) => void)[] = []
  const interfaceListeners: ((ifaces: NetworkInterfaceInfo[]) => void)[] = []

  const pollBackend = async () => {
    try {
      const [ifacesRes, dlRes] = await Promise.all([
        fetch(`${API_BASE}/api/network/interfaces`).catch(() => null),
        fetch(`${API_BASE}/api/downloads`).catch(() => null)
      ])

      if (ifacesRes && ifacesRes.ok) {
        cachedInterfaces = await ifacesRes.json()
        interfaceListeners.forEach((l) => l([...cachedInterfaces]))
      }

      if (dlRes && dlRes.ok) {
        cachedDownloads = await dlRes.json()
        downloadListeners.forEach((l) => l([...cachedDownloads]))
      }
    } catch {
      // Backend starting or temporarily unreachable
    }
  }

  // Poll real backend every 1.5 seconds
  setInterval(pollBackend, 1500)
  pollBackend()

  return {
    getNetworkInterfaces: async () => {
      try {
        const res = await fetch(`${API_BASE}/api/network/interfaces`)
        if (res.ok) {
          cachedInterfaces = await res.json()
          return cachedInterfaces
        }
      } catch {}
      return []
    },
    toggleNetworkInterface: async (id, enabled) => {
      await fetch(`${API_BASE}/api/network/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, enabled })
      })
      await pollBackend()
    },
    setInterfaceColor: async () => {},
    probeUrl: async (url) => {
      const res = await fetch(`${API_BASE}/api/download/probe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!res.ok) throw new Error('Probe failed')
      return await res.json()
    },
    selectDownloadDirectory: async () => 'Downloads',
    getDefaultDownloadDirectory: async () => 'Downloads',
    startDownload: async (url, destinationDir, customFilename) => {
      const res = await fetch(`${API_BASE}/api/download/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, destinationDir, customFilename })
      })
      const data = await res.json()
      await pollBackend()
      return data.id
    },
    pauseDownload: async (id) => {
      await fetch(`${API_BASE}/api/download/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      await pollBackend()
    },
    resumeDownload: async (id) => {
      await fetch(`${API_BASE}/api/download/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      await pollBackend()
    },
    cancelDownload: async (id) => {
      await fetch(`${API_BASE}/api/download/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      await pollBackend()
    },
    openFileLocation: async () => {},
    getDownloads: async () => cachedDownloads,
    onDownloadsUpdated: (cb) => {
      downloadListeners.push(cb)
      cb([...cachedDownloads])
      return () => {
        const idx = downloadListeners.indexOf(cb)
        if (idx !== -1) downloadListeners.splice(idx, 1)
      }
    },
    onInterfacesUpdated: (cb) => {
      interfaceListeners.push(cb)
      cb([...cachedInterfaces])
      return () => {
        const idx = interfaceListeners.indexOf(cb)
        if (idx !== -1) interfaceListeners.splice(idx, 1)
      }
    }
  }
}
