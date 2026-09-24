//! Battery & Power State Logic

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatteryMetrics {
    pub percentage: Option<f32>,
    pub is_charging: bool,
    pub power_source: String,
}
