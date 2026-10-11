pub mod benchmark;
pub mod capabilities;
pub mod cleanup;
pub mod cpu;
pub mod disk_net;
pub mod fans;
pub mod gpu;
pub mod hardware_security;
pub mod memory;
pub mod performance;
pub mod power;
pub mod processes;
pub mod startup;
pub mod system;
pub mod system_control;
pub mod updates;

use crate::db::Database;
use std::collections::HashMap;

#[tauri::command]
pub fn get_settings(db: tauri::State<'_, Database>) -> Result<HashMap<String, String>, String> {
    db.get_all_settings().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn set_setting(
    db: tauri::State<'_, Database>,
    key: String,
    value: String,
) -> Result<bool, String> {
    let clean_key = key.trim();
    if clean_key.is_empty() || clean_key.len() > 128 {
        return Err("Invalid setting key length (must be 1-128 characters)".into());
    }
    if !clean_key
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err("Invalid setting key format. Allowed characters: [a-zA-Z0-9_.-]".into());
    }
    if value.len() > 4096 {
        return Err("Setting value exceeds maximum allowed size (4096 bytes)".into());
    }

    db.set_setting(clean_key, &value)
        .map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn window_minimize(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_toggle_maximize(window: tauri::Window) -> Result<bool, String> {
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())?;
        Ok(false)
    } else {
        window.maximize().map_err(|e| e.to_string())?;
        Ok(true)
    }
}

#[tauri::command]
pub fn window_is_maximized(window: tauri::Window) -> Result<bool, String> {
    window.is_maximized().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn window_close(
    window: tauri::Window,
    app: tauri::AppHandle,
    db: tauri::State<'_, Database>,
) -> Result<(), String> {
    let close_to_tray = db
        .get_setting("close_to_tray")
        .unwrap_or_else(|| "false".into())
        == "true";

    if close_to_tray && crate::tray::is_tray_active() {
        crate::logging::log("INFO", "Window close requested: hiding to system tray");
        window.hide().map_err(|e| e.to_string())
    } else {
        crate::logging::log(
            "INFO",
            "Window close requested: closing window and terminating application",
        );
        let _ = window.close();
        app.exit(0);
        Ok(())
    }
}

#[tauri::command]
pub fn log_client_message(level: String, message: String) {
    let clean_level = match level.to_lowercase().as_str() {
        "warn" | "warning" => "FRONTEND_WARN",
        "error" => "FRONTEND_ERROR",
        "debug" => "FRONTEND_DEBUG",
        _ => "FRONTEND_INFO",
    };
    crate::logging::log(clean_level, &message);
}
