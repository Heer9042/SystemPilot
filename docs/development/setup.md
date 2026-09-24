# Developer Setup Guide

## Prerequisites

- **Node.js**: v18.0 or later (v20+ recommended)
- **Rust**: 1.77+ with `msvc` toolchain
- **Visual Studio Build Tools**: C++ build tools and Windows SDK installed
- **WebView2 Runtime**: Included by default in Windows 10/11

## Quick Start

1. Clone the repository:
   ```powershell
   git clone https://github.com/Heer9042/SystemPilot.git
   cd SystemPilot
   ```

2. Run automated environment setup:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
   ```

3. Launch development mode:
   ```powershell
   npm run dev        # For frontend hot-reload in browser
   npm run tauri dev  # For desktop window hot-reload
   ```
