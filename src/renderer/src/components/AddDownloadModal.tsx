import React, { useState, useEffect, useRef } from 'react'
import type { ProbeResult } from '../../../shared/types'
import { X, Download, Folder, Loader2, CheckCircle2, AlertTriangle, Film } from 'lucide-react'
import { formatBytes } from '../utils/format'

interface Props {
  isOpen: boolean
  onClose: () => void
  onStart: (url: string, destinationDir: string, customFilename?: string) => Promise<void>
}

export const AddDownloadModal: React.FC<Props> = ({ isOpen, onClose, onStart }) => {
  const [url, setUrl] = useState('')
  const [probing, setProbing] = useState(false)
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null)
  const [probeError, setProbeError] = useState<string | null>(null)
  const [customFilename, setCustomFilename] = useState('')
  const [destinationDir, setDestinationDir] = useState('')
  const [starting, setStarting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      if (window.api?.getDefaultDownloadDirectory && !destinationDir) {
        window.api.getDefaultDownloadDirectory().then((dir) => {
          if (dir) setDestinationDir(dir)
        }).catch(() => {})
      }
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleProbe = async (targetUrl: string) => {
    if (!targetUrl.trim().startsWith('http')) return
    setProbing(true)
    setProbeError(null)
    setProbeResult(null)

    try {
      const res = await window.api.probeUrl(targetUrl.trim())
      setProbeResult(res)
      setCustomFilename(res.filename)
    } catch (err: any) {
      setProbeError(err?.message || 'Failed to probe URL')
    } finally {
      setProbing(false)
    }
  }

  const handleSelectFolder = async () => {
    try {
      const dir = await window.api.selectDownloadDirectory()
      if (dir) {
        setDestinationDir(dir)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStartDownload = async () => {
    if (!url.trim() || starting) return
    setStarting(true)
    try {
      let targetDir = destinationDir
      if (!targetDir && window.api?.getDefaultDownloadDirectory) {
        targetDir = await window.api.getDefaultDownloadDirectory().catch(() => '')
      }
      await onStart(url.trim(), targetDir, customFilename.trim() || undefined)
      setUrl('')
      setProbeResult(null)
      setCustomFilename('')
      onClose()
    } catch (err: any) {
      setProbeError(err?.message || 'Could not start download')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Add New Download
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Parallel multi-network & universal media downloader
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* URL Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Download URL (Direct File, YouTube, TikTok, X, Media)
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  if (probeResult) setProbeResult(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (!probeResult && !probing && url.trim()) {
                      handleProbe(url)
                    } else if (probeResult && !starting) {
                      handleStartDownload()
                    }
                  }
                }}
                onBlur={() => {
                  if (url.trim() && !probeResult && !probing) {
                    handleProbe(url)
                  }
                }}
                placeholder="Paste any file link or video URL..."
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono transition-colors"
              />
              <button
                onClick={() => handleProbe(url)}
                disabled={probing || !url.trim()}
                className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
              </button>
            </div>
          </div>

          {/* Probing feedback */}
          {probing && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 font-medium">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>Analyzing URL and resolving metadata locally...</span>
            </div>
          )}

          {probeError && (
            <div className="flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-3 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{probeError}</span>
            </div>
          )}

          {/* Media Platform Preview */}
          {probeResult?.isMediaPlatform && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-500/30 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5" />
                  Universal Media Extractor (100% Free / Local)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-bold font-mono">
                  yt-dlp + ffmpeg
                </span>
              </div>

              {probeResult.thumbnail && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video max-h-44 bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                  <img
                    src={probeResult.thumbnail}
                    alt={probeResult.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2.5">
                    <span className="text-xs font-semibold text-white line-clamp-1">
                      {probeResult.filename}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Format
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    Best Quality MP4 (Video + Audio)
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                    Est. Size
                  </span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono font-bold">
                    {probeResult.totalBytes > 0 ? formatBytes(probeResult.totalBytes) : 'Dynamic Stream'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 text-xs font-semibold">
                  Save As (Filename):
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Standard File Metadata Display */}
          {probeResult && !probeResult.isMediaPlatform && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Total File Size:</span>
                <span className="text-slate-900 dark:text-slate-200 font-mono font-bold">
                  {probeResult.totalBytes > 0 ? formatBytes(probeResult.totalBytes) : 'Dynamic / Streamed'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Multi-NIC Acceleration:</span>
                {probeResult.supportsRange ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Supported (HTTP 206 Parallel Slicing)
                  </span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                    Single Stream (Server doesn&apos;t support byte slicing)
                  </span>
                )}
              </div>

              <div>
                <label className="block text-slate-500 dark:text-slate-400 mb-1 font-semibold">
                  Save As (Filename):
                </label>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Destination Folder */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Download Destination Folder
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={destinationDir}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-600 dark:text-slate-300 font-mono truncate"
              />
              <button
                onClick={handleSelectFolder}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Folder className="w-3.5 h-3.5" />
                Browse
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleStartDownload}
            disabled={!url.trim() || starting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {starting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Start Download
          </button>
        </div>
      </div>
    </div>
  )
}
