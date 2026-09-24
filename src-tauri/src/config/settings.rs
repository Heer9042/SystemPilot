use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AppSettings {
    pub theme: String,
    pub refresh_interval_ms: u64,
    pub auto_clean_enabled: bool,
    pub auto_clean_threshold: f32,
    pub auto_clean_cooldown_min: u64,
    pub start_with_windows: bool,
    pub minimize_to_tray: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            refresh_interval_ms: 1000,
            auto_clean_enabled: false,
            auto_clean_threshold: 85.0,
            auto_clean_cooldown_min: 5,
            start_with_windows: false,
            minimize_to_tray: true,
        }
    }
}
