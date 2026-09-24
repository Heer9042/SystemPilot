//! Network Telemetry Logic

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkMetrics {
    pub interface_name: String,
    pub received_bytes: u64,
    pub transmitted_bytes: u64,
    pub rx_rate_bytes_per_sec: f64,
    pub tx_rate_bytes_per_sec: f64,
}
