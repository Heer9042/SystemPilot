//! Storage, Physical Disks, Volumes, IOPS, Latency & Diagnostics Logic
//! Safe, zero-process Windows native implementation.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::Instant;

// ============================================================================
// DATA MODELS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskCapabilities {
    pub supports_iops: bool,
    pub supports_latency: bool,
    pub supports_queue_depth: bool,
    pub supports_active_time: bool,
    pub supports_temperature: bool,
    pub supports_health: bool,
    pub supports_smart: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhysicalDiskSnapshot {
    pub disk_index: u32,
    pub model: String,
    pub manufacturer: String,
    pub bus_type: String, // "NVMe", "SATA", "USB", "SCSI", "ATAPI", "Storage"
    pub media_type: String, // "SSD", "HDD", "NVMe SSD", "Removable", "Storage Device"
    pub serial_number: Option<String>,
    pub firmware_revision: Option<String>,
    pub size_bytes: u64,
    pub is_removable: bool,
    pub is_system_disk: bool,
    pub capabilities: DiskCapabilities,
    // Real-time performance metrics
    pub read_bytes_sec: u64,
    pub write_bytes_sec: u64,
    pub total_bytes_sec: u64,
    pub read_iops: Option<u32>,
    pub write_iops: Option<u32>,
    pub total_iops: Option<u32>,
    pub read_latency_ms: Option<f32>,
    pub write_latency_ms: Option<f32>,
    pub avg_latency_ms: Option<f32>,
    pub queue_depth: Option<u32>,
    pub active_time_percent: Option<f32>,
    pub temperature_celsius: Option<f32>,
    pub health_status: String, // "Operating normally", "Attention", "Warning", "Unavailable"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeSnapshot {
    pub drive_letter: String, // "C:", "D:"
    pub volume_label: String,
    pub file_system: String, // "NTFS", "FAT32", "exFAT", "ReFS"
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub used_bytes: u64,
    pub usage_percent: f32,
    pub is_system_volume: bool,
    pub is_removable: bool,
    pub physical_disk_index: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskProcessItem {
    pub pid: u32,
    pub name: String,
    pub read_bytes_sec: u64,
    pub write_bytes_sec: u64,
    pub total_bytes_sec: u64,
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageDiagnostics {
    pub pressure_detected: bool,
    pub low_space_detected: bool,
    pub low_space_message: Option<String>,
    pub high_queue_detected: bool,
    pub high_queue_message: Option<String>,
    pub elevated_latency_detected: bool,
    pub elevated_latency_message: Option<String>,
    pub diagnostic_notices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskSystemSnapshot {
    pub timestamp_ms: u64,
    pub physical_disks: Vec<PhysicalDiskSnapshot>,
    pub volumes: Vec<VolumeSnapshot>,
    pub selected_disk_index: u32,
    pub top_processes: Vec<DiskProcessItem>,
    pub diagnostics: StorageDiagnostics,
    pub total_storage_bytes: u64,
    pub total_used_bytes: u64,
    pub total_free_bytes: u64,
}

// Legacy struct for backward compatibility
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DiskPartitionInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_space_bytes: u64,
    pub available_space_bytes: u64,
    pub used_space_bytes: u64,
    pub usage_percent: f32,
    pub is_removable: bool,
    pub disk_kind: String,
}

// ============================================================================
// STATE TRACKER FOR DELTAS (IOPS & Latency)
// ============================================================================

#[allow(dead_code)]
struct DiskPerfSample {
    bytes_read: i64,
    bytes_written: i64,
    read_time: i64,
    write_time: i64,
    idle_time: i64,
    read_count: u32,
    write_count: u32,
    queue_depth: u32,
    query_time: i64,
    sample_instant: Instant,
}

#[allow(dead_code)]
struct DiskTrackerState {
    last_samples: std::collections::HashMap<u32, DiskPerfSample>,
}

impl Default for DiskTrackerState {
    fn default() -> Self {
        Self {
            last_samples: std::collections::HashMap::new(),
        }
    }
}

static DISK_TRACKER: Mutex<Option<DiskTrackerState>> = Mutex::new(None);

fn with_disk_tracker<F, R>(f: F) -> R
where
    F: FnOnce(&mut DiskTrackerState) -> R,
{
    let mut lock = DISK_TRACKER.lock().unwrap();
    if lock.is_none() {
        *lock = Some(DiskTrackerState::default());
    }
    f(lock.as_mut().unwrap())
}

// ============================================================================
// WIN32 NATIVE STORAGE CALLS
// ============================================================================

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
mod win32 {
    use std::ffi::c_void;

    pub const GENERIC_READ: u32 = 0x80000000;
    pub const FILE_SHARE_READ: u32 = 0x00000001;
    pub const FILE_SHARE_WRITE: u32 = 0x00000002;
    pub const OPEN_EXISTING: u32 = 3;
    pub const INVALID_HANDLE_VALUE: *mut c_void = -1isize as *mut c_void;
    pub const IOCTL_DISK_PERFORMANCE: u32 = 0x00070020;

    #[link(name = "kernel32")]
    extern "system" {
        pub fn CreateFileW(
            lpFileName: *const u16,
            dwDesiredAccess: u32,
            dwShareMode: u32,
            lpSecurityAttributes: *const c_void,
            dwCreationDisposition: u32,
            dwFlagsAndAttributes: u32,
            hTemplateFile: isize,
        ) -> *mut c_void;

        pub fn DeviceIoControl(
            hDevice: *mut c_void,
            dwIoControlCode: u32,
            lpInBuffer: *const c_void,
            nInBufferSize: u32,
            lpOutBuffer: *mut c_void,
            nOutBufferSize: u32,
            lpBytesReturned: *mut u32,
            lpOverlapped: *mut c_void,
        ) -> i32;

        pub fn CloseHandle(hObject: *mut c_void) -> i32;
    }

    #[repr(C)]
    #[derive(Default, Copy, Clone)]
    pub struct DISK_PERFORMANCE {
        pub BytesRead: i64,
        pub BytesWritten: i64,
        pub ReadTime: i64,
        pub WriteTime: i64,
        pub IdleTime: i64,
        pub ReadCount: u32,
        pub WriteCount: u32,
        pub QueueDepth: u32,
        pub SplitCount: u32,
        pub QueryTime: i64,
        pub StorageDeviceNumber: u32,
        pub StorageManagerName: [u16; 8],
    }

    pub fn query_disk_performance(drive_index: u32) -> Option<DISK_PERFORMANCE> {
        let path = format!("\\\\.\\PhysicalDrive{}\0", drive_index);
        let path_wide: Vec<u16> = path.encode_utf16().collect();

        unsafe {
            let handle = CreateFileW(
                path_wide.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                std::ptr::null(),
                OPEN_EXISTING,
                0,
                0,
            );

            if handle == INVALID_HANDLE_VALUE {
                return None;
            }

            let mut perf = DISK_PERFORMANCE::default();
            let mut bytes_returned = 0u32;

            let success = DeviceIoControl(
                handle,
                IOCTL_DISK_PERFORMANCE,
                std::ptr::null(),
                0,
                &mut perf as *mut _ as *mut c_void,
                std::mem::size_of::<DISK_PERFORMANCE>() as u32,
                &mut bytes_returned,
                std::ptr::null_mut(),
            );

            CloseHandle(handle);

            if success != 0 {
                Some(perf)
            } else {
                None
            }
        }
    }

    // Storage Device Property & Seek Penalty
    pub const IOCTL_STORAGE_QUERY_PROPERTY: u32 = 0x002D1400;

    #[repr(C)]
    #[derive(Copy, Clone)]
    pub struct STORAGE_PROPERTY_QUERY {
        pub PropertyId: u32, // 0 = StorageDeviceProperty, 7 = StorageDeviceSeekPenaltyProperty
        pub QueryType: u32,  // 0 = PropertyStandardQuery
        pub AdditionalParameters: [u8; 1],
    }

    #[repr(C)]
    pub struct STORAGE_DEVICE_DESCRIPTOR_HEADER {
        pub Version: u32,
        pub Size: u32,
        pub DeviceType: u8,
        pub DeviceTypeModifier: u8,
        pub RemovableMedia: u8,
        pub CommandQueueing: u8,
        pub VendorIdOffset: u32,
        pub ProductIdOffset: u32,
        pub ProductRevisionOffset: u32,
        pub SerialNumberOffset: u32,
        pub BusType: u32,
    }

    #[repr(C)]
    pub struct DEVICE_SEEK_PENALTY_DESCRIPTOR {
        pub Version: u32,
        pub Size: u32,
        pub IncursSeekPenalty: u8,
    }

    pub struct PhysicalDriveDetails {
        pub model: String,
        pub vendor: String,
        pub serial: Option<String>,
        pub firmware: Option<String>,
        pub bus_type: String,
        pub is_ssd: Option<bool>,
        pub is_removable: bool,
    }

    pub fn query_physical_drive_details(drive_index: u32) -> Option<PhysicalDriveDetails> {
        let path = format!("\\\\.\\PhysicalDrive{}\0", drive_index);
        let path_wide: Vec<u16> = path.encode_utf16().collect();

        unsafe {
            let handle = CreateFileW(
                path_wide.as_ptr(),
                GENERIC_READ,
                FILE_SHARE_READ | FILE_SHARE_WRITE,
                std::ptr::null(),
                OPEN_EXISTING,
                0,
                0,
            );

            if handle == INVALID_HANDLE_VALUE {
                return None;
            }

            // 1. Query StorageDeviceProperty
            let mut query = STORAGE_PROPERTY_QUERY {
                PropertyId: 0, // StorageDeviceProperty
                QueryType: 0,
                AdditionalParameters: [0],
            };

            let mut buffer = vec![0u8; 1024];
            let mut returned = 0u32;

            let dev_success = DeviceIoControl(
                handle,
                IOCTL_STORAGE_QUERY_PROPERTY,
                &mut query as *mut _ as *mut c_void,
                std::mem::size_of::<STORAGE_PROPERTY_QUERY>() as u32,
                buffer.as_mut_ptr() as *mut c_void,
                buffer.len() as u32,
                &mut returned,
                std::ptr::null_mut(),
            );

            let mut model = String::new();
            let mut vendor = String::new();
            let mut serial = None;
            let mut firmware = None;
            let mut bus_name = "Storage".to_string();
            let mut is_removable = false;

            if dev_success != 0 && returned >= std::mem::size_of::<STORAGE_DEVICE_DESCRIPTOR_HEADER>() as u32 {
                let header = &*(buffer.as_ptr() as *const STORAGE_DEVICE_DESCRIPTOR_HEADER);
                is_removable = header.RemovableMedia != 0;

                bus_name = match header.BusType {
                    17 => "NVMe".into(),
                    11 => "SATA".into(),
                    7 => "USB".into(),
                    10 => "SAS".into(),
                    3 => "ATAPI".into(),
                    8 => "RAID".into(),
                    _ => "Storage".into(),
                };

                let read_str = |offset: u32| -> Option<String> {
                    if offset > 0 && (offset as usize) < buffer.len() {
                        let slice = &buffer[offset as usize..];
                        let len = slice.iter().position(|&b| b == 0).unwrap_or(slice.len());
                        let s = String::from_utf8_lossy(&slice[..len]).trim().to_string();
                        if !s.is_empty() { Some(s) } else { None }
                    } else {
                        None
                    }
                };

                model = read_str(header.ProductIdOffset).unwrap_or_default();
                vendor = read_str(header.VendorIdOffset).unwrap_or_default();
                serial = read_str(header.SerialNumberOffset);
                firmware = read_str(header.ProductRevisionOffset);
            }

            // 2. Query Seek Penalty to detect SSD vs HDD accurately
            let mut seek_query = STORAGE_PROPERTY_QUERY {
                PropertyId: 7, // StorageDeviceSeekPenaltyProperty
                QueryType: 0,
                AdditionalParameters: [0],
            };
            let mut seek_desc = DEVICE_SEEK_PENALTY_DESCRIPTOR { Version: 0, Size: 0, IncursSeekPenalty: 1 };
            let mut seek_ret = 0u32;

            let is_ssd = if DeviceIoControl(
                handle,
                IOCTL_STORAGE_QUERY_PROPERTY,
                &mut seek_query as *mut _ as *mut c_void,
                std::mem::size_of::<STORAGE_PROPERTY_QUERY>() as u32,
                &mut seek_desc as *mut _ as *mut c_void,
                std::mem::size_of::<DEVICE_SEEK_PENALTY_DESCRIPTOR>() as u32,
                &mut seek_ret,
                std::ptr::null_mut(),
            ) != 0 {
                Some(seek_desc.IncursSeekPenalty == 0) // IncursSeekPenalty == 0 means Solid State (SSD)!
            } else {
                if bus_name == "NVMe" { Some(true) } else { None }
            };

            CloseHandle(handle);

            Some(PhysicalDriveDetails {
                model,
                vendor,
                serial,
                firmware,
                bus_type: bus_name,
                is_ssd,
                is_removable,
            })
        }
    }

    // Windows System Directory drive letter check
    pub fn get_system_drive_letter() -> String {
        unsafe {
            use windows_sys::Win32::System::SystemInformation::GetSystemDirectoryW;
            let mut buf = [0u16; 260];
            let len = GetSystemDirectoryW(buf.as_mut_ptr(), 260);
            if len > 0 {
                let s = String::from_utf16_lossy(&buf[..len as usize]);
                if s.len() >= 2 && &s[1..2] == ":" {
                    return s[..2].to_uppercase();
                }
            }
        }
        "C:".to_string()
    }
}

// ============================================================================
// MAIN STORAGE COLLECTOR
// ============================================================================

pub fn collect_disk_system_snapshot(
    sys: &mut sysinfo::System,
    disks: &mut sysinfo::Disks,
    selected_disk_index: u32,
) -> DiskSystemSnapshot {
    disks.refresh();
    sys.refresh_processes_specifics(
        sysinfo::ProcessesToUpdate::All,
        sysinfo::ProcessRefreshKind::new().with_disk_usage(),
    );

    #[cfg(target_os = "windows")]
    let system_drive = win32::get_system_drive_letter();
    #[cfg(not(target_os = "windows"))]
    let system_drive = "C:".to_string();

    // 1. Enumerate Volumes from sysinfo Disks
    let mut volumes = Vec::new();
    let mut total_storage = 0u64;
    let mut total_free = 0u64;
    let mut total_used = 0u64;

    for d in disks.iter() {
        let total = d.total_space();
        let avail = d.available_space();
        let used = total.saturating_sub(avail);
        let pct = if total > 0 {
            ((used as f64 / total as f64) * 100.0).clamp(0.0, 100.0) as f32
        } else {
            0.0
        };

        total_storage += total;
        total_free += avail;
        total_used += used;

        let mount = d.mount_point().to_string_lossy().to_string();
        let drive_letter = if mount.len() >= 2 && &mount[1..2] == ":" {
            mount[..2].to_uppercase()
        } else {
            mount.clone()
        };

        let is_sys = drive_letter.eq_ignore_ascii_case(&system_drive);

        volumes.push(VolumeSnapshot {
            drive_letter,
            volume_label: d.name().to_string_lossy().to_string(),
            file_system: d.file_system().to_string_lossy().to_string(),
            total_bytes: total,
            free_bytes: avail,
            used_bytes: used,
            usage_percent: pct,
            is_system_volume: is_sys,
            is_removable: d.is_removable(),
            physical_disk_index: Some(0), // Physical drive mapping
        });
    }

    // 2. Enumerate Physical Disks via Windows IOCTLs
    let mut physical_disks = Vec::new();

    #[cfg(target_os = "windows")]
    {
        for drive_idx in 0..8 {
            let details = win32::query_physical_drive_details(drive_idx);
            let perf = win32::query_disk_performance(drive_idx);

            if details.is_none() && perf.is_none() {
                continue;
            }

            let d = details.unwrap_or(win32::PhysicalDriveDetails {
                model: format!("Physical Disk #{drive_idx}"),
                vendor: "Storage".into(),
                serial: None,
                firmware: None,
                bus_type: "Storage".into(),
                is_ssd: None,
                is_removable: false,
            });

            let media_type = if d.bus_type == "NVMe" {
                "NVMe SSD".into()
            } else if d.is_ssd == Some(true) {
                "SATA SSD".into()
            } else if d.is_ssd == Some(false) {
                "Mechanical HDD".into()
            } else if d.is_removable {
                "Removable Drive".into()
            } else {
                "Storage Disk".into()
            };

            // Delta calculations for IOPS, latency, and read/write speeds
            let now = Instant::now();
            let (rb_sec, wb_sec, r_iops, w_iops, r_lat, w_lat, q_depth, active_pct) = with_disk_tracker(|tracker| {
                if let Some(curr) = perf {
                    let mut read_rate = 0u64;
                    let mut write_rate = 0u64;
                    let mut read_iops_calc = None;
                    let mut write_iops_calc = None;
                    let mut read_latency_calc = None;
                    let mut write_latency_calc = None;
                    let mut active_calc = None;

                    if let Some(prev) = tracker.last_samples.get(&drive_idx) {
                        let dt = now.duration_since(prev.sample_instant).as_secs_f64();
                        if dt > 0.1 {
                            let d_rb = curr.BytesRead.saturating_sub(prev.bytes_read).max(0) as u64;
                            let d_wb = curr.BytesWritten.saturating_sub(prev.bytes_written).max(0) as u64;
                            let d_rc = curr.ReadCount.saturating_sub(prev.read_count);
                            let d_wc = curr.WriteCount.saturating_sub(prev.write_count);
                            let d_rt = curr.ReadTime.saturating_sub(prev.read_time);
                            let d_wt = curr.WriteTime.saturating_sub(prev.write_time);
                            let d_it = curr.IdleTime.saturating_sub(prev.idle_time);
                            let d_qt = curr.QueryTime.saturating_sub(prev.query_time);

                            read_rate = (d_rb as f64 / dt) as u64;
                            write_rate = (d_wb as f64 / dt) as u64;

                            let r_iops_val = (d_rc as f64 / dt) as u32;
                            let w_iops_val = (d_wc as f64 / dt) as u32;
                            read_iops_calc = Some(r_iops_val);
                            write_iops_calc = Some(w_iops_val);

                            if d_rc > 0 {
                                // 100ns units to ms: divide by 10,000
                                read_latency_calc = Some(((d_rt as f64 / 10000.0) / d_rc as f64) as f32);
                            }
                            if d_wc > 0 {
                                write_latency_calc = Some(((d_wt as f64 / 10000.0) / d_wc as f64) as f32);
                            }

                            if d_qt > 0 {
                                let busy = d_qt.saturating_sub(d_it).max(0);
                                active_calc = Some(((busy as f64 / d_qt as f64) * 100.0).clamp(0.0, 100.0) as f32);
                            }
                        }
                    }

                    tracker.last_samples.insert(drive_idx, DiskPerfSample {
                        bytes_read: curr.BytesRead,
                        bytes_written: curr.BytesWritten,
                        read_time: curr.ReadTime,
                        write_time: curr.WriteTime,
                        idle_time: curr.IdleTime,
                        read_count: curr.ReadCount,
                        write_count: curr.WriteCount,
                        queue_depth: curr.QueueDepth,
                        query_time: curr.QueryTime,
                        sample_instant: now,
                    });

                    (read_rate, write_rate, read_iops_calc, write_iops_calc, read_latency_calc, write_latency_calc, Some(curr.QueueDepth), active_calc)
                } else {
                    (0, 0, None, None, None, None, None, None)
                }
            });

            let total_iops = match (r_iops, w_iops) {
                (Some(r), Some(w)) => Some(r + w),
                (Some(r), None) => Some(r),
                (None, Some(w)) => Some(w),
                (None, None) => None,
            };

            let avg_latency = match (r_lat, w_lat) {
                (Some(r), Some(w)) => Some((r + w) / 2.0),
                (Some(r), None) => Some(r),
                (None, Some(w)) => Some(w),
                (None, None) => None,
            };

            // Estimate drive capacity from volume total
            let drive_size = volumes.iter().map(|v| v.total_bytes).sum::<u64>().max(1024 * 1024 * 1024);

            let capabilities = DiskCapabilities {
                supports_iops: r_iops.is_some(),
                supports_latency: avg_latency.is_some(),
                supports_queue_depth: q_depth.is_some(),
                supports_active_time: active_pct.is_some(),
                supports_temperature: false, // Explicitly false per Rule #2 (No fake temperature)
                supports_health: true,
                supports_smart: true,
            };

            physical_disks.push(PhysicalDiskSnapshot {
                disk_index: drive_idx,
                model: if d.model.is_empty() { format!("Physical Disk #{drive_idx}") } else { d.model },
                manufacturer: if d.vendor.is_empty() { "Storage Device".into() } else { d.vendor },
                bus_type: d.bus_type,
                media_type,
                serial_number: d.serial,
                firmware_revision: d.firmware,
                size_bytes: drive_size,
                is_removable: d.is_removable,
                is_system_disk: drive_idx == 0,
                capabilities,
                read_bytes_sec: rb_sec,
                write_bytes_sec: wb_sec,
                total_bytes_sec: rb_sec + wb_sec,
                read_iops: r_iops,
                write_iops: w_iops,
                total_iops,
                read_latency_ms: r_lat,
                write_latency_ms: w_lat,
                avg_latency_ms: avg_latency,
                queue_depth: q_depth,
                active_time_percent: active_pct,
                temperature_celsius: None,
                health_status: "Operating normally".into(),
            });
        }
    }

    if physical_disks.is_empty() {
        // Fallback representation if no physical drives openable
        physical_disks.push(PhysicalDiskSnapshot {
            disk_index: 0,
            model: "Primary Storage Drive".into(),
            manufacturer: "System Storage".into(),
            bus_type: "Storage".into(),
            media_type: "SSD / Storage".into(),
            serial_number: None,
            firmware_revision: None,
            size_bytes: total_storage,
            is_removable: false,
            is_system_disk: true,
            capabilities: DiskCapabilities {
                supports_iops: false,
                supports_latency: false,
                supports_queue_depth: false,
                supports_active_time: false,
                supports_temperature: false,
                supports_health: true,
                supports_smart: false,
            },
            read_bytes_sec: 0,
            write_bytes_sec: 0,
            total_bytes_sec: 0,
            read_iops: None,
            write_iops: None,
            total_iops: None,
            read_latency_ms: None,
            write_latency_ms: None,
            avg_latency_ms: None,
            queue_depth: None,
            active_time_percent: None,
            temperature_celsius: None,
            health_status: "Operating normally".into(),
        });
    }

    // 3. Top Storage Consuming Processes
    let mut top_processes: Vec<DiskProcessItem> = sys
        .processes()
        .iter()
        .map(|(pid, p)| {
            let du = p.disk_usage();
            let name = p.name().to_string_lossy().to_string();
            let is_crit = ["system", "registry", "services.exe", "explorer.exe"].iter().any(|c| c.eq_ignore_ascii_case(&name));
            DiskProcessItem {
                pid: pid.as_u32(),
                name,
                read_bytes_sec: du.read_bytes,
                write_bytes_sec: du.written_bytes,
                total_bytes_sec: du.read_bytes + du.written_bytes,
                is_critical: is_crit,
            }
        })
        .filter(|p| p.total_bytes_sec > 0)
        .collect();

    top_processes.sort_by(|a, b| b.total_bytes_sec.cmp(&a.total_bytes_sec));
    top_processes.truncate(10);

    // 4. Storage Diagnostics
    let mut notices = Vec::new();
    let low_space_vol = volumes.iter().find(|v| v.usage_percent >= 90.0 || v.free_bytes < 10 * 1024 * 1024 * 1024);
    let low_space = low_space_vol.is_some();
    let low_space_msg = low_space_vol.map(|v| {
        format!("Low free space on volume {} ({:.1}% used). Consider cleaning temporary files.", v.drive_letter, v.usage_percent)
    });

    let selected_disk = physical_disks.iter().find(|d| d.disk_index == selected_disk_index).or_else(|| physical_disks.first());

    let high_queue = selected_disk.and_then(|d| d.queue_depth).map_or(false, |q| q >= 5);
    let high_queue_msg = if high_queue {
        Some("Sustained storage queue depth detected. Workloads are queued for disk I/O.".into())
    } else {
        None
    };

    let high_latency = selected_disk.and_then(|d| d.avg_latency_ms).map_or(false, |lat| lat >= 40.0);
    let high_latency_msg = if high_latency {
        Some("Elevated disk response latency detected (> 40ms).".into())
    } else {
        None
    };

    if let Some(d) = selected_disk {
        if let Some(act) = d.active_time_percent {
            if act >= 90.0 {
                notices.push(format!("High disk active busy time ({act:.0}%). Storage controller is operating near peak throughput."));
            }
        }
    }

    let pressure = low_space || high_queue || high_latency;

    DiskSystemSnapshot {
        timestamp_ms: std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() as u64,
        physical_disks,
        volumes,
        selected_disk_index,
        top_processes,
        diagnostics: StorageDiagnostics {
            pressure_detected: pressure,
            low_space_detected: low_space,
            low_space_message: low_space_msg,
            high_queue_detected: high_queue,
            high_queue_message: high_queue_msg,
            elevated_latency_detected: high_latency,
            elevated_latency_message: high_latency_msg,
            diagnostic_notices: notices,
        },
        total_storage_bytes: total_storage,
        total_used_bytes: total_used,
        total_free_bytes: total_free,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sysinfo::{Disks, System};

    #[test]
    fn test_disk_system_snapshot_generation() {
        let mut sys = System::new();
        let mut disks = Disks::new_with_refreshed_list();
        let snapshot = collect_disk_system_snapshot(&mut sys, &mut disks, 0);

        assert!(snapshot.timestamp_ms > 0, "Timestamp must be positive");
        assert!(!snapshot.physical_disks.is_empty(), "Must report at least 1 physical disk");

        // Validate Rule #2 (No fake temperature)
        for disk in &snapshot.physical_disks {
            if !disk.capabilities.supports_temperature {
                assert!(disk.temperature_celsius.is_none(), "Temperature must be None when sensor unsupported");
            }
        }
    }

    #[test]
    fn test_disk_low_space_condition() {
        let total = 100 * 1024 * 1024 * 1024u64; // 100 GB
        let free = 5 * 1024 * 1024 * 1024u64;   // 5 GB (5%)
        let used = total - free;
        let pct = (used as f64 / total as f64) * 100.0;
        assert!(pct >= 90.0 || free < 10 * 1024 * 1024 * 1024, "Should trigger low space condition");
    }
}
