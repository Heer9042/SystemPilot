use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, ProcessesToUpdate};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub exe_path: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub virtual_memory_bytes: u64,
    pub disk_read_bytes: u64,
    pub disk_written_bytes: u64,
    pub status: String,
    pub start_time: u64,
    pub priority: String,
    pub is_critical: bool,
}

const CRITICAL_PROCESSES: &[&str] = &[
    "csrss.exe",
    "lsass.exe",
    "smss.exe",
    "services.exe",
    "wininit.exe",
    "winlogon.exe",
    "explorer.exe",
    "dwm.exe",
    "system",
    "registry",
    "systempilot.exe",
];

struct ProcessRawSnapshot {
    pid: u32,
    parent_pid: Option<u32>,
    name: String,
    exe_path: String,
    cpu_usage: f32,
    memory_bytes: u64,
    virtual_memory_bytes: u64,
    disk_read_bytes: u64,
    disk_written_bytes: u64,
    status: String,
    start_time: u64,
    is_critical: bool,
}

#[tauri::command]
pub fn get_processes(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<Vec<ProcessInfo>, String> {
    // 1. Acquire mutex ONLY for rapid snapshot collection, then drop lock immediately
    let raw_list: Vec<ProcessRawSnapshot> = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        // Use lightweight specific refresh
        sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            ProcessRefreshKind::new()
                .with_cpu()
                .with_memory()
                .with_disk_usage(),
        );

        let mut list = Vec::with_capacity(sys.processes().len());
        for (pid, p) in sys.processes() {
            let pid_u32 = pid.as_u32();
            let name = p.name().to_string_lossy().to_string();
            let lower_name = name.to_lowercase();
            let is_critical = CRITICAL_PROCESSES.iter().any(|c| lower_name == *c) || pid_u32 <= 4;
            let exe_path = p
                .exe()
                .map(|path| path.to_string_lossy().to_string())
                .unwrap_or_default();
            let status = format!("{:?}", p.status());
            let disk_usage = p.disk_usage();

            list.push(ProcessRawSnapshot {
                pid: pid_u32,
                parent_pid: p.parent().map(|pp| pp.as_u32()),
                name,
                exe_path,
                cpu_usage: p.cpu_usage(),
                memory_bytes: p.memory(),
                virtual_memory_bytes: p.virtual_memory(),
                disk_read_bytes: disk_usage.read_bytes,
                disk_written_bytes: disk_usage.written_bytes,
                status,
                start_time: p.start_time(),
                is_critical,
            });
        }
        list
    }; // Mutex lock is DROPPED here immediately! SystemState is free for other operations.

    // 2. Build final process list without holding global lock
    let mut procs = Vec::with_capacity(raw_list.len());

    for item in raw_list {
        let priority = if item.is_critical {
            "Normal".to_string()
        } else {
            get_process_priority(item.pid)
        };

        procs.push(ProcessInfo {
            pid: item.pid,
            parent_pid: item.parent_pid,
            name: item.name,
            exe_path: item.exe_path,
            cpu_usage: item.cpu_usage,
            memory_bytes: item.memory_bytes,
            virtual_memory_bytes: item.virtual_memory_bytes,
            disk_read_bytes: item.disk_read_bytes,
            disk_written_bytes: item.disk_written_bytes,
            status: item.status,
            start_time: item.start_time,
            priority,
            is_critical: item.is_critical,
        });
    }

    Ok(procs)
}

fn get_process_priority(pid: u32) -> String {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{
            GetPriorityClass, OpenProcess, ABOVE_NORMAL_PRIORITY_CLASS,
            BELOW_NORMAL_PRIORITY_CLASS, HIGH_PRIORITY_CLASS, IDLE_PRIORITY_CLASS,
            NORMAL_PRIORITY_CLASS, PROCESS_QUERY_LIMITED_INFORMATION, REALTIME_PRIORITY_CLASS,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if !handle.is_null() {
                let prio = GetPriorityClass(handle);
                CloseHandle(handle);
                return match prio {
                    IDLE_PRIORITY_CLASS => "Low".into(),
                    BELOW_NORMAL_PRIORITY_CLASS => "Below Normal".into(),
                    NORMAL_PRIORITY_CLASS => "Normal".into(),
                    ABOVE_NORMAL_PRIORITY_CLASS => "Above Normal".into(),
                    HIGH_PRIORITY_CLASS => "High".into(),
                    REALTIME_PRIORITY_CLASS => "Realtime".into(),
                    _ => "Normal".into(),
                };
            }
        }
    }
    "Normal".into()
}

