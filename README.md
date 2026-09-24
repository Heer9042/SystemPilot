# SystemPilot 🚀

[![Build & Test](https://github.com/Heer9042/SystemPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Heer9042/SystemPilot/actions)
[![Production Release](https://github.com/Heer9042/SystemPilot/actions/workflows/release.yml/badge.svg)](https://github.com/Heer9042/SystemPilot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202-orange.svg)](https://tauri.app)

**SystemPilot** is a professional, lightweight Windows system monitoring, memory management, performance optimization, and diagnostic utility desktop application.

Built with **Tauri 2**, **Rust**, **React**, and native **Win32 APIs**, SystemPilot provides real-time hardware telemetry, safe memory working set optimization, process inspection and control, system cleanup, and diagnostic stress testing in a responsive, glassmorphic desktop interface.

---

## ⚡ Key Features

* 📊 **Live Dashboard**: Real-time 270° interactive gauges for CPU load, Memory pressure, Disk capacity, and Download/Upload bandwidth.
* 🧠 **Safe Memory Manager & Cleaner**: 
  - Detailed physical and virtual memory breakdown (In-Use, Cached/Standby, Free, Committed, Paged & Non-Paged pools).
  - Safe Win32 working set memory trimming (`EmptyWorkingSet` / `SetProcessWorkingSetSize`) without terminating processes.
  - Automatic background cleaning trigger with configurable RAM threshold (50%–90%) and cooldown timers.
* ⚙️ **Process Manager**:
  - Real-time processes table with live CPU %, Working Set RAM, PID, and executable path.
  - Instant process search, column sorting, priority class configuration (Low to High), suspend/resume, and safe process termination.
* ⚡ **Performance Profiles**:
  - Direct integration with Windows Power Schemes (`powercfg` active GUIDs: Ultimate Performance, High Performance, Balanced, Power Saver).
* 🧹 **Safe System Cleanup Center**:
  - Scans and safely clears User Temp (`%TEMP%`), Windows Temp (`C:\Windows\Temp`), Thumbnail Caches, and Windows Recycle Bin.
* ⏱️ **Hardware Benchmarks & Stress Testing**:
  - Multi-threaded CPU computational benchmark, sequential buffer memory bandwidth test, and disk IO throughput tester.
  - Controlled CPU stress testing with selectable duration and instant STOP button.
* 🛡️ **Defensive Security Center**:
  - Checks Windows Defender Real-Time Protection status, Windows Firewall profiles, and UAC elevation controls.
* 🔄 **In-App Version Control & Updates**:
  - Checks official GitHub Releases for verified new builds with "Update Now" and "Later" choices.
* 🌙 **Modern Design & Accessibility**:
  - Dark and Light mode, glassmorphic UI, collapsible sidebar, responsive desktop layout, and subtle micro-animations.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite 5, Tailwind CSS, Recharts, Lucide React
* **Desktop Shell**: Tauri 2 (frameless window, system tray, native window controls)
* **System Layer**: Rust, `sysinfo`, `windows-sys` (Win32 APIs: `SetProcessWorkingSetSize`, `EmptyWorkingSet`, `SHEmptyRecycleBinW`, `powercfg`)
* **Storage**: Pure Rust embedded SQLite/ACID persistence (`systempilot.db`)

---

## 📦 Getting Started

### Prerequisites

1. **Node.js** (v18 or higher) & **npm**
2. **Rust Toolchain** (`rustup default stable`)
3. **C/C++ Build Tools** (MSVC C++ Build Tools or MinGW GCC)

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Heer9042/SystemPilot.git
cd SystemPilot

# 2. Install frontend dependencies
npm --prefix frontend install

# 3. Run the development server with Tauri
npm run dev
```

### Production Build

```bash
# Run the one-click Windows production builder
.\build.bat
```

Or manually:
```bash
# Build frontend web bundle
npm run build

# Build Tauri desktop executable & installers
npm run tauri build
```

---

## 🔒 Security & Privacy

SystemPilot operates entirely **locally** and **offline-first**:
* All telemetry and metrics remain solely on your local computer.
* No advertising, user tracking, or third-party analytics SDKs.
* Update checks communicate strictly over HTTPS with the official GitHub Releases API.
* For full details, see our [Privacy Policy](docs/PRIVACY.md) and [Security Policy](SECURITY.md).

---

## ⚖️ Legal & Third-Party Notices

* **License**: SystemPilot is licensed under the [MIT License](LICENSE).
* **Third-Party Notices**: For licenses of open-source libraries utilized by SystemPilot, see [THIRD_PARTY_NOTICES.md](docs/THIRD_PARTY_NOTICES.md).
* **Disclaimer**: *SystemPilot is an independent system utility and is not affiliated with, sponsored by, or endorsed by Microsoft Corporation. Windows is a trademark of Microsoft Corporation.*
