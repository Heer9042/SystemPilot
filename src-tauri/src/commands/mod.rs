pub mod benchmark;
pub mod cleanup;
pub mod cpu;
pub mod disk_net;
pub mod gaming;
pub mod gpu;
pub mod hardware_security;
pub mod memory;
pub mod power;
pub mod processes;
pub mod startup;
pub mod system;

use crate::db::Database;
use std::collections::HashMap;

#[tauri::command]
pub fn get_settings(db: tauri::State<'_, Database>) -> Result<HashMap<String, String>, String> {
    db.get_all_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(db: tauri::State<'_, Database>, key: String, value: String) -> Result<bool, String> {
    db.set_setting(&key, &value).map_err(|e| e.to_string())?;
    Ok(true)
}