#[tauri::command]
pub fn terminate_process(pid: u32) -> Result<bool, String> {
    if pid <= 4 {
        return Err("Cannot terminate core system process".into());
    }

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, TerminateProcess, PROCESS_TERMINATE,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if handle.is_null() {
                return Err("Access denied or process not found".into());
            }
            let success = TerminateProcess(handle, 1) != 0;
            CloseHandle(handle);
            if success {
                return Ok(true);
            } else {
                return Err("Failed to terminate process".into());
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        let mut sys = sysinfo::System::new();
        sys.refresh_processes(ProcessesToUpdate::All);
        if let Some(proc_) = sys.process(sysinfo::Pid::from_u32(pid)) {
            proc_.kill();
            Ok(true)
        } else {
            Err("Process not found".into())
        }
    }
}

#[tauri::command]
pub fn set_process_priority(pid: u32, priority: String) -> Result<bool, String> {
    if pid <= 4 {
        return Err("Cannot modify system process priority".into());
    }

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, SetPriorityClass, ABOVE_NORMAL_PRIORITY_CLASS,
            BELOW_NORMAL_PRIORITY_CLASS, HIGH_PRIORITY_CLASS, IDLE_PRIORITY_CLASS,
            NORMAL_PRIORITY_CLASS, PROCESS_SET_INFORMATION,
        };

        let prio_class = match priority.to_lowercase().as_str() {
            "low" | "idle" => IDLE_PRIORITY_CLASS,
            "below normal" | "belownormal" => BELOW_NORMAL_PRIORITY_CLASS,
            "normal" => NORMAL_PRIORITY_CLASS,
            "above normal" | "abovenormal" => ABOVE_NORMAL_PRIORITY_CLASS,
            "high" => HIGH_PRIORITY_CLASS,
            _ => NORMAL_PRIORITY_CLASS,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_SET_INFORMATION, 0, pid);
            if handle.is_null() {
                return Err("Access denied. Administrator privileges may be required.".into());
            }
            let success = SetPriorityClass(handle, prio_class) != 0;
            CloseHandle(handle);
            if success {
                Ok(true)
            } else {
                Err("Failed to set process priority class".into())
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn set_process_affinity(pid: u32, affinity_mask: usize) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, SetProcessAffinityMask, PROCESS_SET_INFORMATION,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_SET_INFORMATION, 0, pid);
            if handle.is_null() {
                return Err("Access denied".into());
            }
            let success = SetProcessAffinityMask(handle, affinity_mask) != 0;
            CloseHandle(handle);
            if success {
                Ok(true)
            } else {
                Err("Failed to set process affinity".into())
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn suspend_process(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SUSPEND_RESUME};

        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle.is_null() {
                return Err("Access denied or process not found".into());
            }

            type NtSuspendProcessFn =
                unsafe extern "system" fn(windows_sys::Win32::Foundation::HANDLE) -> i32;
            let ntdll = windows_sys::Win32::System::LibraryLoader::GetModuleHandleA(
                b"ntdll.dll\0".as_ptr(),
            );
            if !ntdll.is_null() {
                let proc_addr = windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                    ntdll,
                    b"NtSuspendProcess\0".as_ptr(),
                );
                if let Some(func) = proc_addr {
                    let suspend_fn: NtSuspendProcessFn = std::mem::transmute(func);
                    let status = suspend_fn(handle);
                    CloseHandle(handle);
                    return if status >= 0 {
                        Ok(true)
                    } else {
                        Err("NtSuspendProcess failed".into())
                    };
                }
            }
            CloseHandle(handle);
            Err("NtSuspendProcess API unavailable".into())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn resume_process(pid: u32) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::Threading::{OpenProcess, PROCESS_SUSPEND_RESUME};

        unsafe {
            let handle = OpenProcess(PROCESS_SUSPEND_RESUME, 0, pid);
            if handle.is_null() {
                return Err("Access denied or process not found".into());
            }

            type NtResumeProcessFn =
                unsafe extern "system" fn(windows_sys::Win32::Foundation::HANDLE) -> i32;
            let ntdll = windows_sys::Win32::System::LibraryLoader::GetModuleHandleA(
                b"ntdll.dll\0".as_ptr(),
            );
            if !ntdll.is_null() {
                let proc_addr = windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                    ntdll,
                    b"NtResumeProcess\0".as_ptr(),
                );
                if let Some(func) = proc_addr {
                    let resume_fn: NtResumeProcessFn = std::mem::transmute(func);
                    let status = resume_fn(handle);
                    CloseHandle(handle);
                    return if status >= 0 {
                        Ok(true)
                    } else {
                        Err("NtResumeProcess failed".into())
                    };
                }
            }
            CloseHandle(handle);
            Err("NtResumeProcess API unavailable".into())
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}
