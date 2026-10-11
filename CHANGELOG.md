# Changelog

All notable changes to **SystemPilot** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-10-11

### Initial Production Release
- Complete repository and version-history reset to `v0.0.1`.
- **System Telemetry & Monitoring:** Real-time CPU, RAM, Disk, Network, GPU, and Hardware Cooling/Thermal monitoring with ACPI zone querying.
- **Process Manager:** High-performance Windows task manager with safe termination, defensive telemetry parsing, and elevation handling.
- **Diagnostics & Windows Tools:** Centralized management center for Computer Management, Services, Event Viewer, Firewall, and Local Users.
- **Installer & Security:** NSIS & MSI packaging with Authenticode signing integration, WebView2 deployment, and `requireAdministrator` execution level.


### Added
- Reset public release version to `v0.0.1` as the new initial production release.
- Added comprehensive Windows System Information card & details modal (edition, build, architecture, uptime, hardware specs).
- Added genuine Windows activation status detection distinguishing retail, OEM, and volume channels without exposing keys.
- Added multi-GPU enumeration and graphics adapter selector dropdown with per-adapter telemetry.
- Added cooling and fan monitoring cards with accurate sensor availability detection.
- Added dedicated BIOS / UEFI navigation page covering firmware specs, Secure Boot, TPM 2.0, virtualization, and UAC-verified restart to UEFI.
- Added System Control hub with Control Panel, Computer Management, Windows Services, Firewall profile status, Local Users, and Event Viewer.
- Added Physical Disks dropdown, nested 7-tab storage navigation, and dedicated read-only Partitions view.
- Added Task Manager-style real-time scrolling memory history area chart with usage, used/available, and committed views.
- Added accessible green/red/gray status indicators and throughput counters to Network Monitor.
- Implemented native WinINet streaming auto-update system with real-time byte & percentage progress, cryptographic SHA-256 verification, and silent in-place installation (`/S`) with automated supervisor relaunch.
- Enforced `requireAdministrator` application manifest execution level for seamless elevated system administration features.
- Bundled and deployed `WebView2Loader.dll` directly alongside `SystemPilot.exe` in the NSIS installer to ensure instant startup on all Windows 10/11 systems.

---

### Historical Development (Pre-v0.0.1 Development Cycle)

#### [0.1.2] - 2026-09-30 (Internal Pre-Release)

### Fixed
- Fixed critical COM vtable pointer corruption in Win32 DXGI adapter enumeration (`system::gpu`) causing SEH `STATUS_ACCESS_VIOLATION` (0xC0000005) when querying displays during Dashboard initialization on machines with active monitors.
- Fixed potential deadlocks and race conditions in GPU tracker mutex locks by switching to `parking_lot::Mutex` and wrapping the `get_gpu_info` command in `std::panic::catch_unwind` with graceful `GpuSystemSnapshot::default()` fallback.
- Fixed GNU `ld.exe` `.rsrc` section corruption caused by duplicate Windows manifest injection in `build.rs`, eliminating PE header entrypoint failures.
- Added missing Tauri window drag permission (`core:window:allow-start-dragging`) to `default.json` capability set, eliminating unhandled frontend promise rejections on titlebar interaction.
- Resolved Windows Defender / Antivirus heuristics alerts by replacing PowerShell subprocess invocations in update downloader/installer with native Win32 APIs (`URLDownloadToFileW` from `urlmon.dll` and `ShellExecuteW` with `runas` verb from `shell32.dll`).
- Hardened Tauri application lifecycle handlers (`CloseRequested` and `ExitRequested`) to prevent accidental process termination when closing to system tray.
- Synchronized authoritative release version `0.1.2` across all manifests and validated clean test suite execution (31 Rust backend tests, 23 frontend tests).

## [0.1.1] - 2026-09-29

