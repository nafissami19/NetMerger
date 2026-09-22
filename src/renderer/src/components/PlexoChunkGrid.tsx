import React from 'react'
import type { ChunkInfo, NetworkInterfaceInfo } from '../../../shared/types'

interface Props {
  chunks?: ChunkInfo[]
  totalBytes: number
  downloadedBytes: number
  status: string
  interfaces: NetworkInterfaceInfo[]
}

const TOTAL_BLOCKS = 160 // 4 rows x 40 columns

export const PlexoChunkGrid: React.FC<Props> = ({
  chunks,
  totalBytes,
  downloadedBytes,
  status,
  interfaces
}) => {
  const activeInterfaces = interfaces.filter((i) => i.enabled)
  const isCompleted = status === 'completed'

  // Calculate overall percentage
  const pct = totalBytes > 0 ? Math.min(1, Math.max(0, downloadedBytes / totalBytes)) : isCompleted ? 1 : 0
  const completedBlocksCount = isCompleted ? TOTAL_BLOCKS : Math.floor(pct * TOTAL_BLOCKS)

  // Map each block index (0 to 159) to a visual state: { status: 'pending' | 'downloading' | 'completed', color: string }
  const blockStates: { status: 'pending' | 'downloading' | 'completed'; color: string }[] = []

  const hasDiscreteChunks = chunks && chunks.length > 1

  if (hasDiscreteChunks && chunks) {
    // Map discrete chunk slices directly onto the 160-block grid
    const totalFileBytes = totalBytes || chunks.reduce((acc, c) => acc + c.totalBytes, 0) || 1
    const bytesPerBlock = totalFileBytes / TOTAL_BLOCKS

    for (let b = 0; b < TOTAL_BLOCKS; b++) {
      const blockByteOffset = b * bytesPerBlock
      // Find chunk that overlaps this block
      const chunk = chunks.find((c) => blockByteOffset >= c.start && blockByteOffset <= c.end) || chunks[0]

      if (isCompleted || (chunk && chunk.status === 'completed')) {
        const color = chunk?.assignedColor || activeInterfaces[b % activeInterfaces.length]?.color || '#10b981'
        blockStates.push({ status: 'completed', color })
      } else if (chunk && chunk.status === 'downloading') {
        const color = chunk.assignedColor || '#3b82f6'
        blockStates.push({ status: 'downloading', color })
      } else {
        blockStates.push({ status: 'pending', color: '#cbd5e1' })
      }
    }
  } else {
    // Single stream or media platform download: smoothly fill blocks proportionally
    for (let b = 0; b < TOTAL_BLOCKS; b++) {
      if (b < completedBlocksCount) {
        // Distribute colors across active interfaces or use primary interface
        const iface = activeInterfaces[b % (activeInterfaces.length || 1)]
        const color = iface ? iface.color : '#10b981'
        blockStates.push({ status: 'completed', color })
      } else if (b === completedBlocksCount && status === 'downloading') {
        // Active downloading head
        const activeIface = activeInterfaces.find((i) => i.currentSpeedBps > 0) || activeInterfaces[0]
        const color = activeIface ? activeIface.color : '#3b82f6'
        blockStates.push({ status: 'downloading', color })
      } else {
        blockStates.push({ status: 'pending', color: '#cbd5e1' })
      }
    }
  }

  return (
    <div className="space-y-2">
      {/* Legend with colored dots */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400 flex-wrap">
        {activeInterfaces.map((iface) => (
          <div key={iface.id} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
              style={{ backgroundColor: iface.color }}
            />
            <span className="text-[11px] font-bold tracking-tight text-slate-700 dark:text-slate-300">
              {iface.name}
            </span>
          </div>
        ))}
      </div>

      {/* The Signature 4-Row Dense Block Matrix */}
      <div
        className="p-2.5 bg-slate-100/70 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(40, minmax(0, 1fr))',
          gap: '3px'
        }}
      >
        {blockStates.map((blk, idx) => {
          if (blk.status === 'completed') {
            return (
              <div
                key={idx}
                className="h-3.5 rounded-[2.5px] transition-all duration-300 hover:scale-125 hover:z-10 shadow-xs"
                style={{ backgroundColor: blk.color }}
              />
            )
          }

          if (blk.status === 'downloading') {
            return (
              <div
                key={idx}
                className="h-3.5 rounded-[2.5px] border-2 animate-pulse hover:scale-125 hover:z-10 shadow-xs"
                style={{
                  borderColor: blk.color,
                  backgroundColor: `${blk.color}35`
                }}
              />
            )
          }

          // Pending block
          return (
            <div
              key={idx}
              className="h-3.5 rounded-[2.5px] bg-slate-200/90 dark:bg-slate-800/80 transition-all hover:scale-110"
            />
          )
        })}
      </div>
    </div>
  )
}
