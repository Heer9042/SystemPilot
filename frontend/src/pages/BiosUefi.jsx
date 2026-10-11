import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { api } from '../services/tauriApi';
import {
  CircuitBoard,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  HardDrive,
  Lock,
  Info,
  Server,
  HelpCircle,
  Search,
  Sliders,
  Zap,
  Download,
  Fan,
  Tv,
  Eye,
  Key,
  Shield,
  Clock,
  Compass,
  Laptop,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================================
// 1. COMPREHENSIVE BIOS/UEFI SETTINGS REPOSITORY
// ============================================================================
const BIOS_SETTINGS_CATALOG = [
  // --- Security & System Integrity ---
  {
    id: 'secure-boot',
    title: 'Secure Boot',
    aliases: 'UEFI Secure Boot, OS Security Signature Verification',
    category: 'security',
    impact: 'Security Essential',
    impactVariant: 'success',
    menuLocation: 'Security > Secure Boot Configuration',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Verifies the cryptographic digital signatures of bootloaders, kernel drivers, and OS images before allowing execution.',
    explanation: 'Prevents bootkits, pre-boot rootkits, and unauthorized OS installations. Mandatory requirement for Windows 11 and BitLocker hardware sealing. Requires UEFI mode and GPT partition scheme.',
    risks: 'Disabling leaves the PC susceptible to persistent pre-boot malware. Dual-booting unsigned Linux distributions may require enrolling custom MOK keys or disabling Secure Boot.',
  },
  {
    id: 'tpm-device',
    title: 'Security Device / TPM 2.0 (fTPM / Intel PTT)',
    aliases: 'Intel PTT, AMD CPU fTPM, Discrete TPM, Security Processor',
    category: 'security',
    impact: 'Security Essential',
    impactVariant: 'success',
    menuLocation: 'Security > Trusted Computing / Intel Platform Trust Technology',
    options: 'Enabled (PTT / fTPM) | Disabled | Discrete TPM',
    recommended: 'Enabled (Firmware TPM / PTT)',
    purpose: 'Provides hardware-based cryptographic key storage, platform integrity measurement, and tamper-resistant secrets.',
    explanation: 'Hardware foundation for Windows 11, Windows Hello facial/fingerprint sign-in, BitLocker drive encryption, and credential guard. Almost all modern CPUs (Intel 8th+ gen, AMD Ryzen) include this inside the CPU (PTT or fTPM).',
    risks: 'Clearing TPM resets BitLocker recovery keys and Windows PINs. Always back up your 48-digit BitLocker recovery key before clearing TPM.',
  },
  {
    id: 'admin-password',
    title: 'Administrator / Supervisor Password',
    aliases: 'BIOS Admin Password, Setup Password',
    category: 'security',
    impact: 'Security',
    impactVariant: 'info',
    menuLocation: 'Security > Set Supervisor Password',
    options: 'Enter Password | Clear Password',
    recommended: 'Configured for shared/enterprise PCs',
    purpose: 'Locks the BIOS/UEFI firmware configuration menu behind a master password.',
    explanation: 'Prevents unauthorized users or malicious actors with physical access from disabling Secure Boot, changing boot order to a rogue USB, or tampering with virtualization and overclocking parameters.',
    risks: 'Do not forget this password! On modern laptops, forgetting the supervisor password may require replacing the motherboard or contacting manufacturer enterprise support with proof of purchase.',
  },
  {
    id: 'power-on-password',
    title: 'User / Power-On Password',
    aliases: 'Boot Password, System Password',
    category: 'security',
    impact: 'Security',
    impactVariant: 'info',
    menuLocation: 'Security > Set User Password',
    options: 'Enabled | Disabled',
    recommended: 'Disabled (Use BitLocker/Windows Hello instead)',
    purpose: 'Prompts for a password every time the machine is powered on before the bootloader even begins loading.',
    explanation: 'Adds a pre-boot barrier. While secure against physical boot access, modern TPM-backed BitLocker is generally faster and friendlier for daily workflows.',
    risks: 'Forgotten password prevents system boot entirely.',
  },
  {
    id: 'dma-protection',
    title: 'Kernel DMA Protection / Thunderbolt Security',
    aliases: 'PCIe DMA Protection, Thunderbolt PCIe Tunneling Security',
    category: 'security',
    impact: 'Security Essential',
    impactVariant: 'success',
    menuLocation: 'Security / Advanced > Thunderbolt(TM) Configuration',
    options: 'User Authorization | Secure Connect | No Security | DisplayPort and USB Only',
    recommended: 'User Authorization / Kernel DMA Protection On',
    purpose: 'Protects against Direct Memory Access (DMA) attacks via high-speed external ports like Thunderbolt 3/4 and USB4.',
    explanation: 'Without DMA protection, an attacker plugging a specialized hardware device into a Thunderbolt port could directly read system RAM, extracting BitLocker keys and credentials.',
    risks: 'Disabling exposes system memory to hardware-level DMA snooping.',
  },
  {
    id: 'chassis-intrusion',
    title: 'Chassis Intrusion Detection',
    aliases: 'Case Open Warning, Case Intrusion Alert',
    category: 'security',
    impact: 'Optional',
    impactVariant: 'neutral',
    menuLocation: 'Security > Chassis Intrusion Detection',
    options: 'Enabled | Disabled | Reset Status',
    recommended: 'Enabled on corporate desktops / Optional on home PCs',
    purpose: 'Detects and alerts if the physical computer side panel has been opened or removed.',
    explanation: 'A physical switch on the motherboard chassis header triggers an alert or halts boot until administrator approval if the case was opened.',
    risks: 'Opening the case to clean dust or swap a GPU will trigger a pre-boot prompt that must be cleared in BIOS.',
  },
  {
    id: 'intel-sgx',
    title: 'Intel Software Guard Extensions (SGX) / AMD SEV',
    aliases: 'Intel SGX, AMD Secure Encrypted Virtualization',
    category: 'security',
    impact: 'Specialized',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > CPU Configuration > Software Guard Extensions',
    options: 'Software Controlled | Enabled | Disabled',
    recommended: 'Software Controlled or Disabled (unless 4K Blu-ray required)',
    purpose: 'Allows applications to allocate isolated hardware enclaves to protect sensitive code and data in memory.',
    explanation: 'Historically used for DRM (such as Ultra HD 4K Blu-ray playback on PC) and confidential cloud workloads. Deprecated on 11th/12th+ Gen desktop consumer CPUs due to hardware side-channel mitigations.',
    risks: 'Consumes reserved RAM (PRM memory). Leave Disabled or Software Controlled.',
  },

  // --- Boot Configuration & Storage ---
  {
    id: 'boot-mode-csm',
    title: 'Boot Mode: UEFI vs CSM (Compatibility Support Module)',
    aliases: 'CSM Support, Legacy Boot, Launch CSM, Legacy ROMs',
    category: 'boot',
    impact: 'Architecture Critical',
    impactVariant: 'warning',
    menuLocation: 'Boot > CSM (Compatibility Support Module) / Boot Mode',
    options: 'UEFI Only (Pure) | UEFI + Legacy | Legacy Only',
    recommended: 'UEFI Only (Native 64-bit)',
    purpose: 'Toggles between modern UEFI firmware mode and the 1981 IBM PC Legacy 16-bit BIOS compatibility layer.',
    explanation: 'UEFI Native Mode supports GPT drives larger than 2.2TB, Secure Boot, fast parallel driver initialization, and Windows 11. CSM enables legacy 16-bit interrupts (INT 13h) and MBR disks for Windows 7 or older OSes.',
    risks: 'Enabling CSM disables Secure Boot and Resizable BAR on most motherboards. Switching between UEFI and CSM without reinstalling or converting disk to GPT causes "No Boot Device Found".',
  },
  {
    id: 'boot-order',
    title: 'Boot Option Priorities (Boot Order)',
    aliases: 'Boot Device Priority, Boot Sequence, 1st Boot Device',
    category: 'boot',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Boot > Boot Option Priorities',
    options: 'Windows Boot Manager (NVMe) | USB Flash | Network PXE | SATA HDD',
    recommended: '1st: Windows Boot Manager (Target NVMe/SSD)',
    purpose: 'Defines the search order of storage devices for bootable OS loaders during system startup.',
    explanation: 'Setting Windows Boot Manager as Option #1 provides the fastest startup by skipping probing empty DVD/USB/Network slots.',
    risks: 'If a non-bootable drive or USB stick is ranked #1, boot time increases or the machine halts with "Insert boot media".',
  },
  {
    id: 'fast-boot',
    title: 'Fast Boot / Ultra Fast Boot',
    aliases: 'Quick Boot, Fast Startup POST, Fast Initialization',
    category: 'boot',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Boot > Fast Boot Configuration',
    options: 'Enabled | Disabled | Ultra Fast',
    recommended: 'Enabled (Standard Fast Boot)',
    purpose: 'Skips exhaustive POST memory and hardware self-tests to reduce system startup time.',
    explanation: 'Reduces startup by 3–10 seconds. Ultra Fast skips USB keyboard initialization until OS handoff, meaning you may need Windows Advanced Startup to re-enter BIOS.',
    risks: 'Ultra Fast Boot can make it difficult to press F10/F2/Del in time to enter BIOS without using the "Restart to UEFI" command in Windows.',
  },
  {
    id: 'usb-boot',
    title: 'USB Boot / External Media Boot',
    aliases: 'Boot from USB, External Device Boot',
    category: 'boot',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Boot > USB Boot Configuration',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Allows the system to boot from portable USB drives, recovery installers, and live diagnostic tools.',
    explanation: 'Crucial for installing Windows, using SystemPilot recovery images, or running offline virus/disk repair utilities.',
    risks: 'If disabled, you cannot install a new OS or boot rescue media from a USB stick.',
  },
  {
    id: 'pxe-boot',
    title: 'PXE Network Boot / Wake-on-LAN (WoL)',
    aliases: 'Network Stack, IPv4/IPv6 PXE Boot, Onboard LAN Boot ROM',
    category: 'boot',
    impact: 'Optional',
    impactVariant: 'neutral',
    menuLocation: 'Advanced / Boot > Network Stack Configuration',
    options: 'Disabled | Enabled (IPv4 / IPv6)',
    recommended: 'Disabled (unless booting from enterprise network server)',
    purpose: 'Enables downloading and booting an OS image over a local network Ethernet connection.',
    explanation: 'Essential in corporate IT and diskless internet cafes. For home computers, having PXE enabled slows down boot time by 3–7 seconds as it checks for a DHCP network boot server on every restart.',
    risks: 'Slows down boot when enabled if no PXE server is available.',
  },
  {
    id: 'sata-controller-mode',
    title: 'SATA & NVMe Controller Mode (AHCI vs VMD/RST vs RAID)',
    aliases: 'Intel VMD Controller, SATA Mode Selection, AHCI / RAID',
    category: 'boot',
    impact: 'Architecture Critical',
    impactVariant: 'warning',
    menuLocation: 'Advanced > Storage Configuration / Intel VMD Setup',
    options: 'AHCI | Intel RST Premium / VMD | RAID | IDE (Legacy)',
    recommended: 'AHCI (or Intel VMD if factory laptop configuration)',
    purpose: 'Determines the bus protocol and driver abstraction used between CPU, motherboard, and storage drives.',
    explanation: 'AHCI is the universal standard for SATA and modern standalone NVMe. Intel VMD (Volume Management Device) routes PCIe lanes through Intel CPU logic for hardware RAID and caching.',
    risks: 'DANGER: Changing this setting on an installed Windows system without switching storage driver to Safe Mode FIRST causes immediate BSOD `INACCESSIBLE_BOOT_DEVICE`.',
  },

  // --- CPU, Processor & Virtualization ---
  {
    id: 'cpu-virtualization',
    title: 'Hardware Virtualization (Intel VT-x / AMD SVM Mode)',
    aliases: 'Intel Virtualization Technology, AMD SVM (Secure Virtual Machine), Vanderpool',
    category: 'cpu',
    impact: 'Performance & Capability',
    impactVariant: 'brand',
    menuLocation: 'Advanced > CPU Configuration > Virtualization',
    options: 'Enabled | Disabled',
    recommended: 'Enabled (Mandatory for WSL2 & Docker)',
    purpose: 'Enables CPU hardware-level virtual machine execution instructions (VMX/SVM).',
    explanation: 'Required for Windows Subsystem for Linux (WSL2), Hyper-V, Docker Desktop, Windows Sandbox, VirtualBox, VMware, and Android Emulators. Zero performance penalty when enabled.',
    risks: 'Disabling breaks all modern virtual machines, WSL2, and Windows Memory Integrity (Core Isolation / HVCI).',
  },
  {
    id: 'cpu-vtd-iommu',
    title: 'Direct I/O Virtualization (Intel VT-d / AMD IOMMU)',
    aliases: 'Intel VT-d (Virtualization Technology for Directed I/O), AMD-Vi, IOMMU',
    category: 'cpu',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Advanced > System Agent (SA) Configuration / AMD CBS',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Allows virtual machines and Hyper-V to directly assign physical PCIe hardware (like GPUs or NICs) to guest VMs without emulation overhead.',
    explanation: 'Critical for GPU passthrough, Windows Virtualization-Based Security (VBS), and DMA remapping protections.',
    risks: 'Disabling degrades Windows Core Isolation hardware security.',
  },
  {
    id: 'cpu-hyperthreading',
    title: 'Intel Hyper-Threading / AMD SMT (Simultaneous Multi-Threading)',
    aliases: 'Hyper-Threading Technology (HTT), AMD SMT Mode',
    category: 'cpu',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Advanced > CPU Configuration > Hyper-Threading / SMT',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Allows each physical CPU core to execute two concurrent software threads simultaneously.',
    explanation: 'A 6-core CPU provides 12 logical processors to Windows. Boosts multi-threaded rendering, video encoding, code compilation, and background multitasking by 20–35%.',
    risks: 'Disabling cuts available logical threads in half. Only specialized low-latency competitive gaming benchmarks occasionally test disabling SMT for micro-stutter reduction.',
  },
  {
    id: 'cpu-cstates',
    title: 'CPU Power States (C-States / C1E, C6, C8, C10)',
    aliases: 'Enhanced C1 (C1E), Package C-State Limit, CPU Power States',
    category: 'cpu',
    impact: 'Efficiency',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > CPU Power Management Configuration',
    options: 'Enabled | Disabled | Auto',
    recommended: 'Enabled / Auto',
    purpose: 'Allows unused CPU cores to power down into deep idle sleep states to save power and reduce heat.',
    explanation: 'Allows CPU to drop from 65W–125W to 2W–5W when idling on desktop or sleeping, dramatically increasing battery life on laptops and reducing idle temperatures.',
    risks: 'Extreme competitive overclockers disable C-states to eliminate idle-to-boost voltage latency, at the cost of high idle power draw and higher heat.',
  },
  {
    id: 'cpu-turbo-boost',
    title: 'Intel Turbo Boost / AMD Precision Boost Overdrive (PBO)',
    aliases: 'Intel Turbo Boost Max 3.0, AMD PBO, Core Performance Boost',
    category: 'cpu',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Advanced > CPU Configuration / AMD Overclocking',
    options: 'Enabled | Disabled | Auto | Advanced PBO',
    recommended: 'Enabled',
    purpose: 'Dynamically scales CPU clock frequency above the base clock when thermal and power headroom allows.',
    explanation: 'Allows a 2.7 GHz base clock CPU to surge to 4.5 GHz+ on demand during demanding gaming, compilation, or heavy workload bursts.',
    risks: 'Disabling locks CPU strictly to its base clock, severely crippling single-threaded and gaming performance.',
  },
  {
    id: 'cpu-overclocking',
    title: 'CPU Core Ratio & Voltage Override (VCore Offset)',
    aliases: 'CPU Multiplier, All-Core Ratio, Vcore Voltage, Curve Optimizer',
    category: 'cpu',
    impact: 'Caution / Advanced',
    impactVariant: 'warning',
    menuLocation: 'Ai Tweaker / Extreme Tweaker / OC / AMD Curve Optimizer',
    options: 'Auto | Manual Multiplier | Adaptive Voltage Offset',
    recommended: 'Auto (or modest Undervolt / Curve Optimizer -15)',
    purpose: 'Manual tuning of processor core clock multipliers and core supply voltages.',
    explanation: 'Used by enthusiasts to push peak clock speeds or undervolt to reduce operating temperatures and fan noise without performance loss.',
    risks: 'Excessive voltage degrades or destroys CPU silicon. Inadequate voltage causes system crashes, WHEA blue screens, or boot failure (requiring CMOS battery clear).',
  },

  // --- Memory (RAM) & PCIe Bus ---
  {
    id: 'xmp-expo',
    title: 'Memory Overclock Profile: Intel XMP / AMD EXPO / DOCP',
    aliases: 'Extreme Memory Profile (XMP), AMD EXPO, ASUS DOCP, Memory Profile',
    category: 'memory',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Main / Ai Tweaker / OC > XMP / EXPO Setting',
    options: 'Disabled (JEDEC Default) | Profile 1 | Profile 2',
    recommended: 'Enabled (Profile 1)',
    purpose: 'Enables the factory-tested high-speed memory frequency and tight timings rated on the RAM package.',
    explanation: 'Without XMP/EXPO, high-speed RAM runs at slow JEDEC defaults (e.g., 2133MHz instead of 3600MHz on DDR4, or 4800MHz instead of 6000MHz on DDR5). Enabling XMP instantly unlocks 10–25% memory bandwidth and gaming FPS boost.',
    risks: 'If memory controller on CPU cannot handle aggressive speeds (e.g. 4 sticks at 6400MHz), system may fail to POST, requiring clearing CMOS.',
  },
  {
    id: 'rebar-sam',
    title: 'Resizable BAR (ReBAR) / AMD Smart Access Memory',
    aliases: 'Resizable Base Address Register (ReBAR), Above 4G Decoding, SAM',
    category: 'memory',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Advanced > PCI Subsystem Settings > Resizable BAR Support',
    options: 'Enabled | Disabled | Auto',
    recommended: 'Enabled (with Above 4G Decoding)',
    purpose: 'Enables CPU full direct access to the entire GPU VRAM pool over PCIe instead of legacy 256MB chunks.',
    explanation: 'Increases gaming performance and frame stability by 5–15% on NVIDIA RTX 30/40 series, AMD RX 6000/7000 series, and Intel Arc GPUs. Requires UEFI mode, GPT partition, and Above 4G Decoding enabled.',
    risks: 'Cannot be enabled in Legacy CSM mode. Requires UEFI GPT.',
  },
  {
    id: 'above-4g-decoding',
    title: 'Above 4G Decoding',
    aliases: 'Above 4G Memory Remap, 64-bit PCIe Resource Remap',
    category: 'memory',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Advanced > PCI Subsystem Settings',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Enables 64-bit capable devices to decode memory addresses above the 4GB boundary.',
    explanation: 'Mandatory prerequisite for Resizable BAR and multi-GPU configurations. Critical for modern GPUs with 8GB, 12GB, 16GB+ VRAM.',
    risks: 'Leave enabled on all modern 64-bit systems.',
  },
  {
    id: 'pcie-link-speed',
    title: 'PCIe Slot Link Speed Generation (Gen 3 / Gen 4 / Gen 5)',
    aliases: 'PCIEX16 Link Speed, PCIe Speed Selection, Gen Mode',
    category: 'memory',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Advanced > System Agent (SA) / PCI Configuration',
    options: 'Auto | Gen 3 | Gen 4 | Gen 5',
    recommended: 'Auto (or force Gen 3 if using PCIe Riser Cable)',
    purpose: 'Sets the signaling bandwidth standard between CPU and GPU/expansion card slots.',
    explanation: 'Gen 4 doubles Gen 3 speed; Gen 5 doubles Gen 4. Auto is optimal.',
    risks: 'If using a PCIe Riser Cable (vertical GPU mount or ITX cases) that is Gen 3 rated on a Gen 4 slot, display black screen or WHEA errors occur until manually set to Gen 3.',
  },

  // --- Graphics & Display (GPU) ---
  {
    id: 'primary-display',
    title: 'Primary Display Adapter / Initial Display Output',
    aliases: 'Primary Graphics Adapter, Primary Video Device, Init Display First',
    category: 'gpu',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Advanced > System Agent (SA) > Graphics Configuration',
    options: 'Auto | PEG (PCIe Discrete GPU) | iGPU (CPU Integrated)',
    recommended: 'Auto or PEG (if discrete GPU installed)',
    purpose: 'Specifies which graphics processor initializes first to display the pre-boot BIOS screen.',
    explanation: 'Ensures your monitor receives a signal during POST from the port you have your display cable connected to.',
    risks: 'Setting to iGPU when monitor is plugged into PCIe GPU can result in no BIOS screen display on boot.',
  },
  {
    id: 'igpu-multi-monitor',
    title: 'Internal Graphics (iGPU) Multi-Monitor',
    aliases: 'iGPU Multi-Monitor, IGD Multi-Monitor, Dual Display',
    category: 'gpu',
    impact: 'Optional',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > Graphics Configuration > iGPU Multi-Monitor',
    options: 'Enabled | Disabled',
    recommended: 'Enabled (if using motherboard HDMI/DP for 2nd monitor)',
    purpose: 'Keeps the CPU integrated graphics active even when a discrete graphics card is installed.',
    explanation: 'Allows plugging secondary monitors directly into motherboard video ports, or using Intel QuickSync / AMD VCE video encoding alongside a discrete GPU.',
    risks: 'Allocates a small slice of system RAM (64MB–512MB) for the integrated GPU frame buffer.',
  },
  {
    id: 'dvmt-preallocated',
    title: 'Integrated GPU Shared Memory (DVMT Pre-Allocated)',
    aliases: 'UMA Frame Buffer Size, Integrated Graphics Share Memory, DVMT',
    category: 'gpu',
    impact: 'Configuration',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > Graphics Configuration > DVMT Pre-Allocated',
    options: '32MB | 64MB | 128MB | 256MB | 512MB | 1024MB | 2GB',
    recommended: '128MB or 512MB (Windows dynamically allocates remainder)',
    purpose: 'Pre-allocates a static pool of system RAM for the CPU integrated graphics buffer at boot time.',
    explanation: 'Windows Dynamic Video Memory Technology automatically allocates more RAM to the iGPU as required during 3D gaming or playback.',
    risks: 'Setting unnecessarily high (e.g. 4GB on 8GB total RAM) reduces available RAM for Windows and applications.',
  },
  {
    id: 'mux-switch',
    title: 'Discrete GPU Mode (MUX Switch / NVIDIA Advanced Optimus)',
    aliases: 'Display Mode, Discrete GPU Only, Hybrid Mode, dGPU MUX',
    category: 'gpu',
    impact: 'Performance Boost',
    impactVariant: 'brand',
    menuLocation: 'Advanced / Configuration > Display Mode (Gaming Laptops)',
    options: 'Hybrid (Dynamic Optimus) | Discrete GPU Only (dGPU MUX)',
    recommended: 'Hybrid (Balanced) | dGPU Only (Max FPS Gaming on Wall Power)',
    purpose: 'Physically routes the laptop internal display panel directly to the high-performance discrete GPU instead of passing through the iGPU.',
    explanation: 'Available on modern gaming laptops (HP OMEN, Lenovo Legion, ASUS ROG, Dell Alienware). Eliminates iGPU latency penalty, boosting gaming FPS by 5–15%.',
    risks: 'Discrete GPU Only mode dramatically reduces battery life when unplugged from AC wall power.',
  },

  // --- Power Management, Cooling & Peripherals ---
  {
    id: 'fan-control-curve',
    title: 'Smart Fan Control & Q-Fan Profiles',
    aliases: 'Smart Fan Mode, Q-Fan Control, Fan Speed Control, PWM / DC Mode',
    category: 'power',
    impact: 'Thermals & Acoustics',
    impactVariant: 'brand',
    menuLocation: 'Monitor / Hardware Monitor > Smart Fan / Q-Fan Configuration',
    options: 'Standard | Silent | Turbo | Full Speed | Manual Curve (PWM/DC)',
    recommended: 'Standard (or Custom Silent Curve)',
    purpose: 'Configures thermal curves, temperature sensors, and voltage/pulse-width modulation (PWM) for CPU and chassis cooling fans.',
    explanation: 'Prevents fans from screaming at 100% RPM unnecessarily while ensuring the CPU stays safely under 85°C during intense computational loads.',
    risks: 'Disabling fan control forces fans to run at constant 100% maximum RPM (loud acoustic noise). Setting curve too flat can lead to thermal throttling.',
  },
  {
    id: 'ac-power-loss',
    title: 'Restore on AC Power Loss (AC Power Recovery)',
    aliases: 'AC Back Function, After AC Power Lost, State After Power Failure',
    category: 'power',
    impact: 'Recommended',
    impactVariant: 'info',
    menuLocation: 'Advanced / Power Management > Restore on AC Power Loss',
    options: 'Power Off | Power On | Last State',
    recommended: 'Power Off (Desktops) | Power On (Home Servers / NAS)',
    purpose: 'Defines how the computer reacts when mains AC electrical power is cut and subsequently restored.',
    explanation: 'Desktops should remain "Power Off" so they do not spontaneously start up after a blackout. Servers and remote PCs should be set to "Power On" or "Last State" to resume service automatically.',
    risks: 'Setting to Power On can cause PC to turn on unexpectedly in the middle of the night following grid power flickers.',
  },
  {
    id: 'acpi-sleep-state',
    title: 'ACPI Sleep State (S3 Standby vs S0ix Modern Standby)',
    aliases: 'Suspend to RAM (S3), Low Power S0 Idle State, Modern Standby',
    category: 'power',
    impact: 'Power Management',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > Power Management / ACPI Settings',
    options: 'S3 (Suspend to RAM) | S0ix (Modern Standby / Connected Standby)',
    recommended: 'OS Default (S3 on Desktops / S0ix on Modern Laptops)',
    purpose: 'Determines sleep power architecture when Windows enters sleep mode.',
    explanation: 'S3 shuts off CPU and fans, maintaining power only to RAM. S0ix keeps low-power SoC logic alive for instant resume and background network notifications.',
    risks: 'Misconfigured S0ix on laptops can cause heat buildup inside a closed backpack if background updates wake the device.',
  },
  {
    id: 'onboard-audio',
    title: 'Onboard Audio Controller',
    aliases: 'HD Audio Controller, Azalia Audio, Realtek Audio',
    category: 'power',
    impact: 'Optional',
    impactVariant: 'neutral',
    menuLocation: 'Advanced > Onboard Devices Configuration > HD Audio',
    options: 'Enabled | Disabled',
    recommended: 'Enabled (unless using dedicated USB DAC / PCIe Sound Card)',
    purpose: 'Enables or disables the integrated motherboard audio codec (Realtek ALC, etc.) and 3.5mm headphone jacks.',
    explanation: 'Disabling frees up an IRQ and small PCIe resource slice when using external professional audio interfaces.',
    risks: 'Disabling disables all front/back 3.5mm analog audio jacks.',
  },
  {
    id: 'onboard-lan-wifi',
    title: 'Onboard LAN (Ethernet) & Wi-Fi / Bluetooth Controller',
    aliases: 'Onboard NIC, Intel GbE LAN, Realtek 2.5G LAN, Onboard WLAN',
    category: 'power',
    impact: 'Recommended',
    impactVariant: 'brand',
    menuLocation: 'Advanced > Onboard Devices Configuration',
    options: 'Enabled | Disabled',
    recommended: 'Enabled',
    purpose: 'Controls hardware power to the physical RJ-45 Ethernet port, Wi-Fi 6/7 radio, and Bluetooth chips.',
    explanation: 'Provides wired and wireless networking to Windows.',
    risks: 'Disabling turns off network adapters at the hardware level.',
  },
  {
    id: 'usb-power-soft-off',
    title: 'USB Power in Soft-Off (S5 / Sleep) State',
    aliases: 'USB Power Delivery in S5, ErP Ready, Sleep and Charge USB',
    category: 'power',
    impact: 'Convenience',
    impactVariant: 'info',
    menuLocation: 'Advanced > APM Configuration / USB Power Delivery in S5',
    options: 'Enabled | Disabled (ErP Ready S4+S5)',
    recommended: 'Enabled (to charge phones/headphones while PC is turned off)',
    purpose: 'Keeps 5V USB standby power supplied to designated USB ports when the computer is shut down.',
    explanation: 'Allows charging phones, mice, or wireless headsets from PC USB ports even when the computer is turned off. Disabling (or enabling ErP Ready) drops standby power below 0.5W for European energy standards.',
    risks: 'If enabled, connected RGB mousepads or keyboard LEDs may stay illuminated when the PC is off.',
  },
];

// ============================================================================
// 2. OEM SETUP HOTKEYS & DIRECTORY PROFILES
// ============================================================================
const OEM_PROFILES = [
  {
    id: 'hp',
    name: 'HP (Hewlett-Packard)',
    models: 'Pavilion, OMEN, Victus, EliteBook, ProBook, ENVY, ZBook',
    setupKey: 'F10 (or Esc for Startup Menu)',
    bootKey: 'F9 (Boot Device Options)',
    diagnosticsKey: 'F2 (HP PC Hardware Diagnostics UEFI)',
    recoveryKey: 'F11 (System Recovery) / Win + B (Emergency BIOS Recovery)',
    menuStructure: 'Main > Security > Advanced > Boot Options',
    specialFeatures: 'HP Sure Start (cryptographic self-healing BIOS rollback), HP Network Diagnostics, OMEN Gaming Hub MUX control.',
  },
  {
    id: 'dell',
    name: 'Dell & Alienware',
    models: 'XPS, Inspiron, Latitude, Precision, Alienware, Vostro',
    setupKey: 'F2 (BIOS Setup)',
    bootKey: 'F12 (One-Time Boot Menu)',
    diagnosticsKey: 'F12 > Diagnostics (Dell SupportAssist / ePSA)',
    recoveryKey: 'Ctrl + Esc (BIOS Recovery 2/3 from NVMe/USB)',
    menuStructure: 'System Information > Boot Sequence > Security > Performance > Power',
    specialFeatures: 'SupportAssist OS Recovery pre-boot partition, Dell Command | Update integration, Alienware Command Center overclock profiles.',
  },
  {
    id: 'lenovo',
    name: 'Lenovo & ThinkPad',
    models: 'ThinkPad, Legion, IdeaPad, Yoga, ThinkCentre, LOQ',
    setupKey: 'F1 (or Enter at startup / Novo Button on side)',
    bootKey: 'F12 (Boot Device Menu)',
    diagnosticsKey: 'F10 (Lenovo Diagnostics)',
    recoveryKey: 'Novo Button (or Fn + R / Win + B on certain models)',
    menuStructure: 'Main > Config > Date/Time > Security > Startup > Restart',
    specialFeatures: 'ThinkPad tamper detection switch, Lenovo Vantage Hybrid GPU switch, Self-Healing BIOS (Dual-ROM protection).',
  },
  {
    id: 'asus',
    name: 'ASUS & ROG',
    models: 'ROG Strix, TUF Gaming, ZenBook, VivoBook, ProArt, Motherboards (Maximus, Crosshair)',
    setupKey: 'Del or F2',
    bootKey: 'F8 (Quick Boot Menu)',
    diagnosticsKey: 'Built-in Armoury Crate / ASUS System Diagnostics',
    recoveryKey: 'CrashFree BIOS 3 (USB BIOS FlashBack button on I/O shield)',
    menuStructure: 'EZ Mode (F7 to switch) > Main > Ai Tweaker > Advanced > Monitor > Boot > Tool',
    specialFeatures: 'ASUS EZ Flash 3 (direct Internet firmware update inside BIOS), Q-Fan Control graphical curve, MemOK! memory recovery.',
  },
  {
    id: 'msi',
    name: 'MSI (Micro-Star International)',
    models: 'Stealth, Raider, Titan, Katana, Modern, Motherboards (MAG, MPG, MEG, Pro)',
    setupKey: 'Del (Click BIOS Setup)',
    bootKey: 'F11 (Boot Device Menu)',
    diagnosticsKey: 'MSI Dragon / Center Diagnostics',
    recoveryKey: 'Flash BIOS Button on rear I/O / Win + B',
    menuStructure: 'EZ Mode (F7) > SETTINGS > OC (Overclocking) > M-FLASH > HARDWARE MONITOR > BOARD EXPLORER',
    specialFeatures: 'M-FLASH direct USB firmware utility, Click BIOS 5 dual interface, Memory Try It! automated memory frequency tuning.',
  },
  {
    id: 'acer',
    name: 'Acer & Predator',
    models: 'Predator, Nitro, Swift, Aspire, Spin, Extensa',
    setupKey: 'F2 (or Del on desktops)',
    bootKey: 'F12 (Must be enabled in BIOS: Main > F12 Boot Menu > Enabled)',
    diagnosticsKey: 'Acer Care Center diagnostics',
    recoveryKey: 'Alt + F10 (Acer eRecovery Management at boot)',
    menuStructure: 'Information > Main > Advanced > Security > Boot > Exit',
    specialFeatures: 'PredatorSense fan controls, strict Secure Boot password requirement (must set Supervisor Password to change certain boot options).',
  },
  {
    id: 'gigabyte',
    name: 'Gigabyte & AORUS',
    models: 'AORUS Master/Elite, Aero, Gaming, Motherboards (Z790, B650, X670)',
    setupKey: 'Del (BIOS Setup)',
    bootKey: 'F12 (Boot Menu)',
    diagnosticsKey: 'Smart Fan 6 Hardware Monitor',
    recoveryKey: 'End (Q-Flash) / Q-Flash Plus button on rear I/O',
    menuStructure: 'Easy Mode (F2) > Favorites > Tweaker > Settings > System Info > Boot > Save & Exit',
    specialFeatures: 'Q-Flash Plus (flash BIOS with no CPU or RAM installed), DualBIOS physical switch / automated redundant BIOS chip backup.',
  },
  {
    id: 'surface',
    name: 'Microsoft Surface',
    models: 'Surface Pro, Surface Laptop, Surface Book, Surface Studio',
    setupKey: 'Hold Volume Up (+) and press & release Power button',
    bootKey: 'Hold Volume Down (-) and press & release Power button (Boot from USB)',
    diagnosticsKey: 'Surface Diagnostic Toolkit for Windows',
    recoveryKey: 'Surface Recovery USB Image via Microsoft Support',
    menuStructure: 'PC Information > Security > Boot Configuration > Date and Time > Exit',
    specialFeatures: 'Pure Touch-Friendly UEFI firmware with no CSM legacy support, direct Microsoft hardware-enforced cloud management (SEMM).',
  },
];

// ============================================================================
// 3. COMPARISON DATA: UEFI vs LEGACY BIOS
// ============================================================================
const UEFI_VS_LEGACY_COMPARISON = [
  {
    feature: 'Architecture & CPU Mode',
    uefi: '32-bit or 64-bit Native Mode (Full hardware speed)',
    legacy: '16-bit Real Mode (8086 processor emulation)',
    winner: 'uefi',
  },
  {
    feature: 'Partition Table Standard',
    uefi: 'GPT (GUID Partition Table) — Up to 128 primary partitions',
    legacy: 'MBR (Master Boot Record) — Max 4 primary partitions',
    winner: 'uefi',
  },
  {
    feature: 'Maximum Storage Disk Size',
    uefi: '9.4 Zettabytes (9.4 Billion Terabytes)',
    legacy: '2.2 Terabytes maximum (Drives >2TB truncated)',
    winner: 'uefi',
  },
  {
    feature: 'Pre-Boot Security',
    uefi: 'Secure Boot (Cryptographic X.509 signature validation)',
    legacy: 'None (Completely blind execution, vulnerable to MBR bootkits)',
    winner: 'uefi',
  },
  {
    feature: 'User Interface & Mouse',
    uefi: 'Modern High-Resolution GUI with Mouse, Touch & Animations',
    legacy: 'Text-mode 80x25 characters grid, Blue/Grey, Keyboard only',
    winner: 'uefi',
  },
  {
    feature: 'Boot Initialization Speed',
    uefi: 'Fast (Parallel driver & hardware device initialization)',
    legacy: 'Slow (Serial step-by-step device polling during POST)',
    winner: 'uefi',
  },
  {
    feature: 'Direct OS-to-Firmware Reboot',
    uefi: 'Supported (Windows `shutdown /r /fw` direct entry)',
    legacy: 'Unsupported (Requires manual key timing during cold boot)',
    winner: 'uefi',
  },
  {
    feature: 'Windows 11 Compatibility',
    uefi: 'Mandatory Requirement (UEFI + Secure Boot + TPM 2.0)',
    legacy: 'Unsupported by Windows 11',
    winner: 'uefi',
  },
  {
    feature: 'Hardware Feature Support',
    uefi: 'Resizable BAR, Above 4G Decoding, NVMe Gen4/Gen5 Direct Boot',
    legacy: 'Restricted to legacy SATA/IDE and Option ROMs',
    winner: 'uefi',
  },
];

function BiosHeader({
  isUefi,
  exportSuccess,
  handleExportGuide,
  fetchBiosInfo,
  setShowRestartModal,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-200 dark:border-brand-500/20 shadow-sm">
            <CircuitBoard className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                BIOS & UEFI Firmware Center
              </h1>
              <Badge variant={isUefi ? 'success' : 'warning'} size="xs">
                {isUefi ? 'UEFI 64-Bit' : 'Legacy BIOS'}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Firmware architecture diagnosis, hardware OEM hotkeys & complete catalog of every configurable motherboard setting
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={handleExportGuide}
          className="text-xs"
        >
          {exportSuccess ? 'Downloaded Guide!' : 'Export Guide (.md)'}
        </Button>

        <Button
          variant="secondary"
          size="sm"
          icon={RefreshCw}
          onClick={fetchBiosInfo}
          className="text-xs"
        >
          Refresh
        </Button>

        <Button
          variant="danger"
          size="sm"
          icon={RotateCcw}
          onClick={() => setShowRestartModal(true)}
          className="text-xs"
        >
          Restart to UEFI
        </Button>
      </div>
    </div>
  );
}

function BiosArchitectureBanner({
  isUefi,
  bios,
  showComparisonDetails,
  setShowComparisonDetails,
}) {
  return (
    <Card className={`relative overflow-hidden p-5 border-2 ${
      isUefi
        ? 'border-emerald-500/30 bg-gradient-to-r from-emerald-500/5 via-brand-500/5 to-transparent'
        : 'border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-transparent'
    }`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Current Firmware Architecture
            </span>
            <Badge variant={isUefi ? 'success' : 'warning'} size="xs">
              {isUefi ? 'Unified Extensible Firmware Interface (UEFI)' : 'Legacy BIOS / Compatibility Support Module (CSM)'}
            </Badge>
          </div>

          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              {isUefi ? 'Native UEFI Mode' : 'Legacy BIOS (CSM) Mode'}
            </h2>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {isUefi ? 'GPT Partitioning • 64-bit Kernel Boot' : 'MBR Partitioning • 16-bit Emulation'}
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {isUefi ? (
              <>
                Your computer boots in <strong>Native UEFI 64-bit mode</strong>. It utilizes modern GUID Partition Tables (GPT), hardware-enforced Secure Boot signature validation, TPM 2.0 cryptographic isolation, and direct PCIe Resizable BAR bandwidth. You can reboot directly into firmware settings from Windows without timing keyboard presses.
              </>
            ) : (
              <>
                Your computer is operating in <strong>Legacy BIOS / CSM Compatibility Mode</strong> with Master Boot Record (MBR) partitioning. Drives are limited to 2.2 TB, Secure Boot is disabled, and pre-boot malware protection is unenforced. Upgrading to UEFI and converting the disk to GPT is required for Windows 11.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <div className="p-3 rounded-xl bg-white/70 dark:bg-surface-800/70 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Pre-Boot Setup Hotkey</span>
            <div className="font-mono font-bold text-sm text-brand-600 dark:text-brand-400">
              {bios?.oem_setup_key || 'F10 or F2'}
            </div>
            <div className="text-[11px] text-slate-500">
              Boot Menu: <span className="font-mono font-medium">{bios?.oem_boot_menu_key || 'F9 or F12'}</span>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={showComparisonDetails ? ChevronUp : ChevronDown}
            onClick={() => setShowComparisonDetails(!showComparisonDetails)}
            className="text-xs"
          >
            {showComparisonDetails ? 'Hide UEFI vs Legacy Breakdown' : 'Compare UEFI vs Legacy Differences'}
          </Button>
        </div>
      </div>

      {/* Expandable Comparison Table */}
      {showComparisonDetails && (
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800/80 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-500" />
            Technical Deep-Dive: Modern UEFI vs Legacy BIOS (1981–2026)
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-surface-800/80 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5">Feature & Capability</th>
                  <th className="p-2.5 text-emerald-600 dark:text-emerald-400">Modern UEFI (This System)</th>
                  <th className="p-2.5 text-slate-500 dark:text-slate-400">Legacy BIOS / CSM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                {UEFI_VS_LEGACY_COMPARISON.map((row) => (
                  <tr key={row.feature} className="hover:bg-slate-50/50 dark:hover:bg-surface-800/30 transition-colors">
                    <td className="p-2.5 font-medium text-slate-700 dark:text-slate-300">{row.feature}</td>
                    <td className="p-2.5 font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/5">
                      <Check className="w-3.5 h-3.5 inline mr-1 text-emerald-500" />
                      {row.uefi}
                    </td>
                    <td className="p-2.5 text-slate-500 dark:text-slate-400">
                      <X className="w-3.5 h-3.5 inline mr-1 text-rose-500" />
                      {row.legacy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}

function BiosHardwareSpecCards({ bios, isUefi, isSecureBootOn }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Boot Partition Scheme</span>
          <HardDrive className="w-4 h-4 text-brand-500" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.boot_mode || 'Windows Boot Manager'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {bios?.uefi_boot_status || 'UEFI Native Boot (GPT)'}
          </p>
        </div>
        <Badge variant={isUefi ? 'success' : 'warning'} size="xs" className="w-fit">
          {isUefi ? 'GPT Partition Table' : 'MBR Partition Table'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Secure Boot State</span>
          <Lock className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.secure_boot_status || 'Enabled'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Cryptographic bootloader validation</p>
        </div>
        <Badge variant={isSecureBootOn ? 'success' : 'neutral'} size="xs" className="w-fit">
          {isSecureBootOn ? 'Hardware Enforced' : 'Unenforced'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Security Processor (TPM)</span>
          <ShieldCheck className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.tpm_present ? 'TPM 2.0 Active' : 'Not Detected'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">BitLocker & Windows Hello root of trust</p>
        </div>
        <Badge variant={bios?.tpm_present ? 'success' : 'warning'} size="xs" className="w-fit">
          {bios?.tpm_present ? 'Cryptographic Chip Ready' : 'Unavailable'}
        </Badge>
      </Card>

      <Card className="flex flex-col justify-between">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>CPU Virtualization (VT-x / SVM)</span>
          <Cpu className="w-4 h-4 text-cyan-500" />
        </div>
        <div className="my-2">
          <div className="text-lg font-bold font-mono text-slate-800 dark:text-slate-100">
            {bios?.virtualization_enabled ? 'Active / Supported' : 'Disabled in BIOS'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{bios?.cpu_virtualization_type || 'Intel VT-x / AMD-V'}</p>
        </div>
        <Badge variant={bios?.virtualization_enabled ? 'success' : 'warning'} size="xs" className="w-fit">
          {bios?.virtualization_enabled ? 'WSL2 / Docker Ready' : 'Virtualization Disabled'}
        </Badge>
      </Card>
    </div>
  );
}

function BiosDetailedSpecsGrid({ bios }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <CircuitBoard className="w-3.5 h-3.5 text-brand-500" />
          Detected Firmware & Motherboard Hardware
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">BIOS Vendor</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {bios?.bios_vendor || 'Unknown'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Firmware Release Version</span>
            <span className="font-mono font-semibold text-brand-600 dark:text-brand-400">
              {bios?.bios_version || 'Unknown'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Release Date</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {bios?.bios_release_date || 'Unknown'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">SMBIOS Specification</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {bios?.smbios_version || 'v3.3'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Motherboard Board ID</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {bios?.motherboard_product || bios?.system_model || 'System Motherboard'}
            </span>
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Laptop className="w-3.5 h-3.5 text-indigo-500" />
          System OEM Profile & Pre-Boot Controls
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">System Manufacturer</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {bios?.system_manufacturer || 'Unavailable'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Product Model</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {bios?.system_model || 'Unavailable'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">BIOS Setup Entry Key</span>
            <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
              {bios?.oem_setup_key || 'F10 (or F2 / Del)'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">One-Time Boot Device Menu</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {bios?.oem_boot_menu_key || 'F9 (or F12)'}
            </span>
          </div>
          <div className="py-2 flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">CSM Support Status</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {bios?.csm_support || 'Disabled (Pure UEFI)'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function BiosOemReferenceCard({
  selectedOemTab,
  setSelectedOemTab,
  selectedOemData,
}) {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-brand-500" />
            OEM Brand Setup Hotkeys & Pre-Boot Reference
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select your computer manufacturer to view the exact keys for BIOS Setup, One-Time Boot Menu, and emergency firmware recovery.
          </p>
        </div>
        <Badge variant="brand" size="xs">
          Auto-Selected: {selectedOemData.name.split(' ')[0]}
        </Badge>
      </div>

      {/* Brand Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {OEM_PROFILES.map((oem) => (
          <button
            key={oem.id}
            onClick={() => setSelectedOemTab(oem.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              selectedOemTab === oem.id
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {oem.name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Selected Brand Details */}
      <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-surface-900/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div>
            <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{selectedOemData.name}</span>
            <p className="text-[11px] text-slate-500">Popular lines: {selectedOemData.models}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800 font-mono font-bold">
              Setup: {selectedOemData.setupKey}
            </span>
            <span className="text-[11px] bg-slate-200/70 dark:bg-surface-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 font-mono font-medium">
              Boot Menu: {selectedOemData.bootKey}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Hardware Diagnostics</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium font-mono text-[11px]">{selectedOemData.diagnosticsKey}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Emergency BIOS Recovery</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium font-mono text-[11px]">{selectedOemData.recoveryKey}</p>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 font-semibold text-[10px] uppercase">Standard Menu Flow</span>
            <p className="text-slate-700 dark:text-slate-300 font-medium font-mono text-[11px]">{selectedOemData.menuStructure}</p>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/60">
          <strong className="text-slate-700 dark:text-slate-300">OEM Features:</strong> {selectedOemData.specialFeatures}
        </div>
      </div>
    </Card>
  );
}

function BiosSettingsCatalogSection({
  filteredSettings,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  setSelectedImpact,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-brand-500" />
            Complete Catalog of Every BIOS & UEFI Setting ({BIOS_SETTINGS_CATALOG.length} Settings)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Interactive reference for every setting you can configure in motherboard firmware across all PCs & laptops
          </p>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-slate-700 dark:text-slate-200">{filteredSettings.length}</strong> of {BIOS_SETTINGS_CATALOG.length} settings
        </div>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <label htmlFor="bios-settings-search" className="sr-only">
              Search settings
            </label>
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="bios-settings-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings (e.g., Secure Boot, XMP, ReBAR, Fan, VT-x)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-surface-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:flex-1">
            {[
              { id: 'all', label: 'All Categories' },
              { id: 'security', label: 'Security & TPM' },
              { id: 'boot', label: 'Boot & Storage' },
              { id: 'cpu', label: 'CPU & Virtualization' },
              { id: 'memory', label: 'RAM & PCIe' },
              { id: 'gpu', label: 'Graphics & Display' },
              { id: 'power', label: 'Power & Cooling' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 dark:bg-surface-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-surface-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSettings.length === 0 ? (
          <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-surface-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
            <Search className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No matching BIOS settings found
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try searching with a broader keyword like &ldquo;virtualization&rdquo;, &ldquo;boot&rdquo;, &ldquo;fan&rdquo;, or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('all');
                setSelectedImpact('all');
              }}
              className="mt-3 text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filteredSettings.map((item) => (
            <Card key={item.id} className="p-4 flex flex-col justify-between space-y-3 hover:border-brand-500/30 transition-colors">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {item.aliases}
                    </p>
                  </div>
                  <Badge variant={item.impactVariant} size="xs" className="shrink-0">
                    {item.impact}
                  </Badge>
                </div>

                <div className="p-2 rounded-lg bg-slate-100/70 dark:bg-surface-800/60 border border-slate-200/60 dark:border-slate-700/50 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Typical Menu Location:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{item.menuLocation}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Available Options:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">{item.options}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-emerald-600 dark:text-emerald-400">Recommended Setting:</span>
                    <span className="font-mono text-emerald-700 dark:text-emerald-300">{item.recommended}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.explanation}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400">
                <strong className="text-slate-700 dark:text-slate-300">Risks / Notes:</strong> {item.risks}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function BiosRestartModal({
  showRestartModal,
  setShowRestartModal,
  restartError,
  restartMessage,
  restarting,
  handleRestartToUefi,
  setRestartMessage,
  setRestartError,
}) {
  return (
    <Modal
      isOpen={showRestartModal}
      onClose={() => {
        setShowRestartModal(false);
        setRestartMessage(null);
        setRestartError(null);
      }}
      title="Direct Reboot into UEFI Firmware Settings"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-sm">Save All Open Work Before Proceeding</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
              Triggering a direct firmware reboot will restart Windows immediately with the <code className="font-mono font-bold">shutdown.exe /r /fw /t 1</code> directive. Your PC will directly launch into the motherboard UEFI Setup Utility without needing to mash hotkeys on boot.
            </p>
          </div>
        </div>

        {restartError && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-xs">
            {restartError}
          </div>
        )}

        {restartMessage && (
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs">
            {restartMessage}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setShowRestartModal(false);
              setRestartMessage(null);
              setRestartError(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={RotateCcw}
            disabled={restarting}
            onClick={handleRestartToUefi}
          >
            {restarting ? 'Sending Reboot Command...' : 'Confirm & Reboot to UEFI'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function BiosUefi() {
  const [bios, setBios] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedImpact, setSelectedImpact] = useState('all');

  // OEM guide state
  const [selectedOemTab, setSelectedOemTab] = useState('hp');

  // Comparison drawer toggle
  const [showComparisonDetails, setShowComparisonDetails] = useState(false);

  // Restart Modal state
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartMessage, setRestartMessage] = useState(null);
  const [restartError, setRestartError] = useState(null);

  // Export guide feedback
  const [exportSuccess, setExportSuccess] = useState(false);

  const fetchBiosInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBiosFirmwareInfo();
      setBios(data);

      // Auto-detect OEM tab from system manufacturer
      if (data?.system_manufacturer || data?.bios_vendor) {
        const mfg = `${data.system_manufacturer} ${data.bios_vendor}`.toLowerCase();
        if (mfg.includes('hp') || mfg.includes('hewlett')) setSelectedOemTab('hp');
        else if (mfg.includes('dell') || mfg.includes('alienware')) setSelectedOemTab('dell');
        else if (mfg.includes('lenovo') || mfg.includes('thinkpad')) setSelectedOemTab('lenovo');
        else if (mfg.includes('asus')) setSelectedOemTab('asus');
        else if (mfg.includes('msi') || mfg.includes('micro-star')) setSelectedOemTab('msi');
        else if (mfg.includes('acer')) setSelectedOemTab('acer');
        else if (mfg.includes('gigabyte')) setSelectedOemTab('gigabyte');
        else if (mfg.includes('surface') || mfg.includes('microsoft')) setSelectedOemTab('surface');
      }
    } catch (e) {
      console.error('Failed to fetch BIOS info:', e);
      setError('Unable to read BIOS/UEFI firmware information from system registry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBiosInfo();
  }, [fetchBiosInfo]);

  const isUefi = useMemo(() => {
    if (!bios) return true;
    const fw = (bios.firmware_type || '').toLowerCase();
    const boot = (bios.uefi_boot_status || '').toLowerCase();
    return fw.includes('uefi') || boot.includes('uefi');
  }, [bios]);

  const isSecureBootOn = bios?.secure_boot_status === 'Enabled';

  // Filtered settings
  const filteredSettings = useMemo(() => {
    return BIOS_SETTINGS_CATALOG.filter((item) => {
      // Category filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Impact filter
      if (selectedImpact !== 'all') {
        if (selectedImpact === 'essential' && !item.impact.includes('Essential')) return false;
        if (selectedImpact === 'performance' && !item.impact.includes('Performance')) return false;
        if (selectedImpact === 'recommended' && !item.impact.includes('Recommended')) return false;
        if (selectedImpact === 'advanced' && !item.impact.includes('Caution') && !item.impact.includes('Critical')) return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const inTitle = item.title.toLowerCase().includes(q);
        const inAliases = item.aliases.toLowerCase().includes(q);
        const inExplanation = item.explanation.toLowerCase().includes(q);
        const inLocation = item.menuLocation.toLowerCase().includes(q);
        const inOptions = item.options.toLowerCase().includes(q);
        if (!inTitle && !inAliases && !inExplanation && !inLocation && !inOptions) {
          return false;
        }
      }
      return true;
    });
  }, [selectedCategory, selectedImpact, searchTerm]);

  // Restart to UEFI
  const handleRestartToUefi = async () => {
    setRestarting(true);
    setRestartError(null);
    try {
      const res = await api.restartToUefiFirmware();
      setRestartMessage(res || 'Reboot scheduled. Computer will restart directly into UEFI Firmware Settings in 1 second.');
    } catch (e) {
      setRestartError(e.message || 'Failed to trigger UEFI restart. Administrator privileges or UEFI support is required.');
    } finally {
      setRestarting(false);
    }
  };

  // Export Guide to Markdown
  const handleExportGuide = () => {
    try {
      const detectedInfo = bios
        ? `
# Host System Firmware Profile
- **Firmware Architecture**: ${bios.firmware_type} (${isUefi ? 'UEFI 64-bit' : 'Legacy BIOS 16-bit'})
- **Boot Mode**: ${bios.uefi_boot_status}
- **BIOS Vendor**: ${bios.bios_vendor}
- **BIOS Version**: ${bios.bios_version} (${bios.bios_release_date})
- **Motherboard / Model**: ${bios.system_manufacturer} ${bios.system_model} (${bios.motherboard_product})
- **Secure Boot State**: ${bios.secure_boot_status}
- **Security TPM**: ${bios.tpm_present ? bios.tpm_version : 'Not Detected'}
- **CPU Virtualization**: ${bios.virtualization_enabled ? bios.cpu_virtualization_type : 'Disabled'}
- **Direct Setup Key**: ${bios.oem_setup_key || 'F10 / F2 / Del'}
- **Boot Menu Key**: ${bios.oem_boot_menu_key || 'F9 / F12'}
`
        : '';

      const settingsTable = BIOS_SETTINGS_CATALOG.map((s, idx) => `
### ${idx + 1}. ${s.title}
- **Category**: ${s.category.toUpperCase()} | **Impact**: ${s.impact}
- **Synonyms / Aliases**: ${s.aliases}
- **Typical BIOS Menu Path**: \`${s.menuLocation}\`
- **Options**: \`${s.options}\`
- **Recommended**: **${s.recommended}**
- **Purpose**: ${s.purpose}
- **Detailed Explanation**: ${s.explanation}
- **Risks & Gotchas**: ${s.risks}
`).join('\n---\n');

      const oemSection = OEM_PROFILES.map((o) => `
### ${o.name}
- **Supported Models**: ${o.models}
- **BIOS Setup Key**: **${o.setupKey}**
- **Boot Device Menu Key**: **${o.bootKey}**
- **Hardware Diagnostics**: ${o.diagnosticsKey}
- **Emergency Recovery**: ${o.recoveryKey}
- **Standard Menu Flow**: ${o.menuStructure}
- **Features**: ${o.specialFeatures}
`).join('\n');

      const fullDoc = `# SYSTEMPILOT — COMPLETE BIOS & UEFI CONFIGURATION MANUAL
*Generated by SystemPilot on ${new Date().toLocaleString()}*

${detectedInfo}

---

## 1. UEFI vs Legacy BIOS: Architecture Comparison
| Feature | Modern UEFI | Legacy BIOS (CSM) |
|---|---|---|
${UEFI_VS_LEGACY_COMPARISON.map((c) => `| ${c.feature} | ${c.uefi} | ${c.legacy} |`).join('\n')}

---

## 2. Complete Catalog of Every Configurable BIOS / UEFI Setting
${settingsTable}

---

## 3. Manufacturer-Specific Setup Keys & Recovery Combos
${oemSection}

---
*Created with SystemPilot — Universal Windows System Management Platform*
`;

      const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `SystemPilot_BIOS_UEFI_Guide_${bios?.system_manufacturer || 'PC'}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to export guide:', err);
    }
  };

  const selectedOemData = useMemo(() => {
    return OEM_PROFILES.find((p) => p.id === selectedOemTab) || OEM_PROFILES[0];
  }, [selectedOemTab]);

  if (loading && !bios) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <Card className="p-8 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Probing System Firmware, SMBIOS Tables & BIOS / UEFI Architecture...
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn text-slate-800 dark:text-slate-100 pb-16">
      {/* 1. PAGE HEADER */}
      <BiosHeader
        isUefi={isUefi}
        exportSuccess={exportSuccess}
        handleExportGuide={handleExportGuide}
        fetchBiosInfo={fetchBiosInfo}
        setShowRestartModal={setShowRestartModal}
      />

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. HERO FIRMWARE ARCHITECTURE BANNER (UEFI vs LEGACY BIOS) */}
      <BiosArchitectureBanner
        isUefi={isUefi}
        bios={bios}
        showComparisonDetails={showComparisonDetails}
        setShowComparisonDetails={setShowComparisonDetails}
      />

      {/* 3. HARDWARE SPECIFICATION CARDS */}
      <BiosHardwareSpecCards
        bios={bios}
        isUefi={isUefi}
        isSecureBootOn={isSecureBootOn}
      />

      {/* 4. DETAILED SPECIFICATION GRID */}
      <BiosDetailedSpecsGrid bios={bios} />

      {/* 5. OEM BRAND SHORTCUTS & WALKTHROUGH SECTION */}
      <BiosOemReferenceCard
        selectedOemTab={selectedOemTab}
        setSelectedOemTab={setSelectedOemTab}
        selectedOemData={selectedOemData}
      />

      {/* 6. COMPLETE BIOS / UEFI SETTINGS ENCYCLOPEDIA */}
      <BiosSettingsCatalogSection
        filteredSettings={filteredSettings}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        setSelectedImpact={setSelectedImpact}
      />

      {/* 7. RESTART MODAL */}
      <BiosRestartModal
        showRestartModal={showRestartModal}
        setShowRestartModal={setShowRestartModal}
        restartError={restartError}
        restartMessage={restartMessage}
        restarting={restarting}
        handleRestartToUefi={handleRestartToUefi}
        setRestartMessage={setRestartMessage}
        setRestartError={setRestartError}
      />
    </div>
  );
}
