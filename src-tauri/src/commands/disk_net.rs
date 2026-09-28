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
pub fn get_disk_details(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<Vec<DiskPartitionInfo>, String> {
    let mut disks = state.disks.lock().map_err(|e| e.to_string())?;
    disks.refresh();

    let mut result = Vec::new();
    for d in disks.iter() {
        let total = d.total_space();
        let avail = d.available_space();
        let used = total.saturating_sub(avail);
        let pct = if total > 0 {
            (used as f32 / total as f32) * 100.0
        } else {
            0.0
        };

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
pub fn get_disk_system_snapshot(
    selected_disk: Option<u32>,
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<crate::system::disk::DiskSystemSnapshot, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    let mut disks = state.disks.lock().map_err(|e| e.to_string())?;

    let snapshot = crate::system::disk::collect_disk_system_snapshot(
        &mut sys,
        &mut disks,
        selected_disk.unwrap_or(0),
    );

    Ok(snapshot)
}

#[tauri::command]
pub fn get_network_details(
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<Vec<NetworkInterfaceInfo>, String> {
    let mut net = state.networks.lock().map_err(|e| e.to_string())?;
    net.refresh();

    let mut result = Vec::new();
    for (name, iface) in net.iter() {
        let ips: Vec<String> = iface
            .ip_networks()
            .iter()
            .map(|ip| ip.addr.to_string())
            .collect();
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

#[tauri::command]
pub fn get_network_system_snapshot(
    selected_adapter: Option<String>,
    state: tauri::State<'_, super::system::SystemState>,
) -> Result<crate::system::network::NetworkSystemSnapshot, String> {
    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    let mut net = state.networks.lock().map_err(|e| e.to_string())?;

    let snapshot = crate::system::network::collect_network_system_snapshot(
        &mut sys,
        &mut net,
        selected_adapter,
    );

    Ok(snapshot)
}

#[tauri::command]
pub fn run_network_ping_test(
    target: String,
) -> Result<crate::system::network::NetworkPingResult, String> {
    let result = crate::system::network::run_ping_diagnostics(&target);
    Ok(result)
}

#[cfg(test)]
mod tests {
    use sysinfo::{Disks, Networks, System};

    #[test]
    fn test_disk_enumeration_structure() {
        let disks = Disks::new_with_refreshed_list();
        for disk in disks.iter() {
            let total = disk.total_space();
            let avail = disk.available_space();
            assert!(
                avail <= total,
                "Available disk space cannot exceed total space"
            );
            assert!(
                !disk.mount_point().to_string_lossy().is_empty(),
                "Mount point cannot be empty"
            );
        }
    }

    #[test]
    fn test_network_enumeration_structure() {
        let networks = Networks::new_with_refreshed_list();
        for (name, net) in networks.iter() {
            assert!(!name.is_empty(), "Network adapter name must not be empty");
            let _rx = net.total_received();
            let _tx = net.total_transmitted();
        }
    }

    #[test]
    fn test_disk_snapshot_integration() {
        let mut sys = System::new();
        let mut disks = Disks::new_with_refreshed_list();
        let snapshot = crate::system::disk::collect_disk_system_snapshot(&mut sys, &mut disks, 0);
        assert!(!snapshot.physical_disks.is_empty(), "Must find at least 1 physical disk");
    }

    #[test]
    fn test_network_snapshot_integration() {
        let mut sys = System::new();
        let mut net = Networks::new_with_refreshed_list();
        let snapshot = crate::system::network::collect_network_system_snapshot(&mut sys, &mut net, None);
        assert!(!snapshot.adapters.is_empty(), "Must find at least 1 network adapter");
    }
}
