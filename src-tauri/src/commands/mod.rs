pub mod benchmark;
pub mod cleanup;
pub mod cpu;
pub mod disk_net;
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

#[tauri::command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<(), String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn window_close(window: tauri::Window, db: tauri::State<'_, Database>) -> Result<(), String> {
    let minimize_to_tray = db.get_setting("minimize_to_tray").unwrap_or_else(|| "true".into()) == "true";
    if minimize_to_tray {
        window.hide().map_err(|e| e.to_string())
    } else {
        window.close().map_err(|e| e.to_string())
    }
}
