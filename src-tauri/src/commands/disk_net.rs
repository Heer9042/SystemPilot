use serde::{Deserialize, Serialize};

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
    pub disk_kind: String, // SSD, HDD, etc.
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkInterfaceInfo {
    pub name: String,
    pub ip_addresses: Vec<String>,
    pub mac_address: String,
    pub total_received_bytes: u64,
    pub total_transmitted_bytes: u64,
    pub is_up: bool,
}

#[tauri::command]
pub fn get_disk_details(state: tauri::State<'_, super::system::SystemState>) -> Result<Vec<DiskPartitionInfo>, String> {
    let mut disks = state.disks.lock().map_err(|e| e.to_string())?;
    disks.refresh();

    let mut result = Vec::new();
    for d in disks.iter() {
        let total = d.total_space();
        let avail = d.available_space();
        let used = total.saturating_sub(avail);
        let pct = if total > 0 { (used as f32 / total as f32) * 100.0 } else { 0.0 };

        let kind = match d.kind() {
            sysinfo::DiskKind::SSD => "SSD",
            sysinfo::DiskKind::HDD => "HDD",
            _ => "Storage Drive",
        };

        result.push(DiskPartitionInfo {
            name: d.name().to_string_lossy().to_string(),
            mount_point: d.mount_point().to_string_lossy().to_string(),
            file_system: d.file_system().to_string_lossy().to_string(),
            total_space_bytes: total,
            available_space_bytes: avail,
            used_space_bytes: used,
            usage_percent: pct,
            is_removable: d.is_removable(),
            disk_kind: kind.into(),
        });
    }

    Ok(result)
}

#[tauri::command]
pub fn get_network_details(state: tauri::State<'_, super::system::SystemState>) -> Result<Vec<NetworkInterfaceInfo>, String> {
    let mut net = state.networks.lock().map_err(|e| e.to_string())?;
    net.refresh();

    let mut result = Vec::new();
    for (name, iface) in net.iter() {
        let ips: Vec<String> = iface.ip_networks().iter().map(|ip| ip.addr.to_string()).collect();
        result.push(NetworkInterfaceInfo {
            name: name.clone(),
            ip_addresses: ips,
            mac_address: iface.mac_address().to_string(),
            total_received_bytes: iface.total_received(),
            total_transmitted_bytes: iface.total_transmitted(),
            is_up: iface.total_received() > 0 || iface.total_transmitted() > 0,
        });
    }

    Ok(result)
}
