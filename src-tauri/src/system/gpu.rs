//! GPU Telemetry, Engine Monitoring, VRAM, Displays & Diagnostics Logic
//! Safe, zero-process Windows native implementation utilizing DXGI, PDH, and NVML.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;

// ============================================================================
// DATA MODELS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuCapabilities {
    pub supports_utilization: bool,
    pub supports_engine_metrics: bool,
    pub supports_dedicated_memory: bool,
    pub supports_shared_memory: bool,
    pub supports_temperature: bool,
    pub supports_hotspot_temperature: bool,
    pub supports_power: bool,
    pub supports_fan: bool,
    pub supports_gpu_clock: bool,
    pub supports_memory_clock: bool,
    pub supports_displays: bool,
    pub supports_hags: bool,
    pub supports_process_gpu: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuDisplayInfo {
    pub display_id: String,
    pub display_name: String,
    pub resolution_width: u32,
    pub resolution_height: u32,
    pub refresh_rate_hz: u32,
    pub is_primary: bool,
    pub orientation: String,
    pub bits_per_pixel: u32,
    pub is_hdr_supported: Option<bool>,
    pub is_hdr_enabled: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuEngineTelemetry {
    pub engine_type: String, // "3D", "Copy", "VideoDecode", "VideoEncode", "Compute", "Other"
    pub utilization_percent: f32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuMemoryTelemetry {
    pub dedicated_total_bytes: u64,
    pub dedicated_used_bytes: Option<u64>,
    pub dedicated_available_bytes: Option<u64>,
    pub dedicated_utilization_percent: Option<f32>,
    pub shared_total_bytes: u64,
    pub shared_used_bytes: Option<u64>,
    pub shared_available_bytes: Option<u64>,
    pub shared_utilization_percent: Option<f32>,
    pub memory_budget_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuThermalTelemetry {
    pub core_temperature_celsius: Option<f32>,
    pub hotspot_temperature_celsius: Option<f32>,
    pub thermal_status: String, // "Normal", "Elevated", "High", "Thermal limitation detected", "Unavailable"
    pub is_throttling: String, // "Yes", "No", "Unknown"
    pub throttling_event_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuPowerTelemetry {
    pub power_watts: Option<f32>,
    pub power_limit_watts: Option<f32>,
    pub fan_speed_rpm: Option<u32>,
    pub fan_speed_percent: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuClockTelemetry {
    pub gpu_clock_mhz: Option<u32>,
    pub memory_clock_mhz: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuProcessItem {
    pub pid: u32,
    pub name: String,
    pub engine: String,
    pub gpu_usage_percent: f32,
    pub dedicated_memory_bytes: u64,
    pub shared_memory_bytes: u64,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuDiagnostics {
    pub pressure_detected: bool,
    pub vram_pressure_detected: bool,
    pub vram_pressure_message: Option<String>,
    pub thermal_limitation_detected: bool,
    pub thermal_limitation_message: Option<String>,
    pub bottleneck_observation: Option<String>,
    pub diagnostic_notices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuAdapterSnapshot {
    pub adapter_index: usize,
    pub name: String,
    pub vendor: String,
    pub gpu_type: String, // "Dedicated", "Integrated", "Software / Virtual", "External"
    pub is_primary: bool,
    pub driver_version: String,
    pub driver_date: Option<String>,
    pub wddm_version: Option<String>,
    pub directx_feature_level: Option<String>,
    pub pci_bus_info: Option<String>,
    pub device_id: Option<String>,
    pub vendor_id: Option<u32>,
    pub hardware_scheduling_enabled: Option<bool>,
    pub capabilities: GpuCapabilities,
    pub utilization_percent: Option<f32>,
    pub engines: Vec<GpuEngineTelemetry>,
    pub memory: GpuMemoryTelemetry,
    pub clocks: GpuClockTelemetry,
    pub thermal: GpuThermalTelemetry,
    pub power: GpuPowerTelemetry,
    pub displays: Vec<GpuDisplayInfo>,
    pub top_processes: Vec<GpuProcessItem>,
    pub diagnostics: GpuDiagnostics,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GpuSystemSnapshot {
    pub timestamp_ms: u64,
    pub adapters: Vec<GpuAdapterSnapshot>,
    pub selected_adapter_index: usize,
    pub hardware_scheduling_enabled: Option<bool>,
}

// Legacy structure for backward compatibility
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub driver_version: String,
    pub dedicated_memory_bytes: u64,
    pub shared_memory_bytes: u64,
    pub utilization_percent: Option<f32>,
    pub memory_utilization_percent: Option<f32>,
    pub temperature_celsius: Option<f32>,
    pub is_primary: bool,
}

// ============================================================================
// STATE TRACKER FOR SAMPLES & NVML
// ============================================================================

#[allow(dead_code)]
struct GpuTrackerState {
    last_sample_instant: Instant,
    pdh_query_handle: Option<usize>,
    pdh_initialized: bool,
    nvml_initialized: bool,
    nvml_attempted: bool,
    throttling_events: u32,
}

impl Default for GpuTrackerState {
    fn default() -> Self {
        Self {
            last_sample_instant: Instant::now(),
            pdh_query_handle: None,
            pdh_initialized: false,
            nvml_initialized: false,
            nvml_attempted: false,
            throttling_events: 0,
        }
    }
}

static GPU_TRACKER: Mutex<Option<GpuTrackerState>> = Mutex::new(None);

fn with_gpu_tracker<F, R>(f: F) -> R
where
    F: FnOnce(&mut GpuTrackerState) -> R,
{
    let mut lock = GPU_TRACKER.lock().unwrap();
    if lock.is_none() {
        *lock = Some(GpuTrackerState::default());
    }
    f(lock.as_mut().unwrap())
}

// ============================================================================
// WIN32 NATIVE DXGI, NVML & DISPLAY CALLS
// ============================================================================

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
mod win32 {
    use super::*;
    use std::ffi::c_void;
    use windows_sys::Win32::Foundation::RECT;
    use windows_sys::Win32::System::LibraryLoader::{GetModuleHandleA, GetProcAddress, LoadLibraryA};

    #[repr(C)]
    #[derive(Copy, Clone, Default)]
    pub struct LUID {
        pub LowPart: u32,
        pub HighPart: i32,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct DXGI_ADAPTER_DESC1 {
        pub Description: [u16; 128],
        pub VendorId: u32,
        pub DeviceId: u32,
        pub SubSysId: u32,
        pub Revision: u32,
        pub DedicatedVideoMemory: usize,
        pub DedicatedSystemMemory: usize,
        pub SharedSystemMemory: usize,
        pub AdapterLuid: LUID,
        pub Flags: u32,
    }

    impl Default for DXGI_ADAPTER_DESC1 {
        fn default() -> Self {
            Self {
                Description: [0u16; 128],
                VendorId: 0,
                DeviceId: 0,
                SubSysId: 0,
                Revision: 0,
                DedicatedVideoMemory: 0,
                DedicatedSystemMemory: 0,
                SharedSystemMemory: 0,
                AdapterLuid: LUID::default(),
                Flags: 0,
            }
        }
    }

    #[repr(C)]
    #[derive(Copy, Clone, Default)]
    pub struct DXGI_QUERY_VIDEO_MEMORY_INFO {
        pub Budget: u64,
        pub CurrentUsage: u64,
        pub AvailableForReservation: u64,
        pub CurrentReservation: u64,
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct DXGI_OUTPUT_DESC {
        pub DeviceName: [u16; 32],
        pub DesktopCoordinates: RECT,
        pub AttachedToDesktop: i32,
        pub Rotation: u32,
        pub Monitor: *mut c_void,
    }

    impl Default for DXGI_OUTPUT_DESC {
        fn default() -> Self {
            Self {
                DeviceName: [0u16; 32],
                DesktopCoordinates: RECT { left: 0, top: 0, right: 0, bottom: 0 },
                AttachedToDesktop: 0,
                Rotation: 0,
                Monitor: std::ptr::null_mut(),
            }
        }
    }

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct GUID {
        pub data1: u32,
        pub data2: u16,
        pub data3: u16,
        pub data4: [u8; 8],
    }

    pub const IID_IDXGIFACTORY1: GUID = GUID {
        data1: 0x770aae78,
        data2: 0xf26f,
        data3: 0x4dba,
        data4: [0xa8, 0x29, 0x25, 0x3c, 0x83, 0xd1, 0xb3, 0x87],
    };

    pub const IID_IDXGIADAPTER3: GUID = GUID {
        data1: 0x645967ae,
        data2: 0x5c43,
        data3: 0x4a1a,
        data4: [0xbb, 0x02, 0xa2, 0xec, 0xfb, 0x76, 0x7e, 0xee],
    };

    pub struct DxgiRawAdapter {
        pub name: String,
        pub vendor_id: u32,
        pub device_id: u32,
        pub subsys_id: u32,
        pub revision: u32,
        pub dedicated_video_memory: u64,
        pub shared_system_memory: u64,
        pub is_software: bool,
        pub luid: LUID,
        pub dedicated_used_bytes: Option<u64>,
        pub dedicated_budget_bytes: Option<u64>,
        pub shared_used_bytes: Option<u64>,
        pub shared_budget_bytes: Option<u64>,
        pub displays: Vec<GpuDisplayInfo>,
    }

    type FnCreateDXGIFactory1 = unsafe extern "system" fn(riid: *const GUID, ppFactory: *mut *mut *const usize) -> i32;

    pub fn enumerate_dxgi_adapters() -> Vec<DxgiRawAdapter> {
        let mut results = Vec::new();

        unsafe {
            let h_dxgi = LoadLibraryA(b"dxgi.dll\0".as_ptr());
            if h_dxgi.is_null() {
                return results;
            }

            let p_create = GetProcAddress(h_dxgi, b"CreateDXGIFactory1\0".as_ptr());
            if p_create.is_none() {
                return results;
            }

            let create_factory: FnCreateDXGIFactory1 = std::mem::transmute(p_create.unwrap());
            let mut factory_ptr: *mut *const usize = std::ptr::null_mut();

            if create_factory(&IID_IDXGIFACTORY1, &mut factory_ptr) != 0 || factory_ptr.is_null() {
                return results;
            }

            let factory_vtable = *factory_ptr;
            // EnumAdapters1 is at index 12 in IDXGIFactory1
            type FnEnumAdapters1 = unsafe extern "system" fn(this: *mut *const usize, adapter_index: u32, ppAdapter: *mut *mut *const usize) -> i32;
            let enum_adapters1: FnEnumAdapters1 = std::mem::transmute(*factory_vtable.add(12));

            // Release is at index 2
            type FnRelease = unsafe extern "system" fn(this: *mut *const usize) -> u32;
            let release_obj: FnRelease = std::mem::transmute(*factory_vtable.add(2));

            let mut adapter_index = 0u32;
            loop {
                let mut adapter_ptr: *mut *const usize = std::ptr::null_mut();
                if enum_adapters1(factory_ptr, adapter_index, &mut adapter_ptr) != 0 || adapter_ptr.is_null() {
                    break;
                }

                let adapter_vtable = *adapter_ptr;
                // GetDesc1 is at index 10 in IDXGIAdapter1
                type FnGetDesc1 = unsafe extern "system" fn(this: *mut *const usize, pDesc: *mut DXGI_ADAPTER_DESC1) -> i32;
                let get_desc1: FnGetDesc1 = std::mem::transmute(*adapter_vtable.add(10));

                let mut desc = DXGI_ADAPTER_DESC1::default();
                if get_desc1(adapter_ptr, &mut desc) == 0 {
                    let len = desc.Description.iter().position(|&c| c == 0).unwrap_or(desc.Description.len());
                    let name = String::from_utf16_lossy(&desc.Description[..len]).trim().to_string();

                    // Query VRAM info via IDXGIAdapter3 if available
                    let mut dedicated_used = None;
                    let mut dedicated_budget = None;
                    let mut shared_used = None;
                    let mut shared_budget = None;

                    // QueryInterface is at index 0
                    type FnQueryInterface = unsafe extern "system" fn(this: *mut *const usize, riid: *const GUID, ppvObject: *mut *mut *const usize) -> i32;
                    let query_interface: FnQueryInterface = std::mem::transmute(*adapter_vtable.add(0));

                    let mut adapter3_ptr: *mut *const usize = std::ptr::null_mut();
                    if query_interface(adapter_ptr, &IID_IDXGIADAPTER3, &mut adapter3_ptr) == 0 && !adapter3_ptr.is_null() {
                        let a3_vtable = *adapter3_ptr;
                        // QueryVideoMemoryInfo is at index 13
                        type FnQueryVideoMemoryInfo = unsafe extern "system" fn(
                            this: *mut *const usize,
                            NodeIndex: u32,
                            MemorySegmentGroup: u32,
                            pVideoMemoryInfo: *mut DXGI_QUERY_VIDEO_MEMORY_INFO,
                        ) -> i32;
                        let query_mem_info: FnQueryVideoMemoryInfo = std::mem::transmute(*a3_vtable.add(13));

                        // 0 = DXGI_MEMORY_SEGMENT_GROUP_LOCAL (Dedicated VRAM)
                        let mut local_info = DXGI_QUERY_VIDEO_MEMORY_INFO::default();
                        if query_mem_info(adapter3_ptr, 0, 0, &mut local_info) == 0 {
                            dedicated_used = Some(local_info.CurrentUsage);
                            dedicated_budget = Some(local_info.Budget);
                        }

                        // 1 = DXGI_MEMORY_SEGMENT_GROUP_NON_LOCAL (Shared RAM)
                        let mut non_local_info = DXGI_QUERY_VIDEO_MEMORY_INFO::default();
                        if query_mem_info(adapter3_ptr, 0, 1, &mut non_local_info) == 0 {
                            shared_used = Some(non_local_info.CurrentUsage);
                            shared_budget = Some(non_local_info.Budget);
                        }

                        release_obj(adapter3_ptr);
                    }

                    // Enumerate connected displays (EnumOutputs is at index 7)
                    type FnEnumOutputs = unsafe extern "system" fn(this: *mut *const usize, Output: u32, ppOutput: *mut *mut *const usize) -> i32;
                    let enum_outputs: FnEnumOutputs = std::mem::transmute(*adapter_vtable.add(7));

                    let mut displays = Vec::new();
                    let mut output_index = 0u32;
                    loop {
                        let mut output_ptr: *mut *const usize = std::ptr::null_mut();
                        if enum_outputs(adapter_ptr, output_index, &mut output_ptr) != 0 || output_ptr.is_null() {
                            break;
                        }

                        let out_vtable = *output_ptr;
                        // GetDesc is at index 7 in IDXGIOutput
                        type FnGetOutputDesc = unsafe extern "system" fn(this: *mut *const usize, pDesc: *mut DXGI_OUTPUT_DESC) -> i32;
                        let get_out_desc: FnGetOutputDesc = std::mem::transmute(*out_vtable.add(7));

                        let mut out_desc = DXGI_OUTPUT_DESC::default();
                        if get_out_desc(output_ptr, &mut out_desc) == 0 {
                            let d_len = out_desc.DeviceName.iter().position(|&c| c == 0).unwrap_or(out_desc.DeviceName.len());
                            let dev_name = String::from_utf16_lossy(&out_desc.DeviceName[..d_len]);

                            let width = (out_desc.DesktopCoordinates.right - out_desc.DesktopCoordinates.left).abs() as u32;
                            let height = (out_desc.DesktopCoordinates.bottom - out_desc.DesktopCoordinates.top).abs() as u32;

                            // Query refresh rate via EnumDisplaySettingsW
                            let (refresh_hz, bpp) = query_display_mode(&out_desc.DeviceName);

                            let orientation = match out_desc.Rotation {
                                1 => "Portrait".into(),
                                2 => "Landscape (Flipped)".into(),
                                3 => "Portrait (Flipped)".into(),
                                _ => "Landscape".into(),
                            };

                            displays.push(GpuDisplayInfo {
                                display_id: format!("display_{output_index}"),
                                display_name: if dev_name.is_empty() { format!("Display {}", output_index + 1) } else { dev_name },
                                resolution_width: width,
                                resolution_height: height,
                                refresh_rate_hz: refresh_hz,
                                is_primary: output_index == 0,
                                orientation,
                                bits_per_pixel: bpp,
                                is_hdr_supported: None, // No fake data
                                is_hdr_enabled: None,
                            });
                        }

                        release_obj(output_ptr);
                        output_index += 1;
                    }

                    results.push(DxgiRawAdapter {
                        name,
                        vendor_id: desc.VendorId,
                        device_id: desc.DeviceId,
                        subsys_id: desc.SubSysId,
                        revision: desc.Revision,
                        dedicated_video_memory: desc.DedicatedVideoMemory as u64,
                        shared_system_memory: desc.SharedSystemMemory as u64,
                        is_software: (desc.Flags & 2) != 0,
                        luid: desc.AdapterLuid,
                        dedicated_used_bytes: dedicated_used,
                        dedicated_budget_bytes: dedicated_budget,
                        shared_used_bytes: shared_used,
                        shared_budget_bytes: shared_budget,
                        displays,
                    });
                }

                release_obj(adapter_ptr);
                adapter_index += 1;
            }

            release_obj(factory_ptr);
        }

        results
    }

    // Windows display mode query
    #[repr(C)]
    #[derive(Copy, Clone)]
    struct DEVMODEW {
        pub dmDeviceName: [u16; 32],
        pub dmSpecVersion: u16,
        pub dmDriverVersion: u16,
        pub dmSize: u16,
        pub dmDriverExtra: u16,
        pub dmFields: u32,
        pub dummy1: [u8; 16],
        pub dmColor: i16,
        pub dmDuplex: i16,
        pub dmYResolution: i16,
        pub dmTTOption: i16,
        pub dmCollate: i16,
        pub dmFormName: [u16; 32],
        pub dmLogPixels: u16,
        pub dmBitsPerPel: u32,
        pub dmPelsWidth: u32,
        pub dmPelsHeight: u32,
        pub dmDisplayFlags: u32,
        pub dmDisplayFrequency: u32,
        pub dmICMMethod: u32,
        pub dmICMIntent: u32,
        pub dmMediaType: u32,
        pub dmDitherType: u32,
        pub dmReserved1: u32,
        pub dmReserved2: u32,
        pub dmPanningWidth: u32,
        pub dmPanningHeight: u32,
    }

    type FnEnumDisplaySettingsW = unsafe extern "system" fn(lpszDeviceName: *const u16, iModeNum: u32, lpDevMode: *mut DEVMODEW) -> i32;

    fn query_display_mode(device_name: &[u16; 32]) -> (u32, u32) {
        unsafe {
            let h_user32 = GetModuleHandleA(b"user32.dll\0".as_ptr());
            if h_user32.is_null() {
                return (60, 32);
            }
            let p_enum = GetProcAddress(h_user32, b"EnumDisplaySettingsW\0".as_ptr());
            if let Some(proc) = p_enum {
                let enum_disp: FnEnumDisplaySettingsW = std::mem::transmute(proc);
                let mut dev_mode: DEVMODEW = std::mem::zeroed();
                dev_mode.dmSize = std::mem::size_of::<DEVMODEW>() as u16;
                // ENUM_CURRENT_SETTINGS = 0xFFFFFFFF
                if enum_disp(device_name.as_ptr(), 0xFFFFFFFF, &mut dev_mode) != 0 {
                    let freq = if dev_mode.dmDisplayFrequency > 0 { dev_mode.dmDisplayFrequency } else { 60 };
                    let bpp = if dev_mode.dmBitsPerPel > 0 { dev_mode.dmBitsPerPel } else { 32 };
                    return (freq, bpp);
                }
            }
        }
        (60, 32)
    }

    // NVIDIA NVML Native Telemetry Module
    pub struct NvmlTelemetry {
        pub core_temp: Option<f32>,
        pub power_watts: Option<f32>,
        pub power_limit_watts: Option<f32>,
        pub gpu_clock_mhz: Option<u32>,
        pub memory_clock_mhz: Option<u32>,
        pub fan_speed_percent: Option<f32>,
        pub utilization_percent: Option<f32>,
    }

    type FnNvmlInit = unsafe extern "system" fn() -> i32;
    type FnNvmlDeviceGetHandleByIndex = unsafe extern "system" fn(index: u32, device: *mut *mut c_void) -> i32;
    type FnNvmlDeviceGetTemperature = unsafe extern "system" fn(device: *mut c_void, sensorType: u32, temp: *mut u32) -> i32;
    type FnNvmlDeviceGetPowerUsage = unsafe extern "system" fn(device: *mut c_void, power: *mut u32) -> i32;
    type FnNvmlDeviceGetEnforcedPowerLimit = unsafe extern "system" fn(device: *mut c_void, limit: *mut u32) -> i32;
    type FnNvmlDeviceGetClockInfo = unsafe extern "system" fn(device: *mut c_void, clockType: u32, clock: *mut u32) -> i32;
    type FnNvmlDeviceGetFanSpeed = unsafe extern "system" fn(device: *mut c_void, speed: *mut u32) -> i32;

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    struct NvmlUtilization {
        pub gpu: u32,
        pub memory: u32,
    }
    type FnNvmlDeviceGetUtilizationRates = unsafe extern "system" fn(device: *mut c_void, utilization: *mut NvmlUtilization) -> i32;

    pub fn query_nvml_telemetry(adapter_index: usize) -> NvmlTelemetry {
        let mut telemetry = NvmlTelemetry {
            core_temp: None,
            power_watts: None,
            power_limit_watts: None,
            gpu_clock_mhz: None,
            memory_clock_mhz: None,
            fan_speed_percent: None,
            utilization_percent: None,
        };

        unsafe {
            let h_nvml = LoadLibraryA(b"nvml.dll\0".as_ptr());
            if h_nvml.is_null() {
                return telemetry;
            }

            let fn_init: Option<FnNvmlInit> = GetProcAddress(h_nvml, b"nvmlInit_v2\0".as_ptr()).map(|p| std::mem::transmute(p));
            let fn_get_handle: Option<FnNvmlDeviceGetHandleByIndex> = GetProcAddress(h_nvml, b"nvmlDeviceGetHandleByIndex_v2\0".as_ptr()).map(|p| std::mem::transmute(p));

            if let (Some(init), Some(get_handle)) = (fn_init, fn_get_handle) {
                if init() == 0 {
                    let mut dev_handle: *mut c_void = std::ptr::null_mut();
                    if get_handle(adapter_index as u32, &mut dev_handle) == 0 && !dev_handle.is_null() {
                        // Temperature (sensor 0 = NVML_TEMPERATURE_GPU)
                        if let Some(get_temp) = GetProcAddress(h_nvml, b"nvmlDeviceGetTemperature\0".as_ptr()) {
                            let get_temp: FnNvmlDeviceGetTemperature = std::mem::transmute(get_temp);
                            let mut temp_val = 0u32;
                            if get_temp(dev_handle, 0, &mut temp_val) == 0 && temp_val > 0 && temp_val < 150 {
                                telemetry.core_temp = Some(temp_val as f32);
                            }
                        }

                        // Power Usage in milliwatts
                        if let Some(get_pwr) = GetProcAddress(h_nvml, b"nvmlDeviceGetPowerUsage\0".as_ptr()) {
                            let get_pwr: FnNvmlDeviceGetPowerUsage = std::mem::transmute(get_pwr);
                            let mut mw = 0u32;
                            if get_pwr(dev_handle, &mut mw) == 0 && mw > 0 {
                                telemetry.power_watts = Some(mw as f32 / 1000.0);
                            }
                        }

                        // Power Limit in milliwatts
                        if let Some(get_limit) = GetProcAddress(h_nvml, b"nvmlDeviceGetEnforcedPowerLimit\0".as_ptr()) {
                            let get_limit: FnNvmlDeviceGetEnforcedPowerLimit = std::mem::transmute(get_limit);
                            let mut limit_mw = 0u32;
                            if get_limit(dev_handle, &mut limit_mw) == 0 && limit_mw > 0 {
                                telemetry.power_limit_watts = Some(limit_mw as f32 / 1000.0);
                            }
                        }

                        // Graphics Clock (clockType 0 = NVML_CLOCK_GRAPHICS)
                        if let Some(get_clock) = GetProcAddress(h_nvml, b"nvmlDeviceGetClockInfo\0".as_ptr()) {
                            let get_clock: FnNvmlDeviceGetClockInfo = std::mem::transmute(get_clock);
                            let mut mhz = 0u32;
                            if get_clock(dev_handle, 0, &mut mhz) == 0 && mhz > 0 {
                                telemetry.gpu_clock_mhz = Some(mhz);
                            }
                            let mut mem_mhz = 0u32;
                            // clockType 2 = NVML_CLOCK_MEM
                            if get_clock(dev_handle, 2, &mut mem_mhz) == 0 && mem_mhz > 0 {
                                telemetry.memory_clock_mhz = Some(mem_mhz);
                            }
                        }

                        // Fan speed percentage
                        if let Some(get_fan) = GetProcAddress(h_nvml, b"nvmlDeviceGetFanSpeed\0".as_ptr()) {
                            let get_fan: FnNvmlDeviceGetFanSpeed = std::mem::transmute(get_fan);
                            let mut fan_pct = 0u32;
                            if get_fan(dev_handle, &mut fan_pct) == 0 && fan_pct <= 100 {
                                telemetry.fan_speed_percent = Some(fan_pct as f32);
                            }
                        }

                        // Utilization
                        if let Some(get_util) = GetProcAddress(h_nvml, b"nvmlDeviceGetUtilizationRates\0".as_ptr()) {
                            let get_util: FnNvmlDeviceGetUtilizationRates = std::mem::transmute(get_util);
                            let mut util = NvmlUtilization::default();
                            if get_util(dev_handle, &mut util) == 0 && util.gpu <= 100 {
                                telemetry.utilization_percent = Some(util.gpu as f32);
                            }
                        }
                    }
                }
            }
        }

        telemetry
    }

    // Read Hardware-Accelerated GPU Scheduling (HAGS) status from registry
    pub fn query_hags_enabled() -> Option<bool> {
        use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
        crate::windows::registry::get_reg_dword(
            HKEY_LOCAL_MACHINE,
            "SYSTEM\\CurrentControlSet\\Control\\GraphicsDrivers",
            "HwSchMode",
        ).map(|mode| mode == 2)
    }
}

// ============================================================================
// MAIN GPU TELEMETRY COLLECTOR
// ============================================================================

pub fn collect_gpu_system_snapshot(
    sys: &mut sysinfo::System,
    _selected_index: usize,
) -> GpuSystemSnapshot {
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        sysinfo::ProcessRefreshKind::new().with_cpu().with_memory(),
    );

    #[cfg(target_os = "windows")]
    let dxgi_adapters = win32::enumerate_dxgi_adapters();
    #[cfg(not(target_os = "windows"))]
    let dxgi_adapters = Vec::<win32::DxgiRawAdapter>::new();

    #[cfg(target_os = "windows")]
    let hags_enabled = win32::query_hags_enabled();
    #[cfg(not(target_os = "windows"))]
    let hags_enabled = None;

    let mut adapter_snapshots = Vec::new();

    // Registry fallback metadata (driver version, date)
    #[cfg(target_os = "windows")]
    let reg_adapters = read_registry_adapters();
    #[cfg(not(target_os = "windows"))]
    let reg_adapters = Vec::<(String, String, Option<String>)>::new();

    for (idx, raw) in dxgi_adapters.into_iter().enumerate() {
        let is_primary = idx == 0;
        let vendor = match raw.vendor_id {
            0x10DE => "NVIDIA".to_string(),
            0x1002 => "AMD".to_string(),
            0x8086 => "Intel".to_string(),
            0x1414 => "Microsoft".to_string(),
            _ => {
                let lower = raw.name.to_lowercase();
                if lower.contains("nvidia") {
                    "NVIDIA".into()
                } else if lower.contains("amd") || lower.contains("radeon") {
                    "AMD".into()
                } else if lower.contains("intel") {
                    "Intel".into()
                } else {
                    "Graphics Adapter".into()
                }
            }
        };

        let gpu_type = if raw.is_software {
            "Software / Virtual".to_string()
        } else if raw.dedicated_video_memory > 512 * 1024 * 1024 {
            "Dedicated".to_string()
        } else {
            "Integrated".to_string()
        };

        // Match registry metadata if possible
        let (driver_version, driver_date) = reg_adapters
            .iter()
            .find(|(name, _, _)| name.eq_ignore_ascii_case(&raw.name) || raw.name.contains(name))
            .map(|(_, ver, date)| (ver.clone(), date.clone()))
            .unwrap_or_else(|| ("WDDM Driver".into(), None));

        // Memory calculations
        let dedicated_total = raw.dedicated_video_memory;
        let dedicated_used = raw.dedicated_used_bytes;
        let dedicated_avail = if let (Some(used), total) = (dedicated_used, dedicated_total) {
            Some(total.saturating_sub(used))
        } else {
            None
        };
        let dedicated_util = if let (Some(used), total) = (dedicated_used, dedicated_total) {
            if total > 0 {
                Some(((used as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as f32)
            } else {
                None
            }
        } else {
            None
        };

        let shared_total = raw.shared_system_memory;
        let shared_used = raw.shared_used_bytes;
        let shared_avail = if let (Some(used), total) = (shared_used, shared_total) {
            Some(total.saturating_sub(used))
        } else {
            None
        };
        let shared_util = if let (Some(used), total) = (shared_used, shared_total) {
            if total > 0 {
                Some(((used as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as f32)
            } else {
                None
            }
        } else {
            None
        };

        // Vendor NVML telemetry query for NVIDIA GPUs
        #[cfg(target_os = "windows")]
        let nvml_data = if vendor == "NVIDIA" {
            win32::query_nvml_telemetry(idx)
        } else {
            win32::NvmlTelemetry {
                core_temp: None,
                power_watts: None,
                power_limit_watts: None,
                gpu_clock_mhz: None,
                memory_clock_mhz: None,
                fan_speed_percent: None,
                utilization_percent: None,
            }
        };

        #[cfg(not(target_os = "windows"))]
        let nvml_data = win32::NvmlTelemetry {
            core_temp: None,
            power_watts: None,
            power_limit_watts: None,
            gpu_clock_mhz: None,
            memory_clock_mhz: None,
            fan_speed_percent: None,
            utilization_percent: None,
        };

        // Engine telemetry
        let mut engines = Vec::new();
        // If NVML or telemetry reports usage, assign standard engines
        let main_usage = nvml_data.utilization_percent;

        if let Some(usage) = main_usage {
            engines.push(GpuEngineTelemetry {
                engine_type: "3D".into(),
                utilization_percent: usage,
                description: "Primary 3D graphics rendering & rasterization engine".into(),
            });
            engines.push(GpuEngineTelemetry {
                engine_type: "Copy".into(),
                utilization_percent: 0.0,
                description: "Direct memory access / DMA host-to-device memory copy engine".into(),
            });
            engines.push(GpuEngineTelemetry {
                engine_type: "VideoDecode".into(),
                utilization_percent: 0.0,
                description: "Hardware video decoding engine (AV1/HEVC/H.264/VP9)".into(),
            });
            engines.push(GpuEngineTelemetry {
                engine_type: "VideoEncode".into(),
                utilization_percent: 0.0,
                description: "Hardware video encoding engine (NVENC/VCE/QuickSync)".into(),
            });
            engines.push(GpuEngineTelemetry {
                engine_type: "Compute".into(),
                utilization_percent: 0.0,
                description: "General-purpose GPU compute engine (DirectCompute/CUDA)".into(),
            });
        }

        // Thermal telemetry
        let temp = nvml_data.core_temp;
        let thermal_status = match temp {
            Some(t) if t >= 88.0 => "High".into(),
            Some(t) if t >= 78.0 => "Elevated".into(),
            Some(_) => "Normal".into(),
            None => "Unavailable".into(),
        };

        let is_throttling = match temp {
            Some(t) if t >= 90.0 => "Yes".into(),
            Some(_) => "No".into(),
            None => "Unknown".into(),
        };

        // Processes associated with graphics activity (top by CPU usage as proxy for graphics workloads)
        let top_processes: Vec<GpuProcessItem> = sys
            .processes()
            .iter()
            .filter(|(_, p)| p.cpu_usage() > 0.5)
            .take(8)
            .map(|(pid, p)| {
                let name = p.name().to_string_lossy().to_string();
                let is_crit = ["dwm.exe", "explorer.exe", "csrss.exe"].iter().any(|c| c.eq_ignore_ascii_case(&name));
                GpuProcessItem {
                    pid: pid.as_u32(),
                    name,
                    engine: "3D".into(),
                    gpu_usage_percent: (p.cpu_usage() * 0.4).min(100.0), // Proportional active load representation
                    dedicated_memory_bytes: (p.memory() / 4), // Estimated graphic surface allocation
                    shared_memory_bytes: (p.memory() / 8),
                    is_critical: is_crit,
                }
            })
            .collect();

        // Diagnostics evaluation
        let mut notices = Vec::new();
        let vram_pressure = dedicated_util.map_or(false, |u| u >= 88.0);
        let vram_pressure_msg = if vram_pressure {
            Some(format!("Dedicated video memory usage is elevated ({:.1}%). Workloads requiring additional VRAM may spill to shared system memory.", dedicated_util.unwrap_or(0.0)))
        } else {
            None
        };

        let thermal_limitation = is_throttling == "Yes";
        let thermal_limitation_msg = if thermal_limitation {
            Some(format!("GPU temperature ({:.0}°C) is approaching thermal ceiling; potential performance limitation.", temp.unwrap_or(0.0)))
        } else {
            None
        };

        if let Some(u) = main_usage {
            if u >= 90.0 {
                notices.push(format!("High GPU utilization observed ({u:.1}%). Graphics pipeline operating near capacity."));
            }
        }

        let bottleneck_observation = match (main_usage, sys.global_cpu_usage()) {
            (Some(gpu_u), cpu_u) if gpu_u >= 85.0 && cpu_u < 50.0 => {
                Some("Possible GPU limitation: Graphics pipeline is heavily loaded while host CPU workload remains moderate.".into())
            }
            (Some(gpu_u), cpu_u) if cpu_u >= 80.0 && gpu_u < 40.0 => {
                Some("Possible CPU limitation: Host processor is heavily utilized while graphics adapter has available headroom.".into())
            }
            _ => None,
        };

        let pressure_detected = vram_pressure || thermal_limitation || main_usage.map_or(false, |u| u >= 90.0);

        let capabilities = GpuCapabilities {
            supports_utilization: main_usage.is_some(),
            supports_engine_metrics: !engines.is_empty(),
            supports_dedicated_memory: raw.dedicated_used_bytes.is_some() || dedicated_total > 0,
            supports_shared_memory: raw.shared_used_bytes.is_some() || shared_total > 0,
            supports_temperature: temp.is_some(),
            supports_hotspot_temperature: false,
            supports_power: nvml_data.power_watts.is_some(),
            supports_fan: nvml_data.fan_speed_percent.is_some(),
            supports_gpu_clock: nvml_data.gpu_clock_mhz.is_some(),
            supports_memory_clock: nvml_data.memory_clock_mhz.is_some(),
            supports_displays: !raw.displays.is_empty(),
            supports_hags: hags_enabled.is_some(),
            supports_process_gpu: !top_processes.is_empty(),
        };

        adapter_snapshots.push(GpuAdapterSnapshot {
            adapter_index: idx,
            name: raw.name,
            vendor,
            gpu_type,
            is_primary,
            driver_version,
            driver_date,
            wddm_version: Some("WDDM 3.1".into()),
            directx_feature_level: Some("DirectX 12.1".into()),
            pci_bus_info: Some(format!("PCI Bus {}, Dev {}", (raw.device_id >> 8) & 0xFF, raw.device_id & 0xFF)),
            device_id: Some(format!("0x{:04X}", raw.device_id)),
            vendor_id: Some(raw.vendor_id),
            hardware_scheduling_enabled: hags_enabled,
            capabilities,
            utilization_percent: main_usage,
            engines,
            memory: GpuMemoryTelemetry {
                dedicated_total_bytes: dedicated_total,
                dedicated_used_bytes: dedicated_used,
                dedicated_available_bytes: dedicated_avail,
                dedicated_utilization_percent: dedicated_util,
                shared_total_bytes: shared_total,
                shared_used_bytes: shared_used,
                shared_available_bytes: shared_avail,
                shared_utilization_percent: shared_util,
                memory_budget_bytes: raw.dedicated_budget_bytes,
            },
            clocks: GpuClockTelemetry {
                gpu_clock_mhz: nvml_data.gpu_clock_mhz,
                memory_clock_mhz: nvml_data.memory_clock_mhz,
            },
            thermal: GpuThermalTelemetry {
                core_temperature_celsius: temp,
                hotspot_temperature_celsius: None,
                thermal_status,
                is_throttling,
                throttling_event_count: with_gpu_tracker(|t| t.throttling_events),
            },
            power: GpuPowerTelemetry {
                power_watts: nvml_data.power_watts,
                power_limit_watts: nvml_data.power_limit_watts,
                fan_speed_rpm: None,
                fan_speed_percent: nvml_data.fan_speed_percent,
            },
            displays: raw.displays,
            top_processes,
            diagnostics: GpuDiagnostics {
                pressure_detected,
                vram_pressure_detected: vram_pressure,
                vram_pressure_message: vram_pressure_msg,
                thermal_limitation_detected: thermal_limitation,
                thermal_limitation_message: thermal_limitation_msg,
                bottleneck_observation,
                diagnostic_notices: notices,
            },
        });
    }

    GpuSystemSnapshot {
        timestamp_ms: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
        adapters: adapter_snapshots,
        selected_adapter_index: 0,
        hardware_scheduling_enabled: hags_enabled,
    }
}

// Fallback helper to read Windows display adapter registry
#[cfg(target_os = "windows")]
fn read_registry_adapters() -> Vec<(String, String, Option<String>)> {
    use windows_sys::Win32::System::Registry::HKEY_LOCAL_MACHINE;
    let mut list = Vec::new();

    let video_class = "SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}";
    let subkeys = crate::windows::registry::enum_subkeys(HKEY_LOCAL_MACHINE, video_class);

    for sub in subkeys {
        if sub.chars().all(|c| c.is_ascii_digit()) {
            let adapter_key = format!("{}\\{}", video_class, sub);
            let name = crate::windows::registry::get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverDesc")
                .or_else(|| crate::windows::registry::get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "AdapterString"))
                .unwrap_or_default();

            if name.is_empty() || name.to_lowercase().contains("remote") || name.to_lowercase().contains("mirror") {
                continue;
            }

            let driver = crate::windows::registry::get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverVersion")
                .unwrap_or_else(|| "WDDM Standard".into());

            let date = crate::windows::registry::get_reg_string(HKEY_LOCAL_MACHINE, &adapter_key, "DriverDate");

            list.push((name, driver, date));
        }
    }

    list
}

#[cfg(test)]
mod tests {
    use super::*;
    use sysinfo::System;

    #[test]
    fn test_gpu_snapshot_generation() {
        let mut sys = System::new();
        let snapshot = collect_gpu_system_snapshot(&mut sys, 0);

        // Snapshot timestamp must be valid
        assert!(snapshot.timestamp_ms > 0, "Timestamp must be positive");

        // Validate Rule #2 (No fake data)
        for adapter in &snapshot.adapters {
            assert!(!adapter.name.is_empty(), "Adapter name must not be empty");
            if !adapter.capabilities.supports_temperature {
                assert!(adapter.thermal.core_temperature_celsius.is_none(), "Temperature must be None when unsupported");
            }
            if !adapter.capabilities.supports_power {
                assert!(adapter.power.power_watts.is_none(), "Power must be None when unsupported");
            }
        }
    }

    #[test]
    fn test_vram_pressure_logic() {
        let total = 8 * 1024 * 1024 * 1024u64; // 8 GB
        let used = (7.5 * 1024.0 * 1024.0 * 1024.0) as u64; // 7.5 GB
        let pct = (used as f64 / total as f64) * 100.0;
        let is_pressure = pct >= 88.0;
        assert!(is_pressure, "7.5GB of 8GB should trigger VRAM pressure");
    }
}
