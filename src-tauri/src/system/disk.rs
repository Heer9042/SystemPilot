//! Disk & Volume Telemetry Logic

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskMetrics {
    pub mount_point: String,
    pub name: String,
    pub total_space: u64,
    pub available_space: u64,
    pub is_removable: bool,
}
