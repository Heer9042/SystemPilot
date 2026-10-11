//! System Tray management module for SystemPilot (Tauri v2)

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

static TRAY_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn is_tray_active() -> bool {
    TRAY_ACTIVE.load(Ordering::Relaxed)
}

pub fn is_tray_supported() -> bool {
    true
}

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItem::with_id(app, "show", "Open SystemPilot", true, None::<&str>)?;
    let clean_ram =
        MenuItem::with_id(app, "clean_ram", "Clean Memory (Quick)", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Exit SystemPilot", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &clean_ram, &quit_item])?;

    let icon = match app.default_window_icon() {
        Some(icon) => icon.clone(),
        None => {
            crate::logging::log("WARN", "No default window icon available for tray icon");
            return Ok(());
        }
    };

    let _tray = TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("SystemPilot")
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
            }
            "clean_ram" => {
                if let (Some(sys), Some(db)) = (
                    app.try_state::<crate::commands::system::SystemState>(),
                    app.try_state::<crate::db::Database>(),
                ) {
                    let _ = crate::commands::memory::clean_memory(sys, db);
                }
            }
            "quit" => {
                crate::logging::log("INFO", "User selected Quit from system tray menu");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let is_visible = window.is_visible().unwrap_or(false);
                    if is_visible {
                        let _ = window.set_focus();
                    } else {
                        let _ = window.show();
                        let _ = window.unminimize();
                        let _ = window.set_focus();
                    }
                }
            }
        })
        .build(app)?;

    TRAY_ACTIVE.store(true, Ordering::Relaxed);
    crate::logging::log("INFO", "System Tray initialized successfully");
    Ok(())
}
