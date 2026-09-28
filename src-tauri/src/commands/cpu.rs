pub use crate::system::cpu::{CpuDetailedInfo, CpuSnapshot};

#[tauri::command]
pub fn get_cpu_snapshot(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<CpuSnapshot, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    Ok(crate::system::cpu::collect_cpu_snapshot(&mut sys, Some(&state)))
}

#[tauri::command]
pub fn get_cpu_detailed_info(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<CpuDetailedInfo, String> {
    let snapshot = get_cpu_snapshot(state)?;
    let core_usages: Vec<f32> = snapshot.per_processor.iter().map(|p| p.usage_percent).collect();

    Ok(CpuDetailedInfo {
        brand: snapshot.identity.brand,
        vendor_id: snapshot.identity.vendor_id,
        physical_cores: snapshot.topology.physical_cores,
        logical_cores: snapshot.topology.logical_processors,
        base_frequency_mhz: snapshot.frequency.base_mhz.unwrap_or(snapshot.frequency.current_mhz),
        current_frequency_mhz: snapshot.frequency.current_mhz,
        global_usage: snapshot.utilization.current,
        core_usages,
        temperature_celsius: snapshot.thermal.package_temperature_celsius,
        package_power_watts: snapshot.power.package_power_watts,
    })
}

#[cfg(test)]
mod tests {
    use sysinfo::System;

    #[test]
    fn test_cpu_discovery_and_topology() {
        let mut sys = System::new();
        sys.refresh_cpu_all();
        let cpus = sys.cpus();
        assert!(
            !cpus.is_empty(),
            "System must report at least 1 logical CPU core"
        );
        let logical_cores = cpus.len();
        assert!(logical_cores > 0, "Logical core count must be positive");
        let usage = sys.global_cpu_usage();
        assert!(
            (0.0..=100.0).contains(&usage),
            "CPU global usage must be in [0.0, 100.0]"
        );
    }
}
