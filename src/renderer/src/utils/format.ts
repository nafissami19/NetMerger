export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const idx = Math.min(i, sizes.length - 1)
  return `${parseFloat((bytes / Math.pow(k, idx)).toFixed(dm))} ${sizes[idx]}`
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s'
  return `${formatBytes(bytesPerSec)}/s`
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined || !isFinite(seconds) || seconds < 0) {
    return '--:--'
  }
  const s = Math.round(seconds)
  const hrs = Math.floor(s / 3600)
  const mins = Math.floor((s % 3600) / 60)
  const secs = s % 60

  if (hrs > 0) {
    return `${hrs}h ${mins.toString().padStart(2, '0')}m`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function formatSpeedSplit(bytesPerSec: number): { value: string; unit: string } {
  if (!bytesPerSec || bytesPerSec <= 0) return { value: '0.0', unit: 'MB/s' }
  const mb = bytesPerSec / (1024 * 1024)
  if (mb >= 0.1) {
    return { value: mb.toFixed(1), unit: 'MB/s' }
  }
  const kb = bytesPerSec / 1024
  if (kb >= 0.1) {
    return { value: kb.toFixed(1), unit: 'KB/s' }
  }
  return { value: bytesPerSec.toFixed(0), unit: 'B/s' }
}

export function getFileExtension(filename: string): string {
  if (!filename) return 'FILE'
  const match = /\.([a-zA-Z0-9]+)$/.exec(filename)
  if (match && match[1]) {
    return match[1].toUpperCase().slice(0, 4)
  }
  return 'FILE'
}
