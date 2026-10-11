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

#[cfg(target_os = "windows")]
pub mod single_instance {
    use std::sync::atomic::{AtomicPtr, Ordering};
    use windows_sys::Win32::Foundation::{
        CloseHandle, GetLastError, BOOL, ERROR_ALREADY_EXISTS, HWND, LPARAM,
    };
    use windows_sys::Win32::System::Threading::CreateMutexW;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        EnumWindows, GetWindowTextW, SetForegroundWindow, ShowWindow, SW_RESTORE, SW_SHOW,
    };

    static MUTEX_HANDLE: AtomicPtr<std::ffi::c_void> = AtomicPtr::new(std::ptr::null_mut());

    pub fn acquire(allow_existing: bool) -> bool {
        // Use Local\ session namespace to guarantee standard user & elevated user access
        // without requiring SeCreateGlobalPrivilege which fails on standard Windows user accounts.
        let mutex_name: Vec<u16> = "Local\\SystemPilot_App_SingleInstance_Mutex\0"
            .encode_utf16()
            .collect();

        unsafe {
            let handle = CreateMutexW(std::ptr::null_mut(), 1, mutex_name.as_ptr());
            if handle.is_null() {
                let err = GetLastError();
                crate::logging::log(
                    "WARN",
                    &format!("[SingleInstance] Failed to create mutex: Win32 error {err}. Allowing launch."),
                );
                return true;
            }

            let already_exists = GetLastError() == ERROR_ALREADY_EXISTS;
            if already_exists && !allow_existing {
                crate::logging::log(
                    "WARN",
                    "[Startup] SystemPilot is already running. Restoring and focusing existing instance.",
                );
                activate_existing_window();
                CloseHandle(handle);
                return false;
            }

            let old = MUTEX_HANDLE.swap(handle, Ordering::SeqCst);
            if !old.is_null() {
                CloseHandle(old);
            }
            true
        }
    }

    pub fn release() {
        let handle = MUTEX_HANDLE.swap(std::ptr::null_mut(), Ordering::SeqCst);
        if !handle.is_null() {
            unsafe {
                CloseHandle(handle);
            }
            crate::logging::log("INFO", "[SingleInstance] Mutex released cleanly.");
        }
    }

    pub fn reacquire() {
        acquire(true);
    }

    pub unsafe fn activate_existing_window() {
        #[allow(non_snake_case)]
        extern "system" {
            fn AllowSetForegroundWindow(dwProcessId: u32) -> BOOL;
        }
        const ASFW_ANY: u32 = 0xFFFFFFFF;
        AllowSetForegroundWindow(ASFW_ANY);

        struct SearchContext {
            found: HWND,
        }

        unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
            let ctx = &mut *(lparam as *mut SearchContext);
            let mut title_buf = [0u16; 256];
            let len = GetWindowTextW(hwnd, title_buf.as_mut_ptr(), 256);
            if len > 0 {
                let title = String::from_utf16_lossy(&title_buf[..len as usize]);
                if title.contains("SystemPilot") {
                    ctx.found = hwnd;
                    return 0; // stop enumeration
                }
            }
            1 // continue enumeration
        }

        let mut ctx = SearchContext {
            found: std::ptr::null_mut(),
        };
        EnumWindows(Some(enum_proc), &mut ctx as *mut _ as LPARAM);

        if !ctx.found.is_null() {
            crate::logging::log(
                "INFO",
                "[SingleInstance] Located existing SystemPilot window. Unhiding, restoring, and setting foreground.",
            );
            ShowWindow(ctx.found, SW_SHOW);
            ShowWindow(ctx.found, SW_RESTORE);
            SetForegroundWindow(ctx.found);
        } else {
            crate::logging::log(
                "WARN",
                "[SingleInstance] No existing window with 'SystemPilot' in title was found in current session.",
            );
        }
    }
}

pub fn release_single_instance_mutex() {
    #[cfg(target_os = "windows")]
    single_instance::release();
}

