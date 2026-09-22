# SystemPilot 🚀

[![Build & Test](https://github.com/Heer9042/SystemPilot/actions/workflows/ci.yml/badge.svg)](https://github.com/Heer9042/SystemPilot/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-indigo.svg)](LICENSE)
[![Platform: Windows](https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue.svg)](https://microsoft.com/windows)
[![Tauri 2](https://img.shields.io/badge/Desktop-Tauri%202-orange.svg)](https://tauri.app)

**SystemPilot** is a professional, lightweight Windows system monitoring, memory management, performance optimization, and system utility desktop application.

Inspired by utilities such as *Mem Reduct* and *Windows Task Manager*, SystemPilot combines real-time hardware telemetry, safe memory working set optimization, process controls, gaming boosts, and diagnostic benchmarks into a modern interface.

---

## ⚡ Key Features

* 📊 **Live Dashboard**: Real-time 270° gauges for CPU load, Memory pressure, Disk capacity, and real-time Download/Upload bandwidth.
* 🧠 **Safe Memory Manager & Cleaner**: 
  - Detailed physical and virtual memory breakdown (In-Use, Cached/Standby, Free, Committed, Paged & Non-Paged pools).
  - Safe Win32 working set memory trimming (`EmptyWorkingSet` / `SetProcessWorkingSetSize`) without terminating processes.
  - Automatic background cleaning trigger with configurable RAM threshold (50%–90%) and cooldown timers.
* ⚙️ **Process Manager**:
  - Real-time processes table with live CPU %, Working Set RAM, PID, and executable path.
  - Instant process search, column sorting, priority class configuration (Low to High), suspend/resume, and protected termination.
* 🎮 **Gaming Mode**:
  - Automatically detects configured game executables on launch.
  - Automatically switches Windows Power Plan to *Ultimate Performance*, flushes standby cache, and deprioritizes background tasks.
* ⚡ **Performance Profiles**:
  - Direct integration with Windows Power Schemes (`powercfg` active GUIDs: Ultimate Performance, High Performance, Balanced, Power Saver).
* 🧹 **Safe System Cleanup Center**:
  - Scans and safely clears User Temp (`%TEMP%`), Windows Temp (`C:\Windows\Temp`), Thumbnail Caches, and Windows Recycle Bin.
* ⏱️ **Hardware Benchmarks & Stress Testing**:
  - Real multi-threaded CPU computational benchmark, 128MB sequential buffer memory bandwidth test, and disk IO throughput tester.
  - Controlled CPU stress testing with selectable duration and instant STOP button.
* 🛡️ **Defensive Security Center**:
  - Verifies Windows Defender Real-Time Protection status, Windows Firewall profiles, and UAC elevation controls.
* 🌙 **Modern Design**:
  - Dark and Light mode, glassmorphic UI, responsive desktop layout, and subtle micro-animations.

---

## 🛠️ Technology Stack

* **Frontend**: React, Vite, JavaScript, Tailwind CSS, Recharts, Lucide React
* **Desktop Shell**: Tauri 2 (frameless window, system tray, notifications)
* **System Layer**: Rust, `sysinfo`, `windows-sys` (Win32 APIs: `SetProcessWorkingSetSize`, `EmptyWorkingSet`, `SHEmptyRecycleBinW`, `powercfg`)
* **Storage**: Pure Rust embedded SQLite/ACID persistence (`systempilot.db`)

---

## 📦 Getting Started

### Prerequisites

1. **Node.js** (v18 or higher) & **npm**
2. **Rust Toolchain** (`rustup default stable`)
3. **C/C++ Build Tools** (MSVC C++ Build Tools or MinGW LLVM)

### Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Heer9042/SystemPilot.git
cd SystemPilot

# 2. Install frontend dependencies
npm install

# 3. Run the development server
npm run dev
```

### Production Build

```bash
# Build frontend web bundle
npm run build

# Build Tauri desktop executable
npm run tauri build
```

---

## 🌿 Git Workflow

We follow standard branch and release conventions:

* `main`: Production-ready, stable releases.
* `develop`: Integration branch for active development.
* `feature/<feature-name>`: Dedicated feature branches (e.g. `feature/memory-cleaner`).
* `fix/<bug-name>`: Targeted bug fixes.

---

## 🔒 Security & Privacy

SystemPilot operates entirely **locally** and **offline-first**:
* No telemetry, logs, or metrics leave your computer.
* No external cloud databases, servers, or authentication required.
* All memory operations use standard Windows-supported Win32 APIs.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
