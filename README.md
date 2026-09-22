<div align="center">

# 🌐 NetMerger

**A free, open-source download accelerator that combines multiple internet connections (Wi-Fi, Ethernet, Mobile USB Tethering) simultaneously for maximum download speed.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)](https://github.com/nafissami19/NetMerger/releases)
[![Platform](https://img.shields.io/badge/platform-Windows-0078D6.svg?style=for-the-badge&logo=windows)](https://github.com/nafissami19/NetMerger/releases)
[![Electron](https://img.shields.io/badge/Electron-34-47848F.svg?style=for-the-badge&logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Zero AI](https://img.shields.io/badge/AI-Zero%20AI%20%7C%20100%25%20Local-purple.svg?style=for-the-badge)](https://github.com/nafissami19/NetMerger)

</div>

---

### 📖 The Backstory

> *"I was on vacation at my village home with painfully slow Wi-Fi and didn't feel like waiting hours to download a movie. So I built NetMerger to combine the bandwidth of three different network connections and use them together for downloading.*
>
> *It worked for me, so I made it public."*
>
> — **Nafis Sami** ([@nafissami19](https://github.com/nafissami19))

---

## 💡 The Problem NetMerger Solves

Every modern operating system (Windows, macOS, Linux) routes **100% of outbound internet traffic through a single default gateway** (usually whatever Wi-Fi or Ethernet connection connected first).

If you connect to your home Wi-Fi and simultaneously plug in your smartphone via USB with **USB Tethering** enabled, Windows detects both network cards—**but lets the second connection sit at 0% utilization**. Commercial "channel bonding" software often costs \$10 to \$50 per month, requires third-party VPN accounts, or demands expensive enterprise multi-WAN routers.

**NetMerger eliminates all of that.** It runs locally on your PC, directly binds outgoing TCP sockets to each physical network adapter's local IPv4 address, and slices downloads across all active adapters concurrently.

**100% free. No subscriptions. No VPN accounts. No cloud servers. Zero runtime AI.**

---

## ⚡ How It Works Under The Hood

```
                                  ┌── [Wi-Fi: 192.168.0.101] ──────→ Chunks 0, 3, 6... ──┐
                                  │                                                       │
Direct File URL (HTTP Range 206) ─┼── [USB Phone: 172.20.10.4] ────→ Chunks 1, 4, 7... ──┼──→ Final Merged File
                                  │                                                       │
                                  └── [Ethernet: 192.168.1.50] ────→ Chunks 2, 5, 8... ──┘
```

1. **HTTP Range Probing (`206 Partial Content`)**:
   Before initiating a download, NetMerger sends a 1-byte probe (`Range: bytes=0-0`). It detects whether the host supports chunked parallel downloads, inspects content headers (`Content-Length`, `ETag`, `Last-Modified`), and resolves redirect chains automatically.
2. **Local Socket Source Binding (`localAddress`)**:
   In Node.js, network sockets can be explicitly bound to an interface's local IP address (`localAddress: interfaceIp`). Worker sockets assigned to your Wi-Fi interface route strictly through Wi-Fi, while worker sockets assigned to your phone's USB tether route strictly through mobile data.
3. **Dynamic Work-Stealing Schedulers**:
   Files are divided into balanced 8 MB chunk slices. Slower adapters will never hold back faster ones—as soon as any worker on any connection finishes its assigned slice, it steals the next pending chunk from the queue.
4. **Resumable Part Assembly**:
   Each chunk downloads into a verified `.part` file. Upon 100% completion, chunks are sequentially assembled into your destination folder, and temporary parts are automatically cleaned up.

---

## ✨ Features

- 🚀 **Multi-NIC Parallel Acceleration**: Bond broadband Wi-Fi, Ethernet, and cellular data (4G/5G USB tethering) for combined aggregate throughput.
- 🎬 **Universal Media & Direct Downloader**:
  - Direct file downloads (`.zip`, `.iso`, `.exe`, `.tar`, `.mp4`, etc.) with parallel multi-connection slicing.
  - Bundled local `yt-dlp` and `ffmpeg` engine—paste links from YouTube, TikTok, X (Twitter), Reddit, Instagram, SoundCloud, etc., and download directly to your PC without third-party web tools or paid APIs.
- 📊 **Real-Time Plexo Telemetry**:
  - **Convergence Flow Chart**: Live bezier visualization showing packet paths streaming from each network card into a combined stream.
  - **Total Speed Hero**: Real-time aggregate bandwidth, peak speed, average speed, and a dynamic speedup multiplier badge (e.g. `2.4x WI-FI ALONE ↗`).
  - **Throughput Wave Chart**: Live stacked streaming area chart displaying individual adapter transfer rates.
  - **160-Block Chunk Matrix**: Signature 4-row × 40-column matrix that lights up in real time with the unique color assigned to each network adapter.
- 🔄 **Crash-Resilient & Resumable**:
  - Pause and resume downloads at any time.
  - Automatic retry and error recovery button (`↻`) for interrupted transfers without re-entering URLs.
  - Automatic rollback on stalled connections to ensure byte-perfect file integrity without double-counting.
- 💻 **Native Windows Experience**:
  - Frameless dark/light window with integrated Windows control buttons (`_ □ ✕`).
  - Native file dialogs and "Open in Folder" shortcut to reveal files directly in Windows Explorer.
  - Automatic detection of physical network adapters via native Windows network APIs.
  - Zero idle CPU footprint with intelligent adapter description caching.
- 🎨 **Adaptive Themes & Widescreen Scaling**:
  - Fluid responsive UI scaling gracefully across 1080p, 1440p, and 4K displays.
  - Instant Light Mode and Dark Mode toggle with theme-adaptive custom scrollbars.
- 🛡️ **Privacy-First & Zero AI**:
  - 100% offline network engine.
  - No user telemetry, no tracking, no external API keys, and no generative AI.

---

## 📱 How to Use (Step-by-Step)

### Step 1: Connect Your Internet Connections
1. Keep your PC connected to your normal **Home Wi-Fi** or **Ethernet**.
2. Connect your smartphone (Android or iPhone) to your PC using a USB cable.
3. On your phone:
   - **Android**: Go to *Settings → Network & Internet / Hotspot & Tethering → Turn on **USB Tethering***.
   - **iPhone**: Go to *Settings → Personal Hotspot → Turn on **Allow Others to Join*** (choose USB only if prompted).

### Step 2: Launch NetMerger
Open NetMerger. Within 2 seconds, you will see all active network adapters listed in the top dashboard (e.g., `Wi-Fi`, `Ethernet`, `Remote NDIS / USB Tethering`) with their assigned colors and IP addresses.

### Step 3: Add a Download
1. Click **+ New Download** (or press `Enter` in the URL box).
2. Paste any direct download link or media video URL.
3. NetMerger will automatically inspect the link, detect parallel range support, and choose your Windows `Downloads` folder.
4. Click **Start Download**.

### Step 4: Watch the Speeds Combine
Watch your total download speed jump beyond what any single network connection could provide alone! The live chunk grid will illuminate in real time, displaying which network adapter downloaded each piece of the file.

---

## 📥 Installation & Downloads

Pre-built binaries for 64-bit Windows are available on the [Releases](https://github.com/nafissami19/NetMerger/releases) page:

| Package Type | Description |
| :--- | :--- |
| **`NetMerger 1.0.0.exe`** | **Portable Executable**: Zero installation needed. Just double-click and run from anywhere (or run directly from a USB flash drive). |
| **`NetMerger Setup 1.0.0.exe`** | **Windows Installer (NSIS)**: Installs NetMerger to your PC and creates Start Menu & Desktop shortcuts. |

---

## 🛠️ Building from Source

### Prerequisites
- **Operating System**: Windows 10 or Windows 11 (64-bit)
- **Node.js**: v18.0.0 or higher
- **Git**

### 1. Clone the repository
```bash
git clone https://github.com/nafissami19/NetMerger.git
cd NetMerger
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run in development mode (with HMR)
```bash
npm run dev
```

### 4. Build Windows installer & portable binaries
```bash
npm run build:win
```
The compiled binaries will be output directly into the `dist/` directory:
- `dist/NetMerger 1.0.0.exe` (Standalone Portable)
- `dist/NetMerger Setup 1.0.0.exe` (Installer)
- `dist/win-unpacked/NetMerger.exe` (Unpacked Directory)

---

## 🏗️ Project Architecture

```
NetMerger/
├── bin/                        # Bundled standalone utilities (yt-dlp.exe, ffmpeg.exe)
├── src/
│   ├── main/                   # Electron Main Process (Node.js backend)
│   │   ├── download/
│   │   │   ├── chunkDownloader.ts   # Socket-bound HTTP range downloader with redirect handling
│   │   │   ├── downloadManager.ts   # Work-stealing concurrency queue & file merger
│   │   │   ├── mediaExtractor.ts    # yt-dlp/ffmpeg local media resolver
│   │   │   └── probe.ts             # 206 Partial Content capability probe
│   │   ├── network/
│   │   │   └── interfaces.ts        # Hardware NIC discovery & live throughput monitor
│   │   ├── apiServer.ts             # Local fallback HTTP API server
│   │   └── index.ts                 # Electron window & IPC controllers
│   ├── preload/                # Secure IPC bridge (contextIsolation)
│   │   └── index.ts
│   ├── renderer/               # React 18 frontend (Vite + Tailwind CSS)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── Navbar.tsx                   # Filter bar with live counts & theme switcher
│   │       │   ├── NetworkConvergenceHeader.tsx # Bezier flow diagram & throughput wave chart
│   │       │   ├── NetworkAdaptersBar.tsx       # Live adapter cards & enable/disable toggles
│   │       │   ├── DownloadCard.tsx             # Active task cards with chunk grids
│   │       │   ├── PlexoChunkGrid.tsx           # 160-block responsive chunk matrix
│   │       │   └── AddDownloadModal.tsx         # Universal URL inspector & destination picker
│   │       ├── App.tsx                          # Main dashboard state & responsive layout
│   │       └── index.css                        # Adaptive scrollbars & Tailwind rules
│   └── shared/                 # Common TypeScript interfaces & types
└── electron-builder.yml        # Windows packaging & installer configuration
```

---

## ❓ Frequently Asked Questions (FAQ)

#### Q: Do I need a special router or expensive network switch?
**A:** No. NetMerger operates purely on software socket binding on your PC. You can combine a standard home Wi-Fi network with your mobile phone's 4G/5G data over a standard USB cable.

#### Q: Does this work with any download link?
**A:** Multi-network parallel acceleration works with any server that supports HTTP Range requests (`206 Partial Content`), which is standard across most file hosts, CDNs, GitHub releases, Google Drive direct links, ISO mirrors, and archives. For servers that only support single-stream downloads or media streams, NetMerger automatically downloads over your fastest active adapter without failing.

#### Q: Will this use my mobile data?
**A:** Only when USB Tethering is plugged in and enabled on your phone. If you have limited cellular data, you can toggle off the USB adapter anytime directly from the NetMerger dashboard using the adapter power switch.

#### Q: Is there any AI or tracking in NetMerger?
**A:** No. NetMerger uses **zero AI, zero telemetry, and zero tracking**. All network routing, chunk scheduling, and media stream extractions execute 100% locally on your machine.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by [Nafis Sami](https://github.com/nafissami19)

⭐ **If NetMerger saved you time, please star the repository!** ⭐

</div>
