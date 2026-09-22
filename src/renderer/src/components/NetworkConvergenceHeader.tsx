import React, { useEffect, useRef, useState } from 'react'
import type { NetworkInterfaceInfo } from '../../../shared/types'
import { formatSpeed, formatSpeedSplit } from '../utils/format'

interface Props {
  interfaces: NetworkInterfaceInfo[]
  totalSpeedBps: number
  avgSpeedBps: number
  peakSpeedBps: number
}

interface ThroughputPoint {
  timestamp: number
  speeds: Record<string, number> // ifaceId -> bps
  totalBps: number
}

export const NetworkConvergenceHeader: React.FC<Props> = ({
  interfaces,
  totalSpeedBps,
  avgSpeedBps,
  peakSpeedBps
}) => {
  const activeInterfaces = interfaces.filter((i) => i.enabled)
  const historyRef = useRef<ThroughputPoint[]>([])
  const interfacesRef = useRef<NetworkInterfaceInfo[]>(interfaces)
  interfacesRef.current = interfaces
  const [, setTick] = useState(0)

  // Track 25 seconds of throughput history with a smooth steady 1000ms cadence
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      const speeds: Record<string, number> = {}
      let currentTotal = 0

      for (const iface of interfacesRef.current) {
        if (iface.enabled) {
          speeds[iface.id] = iface.currentSpeedBps
          currentTotal += iface.currentSpeedBps
        }
      }

      historyRef.current.push({
        timestamp: now,
        speeds,
        totalBps: currentTotal
      })

      if (historyRef.current.length > 25) {
        historyRef.current.shift()
      }

      setTick((t) => t + 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Multiplier calculation: total speed vs fastest single interface
  const fastestIface = [...activeInterfaces].sort(
    (a, b) => b.currentSpeedBps - a.currentSpeedBps
  )[0]

  let multiplierStr = ''
  if (fastestIface && fastestIface.currentSpeedBps > 0 && totalSpeedBps > 0) {
    const mult = totalSpeedBps / fastestIface.currentSpeedBps
    if (mult > 1.05) {
      multiplierStr = `${mult.toFixed(1)}x ${fastestIface.name.toUpperCase()} ALONE ↗`
    }
  }
  if (!multiplierStr && activeInterfaces.length > 1) {
    multiplierStr = `${activeInterfaces.length}x MULTI-NIC ACTIVE ↗`
  }

  const speedDisplay = formatSpeedSplit(totalSpeedBps)
  const avgDisplay = formatSpeed(avgSpeedBps)
  const peakDisplay = formatSpeed(peakSpeedBps)

  // SVG Convergence Curve Coordinates
  const numIfaces = Math.max(1, activeInterfaces.length)
  const itemHeight = 30
  const svgHeight = Math.max(90, numIfaces * itemHeight)
  const centerY = svgHeight / 2
  const svgWidth = 140

  return (
    <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs transition-colors">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Interface list & SVG Convergence Flow (Cols 5) */}
        <div className="lg:col-span-5 flex items-center justify-between min-w-0">
          {/* Adapter names & speeds */}
          <div className="space-y-3 shrink-0">
            {activeInterfaces.map((iface) => (
              <div key={iface.id} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: iface.color }}
                />
                <div>
                  <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {iface.name}
                  </div>
                  <div
                    className="text-xs font-bold font-mono"
                    style={{ color: iface.color }}
                  >
                    {formatSpeed(iface.currentSpeedBps)}
                  </div>
                </div>
              </div>
            ))}

            {activeInterfaces.length === 0 && (
              <div className="text-xs text-slate-400 italic">No network adapters active</div>
            )}
          </div>

          {/* Convergence SVG Diagram */}
          <div className="relative flex-1 flex items-center justify-center px-2">
            <svg
              width={svgWidth}
              height={svgHeight}
              className="overflow-visible"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            >
              {activeInterfaces.map((iface, idx) => {
                const y1 = (idx + 0.5) * (svgHeight / numIfaces)
                const y2 = centerY
                const c1x = svgWidth * 0.4
                const c2x = svgWidth * 0.7
                const pathD = `M 4,${y1} C ${c1x},${y1} ${c2x},${y2} ${svgWidth - 28},${y2}`

                return (
                  <g key={iface.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke={iface.color}
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      className="opacity-80 transition-all duration-300"
                    />
                    <circle cx={4} cy={y1} r="3" fill={iface.color} />
                  </g>
                )
              })}

              {/* Central COMBINED node circle */}
              <circle
                cx={svgWidth - 22}
                cy={centerY}
                r="10"
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="2 2"
              />
              <circle cx={svgWidth - 22} cy={centerY} r="4" fill="#64748b" />

              {/* Arrow pointing right */}
              <path
                d={`M ${svgWidth - 9},${centerY} L ${svgWidth + 12},${centerY} M ${svgWidth + 6},${centerY - 4} L ${svgWidth + 12},${centerY} L ${svgWidth + 6},${centerY + 4}`}
                fill="none"
                stroke="#475569"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Text label "COMBINED" */}
              <text
                x={svgWidth - 22}
                y={centerY - 16}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                letterSpacing="0.08em"
                fill="#64748b"
              >
                COMBINED
              </text>
            </svg>
          </div>
        </div>

        {/* Center: Hero Total Speed Block (Cols 4) */}
        <div className="lg:col-span-4 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">
            TOTAL SPEED
          </span>

          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
              {speedDisplay.value}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 font-mono">
              {speedDisplay.unit}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono mb-2.5">
            <span>
              AVG <strong className="text-slate-700 dark:text-slate-200">{avgDisplay}</strong>
            </span>
            <span>•</span>
            <span>
              PEAK <strong className="text-slate-700 dark:text-slate-200">{peakDisplay}</strong>
            </span>
          </div>

          {multiplierStr && (
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold tracking-wider text-slate-700 dark:text-slate-300 shadow-xs uppercase">
                {multiplierStr}
              </span>
            </div>
          )}
        </div>

        {/* Right: THROUGHPUT Stream Wave Graph (Cols 3) */}
        <div className="lg:col-span-3 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              THROUGHPUT
            </span>
          </div>

          {/* Area wave canvas chart */}
          <div className="h-16 w-full rounded-lg bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 p-1 relative overflow-hidden flex items-end">
            <ThroughputWaveChart
              history={historyRef.current}
              interfaces={activeInterfaces}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

interface WaveProps {
  history: ThroughputPoint[]
  interfaces: NetworkInterfaceInfo[]
}

const ThroughputWaveChart: React.FC<WaveProps> = ({ history, interfaces }) => {
  const width = 220
  const height = 56

  if (history.length < 2) {
    return (
      <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-mono italic">
        Awaiting traffic...
      </div>
    )
  }

  // Find max peak in window for scaling
  const maxBps = Math.max(...history.map((h) => h.totalBps), 1024 * 1024)

  // Build stacked area polygons
  // For each interface, compute baseline and ceiling across the points
  const pointsCount = history.length
  const stepX = width / (pointsCount - 1)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full overflow-hidden"
      preserveAspectRatio="none"
    >
      <defs>
        {interfaces.map((iface) => (
          <linearGradient
            key={iface.id}
            id={`grad_${iface.id}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={iface.color} stopOpacity="0.8" />
            <stop offset="100%" stopColor={iface.color} stopOpacity="0.2" />
          </linearGradient>
        ))}
      </defs>

      {interfaces.map((iface, ifaceIdx) => {
        // Calculate stacked points
        const coords: { x: number; y: number }[] = []

        history.forEach((h, i) => {
          const x = i * stepX
          // Sum up speeds of this interface and previous ones for stacking
          let stackBps = 0
          for (let k = 0; k <= ifaceIdx; k++) {
            const curIface = interfaces[k]
            if (curIface) {
              stackBps += h.speeds[curIface.id] || 0
            }
          }
          const y = height - (stackBps / maxBps) * (height - 6)
          coords.push({ x, y })
        })

        // Generate smooth path
        let d = `M 0,${coords[0].y}`
        for (let i = 1; i < coords.length; i++) {
          const prev = coords[i - 1]
          const cur = coords[i]
          const cX = (prev.x + cur.x) / 2
          d += ` C ${cX},${prev.y} ${cX},${cur.y} ${cur.x},${cur.y}`
        }
        d += ` L ${width},${height} L 0,${height} Z`

        return (
          <path
            key={iface.id}
            d={d}
            fill={`url(#grad_${iface.id})`}
            stroke={iface.color}
            strokeWidth="1.5"
            className="transition-all duration-300"
          />
        )
      })}
    </svg>
  )
}
