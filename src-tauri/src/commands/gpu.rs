pub use crate::system::gpu::{GpuAdapterSnapshot, GpuInfo, GpuSystemSnapshot};

#[tauri::command]
pub fn get_gpu_system_snapshot(
    selected_index: Option<usize>,
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<GpuSystemSnapshot, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    Ok(crate::system::gpu::collect_gpu_system_snapshot(
        &mut sys,
        selected_index.unwrap_or(0),
    ))
}

#[tauri::command]
pub fn get_gpu_info(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<Vec<GpuInfo>, String> {
    let snapshot = get_gpu_system_snapshot(None, state)?;
    let list = snapshot
        .adapters
        .into_iter()
        .map(|a| GpuInfo {
            name: a.name,
            vendor: a.vendor,
            driver_version: a.driver_version,
            dedicated_memory_bytes: a.memory.dedicated_total_bytes,
            shared_memory_bytes: a.memory.shared_total_bytes,
            utilization_percent: a.utilization_percent,
            memory_utilization_percent: a.memory.dedicated_utilization_percent,
            temperature_celsius: a.thermal.core_temperature_celsius,
            is_primary: a.is_primary,
        })
        .collect();

    Ok(list)
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_gpu_info_does_not_panic() {
        let mut sys = sysinfo::System::new();
        let snapshot = crate::system::gpu::collect_gpu_system_snapshot(&mut sys, 0);
        // Validates that snapshot returns cleanly on any machine (including headless CI)
        assert!(snapshot.timestamp_ms > 0);
    }
}
