import React from 'react'
import { Plus, Zap, Network, Sun, Moon } from 'lucide-react'
import { formatSpeed } from '../utils/format'

interface Props {
  totalSpeedBps: number
  onOpenAddModal: () => void
  activeFilter: 'all' | 'active' | 'completed'
  onFilterChange: (filter: 'all' | 'active' | 'completed') => void
  counts: {
    all: number
    active: number
    completed: number
  }
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

export const Navbar: React.FC<Props> = ({
  totalSpeedBps,
  onOpenAddModal,
  activeFilter,
  onFilterChange,
  counts,
  theme,
  onToggleTheme
}) => {
  return (
    <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur sticky top-0 z-40 px-5 flex items-center justify-between drag-region transition-colors">
      {/* Brand */}
      <div className="flex items-center gap-3 no-drag">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-orange-500 via-emerald-500 to-blue-600 p-[1px] flex items-center justify-center shadow-xs">
          <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[6px] flex items-center justify-center">
            <Network className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            NetMerger
            <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              v1.0
            </span>
          </h1>
        </div>
      </div>

      {/* Center Filters with Dynamic Badge Counts */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-1 rounded-xl no-drag shadow-xs">
        <button
          onClick={() => onFilterChange('all')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>All</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeFilter === 'all'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {counts.all}
          </span>
        </button>

        <button
          onClick={() => onFilterChange('active')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'active'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Active</span>
          {counts.active > 0 && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeFilter === 'active'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {counts.active}
          </span>
        </button>

        <button
          onClick={() => onFilterChange('completed')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            activeFilter === 'completed'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
        >
          <span>Completed</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
              activeFilter === 'completed'
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {counts.completed}
          </span>
        </button>
      </div>

      {/* Right Controls (with mr-36 spacing for native Windows minimize/maximize/close buttons) */}
      <div className="flex items-center gap-3 no-drag mr-36">
        {totalSpeedBps > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold shadow-xs">
            <Zap className="w-3.5 h-3.5 animate-pulse" />
            <span>{formatSpeed(totalSpeedBps)}</span>
          </div>
        )}

        {/* Light/Dark Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white rounded-lg transition-all shadow-xs active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Download</span>
        </button>
      </div>
    </header>
  )
}
