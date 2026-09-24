//! CPU Telemetry & Topology Logic

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuMetrics {
    pub name: String,
    pub cores_physical: usize,
    pub cores_logical: usize,
    pub usage_percent: f32,
    pub frequency_mhz: u64,
}
