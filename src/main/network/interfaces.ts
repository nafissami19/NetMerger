import { execFile } from 'node:child_process'
import { networkInterfaces } from 'node:os'
import { promisify } from 'node:util'
import type { NetworkInterfaceInfo, NetworkInterfaceKind } from '../../shared/types'

const execFileAsync = promisify(execFile)

interface WindowsAdapter {
  Name: string
  InterfaceDescription: string
  Status: string
  NdisPhysicalMedium?: number
}

const PRESET_COLORS = [
  '#3b82f6', // Bright Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316'  // Orange
]

export class NetworkManager {
  private interfaces: Map<string, NetworkInterfaceInfo> = new Map()
  private disabledInterfaceIds: Set<string> = new Set()
  private customColors: Map<string, string> = new Map()
  private byteCounters: Map<string, { currentWindowBytes: number; totalBytes: number }> = new Map()
  private speedTimer: NodeJS.Timeout | null = null
  private cachedWindowsAdapters: WindowsAdapter[] = []
  private lastAdaptersQueryTime = 0
  private static readonly ADAPTER_CACHE_TTL_MS = 30000

  constructor() {
    this.startSpeedTracker()
  }

  public recordBytes(interfaceId: string, bytes: number) {
    let counter = this.byteCounters.get(interfaceId)
    if (!counter) {
      counter = { currentWindowBytes: 0, totalBytes: 0 }
      this.byteCounters.set(interfaceId, counter)
    }
    counter.currentWindowBytes += bytes
    counter.totalBytes += bytes

    const iface = this.interfaces.get(interfaceId)
    if (iface) {
      iface.totalBytesDownloaded = counter.totalBytes
    }
  }

  private startSpeedTracker() {
    this.speedTimer = setInterval(() => {
      for (const [id, iface] of this.interfaces.entries()) {
        const counter = this.byteCounters.get(id)
        if (counter) {
          iface.currentSpeedBps = counter.currentWindowBytes
          counter.currentWindowBytes = 0
        } else {
          iface.currentSpeedBps = 0
        }
      }
    }, 1000)
  }

  public async refreshInterfaces(): Promise<NetworkInterfaceInfo[]> {
    const rawInterfaces = networkInterfaces()
    const windowsAdapters = await this.queryWindowsAdapters()

    const results: NetworkInterfaceInfo[] = []
    let colorIndex = 0

    for (const [osName, infos] of Object.entries(rawInterfaces)) {
      if (!infos) continue

      for (const info of infos) {
        // Skip internal/loopback and non-IPv4 addresses for standard direct socket binding
        if (info.internal || info.family !== 'IPv4') continue

        const winAdapter = windowsAdapters.find(
          (a) => a.Name.toLowerCase() === osName.toLowerCase()
        )

        const description = winAdapter?.InterfaceDescription || osName
        const kind = this.classifyKind(osName, description)
        const id = `${osName}_${info.address}`

        const isEnabled = !this.disabledInterfaceIds.has(id)
        const assignedColor =
          this.customColors.get(id) || PRESET_COLORS[colorIndex % PRESET_COLORS.length]
        colorIndex++

        const counter = this.byteCounters.get(id) || { currentWindowBytes: 0, totalBytes: 0 }

        const ifaceInfo: NetworkInterfaceInfo = {
          id,
          name: osName,
          description,
          ip: info.address,
          kind,
          enabled: isEnabled,
          color: assignedColor,
          currentSpeedBps: this.interfaces.get(id)?.currentSpeedBps || 0,
          totalBytesDownloaded: counter.totalBytes
        }

        this.interfaces.set(id, ifaceInfo)
        results.push(ifaceInfo)
      }
    }

    return results
  }

  public getActiveInterfaces(): NetworkInterfaceInfo[] {
    return Array.from(this.interfaces.values()).filter((i) => i.enabled)
  }

  public toggleInterface(id: string, enabled: boolean): void {
    if (enabled) {
      this.disabledInterfaceIds.delete(id)
    } else {
      this.disabledInterfaceIds.add(id)
    }
    const iface = this.interfaces.get(id)
    if (iface) {
      iface.enabled = enabled
    }
  }

  public setInterfaceColor(id: string, color: string): void {
    this.customColors.set(id, color)
    const iface = this.interfaces.get(id)
    if (iface) {
      iface.color = color
    }
  }

  private classifyKind(name: string, description: string): NetworkInterfaceKind {
    const combined = `${name} ${description}`.toLowerCase()
    if (/wi-?fi|wireless|802\.11|wlan/.test(combined)) return 'wifi'
    if (/rndis|remote ndis|usb|tether|apple mobile/.test(combined)) return 'usb'
    if (/ethernet|gigabit|lan|realtek|intel.*ethernet/.test(combined)) return 'ethernet'
    if (/tap|tun|vpn|wireguard/.test(combined)) return 'vpn'
    return 'other'
  }

  private async queryWindowsAdapters(): Promise<WindowsAdapter[]> {
    if (process.platform !== 'win32') return []
    const now = Date.now()
    if (
      this.cachedWindowsAdapters.length > 0 &&
      now - this.lastAdaptersQueryTime < NetworkManager.ADAPTER_CACHE_TTL_MS
    ) {
      return this.cachedWindowsAdapters
    }

    try {
      // Query physical and active network adapters with PowerShell
      const psCommand = `Get-NetAdapter | Where-Object { $_.Status -eq 'Up' } | Select-Object Name, InterfaceDescription, Status, NdisPhysicalMedium | ConvertTo-Json -Compress`
      const { stdout } = await execFileAsync('powershell', ['-NoProfile', '-Command', psCommand], {
        timeout: 5000
      })
      if (!stdout || !stdout.trim()) return this.cachedWindowsAdapters

      const parsed = JSON.parse(stdout)
      const list = Array.isArray(parsed) ? parsed : [parsed]
      this.cachedWindowsAdapters = list
      this.lastAdaptersQueryTime = now
      return list
    } catch {
      // Fallback to cached or empty if PowerShell query fails or times out
      return this.cachedWindowsAdapters
    }
  }

  public dispose() {
    if (this.speedTimer) {
      clearInterval(this.speedTimer)
      this.speedTimer = null
    }
  }
}
