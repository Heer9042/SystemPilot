# Changelog

All notable changes to **SystemPilot** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
