use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

static LOG_MUTEX: Mutex<()> = Mutex::new(());

fn get_log_path() -> PathBuf {
    if let Ok(local) = std::env::var("LOCALAPPDATA") {
        PathBuf::from(local)
            .join("SystemPilot")
            .join("systempilot.log")
    } else {
        PathBuf::from("./data/systempilot.log")
    }
}

pub fn log(level: &str, message: &str) {
    let _guard = LOG_MUTEX.lock().unwrap_or_else(|e| e.into_inner());
    let path = get_log_path();

    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    // Check size and rotate if > 5MB
    if let Ok(meta) = fs::metadata(&path) {
        if meta.len() > 5 * 1024 * 1024 {
            let backup = path.with_extension("log.bak");
            let _ = fs::rename(&path, &backup);
        }
    }

    // Sanitize CRLF characters and control characters to prevent Log Injection (CWE-117)
    let clean_level = level.replace(|c: char| c == '\r' || c == '\n', "");
    let clean_msg = message
        .replace('\r', "")
        .replace('\n', " ")
        .chars()
        .take(2048)
        .collect::<String>();

    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    let line = format!("[{}] [{}] {}\n", now, clean_level, clean_msg);

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&path) {
        let _ = file.write_all(line.as_bytes());
    }

    #[cfg(debug_assertions)]
    eprintln!("[{}] [{}] {}", now, clean_level, clean_msg);
}

pub fn init_logging() {
    log("INFO", "=== SystemPilot Logging Initialized ===");
    log("INFO", &format!("Version: {}", env!("CARGO_PKG_VERSION")));
    log(
        "INFO",
        &format!(
            "Executable: {:?}",
            std::env::current_exe().unwrap_or_default()
        ),
    );
    log(
        "INFO",
        &format!(
            "Current Dir: {:?}",
            std::env::current_dir().unwrap_or_default()
        ),
    );

    std::panic::set_hook(Box::new(|info| {
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            (*s).to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic payload".to_string()
        };

        let location = if let Some(loc) = info.location() {
            format!("{}:{}:{}", loc.file(), loc.line(), loc.column())
        } else {
            "Unknown location".to_string()
        };

        log(
            "FATAL_PANIC",
            &format!("Thread panicked at '{}' in {}: {}", payload, location, info),
        );
    }));
}