### Fixed
- Fixed an issue where SystemPilot could automatically close shortly after startup (implemented native Windows System Tray with single-click restore and context menu, preventing window hide without restore mechanism).
- Embedded `Microsoft.Windows.Common-Controls` v6.0.0.0 manifest into Rust test and library runners via `build.rs` to prevent `STATUS_ENTRYPOINT_NOT_FOUND` (0xc0000139) runtime crashes.
- Improved startup error handling and subsystem isolation: added graceful fallback to SQLite in-memory database if disk directory is inaccessible.
- Added persistent diagnostic rotating file logging and panic hook in `%LOCALAPPDATA%\SystemPilot\systempilot.log` with frontend uncaught error forwarding.
- Improved production installation and release validation: verified PE x64 architecture, embedded manifests, NSIS/WiX installers, and SHA-256 checksum generation.
- Documented and structured Windows Authenticode signing pipeline in CI (`release.yml`) for legitimate code signing to resolve SmartScreen unknown publisher warnings.

## [0.1.0] - 2026-09-28

### Performance
- Reduced IPC mutex contention: global system-stats polling increased from 1 000 ms to 2 000 ms
- Async process enumeration: `get_processes` now async + spawn_blocking (was primary Not Responding cause)
- Lazy-loaded Recharts components across CPU/GPU/Disk/Network/Performance pages via React.lazy()
- Chart histories bounded at 180 data points max

### Security
- Native SHA-256 verification in update path: replaced certutil/PowerShell subprocess with pure-Rust sha2 crate
- Added Authenticode signature verification step to release workflow
- Strict URL allowlist for update downloads and release notes

### Accessibility
- All form inputs have explicit htmlFor label associations (WCAG 2.1 AA)
- Removed placeholder-only field labels; added persistent visible labels

### Maintainability
- Extracted repeated Recharts JSX patterns into shared components
- Extracted subcomponents in NetworkMonitor, Performance, StartupManager to reduce complexity
- All monitor pages use isFetchingRef concurrency guard

### Fixes
- Side effect in React state updater (benchmark results) moved outside setter
- All setInterval polling loops properly cleaned up on unmount

### Release
- Version synchronized via centralized bump script across all manifests
- Release pipeline: NSIS Setup .exe, WiX .msi, Portable .zip, SHA256SUMS.txt
- Code signing: pipeline complete, requires OV/EV certificate + GitHub secrets to activate

---

## [1.0.0] - 2026-09-22

### Added
- **Dashboard**: Real-time telemetry overview with live gauges and CPU/RAM/Disk/Network bandwidth timeline graphs.
- **Processes Manager**: Live process table, sorting, searching, priority class control, suspend/resume, and protected termination.
- **Memory Manager & Optimizer**: Detailed memory metrics breakdown, large safe **CLEAN MEMORY** action with Win32 working set trim (`EmptyWorkingSet`), before/after delta calculation, and auto-clean rules with configurable threshold and cooldown.
- **CPU Manager**: Per-core load grid, clock frequencies, physical and logical processor topology.
- **GPU Monitor**: Multi-GPU detection (Dedicated NVIDIA/AMD + Integrated Intel Iris), dedicated VRAM usage bars, driver version, and WDDM telemetry.
- **Disk Monitor**: Partition storage inspector with SMART health status and filesystem type.
- **Network Monitor**: Active adapters, IPv4/IPv6 and MAC addresses, upload/download sparklines, and session data counters.
- **Gaming Mode**: Game detection profiles, automatic power plan boost to Ultimate Performance, memory trim, and background priority dampening on launch.
- **Performance Profiles**: Windows Power Scheme manager (`powercfg` active GUIDs) with restore defaults.
- **Startup Manager**: Registry and Shell startup items inspector with status toggles.
- **Cleanup Center**: Safe scanner for User Temp, Windows Temp, Thumbnail Caches, and Windows Recycle Bin (`SHEmptyRecycleBinW`).
- **Hardware Monitor**: Motherboard model, BIOS version, UEFI vendor, and processor architecture specifications.
- **Security Center**: Defensive verification of Windows Defender, Windows Firewall, and UAC elevation status.
- **Benchmark Suite**: Real multi-core CPU compute, 128MB sequential buffer memory bandwidth, disk IO throughput tests, and controlled CPU stress testing with emergency stop.
- **Settings & Database**: SQLite embedded persistence for preferences, logs, gaming profiles, and alert thresholds.
