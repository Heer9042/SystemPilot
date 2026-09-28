//! Network Telemetry, Adapters, Wi-Fi, Active Connections, Ping Diagnostics
//! Safe, zero-process Windows native implementation.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;
use sysinfo::{Networks, System};

// ============================================================================
// DATA MODELS
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkCapabilities {
    pub supports_wifi: bool,
    pub supports_signal_strength: bool,
    pub supports_link_speed: bool,
    pub supports_connection_table: bool,
    pub supports_process_usage: bool,
    pub supports_ping: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WifiDetails {
    pub ssid: String,
    pub signal_quality_percent: u32, // 0 - 100
    pub channel: Option<u32>,
    pub frequency_band: String, // "2.4 GHz", "5 GHz", "6 GHz", "Unknown"
    pub phy_type: String,       // "Wi-Fi 6 (802.11ax)", "Wi-Fi 5 (802.11ac)", etc.
    pub bssid: String,
    pub rx_link_speed_mbps: Option<f64>,
    pub tx_link_speed_mbps: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkAdapterSnapshot {
    pub id: String,
    pub name: String,        // e.g. "Wi-Fi", "Ethernet"
    pub description: String, // e.g. "Intel(R) Wi-Fi 6 AX201 160MHz"
    pub adapter_type: String, // "Wi-Fi", "Ethernet", "Loopback", "Virtual / VPN", "Tunnel", "Other"
    pub status: String,       // "Connected", "Disconnected", "Disabled", "Unknown"
    pub is_up: bool,
    pub mac_address: String,
    pub ipv4_addresses: Vec<String>,
    pub ipv6_addresses: Vec<String>,
    pub gateways: Vec<String>,
    pub dns_servers: Vec<String>,
    pub dhcp_enabled: bool,
    pub link_speed_bps: Option<u64>,
    pub rx_bytes_sec: u64,
    pub tx_bytes_sec: u64,
    pub total_rx_bytes: u64,
    pub total_tx_bytes: u64,
    pub rx_errors: u64,
    pub tx_errors: u64,
    pub dropped_packets: u64,
    pub wifi_details: Option<WifiDetails>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkProcessItem {
    pub pid: u32,
    pub name: String,
    pub rx_bytes_sec: u64,
    pub tx_bytes_sec: u64,
    pub total_bytes_sec: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkConnectionItem {
    pub protocol: String, // "TCP"
    pub local_address: String,
    pub local_port: u16,
    pub remote_address: String,
    pub remote_port: u16,
    pub state: String, // "ESTABLISHED", "LISTENING", "TIME_WAIT", etc.
    pub pid: u32,
    pub process_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkDiagnostics {
    pub internet_connected: bool,
    pub active_adapter_name: Option<String>,
    pub active_adapter_type: Option<String>,
    pub gateway_reachable: bool,
    pub dns_configured: bool,
    pub weak_wifi_signal: bool,
    pub high_activity_detected: bool,
    pub diagnostic_notices: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkPingResult {
    pub target: String,
    pub resolved_ip: Option<String>,
    pub packets_sent: u32,
    pub packets_received: u32,
    pub packet_loss_percent: f32,
    pub min_latency_ms: Option<f32>,
    pub avg_latency_ms: Option<f32>,
    pub max_latency_ms: Option<f32>,
    pub status_message: String,
    pub timestamp_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkSystemSnapshot {
    pub timestamp_ms: u64,
    pub adapters: Vec<NetworkAdapterSnapshot>,
    pub selected_adapter_id: Option<String>,
    pub total_rx_bytes_sec: u64,
    pub total_tx_bytes_sec: u64,
    pub top_processes: Vec<NetworkProcessItem>,
    pub active_connections: Vec<NetworkConnectionItem>,
    pub diagnostics: NetworkDiagnostics,
    pub capabilities: NetworkCapabilities,
}

// ============================================================================
// RATE TRACKER STATE
// ============================================================================

struct AdapterSample {
    timestamp: Instant,
    total_rx: u64,
    total_tx: u64,
}

struct ProcessNetSample {
    timestamp: Instant,
    rx_bytes: u64,
    tx_bytes: u64,
}

struct NetworkTrackerState {
    adapter_samples: HashMap<String, AdapterSample>,
    process_samples: HashMap<u32, ProcessNetSample>,
}

impl Default for NetworkTrackerState {
    fn default() -> Self {
        Self {
            adapter_samples: HashMap::new(),
            process_samples: HashMap::new(),
        }
    }
}

static NET_TRACKER: Mutex<Option<NetworkTrackerState>> = Mutex::new(None);

fn with_net_tracker<F, R>(f: F) -> R
where
    F: FnOnce(&mut NetworkTrackerState) -> R,
{
    let mut lock = NET_TRACKER.lock().unwrap();
    if lock.is_none() {
        *lock = Some(NetworkTrackerState::default());
    }
    f(lock.as_mut().unwrap())
}

// ============================================================================
// WIN32 NATIVE NETWORKING HELPERS
// ============================================================================

#[cfg(target_os = "windows")]
#[allow(non_snake_case, dead_code)]
mod win32_net {
    use std::collections::HashMap;
    use std::ffi::c_void;
    use std::ptr::null_mut;
    use windows_sys::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryA};

    // IP Helper API Structures
    pub const AF_UNSPEC: u32 = 0;
    pub const AF_INET: u32 = 2;
    pub const AF_INET6: u32 = 23;
    pub const GAA_FLAG_INCLUDE_GATEWAYS: u32 = 0x0080;
    pub const GAA_FLAG_INCLUDE_ALL_INTERFACES: u32 = 0x0100;
    pub const GAA_FLAG_INCLUDE_PREFIX: u32 = 0x0010;

    pub const IF_TYPE_ETHERNET_CSMACD: u32 = 6;
    pub const IF_TYPE_SOFTWARE_LOOPBACK: u32 = 24;
    pub const IF_TYPE_IEEE80211: u32 = 71;
    pub const IF_TYPE_TUNNEL: u32 = 131;

    #[repr(C)]
    pub struct SOCKET_ADDRESS {
        pub lpSockaddr: *mut c_void,
        pub iSockaddrLength: i32,
    }

    #[repr(C)]
    pub struct IP_ADAPTER_UNICAST_ADDRESS_LH {
        pub Length: u32,
        pub Flags: u32,
        pub Next: *mut IP_ADAPTER_UNICAST_ADDRESS_LH,
        pub Address: SOCKET_ADDRESS,
        // extra fields omitted for size compatibility
    }

    #[repr(C)]
    pub struct IP_ADAPTER_GATEWAY_ADDRESS_LH {
        pub Length: u32,
        pub Reserved: u32,
        pub Next: *mut IP_ADAPTER_GATEWAY_ADDRESS_LH,
        pub Address: SOCKET_ADDRESS,
    }

    #[repr(C)]
    pub struct IP_ADAPTER_DNS_SERVER_ADDRESS_XP {
        pub Length: u32,
        pub Reserved: u32,
        pub Next: *mut IP_ADAPTER_DNS_SERVER_ADDRESS_XP,
        pub Address: SOCKET_ADDRESS,
    }

    #[repr(C)]
    pub struct IP_ADAPTER_ADDRESSES_LH {
        pub Length: u32,
        pub IfIndex: u32,
        pub Next: *mut IP_ADAPTER_ADDRESSES_LH,
        pub AdapterName: *mut i8,
        pub FirstUnicastAddress: *mut IP_ADAPTER_UNICAST_ADDRESS_LH,
        pub FirstAnycastAddress: *mut c_void,
        pub FirstMulticastAddress: *mut c_void,
        pub FirstDnsServerAddress: *mut IP_ADAPTER_DNS_SERVER_ADDRESS_XP,
        pub DnsSuffix: *mut u16,
        pub Description: *mut u16,
        pub FriendlyName: *mut u16,
        pub PhysicalAddress: [u8; 8],
        pub PhysicalAddressLength: u32,
        pub Flags: u32,
        pub Mtu: u32,
        pub IfType: u32,
        pub OperStatus: u32,
        pub Ipv6IfIndex: u32,
        pub ZoneIndices: [u32; 16],
        pub FirstPrefix: *mut c_void,
        pub TransmitLinkSpeed: u64,
        pub ReceiveLinkSpeed: u64,
        pub FirstWinsServerAddress: *mut c_void,
        pub FirstGatewayAddress: *mut IP_ADAPTER_GATEWAY_ADDRESS_LH,
        pub Ipv4Metric: u32,
        pub Ipv6Metric: u32,
        pub Luid: u64,
        pub Dhcpv4Server: SOCKET_ADDRESS,
        pub CompartmentId: u32,
        pub NetworkGuid: [u8; 16],
        pub ConnectionType: u32,
        pub TunnelType: u32,
        pub Dhcpv6Server: SOCKET_ADDRESS,
        pub Dhcpv6ClientDuid: [u8; 130],
        pub Dhcpv6ClientDuidLength: u32,
        pub Dhcpv6Iaid: u32,
        pub FirstDnsSuffix: *mut c_void,
    }

    #[repr(C)]
    pub struct MIB_TCPROW_OWNER_PID {
        pub dwState: u32,
        pub dwLocalAddr: u32,
        pub dwLocalPort: u32,
        pub dwRemoteAddr: u32,
        pub dwRemotePort: u32,
        pub dwOwningPid: u32,
    }

    #[repr(C)]
    pub struct MIB_TCPTABLE_OWNER_PID {
        pub dwNumEntries: u32,
        pub table: [MIB_TCPROW_OWNER_PID; 1],
    }

    type FnGetAdaptersAddresses = unsafe extern "system" fn(
        Family: u32,
        Flags: u32,
        Reserved: *mut c_void,
        AdapterAddresses: *mut IP_ADAPTER_ADDRESSES_LH,
        SizePointer: *mut u32,
    ) -> u32;

    type FnGetExtendedTcpTable = unsafe extern "system" fn(
        pTcpTable: *mut c_void,
        pdwSize: *mut u32,
        bOrder: i32,
        ulAf: u32,
        TableClass: u32,
        Reserved: u32,
    ) -> u32;

    pub fn get_native_adapters() -> Vec<super::NetworkAdapterSnapshot> {
        let mut results = Vec::new();
        unsafe {
            let h_iphlp = LoadLibraryA(b"iphlpapi.dll\0".as_ptr());
            if h_iphlp.is_null() {
                return results;
            }

            let fn_addr = GetProcAddress(h_iphlp, b"GetAdaptersAddresses\0".as_ptr());
            if fn_addr.is_none() {
                return results;
            }
            let get_adapters: FnGetAdaptersAddresses = std::mem::transmute(fn_addr);

            let mut buf_size: u32 = 16384;
            let mut buffer: Vec<u8> = vec![0; buf_size as usize];

            let flags = GAA_FLAG_INCLUDE_GATEWAYS
                | GAA_FLAG_INCLUDE_ALL_INTERFACES
                | GAA_FLAG_INCLUDE_PREFIX;

            let mut ret = get_adapters(
                AF_UNSPEC,
                flags,
                null_mut(),
                buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
                &mut buf_size,
            );

            if ret == 111 {
                // ERROR_BUFFER_OVERFLOW
                buffer.resize(buf_size as usize, 0);
                ret = get_adapters(
                    AF_UNSPEC,
                    flags,
                    null_mut(),
                    buffer.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
                    &mut buf_size,
                );
            }

            if ret != 0 {
                return results;
            }

            let mut curr = buffer.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;
            while !curr.is_null() {
                let entry = &*curr;

                // Friendly name
                let friendly_name = if !entry.FriendlyName.is_null() {
                    let mut len = 0;
                    while *entry.FriendlyName.add(len) != 0 {
                        len += 1;
                    }
                    String::from_utf16_lossy(std::slice::from_raw_parts(entry.FriendlyName, len))
                } else {
                    "Adapter".to_string()
                };

                // Description
                let description = if !entry.Description.is_null() {
                    let mut len = 0;
                    while *entry.Description.add(len) != 0 {
                        len += 1;
                    }
                    String::from_utf16_lossy(std::slice::from_raw_parts(entry.Description, len))
                } else {
                    friendly_name.clone()
                };

                // ID (AdapterName)
                let id = if !entry.AdapterName.is_null() {
                    let cstr = std::ffi::CStr::from_ptr(entry.AdapterName);
                    cstr.to_string_lossy().to_string()
                } else {
                    friendly_name.clone()
                };

                // Adapter Type
                let desc_lower = description.to_lowercase();
                let friendly_lower = friendly_name.to_lowercase();
                let adapter_type = match entry.IfType {
                    IF_TYPE_IEEE80211 => "Wi-Fi".to_string(),
                    IF_TYPE_ETHERNET_CSMACD => {
                        if desc_lower.contains("wireless") || desc_lower.contains("wi-fi") || desc_lower.contains("802.11") {
                            "Wi-Fi".to_string()
                        } else if desc_lower.contains("virtual") || desc_lower.contains("hyper-v") || desc_lower.contains("vmware") || desc_lower.contains("vethernet") || desc_lower.contains("vpn") {
                            "Virtual / VPN".to_string()
                        } else {
                            "Ethernet".to_string()
                        }
                    }
                    IF_TYPE_SOFTWARE_LOOPBACK => "Loopback".to_string(),
                    IF_TYPE_TUNNEL => "Tunnel".to_string(),
                    _ => {
                        if friendly_lower.contains("wi-fi") || friendly_lower.contains("wireless") {
                            "Wi-Fi".to_string()
                        } else if friendly_lower.contains("ethernet") {
                            "Ethernet".to_string()
                        } else {
                            "Other".to_string()
                        }
                    }
                };

                // OperStatus
                let (status, is_up) = match entry.OperStatus {
                    1 => ("Connected".to_string(), true),
                    2 => ("Disconnected".to_string(), false),
                    3 => ("Testing".to_string(), false),
                    5 => ("Dormant".to_string(), false),
                    6 => ("Disabled".to_string(), false),
                    _ => ("Unknown".to_string(), false),
                };

                // MAC Address
                let mac_address = if entry.PhysicalAddressLength > 0 && entry.PhysicalAddressLength <= 8 {
                    entry.PhysicalAddress[..entry.PhysicalAddressLength as usize]
                        .iter()
                        .map(|b| format!("{:02X}", b))
                        .collect::<Vec<_>>()
                        .join(":")
                } else {
                    String::new()
                };

                // Unicast IP addresses
                let mut ipv4_addrs = Vec::new();
                let mut ipv6_addrs = Vec::new();
                let mut curr_ip = entry.FirstUnicastAddress;
                while !curr_ip.is_null() {
                    let ip_entry = &*curr_ip;
                    if !ip_entry.Address.lpSockaddr.is_null() {
                        let sa_family = *(ip_entry.Address.lpSockaddr as *const u16);
                        let p = ip_entry.Address.lpSockaddr as *const u8;
                        if sa_family == AF_INET as u16 {
                            ipv4_addrs.push(format!("{}.{}.{}.{}", *p.add(4), *p.add(5), *p.add(6), *p.add(7)));
                        } else if sa_family == AF_INET6 as u16 && ip_entry.Address.iSockaddrLength >= 28 {
                            let segments: Vec<String> = (0..8)
                                .map(|i| {
                                    let high = *p.add(8 + i * 2) as u16;
                                    let low = *p.add(8 + i * 2 + 1) as u16;
                                    format!("{:x}", (high << 8) | low)
                                })
                                .collect();
                            ipv6_addrs.push(segments.join(":"));
                        }
                    }
                    curr_ip = ip_entry.Next;
                }

                // Gateway Addresses
                let mut gateways = Vec::new();
                let mut curr_gw = entry.FirstGatewayAddress;
                while !curr_gw.is_null() {
                    let gw_entry = &*curr_gw;
                    if !gw_entry.Address.lpSockaddr.is_null() {
                        let sa_family = *(gw_entry.Address.lpSockaddr as *const u16);
                        if sa_family == AF_INET as u16 {
                            let p = gw_entry.Address.lpSockaddr as *const u8;
                            gateways.push(format!("{}.{}.{}.{}", *p.add(4), *p.add(5), *p.add(6), *p.add(7)));
                        }
                    }
                    curr_gw = gw_entry.Next;
                }

                // DNS Server Addresses
                let mut dns_servers = Vec::new();
                let mut curr_dns = entry.FirstDnsServerAddress;
                while !curr_dns.is_null() {
                    let dns_entry = &*curr_dns;
                    if !dns_entry.Address.lpSockaddr.is_null() {
                        let sa_family = *(dns_entry.Address.lpSockaddr as *const u16);
                        if sa_family == AF_INET as u16 {
                            let p = dns_entry.Address.lpSockaddr as *const u8;
                            let dns_str = format!("{}.{}.{}.{}", *p.add(4), *p.add(5), *p.add(6), *p.add(7));
                            if !dns_servers.contains(&dns_str) {
                                dns_servers.push(dns_str);
                            }
                        }
                    }
                    curr_dns = dns_entry.Next;
                }

                // Physical link speed (max of transmit and receive)
                let link_speed = if entry.ReceiveLinkSpeed > 0 || entry.TransmitLinkSpeed > 0 {
                    Some(entry.ReceiveLinkSpeed.max(entry.TransmitLinkSpeed))
                } else {
                    None
                };

                let dhcp_enabled = (entry.Flags & 0x0004) != 0;

                results.push(super::NetworkAdapterSnapshot {
                    id,
                    name: friendly_name,
                    description,
                    adapter_type,
                    status,
                    is_up,
                    mac_address,
                    ipv4_addresses: ipv4_addrs,
                    ipv6_addresses: ipv6_addrs,
                    gateways,
                    dns_servers,
                    dhcp_enabled,
                    link_speed_bps: link_speed,
                    rx_bytes_sec: 0,
                    tx_bytes_sec: 0,
                    total_rx_bytes: 0,
                    total_tx_bytes: 0,
                    rx_errors: 0,
                    tx_errors: 0,
                    dropped_packets: 0,
                    wifi_details: None,
                });

                curr = entry.Next;
            }
        }

        results
    }

    // Active TCP Connections
    pub fn get_active_tcp_connections(process_map: &HashMap<u32, String>) -> Vec<super::NetworkConnectionItem> {
        let mut results = Vec::new();
        unsafe {
            let h_iphlp = LoadLibraryA(b"iphlpapi.dll\0".as_ptr());
            if h_iphlp.is_null() {
                return results;
            }

            let fn_addr = GetProcAddress(h_iphlp, b"GetExtendedTcpTable\0".as_ptr());
            if fn_addr.is_none() {
                return results;
            }
            let get_tcp_table: FnGetExtendedTcpTable = std::mem::transmute(fn_addr);

            let mut size: u32 = 32768;
            let mut buf: Vec<u8> = vec![0; size as usize];

            let mut ret = get_tcp_table(
                buf.as_mut_ptr() as *mut c_void,
                &mut size,
                1, // sort
                AF_INET,
                5, // TCP_TABLE_OWNER_PID_ALL
                0,
            );

            if ret == 122 {
                // ERROR_INSUFFICIENT_BUFFER
                buf.resize(size as usize, 0);
                ret = get_tcp_table(
                    buf.as_mut_ptr() as *mut c_void,
                    &mut size,
                    1,
                    AF_INET,
                    5,
                    0,
                );
            }

            if ret != 0 {
                return results;
            }

            let table = &*(buf.as_ptr() as *const MIB_TCPTABLE_OWNER_PID);
            let num_entries = table.dwNumEntries.min(250) as usize; // bounded up to 250 connections
            let entries = std::slice::from_raw_parts(
                &table.table[0] as *const MIB_TCPROW_OWNER_PID,
                num_entries,
            );

            for row in entries {
                let state_str = match row.dwState {
                    1 => "CLOSED",
                    2 => "LISTENING",
                    3 => "SYN_SENT",
                    4 => "SYN_RCVD",
                    5 => "ESTABLISHED",
                    6 => "FIN_WAIT1",
                    7 => "FIN_WAIT2",
                    8 => "CLOSE_WAIT",
                    9 => "CLOSING",
                    10 => "LAST_ACK",
                    11 => "TIME_WAIT",
                    12 => "DELETE_TCB",
                    _ => "UNKNOWN",
                };

                let local_ip = format!(
                    "{}.{}.{}.{}",
                    row.dwLocalAddr & 0xFF,
                    (row.dwLocalAddr >> 8) & 0xFF,
                    (row.dwLocalAddr >> 16) & 0xFF,
                    (row.dwLocalAddr >> 24) & 0xFF
                );
                let local_port = u16::from_be(row.dwLocalPort as u16);

                let remote_ip = format!(
                    "{}.{}.{}.{}",
                    row.dwRemoteAddr & 0xFF,
                    (row.dwRemoteAddr >> 8) & 0xFF,
                    (row.dwRemoteAddr >> 16) & 0xFF,
                    (row.dwRemoteAddr >> 24) & 0xFF
                );
                let remote_port = u16::from_be(row.dwRemotePort as u16);

                let proc_name = process_map
                    .get(&row.dwOwningPid)
                    .cloned()
                    .unwrap_or_else(|| {
                        if row.dwOwningPid == 0 {
                            "System Idle".to_string()
                        } else if row.dwOwningPid == 4 {
                            "System".to_string()
                        } else {
                            format!("PID {}", row.dwOwningPid)
                        }
                    });

                results.push(super::NetworkConnectionItem {
                    protocol: "TCP".to_string(),
                    local_address: local_ip,
                    local_port,
                    remote_address: remote_ip,
                    remote_port,
                    state: state_str.to_string(),
                    pid: row.dwOwningPid,
                    process_name: proc_name,
                });
            }
        }

        results
    }

    // Wi-Fi Telemetry via wlanapi.dll
    #[repr(C)]
    struct DOT11_SSID {
        uSSIDLength: u32,
        ucSSID: [u8; 32],
    }

    #[repr(C)]
    struct WLAN_INTERFACE_INFO {
        InterfaceGuid: [u8; 16],
        strInterfaceDescription: [u16; 256],
        isState: u32,
    }

    #[repr(C)]
    struct WLAN_INTERFACE_INFO_LIST {
        dwNumberOfItems: u32,
        dwIndex: u32,
        InterfaceInfo: [WLAN_INTERFACE_INFO; 1],
    }

    #[repr(C)]
    struct WLAN_ASSOCIATION_ATTRIBUTES {
        dot11Ssid: DOT11_SSID,
        dot11BssType: u32,
        dot11Bssid: [u8; 6],
        dot11PhyType: u32,
        uDot11PhyIndex: u32,
        wlanSignalQuality: u32,
        ulRxRate: u32,
        ulTxRate: u32,
    }

    #[repr(C)]
    struct WLAN_CONNECTION_ATTRIBUTES {
        isState: u32,
        wlanConnectionMode: u32,
        strProfileName: [u16; 256],
        wlanAssociationAttributes: WLAN_ASSOCIATION_ATTRIBUTES,
        // security attributes omitted for brevity
    }

    type FnWlanOpenHandle = unsafe extern "system" fn(
        dwClientVersion: u32,
        pReserved: *mut c_void,
        pdwNegotiatedVersion: *mut u32,
        phClientHandle: *mut *mut c_void,
    ) -> u32;

    type FnWlanCloseHandle = unsafe extern "system" fn(
        hClientHandle: *mut c_void,
        pReserved: *mut c_void,
    ) -> u32;

    type FnWlanEnumInterfaces = unsafe extern "system" fn(
        hClientHandle: *mut c_void,
        pReserved: *mut c_void,
        ppInterfaceList: *mut *mut WLAN_INTERFACE_INFO_LIST,
    ) -> u32;

    type FnWlanQueryInterface = unsafe extern "system" fn(
        hClientHandle: *mut c_void,
        pInterfaceGuid: *const u8,
        OpCode: u32,
        pReserved: *mut c_void,
        pdwDataSize: *mut u32,
        ppData: *mut *mut c_void,
        pWlanOpcodeValueType: *mut u32,
    ) -> u32;

    type FnWlanFreeMemory = unsafe extern "system" fn(pMemory: *mut c_void);

    pub fn query_wifi_status() -> Option<super::WifiDetails> {
        unsafe {
            let h_wlan = LoadLibraryA(b"wlanapi.dll\0".as_ptr());
            if h_wlan.is_null() {
                return None;
            }

            let fn_open = GetProcAddress(h_wlan, b"WlanOpenHandle\0".as_ptr())?;
            let fn_close = GetProcAddress(h_wlan, b"WlanCloseHandle\0".as_ptr())?;
            let fn_enum = GetProcAddress(h_wlan, b"WlanEnumInterfaces\0".as_ptr())?;
            let fn_query = GetProcAddress(h_wlan, b"WlanQueryInterface\0".as_ptr())?;
            let fn_free = GetProcAddress(h_wlan, b"WlanFreeMemory\0".as_ptr())?;

            let wlan_open: FnWlanOpenHandle = std::mem::transmute(fn_open);
            let wlan_close: FnWlanCloseHandle = std::mem::transmute(fn_close);
            let wlan_enum: FnWlanEnumInterfaces = std::mem::transmute(fn_enum);
            let wlan_query: FnWlanQueryInterface = std::mem::transmute(fn_query);
            let wlan_free: FnWlanFreeMemory = std::mem::transmute(fn_free);

            let mut client_handle: *mut c_void = null_mut();
            let mut negotiated_version = 0u32;
            let ret = wlan_open(2, null_mut(), &mut negotiated_version, &mut client_handle);
            if ret != 0 || client_handle.is_null() {
                return None;
            }

            let mut interface_list: *mut WLAN_INTERFACE_INFO_LIST = null_mut();
            let ret = wlan_enum(client_handle, null_mut(), &mut interface_list);
            if ret != 0 || interface_list.is_null() {
                wlan_close(client_handle, null_mut());
                return None;
            }

            let num_interfaces = (*interface_list).dwNumberOfItems;
            if num_interfaces == 0 {
                wlan_free(interface_list as *mut c_void);
                wlan_close(client_handle, null_mut());
                return None;
            }

            let mut found_wifi: Option<super::WifiDetails> = None;
            let interfaces = std::slice::from_raw_parts(
                &(*interface_list).InterfaceInfo[0] as *const WLAN_INTERFACE_INFO,
                num_interfaces as usize,
            );

            for intf in interfaces {
                let mut data_size = 0u32;
                let mut p_data: *mut c_void = null_mut();
                let mut opcode_type = 0u32;

                // Opcode 7: wlan_intf_opcode_current_connection
                let q_ret = wlan_query(
                    client_handle,
                    intf.InterfaceGuid.as_ptr(),
                    7,
                    null_mut(),
                    &mut data_size,
                    &mut p_data,
                    &mut opcode_type,
                );

                if q_ret == 0 && !p_data.is_null() {
                    let conn = &*(p_data as *const WLAN_CONNECTION_ATTRIBUTES);
                    let assoc = &conn.wlanAssociationAttributes;

                    let ssid_len = (assoc.dot11Ssid.uSSIDLength as usize).min(32);
                    let ssid = String::from_utf8_lossy(&assoc.dot11Ssid.ucSSID[..ssid_len]).to_string();

                    let bssid = format!(
                        "{:02X}:{:02X}:{:02X}:{:02X}:{:02X}:{:02X}",
                        assoc.dot11Bssid[0],
                        assoc.dot11Bssid[1],
                        assoc.dot11Bssid[2],
                        assoc.dot11Bssid[3],
                        assoc.dot11Bssid[4],
                        assoc.dot11Bssid[5]
                    );

                    let phy_type = match assoc.dot11PhyType {
                        10 => "Wi-Fi 6 (802.11ax)",
                        9 => "Wi-Fi 5 (802.11ac)",
                        8 => "802.11ad",
                        7 => "Wi-Fi 4 (802.11n)",
                        4 => "802.11g",
                        2 => "802.11b",
                        1 => "802.11a",
                        _ => "802.11 Standard",
                    };

                    let rx_mbps = if assoc.ulRxRate > 0 {
                        Some(assoc.ulRxRate as f64 / 1000.0)
                    } else {
                        None
                    };

                    let tx_mbps = if assoc.ulTxRate > 0 {
                        Some(assoc.ulTxRate as f64 / 1000.0)
                    } else {
                        None
                    };

                    // Query channel number (Opcode 8: wlan_intf_opcode_channel_number)
                    let mut ch_size = 0u32;
                    let mut ch_data: *mut c_void = null_mut();
                    let mut ch_opcode_type = 0u32;
                    let mut channel: Option<u32> = None;
                    let mut band = "Unknown".to_string();

                    let ch_ret = wlan_query(
                        client_handle,
                        intf.InterfaceGuid.as_ptr(),
                        8,
                        null_mut(),
                        &mut ch_size,
                        &mut ch_data,
                        &mut ch_opcode_type,
                    );

                    if ch_ret == 0 && !ch_data.is_null() {
                        let ch_num = *(ch_data as *const u32);
                        if ch_num > 0 {
                            channel = Some(ch_num);
                            band = if ch_num <= 14 {
                                "2.4 GHz".to_string()
                            } else if ch_num <= 177 {
                                "5 GHz".to_string()
                            } else {
                                "6 GHz".to_string()
                            };
                        }
                        wlan_free(ch_data);
                    }

                    wlan_free(p_data);

                    if !ssid.is_empty() {
                        found_wifi = Some(super::WifiDetails {
                            ssid,
                            signal_quality_percent: assoc.wlanSignalQuality.min(100),
                            channel,
                            frequency_band: band,
                            phy_type: phy_type.to_string(),
                            bssid,
                            rx_link_speed_mbps: rx_mbps,
                            tx_link_speed_mbps: tx_mbps,
                        });
                        break;
                    }
                }
            }

            wlan_free(interface_list as *mut c_void);
            wlan_close(client_handle, null_mut());

            found_wifi
        }
    }

    // Native ICMP Echo Ping (Zero Terminal Popups, Safe FFI)
    #[repr(C)]
    struct IP_OPTION_INFORMATION {
        Ttl: u8,
        Tos: u8,
        Flags: u8,
        OptionsSize: u8,
        OptionsData: *mut u8,
    }

    #[repr(C)]
    struct ICMP_ECHO_REPLY {
        Address: u32,
        Status: u32,
        RoundTripTime: u32,
        DataSize: u16,
        Reserved: u16,
        Data: *mut c_void,
        Options: IP_OPTION_INFORMATION,
    }

    type FnIcmpCreateFile = unsafe extern "system" fn() -> *mut c_void;
    type FnIcmpCloseHandle = unsafe extern "system" fn(IcmpHandle: *mut c_void) -> i32;
    type FnIcmpSendEcho = unsafe extern "system" fn(
        IcmpHandle: *mut c_void,
        DestinationAddress: u32,
        RequestData: *const c_void,
        RequestSize: u16,
        RequestOptions: *const IP_OPTION_INFORMATION,
        ReplyBuffer: *mut c_void,
        ReplySize: u32,
        Timeout: u32,
    ) -> u32;

    pub fn native_icmp_ping(dest_ip_str: &str, count: u32) -> Result<(u32, u32, Vec<f32>), String> {
        let ip: std::net::Ipv4Addr = dest_ip_str
            .parse()
            .map_err(|e| format!("Invalid IPv4 address: {}", e))?;

        let ip_u32 = u32::from_ne_bytes(ip.octets());

        unsafe {
            let h_iphlp = LoadLibraryA(b"iphlpapi.dll\0".as_ptr());
            if h_iphlp.is_null() {
                return Err("Failed to load iphlpapi.dll".to_string());
            }

            let fn_create = GetProcAddress(h_iphlp, b"IcmpCreateFile\0".as_ptr())
                .ok_or_else(|| "IcmpCreateFile not found".to_string())?;
            let fn_close = GetProcAddress(h_iphlp, b"IcmpCloseHandle\0".as_ptr())
                .ok_or_else(|| "IcmpCloseHandle not found".to_string())?;
            let fn_echo = GetProcAddress(h_iphlp, b"IcmpSendEcho\0".as_ptr())
                .ok_or_else(|| "IcmpSendEcho not found".to_string())?;

            let icmp_create: FnIcmpCreateFile = std::mem::transmute(fn_create);
            let icmp_close: FnIcmpCloseHandle = std::mem::transmute(fn_close);
            let icmp_send: FnIcmpSendEcho = std::mem::transmute(fn_echo);

            let handle = icmp_create();
            if handle.is_null() || handle == -1isize as *mut c_void {
                return Err("Failed to create ICMP handle".to_string());
            }

            let send_data = b"SystemPilotNetworkPingProbeData!";
            let reply_size = std::mem::size_of::<ICMP_ECHO_REPLY>() + send_data.len() + 8;
            let mut reply_buffer: Vec<u8> = vec![0; reply_size];

            let mut received = 0u32;
            let mut latencies: Vec<f32> = Vec::new();

            for _ in 0..count {
                let ret = icmp_send(
                    handle,
                    ip_u32,
                    send_data.as_ptr() as *const c_void,
                    send_data.len() as u16,
                    null_mut(),
                    reply_buffer.as_mut_ptr() as *mut c_void,
                    reply_size as u32,
                    1500, // 1500 ms timeout per packet
                );

                if ret > 0 {
                    let reply = &*(reply_buffer.as_ptr() as *const ICMP_ECHO_REPLY);
                    if reply.Status == 0 {
                        received += 1;
                        latencies.push(reply.RoundTripTime as f32);
                    }
                }

                // Short inter-packet pause
                std::thread::sleep(std::time::Duration::from_millis(50));
            }

            icmp_close(handle);

            Ok((count, received, latencies))
        }
    }
}

// Fallback for non-windows target
#[cfg(not(target_os = "windows"))]
mod win32_net {
    use super::*;

    pub fn get_native_adapters() -> Vec<NetworkAdapterSnapshot> {
        Vec::new()
    }

    pub fn get_active_tcp_connections(_map: &HashMap<u32, String>) -> Vec<NetworkConnectionItem> {
        Vec::new()
    }

    pub fn query_wifi_status() -> Option<WifiDetails> {
        None
    }

    pub fn native_icmp_ping(_dest: &str, _count: u32) -> Result<(u32, u32, Vec<f32>), String> {
        Err("ICMP ping only supported on Windows".to_string())
    }
}

// ============================================================================
// SYSTEM SNAPSHOT COLLECTOR
// ============================================================================

pub fn collect_network_system_snapshot(
    sys: &mut System,
    networks: &mut Networks,
    selected_adapter_id: Option<String>,
) -> NetworkSystemSnapshot {
    networks.refresh();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);

    let now = Instant::now();
    let now_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // 1. Get native adapters
    let mut adapters = win32_net::get_native_adapters();

    // If native adapters empty, fallback to sysinfo interfaces
    if adapters.is_empty() {
        for (name, iface) in networks.iter() {
            let ips: Vec<String> = iface
                .ip_networks()
                .iter()
                .map(|ip| ip.addr.to_string())
                .collect();
            adapters.push(NetworkAdapterSnapshot {
                id: name.clone(),
                name: name.clone(),
                description: name.clone(),
                adapter_type: "Network Adapter".to_string(),
                status: if iface.total_received() > 0 || iface.total_transmitted() > 0 {
                    "Connected".to_string()
                } else {
                    "Disconnected".to_string()
                },
                is_up: true,
                mac_address: iface.mac_address().to_string(),
                ipv4_addresses: ips,
                ipv6_addresses: Vec::new(),
                gateways: Vec::new(),
                dns_servers: Vec::new(),
                dhcp_enabled: false,
                link_speed_bps: None,
                rx_bytes_sec: 0,
                tx_bytes_sec: 0,
                total_rx_bytes: iface.total_received(),
                total_tx_bytes: iface.total_transmitted(),
                rx_errors: iface.total_errors_on_received(),
                tx_errors: iface.total_errors_on_transmitted(),
                dropped_packets: iface.total_packets_received().saturating_sub(iface.total_received()),
                wifi_details: None,
            });
        }
    }

    // 2. Query Wi-Fi info if present
    let wifi_details = win32_net::query_wifi_status();
    let has_wifi = wifi_details.is_some();

    // 3. Match sysinfo rates and totals to adapters
    let mut total_rx_sec: u64 = 0;
    let mut total_tx_sec: u64 = 0;

    with_net_tracker(|tracker| {
        for adapter in &mut adapters {
            // Find corresponding sysinfo interface
            let sysinfo_iface = networks.iter().find(|(name, _)| {
                name.eq_ignore_ascii_case(&adapter.name)
                    || name.eq_ignore_ascii_case(&adapter.id)
                    || adapter.description.contains(name.as_str())
            });

            if let Some((_, iface)) = sysinfo_iface {
                adapter.total_rx_bytes = iface.total_received();
                adapter.total_tx_bytes = iface.total_transmitted();
                adapter.rx_errors = iface.total_errors_on_received();
                adapter.tx_errors = iface.total_errors_on_transmitted();

                // Compute live rate from deltas
                let key = adapter.id.clone();
                if let Some(prev) = tracker.adapter_samples.get(&key) {
                    let elapsed = now.duration_since(prev.timestamp).as_secs_f64();
                    if elapsed > 0.05 {
                        let rx_delta = iface.total_received().saturating_sub(prev.total_rx);
                        let tx_delta = iface.total_transmitted().saturating_sub(prev.total_tx);
                        adapter.rx_bytes_sec = (rx_delta as f64 / elapsed) as u64;
                        adapter.tx_bytes_sec = (tx_delta as f64 / elapsed) as u64;
                    }
                } else {
                    // First observation
                    adapter.rx_bytes_sec = iface.received();
                    adapter.tx_bytes_sec = iface.transmitted();
                }

                tracker.adapter_samples.insert(
                    key,
                    AdapterSample {
                        timestamp: now,
                        total_rx: iface.total_received(),
                        total_tx: iface.total_transmitted(),
                    },
                );
            }

            // Attach Wi-Fi details to matching adapter
            if adapter.adapter_type == "Wi-Fi" && adapter.status == "Connected" {
                adapter.wifi_details = wifi_details.clone();
            }

            if adapter.is_up {
                total_rx_sec = total_rx_sec.saturating_add(adapter.rx_bytes_sec);
                total_tx_sec = total_tx_sec.saturating_add(adapter.tx_bytes_sec);
            }
        }
    });

    // 4. Build process lookup & per-process network activity
    let mut process_map: HashMap<u32, String> = HashMap::new();
    let mut top_processes: Vec<NetworkProcessItem> = Vec::new();

    with_net_tracker(|tracker| {
        for (&pid, proc_entry) in sys.processes() {
            let pid_u32 = pid.as_u32();
            let proc_name = proc_entry.name().to_string_lossy().to_string();
            process_map.insert(pid_u32, proc_name.clone());

            let disk_usage = proc_entry.disk_usage();
            let rx = disk_usage.read_bytes;
            let tx = disk_usage.written_bytes;

            // Compute rate deltas
            let (rx_rate, tx_rate) = if let Some(prev) = tracker.process_samples.get(&pid_u32) {
                let elapsed = now.duration_since(prev.timestamp).as_secs_f64();
                if elapsed > 0.05 {
                    let rx_d = rx.saturating_sub(prev.rx_bytes);
                    let tx_d = tx.saturating_sub(prev.tx_bytes);
                    (
                        (rx_d as f64 / elapsed) as u64,
                        (tx_d as f64 / elapsed) as u64,
                    )
                } else {
                    (0, 0)
                }
            } else {
                (0, 0)
            };

            tracker.process_samples.insert(
                pid_u32,
                ProcessNetSample {
                    timestamp: now,
                    rx_bytes: rx,
                    tx_bytes: tx,
                },
            );

            // Bounded filter for processes with actual activity
            if rx_rate > 0 || tx_rate > 0 {
                top_processes.push(NetworkProcessItem {
                    pid: pid_u32,
                    name: proc_name,
                    rx_bytes_sec: rx_rate,
                    tx_bytes_sec: tx_rate,
                    total_bytes_sec: rx_rate + tx_rate,
                });
            }
        }
    });

    top_processes.sort_by(|a, b| b.total_bytes_sec.cmp(&a.total_bytes_sec));
    top_processes.truncate(20);

    // 5. Active TCP connections
    let active_connections = win32_net::get_active_tcp_connections(&process_map);

    // 6. Diagnostics & Evidence-based observations
    let mut notices = Vec::new();
    let active_adapter = adapters.iter().find(|a| a.status == "Connected" && !a.ipv4_addresses.is_empty());
    let active_adapter_name = active_adapter.map(|a| a.name.clone());
    let active_adapter_type = active_adapter.map(|a| a.adapter_type.clone());

    let internet_connected = active_adapter.is_some();
    let gateway_reachable = active_adapter.map(|a| !a.gateways.is_empty()).unwrap_or(false);
    let dns_configured = active_adapter.map(|a| !a.dns_servers.is_empty()).unwrap_or(false);

    let mut weak_wifi = false;
    if let Some(ref wifi) = wifi_details {
        if wifi.signal_quality_percent < 40 {
            weak_wifi = true;
            notices.push(format!(
                "Weak Wi-Fi Signal: Current signal quality is {}% on SSID '{}'. Consider moving closer to the router or switching to 5 GHz.",
                wifi.signal_quality_percent, wifi.ssid
            ));
        }
    }

    if !internet_connected {
        notices.push("No Active Network Connection: All network adapters are disconnected or lack IP configuration.".to_string());
    } else {
        if !gateway_reachable {
            notices.push("Gateway Unreachable: The active adapter does not have a configured default gateway.".to_string());
        }
        if !dns_configured {
            notices.push("DNS Not Configured: No DNS servers detected on the active connection. Domain resolution may fail.".to_string());
        }
    }

    let high_activity = total_rx_sec + total_tx_sec > 10 * 1024 * 1024; // > 10 MB/s
    if high_activity {
        let top_proc_str = top_processes.first().map(|p| format!(" (Top process: {})", p.name)).unwrap_or_default();
        notices.push(format!(
            "Elevated Network Throughput: Total activity is currently {:.2} MB/s{}.",
            (total_rx_sec + total_tx_sec) as f64 / (1024.0 * 1024.0),
            top_proc_str
        ));
    }

    NetworkSystemSnapshot {
        timestamp_ms: now_epoch_ms,
        adapters,
        selected_adapter_id,
        total_rx_bytes_sec: total_rx_sec,
        total_tx_bytes_sec: total_tx_sec,
        top_processes,
        active_connections,
        diagnostics: NetworkDiagnostics {
            internet_connected,
            active_adapter_name,
            active_adapter_type,
            gateway_reachable,
            dns_configured,
            weak_wifi_signal: weak_wifi,
            high_activity_detected: high_activity,
            diagnostic_notices: notices,
        },
        capabilities: NetworkCapabilities {
            supports_wifi: has_wifi,
            supports_signal_strength: has_wifi,
            supports_link_speed: true,
            supports_connection_table: true,
            supports_process_usage: true,
            supports_ping: true,
        },
    }
}

// ============================================================================
// SAFE PING EXECUTION
// ============================================================================

pub fn run_ping_diagnostics(target: &str) -> NetworkPingResult {
    let now_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    // Strict input validation to prevent injection or malicious inputs
    let clean_target = target.trim();
    if clean_target.is_empty()
        || clean_target.len() > 255
        || clean_target.contains(|c: char| !(c.is_alphanumeric() || c == '.' || c == '-' || c == ':'))
    {
        return NetworkPingResult {
            target: target.to_string(),
            resolved_ip: None,
            packets_sent: 0,
            packets_received: 0,
            packet_loss_percent: 100.0,
            min_latency_ms: None,
            avg_latency_ms: None,
            max_latency_ms: None,
            status_message: "Invalid target: Only valid hostnames or IP addresses allowed.".to_string(),
            timestamp_ms: now_epoch_ms,
        };
    }

    // Resolve target to IPv4
    let resolve_query = if clean_target.contains(':') {
        clean_target.to_string()
    } else {
        format!("{}:80", clean_target)
    };

    let target_ip = match std::net::ToSocketAddrs::to_socket_addrs(&resolve_query) {
        Ok(addrs) => {
            let mut found_ipv4 = None;
            for addr in addrs {
                if let std::net::SocketAddr::V4(v4) = addr {
                    found_ipv4 = Some(v4.ip().to_string());
                    break;
                }
            }
            found_ipv4
        }
        Err(_) => None,
    };

    let dest_ip = match target_ip {
        Some(ref ip) => ip.clone(),
        None => {
            return NetworkPingResult {
                target: target.to_string(),
                resolved_ip: None,
                packets_sent: 4,
                packets_received: 0,
                packet_loss_percent: 100.0,
                min_latency_ms: None,
                avg_latency_ms: None,
                max_latency_ms: None,
                status_message: format!("DNS Resolution Failed: Unable to resolve '{}' to an IP address.", clean_target),
                timestamp_ms: now_epoch_ms,
            };
        }
    };

    // Execute native ICMP ping
    match win32_net::native_icmp_ping(&dest_ip, 4) {
        Ok((sent, received, latencies)) => {
            let loss_pct = if sent > 0 {
                ((sent - received) as f32 / sent as f32) * 100.0
            } else {
                100.0
            };

            let (min_l, avg_l, max_l) = if !latencies.is_empty() {
                let min = latencies.iter().cloned().fold(f32::INFINITY, f32::min);
                let max = latencies.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
                let sum: f32 = latencies.iter().sum();
                let avg = sum / latencies.len() as f32;
                (Some(min), Some(avg), Some(max))
            } else {
                (None, None, None)
            };

            let status = if received == sent {
                format!("Success: 4/4 packets received (0% packet loss, avg {:.1} ms)", avg_l.unwrap_or(0.0))
            } else if received > 0 {
                format!("Partial loss: {}/{} packets received ({:.0}% packet loss)", received, sent, loss_pct)
            } else {
                format!("Destination unreachable: 0/{} packets received (100% packet loss)", sent)
            };

            NetworkPingResult {
                target: target.to_string(),
                resolved_ip: Some(dest_ip),
                packets_sent: sent,
                packets_received: received,
                packet_loss_percent: loss_pct,
                min_latency_ms: min_l,
                avg_latency_ms: avg_l,
                max_latency_ms: max_l,
                status_message: status,
                timestamp_ms: now_epoch_ms,
            }
        }
        Err(err) => NetworkPingResult {
            target: target.to_string(),
            resolved_ip: Some(dest_ip),
            packets_sent: 4,
            packets_received: 0,
            packet_loss_percent: 100.0,
            min_latency_ms: None,
            avg_latency_ms: None,
            max_latency_ms: None,
            status_message: format!("Ping error: {}", err),
            timestamp_ms: now_epoch_ms,
        },
    }
}

// ============================================================================
// UNIT TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_network_snapshot_generation() {
        let mut sys = System::new();
        let mut net = Networks::new_with_refreshed_list();
        let snapshot = collect_network_system_snapshot(&mut sys, &mut net, None);

        assert!(snapshot.timestamp_ms > 0, "Timestamp must be valid");
        assert!(!snapshot.adapters.is_empty(), "Must detect at least 1 network adapter");
    }

    #[test]
    fn test_ping_target_validation() {
        let result = run_ping_diagnostics("invalid;rm -rf /;test");
        assert_eq!(result.packets_sent, 0, "Should reject malicious target");
        assert!(result.status_message.contains("Invalid target"));

        let empty_result = run_ping_diagnostics("   ");
        assert_eq!(empty_result.packets_sent, 0, "Should reject empty target");
    }

    #[test]
    fn test_local_loopback_ping() {
        let result = run_ping_diagnostics("127.0.0.1");
        assert_eq!(result.packets_sent, 4, "Must send 4 packets");
        assert_eq!(result.resolved_ip, Some("127.0.0.1".to_string()));
        assert!(result.packets_received > 0, "Loopback ping must succeed");
        assert!(result.avg_latency_ms.is_some(), "Loopback ping must produce latency");
    }
}