pub fn reacquire_single_instance_mutex() {
    #[cfg(target_os = "windows")]
    single_instance::reacquire();
}

pub fn run() {
    logging::init_logging();
    let is_elevated = crate::windows::security::is_current_process_elevated();
    logging::log(
        "INFO",
        &format!(
            "[Startup] Phase 1/6: START (PID: {}, Elevated: {})",
            std::process::id(),
            is_elevated
        ),
    );

    let args: Vec<String> = std::env::args().collect();
    let is_elevated_child = args.iter().any(|a| a == "--elevated-child");

    // Single-instance enforcement and loop protection on Windows:
    // Guarantees that secondary launches do not create duplicate
    // application instances, tray icons, or recursive elevation loops.
    #[cfg(target_os = "windows")]
    {
        if is_elevated_child {
            // Give parent process brief moment to release mutex and exit cleanly
            std::thread::sleep(std::time::Duration::from_millis(150));
        }

        if !single_instance::acquire(is_elevated_child) {
            std::process::exit(0);
        }
    }

    let app_dir = dirs_or_local();
    std::fs::create_dir_all(&app_dir).unwrap_or_default();
    logging::log(
        "INFO",
        &format!(
            "[Startup] Phase 2/6: DATA DIRECTORY verified at {}",
            app_dir.display()
        ),
    );

    let args: Vec<String> = std::env::args().collect();
    if args.iter().any(|a| a == "--diagnostics" || a == "-d") {
        run_diagnostics(&app_dir);
    }

    let db_path = app_dir.join("systempilot.db");
    let database = match db::Database::init(db_path.clone()) {
        Ok(db) => {
            logging::log(
                "INFO",
                "[Startup] Phase 3/6: DATABASE initialized successfully",
            );
            db
        }
        Err(err) => {
            logging::log(
                "ERROR",
                &format!(
                    "Database initialization failed at {}: {}. Attempting safe fallback...",
                    db_path.display(),
                    err
                ),
            );
            let fallback_path = std::env::temp_dir().join("systempilot_fallback.db");
            db::Database::init(fallback_path).unwrap_or_else(|_| {
                logging::log("ERROR", "Fallback database failed, using in-memory state");
                db::Database::init_in_memory()
            })
        }
    };

    let builder = tauri::Builder::default()
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
            commands::processes::get_process_properties,
            commands::processes::terminate_process,
            commands::processes::terminate_process_tree,
            commands::processes::open_process_location,
            commands::processes::set_process_priority,
            commands::processes::set_process_affinity,
            commands::processes::suspend_process,
            commands::processes::resume_process,
            // CPU & GPU
            commands::cpu::get_cpu_snapshot,
            commands::cpu::get_cpu_detailed_info,
            commands::gpu::get_gpu_system_snapshot,
            commands::gpu::get_gpu_info,
            // Disk & Network
            commands::disk_net::get_disk_details,
            commands::disk_net::get_disk_system_snapshot,
            commands::disk_net::get_network_details,
            commands::disk_net::get_network_system_snapshot,
            commands::disk_net::run_network_ping_test,
            // Performance & Power
            commands::performance::get_performance_snapshot,
            commands::power::get_power_plans,
            commands::power::set_power_plan,
            // Startup & Cleanup
            commands::startup::get_startup_items,
            commands::startup::toggle_startup_item,
            commands::startup::get_startup_change_history,
            commands::startup::restore_startup_item,
            commands::cleanup::scan_cleanable_items,
            commands::cleanup::scan_large_files,
            commands::cleanup::execute_cleanup,
            commands::cleanup::get_cleanup_history,
            // Hardware & Security
            commands::hardware_security::get_hardware_summary,
            commands::hardware_security::get_security_status,
            // Benchmark & Stress
            commands::benchmark::run_cpu_benchmark,
            commands::benchmark::run_memory_benchmark,
            commands::benchmark::run_disk_benchmark,
            commands::benchmark::run_gpu_benchmark,
            commands::benchmark::run_combined_benchmark,
            commands::benchmark::start_cpu_stress,
            commands::benchmark::stop_cpu_stress,
            commands::benchmark::get_benchmark_history,
            // Settings
            commands::get_settings,
            commands::set_setting,
            // Window Controls
            commands::window_minimize,
            commands::window_toggle_maximize,
            commands::window_is_maximized,
            commands::window_close,
            // Logging
            commands::log_client_message,
            // Updates & Versioning
            commands::updates::get_app_version,
            commands::updates::open_release_notes,
            commands::updates::download_and_verify_update,
            commands::updates::install_update_and_restart,
            // Windows System Control, BIOS & Native Tools
            commands::system_control::get_windows_system_info,
            commands::system_control::get_windows_activation_status,
            commands::system_control::get_bios_firmware_info,
            commands::system_control::restart_to_uefi_firmware,
            commands::system_control::get_cooling_info,
            commands::system_control::get_windows_services,
            commands::system_control::get_firewall_status,
            commands::system_control::get_local_users,
            commands::system_control::get_system_restore_status,
            commands::system_control::launch_windows_tool,
            commands::system_control::get_system_event_logs,
            commands::system_control::get_disk_partitions_info,
            commands::system_control::get_privilege_status,
            commands::system_control::request_admin_elevation,
            commands::system_control::open_permissions_disclosure,
            commands::system_control::get_windows_tools_directory,
            commands::system_control::get_device_inventory,
            commands::system_control::get_scheduled_tasks,
            commands::system_control::open_drive_location,
            commands::system_control::export_diagnostic_report,
            // Fan & Smart Cooling Management
            commands::fans::get_fan_cooling_details,
            commands::fans::set_cooling_policy,
            commands::fans::set_manual_fan_speed,
            commands::fans::restore_automatic_cooling,
            commands::capabilities::get_system_capabilities,
        ])
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                logging::log(
                    "INFO",
                    &format!("WindowEvent::CloseRequested on '{}'", window.label()),
                );
                let app = window.app_handle();
                let is_tray = crate::tray::is_tray_active();
                let close_to_tray = app
                    .try_state::<db::Database>()
                    .and_then(|db| db.get_setting("close_to_tray"))
                    .unwrap_or_else(|| "false".into())
                    == "true";

                if close_to_tray && is_tray {
                    api.prevent_close();
                    let _ = window.hide();
                    logging::log("INFO", "Window close prevented, hidden to system tray");
                }
            }
            tauri::WindowEvent::Destroyed => {
                logging::log(
                    "INFO",
                    &format!("WindowEvent::Destroyed on '{}'", window.label()),
                );
            }
            _ => {}
        })
        .setup(|app| {
            logging::log(
                "INFO",
                "[Startup] Phase 4/6: TRAY & SYSTEM HOOKS initializing",
            );

            // Setup system tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                logging::log(
                    "WARN",
                    &format!("Tray setup encountered non-fatal error: {e}"),
                );
            }

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
                                let mut s = match sys.sys.lock() {
                                    Ok(guard) => guard,
                                    Err(poisoned) => poisoned.into_inner(),
                                };
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

            logging::log(
                "INFO",
                "[Startup] Phase 5/6: BACKGROUND MONITORING WORKER active",
            );
            Ok(())
        });

    logging::log("INFO", "[Startup] Phase 6/6: APPLICATION READY");

    let app = match builder.build(tauri::generate_context!()) {
        Ok(app) => app,
        Err(err) => {
            let err_msg = format!(
                "SystemPilot could not initialize the desktop runtime:\n\n{}\n\nPlease verify that the Microsoft Edge WebView2 Evergreen Runtime is installed.",
                err
            );
            logging::log("FATAL_STARTUP_ERROR", &err_msg);
            #[cfg(target_os = "windows")]
            unsafe {
                use windows_sys::Win32::UI::WindowsAndMessaging::{
                    MessageBoxW, MB_ICONERROR, MB_OK,
                };
                let title: Vec<u16> = "SystemPilot — Startup Failure\0".encode_utf16().collect();
                let text: Vec<u16> = format!("{}\0", err_msg).encode_utf16().collect();
                MessageBoxW(
                    std::ptr::null_mut(),
                    text.as_ptr(),
                    title.as_ptr(),
                    MB_ICONERROR | MB_OK,
                );
            }
            std::process::exit(1);
        }
    };

    app.run(|_app_handle, event| match &event {
        tauri::RunEvent::Exit => {
            logging::log("INFO", "Tauri RunEvent::Exit received");
            #[cfg(target_os = "windows")]
            single_instance::release();
        }
        tauri::RunEvent::ExitRequested { code, .. } => {
            logging::log(
                "INFO",
                &format!("Tauri RunEvent::ExitRequested (code: {code:?})"),
            );
            // Allow clean teardown of Tao event loop on Windows to avoid 'cannot move state from Destroyed' panic
        }
        _ => {}
    });
}

