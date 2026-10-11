# SystemPilot — Universal Windows Compatibility & Hardware Adaptation Policy

---

## 1. Overview & Architectural Principles

SystemPilot is designed as an adaptable, robust Windows desktop management platform (React 18 + Rust + Tauri v2) capable of operating across diverse Windows hardware form factors, editions, and privilege profiles.

The platform strictly follows three architectural principles:
1. **Never Assume Fixed Hardware:** SystemPilot dynamically detects hardware topologies (CPU topologies, multiple GPUs, battery presence, storage controllers, and cooling sensors) at runtime and adapts feature availability without crashing or demanding manual configuration.
2. **Honest Capability Reporting:** If a hardware sensor or Windows feature is unavailable on the current machine or Windows edition, SystemPilot displays `"Unavailable"` or explains the technical restriction rather than fabricating simulated metrics or offering non-functional controls.
3. **Least Privilege & UAC Safety:** The application operates gracefully in Standard User mode for monitoring and diagnostic workflows, and requests standard Windows UAC elevation only for operations that genuinely require administrative privileges.

---

## 2. Operating System Support Matrix

| Operating System | Supported Builds | Architecture | Support Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Windows 11 (24H2)** | Build 26100+ | x64, ARM64* | **Tier 1 — Fully Supported** | Latest Windows 11 platform with full API support. |
| **Windows 11 (23H2 / 22H2 / 21H2)** | Builds 22000 – 22631 | x64, ARM64* | **Tier 1 — Fully Supported** | Full support across all editions. |
| **Windows 10 (22H2 / 21H2 / 20H2 / 20H1)** | Builds 19041 – 19045 | x64 | **Tier 1 — Fully Supported** | Minimum supported OS version: Windows 10 2004 (Build 19041). |
| **Windows Server 2022 / 2025** | Build 20348+ | x64 | **Tier 2 — Supported** | Server management consoles and multi-socket CPU topologies supported. |
| **Windows 10 (1909 and older)** | Builds < 19041 | Any | **Unsupported** | Deprecated by Microsoft; lacking required WinRT/WebView2 interfaces. |
| **Windows 7 / 8 / 8.1** | All builds | Any | **Unsupported** | End-of-life operating systems lacking modern Windows APIs and WebView2. |

*\*Note on ARM64: SystemPilot executes on Windows 11 ARM64 devices (e.g. Snapdragon X Elite, Surface Pro) via the native Windows 11 x64 emulation layer.*

---

## 3. Windows Editions & Feature Adaptation

SystemPilot adapts its feature surface based on the detected Windows edition:

| Feature / Utility | Windows Pro / Enterprise / Education | Windows Home / Core | Edition Adaptation Behavior |
| :--- | :---: | :---: | :--- |
| **Hardware & Process Monitoring** | Supported | Supported | Full real-time CPU, RAM, Disk, Network, and GPU telemetry. |
| **Process Tree Termination** | Supported | Supported | Terminates user and authorized system processes. |
| **Working Set Memory Cleanup** | Supported | Supported | Win32 memory working set reclamation. |
| **Windows Disk Management** | Supported | Supported | Partition and volume inventory (`diskmgmt.msc`). |
| **Device Manager** | Supported | Supported | Hardware driver hierarchy (`devmgmt.msc`). |
| **Services Console** | Supported | Supported | Background Windows service management (`services.msc`). |
| **Task Scheduler** | Supported | Supported | Scheduled maintenance job inspection (`taskschd.msc`). |
| **Group Policy Editor (`gpedit.msc`)** | Supported | **Restricted by OS** | Displayed as `"Restricted on Home Edition"` with link to Windows Settings. |
| **Local Users & Groups (`lusrmgr.msc`)** | Supported | **Restricted by OS** | Displayed as `"Restricted on Home Edition"` with guidance to use `netplwiz`. |
| **Local Security Policy (`secpol.msc`)** | Supported | **Restricted by OS** | Displayed as `"Restricted on Home Edition"`. |
| **Windows Defender Security** | Supported | Supported | Real-time antivirus, firewall profile, and TPM telemetry. |

---

## 4. Hardware Form Factors & Thermal Adaptation

### A. Laptops & Mobile Workstations
- **Battery & Power:** Live battery life percentage, charging state (AC Line vs Battery discharge), and power plan cooling policies are automatically activated.
- **Cooling Policies:** Supports switching Windows ACPI System Cooling Policy between `Active` (maximum fan ramp before throttling) and `Passive` (silent CPU downclock priority).

### B. Desktops & Workstations
- **Power Detection:** Detects continuous AC mains power. No fabricated battery metrics or zero-percentages are displayed.
- **Multi-GPU Topologies:** Supports systems with integrated graphics (iGPU), dedicated graphics (dGPU), or dual discrete graphics cards with dedicated telemetry cards.
- **Cooling Hardware:** Queries motherboard and GPU tachometers. In compliance with hardware safety directives, direct Embedded Controller (EC) PWM register writes are locked by ACPI firmware to prevent thermal runaway; dynamic hardware firmware curves remain authoritative.

### C. Virtual Machines (Hyper-V, VMware, VirtualBox, QEMU, KVM)
- **Automatic Hypervisor Detection:** Identifies virtualization via system BIOS descriptors.
- **Display Adapters:** Adapts to virtual display adapters (e.g. VMware SVGA 3D, VirtualBox Graphics Adapter) without crashing.
- **Cooling Sensors:** Correctly reports fan sensors as `"Unsupported (Virtual Machine environment does not expose physical cooling fan tachometers)"` rather than inventing false RPM readings.

---

## 5. User Account & Permission Profiles

| Operation | Standard User Mode (`asInvoker`) | Administrator Mode (`requireAdministrator`) |
| :--- | :--- | :--- |
| **Hardware & Telemetry Monitoring** | Supported (Unrestricted) | Supported (Unrestricted) |
| **Own-Process Termination** | Supported | Supported |
| **System / Service Process Termination** | Permission Required (UAC Prompt) | Supported |
| **User Startup Entries (HKCU)** | Supported | Supported |
| **Machine Startup Entries (HKLM)** | Read-Only | Supported |
| **Windows Cooling Policy Changes** | Supported via `powercfg` | Supported |
| **Direct Reboot to UEFI Firmware** | Permission Required (UAC Prompt) | Supported |
| **System Event Log Diagnostics** | Supported | Supported |

---

## 6. Dependencies & Runtime Requirements

1. **Microsoft Edge WebView2 Runtime:**
   - Pre-installed on Windows 11 and all modern Windows 10 updates (Build 19041+).
   - If missing on custom Windows images, SystemPilot's installer detects its absence and provides the official Microsoft Evergreen bootstrapper.
2. **Microsoft Windows Common-Controls v6:**
   - Embedded directly in the application PE manifest (`systempilot.exe.manifest`) with Visual Styles active.
3. **Zero Third-Party Kernel Drivers:**
   - SystemPilot uses documented Win32 APIs, Windows Registry, and sysinfo, eliminating the risk of kernel panics (BSOD) or driver vulnerability exploits.

---

## 7. Known Hardware Limitations & Non-Goals

- **Locked Motherboard EC Fan Registers:** Standard user-mode Windows applications cannot write to motherboard PWM registers without proprietary, signed OEM kernel drivers (e.g. ASUS, Lenovo, Dell). SystemPilot prioritizes hardware safety and refuses to execute unverified kernel register writes.
- **Headless Systems:** SystemPilot requires a desktop session (GUI) to render its React + Webview2 interface.
