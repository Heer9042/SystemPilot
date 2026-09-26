pub mod commands;
pub mod config;
pub mod database;
pub mod db;
pub mod errors;
pub mod logging;
pub mod monitoring;
pub mod system;
pub mod tray;
pub mod windows;

use std::path::PathBuf;
use tauri::Manager;

pub fn run() {
    let app_dir = dirs_or_local();
    std::fs::create_dir_all(&app_dir).unwrap_or_default();
    let db_path = app_dir.join("systempilot.db");
    let database = db::Database::init(db_path).expect("Failed to initialize SQLite database");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_fs::init())
        .manage(database)
        .manage(commands::system::SystemState::default())
        .manage(commands::benchmark::BenchmarkState::default())
        .invoke_handler(tauri::generate_handler![
            // System
            commands::system::get_system_stats,
            // Memory
            commands::memory::get_detailed_memory_stats,
            commands::memory::clean_memory,
            // Processes
            commands::processes::get_processes,
            commands::processes::terminate_process,
            commands::processes::set_process_priority,
            commands::processes::set_process_affinity,
            commands::processes::suspend_process,
            commands::processes::resume_process,
            // CPU & GPU
            commands::cpu::get_cpu_detailed_info,
            commands::gpu::get_gpu_info,
            // Disk & Network
            commands::disk_net::get_disk_details,
            commands::disk_net::get_network_details,
            // Power
            commands::power::get_power_plans,
            commands::power::set_power_plan,
            // Startup & Cleanup
            commands::startup::get_startup_items,
            commands::cleanup::scan_cleanable_items,
            commands::cleanup::execute_cleanup,
            commands::cleanup::get_cleanup_history,
            // Hardware & Security
            commands::hardware_security::get_hardware_summary,
            commands::hardware_security::get_security_status,
            // Benchmark & Stress
            commands::benchmark::run_cpu_benchmark,
            commands::benchmark::run_memory_benchmark,
            commands::benchmark::run_disk_benchmark,
            commands::benchmark::start_cpu_stress,
            commands::benchmark::stop_cpu_stress,
            commands::benchmark::get_benchmark_history,
            // Settings
            commands::get_settings,
            commands::set_setting,
            // Window Controls
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_close,
            // Updates & Versioning
            commands::updates::get_app_version,
            commands::updates::open_release_notes,
            commands::updates::download_and_verify_update,
            commands::updates::install_update_and_restart,
        ])
        .setup(|app| {
            // Setup background monitoring thread for Auto RAM clean
            let app_handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut last_clean = std::time::Instant::now();
                loop {
                    std::thread::sleep(std::time::Duration::from_secs(5));
                    let db_state = app_handle.try_state::<db::Database>();
                    let sys_state = app_handle.try_state::<commands::system::SystemState>();

                    if let (Some(db), Some(sys)) = (db_state, sys_state) {
                        let auto_enabled =
                            db.get_setting("auto_clean_enabled").unwrap_or_default() == "true";
                        if auto_enabled {
                            let threshold: f32 = db
                                .get_setting("auto_clean_threshold")
                                .and_then(|v| v.parse().ok())
                                .unwrap_or(85.0);
                            let cooldown_min: u64 = db
                                .get_setting("auto_clean_cooldown_min")
                                .and_then(|v| v.parse().ok())
                                .unwrap_or(5);

                            if last_clean.elapsed()
                                >= std::time::Duration::from_secs(cooldown_min * 60)
                            {
                                let mut s = sys.sys.lock().unwrap();
                                s.refresh_memory();
                                let total = s.total_memory();
                                let used = s.used_memory();
                                let pct = if total > 0 {
                                    (used as f32 / total as f32) * 100.0
                                } else {
                                    0.0
                                };

                                if pct >= threshold {
                                    drop(s);
                                    let _ = commands::memory::clean_memory(sys.clone(), db.clone());
                                    last_clean = std::time::Instant::now();
                                }
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn dirs_or_local() -> PathBuf {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local).join("SystemPilot")
    } else {
        PathBuf::from("./data")
    }
}
