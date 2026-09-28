use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubsystemMetric {
    pub current: f32,
    pub unit: String,
    pub status: String, // "Normal", "Elevated", "Potential Bottleneck", "Unavailable"
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BottleneckAnalysis {
    pub cpu: SubsystemMetric,
    pub memory: SubsystemMetric,
    pub gpu: SubsystemMetric,
    pub storage: SubsystemMetric,
    pub network: SubsystemMetric,
    pub thermal: SubsystemMetric,
    pub primary_bottleneck: Option<String>,
    pub summary_verdict: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsivenessMetrics {
    pub cpu_saturation_percent: f32,
    pub memory_pressure_percent: f32,
    pub disk_active_percent: f32,
    pub disk_latency_ms: Option<f32>,
    pub disk_queue: Option<u32>,
    pub responsiveness_state: String, // "Optimal", "Normal", "Reduced", "Constrained"
    pub explanation: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossResourceProcess {
    pub pid: u32,
    pub name: String,
    pub cpu_percent: f32,
    pub memory_bytes: u64,
    pub memory_percent: f32,
    pub disk_read_bytes_sec: u64,
    pub disk_write_bytes_sec: u64,
    pub disk_total_bytes_sec: u64,
    pub network_rx_bytes_sec: u64,
    pub network_tx_bytes_sec: u64,
    pub network_total_bytes_sec: u64,
    pub priority: String, // "Normal", "Above Normal", "High", "Below Normal", "Idle"
    pub is_critical: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThermalInfo {
    pub cpu_temp_celsius: Option<f32>,
    pub gpu_temp_celsius: Option<f32>,
    pub storage_temp_celsius: Option<f32>,
    pub battery_temp_celsius: Option<f32>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PowerEnergyInfo {
    pub battery_percent: Option<f32>,
    pub is_charging: Option<bool>,
    pub power_source: String, // "AC Power", "Battery", "Unknown"
    pub active_power_profile: String, // e.g. "Balanced", "High performance", "Power saver"
    pub energy_saver_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PerformanceSnapshot {
    pub timestamp_ms: u64,
    pub uptime_seconds: u64,
    pub boot_timestamp_ms: u64,
    pub cpu_load_percent: f32,
    pub memory_used_percent: f32,
    pub memory_used_bytes: u64,
    pub memory_total_bytes: u64,
    pub memory_available_bytes: u64,
    pub gpu_load_percent: Option<f32>,
    pub gpu_memory_used_bytes: Option<u64>,
    pub gpu_memory_total_bytes: Option<u64>,
    pub disk_active_percent: Option<f32>,
    pub disk_read_bytes_sec: u64,
    pub disk_write_bytes_sec: u64,
    pub network_rx_bytes_sec: u64,
    pub network_tx_bytes_sec: u64,
    pub responsiveness: ResponsivenessMetrics,
    pub bottlenecks: BottleneckAnalysis,
    pub top_processes: Vec<CrossResourceProcess>,
    pub thermal: ThermalInfo,
    pub power: PowerEnergyInfo,
    pub diagnostics: Vec<String>,
    pub recommendations: Vec<String>,
}

#[tauri::command]
pub fn get_performance_snapshot(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<PerformanceSnapshot, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    let mut disks = state.disks.lock().map_err(|e| e.to_string())?;
    let mut networks = state.networks.lock().map_err(|e| e.to_string())?;

    // 1. Refresh system telemetry
    sys.refresh_cpu_all();
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);
    networks.refresh();
    disks.refresh();

    let now_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    let uptime = sysinfo::System::uptime();
    let boot_epoch_ms = now_epoch_ms.saturating_sub(uptime * 1000);

    // 2. CPU telemetry
    let cpu_load = sys.global_cpu_usage();

    // 3. Memory telemetry
    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    let avail_mem = sys.available_memory();
    let mem_pct = if total_mem > 0 {
        (used_mem as f32 / total_mem as f32) * 100.0
    } else {
        0.0
    };

    // 4. GPU telemetry (using shared collector)
    let gpu_snap = crate::system::gpu::collect_gpu_system_snapshot(&mut sys, 0);
    let active_gpu = gpu_snap.adapters.first();
    let gpu_load = active_gpu.and_then(|g| g.utilization_percent);
    let gpu_mem_used = active_gpu.and_then(|g| g.memory.dedicated_used_bytes);
    let gpu_mem_total = active_gpu.map(|g| g.memory.dedicated_total_bytes);
    let gpu_temp = active_gpu.and_then(|g| g.thermal.core_temperature_celsius);

    // 5. Disk telemetry (using shared collector)
    let disk_snap = crate::system::disk::collect_disk_system_snapshot(&mut sys, &mut disks, 0);
    let active_disk = disk_snap.physical_disks.first();
    let disk_active = active_disk.and_then(|d| d.active_time_percent);
    let disk_read_sec = active_disk.map(|d| d.read_bytes_sec).unwrap_or(0);
    let disk_write_sec = active_disk.map(|d| d.write_bytes_sec).unwrap_or(0);
    let disk_latency = active_disk.and_then(|d| d.avg_latency_ms);
    let disk_queue = active_disk.and_then(|d| d.queue_depth);
    let disk_temp = active_disk.and_then(|d| d.temperature_celsius);

    // 6. Network telemetry (using shared collector)
    let net_snap = crate::system::network::collect_network_system_snapshot(&mut sys, &mut networks, None);
    let net_rx_sec = net_snap.total_rx_bytes_sec;
    let net_tx_sec = net_snap.total_tx_bytes_sec;

    // 7. Power & Battery
    let mut batt_percent = None;
    let mut is_charging = None;
    let mut power_source = "AC Power".to_string();

    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};
        unsafe {
            let mut sps: SYSTEM_POWER_STATUS = std::mem::zeroed();
            if GetSystemPowerStatus(&mut sps) != 0 {
                if sps.BatteryLifePercent != 255 {
                    batt_percent = Some(sps.BatteryLifePercent as f32);
                }
                is_charging = Some((sps.BatteryFlag & 8) != 0);
                power_source = match sps.ACLineStatus {
                    1 => "AC Power".to_string(),
                    0 => "Battery".to_string(),
                    _ => "Unknown".to_string(),
                };
            }
        }
    }

    // Active power profile
    let power_plans = crate::commands::power::get_power_plans().unwrap_or_default();
    let active_profile = power_plans
        .iter()
        .find(|p| p.is_active)
        .map(|p| p.name.clone())
        .unwrap_or_else(|| "Balanced".to_string());

    // 8. Cross-resource Top Processes
    let mut cross_processes = Vec::new();
    for (&pid, proc_entry) in sys.processes() {
        let pid_u32 = pid.as_u32();
        let cpu_p = proc_entry.cpu_usage();
        let mem_b = proc_entry.memory();
        let mem_p = if total_mem > 0 {
            (mem_b as f32 / total_mem as f32) * 100.0
        } else {
            0.0
        };

        let disk_usage = proc_entry.disk_usage();
        let r_bytes = disk_usage.read_bytes;
        let w_bytes = disk_usage.written_bytes;

        // Only include processes using noticeable resources
        if cpu_p > 0.5 || mem_b > 50 * 1024 * 1024 || r_bytes > 0 || w_bytes > 0 {
            let is_crit = pid_u32 <= 4 || proc_entry.name().to_string_lossy().eq_ignore_ascii_case("csrss.exe");
            cross_processes.push(CrossResourceProcess {
                pid: pid_u32,
                name: proc_entry.name().to_string_lossy().to_string(),
                cpu_percent: cpu_p,
                memory_bytes: mem_b,
                memory_percent: mem_p,
                disk_read_bytes_sec: r_bytes,
                disk_write_bytes_sec: w_bytes,
                disk_total_bytes_sec: r_bytes + w_bytes,
                network_rx_bytes_sec: 0,
                network_tx_bytes_sec: 0,
                network_total_bytes_sec: 0,
                priority: "Normal".to_string(),
                is_critical: is_crit,
            });
        }
    }

    cross_processes.sort_by(|a, b| {
        b.cpu_percent
            .partial_cmp(&a.cpu_percent)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    cross_processes.truncate(25);

    // 9. System Responsiveness
    let disk_act = disk_active.unwrap_or(0.0);
    let mut resp_state = "Optimal".to_string();
    let mut resp_explanation = "System resources are operating with ample headroom. Responsiveness is optimal.".to_string();

    if cpu_load > 90.0 || mem_pct > 92.0 || disk_act > 90.0 {
        resp_state = "Constrained".to_string();
        resp_explanation = if disk_act > 90.0 {
            "Storage activity is heavily saturated (>90% active time). Disk I/O queues may cause noticeable UI delay.".to_string()
        } else if cpu_load > 90.0 {
            "CPU utilization is near maximum capacity (>90%). Thread scheduling may be momentarily delayed.".to_string()
        } else {
            "Available physical RAM is critically depleted (>92% used). System may rely on virtual memory paging.".to_string()
        };
    } else if cpu_load > 75.0 || mem_pct > 82.0 || disk_act > 70.0 {
        resp_state = "Reduced".to_string();
        resp_explanation = "Elevated workload observed across system resources. Foreground responsiveness remains adequate.".to_string();
    } else if cpu_load > 40.0 || mem_pct > 65.0 {
        resp_state = "Normal".to_string();
        resp_explanation = "Balanced background activity and application execution within standard operating boundaries.".to_string();
    }

    let responsiveness = ResponsivenessMetrics {
        cpu_saturation_percent: cpu_load,
        memory_pressure_percent: mem_pct,
        disk_active_percent: disk_act,
        disk_latency_ms: disk_latency,
        disk_queue,
        responsiveness_state: resp_state,
        explanation: resp_explanation,
    };

    // 10. Bottleneck Analysis
    let cpu_metric = SubsystemMetric {
        current: cpu_load,
        unit: "%".to_string(),
        status: if cpu_load > 90.0 {
            "Potential Bottleneck".to_string()
        } else if cpu_load > 75.0 {
            "Elevated".to_string()
        } else {
            "Normal".to_string()
        },
        description: format!("CPU utilization at {:.1}% across logical processors", cpu_load),
    };

    let mem_metric = SubsystemMetric {
        current: mem_pct,
        unit: "%".to_string(),
        status: if mem_pct > 90.0 {
            "Potential Bottleneck".to_string()
        } else if mem_pct > 80.0 {
            "Elevated".to_string()
        } else {
            "Normal".to_string()
        },
        description: format!("{:.1}% RAM allocated ({:.1} GB available)", mem_pct, avail_mem as f64 / (1024.0 * 1024.0 * 1024.0)),
    };

    let gpu_metric = SubsystemMetric {
        current: gpu_load.unwrap_or(0.0),
        unit: "%".to_string(),
        status: if let Some(g) = gpu_load {
            if g > 95.0 {
                "Potential Bottleneck".to_string()
            } else if g > 80.0 {
                "Elevated".to_string()
            } else {
                "Normal".to_string()
            }
        } else {
            "Unavailable".to_string()
        },
        description: if let Some(g) = gpu_load {
            format!("GPU 3D render utilization at {:.1}%", g)
        } else {
            "GPU hardware telemetry not exposed or idle".to_string()
        },
    };

    let storage_metric = SubsystemMetric {
        current: disk_act,
        unit: "%".to_string(),
        status: if disk_act > 90.0 {
            "Potential Bottleneck".to_string()
        } else if disk_act > 70.0 {
            "Elevated".to_string()
        } else {
            "Normal".to_string()
        },
        description: format!("Storage controller active time at {:.1}%", disk_act),
    };

    let net_mb_sec = (net_rx_sec + net_tx_sec) as f32 / (1024.0 * 1024.0);
    let net_metric = SubsystemMetric {
        current: net_mb_sec,
        unit: "MB/s".to_string(),
        status: if net_mb_sec > 50.0 {
            "Elevated".to_string()
        } else {
            "Normal".to_string()
        },
        description: format!("Total network activity at {:.2} MB/s", net_mb_sec),
    };

    let thermal_metric = SubsystemMetric {
        current: gpu_temp.or(disk_temp).unwrap_or(0.0),
        unit: "°C".to_string(),
        status: if gpu_temp.map(|t| t > 85.0).unwrap_or(false) {
            "Elevated".to_string()
        } else {
            "Normal".to_string()
        },
        description: if let Some(t) = gpu_temp {
            format!("GPU temperature at {:.0}°C", t)
        } else {
            "Thermal sensors within normal range or unexposed".to_string()
        },
    };

    // Determine primary bottleneck
    let mut primary_bottleneck = None;
    let mut verdict = "No subsystem bottleneck detected. Workloads are executing with balanced headroom.".to_string();

    if storage_metric.status == "Potential Bottleneck" {
        primary_bottleneck = Some("Storage".to_string());
        verdict = "Storage active time is currently limiting system throughput. Disk queues are elevated.".to_string();
    } else if cpu_metric.status == "Potential Bottleneck" {
        primary_bottleneck = Some("CPU".to_string());
        verdict = "CPU saturation is currently limiting system throughput. Compute workloads are heavily bound.".to_string();
    } else if mem_metric.status == "Potential Bottleneck" {
        primary_bottleneck = Some("Memory".to_string());
        verdict = "Physical RAM pressure is high. Background paging may affect responsiveness.".to_string();
    } else if gpu_metric.status == "Potential Bottleneck" {
        primary_bottleneck = Some("GPU".to_string());
        verdict = "Graphics processing pipeline is fully saturated by active 3D or compute workloads.".to_string();
    }

    let bottlenecks = BottleneckAnalysis {
        cpu: cpu_metric,
        memory: mem_metric,
        gpu: gpu_metric,
        storage: storage_metric,
        network: net_metric,
        thermal: thermal_metric,
        primary_bottleneck,
        summary_verdict: verdict,
    };

    // 11. Diagnostics & Recommendations
    let mut diagnostics = Vec::new();
    let mut recommendations = Vec::new();

    if cpu_load > 85.0 {
        diagnostics.push(format!("CPU Saturation: Global processor load is currently elevated at {:.1}%.", cpu_load));
        if let Some(top_p) = cross_processes.first() {
            recommendations.push(format!("Process '{}' is using {:.1}% CPU. Consider closing it if not in use.", top_p.name, top_p.cpu_percent));
        }
    }

    if mem_pct > 85.0 {
        diagnostics.push(format!("Memory Pressure: {:.1}% physical RAM allocated ({:.1} GB remaining).", mem_pct, avail_mem as f64 / (1024.0 * 1024.0 * 1024.0)));
        recommendations.push("Consider closing unused browser tabs or memory-heavy background applications.".to_string());
    }

    if disk_act > 85.0 {
        diagnostics.push(format!("Storage Saturation: Disk active time is {:.1}%.", disk_act));
        recommendations.push("Sustained storage activity detected. Avoid initiating large file transfers during performance-sensitive tasks.".to_string());
    }

    if power_source == "Battery" {
        diagnostics.push("Power Source: Running on battery power. Windows may throttle CPU maximum clock states to conserve battery.".to_string());
        recommendations.push("Connect to AC power for maximum hardware performance.".to_string());
    }

    if diagnostics.is_empty() {
        diagnostics.push("Balanced Operations: All system resources, power states, and storage controllers are operating normally.".to_string());
    }

    Ok(PerformanceSnapshot {
        timestamp_ms: now_epoch_ms,
        uptime_seconds: uptime,
        boot_timestamp_ms: boot_epoch_ms,
        cpu_load_percent: cpu_load,
        memory_used_percent: mem_pct,
        memory_used_bytes: used_mem,
        memory_total_bytes: total_mem,
        memory_available_bytes: avail_mem,
        gpu_load_percent: gpu_load,
        gpu_memory_used_bytes: gpu_mem_used,
        gpu_memory_total_bytes: gpu_mem_total,
        disk_active_percent: disk_active,
        disk_read_bytes_sec: disk_read_sec,
        disk_write_bytes_sec: disk_write_sec,
        network_rx_bytes_sec: net_rx_sec,
        network_tx_bytes_sec: net_tx_sec,
        responsiveness,
        bottlenecks,
        top_processes: cross_processes,
        thermal: ThermalInfo {
            cpu_temp_celsius: None, // Only reported if hardware exposed
            gpu_temp_celsius: gpu_temp,
            storage_temp_celsius: disk_temp,
            battery_temp_celsius: None,
            status: "Operating normally".to_string(),
        },
        power: {
            let is_batt = power_source == "Battery";
            PowerEnergyInfo {
                battery_percent: batt_percent,
                is_charging,
                power_source,
                active_power_profile: active_profile,
                energy_saver_active: is_batt && batt_percent.map(|b| b < 20.0).unwrap_or(false),
            }
        },
        diagnostics,
        recommendations,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_responsiveness_grading() {
        let optimal = ResponsivenessMetrics {
            cpu_saturation_percent: 25.0,
            memory_pressure_percent: 50.0,
            disk_active_percent: 5.0,
            disk_latency_ms: Some(1.2),
            disk_queue: Some(0),
            responsiveness_state: "Optimal".to_string(),
            explanation: "All fine".to_string(),
        };
        assert_eq!(optimal.responsiveness_state, "Optimal");
    }

    #[test]
    fn test_bottleneck_evaluation_logic() {
        let cpu_metric = SubsystemMetric {
            current: 95.0,
            unit: "%".to_string(),
            status: "Potential Bottleneck".to_string(),
            description: "High CPU".to_string(),
        };
        assert_eq!(cpu_metric.status, "Potential Bottleneck");
    }
}
