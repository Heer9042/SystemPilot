# SystemPilot 🚀

<div align="center">

[![Latest Release](https://img.shields.io/github/v/release/Heer9042/SystemPilot?color=indigo&label=Release&logo=github)](https://github.com/Heer9042/SystemPilot/releases/latest)
[![Build & Test](https://github.com/Heer9042/SystemPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Heer9042/SystemPilot/actions)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-0078D6?logo=windows&logoColor=white)](https://microsoft.com/windows)
[![Desktop: Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202-FFC131?logo=tauri&logoColor=black)](https://tauri.app)
[![Backend: Rust](https://img.shields.io/badge/Backend-Rust%202021-DEA584?logo=rust&logoColor=black)](https://www.rust-lang.org)
[![Frontend: React 18](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

**A modern, lightweight Windows system monitoring, memory optimization, hardware diagnostics, and performance suite.**

[Downloads](https://github.com/Heer9042/SystemPilot/releases/latest) • [Key Features](#-key-features) • [Installation](#-installation--downloads) • [Architecture](#-technology-stack) • [Security & Privacy](#-security--privacy)

</div>

---

## 📖 Overview

**SystemPilot** is a high-performance Windows desktop application built with **Tauri 2**, **Rust**, **React**, and native **Win32 APIs**. It delivers real-time hardware telemetry, safe memory working-set optimization, process inspection, deep hardware topology diagnostics, safe cache cleanup with real-time progress indicators, and system stress testing inside an ultra-fast, glassmorphic UI.

---

## ⚡ Key Features

### 📊 Live System Dashboard
- Real-time 270° interactive telemetry gauges for CPU utilization, Memory pressure, Storage capacity, and Network throughput (Download / Upload bandwidth).
- Micro-charts and telemetry trends updating with low CPU overhead.

### 🧹 Safe System Cleanup Center
- Scans and safely purges temporary application caches (`%TEMP%`), Windows system service dumps (`C:\Windows\Temp`), stale Windows Thumbnail Databases, and Recycle Bin.
- **Live Multi-Stage Progress Tracker**: Smooth animated progress bar (`0%` to `100%`), real-time deletion status messages, and live counters for **Files Removed** and **Space Reclaimed**.
- Safety checks ensure personal user documents, downloads, and personal files are never touched.

### 🔬 Exhaustive Hardware Specification & Diagnostics
- **Motherboard & Baseboard**: Manufacturer, Product Model, Board Version, System Family, and SKU ID.
- **BIOS & Security Firmware**: BIOS Vendor, Firmware Version, Release Date, UEFI 64-bit architecture, Secure Boot state, and TPM 2.0 module detection.
- **CPU Topology & Instructions**: Physical Cores vs. Logical SMT Threads, Base Clock Speed, Hardware Virtualization (`VT-x` / `AMD-V`), and CPU instruction set extension badges (`AVX2`, `SSE4.2`, `AES-NI`, `FMA3`, `x86-64-v3`).
- **Physical Memory (RAM)**: Form factor (`DIMM` vs. `SO-DIMM`), DDR generation, Clock speed (MT/s), and Dual-Channel interleaved topology.
- **Graphics Adapters (GPU)**: Dedicated and integrated display adapters, VRAM size, and WDDM driver versions.
- **Storage Drives**: Partitions hierarchy (`C:\`, `D:\`), file systems, drive health, and visual capacity utilization bars.
- **Network Hardware**: Physical and virtual network interfaces, hardware MAC addresses, and active connection link status.
- **Audio Controllers**: High Definition Audio codecs and controller device list (Realtek, Intel, NVIDIA).
- **One-Click Clipboard Exporter**: Instant **"Copy Hardware Spec"** button to export system specifications in markdown.

### 🧠 Safe Memory Manager & Working Set Optimizer
- Detailed physical and virtual memory breakdown (In-Use, Cached/Standby, Free, Committed, Paged & Non-Paged memory pools).
- Safe Win32 working set memory trimming (`EmptyWorkingSet` / `SetProcessWorkingSetSize`) without terminating running processes.
- Automatic background RAM cleaner trigger with configurable utilization thresholds (50%–90%) and cooldown timers.

### ⚙️ Process Manager & Task Control
- Real-time process table with live CPU %, Working Set RAM, Process ID (PID), and executable paths.
- Instant search, column sorting, priority class configuration (Idle to Realtime), process suspend/resume, and safe process termination.

### ⚡ Performance & Power Schemes
- Direct integration with Windows Power Schemes (`powercfg` active GUIDs: Ultimate Performance, High Performance, Balanced, Power Saver).

### ⏱️ Hardware Benchmarks & Stress Testing
- Multi-threaded CPU computational benchmark, sequential buffer memory bandwidth test, and disk IO throughput tester.
- Controlled CPU stress testing with selectable duration and instant STOP button.

### 🛡️ Defensive Security Center
- Live verification of Windows Defender Real-Time Protection, Windows Firewall profile rules, UAC elevation policies, and Secure Boot status.

### 🔄 In-App Version Control & Responsive Settings
- Mobile/desktop responsive settings dashboard with interactive category navigation tabs (*All*, *Appearance*, *System Tray*, *Updates*, *Alerts*, *About*).
- Built-in updater checking official GitHub Releases for verified new builds.
- **Single-Source Automated Versioning**: Run `npm run bump <version>` to synchronize versions automatically across root, frontend, Rust, and Tauri configurations.

---

## 📦 Installation & Downloads

Download the latest production release from [GitHub Releases](https://github.com/Heer9042/SystemPilot/releases/latest):

| Package Type | File Name | Description |
| :--- | :--- | :--- |
| **Installer (NSIS)** | `SystemPilot-Setup.exe` | Standard Windows Setup Wizard with Start Menu shortcuts |
| **Windows Installer** | `SystemPilot.msi` | Enterprise-ready Windows MSI Installer package |
| **Portable Package** | `SystemPilot-Portable.zip` | Standalone zero-install archive (includes `SystemPilot.exe` + `WebView2Loader.dll`) |
| **Integrity Hashes** | `SHA256SUMS.txt` | Cryptographic SHA-256 Checksums for verification |

---

## 🛠️ Technology Stack

```
SystemPilot Architecture
├── Presentation Layer (React 18 + Vite 5 + Tailwind CSS + Lucide Icons + Recharts)
├── Desktop Shell (Tauri 2 Frameless Window + System Tray + Native Dialogs)
├── Systems & Telemetry Layer (Rust + sysinfo + windows-sys Win32 APIs)
└── Local Persistence (Embedded SQLite ACID Database / systempilot.db)
```

- **Frontend**: React 18, Vite 5, Tailwind CSS, Recharts, Lucide React
- **Desktop Shell**: Tauri 2 (frameless native window, system tray, custom window controls)
- **System Layer**: Rust 2021, `sysinfo`, `windows-sys` (Win32 APIs: `SetProcessWorkingSetSize`, `EmptyWorkingSet`, `SHEmptyRecycleBinW`, `powercfg`, Registry APIs)
- **Storage**: Pure Rust embedded SQLite database (`systempilot.db`)

---

## 🚀 Getting Started (Development)

### Prerequisites

1. **Node.js** (v18 or higher) & **npm**
2. **Rust Toolchain** (`rustup default stable`)
3. **C/C++ Build Tools** (MSVC C++ Build Tools or MinGW GCC)

### Setup & Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/Heer9042/SystemPilot.git
cd SystemPilot

# 2. Install frontend dependencies
npm --prefix frontend install

# 3. Start development server with Tauri
npm run dev
```

### Production Build

```bash
# One-click Windows release builder (generates Setup.exe, .msi, and Portable.zip)
.\build.bat
```

Or manually:
```bash
# Build frontend web bundle
npm run build

# Build Tauri desktop executable and installer bundles
npm run tauri build
```

---

## 🔒 Security & Privacy

SystemPilot is engineered with a **local-first, privacy-respecting** architecture:
- **Zero Telemetry / No Phone Home**: All system statistics, hardware diagnostics, and processes remain 100% on your machine.
- **No Ads or Trackers**: No third-party analytics SDKs, advertising libraries, or external trackers.
- **Secure Updates**: In-app update queries communicate solely over TLS with the official GitHub Releases API.
- For complete details, review our [Privacy Policy](docs/PRIVACY.md) and [Security Policy](SECURITY.md).

---

## ⚖️ Legal & Licensing

- **License**: Distributed under the open-source [MIT License](LICENSE).
- **Third-Party Notices**: Review third-party dependencies in [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
- **Disclaimer**: *SystemPilot is an independent system utility and is not affiliated with, sponsored by, or endorsed by Microsoft Corporation. Windows is a registered trademark of Microsoft Corporation.*

---

<div align="center">
  <sub>Built with ❤️ by Heer Patel and the SystemPilot Contributors.</sub>
</div>
