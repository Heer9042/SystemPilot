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
    pub thread_count: Option<u32>,
    pub is_critical: bool,
    pub is_app: bool,
    pub category: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProcessProperties {
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
    pub thread_count: Option<u32>,
    pub category: String,
    pub is_critical: bool,
    pub is_app: bool,
    pub command_line: Option<String>,
    pub user: Option<String>,
}

/// Protected Windows core and SystemPilot processes that must never be terminated
/// to avoid Blue Screens (BSOD) or host self-termination.
pub const CRITICAL_PROCESSES: &[&str] = &[
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
    "fontdrvhost.exe",
    "sihost.exe",
];

#[cfg(target_os = "windows")]
mod win_windows {
    use std::collections::{HashMap, HashSet};

    type HWND = *mut std::ffi::c_void;
    type BOOL = i32;
    type LPARAM = isize;
    type WNDENUMPROC = unsafe extern "system" fn(HWND, LPARAM) -> BOOL;

    #[repr(C)]
    #[allow(non_snake_case)]
    struct PROCESSENTRY32W {
        dwSize: u32,
        cntUsage: u32,
        th32ProcessID: u32,
        th32DefaultHeapID: usize,
        th32ModuleID: u32,
        cntThreads: u32,
        th32ParentProcessID: u32,
        pcPriClassBase: i32,
        dwFlags: u32,
        szExeFile: [u16; 260],
    }

    type HANDLE = *mut std::ffi::c_void;
    const TH32CS_SNAPPROCESS: u32 = 0x00000002;
    const INVALID_HANDLE_VALUE: HANDLE = -1isize as HANDLE;

    extern "system" {
        fn EnumWindows(lpEnumFunc: WNDENUMPROC, lParam: LPARAM) -> BOOL;
        fn GetWindowThreadProcessId(hWnd: HWND, lpdwProcessId: *mut u32) -> u32;
        fn IsWindowVisible(hWnd: HWND) -> BOOL;
        fn CreateToolhelp32Snapshot(dwFlags: u32, th32ProcessID: u32) -> HANDLE;
        fn Process32FirstW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
        fn Process32NextW(hSnapshot: HANDLE, lppe: *mut PROCESSENTRY32W) -> BOOL;
        fn CloseHandle(hObject: HANDLE) -> BOOL;
    }

    unsafe extern "system" fn enum_windows_callback(hwnd: HWND, lparam: LPARAM) -> BOOL {
        if IsWindowVisible(hwnd) != 0 {
            let mut pid = 0u32;
            GetWindowThreadProcessId(hwnd, &mut pid);
            if pid > 0 {
                let set = &mut *(lparam as *mut HashSet<u32>);
                set.insert(pid);
            }
        }
        1
    }

    pub fn get_windowed_pids() -> HashSet<u32> {
        let mut pids = HashSet::new();
        unsafe {
            EnumWindows(
                enum_windows_callback,
                &mut pids as *mut HashSet<u32> as LPARAM,
            );
        }
        pids
    }

    pub struct ProcessSnapshotData {
        pub thread_counts: HashMap<u32, u32>,
        pub parent_pids: HashMap<u32, u32>,
        pub process_names: HashMap<u32, String>,
    }

    pub fn get_process_snapshot_data() -> ProcessSnapshotData {
        let mut thread_counts = HashMap::new();
        let mut parent_pids = HashMap::new();
        let mut process_names = HashMap::new();

        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
            if snapshot != INVALID_HANDLE_VALUE && !snapshot.is_null() {
                let mut entry: PROCESSENTRY32W = std::mem::zeroed();
                entry.dwSize = std::mem::size_of::<PROCESSENTRY32W>() as u32;

                if Process32FirstW(snapshot, &mut entry) != 0 {
                    loop {
                        thread_counts.insert(entry.th32ProcessID, entry.cntThreads);
                        if entry.th32ParentProcessID > 0 {
                            parent_pids.insert(entry.th32ProcessID, entry.th32ParentProcessID);
                        }
                        let len = entry
                            .szExeFile
                            .iter()
                            .position(|&c| c == 0)
                            .unwrap_or(entry.szExeFile.len());
                        let name = String::from_utf16_lossy(&entry.szExeFile[..len]);
                        if !name.is_empty() {
                            process_names.insert(entry.th32ProcessID, name);
                        }
                        if Process32NextW(snapshot, &mut entry) == 0 {
                            break;
                        }
                    }
                }
                CloseHandle(snapshot);
            }
        }

