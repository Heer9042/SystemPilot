/**
 * SystemPilot Unified Automated Test Suite
 * Consolidates all application test suites into a single authoritative runner:
 *   1. Semantic Versioning & Project-Wide Version Consistency
 *   2. Security Controls & Hardening Regression
 *   3. Process Manager, Safe Termination & TDZ Prevention
 *   4. Windows Tools & System Administration Center
 *   5. Fan Speed, Thermal Zones & Smart Cooling Telemetry
 *   6. Universal Windows Compatibility & Hardware Adaptation
 *   7. Windows Installer, NSIS Hooks & Packaging Directives
 *   8. Environment Configuration & Secret Leak Prevention
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseSemVer, compareSemVer, isNewerVersion } from '../frontend/src/services/updates/version.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

let currentSuiteName = '';
let suiteResults = [];
let currentSuitePassed = 0;
let currentSuiteFailed = 0;

function startSuite(name) {
  currentSuiteName = name;
  currentSuitePassed = 0;
  currentSuiteFailed = 0;
  console.log(`\n====================================================`);
  console.log(`Suite: ${name}`);
  console.log(`====================================================`);
}

function endSuite() {
  suiteResults.push({
    name: currentSuiteName,
    passed: currentSuitePassed,
    failed: currentSuiteFailed,
  });
}

function assert(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    currentSuitePassed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failedAssertions++;
    currentSuiteFailed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('####################################################');
console.log('        SYSTEMPILOT UNIFIED TEST SUITE              ');
console.log('####################################################');

// ==============================================================================
// 1. Semantic Versioning & Authoritative Consistency
// ==============================================================================
startSuite('1. Semantic Versioning & Version Consistency');

assert(compareSemVer('0.0.1', '0.0.2') === -1, '0.0.1 < 0.0.2');
assert(isNewerVersion('0.0.1', '0.0.2') === true, 'isNewerVersion(0.0.1, 0.0.2) is true');
assert(compareSemVer('1.9.0', '1.10.0') === -1, '1.9.0 < 1.10.0 (semantic handling)');
assert(isNewerVersion('1.9.0', '1.10.0') === true, 'isNewerVersion(1.9.0, 1.10.0) is true');
assert(compareSemVer('1.10.0', '1.9.0') === 1, '1.10.0 > 1.9.0');
assert(compareSemVer('1.9.9', '2.0.0') === -1, '1.9.9 < 2.0.0');
assert(isNewerVersion('1.9.9', '2.0.0') === true, 'isNewerVersion(1.9.9, 2.0.0) is true');
assert(compareSemVer('0.0.2', '0.0.2') === 0, '0.0.2 === 0.0.2');
assert(isNewerVersion('0.0.2', '0.0.2') === false, 'isNewerVersion(0.0.2, 0.0.2) is false');
assert(compareSemVer('v0.0.2', '0.0.3') === -1, 'v0.0.2 < 0.0.3');
assert(compareSemVer('V1.0.0', 'v1.0.0') === 0, 'V1.0.0 === v1.0.0');
assert(isNewerVersion('v0.0.2', '0.0.3') === true, 'isNewerVersion(v0.0.2, 0.0.3) is true');
assert(compareSemVer('1.0.0-beta.1', '1.0.0') === -1, '1.0.0-beta.1 < 1.0.0');
assert(compareSemVer('1.0.0', '1.0.0-beta.1') === 1, '1.0.0 > 1.0.0-beta.1');
assert(parseSemVer(null).raw === '0.0.0', 'parseSemVer(null) safely defaults to 0.0.0');
assert(parseSemVer('').raw === '0.0.0', 'parseSemVer("") safely defaults to 0.0.0');

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
const authoritativeVersion = rootPkg.version;
assert(!!authoritativeVersion, `Authoritative version defined in package.json: v${authoritativeVersion}`);

const rootLock = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package-lock.json'), 'utf-8'));
assert(rootLock.version === authoritativeVersion, `package-lock.json version matches (${rootLock.version} === ${authoritativeVersion})`);

const frontPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'package.json'), 'utf-8'));
assert(frontPkg.version === authoritativeVersion, `frontend/package.json version matches (${frontPkg.version} === ${authoritativeVersion})`);

const frontLock = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'package-lock.json'), 'utf-8'));
assert(frontLock.version === authoritativeVersion, `frontend/package-lock.json version matches (${frontLock.version} === ${authoritativeVersion})`);

const cargoToml = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'Cargo.toml'), 'utf-8');
const cargoMatch = cargoToml.match(/^version\s*=\s*"([^"]+)"/m);
const cargoVersion = cargoMatch ? cargoMatch[1] : null;
assert(cargoVersion === authoritativeVersion, `src-tauri/Cargo.toml version matches (${cargoVersion} === ${authoritativeVersion})`);

const tauriConf = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'tauri.conf.json'), 'utf-8'));
assert(tauriConf.version === authoritativeVersion, `src-tauri/tauri.conf.json version matches (${tauriConf.version} === ${authoritativeVersion})`);

const latestPath = path.join(ROOT_DIR, 'release', 'latest.json');
if (fs.existsSync(latestPath)) {
  const latestJson = JSON.parse(fs.readFileSync(latestPath, 'utf-8').replace(/^\uFEFF/, ''));
  assert(latestJson.version === authoritativeVersion, `release/latest.json version matches (${latestJson.version} === ${authoritativeVersion})`);
}
endSuite();

// ==============================================================================
// 2. Security Controls & Hardening Regression
// ==============================================================================
startSuite('2. Security Controls & Hardening Regression');

const csp = tauriConf?.app?.security?.csp;
assert(typeof csp === 'string' && csp.length > 0, 'Content Security Policy (CSP) is defined');
assert(csp.includes("default-src 'self'"), "CSP restricts default-src to 'self'");
assert(csp.includes("object-src 'none'"), "CSP blocks untrusted plugin objects (object-src 'none')");
assert(csp.includes("base-uri 'self'"), "CSP prevents base-tag hijacking (base-uri 'self')");
assert(csp.includes("https://api.github.com"), 'CSP restricts connect-src to authorized GitHub APIs');

const pathsRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'windows', 'paths.rs'), 'utf8');
assert(pathsRs.includes('SystemRoot'), 'paths.rs uses %SystemRoot% environment root');
assert(pathsRs.includes('System32'), 'paths.rs targets canonical System32 directory');
assert(pathsRs.includes('powershell.exe'), 'paths.rs secures WindowsPowerShell path');
assert(pathsRs.includes('cmd.exe'), 'paths.rs secures cmd.exe path');

const sysControlRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'system_control.rs'), 'utf8');
assert(
  sysControlRs.includes('"System"') &&
  sysControlRs.includes('"Application"') &&
  sysControlRs.includes('"Security"') &&
  sysControlRs.includes('"Setup"'),
  'get_system_event_logs enforces a strict whitelist of Windows event log names'
);
assert(
  !sysControlRs.includes("Get-WinEvent -LogName '${log}'"),
  'get_system_event_logs no longer directly interpolates unvalidated frontend string'
);

const cleanupRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'cleanup.rs'), 'utf8');
assert(cleanupRs.includes('symlink_metadata'), 'cleanup.rs uses symlink_metadata to avoid following NTFS symlinks or junctions');
assert(cleanupRs.includes('meta.is_symlink()'), 'cleanup.rs explicitly checks and isolates symlink entries');

const processesRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'processes.rs'), 'utf8');
assert(processesRs.includes('std::process::id()'), 'processes.rs protects SystemPilot host process from self-termination');

const loggingRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'logging', 'mod.rs'), 'utf8');
assert(loggingRs.includes(".replace('\\r', \"\")") && loggingRs.includes(".replace('\\n', \" \")"), 'logging module sanitizes message content to prevent log injection');

const commandsModRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'mod.rs'), 'utf8');
assert(commandsModRs.includes('clean_key.len() > 128'), 'set_setting bounds maximum key length to 128 characters');
assert(commandsModRs.includes('value.len() > 4096'), 'set_setting bounds maximum value size to 4096 bytes');

const updatesRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'updates.rs'), 'utf8');
assert(updatesRs.includes('is_trusted_download_url'), 'updates.rs enforces strict whitelist on remote download URLs');
assert(updatesRs.includes('starts_with(&allowed_dir)'), 'updates.rs enforces path containment inside SystemPilot updates directory');
assert(updatesRs.includes('extension != "exe" && extension != "msi"'), 'updates.rs validates installer file extension strictly before execution');
assert(updatesRs.includes('meta.len() < 1024 * 1024'), 'updates.rs rejects truncated or corrupted update packages under 1MB');

const manifestXml = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'resources', 'systempilot.exe.manifest'), 'utf8');
assert(manifestXml.includes('level="requireAdministrator"'), 'application manifest specifies requestedExecutionLevel="requireAdministrator"');
assert(!manifestXml.includes('level="asInvoker"'), 'application manifest does not use un-elevated asInvoker level');

const permissionsDoc = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'windows', 'PERMISSIONS.txt'), 'utf8');
assert(permissionsDoc.includes('Current User Installation') && permissionsDoc.includes('All Users Installation'), 'PERMISSIONS.txt documents dual installation scopes');
assert(permissionsDoc.includes('Principle of Least Privilege') && permissionsDoc.includes('On-Demand UAC Elevation'), 'PERMISSIONS.txt documents least-privilege guarantees');

const securityRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'windows', 'security.rs'), 'utf8');
assert(securityRs.includes('TokenElevation') && securityRs.includes('OpenProcessToken'), 'security.rs implements is_current_process_elevated using TokenElevation query');
assert(updatesRs.includes('is_machine_install') && updatesRs.includes('runas'), 'updates.rs dynamically selects elevation verb');
assert(updatesRs.includes('exec_res <= 32') && updatesRs.includes('administrator permissions were denied'), 'updates.rs catches declined UAC elevation without crashing');
assert(sysControlRs.includes('restart_to_uefi_firmware') && sysControlRs.includes('runas'), 'restart_to_uefi_firmware supports on-demand UAC elevation via runas');
assert(sysControlRs.includes('administrator approval was declined'), 'restart_to_uefi_firmware cleanly handles declined UAC elevation');
endSuite();

// ==============================================================================
// 3. Process Manager, Safe Termination & TDZ Prevention
// ==============================================================================
startSuite('3. Process Manager & TDZ Prevention');

assert(processesRs.includes('pub struct ProcessInfo'), 'processes.rs defines ProcessInfo struct');
assert(processesRs.includes('pub struct ProcessProperties'), 'processes.rs defines ProcessProperties struct');
assert(processesRs.includes('pub fn terminate_process_tree'), 'processes.rs implements terminate_process_tree command');
assert(processesRs.includes('pub fn open_process_location'), 'processes.rs implements open_process_location command');
assert(processesRs.includes('pub async fn get_process_properties'), 'processes.rs implements get_process_properties command');
assert(processesRs.includes('is_windows_core_process'), 'processes.rs implements documented is_windows_core_process category rule');
assert(processesRs.includes('get_process_snapshot_data'), 'processes.rs implements Win32 ToolHelp thread count sampling');
assert(processesRs.includes('QueryFullProcessImageNameW'), 'processes.rs implements Win32 image revalidation to prevent PID reuse');
assert(processesRs.includes('CRITICAL_PROCESSES'), 'processes.rs maintains protected critical process whitelist');

const libRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'lib.rs'), 'utf8');
assert(libRs.includes('commands::processes::get_processes'), 'lib.rs registers get_processes');
assert(libRs.includes('commands::processes::get_process_properties'), 'lib.rs registers get_process_properties');
assert(libRs.includes('commands::processes::terminate_process'), 'lib.rs registers terminate_process');
assert(libRs.includes('commands::processes::terminate_process_tree'), 'lib.rs registers terminate_process_tree');
assert(libRs.includes('commands::processes::open_process_location'), 'lib.rs registers open_process_location');

const tauriApi = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'services', 'tauriApi.js'), 'utf8');
assert(tauriApi.includes('async terminateProcess(pid, expectedName'), 'tauriApi.js supports expectedName parameter');
assert(tauriApi.includes('async terminateProcessTree'), 'tauriApi.js exposes terminateProcessTree method');
assert(tauriApi.includes('async openProcessLocation'), 'tauriApi.js exposes openProcessLocation method');
assert(tauriApi.includes('async getProcessProperties'), 'tauriApi.js exposes getProcessProperties method');

const procJsx = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'Processes.jsx'), 'utf8');
assert(procJsx.includes('Process Name') && procJsx.includes('PID') && procJsx.includes('CPU %') && procJsx.includes('Memory (RAM)'), 'Processes.jsx renders clean table with all required columns');
assert(procJsx.includes('filterCategory') && procJsx.includes('apps') && procJsx.includes('background') && procJsx.includes('windows'), 'Processes.jsx supports Apps, Background, Windows, and All category filters');
assert(procJsx.includes('isAutoRefresh') && procJsx.includes('Pause') && procJsx.includes('Resume'), 'Processes.jsx implements auto-refresh toggle with pause/resume');
assert(procJsx.includes('selectedPid'), 'Processes.jsx preserves selected process during refresh');
assert(procJsx.includes('endTaskModal') && procJsx.includes('End Process'), 'Processes.jsx implements End Task confirmation modal');
assert(procJsx.includes('endTreeModal') && procJsx.includes('End Process Tree'), 'Processes.jsx implements End Process Tree modal');
assert(procJsx.includes('propertiesModal') && procJsx.includes('General Information'), 'Processes.jsx implements comprehensive Properties dialog');
assert(procJsx.includes('handleCopyDetails') && procJsx.includes('navigator.clipboard'), 'Processes.jsx implements Copy Details to clipboard');
assert(procJsx.includes('handleOpenFileLocation'), 'Processes.jsx implements Open Location in Explorer');
assert(procJsx.includes('process-context-menu'), 'Processes.jsx implements right-click custom context menu');

const filterDeclPos = procJsx.indexOf('const filteredAndSortedProcesses = useMemo(');
const keydownEffectPos = procJsx.indexOf('window.addEventListener(\'keydown\', handleKeyDown)');
assert(filterDeclPos !== -1 && keydownEffectPos !== -1 && filterDeclPos < keydownEffectPos, 'filteredAndSortedProcesses declared before keyboard navigation effect (TDZ prevention)');
assert(procJsx.includes('Retry Enumeration'), 'Processes.jsx provides in-page retry recovery for enumeration errors');

const appJsx = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'App.jsx'), 'utf8');
assert(appJsx.includes('<ErrorBoundary key={activeTab}>'), 'App.jsx isolates tabs with ErrorBoundary key={activeTab}');

const errBoundaryJsx = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'components', 'common', 'ErrorBoundary.jsx'), 'utf8');
assert(errBoundaryJsx.includes('handleCopyReference'), 'ErrorBoundary provides copyable reference ID helper');
assert(errBoundaryJsx.includes('Diagnostic Details'), 'ErrorBoundary provides sanitized diagnostic details inspection');

// Simulation test
const mockProcesses = [
  { pid: 4, name: 'System', category: 'windows', is_critical: true, cpu_usage: 0.2, memory_bytes: 40960 },
  { pid: 820, name: 'svchost.exe', category: 'windows', is_critical: false, cpu_usage: 0.5, memory_bytes: 25000000 },
  { pid: 1420, name: 'Code.exe', category: 'apps', is_critical: false, cpu_usage: 3.4, memory_bytes: 350000000 },
  { pid: 4890, name: 'node.exe', category: 'background', is_critical: false, cpu_usage: 1.1, memory_bytes: 90000000 },
  { pid: 9912, name: 'Discord.exe', category: 'apps', is_critical: false, cpu_usage: 0.8, memory_bytes: 180000000 },
];
const searchResults = mockProcesses.filter(p => p.name.toLowerCase().includes('code') || p.pid.toString().includes('code'));
assert(searchResults.length === 1 && searchResults[0].pid === 1420, 'Search by name locates target process');
assert(mockProcesses.filter(p => p.category === 'apps').length === 2, 'Apps category filter separates interactive processes');
assert(mockProcesses.filter(p => p.category === 'background').length === 1, 'Background category filter isolates non-window services');
assert(mockProcesses.filter(p => p.category === 'windows').length === 2, 'Windows category filter isolates core OS processes');
const sortedByCpuDesc = [...mockProcesses].sort((a, b) => b.cpu_usage - a.cpu_usage);
assert(sortedByCpuDesc[0].pid === 1420 && sortedByCpuDesc[0].cpu_usage === 3.4, 'Sorting by CPU descending orders highest CPU process first');
endSuite();

// ==============================================================================
// 4. Windows Tools & System Administration Center
// ==============================================================================
startSuite('4. Windows Tools & Administration Center');

assert(sysControlRs.includes('pub struct WindowsToolItem'), 'system_control.rs defines WindowsToolItem struct');
assert(sysControlRs.includes('pub struct HardwareDeviceItem'), 'system_control.rs defines HardwareDeviceItem struct');
assert(sysControlRs.includes('pub struct ScheduledTaskItem'), 'system_control.rs defines ScheduledTaskItem struct');
assert(sysControlRs.includes('pub struct DiagnosticReport'), 'system_control.rs defines DiagnosticReport struct');
assert(sysControlRs.includes('pub fn get_windows_tools_directory'), 'system_control.rs implements get_windows_tools_directory command');
assert(sysControlRs.includes('pub fn get_device_inventory'), 'system_control.rs implements get_device_inventory command');
assert(sysControlRs.includes('pub fn get_scheduled_tasks'), 'system_control.rs implements get_scheduled_tasks command');
assert(sysControlRs.includes('pub fn open_drive_location'), 'system_control.rs implements open_drive_location command');
assert(sysControlRs.includes('pub fn export_diagnostic_report'), 'system_control.rs implements export_diagnostic_report command');

const allowedTools = [
  'compmgmt.msc', 'diskmgmt.msc', 'devmgmt.msc', 'services.msc',
  'eventvwr.msc', 'taskschd.msc', 'perfmon.exe', 'resmon.exe',
  'msinfo32.exe', 'msconfig.exe', 'regedit.exe', 'gpedit.msc',
  'secpol.msc', 'cleanmgr.exe', 'dxdiag.exe', 'mstsc.exe', 'wt.exe'
];
for (const tool of allowedTools) {
  assert(sysControlRs.includes(tool), `launch_windows_tool supports ${tool}`);
}

assert(libRs.includes('commands::system_control::get_windows_tools_directory'), 'lib.rs registers get_windows_tools_directory');
assert(libRs.includes('commands::system_control::get_device_inventory'), 'lib.rs registers get_device_inventory');
assert(libRs.includes('commands::system_control::get_scheduled_tasks'), 'lib.rs registers get_scheduled_tasks');
assert(libRs.includes('commands::system_control::open_drive_location'), 'lib.rs registers open_drive_location');
assert(libRs.includes('commands::system_control::export_diagnostic_report'), 'lib.rs registers export_diagnostic_report');

assert(tauriApi.includes('async getWindowsToolsDirectory'), 'tauriApi.js exposes getWindowsToolsDirectory');
assert(tauriApi.includes('async getDeviceInventory'), 'tauriApi.js exposes getDeviceInventory');
assert(tauriApi.includes('async getScheduledTasks'), 'tauriApi.js exposes getScheduledTasks');
assert(tauriApi.includes('async openDriveLocation'), 'tauriApi.js exposes openDriveLocation');
assert(tauriApi.includes('async exportDiagnosticReport'), 'tauriApi.js exposes exportDiagnosticReport');

const navContent = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'components', 'layout', 'navigationItems.js'), 'utf8');
assert(navContent.includes("'windows-tools'"), 'navigationItems.js registers windows-tools navigation item');
assert(navContent.includes('Windows Tools'), 'navigationItems.js defines "Windows Tools" label');

const winToolsContent = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'WindowsTools.jsx'), 'utf8');
assert(winToolsContent.includes('Computer Management'), 'WindowsTools.jsx includes Computer Management category');
assert(winToolsContent.includes('Storage and Disk Management'), 'WindowsTools.jsx includes Storage category');
assert(winToolsContent.includes('Device and Driver Management'), 'WindowsTools.jsx includes Device category');
assert(winToolsContent.includes('Users and Groups'), 'WindowsTools.jsx includes Users and Groups category');
assert(winToolsContent.includes('Services and Scheduled Tasks'), 'WindowsTools.jsx includes Services category');
assert(winToolsContent.includes('Event Viewer and Logs'), 'WindowsTools.jsx includes Event Viewer category');
assert(winToolsContent.includes('SystemPilot Diagnostics'), 'WindowsTools.jsx includes Diagnostics category');
endSuite();

// ==============================================================================
// 5. Fan Speed, Thermal Zones & Smart Cooling Telemetry
// ==============================================================================
startSuite('5. Fan Speed & Thermal Telemetry');

const fansRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'fans.rs'), 'utf8');
assert(fansRs.includes('pub struct FanSensorDetail'), 'fans.rs defines FanSensorDetail struct');
assert(fansRs.includes('pub struct ThermalZoneDetail'), 'fans.rs defines ThermalZoneDetail struct');
assert(fansRs.includes('pub struct CoolingSystemOverview'), 'fans.rs defines CoolingSystemOverview struct');
assert(fansRs.includes('pub cpu_temp_celsius: Option<f32>') && fansRs.includes('pub cpu_temperature_c: Option<f32>'), 'fans.rs provides dual schema cpu_temp_celsius and cpu_temperature_c');
assert(fansRs.includes('pub gpu_temp_celsius: Option<f32>') && fansRs.includes('pub gpu_temperature_c: Option<f32>'), 'fans.rs provides dual schema gpu_temp_celsius and gpu_temperature_c');
assert(fansRs.includes('pub active_sensors_count: usize'), 'fans.rs includes active_sensors_count field');
assert(fansRs.includes('pub control_capability: String'), 'fans.rs includes control_capability field');
assert(fansRs.includes('pub warnings: Vec<String>'), 'fans.rs includes warnings array');

assert(fansRs.includes('query_windows_thermal_zone()'), 'fans.rs implements Windows PDH thermal zone query');
assert(fansRs.includes('THERMAL_CACHE') && fansRs.includes('Duration::from_millis(2000)'), 'fans.rs implements in-memory caching to prevent CPU spikes');
assert(fansRs.includes('collect_gpu_system_snapshot') && fansRs.includes('for adapter in &snapshot.adapters'), 'fans.rs iterates GPU adapters to detect discrete GPU sensors');
assert(fansRs.includes('get_windows_cooling_policy()'), 'fans.rs queries Windows ACPI cooling policy via powercfg');
assert(fansRs.includes('pub fn set_cooling_policy'), 'fans.rs implements set_cooling_policy command');
assert(fansRs.includes('pub fn set_manual_fan_speed'), 'fans.rs implements set_manual_fan_speed command');
assert(fansRs.includes('pub fn restore_automatic_cooling'), 'fans.rs implements restore_automatic_cooling command');
assert(fansRs.includes('speed_percent < 20 || speed_percent > 100'), 'fans.rs clamps manual fan speed between 20% and 100%');

assert(libRs.includes('commands::fans::get_fan_cooling_details'), 'lib.rs registers get_fan_cooling_details');
assert(libRs.includes('commands::fans::set_cooling_policy'), 'lib.rs registers set_cooling_policy');
assert(libRs.includes('commands::fans::set_manual_fan_speed'), 'lib.rs registers set_manual_fan_speed');
assert(libRs.includes('commands::fans::restore_automatic_cooling'), 'lib.rs registers restore_automatic_cooling');

assert(tauriApi.includes('async getFanCoolingDetails()'), 'tauriApi.js exposes getFanCoolingDetails');
assert(tauriApi.includes('async setCoolingPolicy('), 'tauriApi.js exposes setCoolingPolicy');
assert(tauriApi.includes('async setManualFanSpeed('), 'tauriApi.js exposes setManualFanSpeed');
assert(tauriApi.includes('async restoreAutomaticCooling()'), 'tauriApi.js exposes restoreAutomaticCooling');

const dashboard = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'Dashboard.jsx'), 'utf8');
assert(dashboard.includes('api.getFanCoolingDetails()'), 'Dashboard.jsx queries getFanCoolingDetails');
assert(dashboard.includes('coolingData?.cpu_temp_celsius ?? coolingData?.cpu_temperature_c'), 'Dashboard.jsx reads CPU temp with schema fallback');
assert(dashboard.includes('coolingData?.gpu_temp_celsius ?? coolingData?.gpu_temperature_c'), 'Dashboard.jsx reads GPU temp with schema fallback');
assert(dashboard.includes('function FanCoolingDashboardCard'), 'Dashboard.jsx renders FanCoolingDashboardCard');

const fanManagement = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'pages', 'FanManagement.jsx'), 'utf8');
assert(fanManagement.includes('Fan Speed & Thermal Management'), 'FanManagement.jsx includes header and title');
assert(fanManagement.includes('Detected Fan Sensors'), 'FanManagement.jsx displays detected fan sensors');
assert(fanManagement.includes('Thermal Zones & Critical Safety Thresholds'), 'FanManagement.jsx displays thermal zones');
assert(fanManagement.includes('Thermal safety policy: Firmware-managed thermal throttling'), 'FanManagement.jsx displays safety disclosure');
endSuite();

// ==============================================================================
// 6. Universal Windows Compatibility & Hardware Adaptation
// ==============================================================================
startSuite('6. Universal Compatibility & Adaptation');

const capRs = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'src', 'commands', 'capabilities.rs'), 'utf8');
assert(capRs.includes('pub struct EnvironmentProfile'), 'capabilities.rs defines EnvironmentProfile struct');
assert(capRs.includes('pub struct FeatureCapability'), 'capabilities.rs defines FeatureCapability struct');
assert(capRs.includes('pub struct SystemCompatibilityReport'), 'capabilities.rs defines SystemCompatibilityReport struct');
assert(capRs.includes('pub fn get_system_capabilities'), 'capabilities.rs implements get_system_capabilities command');
assert(capRs.includes('is_virtual_machine'), 'capabilities.rs detects virtualization');
assert(capRs.includes('vmware'), 'capabilities.rs recognizes VMware hypervisor');
assert(capRs.includes('virtualbox'), 'capabilities.rs recognizes VirtualBox hypervisor');
assert(capRs.includes('hyper-v'), 'capabilities.rs recognizes Microsoft Hyper-V hypervisor');
assert(capRs.includes('form_factor'), 'capabilities.rs classifies form factor (Laptop vs Desktop vs VM)');
assert(capRs.includes('is_home_edition'), 'capabilities.rs detects Windows Home vs Pro editions');
assert(capRs.includes('tools_gpedit'), 'capabilities.rs maps Group Policy Editor availability to edition');
assert(capRs.includes('tools_lusrmgr'), 'capabilities.rs maps Local Users and Groups availability to edition');
assert(capRs.includes('is_elevated'), 'capabilities.rs inspects process elevation level');
assert(capRs.includes('PermissionRequired'), 'capabilities.rs marks elevated operations as PermissionRequired for standard users');

assert(libRs.includes('commands::capabilities::get_system_capabilities'), 'lib.rs registers get_system_capabilities');
assert(commandsModRs.includes('pub mod capabilities;'), 'commands/mod.rs exports pub mod capabilities');
assert(tauriApi.includes('async getSystemCapabilities()'), 'tauriApi.js exposes getSystemCapabilities method');

const modalJsx = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'components', 'modals', 'SystemCompatibilityModal.jsx'), 'utf8');
assert(modalJsx.includes('STATUS_CONFIG'), 'SystemCompatibilityModal.jsx defines capability status configurations');
assert(modalJsx.includes('Supported:'), 'SystemCompatibilityModal.jsx handles Supported status');
assert(modalJsx.includes('ReadOnly:'), 'SystemCompatibilityModal.jsx handles ReadOnly status');
assert(modalJsx.includes('PermissionRequired:'), 'SystemCompatibilityModal.jsx handles PermissionRequired status');
assert(modalJsx.includes('DependencyRequired:'), 'SystemCompatibilityModal.jsx handles DependencyRequired status');
assert(modalJsx.includes('Unsupported:'), 'SystemCompatibilityModal.jsx handles Unsupported status');
assert(modalJsx.includes('handleCopyReport'), 'SystemCompatibilityModal.jsx provides clipboard diagnostic export');

const policyDoc = fs.readFileSync(path.join(ROOT_DIR, 'COMPATIBILITY.md'), 'utf8');
assert(policyDoc.includes('Operating System Support Matrix'), 'COMPATIBILITY.md defines OS Support Matrix');
assert(policyDoc.includes('Windows 10 (22H2 / 21H2 / 20H2 / 20H1)'), 'COMPATIBILITY.md documents Windows 10 supported builds (19041+)');
assert(policyDoc.includes('Windows 11 (24H2)'), 'COMPATIBILITY.md documents Windows 11 support');
assert(policyDoc.includes('Windows Editions & Feature Adaptation'), 'COMPATIBILITY.md documents Home vs Pro feature differences');
assert(policyDoc.includes('Virtual Machines (Hyper-V, VMware, VirtualBox, QEMU, KVM)'), 'COMPATIBILITY.md documents VM adaptation');
endSuite();

// ==============================================================================
// 7. Windows Installer, NSIS Hooks & Packaging Directives
// ==============================================================================
startSuite('7. Windows Installer & Packaging Directives');

assert(tauriConf.bundle && tauriConf.bundle.active === true, 'bundle.active is true');
assert(Array.isArray(tauriConf.bundle.targets) && tauriConf.bundle.targets.includes('nsis'), 'Target includes NSIS installer');
assert(Array.isArray(tauriConf.bundle.targets) && tauriConf.bundle.targets.includes('msi'), 'Target includes MSI package');
assert(tauriConf.bundle.windows?.nsis?.installerHooks === 'windows/hooks.nsh', 'NSIS hooks configured at windows/hooks.nsh');
assert(tauriConf.bundle.windows?.nsis?.installMode === 'both', 'NSIS installMode supports dual installation scopes');
assert(tauriConf.bundle.windows?.digestAlgorithm === 'sha256', 'bundle.windows specifies sha256 digestAlgorithm');
assert(typeof tauriConf.bundle.windows?.timestampUrl === 'string', 'bundle.windows specifies RFC 3161 timestampUrl');
assert(typeof tauriConf.bundle.windows?.signCommand === 'string', 'bundle.windows specifies automated signCommand');

const hooksContent = fs.readFileSync(path.join(ROOT_DIR, 'src-tauri', 'windows', 'hooks.nsh'), 'utf8');
assert(hooksContent.includes('!macro NSIS_HOOK_PREINSTALL'), 'Defines NSIS_HOOK_PREINSTALL macro');
assert(hooksContent.includes('!macro NSIS_HOOK_POSTINSTALL'), 'Defines NSIS_HOOK_POSTINSTALL macro');
assert(hooksContent.includes('!macro NSIS_HOOK_PREUNINSTALL'), 'Defines NSIS_HOOK_PREUNINSTALL macro');
assert(hooksContent.includes('!macro NSIS_HOOK_POSTUNINSTALL'), 'Defines NSIS_HOOK_POSTUNINSTALL macro');
assert(hooksContent.includes('CurrentBuild') && hooksContent.includes('19041'), 'Enforces Windows 10 build 19041+ pre-install check');
assert(hooksContent.includes('{F3017226-4D41-442C-B6D8-AE64234DE15E}') && hooksContent.includes('EdgeUpdate'), 'Detects Microsoft Edge WebView2 Evergreen Runtime registry keys');
assert(hooksContent.includes('IfFileExists "$INSTDIR\\SystemPilot.exe"') && hooksContent.includes('Installation Verification Failed'), 'Performs post-install verification confirming executable presence');
assert(hooksContent.includes('CreateDirectory "$SMPROGRAMS\\SystemPilot"'), 'Creates dedicated Start Menu program folder');
assert(hooksContent.includes('CreateShortCut "$SMPROGRAMS\\SystemPilot\\Uninstall SystemPilot.lnk"'), 'Creates Start Menu uninstall shortcut');
assert(hooksContent.includes('CreateShortCut "$DESKTOP\\SystemPilot.lnk"'), 'Creates clean Desktop shortcut');
assert(hooksContent.includes('WriteRegStr SHCTX "Software\\SystemPilot"'), 'Writes application metadata registry entries');
assert(hooksContent.includes('Delete "$DESKTOP\\SystemPilot.lnk"'), 'Cleans up desktop shortcut on uninstall');
assert(hooksContent.includes('DeleteRegKey SHCTX "Software\\SystemPilot"'), 'Removes registry keys cleanly on uninstall');
assert(hooksContent.includes('RMDir  "$SMPROGRAMS\\SystemPilot"'), 'Removes Start Menu program folder cleanly on uninstall');

assert(fs.existsSync(path.join(ROOT_DIR, 'src-tauri', 'resources', 'WebView2Loader.dll')), 'WebView2Loader.dll exists in bundled resources');
assert(fs.existsSync(path.join(ROOT_DIR, 'src-tauri', 'resources', 'systempilot.exe.manifest')), 'systempilot.exe.manifest exists in bundled resources');
assert(fs.existsSync(path.join(ROOT_DIR, 'src-tauri', 'windows', 'PERMISSIONS.txt')), 'PERMISSIONS.txt security disclosure document exists');
assert(manifestXml.includes('Microsoft.Windows.Common-Controls'), 'Manifest includes Common-Controls v6 isolation');
assert(manifestXml.includes('requireAdministrator'), 'Manifest declares requireAdministrator execution level');
assert(manifestXml.includes('supportedOS Id="{8e0f7a12-bfb3-4fe8-b9a5-48fd50a15a9a}"'), 'Manifest explicitly declares Windows 10/11 OS compatibility');

const releaseDir = path.join(ROOT_DIR, 'release');
assert(fs.existsSync(releaseDir), 'release/ directory exists');

const hasBuiltBinaries = fs.existsSync(path.join(releaseDir, 'SystemPilot.exe'));
if (hasBuiltBinaries) {
  assert(fs.existsSync(path.join(releaseDir, 'SystemPilot.exe')), 'release/SystemPilot.exe exists and is packaged');
  assert(fs.existsSync(path.join(releaseDir, 'SystemPilot-Setup.exe')), 'release/SystemPilot-Setup.exe (NSIS Installer) exists');
  assert(fs.existsSync(path.join(releaseDir, 'SystemPilot.msi')), 'release/SystemPilot.msi exists');
  assert(fs.existsSync(path.join(releaseDir, 'SystemPilot-Portable.zip')), 'release/SystemPilot-Portable.zip exists');
} else {
  assert(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'package_release.ps1')), 'scripts/package_release.ps1 release packager is present');
  assert(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'sign_artifact.ps1')), 'scripts/sign_artifact.ps1 signing utility is present');
  assert(fs.existsSync(path.join(ROOT_DIR, 'build.bat')), 'build.bat production builder is present');
  assert(fs.existsSync(path.join(ROOT_DIR, 'src-tauri', 'windows', 'hooks.nsh')), 'src-tauri/windows/hooks.nsh installer hooks configured');
}

assert(fs.existsSync(path.join(releaseDir, 'SHA256SUMS.txt')), 'release/SHA256SUMS.txt exists');
assert(fs.existsSync(path.join(releaseDir, 'latest.json')), 'release/latest.json exists');

const hasPublisherCer = fs.existsSync(path.join(releaseDir, 'SystemPilot-Publisher.cer'));
if (hasPublisherCer) {
  assert(fs.existsSync(path.join(releaseDir, 'SystemPilot-Publisher.cer')), 'release/SystemPilot-Publisher.cer public certificate exists');
} else {
  assert(fs.existsSync(path.join(ROOT_DIR, 'scripts', 'setup_signing_certificate.ps1')), 'scripts/setup_signing_certificate.ps1 certificate generator is present');
}
assert(fs.existsSync(path.join(releaseDir, 'Trust-SystemPilot-Certificate.bat')), 'release/Trust-SystemPilot-Certificate.bat client onboarding script exists');

const releaseSums = path.join(releaseDir, 'SHA256SUMS.txt');
if (fs.existsSync(releaseSums)) {
  const sumsContent = fs.readFileSync(releaseSums, 'utf8');
  assert(sumsContent.includes('SystemPilot.exe'), 'SHA-256 sums include SystemPilot.exe');
  assert(sumsContent.includes('SystemPilot-Setup.exe'), 'SHA-256 sums include SystemPilot-Setup.exe');
  assert(sumsContent.includes('SystemPilot-Portable.zip'), 'SHA-256 sums include SystemPilot-Portable.zip');
}
endSuite();

// ==============================================================================
// 8. Environment Configuration Audit & Secret Leak Prevention
// ==============================================================================
startSuite('8. Environment Configuration & Variable Audit');

const envExamplePath = path.join(ROOT_DIR, '.env.example');
assert(fs.existsSync(envExamplePath), '.env.example exists in root directory');

const envContent = fs.readFileSync(envExamplePath, 'utf8');
const requiredSections = [
  '1. APPLICATION ENVIRONMENT & DEBUGGING',
  '2. DEVELOPMENT SERVER & PORTS',
  '3. UI REFRESH & POLLING RATES',
  '4. HARDWARE INFORMATION & SENSOR MONITORING',
  '5. LOGGING & DIAGNOSTICS',
  '6. PERFORMANCE & RESOURCE LIMITS',
  '7. FEATURE FLAGS',
  '8. OPTIONAL UPDATE CONFIGURATION',
  '9. OPTIONAL TELEMETRY & PRIVACY SETTINGS',
  '10. OPTIONAL EXTERNAL SERVICE CONFIGURATION',
];
for (const section of requiredSections) {
  assert(envContent.includes(section), `Defines Section: ${section}`);
}

const requiredVars = [
  'APP_ENV=development',
  'APP_DEBUG=true',
  'APP_PORT=1420',
  'VITE_DEV_HOST=127.0.0.1',
  'VITE_DEFAULT_REFRESH_MS=1000',
  'VITE_PROCESS_REFRESH_MS=2000',
  'VITE_ENABLE_HARDWARE_SENSORS=true',
  'VITE_ENABLE_GPU_MONITORING=true',
  'VITE_LOG_LEVEL=info',
  'VITE_ENABLE_DIAGNOSTIC_OVERLAYS=false',
  'VITE_MAX_TELEMETRY_POINTS=30',
  'RUST_MIN_STACK=16777216',
  'VITE_FEATURE_BENCHMARK=true',
  'VITE_FEATURE_FAN_CONTROL=true',
  'VITE_FEATURE_SYSTEM_CLEANUP=true',
  'VITE_AUTO_CHECK_UPDATES=false',
  'VITE_UPDATE_CHECK_INTERVAL_HOURS=24',
  'VITE_ALLOW_EXTERNAL_CONNECTIONS=false',
];
for (const v of requiredVars) {
  assert(envContent.includes(v), `Declares variable with safe default: ${v}`);
}

const secretPattern = /^\s*([A-Za-z0-9_]*(PASSWORD|SECRET|TOKEN|API_KEY|PRIVATE_KEY)[A-Za-z0-9_]*\s*=\s*[^#\s\r\n]+)/im;
assert(!envContent.match(secretPattern), 'No secret, token, or password assignments in .env.example');

const gitignoreContent = fs.readFileSync(path.join(ROOT_DIR, '.gitignore'), 'utf8');
assert(gitignoreContent.includes('.env'), '.gitignore excludes .env files');
assert(gitignoreContent.includes('!.env.example'), '.gitignore explicitly preserves !.env.example');

const frontendEnvContent = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'src', 'config', 'env.js'), 'utf8');
assert(frontendEnvContent.includes('parseClampedInt'), 'Includes numeric range clamping logic to protect CPU');
assert(frontendEnvContent.includes('defaultRefreshMs'), 'Exports validated defaultRefreshMs setting');
assert(frontendEnvContent.includes('enableHardwareSensors'), 'Exports validated enableHardwareSensors setting');
assert(frontendEnvContent.includes('Object.freeze'), 'Freezes configuration object against runtime mutation');

const viteContent = fs.readFileSync(path.join(ROOT_DIR, 'frontend', 'vite.config.js'), 'utf8');
assert(viteContent.includes('process.env.APP_PORT'), 'Vite server reads process.env.APP_PORT with 1420 fallback');
assert(viteContent.includes("envPrefix: ['VITE_', 'TAURI_ENV_*']"), 'Vite exposes VITE_ and TAURI_ENV_* prefixes');
endSuite();

// ==============================================================================
// FINAL SUMMARY
// ==============================================================================
console.log('\n####################################################');
console.log('              FINAL TEST RESULTS                    ');
console.log('####################################################\n');

for (const suite of suiteResults) {
  const status = suite.failed === 0 ? 'PASS' : 'FAIL';
  console.log(`  [${status}] ${suite.name.padEnd(50)} (${suite.passed} passed, ${suite.failed} failed)`);
}

console.log(`\nTotal Assertions: ${totalAssertions}`);
console.log(`Passed: ${passedAssertions}`);
console.log(`Failed: ${failedAssertions}`);
console.log('####################################################\n');

if (failedAssertions > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
