use serde::{Deserialize, Serialize};


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetailedMemoryStats {
    pub total_ram: u64,
    pub used_ram: u64,
    pub free_ram: u64,
    pub available_ram: u64,
    pub cached_ram: u64,
    pub standby_ram: u64,
    pub committed_ram: u64,
    pub commit_limit: u64,
    pub paged_pool: u64,
    pub non_paged_pool: u64,
    pub page_file_total: u64,
    pub page_file_used: u64,
    pub usage_percentage: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanMemoryResult {
    pub ram_before: u64,
    pub ram_after: u64,
    pub ram_released: u64,
    pub processes_trimmed: usize,
    pub timestamp: String,
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub fn get_detailed_memory_stats(state: tauri::State<'_, super::system::SystemState>) -> Result<DetailedMemoryStats, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    sys.refresh_memory();

    let total = sys.total_memory();
    let used = sys.used_memory();
    let free = sys.free_memory();
    let available = sys.available_memory();
    let pct = if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 };

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::ProcessStatus::{GetPerformanceInfo, PERFORMANCE_INFORMATION};
        use windows_sys::Win32::System::SystemInformation::{GlobalMemoryStatusEx, MEMORYSTATUSEX};

        unsafe {
            let mut mem_status: MEMORYSTATUSEX = std::mem::zeroed();
            mem_status.dwLength = std::mem::size_of::<MEMORYSTATUSEX>() as u32;
            let _ = GlobalMemoryStatusEx(&mut mem_status);

            let mut perf_info: PERFORMANCE_INFORMATION = std::mem::zeroed();
            perf_info.cb = std::mem::size_of::<PERFORMANCE_INFORMATION>() as u32;
            let perf_ok = GetPerformanceInfo(&mut perf_info, std::mem::size_of::<PERFORMANCE_INFORMATION>() as u32) != 0;

            let page_size = if perf_ok && perf_info.PageSize > 0 { perf_info.PageSize as u64 } else { 4096 };

            let committed_ram = if perf_ok { perf_info.CommitTotal as u64 * page_size } else { mem_status.ullTotalPageFile - mem_status.ullAvailPageFile };
            let commit_limit = if perf_ok { perf_info.CommitLimit as u64 * page_size } else { mem_status.ullTotalPageFile };
            let paged_pool = if perf_ok { perf_info.KernelPaged as u64 * page_size } else { 0 };
            let non_paged_pool = if perf_ok { perf_info.KernelNonpaged as u64 * page_size } else { 0 };
            let cached_ram = if perf_ok { (perf_info.SystemCache as u64) * page_size } else { 0 };

            return Ok(DetailedMemoryStats {
                total_ram: total,
                used_ram: used,
                free_ram: free,
                available_ram: available,
                cached_ram,
                standby_ram: cached_ram.saturating_sub(used),
                committed_ram,
                commit_limit,
                paged_pool,
                non_paged_pool,
                page_file_total: mem_status.ullTotalPageFile,
                page_file_used: mem_status.ullTotalPageFile.saturating_sub(mem_status.ullAvailPageFile),
                usage_percentage: pct,
            });
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(DetailedMemoryStats {
            total_ram: total,
            used_ram: used,
            free_ram: free,
            available_ram: available,
            cached_ram: 0,
            standby_ram: 0,
            committed_ram: used,
            commit_limit: total,
            paged_pool: 0,
            non_paged_pool: 0,
            page_file_total: sys.total_swap(),
            page_file_used: sys.used_swap(),
            usage_percentage: pct,
        })
    }
}

#[tauri::command]
pub fn clean_memory(
    state: tauri::State<'_, super::system::SystemState>,
    db: tauri::State<'_, super::super::db::Database>,
) -> Result<CleanMemoryResult, String> {
    let ram_before = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_memory();
        sys.used_memory()
    };

    let mut trimmed_count = 0usize;

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::CloseHandle;
        use windows_sys::Win32::System::ProcessStatus::EmptyWorkingSet;
        use windows_sys::Win32::System::Threading::{
            OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_SET_QUOTA,
        };

        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

        for (pid, proc_) in sys.processes() {
            let pid_u32 = pid.as_u32();
            if pid_u32 <= 4 {
                continue; // Skip system idle & kernel
            }
            let name = proc_.name().to_string_lossy().to_lowercase();

            // Don't trim critical core processes or SystemPilot itself
            if name.contains("systempilot") || name.contains("csrss") || name.contains("lsass") {
                continue;
            }

            unsafe {
                let handle = OpenProcess(PROCESS_QUERY_INFORMATION | PROCESS_SET_QUOTA, 0, pid_u32);
                if !handle.is_null() {
                    if EmptyWorkingSet(handle) != 0 {
                        trimmed_count += 1;
                    }
                    CloseHandle(handle);
                }
            }
        }
    }

    // Refresh memory after cleanup
    std::thread::sleep(std::time::Duration::from_millis(150));
    let ram_after = {
        let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
        sys.refresh_memory();
        sys.used_memory()
    };

    let released = ram_before.saturating_sub(ram_after);
    let now = chrono::Local::now().to_rfc3339();

    let msg = format!(
        "Trimmed {} processes. Released {:.2} MB of working set memory.",
        trimmed_count,
        released as f64 / (1024.0 * 1024.0)
    );

    // Save log in SQLite
    let _ = db.add_cleanup_log(released, "RAM Working Set Trim", true);

    Ok(CleanMemoryResult {
        ram_before,
        ram_after,
        ram_released: released,
        processes_trimmed: trimmed_count,
        timestamp: now,
        success: true,
        message: msg,
    })
}
