# Changelog

All notable changes to **SystemPilot** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