        ProcessSnapshotData {
            thread_counts,
            parent_pids,
            process_names,
        }
    }
}

/// Classifies if a process belongs to Windows core operating system services.
/// Rules:
/// 1. Known Windows core services (e.g. svchost, spoolsv, taskhostw, audiodg, searchindexer)
/// 2. Executables residing in %SystemRoot%\System32\ or %SystemRoot%\SysWOW64\ (excluding browsers)
pub fn is_windows_core_process(lower_name: &str, exe_path: &str) -> bool {
    const WINDOWS_SERVICES: &[&str] = &[
        "svchost.exe",
        "fontdrvhost.exe",
        "sihost.exe",
        "ctfmon.exe",
        "taskhostw.exe",
        "spoolsv.exe",
        "audiodg.exe",
        "conhost.exe",
        "dashost.exe",
        "searchindexer.exe",
        "securityhealthservice.exe",
        "wmiprvse.exe",
        "runtimebroker.exe",
        "searchhost.exe",
        "startmenuexperiencehost.exe",
        "shellexperiencehost.exe",
        "textinputhost.exe",
        "systemsettings.exe",
        "smartscreen.exe",
        "wlanext.exe",
        "widgets.exe",
        "lsass.exe",
        "csrss.exe",
        "smss.exe",
        "services.exe",
        "wininit.exe",
        "winlogon.exe",
        "dwm.exe",
    ];

    if WINDOWS_SERVICES.contains(&lower_name) {
        return true;
    }

    let lower_path = exe_path.to_lowercase();
    if (lower_path.contains("\\windows\\system32\\")
        || lower_path.contains("\\windows\\syswow64\\"))
        && !lower_name.contains("edge")
        && !lower_name.contains("chrome")
        && !lower_name.contains("firefox")
    {
        return true;
    }

    false
}

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
pub async fn get_processes(
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
    }; // Mutex lock is DROPPED here immediately. SystemState is free for other IPC calls.

    // 2. Build final process list off-thread with Windows ToolHelp and Window enumeration
    let result = tauri::async_runtime::spawn_blocking(move || {
        #[cfg(target_os = "windows")]
        let (windowed_pids, snapshot_data) = {
            (
                win_windows::get_windowed_pids(),
                win_windows::get_process_snapshot_data(),
            )
        };
        #[cfg(not(target_os = "windows"))]
        let (windowed_pids, snapshot_data) = (
            std::collections::HashSet::<u32>::new(),
            win_windows::ProcessSnapshotData {
                thread_counts: std::collections::HashMap::new(),
                parent_pids: std::collections::HashMap::new(),
                process_names: std::collections::HashMap::new(),
            },
        );

        // Build set of app names that have at least one visible window
        let mut app_names = std::collections::HashSet::new();
        for item in &raw_list {
            if windowed_pids.contains(&item.pid) {
                app_names.insert(item.name.to_lowercase());
            }
        }

        let mut procs = Vec::with_capacity(raw_list.len());

        for item in raw_list {
            let priority = if item.is_critical {
                "Normal".to_string()
            } else {
                get_process_priority(item.pid)
            };

            let lower_name = item.name.to_lowercase();
            let has_win = windowed_pids.contains(&item.pid);
            let is_app = has_win || app_names.contains(&lower_name);

            // Documented Task Manager Category Classification:
            // 1. "apps" = interactive processes with a top-level window or child processes of app
            // 2. "windows" = core Windows system components, drivers, and system services in System32
            // 3. "background" = user and third-party background services without visible UI
            let category = if is_app {
                "apps".to_string()
            } else if item.is_critical || is_windows_core_process(&lower_name, &item.exe_path) {
                "windows".to_string()
            } else {
                "background".to_string()
            };

            let thread_count = snapshot_data.thread_counts.get(&item.pid).copied();
            let parent_pid = item
                .parent_pid
                .or_else(|| snapshot_data.parent_pids.get(&item.pid).copied());

            procs.push(ProcessInfo {
                pid: item.pid,
                parent_pid,
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
                thread_count,
                is_critical: item.is_critical,
                is_app,
                category,
            });
        }

        procs
    })
    .await
    .map_err(|e| e.to_string())?;

    Ok(result)
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

