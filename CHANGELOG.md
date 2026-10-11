# Changelog

All notable changes to **SystemPilot** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-10-11

### Fixed & Improved
- **100/100 React Doctor Quality Standard:** Resolved all architectural, maintainability, and accessibility issues across the React desktop frontend.
- **De-duplicated JSX Subtrees:** Extracted modular, reusable tab header infrastructure across Windows Tools administration hubs.
- **Enhanced Accessibility:** Added accessible control labels, ARIA associations, and keyboard navigation support across all modals and dashboards.
- **Hook & Lifecycle Hardening:** Stabilized effect dependency management and safe async loading flag resets across monitoring views.
- **Automated Verification:** 100% test pass rate across all 8 regression suites (275/275 assertions).

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

