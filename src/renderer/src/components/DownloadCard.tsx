import React from 'react'
import type { DownloadTask, NetworkInterfaceInfo } from '../../../shared/types'
import {
  Play,
  Pause,
  Trash2,
  FolderOpen,
  Zap,
  Layers,
  AlertCircle,
  CheckCircle2,
  RotateCcw
} from 'lucide-react'
import { formatBytes, formatSpeed, formatDuration, getFileExtension } from '../utils/format'
import { PlexoChunkGrid } from './PlexoChunkGrid'

interface Props {
  task: DownloadTask
  interfaces: NetworkInterfaceInfo[]
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  onOpenFolder: (path: string) => void
}

export const DownloadCard: React.FC<Props> = ({
  task,
  interfaces,
  onPause,
  onResume,
  onCancel,
  onOpenFolder
}) => {
  const percent =
    task.totalBytes > 0
      ? Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100))
      : task.status === 'completed'
      ? 100
      : 0

  const ext = getFileExtension(task.filename)
  const activeInterfaces = interfaces.filter((i) => i.enabled)

  const getStatusBadge = () => {
    switch (task.status) {
      case 'downloading':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 font-semibold">
            <Zap className="w-3 h-3 animate-bounce" />
            Downloading
          </span>
        )
      case 'merging':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-semibold">
            <Layers className="w-3 h-3 animate-spin" />
            Merging Chunks
          </span>
        )
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 font-semibold">
            Paused
          </span>
        )
      case 'error':
        return (
          <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 font-semibold">
            <AlertCircle className="w-3 h-3" />
            Error
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs transition-all hover:border-slate-300 dark:hover:border-slate-700">
      {/* Top Row: File Badge, Name, Status & Controls */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* File Extension or Thumbnail Badge */}
          {task.thumbnail ? (
            <div className="relative w-14 h-11 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
              <img
                src={task.thumbnail}
                alt=""
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 right-0 px-1 py-0.2 bg-black/80 text-[8px] font-bold text-white uppercase rounded-tl">
                {ext}
              </span>
            </div>
          ) : (
            <div className="w-12 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-xs text-slate-700 dark:text-slate-200 tracking-wider shadow-xs uppercase shrink-0">
              {ext}
            </div>
          )}

          {/* Title and Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <h3
                className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate max-w-xs sm:max-w-md md:max-w-xl lg:max-w-2xl 2xl:max-w-4xl"
                title={task.filename}
              >
                {task.filename}
              </h3>
              {getStatusBadge()}
              {task.isMediaPlatform ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 font-semibold">
                  Media Video
                </span>
              ) : task.supportsRange ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                  Multi-NIC Parallel
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                  Single Stream
                </span>
              )}
            </div>

            {/* Subtitle like: 59.1 MB of 6.3 GB · 1% · 2m 0s left */}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <span>
                {formatBytes(task.downloadedBytes)} of {formatBytes(task.totalBytes)}
              </span>
              <span>·</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {percent}%
              </span>
              {task.status === 'downloading' && (
                <>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    {formatSpeed(task.speedBps)}
                  </span>
                  <span>·</span>
                  <span>{formatDuration(task.etaSeconds)} left</span>
                </>
              )}
              {task.status === 'completed' && (
                <>
                  <span>·</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    Done
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {task.status === 'downloading' && (
            <button
              onClick={() => onPause(task.id)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Pause"
            >
              <Pause className="w-4 h-4" />
            </button>
          )}

          {task.status === 'paused' && (
            <button
              onClick={() => onResume(task.id)}
              className="p-2 rounded-lg bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-colors"
              title="Resume"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {task.status === 'error' && (
            <button
              onClick={() => onResume(task.id)}
              className="p-2 rounded-lg bg-amber-50 dark:bg-amber-600/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-600/30 transition-colors"
              title="Retry Download"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {task.status === 'completed' && (
            <button
              onClick={() => onOpenFolder(task.destinationPath)}
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 transition-colors"
              title="Open Folder"
            >
              <FolderOpen className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => onCancel(task.id)}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
            title="Cancel & Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Signature Plexo 4-Row Chunk Block Grid */}
      <div className="my-3">
        <PlexoChunkGrid
          chunks={task.chunks}
          totalBytes={task.totalBytes}
          downloadedBytes={task.downloadedBytes}
          status={task.status}
          interfaces={interfaces}
        />
      </div>

      {/* Network Breakdown Section */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5">
          NETWORK
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {activeInterfaces.map((iface) => {
            const ifaceSpeed = iface.currentSpeedBps
            return (
              <div
                key={iface.id}
                className="bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: iface.color }}
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {iface.name}
                    </span>
                  </div>
                  <span
                    className="text-xs font-bold font-mono"
                    style={{ color: iface.color }}
                  >
                    {ifaceSpeed > 0 ? formatSpeed(ifaceSpeed) : 'Idle'}
                  </span>
                </div>

                {/* Mini progress bar */}
                <div className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: iface.color,
                      width: `${task.status === 'downloading' && ifaceSpeed > 0 ? 100 : percent}%`
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Error message display if any */}
      {task.errorMessage && (
        <div className="mt-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
          {task.errorMessage}
        </div>
      )}
    </div>
  )
}