fn dirs_or_local() -> PathBuf {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local).join("SystemPilot")
    } else {
        PathBuf::from("./data")
    }
}

fn run_diagnostics(app_dir: &std::path::Path) {
    logging::log(
        "DIAGNOSTICS",
        "=== SystemPilot Diagnostics Mode Started ===",
    );
    logging::log(
        "DIAGNOSTICS",
        &format!(
            "OS: {}, Architecture: {}",
            std::env::consts::OS,
            std::env::consts::ARCH
        ),
    );
    logging::log(
        "DIAGNOSTICS",
        &format!("App Version: {}", env!("CARGO_PKG_VERSION")),
    );
    logging::log(
        "DIAGNOSTICS",
        &format!(
            "Executable: {:?}",
            std::env::current_exe().unwrap_or_default()
        ),
    );
    logging::log(
        "DIAGNOSTICS",
        &format!("Data Directory: {}", app_dir.display()),
    );

    let write_test_file = app_dir.join(".diag_write_test");
    let is_writable = std::fs::write(&write_test_file, b"OK").is_ok();
    let _ = std::fs::remove_file(write_test_file);
    logging::log(
        "DIAGNOSTICS",
        &format!("Data Directory Writable: {is_writable}"),
    );

    #[cfg(target_os = "windows")]
    {
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));
        let webview_adjacent = exe_dir
            .as_ref()
            .map(|d| d.join("WebView2Loader.dll").exists())
            .unwrap_or(false);
        let manifest_adjacent = exe_dir
            .as_ref()
            .map(|d| d.join("systempilot.exe.manifest").exists())
            .unwrap_or(false);
        logging::log(
            "DIAGNOSTICS",
            &format!("WebView2Loader.dll adjacent to EXE: {webview_adjacent}"),
        );
        logging::log(
            "DIAGNOSTICS",
            &format!("Manifest adjacent to EXE: {manifest_adjacent}"),
        );
        let is_elevated = crate::windows::security::is_current_process_elevated();
        logging::log(
            "DIAGNOSTICS",
            &format!(
                "Process Execution Privilege: {}",
                if is_elevated {
                    "Administrator (Elevated)"
                } else {
                    "Standard User (asInvoker, Principle of Least Privilege)"
                }
            ),
        );

        let mut sys = sysinfo::System::new();
        let snapshot = crate::system::gpu::collect_gpu_system_snapshot(&mut sys, 0);
        logging::log(
            "DIAGNOSTICS",
            &format!(
                "DXGI Display Adapters detected: {}",
                snapshot.adapters.len()
            ),
        );
        for (i, gpu) in snapshot.adapters.iter().enumerate() {
            logging::log(
                "DIAGNOSTICS",
                &format!(
                    "  Adapter {i}: {} (VRAM: {} MB, Displays: {})",
                    gpu.name,
                    gpu.memory.dedicated_total_bytes / 1024 / 1024,
                    gpu.displays.len()
                ),
            );
        }
    }
    logging::log(
        "DIAGNOSTICS",
        "=== SystemPilot Diagnostics Mode Completed ===",
    );
}
