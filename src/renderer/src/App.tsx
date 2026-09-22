import React, { useEffect, useRef, useState } from 'react'
import type { DownloadTask, NetworkInterfaceInfo } from '../../shared/types'
import { Navbar } from './components/Navbar'
import { NetworkConvergenceHeader } from './components/NetworkConvergenceHeader'
import { NetworkAdaptersBar } from './components/NetworkAdaptersBar'
import { DownloadCard } from './components/DownloadCard'
import { AddDownloadModal } from './components/AddDownloadModal'
import { Download, Plus, Wifi, Smartphone, ArrowRight, CheckCircle2, Zap } from 'lucide-react'

export default function App() {
  const [downloads, setDownloads] = useState<DownloadTask[]>([])
  const [interfaces, setInterfaces] = useState<NetworkInterfaceInfo[]>([])
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('netmerger_theme') as 'light' | 'dark') || 'light'
  })
  const [peakSpeedBps, setPeakSpeedBps] = useState(0)
  const speedHistoryRef = useRef<number[]>([])

  useEffect(() => {
    // Initial data fetch
    window.api.getNetworkInterfaces().then(setInterfaces)
    window.api.getDownloads().then(setDownloads)

    // Listen to real-time events from Main Process
    const unsubscribeDownloads = window.api.onDownloadsUpdated((tasks: DownloadTask[]) => {
      setDownloads(tasks)
    })

    const unsubscribeInterfaces = window.api.onInterfacesUpdated((ifaces: NetworkInterfaceInfo[]) => {
      setInterfaces(ifaces)
    })

    return () => {
      unsubscribeDownloads()
      unsubscribeInterfaces()
    }
  }, [])

  // Manage theme class on root element and save preference
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('netmerger_theme', theme)
  }, [theme])

  const handleToggleInterface = async (id: string, enabled: boolean) => {
    await window.api.toggleNetworkInterface(id, enabled)
  }

  const handlePause = async (id: string) => {
    await window.api.pauseDownload(id)
  }

  const handleResume = async (id: string) => {
    await window.api.resumeDownload(id)
  }

  const handleCancel = async (id: string) => {
    await window.api.cancelDownload(id)
  }

  const handleOpenFolder = async (filePath: string) => {
    await window.api.openFileLocation(filePath)
  }

  const handleStartDownload = async (
    url: string,
    destinationDir: string,
    customFilename?: string
  ) => {
    await window.api.startDownload(url, destinationDir, customFilename)
  }

  // Calculate aggregate speed
  const totalSpeedBps = downloads
    .filter((d) => d.status === 'downloading')
    .reduce((acc, curr) => acc + curr.speedBps, 0)

  // Track Peak and Average speeds
  useEffect(() => {
    if (totalSpeedBps > peakSpeedBps) {
      setPeakSpeedBps(totalSpeedBps)
    }
    if (totalSpeedBps > 0) {
      speedHistoryRef.current.push(totalSpeedBps)
      if (speedHistoryRef.current.length > 60) {
        speedHistoryRef.current.shift()
      }
    }
  }, [totalSpeedBps, peakSpeedBps])

  const avgSpeedBps =
    speedHistoryRef.current.length > 0
      ? Math.round(
          speedHistoryRef.current.reduce((a, b) => a + b, 0) /
            speedHistoryRef.current.length
        )
      : totalSpeedBps

  // Dynamic filter counts
  const allCount = downloads.length
  const activeCount = downloads.filter((d) =>
    ['downloading', 'merging', 'probing'].includes(d.status)
  ).length
  const completedCount = downloads.filter((d) => d.status === 'completed').length

  // Filter downloads
  const filteredDownloads = downloads.filter((d) => {
    if (activeFilter === 'active') {
      return d.status === 'downloading' || d.status === 'merging' || d.status === 'probing'
    }
    if (activeFilter === 'completed') {
      return d.status === 'completed'
    }
    return true
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#f1f5f9] dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans select-none transition-colors">
      {/* Top Navbar */}
      <Navbar
        totalSpeedBps={totalSpeedBps}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={{
          all: allCount,
          active: activeCount,
          completed: completedCount
        }}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      />

      {/* Main Content Area - Expands gracefully on widescreen & fullscreen */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1560px] w-full mx-auto">
        {/* Signature Plexo Network Convergence & Throughput Header */}
        <NetworkConvergenceHeader
          interfaces={interfaces}
          totalSpeedBps={totalSpeedBps}
          avgSpeedBps={avgSpeedBps}
          peakSpeedBps={peakSpeedBps}
        />

        {/* Network Adapters Bar */}
        <NetworkAdaptersBar interfaces={interfaces} onToggle={handleToggleInterface} />

        {/* Downloads List */}
        <div className="space-y-4">
          {filteredDownloads.map((task) => (
            <DownloadCard
              key={task.id}
              task={task}
              interfaces={interfaces}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              onOpenFolder={handleOpenFolder}
            />
          ))}

          {/* Context-Aware Empty State */}
          {filteredDownloads.length === 0 && (
            <div className="flex flex-col items-center justify-center p-8 md:p-14 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-[#0c1220]/50 my-4 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500/10 to-emerald-500/10 border border-slate-200 dark:border-slate-700 flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                {activeFilter === 'completed' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                ) : activeFilter === 'active' ? (
                  <Zap className="w-7 h-7 text-amber-500" />
                ) : (
                  <Download className="w-7 h-7" />
                )}
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-1">
                {activeFilter === 'completed'
                  ? 'No completed downloads'
                  : activeFilter === 'active'
                  ? 'No active downloads in progress'
                  : 'No downloads yet'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6">
                {activeFilter === 'completed'
                  ? 'Files you complete downloading will appear here. You can open them or reveal them in Explorer anytime.'
                  : activeFilter === 'active'
                  ? 'There are currently no active transfers running. Start a new download or resume an existing one.'
                  : 'Paste any download link (Direct files, YouTube, TikTok, social media) to accelerate your download across all active network cards in parallel.'}
              </p>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white rounded-xl shadow-xs transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Download</span>
                </button>

                {activeFilter !== 'all' && downloads.length > 0 && (
                  <button
                    onClick={() => setActiveFilter('all')}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl transition-all"
                  >
                    View All ({downloads.length})
                  </button>
                )}
              </div>

              {/* How it works info card */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 w-full max-w-2xl text-left">
                <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-xs">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                    <Wifi className="w-4 h-4" />
                    <span>1. Connect Wi-Fi</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Connect your PC to your standard home Wi-Fi or broadband.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-xs">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold mb-1">
                    <Smartphone className="w-4 h-4" />
                    <span>2. Plug In Phone</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Enable USB Tethering on your phone to add cellular data.
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs shadow-xs">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold mb-1">
                    <ArrowRight className="w-4 h-4" />
                    <span>3. Combined Speed</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    NetMerger aggregates bandwidth across all active connections simultaneously!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add Download Modal */}
      <AddDownloadModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onStart={handleStartDownload}
      />
    </div>
  )
}
