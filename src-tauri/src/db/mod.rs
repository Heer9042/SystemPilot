use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupLog {
    pub id: Option<i64>,
    pub timestamp: String,
    pub bytes_cleaned: u64,
    pub categories: String,
    pub success: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BenchmarkLog {
    pub id: Option<i64>,
    pub timestamp: String,
    pub test_type: String,
    pub score: f64,
    pub duration_ms: u64,
    pub details: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GamingProfile {
    pub id: Option<i64>,
    pub name: String,
    pub process_name: String,
    pub power_mode: String,
    pub auto_clean_ram: bool,
    pub deprioritize_background: bool,
    pub enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AlertLog {
    pub id: Option<i64>,
    pub timestamp: String,
    pub alert_type: String,
    pub message: String,
    pub severity: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct DatabaseState {
    pub settings: HashMap<String, String>,
    pub cleanup_history: Vec<CleanupLog>,
    pub benchmark_history: Vec<BenchmarkLog>,
    pub gaming_profiles: Vec<GamingProfile>,
    pub alerts_log: Vec<AlertLog>,
    pub next_id: i64,
}

pub struct Database {
    db_path: PathBuf,
    state: Mutex<DatabaseState>,
}

impl Database {
    pub fn init(db_path: PathBuf) -> Result<Self, String> {
        let mut initial_state = DatabaseState::default();

        // Default initial settings
        let defaults = vec![
            ("theme", "dark"),
            ("refresh_interval_ms", "1000"),
            ("auto_clean_enabled", "false"),
            ("auto_clean_threshold", "85"),
            ("auto_clean_cooldown_min", "5"),
            ("notify_ram_threshold", "true"),
            ("notify_cpu_temp", "true"),
            ("notify_disk_low", "true"),
            ("start_minimized", "false"),
            ("minimize_to_tray", "true"),
            ("close_to_tray", "true"),
            ("start_with_windows", "false"),
        ];

        for (k, v) in defaults {
            initial_state.settings.insert(k.to_string(), v.to_string());
        }

        if db_path.exists() {
            if let Ok(data) = fs::read_to_string(&db_path) {
                if let Ok(saved_state) = serde_json::from_str::<DatabaseState>(&data) {
                    for (k, v) in saved_state.settings {
                        initial_state.settings.insert(k, v);
                    }
                    initial_state.cleanup_history = saved_state.cleanup_history;
                    initial_state.benchmark_history = saved_state.benchmark_history;
                    initial_state.gaming_profiles = saved_state.gaming_profiles;
                    initial_state.alerts_log = saved_state.alerts_log;
                    initial_state.next_id = saved_state.next_id;
                }
            }
        }

        Ok(Self {
            db_path,
            state: Mutex::new(initial_state),
        })
    }

    fn save_to_disk(&self, state: &DatabaseState) {
        if let Ok(serialized) = serde_json::to_string_pretty(state) {
            let tmp_path = self.db_path.with_extension("tmp");
            if fs::write(&tmp_path, serialized).is_ok() {
                let _ = fs::rename(&tmp_path, &self.db_path);
            }
        }
    }

    pub fn get_setting(&self, key: &str) -> Option<String> {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.settings.get(key).cloned()
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.settings.insert(key.to_string(), value.to_string());
        self.save_to_disk(&state);
        Ok(())
    }

    pub fn get_all_settings(&self) -> Result<HashMap<String, String>, String> {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        Ok(state.settings.clone())
    }

    pub fn add_cleanup_log(&self, bytes: u64, categories: &str, success: bool) -> Result<(), String> {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.next_id += 1;
        let id = state.next_id;
        let now = chrono::Local::now().to_rfc3339();
        state.cleanup_history.insert(
            0,
            CleanupLog {
                id: Some(id),
                timestamp: now,
                bytes_cleaned: bytes,
                categories: categories.to_string(),
                success,
            },
        );
        if state.cleanup_history.len() > 500 {
            state.cleanup_history.truncate(500);
        }
        self.save_to_disk(&state);
        Ok(())
    }

    pub fn get_cleanup_history(&self, limit: usize) -> Result<Vec<CleanupLog>, String> {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let logs: Vec<CleanupLog> = state.cleanup_history.iter().take(limit).cloned().collect();
        Ok(logs)
    }

    pub fn add_benchmark_log(&self, test_type: &str, score: f64, duration_ms: u64, details: &str) -> Result<(), String> {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.next_id += 1;
        let id = state.next_id;
        let now = chrono::Local::now().to_rfc3339();
        state.benchmark_history.insert(
            0,
            BenchmarkLog {
                id: Some(id),
                timestamp: now,
                test_type: test_type.to_string(),
                score,
                duration_ms,
                details: details.to_string(),
            },
        );
        if state.benchmark_history.len() > 500 {
            state.benchmark_history.truncate(500);
        }
        self.save_to_disk(&state);
        Ok(())
    }


    pub fn get_benchmark_history(&self, limit: usize) -> Result<Vec<BenchmarkLog>, String> {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        let logs: Vec<BenchmarkLog> = state.benchmark_history.iter().take(limit).cloned().collect();
        Ok(logs)
    }

    pub fn get_gaming_profiles(&self) -> Result<Vec<GamingProfile>, String> {
        let state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        Ok(state.gaming_profiles.clone())
    }

    pub fn save_gaming_profile(&self, profile: &GamingProfile) -> Result<(), String> {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(id) = profile.id {
            if let Some(existing) = state.gaming_profiles.iter_mut().find(|p| p.id == Some(id)) {
                *existing = profile.clone();
            }
        } else {
            state.next_id += 1;
            let mut new_profile = profile.clone();
            new_profile.id = Some(state.next_id);
            state.gaming_profiles.push(new_profile);
        }
        self.save_to_disk(&state);
        Ok(())
    }

    pub fn delete_gaming_profile(&self, id: i64) -> Result<(), String> {
        let mut state = self.state.lock().unwrap_or_else(|e| e.into_inner());
        state.gaming_profiles.retain(|p| p.id != Some(id));
        self.save_to_disk(&state);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_init_and_settings() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join(format!("test_systempilot_db_{}.json", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)));
        let db = Database::init(db_path.clone()).expect("Failed to init test db");

        assert_eq!(db.get_setting("theme"), Some("dark".to_string()));
        db.set_setting("theme", "light").expect("Failed to set setting");
        assert_eq!(db.get_setting("theme"), Some("light".to_string()));

        // Re-read from disk
        let db_reopened = Database::init(db_path.clone()).expect("Failed to reopen test db");
        assert_eq!(db_reopened.get_setting("theme"), Some("light".to_string()));

        let _ = fs::remove_file(&db_path);
    }

    #[test]
    fn test_cleanup_log_history_limit() {
        let temp_dir = std::env::temp_dir();
        let db_path = temp_dir.join(format!("test_cleanup_history_{}.json", chrono::Local::now().timestamp_nanos_opt().unwrap_or(0)));
        let db = Database::init(db_path.clone()).expect("Failed to init test db");

        for i in 0..10 {
            db.add_cleanup_log(1024 * i, "temp,logs", true).unwrap();
        }

        let history = db.get_cleanup_history(5).unwrap();
        assert_eq!(history.len(), 5);
        assert_eq!(history[0].bytes_cleaned, 1024 * 9);

        let _ = fs::remove_file(&db_path);
    }
}
