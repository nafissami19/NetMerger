export type NetworkInterfaceKind = 'wifi' | 'ethernet' | 'usb' | 'vpn' | 'other'

export interface NetworkInterfaceInfo {
  id: string
  name: string
  description: string
  ip: string
  kind: NetworkInterfaceKind
  enabled: boolean
  color: string
  currentSpeedBps: number
  totalBytesDownloaded: number
}

export type DownloadStatus =
  | 'idle'
  | 'probing'
  | 'downloading'
  | 'paused'
  | 'merging'
  | 'completed'
  | 'error'

export interface ChunkInfo {
  index: number
  start: number
  end: number
  totalBytes: number
  downloadedBytes: number
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  assignedInterfaceId?: string
  assignedColor?: string
}

export interface DownloadTask {
  id: string
  url: string
  filename: string
  destinationPath: string
  totalBytes: number
  downloadedBytes: number
  status: DownloadStatus
  errorMessage?: string
  supportsRange: boolean
  etag?: string | null
  lastModified?: string | null
  chunks: ChunkInfo[]
  speedBps: number
  etaSeconds: number | null
  createdAt: number
  isMediaPlatform?: boolean
  thumbnail?: string
}

export interface ProbeResult {
  url: string
  filename: string
  totalBytes: number
  supportsRange: boolean
  etag: string | null
  lastModified: string | null
  contentType: string | null
  isWebPage?: boolean
  webPageMessage?: string
  isMediaPlatform?: boolean
  thumbnail?: string
}

export interface ElectronAPI {
  // Network
  getNetworkInterfaces: () => Promise<NetworkInterfaceInfo[]>
  toggleNetworkInterface: (id: string, enabled: boolean) => Promise<void>
  setInterfaceColor: (id: string, color: string) => Promise<void>
  
  // Download actions
  probeUrl: (url: string) => Promise<ProbeResult>
  selectDownloadDirectory: () => Promise<string | null>
  getDefaultDownloadDirectory: () => Promise<string>
  startDownload: (url: string, destinationDir: string, customFilename?: string) => Promise<string>
  pauseDownload: (id: string) => Promise<void>
  resumeDownload: (id: string) => Promise<void>
  cancelDownload: (id: string) => Promise<void>
  openFileLocation: (filePath: string) => Promise<void>
  getDownloads: () => Promise<DownloadTask[]>

  // Events from Main process
  onDownloadsUpdated: (callback: (downloads: DownloadTask[]) => void) => () => void
  onInterfacesUpdated: (callback: (interfaces: NetworkInterfaceInfo[]) => void) => () => void
}
