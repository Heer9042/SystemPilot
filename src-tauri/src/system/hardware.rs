//! Hardware Information Logic

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HardwareInfo {
    pub os_name: String,
    pub os_version: String,
    pub host_name: String,
    pub kernel_version: String,
}
