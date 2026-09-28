//! CPU Telemetry, Topology, Scheduling & Diagnostic Logic
//! Safe, zero-process Windows native implementation.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;

// ============================================================================
// DATA MODELS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCapabilities {
    pub supports_temperature: bool,
    pub supports_power: bool,
    pub supports_effective_frequency: bool,
    pub supports_per_core_frequency: bool,
    pub supports_throttling_detection: bool,
    pub supports_processor_groups: bool,
    pub supports_numa: bool,
    pub supports_hybrid_detection: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuIdentity {
    pub brand: String,
    pub vendor_id: String,
    pub architecture: String,
    pub base_frequency_mhz: Option<u64>,
    pub max_frequency_mhz: Option<u64>,
    pub current_frequency_mhz: Option<u64>,
    pub effective_frequency_mhz: Option<u64>,
    pub virtualization_enabled: Option<bool>,
    pub instruction_features: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuCacheInfo {
    pub level: u8,
    pub cache_type: String, // "Data", "Instruction", "Unified"
    pub size_bytes: u64,
    pub associativity: u8,
    pub line_size_bytes: u16,
    pub is_shared: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuGroupDetail {
    pub group_id: u16,
    pub active_processors: u8,
    pub max_processors: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuTopology {
    pub physical_cores: usize,
    pub logical_processors: usize,
    pub processor_groups: usize,
    pub numa_nodes: usize,
    pub has_hybrid_architecture: bool,
    pub performance_cores: Option<usize>,
    pub efficiency_cores: Option<usize>,
    pub caches: Vec<CpuCacheInfo>,
    pub group_details: Vec<CpuGroupDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogicalProcessorTelemetry {
    pub processor_id: usize,
    pub physical_core_id: Option<usize>,
    pub group_id: u16,
    pub usage_percent: f32,
    pub frequency_mhz: Option<u64>,
    pub effective_frequency_mhz: Option<u64>,
    pub core_type: Option<String>, // "Performance", "Efficiency", or None
    pub idle_state: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicalCoreTelemetry {
    pub core_id: usize,
    pub logical_processor_ids: Vec<usize>,
    pub average_usage_percent: f32,
    pub core_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuUtilization {
    pub current: f32,
    pub user_time_percent: Option<f32>,
    pub system_time_percent: Option<f32>,
    pub idle_time_percent: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuFrequencyTelemetry {
    pub current_mhz: u64,
    pub base_mhz: Option<u64>,
    pub max_mhz: Option<u64>,
    pub turbo_status: String, // "Boost Active", "Boost Inactive", "No reliable telemetry"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuThermalTelemetry {
    pub package_temperature_celsius: Option<f32>,
    pub core_temperatures: Vec<Option<f32>>,
    pub highest_temperature_celsius: Option<f32>,
    pub average_temperature_celsius: Option<f32>,
    pub thermal_status: String, // "Normal", "Elevated", "High", "Thermal throttling detected", "Unavailable"
    pub is_thermal_throttling: String, // "Yes", "No", "Unknown"
    pub throttling_event_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuPowerTelemetry {
    pub package_power_watts: Option<f32>,
    pub core_power_watts: Option<f32>,
    pub power_source: String, // "AC Power", "Battery", "Unknown"
    pub battery_percent: Option<u8>,
    pub power_plan_name: Option<String>,
    pub power_throttling: String, // "Yes", "No", "Unknown"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuSchedulingTelemetry {
    pub processor_queue_length: Option<u32>,
    pub queue_status: String, // "Normal", "Elevated", "High", "Unavailable"
    pub interrupt_time_percent: Option<f32>,
    pub dpc_time_percent: Option<f32>,
    pub dpc_status: String, // "Normal", "Elevated", "High", "Unavailable"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuProcessItem {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub thread_count: Option<u32>,
    pub priority: String,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuDiagnostics {
    pub pressure_detected: bool,
    pub single_core_bottleneck: bool,
    pub single_core_message: Option<String>,
    pub sustained_load_detected: bool,
    pub sustained_load_message: Option<String>,
    pub spike_detected: bool,
    pub spike_message: Option<String>,
    pub diagnostic_notices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuSnapshot {
    pub timestamp_ms: u64,
    pub capabilities: CpuCapabilities,
    pub identity: CpuIdentity,
    pub topology: CpuTopology,
    pub utilization: CpuUtilization,
    pub per_processor: Vec<LogicalProcessorTelemetry>,
    pub per_physical_core: Vec<PhysicalCoreTelemetry>,
    pub frequency: CpuFrequencyTelemetry,
    pub thermal: CpuThermalTelemetry,
    pub power: CpuPowerTelemetry,
    pub scheduling: CpuSchedulingTelemetry,
    pub top_processes: Vec<CpuProcessItem>,
    pub diagnostics: CpuDiagnostics,
}

// Legacy struct for backward compatibility with get_cpu_detailed_info
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CpuDetailedInfo {
    pub brand: String,
    pub vendor_id: String,
    pub physical_cores: usize,
    pub logical_cores: usize,
    pub base_frequency_mhz: u64,
    pub current_frequency_mhz: u64,
    pub global_usage: f32,
    pub core_usages: Vec<f32>,
    pub temperature_celsius: Option<f32>,
    pub package_power_watts: Option<f32>,
}

// ============================================================================
// STATE TRACKER FOR TIME DELTAS & DIAGNOSTICS
// ============================================================================

#[allow(dead_code)]
struct ProcessorPerfSample {
    idle_time: i64,
    kernel_time: i64,
    user_time: i64,
    dpc_time: i64,
    interrupt_time: i64,
}

#[allow(dead_code)]
struct CpuTrackerState {
    last_sample_instant: Instant,
    last_perf_samples: Vec<ProcessorPerfSample>,
    last_global_idle: i64,
    last_global_kernel: i64,
    last_global_user: i64,
    throttling_count: u32,
    previous_global_usage: f32,
    high_load_consecutive_ticks: u32,
    pdh_query_handle: Option<usize>,
    pdh_counter_handle: Option<usize>,
    pdh_initialized: bool,
}

impl Default for CpuTrackerState {
    fn default() -> Self {
        Self {
            last_sample_instant: Instant::now(),
            last_perf_samples: Vec::new(),
            last_global_idle: 0,
            last_global_kernel: 0,
            last_global_user: 0,
            throttling_count: 0,
            previous_global_usage: 0.0,
            high_load_consecutive_ticks: 0,
            pdh_query_handle: None,
            pdh_counter_handle: None,
            pdh_initialized: false,
        }
    }
}

static CPU_TRACKER: Mutex<Option<CpuTrackerState>> = Mutex::new(None);

fn with_cpu_tracker<F, R>(f: F) -> R
where
    F: FnOnce(&mut CpuTrackerState) -> R,
{
    let mut lock = CPU_TRACKER.lock().unwrap();
    if lock.is_none() {
        *lock = Some(CpuTrackerState::default());
    }
    f(lock.as_mut().unwrap())
}

// ============================================================================
// WIN32 NATIVE CALLS
// ============================================================================

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
mod win32 {
    use super::*;
    use std::ffi::c_void;
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress, LoadLibraryA};
    use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
    use windows_sys::Win32::System::Threading::IsProcessorFeaturePresent;

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    pub struct FILETIME {
        pub dwLowDateTime: u32,
        pub dwHighDateTime: u32,
    }

    type FnGetSystemTimes = unsafe extern "system" fn(
        lp_idle_time: *mut FILETIME,
        lp_kernel_time: *mut FILETIME,
        lp_user_time: *mut FILETIME,
    ) -> i32;

    // CallNtPowerInformation structure
    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    pub struct PROCESSOR_POWER_INFORMATION {
        pub Number: u32,
        pub MaxMhz: u32,
        pub CurrentMhz: u32,
        pub MhzLimit: u32,
        pub MaxIdleState: u32,
        pub CurrentIdleState: u32,
    }

    // NtQuerySystemInformation structure for class 8 (SystemProcessorPerformanceInformation)
    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    pub struct SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION {
        pub IdleTime: i64,
        pub KernelTime: i64,
        pub UserTime: i64,
        pub DpcTime: i64,
        pub InterruptTime: i64,
        pub InterruptCount: u32,
    }

    type FnCallNtPowerInformation = unsafe extern "system" fn(
        information_level: u32,
        input_buffer: *const c_void,
        input_buffer_length: u32,
        output_buffer: *mut c_void,
        output_buffer_length: u32,
    ) -> i32;

    type FnNtQuerySystemInformation = unsafe extern "system" fn(
        system_information_class: u32,
        system_information: *mut c_void,
        system_information_length: u32,
        return_length: *mut u32,
    ) -> i32;

    type FnGetLogicalProcessorInformationEx = unsafe extern "system" fn(
        relationship_type: u32,
        buffer: *mut u8,
        returned_length: *mut u32,
    ) -> i32;

    pub fn get_processor_power_info(logical_count: usize) -> Vec<PROCESSOR_POWER_INFORMATION> {
        let mut results = vec![PROCESSOR_POWER_INFORMATION::default(); logical_count];
        unsafe {
            let h_powrprof = LoadLibraryA(b"powrprof.dll\0".as_ptr());
            if h_powrprof.is_null() {
                return Vec::new();
            }
            let proc = GetProcAddress(h_powrprof, b"CallNtPowerInformation\0".as_ptr());
            if let Some(call_pwr) = proc {
                let call_pwr: FnCallNtPowerInformation = std::mem::transmute(call_pwr);
                let buf_size = (logical_count * std::mem::size_of::<PROCESSOR_POWER_INFORMATION>()) as u32;
                let status = call_pwr(
                    11, // ProcessorPowerInformation
                    std::ptr::null(),
                    0,
                    results.as_mut_ptr() as *mut c_void,
                    buf_size,
                );
                if status >= 0 {
                    return results;
                }
            }
        }
        Vec::new()
    }

    pub fn query_processor_perf_info(logical_count: usize) -> Vec<SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION> {
        let mut results = vec![SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION::default(); logical_count];
        unsafe {
            let h_ntdll = GetModuleHandleA(b"ntdll.dll\0".as_ptr());
            if h_ntdll.is_null() {
                return Vec::new();
            }
            let proc = GetProcAddress(h_ntdll, b"NtQuerySystemInformation\0".as_ptr());
            if let Some(nt_query) = proc {
                let nt_query: FnNtQuerySystemInformation = std::mem::transmute(nt_query);
                let buf_size = (logical_count * std::mem::size_of::<SYSTEM_PROCESSOR_PERFORMANCE_INFORMATION>()) as u32;
                let mut ret_len = 0u32;
                let status = nt_query(
                    8, // SystemProcessorPerformanceInformation
                    results.as_mut_ptr() as *mut c_void,
                    buf_size,
                    &mut ret_len,
                );
                if status >= 0 {
                    return results;
                }
            }
        }
        Vec::new()
    }

    pub fn query_system_times() -> Option<(i64, i64, i64)> {
        unsafe {
            let h_kernel32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
            if h_kernel32.is_null() {
                return None;
            }
            let proc = GetProcAddress(h_kernel32, b"GetSystemTimes\0".as_ptr());
            if let Some(get_times) = proc {
                let get_times: FnGetSystemTimes = std::mem::transmute(get_times);
                let mut idle = FILETIME::default();
                let mut kernel = FILETIME::default();
                let mut user = FILETIME::default();
                if get_times(&mut idle, &mut kernel, &mut user) != 0 {
                    let idle_i64 = ((idle.dwHighDateTime as i64) << 32) | (idle.dwLowDateTime as i64);
                    let kernel_i64 = ((kernel.dwHighDateTime as i64) << 32) | (kernel.dwLowDateTime as i64);
                    let user_i64 = ((user.dwHighDateTime as i64) << 32) | (user.dwLowDateTime as i64);
                    return Some((idle_i64, kernel_i64, user_i64));
                }
            }
            None
        }
    }

    pub fn query_power_status() -> (String, Option<u8>) {
        unsafe {
            let mut status: SYSTEM_POWER_STATUS = std::mem::zeroed();
            if GetSystemPowerStatus(&mut status) != 0 {
                let source = match status.ACLineStatus {
                    1 => "AC Power".to_string(),
                    0 => "Battery".to_string(),
                    _ => "Unknown".to_string(),
                };
                let pct = if status.BatteryLifePercent <= 100 {
                    Some(status.BatteryLifePercent)
                } else {
                    None
                };
                (source, pct)
            } else {
                ("Unknown".to_string(), None)
            }
        }
    }

    pub fn check_virtualization() -> Option<bool> {
        unsafe {
            // PF_VIRT_FIRMWARE_ENABLED is 21
            let enabled = IsProcessorFeaturePresent(21);
            Some(enabled != 0)
        }
    }

    pub fn get_cpu_features() -> Vec<String> {
        let mut features = Vec::new();
        unsafe {
            // Check common processor features without crashing
            if IsProcessorFeaturePresent(17) != 0 { features.push("AVX".into()); }
            if IsProcessorFeaturePresent(40) != 0 { features.push("AVX2".into()); }
            if IsProcessorFeaturePresent(10) != 0 { features.push("SSE3".into()); }
            if IsProcessorFeaturePresent(13) != 0 { features.push("XSAVE".into()); }
            if IsProcessorFeaturePresent(14) != 0 { features.push("CMPXCHG16B".into()); }
            if IsProcessorFeaturePresent(25) != 0 { features.push("AES".into()); }
        }
        features
    }

    pub fn query_topology_and_caches() -> (usize, usize, usize, usize, bool, Option<usize>, Option<usize>, Vec<CpuCacheInfo>, Vec<CpuGroupDetail>, Vec<Option<u8>>) {
        let mut physical_cores = 0;
        let mut logical_processors = 0;
        let mut numa_nodes = 0;
        let mut processor_groups = 1;
        let mut caches = Vec::new();
        let mut group_details = Vec::new();
        let mut core_efficiency_classes = Vec::new();

        unsafe {
            let h_kernel32 = GetModuleHandleA(b"kernel32.dll\0".as_ptr());
            if h_kernel32.is_null() {
                return (1, 1, 1, 1, false, None, None, caches, group_details, core_efficiency_classes);
            }
            let proc = GetProcAddress(h_kernel32, b"GetLogicalProcessorInformationEx\0".as_ptr());
            if let Some(get_info) = proc {
                let get_info: FnGetLogicalProcessorInformationEx = std::mem::transmute(get_info);
                let mut buffer_size = 0u32;
                get_info(0xffff, std::ptr::null_mut(), &mut buffer_size); // 0xffff = RelationAll
                if buffer_size == 0 {
                    return (1, 1, 1, 1, false, None, None, caches, group_details, core_efficiency_classes);
                }

                let mut buffer = vec![0u8; buffer_size as usize];
                if get_info(0xffff, buffer.as_mut_ptr(), &mut buffer_size) != 0 {
                    let mut offset = 0usize;
                    while offset + 8 <= buffer.len() {
                        let relationship = *(buffer.as_ptr().add(offset) as *const u32);
                        let size = *(buffer.as_ptr().add(offset + 4) as *const u32) as usize;
                        if size < 8 || offset + size > buffer.len() {
                            break;
                        }

                        let payload_ptr = buffer.as_ptr().add(offset + 8);

                        match relationship {
                            0 => {
                                // RelationProcessorCore
                                physical_cores += 1;
                                // In PROCESSOR_RELATIONSHIP: Flags is byte 0, EfficiencyClass is byte 1
                                if size >= 10 {
                                    let efficiency_class = *payload_ptr.add(1);
                                    core_efficiency_classes.push(Some(efficiency_class));
                                }
                            }
                            1 => {
                                // RelationNumaNode
                                numa_nodes += 1;
                            }
                            2 => {
                                // RelationCache
                                if size >= 24 {
                                    let level = *payload_ptr;
                                    let associativity = *payload_ptr.add(1);
                                    let line_size = *(payload_ptr.add(2) as *const u16);
                                    let cache_size = *(payload_ptr.add(4) as *const u32) as u64;
                                    let cache_type_raw = *(payload_ptr.add(8) as *const u32);
                                    let cache_type = match cache_type_raw {
                                        1 => "Instruction".to_string(),
                                        2 => "Data".to_string(),
                                        _ => "Unified".to_string(),
                                    };

                                    // Deduplicate identical cache reporting if duplicate entries returned
                                    if !caches.iter().any(|c: &CpuCacheInfo| c.level == level && c.cache_type == cache_type && c.size_bytes == cache_size) {
                                        caches.push(CpuCacheInfo {
                                            level,
                                            cache_type,
                                            size_bytes: cache_size,
                                            associativity,
                                            line_size_bytes: line_size,
                                            is_shared: associativity > 1,
                                        });
                                    }
                                }
                            }
                            4 => {
                                // RelationProcessorGroup
                                if size >= 32 {
                                    let active_groups = *(payload_ptr.add(2) as *const u16) as usize;
                                    processor_groups = active_groups.max(1);
                                    // Parse group details
                                    let group_info_ptr = payload_ptr.add(24);
                                    for g in 0..processor_groups {
                                        let entry_ptr = group_info_ptr.add(g * 48); // sizeof(PROCESSOR_GROUP_INFO) = 48 bytes
                                        if (entry_ptr as usize + 2) <= (buffer.as_ptr() as usize + buffer.len()) {
                                            let max_p = *entry_ptr;
                                            let act_p = *entry_ptr.add(1);
                                            logical_processors += act_p as usize;
                                            group_details.push(CpuGroupDetail {
                                                group_id: g as u16,
                                                active_processors: act_p,
                                                max_processors: max_p,
                                            });
                                        }
                                    }
                                }
                            }
                            _ => {}
                        }

                        offset += size;
                    }
                }
            }
        }

        // Determine if hybrid architecture exists
        let mut has_hybrid = false;
        let mut performance_cores = None;
        let mut efficiency_cores = None;

        if !core_efficiency_classes.is_empty() {
            let classes: Vec<u8> = core_efficiency_classes.iter().filter_map(|c| *c).collect();
            let min_class = classes.iter().min().copied().unwrap_or(0);
            let max_class = classes.iter().max().copied().unwrap_or(0);

            if min_class != max_class {
                has_hybrid = true;
                let e_count = classes.iter().filter(|&&c| c == min_class).count();
                let p_count = classes.iter().filter(|&&c| c == max_class).count();
                efficiency_cores = Some(e_count);
                performance_cores = Some(p_count);
            }
        }

        (
            physical_cores.max(1),
            logical_processors,
            processor_groups.max(1),
            numa_nodes.max(1),
            has_hybrid,
            performance_cores,
            efficiency_cores,
            caches,
            group_details,
            core_efficiency_classes,
        )
    }

    // Windows PDH for Processor Queue Length
    #[repr(C)]
    struct PDH_FMT_COUNTERVALUE {
        pub CStatus: u32,
        pub union_val: i64,
    }

    type FnPdhOpenQueryW = unsafe extern "system" fn(sz_data_source: *const u16, dw_user_data: usize, ph_query: *mut usize) -> u32;
    type FnPdhAddEnglishCounterW = unsafe extern "system" fn(h_query: usize, sz_full_counter_path: *const u16, dw_user_data: usize, ph_counter: *mut usize) -> u32;
    type FnPdhCollectQueryData = unsafe extern "system" fn(h_query: usize) -> u32;
    type FnPdhGetFormattedCounterValue = unsafe extern "system" fn(h_counter: usize, dw_format: u32, lpdw_type: *mut u32, p_value: *mut PDH_FMT_COUNTERVALUE) -> u32;

    pub fn query_processor_queue_length(tracker: &mut CpuTrackerState) -> Option<u32> {
        unsafe {
            let h_pdh = LoadLibraryA(b"pdh.dll\0".as_ptr());
            if h_pdh.is_null() {
                return None;
            }

            let fn_open: Option<FnPdhOpenQueryW> = GetProcAddress(h_pdh, b"PdhOpenQueryW\0".as_ptr()).map(|p| std::mem::transmute(p));
            let fn_add: Option<FnPdhAddEnglishCounterW> = GetProcAddress(h_pdh, b"PdhAddEnglishCounterW\0".as_ptr()).map(|p| std::mem::transmute(p));
            let fn_collect: Option<FnPdhCollectQueryData> = GetProcAddress(h_pdh, b"PdhCollectQueryData\0".as_ptr()).map(|p| std::mem::transmute(p));
            let fn_get_val: Option<FnPdhGetFormattedCounterValue> = GetProcAddress(h_pdh, b"PdhGetFormattedCounterValue\0".as_ptr()).map(|p| std::mem::transmute(p));

            if let (Some(open_q), Some(add_c), Some(collect_q), Some(get_val)) = (fn_open, fn_add, fn_collect, fn_get_val) {
                if !tracker.pdh_initialized {
                    let mut q_handle = 0usize;
                    if open_q(std::ptr::null(), 0, &mut q_handle) == 0 {
                        let path: Vec<u16> = "\\System\\Processor Queue Length\0".encode_utf16().collect();
                        let mut c_handle = 0usize;
                        if add_c(q_handle, path.as_ptr(), 0, &mut c_handle) == 0 {
                            tracker.pdh_query_handle = Some(q_handle);
                            tracker.pdh_counter_handle = Some(c_handle);
                            tracker.pdh_initialized = true;
                            // Initial priming read
                            let _ = collect_q(q_handle);
                        }
                    }
                }

                if let (Some(q), Some(c)) = (tracker.pdh_query_handle, tracker.pdh_counter_handle) {
                    if collect_q(q) == 0 {
                        let mut val = PDH_FMT_COUNTERVALUE { CStatus: 0, union_val: 0 };
                        let mut counter_type = 0u32;
                        // PDH_FMT_LONG = 0x00000100
                        if get_val(c, 0x00000100, &mut counter_type, &mut val) == 0 && val.CStatus == 0 {
                            return Some(val.union_val as u32);
                        }
                    }
                }
            }
        }
        None
    }
}

// ============================================================================
// MAIN CPU TELEMETRY COLLECTOR
// ============================================================================

pub fn collect_cpu_snapshot(
    sys: &mut sysinfo::System,
    _state: Option<&crate::commands::system::SystemState>,
) -> CpuSnapshot {
    sys.refresh_cpu_all();

    let cpus = sys.cpus();
    let logical_count = cpus.len().max(1);

    // 1. CPU Identity & Architecture
    let brand = cpus.first().map(|c| c.brand().trim().to_string()).unwrap_or_else(|| "Unknown CPU".into());
    let vendor_id = cpus.first().map(|c| c.vendor_id().trim().to_string()).unwrap_or_else(|| "x86_64".into());
    let architecture = std::env::consts::ARCH.to_string();

    // Base frequency from registry CentralProcessor\0 if available, else sysinfo
    #[cfg(target_os = "windows")]
    let base_mhz_reg = {
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
        crate::windows::registry::get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
            "~MHz",
        ).map(|m| m as u64)
    };
    #[cfg(not(target_os = "windows"))]
    let base_mhz_reg: Option<u64> = None;

    let sysinfo_freq = cpus.first().map(|c| c.frequency()).unwrap_or(0);
    let base_frequency_mhz = base_mhz_reg.or(if sysinfo_freq > 0 { Some(sysinfo_freq) } else { None });

    // 2. Win32 Native Topology & Caches & Hybrid classes
    #[cfg(target_os = "windows")]
    let (
        mut physical_cores,
        logical_from_topology,
        processor_groups,
        numa_nodes,
        has_hybrid,
        p_cores,
        e_cores,
        caches,
        group_details,
        core_efficiency_classes,
    ) = win32::query_topology_and_caches();

    #[cfg(not(target_os = "windows"))]
    let (
        mut physical_cores,
        logical_from_topology,
        processor_groups,
        numa_nodes,
        has_hybrid,
        p_cores,
        e_cores,
        caches,
        group_details,
        core_efficiency_classes,
    ) = (
        sys.physical_core_count().unwrap_or(logical_count),
        logical_count,
        1,
        1,
        false,
        None,
        None,
        Vec::<CpuCacheInfo>::new(),
        Vec::<CpuGroupDetail>::new(),
        Vec::<Option<u8>>::new(),
    );

    if physical_cores == 0 {
        physical_cores = sys.physical_core_count().unwrap_or(logical_count);
    }
    let actual_logical = if logical_from_topology > 0 { logical_from_topology } else { logical_count };

    // 3. Power management & Processor power info
    #[cfg(target_os = "windows")]
    let power_infos = win32::get_processor_power_info(actual_logical);
    #[cfg(not(target_os = "windows"))]
    let power_infos = Vec::<()>::new();

    #[cfg(target_os = "windows")]
    let (power_source, battery_pct) = win32::query_power_status();
    #[cfg(not(target_os = "windows"))]
    let (power_source, battery_pct) = ("Unknown".to_string(), None);

    #[cfg(target_os = "windows")]
    let virt_enabled = win32::check_virtualization();
    #[cfg(not(target_os = "windows"))]
    let virt_enabled = None;

    #[cfg(target_os = "windows")]
    let instruction_features = win32::get_cpu_features();
    #[cfg(not(target_os = "windows"))]
    let instruction_features = Vec::new();

    // Frequency analysis
    let mut current_freq_mhz = sysinfo_freq;
    let mut max_freq_mhz = None;
    let mut is_throttling = "Unknown".to_string();
    let mut turbo_status = "No reliable telemetry".to_string();

    #[cfg(target_os = "windows")]
    if let Some(first_pwr) = power_infos.first() {
        if first_pwr.CurrentMhz > 0 {
            current_freq_mhz = first_pwr.CurrentMhz as u64;
        }
        if first_pwr.MaxMhz > 0 {
            max_freq_mhz = Some(first_pwr.MaxMhz as u64);
            if first_pwr.CurrentMhz > first_pwr.MaxMhz {
                turbo_status = "Boost Active".into();
            } else {
                turbo_status = "Boost Inactive".into();
            }

            if first_pwr.MhzLimit < first_pwr.MaxMhz && first_pwr.MhzLimit > 0 {
                is_throttling = "Yes".into();
            } else {
                is_throttling = "No".into();
            }
        }
    }

    // 4. Time deltas, DPC & Interrupts & Scheduling
    let (user_pct, kernel_pct, idle_pct, dpc_pct, interrupt_pct, queue_len, throttling_count) = with_cpu_tracker(|tracker| {
        #[cfg(target_os = "windows")]
        let perf_samples = win32::query_processor_perf_info(actual_logical);
        #[cfg(not(target_os = "windows"))]
        let perf_samples = Vec::<()>::new();

        let mut dpc_calc = None;
        let mut int_calc = None;

        #[cfg(target_os = "windows")]
        if !perf_samples.is_empty() && !tracker.last_perf_samples.is_empty() && perf_samples.len() == tracker.last_perf_samples.len() {
            let mut total_dpc_delta: i64 = 0;
            let mut total_int_delta: i64 = 0;
            let mut total_time_delta: i64 = 0;

            for (curr, prev) in perf_samples.iter().zip(tracker.last_perf_samples.iter()) {
                let d_k = curr.KernelTime.saturating_sub(prev.kernel_time);
                let d_u = curr.UserTime.saturating_sub(prev.user_time);
                let d_d = curr.DpcTime.saturating_sub(prev.dpc_time);
                let d_i = curr.InterruptTime.saturating_sub(prev.interrupt_time);

                let d_tot = d_k + d_u;
                if d_tot > 0 {
                    total_dpc_delta += d_d;
                    total_int_delta += d_i;
                    total_time_delta += d_tot;
                }
            }

            if total_time_delta > 0 {
                dpc_calc = Some(((total_dpc_delta as f64 / total_time_delta as f64) * 100.0).clamp(0.0, 100.0) as f32);
                int_calc = Some(((total_int_delta as f64 / total_time_delta as f64) * 100.0).clamp(0.0, 100.0) as f32);
            }
        }

        #[cfg(target_os = "windows")]
        {
            tracker.last_perf_samples = perf_samples.iter().map(|p| ProcessorPerfSample {
                idle_time: p.IdleTime,
                kernel_time: p.KernelTime,
                user_time: p.UserTime,
                dpc_time: p.DpcTime,
                interrupt_time: p.InterruptTime,
            }).collect();
        }

        // Global User / Kernel / Idle times
        #[cfg(target_os = "windows")]
        let times_res = win32::query_system_times();
        #[cfg(not(target_os = "windows"))]
        let times_res: Option<(i64, i64, i64)> = None;

        let (mut u_pct, mut k_pct, mut i_pct) = (None, None, None);
        if let Some((idle, kernel, user)) = times_res {
            if tracker.last_global_kernel > 0 {
                let d_idle = idle.saturating_sub(tracker.last_global_idle);
                let d_kernel = kernel.saturating_sub(tracker.last_global_kernel);
                let d_user = user.saturating_sub(tracker.last_global_user);
                let d_total = d_kernel + d_user;

                if d_total > 0 {
                    let calc_idle = (d_idle as f64 / d_total as f64 * 100.0).clamp(0.0, 100.0) as f32;
                    let calc_user = (d_user as f64 / d_total as f64 * 100.0).clamp(0.0, 100.0) as f32;
                    let calc_sys = ((d_kernel.saturating_sub(d_idle)) as f64 / d_total as f64 * 100.0).clamp(0.0, 100.0) as f32;

                    u_pct = Some(calc_user);
                    k_pct = Some(calc_sys);
                    i_pct = Some(calc_idle);
                }
            }
            tracker.last_global_idle = idle;
            tracker.last_global_kernel = kernel;
            tracker.last_global_user = user;
        }

        #[cfg(target_os = "windows")]
        let q_len = win32::query_processor_queue_length(tracker);
        #[cfg(not(target_os = "windows"))]
        let q_len = None;

        if is_throttling == "Yes" {
            tracker.throttling_count = tracker.throttling_count.saturating_add(1);
        }

        (u_pct, k_pct, i_pct, dpc_calc, int_calc, q_len, tracker.throttling_count)
    });

    // 5. Per-Processor & Per-Physical-Core telemetry
    let mut per_processor = Vec::with_capacity(actual_logical);
    let threads_per_physical = (actual_logical / physical_cores.max(1)).max(1);

    for (idx, cpu) in cpus.iter().enumerate() {
        let usage = cpu.cpu_usage();
        #[cfg(target_os = "windows")]
        let pwr_entry = power_infos.get(idx);
        #[cfg(not(target_os = "windows"))]
        let pwr_entry: Option<&()> = None;

        #[cfg(target_os = "windows")]
        let freq = pwr_entry.map(|p| p.CurrentMhz as u64).filter(|&f| f > 0).unwrap_or(cpu.frequency());
        #[cfg(not(target_os = "windows"))]
        let freq = cpu.frequency();

        let physical_id = idx / threads_per_physical;

        let core_type = if has_hybrid {
            if let Some(Some(eff_class)) = core_efficiency_classes.get(physical_id) {
                if *eff_class > 0 {
                    Some("Performance".into())
                } else {
                    Some("Efficiency".into())
                }
            } else {
                None
            }
        } else {
            None
        };

        #[cfg(target_os = "windows")]
        let idle_state = pwr_entry.map(|p| p.CurrentIdleState);
        #[cfg(not(target_os = "windows"))]
        let idle_state = None;

        per_processor.push(LogicalProcessorTelemetry {
            processor_id: idx,
            physical_core_id: Some(physical_id),
            group_id: 0,
            usage_percent: usage,
            frequency_mhz: if freq > 0 { Some(freq) } else { None },
            effective_frequency_mhz: None, // No fake data
            core_type,
            idle_state,
        });
    }

    // Per-Physical-Core aggregation
    let mut per_physical_core = Vec::with_capacity(physical_cores);
    for core_idx in 0..physical_cores {
        let matching_logical: Vec<usize> = per_processor
            .iter()
            .filter(|p| p.physical_core_id == Some(core_idx))
            .map(|p| p.processor_id)
            .collect();

        let avg_usage = if !matching_logical.is_empty() {
            let sum: f32 = matching_logical.iter().map(|&idx| per_processor[idx].usage_percent).sum();
            sum / matching_logical.len() as f32
        } else {
            0.0
        };

        let core_type = matching_logical
            .first()
            .and_then(|&first_id| per_processor.get(first_id))
            .and_then(|p| p.core_type.clone());

        per_physical_core.push(PhysicalCoreTelemetry {
            core_id: core_idx,
            logical_processor_ids: matching_logical,
            average_usage_percent: avg_usage,
            core_type,
        });
    }

    // 6. Top processes for CPU monitoring
    // We only take top 10 processes sorted by CPU usage
    let mut top_processes: Vec<CpuProcessItem> = sys
        .processes()
        .iter()
        .map(|(pid, p)| {
            let name = p.name().to_string_lossy().to_string();
            let is_critical = ["csrss.exe", "lsass.exe", "smss.exe", "services.exe", "wininit.exe", "system"]
                .iter()
                .any(|&c| c.eq_ignore_ascii_case(&name));

            CpuProcessItem {
                pid: pid.as_u32(),
                name,
                cpu_usage: p.cpu_usage(),
                memory_bytes: p.memory(),
                thread_count: None, // Will show unavailable if not exposed
                priority: "Normal".into(),
                is_critical,
            }
        })
        .collect();

    top_processes.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
    top_processes.truncate(10);

    // 7. Diagnostics & Bottleneck Detection
    let global_usage = sys.global_cpu_usage();

    let (is_spike, spike_msg, is_sustained, sustained_msg) = with_cpu_tracker(|tracker| {
        let spike = (global_usage - tracker.previous_global_usage) >= 30.0 || (global_usage >= 85.0 && tracker.previous_global_usage < 50.0);
        let spike_msg = if spike {
            let top_proc = top_processes.first().map(|p| format!("{} ({:.1}%)", p.name, p.cpu_usage)).unwrap_or_default();
            Some(format!("Sudden CPU utilization surge detected ({:.1}%). Top contributor: {}.", global_usage, top_proc))
        } else {
            None
        };

        if global_usage >= 80.0 {
            tracker.high_load_consecutive_ticks = tracker.high_load_consecutive_ticks.saturating_add(1);
        } else {
            tracker.high_load_consecutive_ticks = 0;
        }

        let sustained = tracker.high_load_consecutive_ticks >= 5; // ~10 seconds at 2s interval
        let sustained_msg = if sustained {
            Some(format!("Sustained elevated CPU activity detected across consecutive cycles ({:.1}% global load).", global_usage))
        } else {
            None
        };

        tracker.previous_global_usage = global_usage;

        (spike, spike_msg, sustained, sustained_msg)
    });

    // Single core saturation check
    let single_core_saturated = global_usage < 55.0 && per_processor.iter().any(|p| p.usage_percent >= 90.0);
    let single_core_msg = if single_core_saturated {
        let saturated_core = per_processor.iter().find(|p| p.usage_percent >= 90.0).map(|p| p.processor_id).unwrap_or(0);
        Some(format!("Single-core concentration: CPU #{saturated_core} is saturated while overall workload is moderate ({global_usage:.0}%)."))
    } else {
        None
    };

    let mut notices = Vec::new();
    if is_throttling == "Yes" {
        notices.push("Processor frequency is constrained by active power or thermal policy.".into());
    }
    if let Some(dpc) = dpc_pct {
        if dpc > 10.0 {
            notices.push(format!("Elevated DPC time ({dpc:.1}%) detected; potential driver activity."));
        }
    }
    if let Some(q) = queue_len {
        if q > (actual_logical as u32 * 2) {
            notices.push(format!("Elevated processor queue length ({q}); system threads waiting for CPU time."));
        }
    }

    let queue_status = match queue_len {
        Some(q) if q > (actual_logical as u32 * 2) => "Elevated".into(),
        Some(_) => "Normal".into(),
        None => "Unavailable".into(),
    };

    let dpc_status = match dpc_pct {
        Some(d) if d > 15.0 => "High".into(),
        Some(d) if d > 8.0 => "Elevated".into(),
        Some(_) => "Normal".into(),
        None => "Unavailable".into(),
    };

    let pressure_detected = global_usage > 85.0 || single_core_saturated || is_throttling == "Yes" || dpc_pct.map_or(false, |d| d > 12.0);

    // Thermal telemetry: on standard Windows machines without kernel driver, package temp is not exposed safely via user mode.
    // RULE #2: NEVER FABRICATE TEMPERATURE OR POWER!
    let thermal_telemetry = CpuThermalTelemetry {
        package_temperature_celsius: None,
        core_temperatures: Vec::new(),
        highest_temperature_celsius: None,
        average_temperature_celsius: None,
        thermal_status: if is_throttling == "Yes" { "Thermal throttling detected".into() } else { "Unavailable".into() },
        is_thermal_throttling: is_throttling.clone(),
        throttling_event_count: throttling_count,
    };

    let power_telemetry = CpuPowerTelemetry {
        package_power_watts: None, // Explicitly None per Master Prompt Rule #2
        core_power_watts: None,
        power_source,
        battery_percent: battery_pct,
        power_plan_name: None,
        power_throttling: is_throttling,
    };

    let capabilities = CpuCapabilities {
        supports_temperature: false, // Explicitly reported so UI clearly marks as "Telemetry unavailable"
        supports_power: false,
        supports_effective_frequency: false,
        supports_per_core_frequency: true,
        supports_throttling_detection: true,
        supports_processor_groups: processor_groups > 1,
        supports_numa: numa_nodes > 1,
        supports_hybrid_detection: has_hybrid,
    };

    CpuSnapshot {
        timestamp_ms: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
        capabilities,
        identity: CpuIdentity {
            brand,
            vendor_id,
            architecture,
            base_frequency_mhz,
            max_frequency_mhz: max_freq_mhz,
            current_frequency_mhz: if current_freq_mhz > 0 { Some(current_freq_mhz) } else { None },
            effective_frequency_mhz: None,
            virtualization_enabled: virt_enabled,
            instruction_features,
        },
        topology: CpuTopology {
            physical_cores,
            logical_processors: actual_logical,
            processor_groups,
            numa_nodes,
            has_hybrid_architecture: has_hybrid,
            performance_cores: p_cores,
            efficiency_cores: e_cores,
            caches,
            group_details,
        },
        utilization: CpuUtilization {
            current: global_usage,
            user_time_percent: user_pct,
            system_time_percent: kernel_pct,
            idle_time_percent: idle_pct,
        },
        per_processor,
        per_physical_core,
        frequency: CpuFrequencyTelemetry {
            current_mhz: current_freq_mhz,
            base_mhz: base_frequency_mhz,
            max_mhz: max_freq_mhz,
            turbo_status,
        },
        thermal: thermal_telemetry,
        power: power_telemetry,
        scheduling: CpuSchedulingTelemetry {
            processor_queue_length: queue_len,
            queue_status,
            interrupt_time_percent: interrupt_pct,
            dpc_time_percent: dpc_pct,
            dpc_status,
        },
        top_processes,
        diagnostics: CpuDiagnostics {
            pressure_detected,
            single_core_bottleneck: single_core_saturated,
            single_core_message: single_core_msg,
            sustained_load_detected: is_sustained,
            sustained_load_message: sustained_msg,
            spike_detected: is_spike,
            spike_message: spike_msg,
            diagnostic_notices: notices,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sysinfo::{CpuRefreshKind, RefreshKind, System};

    #[test]
    fn test_cpu_snapshot_generation() {
        let mut sys = System::new_with_specifics(
            RefreshKind::new().with_cpu(CpuRefreshKind::everything()),
        );
        let snapshot = collect_cpu_snapshot(&mut sys, None);

        assert!(!snapshot.identity.brand.is_empty(), "Brand must not be empty");
        assert!(snapshot.topology.physical_cores > 0, "Must have at least 1 physical core");
        assert!(snapshot.topology.logical_processors > 0, "Must have at least 1 logical processor");
        assert!((0.0..=100.0).contains(&snapshot.utilization.current), "Usage must be between 0 and 100");

        // Validate Rule #2 (No fake temperature or power)
        // If temperature is unsupported, package_temperature_celsius must be None!
        if !snapshot.capabilities.supports_temperature {
            assert!(snapshot.thermal.package_temperature_celsius.is_none());
        }
        if !snapshot.capabilities.supports_power {
            assert!(snapshot.power.package_power_watts.is_none());
        }
    }

    #[test]
    fn test_bottleneck_detection_logic() {
        // Test single core bottleneck condition
        let per_proc = vec![
            LogicalProcessorTelemetry {
                processor_id: 0,
                physical_core_id: Some(0),
                group_id: 0,
                usage_percent: 98.0,
                frequency_mhz: Some(3200),
                effective_frequency_mhz: None,
                core_type: None,
                idle_state: None,
            },
            LogicalProcessorTelemetry {
                processor_id: 1,
                physical_core_id: Some(1),
                group_id: 0,
                usage_percent: 5.0,
                frequency_mhz: Some(3200),
                effective_frequency_mhz: None,
                core_type: None,
                idle_state: None,
            },
        ];

        let global_usage = 25.0f32;
        let is_bottleneck = global_usage < 55.0 && per_proc.iter().any(|p| p.usage_percent >= 90.0);
        assert!(is_bottleneck, "Expected single-core bottleneck detection");
    }
}
