import React from 'react'
import type { NetworkInterfaceInfo } from '../../../shared/types'
import { Wifi, Smartphone, Network, Globe, Power } from 'lucide-react'
import { formatSpeed } from '../utils/format'

interface Props {
  interfaces: NetworkInterfaceInfo[]
  onToggle: (id: string, enabled: boolean) => void
}

export const NetworkAdaptersBar: React.FC<Props> = ({ interfaces, onToggle }) => {
  const getIcon = (kind: string) => {
    switch (kind) {
      case 'wifi':
        return <Wifi className="w-4 h-4" />
      case 'usb':
        return <Smartphone className="w-4 h-4" />
      case 'ethernet':
        return <Network className="w-4 h-4" />
      default:
        return <Globe className="w-4 h-4" />
    }
  }

  const activeCount = interfaces.filter((i) => i.enabled).length

  return (
    <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Active Network Adapters ({activeCount} Enabled)
          </span>
        </div>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          Multipath socket aggregation active
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        {interfaces.map((iface) => {
          return (
            <div
              key={iface.id}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                iface.enabled
                  ? 'bg-slate-50/80 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 shadow-xs'
                  : 'bg-slate-100/40 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-800/50 opacity-50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                  style={{
                    backgroundColor: iface.enabled ? `${iface.color}20` : '#e2e8f0',
                    color: iface.enabled ? iface.color : '#94a3b8'
                  }}
                >
                  {getIcon(iface.kind)}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {iface.name}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: iface.color }}
                      title={`Color in chunk grid: ${iface.color}`}
                    />
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 font-mono">
                    <span>{iface.ip}</span>
                    <span>•</span>
                    <span
                      className="font-bold"
                      style={{ color: iface.enabled ? iface.color : undefined }}
                    >
                      {iface.enabled && iface.currentSpeedBps > 0
                        ? formatSpeed(iface.currentSpeedBps)
                        : 'Idle'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onToggle(iface.id, !iface.enabled)}
                className={`p-1.5 rounded-lg transition-colors ${
                  iface.enabled
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                    : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title={iface.enabled ? 'Disable interface' : 'Enable interface'}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
          )
        })}

        {interfaces.length === 0 && (
          <div className="col-span-full py-3 text-center text-xs text-slate-400">
            Scanning for network adapters...
          </div>
        )}
      </div>
    </div>
  )
}