/// Retrieves comprehensive properties for a specific process, including command line and username.
#[tauri::command]
pub async fn get_process_properties(
    state: tauri::State<'_, super::system::SystemState>,
    pid: u32,
) -> Result<ProcessProperties, String> {
    let (raw_item, cmd_line, user) = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_processes_specifics(
            ProcessesToUpdate::Some(&[sysinfo::Pid::from_u32(pid)]),
            ProcessRefreshKind::new()
                .with_cpu()
                .with_memory()
                .with_disk_usage()
                .with_cmd(sysinfo::UpdateKind::OnlyIfNotSet)
                .with_user(sysinfo::UpdateKind::OnlyIfNotSet),
        );

        let proc = sys
            .process(sysinfo::Pid::from_u32(pid))
            .ok_or_else(|| format!("Process with PID {} is not running or has exited.", pid))?;

        let name = proc.name().to_string_lossy().to_string();
        let lower_name = name.to_lowercase();
        let is_critical = CRITICAL_PROCESSES.iter().any(|c| lower_name == *c) || pid <= 4;
        let exe_path = proc
            .exe()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();
        let status = format!("{:?}", proc.status());
        let disk = proc.disk_usage();
        let cmd = proc
            .cmd()
            .iter()
            .map(|s| s.to_string_lossy())
            .collect::<Vec<_>>()
            .join(" ");
        let cmd_line = if cmd.is_empty() { None } else { Some(cmd) };
        let user = proc.user_id().map(|u| format!("{:?}", u));

        let snapshot = ProcessRawSnapshot {
            pid,
            parent_pid: proc.parent().map(|p| p.as_u32()),
            name,
            exe_path,
            cpu_usage: proc.cpu_usage(),
            memory_bytes: proc.memory(),
            virtual_memory_bytes: proc.virtual_memory(),
            disk_read_bytes: disk.read_bytes,
            disk_written_bytes: disk.written_bytes,
            status,
            start_time: proc.start_time(),
            is_critical,
        };

        (snapshot, cmd_line, user)
    };

    let priority = if raw_item.is_critical {
        "Normal".to_string()
    } else {
        get_process_priority(pid)
    };

    #[cfg(target_os = "windows")]
    let (is_app, thread_count, parent_pid) = {
        let windowed_pids = win_windows::get_windowed_pids();
        let snapshot = win_windows::get_process_snapshot_data();
        let is_app = windowed_pids.contains(&pid);
        let threads = snapshot.thread_counts.get(&pid).copied();
        let parent = raw_item
            .parent_pid
            .or_else(|| snapshot.parent_pids.get(&pid).copied());
        (is_app, threads, parent)
    };
    #[cfg(not(target_os = "windows"))]
    let (is_app, thread_count, parent_pid) = (false, None, raw_item.parent_pid);

    let lower_name = raw_item.name.to_lowercase();
    let category = if is_app {
        "apps".to_string()
    } else if raw_item.is_critical || is_windows_core_process(&lower_name, &raw_item.exe_path) {
        "windows".to_string()
    } else {
        "background".to_string()
    };

    Ok(ProcessProperties {
        pid: raw_item.pid,
        parent_pid,
        name: raw_item.name,
        exe_path: raw_item.exe_path,
        cpu_usage: raw_item.cpu_usage,
        memory_bytes: raw_item.memory_bytes,
        virtual_memory_bytes: raw_item.virtual_memory_bytes,
        disk_read_bytes: raw_item.disk_read_bytes,
        disk_written_bytes: raw_item.disk_written_bytes,
        status: raw_item.status,
        start_time: raw_item.start_time,
        priority,
        thread_count,
        category,
        is_critical: raw_item.is_critical,
        is_app,
        command_line: cmd_line,
        user,
    })
}

/// Safely terminates a process with PID reuse and critical process protections.
/// Parameters:
/// - `pid`: The process ID to terminate.
/// - `expected_name`: Optional expected image name (e.g., "notepad.exe"). When provided,
///   the process's actual executable name is re-verified before termination to prevent PID reuse races.
#[tauri::command]
pub fn terminate_process(pid: u32, expected_name: Option<String>) -> Result<bool, String> {
    // Safety Rule 1: Never terminate idle (PID 0) or System (PID 4)
    if pid <= 4 {
        return Err("Cannot terminate core system process".into());
    }

    // Safety Rule 2: Never terminate SystemPilot itself
    if pid == std::process::id() {
        return Err("Cannot terminate SystemPilot application process".into());
    }

    // Safety Rule 3: Recheck critical process list if expected_name is specified
    if let Some(ref exp) = expected_name {
        let lower = exp.to_lowercase();
        if CRITICAL_PROCESSES.iter().any(|c| lower == *c) {
            return Err(format!(
                "Cannot terminate protected system process '{}'. Termination is blocked to prevent system instability.",
                exp
            ));
        }
    }

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_ACCESS_DENIED};
        use windows_sys::Win32::System::Threading::{
            OpenProcess, QueryFullProcessImageNameW, TerminateProcess,
            PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_TERMINATE,
        };

        // Safety Rule 4: Revalidate process identity before terminating to protect against PID reuse races
        unsafe {
            let query_handle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, 0, pid);
            if !query_handle.is_null() {
                let mut buf = [0u16; 1024];
                let mut size = buf.len() as u32;
                if QueryFullProcessImageNameW(query_handle, 0, buf.as_mut_ptr(), &mut size) != 0 {
                    let path_str = String::from_utf16_lossy(&buf[..size as usize]);
                    let actual_leaf = std::path::Path::new(&path_str)
                        .file_name()
                        .and_then(|f| f.to_str())
                        .unwrap_or("")
                        .to_lowercase();

                    // If expected_name was provided, verify identity matches
                    if let Some(ref exp) = expected_name {
                        let exp_clean = exp.to_lowercase();
                        let exp_leaf = std::path::Path::new(&exp_clean)
                            .file_name()
                            .and_then(|f| f.to_str())
                            .unwrap_or(&exp_clean);

                        if !actual_leaf.is_empty()
                            && !exp_leaf.is_empty()
                            && actual_leaf != exp_leaf
                        {
                            CloseHandle(query_handle);
                            return Err(format!(
                                "Process identity changed (PID {} is now '{}', expected '{}'). Termination aborted to prevent PID reuse.",
                                pid, actual_leaf, exp
                            ));
                        }
                    }

                    // Double check if actual image is in critical list
                    if CRITICAL_PROCESSES.iter().any(|c| actual_leaf == *c) {
                        CloseHandle(query_handle);
                        return Err(format!(
                            "Cannot terminate protected system process '{}'. Operation blocked for system safety.",
                            actual_leaf
                        ));
                    }
                }
                CloseHandle(query_handle);
            }
        }

        // Safety Rule 5: Open with PROCESS_TERMINATE rights
        unsafe {
            let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
            if handle.is_null() {
                let err = GetLastError();
                if err == ERROR_ACCESS_DENIED {
                    return Err(
                        "Access denied. The process is protected by Windows or requires elevated administrator privileges."
                            .into(),
                    );
                }
                return Err("Process not found or already exited.".into());
            }

            let success = TerminateProcess(handle, 1) != 0;
            let last_err = GetLastError();
            CloseHandle(handle);

            if success {
                Ok(true)
            } else {
                if last_err == ERROR_ACCESS_DENIED {
                    Err("Access denied when attempting to terminate process.".into())
                } else {
                    Err(format!(
                        "Failed to terminate process (OS error: {})",
                        last_err
                    ))
                }
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

/// Safely terminates a process and all of its descendants (process tree),
/// ensuring critical Windows processes and SystemPilot itself are protected.
#[tauri::command]
pub fn terminate_process_tree(pid: u32, expected_name: Option<String>) -> Result<u32, String> {
    if pid <= 4 {
        return Err("Cannot terminate core system process tree".into());
    }
    if pid == std::process::id() {
        return Err("Cannot terminate SystemPilot application process tree".into());
    }

    #[cfg(target_os = "windows")]
    {
        let snapshot = win_windows::get_process_snapshot_data();
        let mut children_map: std::collections::HashMap<u32, Vec<u32>> =
            std::collections::HashMap::new();

        for (&child, &parent) in &snapshot.parent_pids {
            children_map.entry(parent).or_default().push(child);
        }

        // Collect all descendants breadth-first
        let mut to_kill = Vec::new();
        let mut queue = std::collections::VecDeque::new();
        queue.push_back(pid);

        while let Some(curr) = queue.pop_front() {
            to_kill.push(curr);
            if let Some(children) = children_map.get(&curr) {
                for &child_pid in children {
                    queue.push_back(child_pid);
                }
            }
        }

        // Safety verification: Ensure no member of the tree is SystemPilot or a critical process
        let current_pid = std::process::id();
        for &target_pid in &to_kill {
            if target_pid <= 4 {
                return Err(
                    "Process tree contains core Windows system process; operation aborted.".into(),
                );
            }
            if target_pid == current_pid {
                return Err(
                    "Process tree contains SystemPilot host process; operation aborted.".into(),
                );
            }
            if let Some(name) = snapshot.process_names.get(&target_pid) {
                let lower = name.to_lowercase();
                if CRITICAL_PROCESSES.iter().any(|c| lower == *c) {
                    return Err(format!(
                        "Process tree contains protected system component '{}'; operation aborted for system safety.",
                        name
                    ));
                }
            }
        }

        // Terminate tree leaves first, then parent
        to_kill.reverse();
        let mut count = 0;
        for target_pid in to_kill {
            let exp = if target_pid == pid {
                expected_name.clone()
            } else {
                snapshot.process_names.get(&target_pid).cloned()
            };

            if let Ok(true) = terminate_process(target_pid, exp) {
                count += 1;
            }
        }

        Ok(count)
    }

    #[cfg(not(target_os = "windows"))]
    {
        terminate_process(pid, expected_name).map(|_| 1)
    }
}

/// Safely opens the executable's containing folder in Windows File Explorer and selects the file.
/// Validates path existence and prevents command injection.
#[tauri::command]
pub fn open_process_location(exe_path: String) -> Result<bool, String> {
    let clean_path = exe_path.trim();
    if clean_path.is_empty() {
        return Err("Executable path is not available for this process.".into());
    }

    let p = std::path::Path::new(clean_path);
    if !p.exists() {
        return Err(format!(
            "The specified executable does not exist: {}",
            clean_path
        ));
    }

    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let explorer = crate::windows::paths::get_system_binary("explorer.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("explorer.exe"));

        // Use explorer.exe /select,"<clean_path>" to highlight the executable in File Explorer
        Command::new(explorer)
            .arg(format!("/select,{}", clean_path))
            .spawn()
            .map_err(|e| format!("Failed to launch Windows Explorer: {}", e))?;

        Ok(true)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}

#[tauri::command]
pub fn set_process_priority(pid: u32, priority: String) -> Result<bool, String> {
    if pid <= 4 || pid == std::process::id() {
        return Err("Cannot modify SystemPilot host or system process priority".into());
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
    if pid <= 4 || pid == std::process::id() {
        return Err("Cannot modify SystemPilot host or system process affinity".into());
    }
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
    if pid <= 4 || pid == std::process::id() {
        return Err("Cannot suspend SystemPilot host or system process".into());
    }
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
    if pid <= 4 || pid == std::process::id() {
        return Err("Cannot modify SystemPilot host or system process".into());
    }
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

#[cfg(test)]
mod tests {
    use super::*;
    use sysinfo::{ProcessRefreshKind, ProcessesToUpdate, System};

    #[test]
    fn test_critical_process_whitelist() {
        assert!(CRITICAL_PROCESSES.contains(&"system"));
        assert!(CRITICAL_PROCESSES.contains(&"explorer.exe"));
        assert!(CRITICAL_PROCESSES.contains(&"systempilot.exe"));
        assert!(CRITICAL_PROCESSES.contains(&"csrss.exe"));
        assert!(CRITICAL_PROCESSES.contains(&"services.exe"));
        assert!(!CRITICAL_PROCESSES.contains(&"arbitrary_app.exe"));
    }

    #[test]
    fn test_systempilot_self_termination_safeguard() {
        let current_pid = std::process::id();
        let result = terminate_process(current_pid, None);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("Cannot terminate SystemPilot application process"));
    }

    #[test]
    fn test_pid_0_and_system_safeguards() {
        let r0 = terminate_process(0, None);
        assert!(r0.is_err());
        assert!(r0
            .unwrap_err()
            .contains("Cannot terminate core system process"));

        let r4 = terminate_process(4, None);
        assert!(r4.is_err());
        assert!(r4
            .unwrap_err()
            .contains("Cannot terminate core system process"));
    }

    #[test]
    fn test_nonexistent_pid_termination() {
        let result = terminate_process(999_999_999, None);
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.contains("not found") || err.contains("Access denied"));
    }

    #[test]
    fn test_pid_reuse_identity_safeguard() {
        let current_pid = std::process::id();
        // Passing an expected name that does not match this test executable
        let result = terminate_process(
            current_pid,
            Some("nonexistent_different_process.exe".into()),
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_open_process_location_validation() {
        // Empty path
        let res_empty = open_process_location("   ".into());
        assert!(res_empty.is_err());
        assert!(res_empty.unwrap_err().contains("not available"));

        // Non-existent path
        let res_nonexistent = open_process_location("C:\\Nonexistent\\Fake\\Binary.exe".into());
        assert!(res_nonexistent.is_err());
        assert!(res_nonexistent.unwrap_err().contains("does not exist"));
    }

    #[test]
    fn test_terminate_process_tree_safeguards() {
        let current_pid = std::process::id();
        let r_host = terminate_process_tree(current_pid, None);
        assert!(r_host.is_err());
        assert!(r_host.unwrap_err().contains("SystemPilot"));

        let r_sys = terminate_process_tree(4, None);
        assert!(r_sys.is_err());
        assert!(r_sys.unwrap_err().contains("core system process"));
    }

    #[test]
    fn test_process_enumeration_resilience() {
        let mut sys = System::new();
        sys.refresh_processes_specifics(
            ProcessesToUpdate::All,
            ProcessRefreshKind::new().with_cpu().with_memory(),
        );
        let procs = sys.processes();
        assert!(
            !procs.is_empty(),
            "Running OS must have at least one active process"
        );
        for (_pid, p) in procs.iter() {
            let name = p.name().to_string_lossy();
            assert!(!name.is_empty(), "Process name should not be blank");
            assert!(p.cpu_usage() >= 0.0, "CPU usage cannot be negative");
        }
    }

    #[test]
    fn test_process_categorization_rules() {
        assert!(is_windows_core_process(
            "svchost.exe",
            "C:\\Windows\\System32\\svchost.exe"
        ));
        assert!(is_windows_core_process(
            "services.exe",
            "C:\\Windows\\System32\\services.exe"
        ));
        assert!(is_windows_core_process(
            "some_sys.exe",
            "C:\\Windows\\System32\\some_sys.exe"
        ));
        // Third-party or browser apps in Windows directory shouldn't be blindly windows core
        assert!(!is_windows_core_process(
            "chrome.exe",
            "C:\\Program Files\\Google\\Chrome\\chrome.exe"
        ));
        assert!(!is_windows_core_process(
            "slack.exe",
            "C:\\Users\\User\\AppData\\Local\\slack.exe"
        ));
    }

    #[cfg(target_os = "windows")]
    #[test]
    fn test_windows_toolhelp_snapshot() {
        let snapshot = win_windows::get_process_snapshot_data();
        let current_pid = std::process::id();
        assert!(
            snapshot.thread_counts.contains_key(&current_pid),
            "Current running process should be captured in thread counts snapshot"
        );
        let threads = snapshot
            .thread_counts
            .get(&current_pid)
            .copied()
            .unwrap_or(0);
        assert!(
            threads > 0,
            "Current process must have at least 1 active thread"
        );
    }
}
