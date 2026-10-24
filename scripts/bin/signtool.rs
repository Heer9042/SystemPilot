use std::env;
use std::path::{Path, PathBuf};
use std::process::{exit, Command};

fn main() {
    let args: Vec<String> = env::args().collect();

    // Locate scripts/sign_artifact.ps1 relative to this binary
    let current_exe = env::current_exe().unwrap_or_else(|_| PathBuf::from("signtool.exe"));
    let bin_dir = current_exe.parent().unwrap_or_else(|| Path::new("."));
    let scripts_dir = bin_dir.parent().unwrap_or_else(|| Path::new("scripts"));
    let sign_script = scripts_dir.join("sign_artifact.ps1");

    // Discover the target file from the arguments passed by Tauri / NSIS / signtool command
    let mut target_file: Option<String> = None;
    for arg in args.iter().skip(1).rev() {
        let trimmed = arg.trim_matches('"');
        if (trimmed.ends_with(".exe")
            || trimmed.ends_with(".msi")
            || trimmed.ends_with(".dll")
            || Path::new(trimmed).exists())
            && !trimmed.starts_with('/')
            && !trimmed.starts_with('-')
        {
            target_file = Some(trimmed.to_string());
            break;
        }
    }

    if let Some(file) = target_file {
        if sign_script.exists() {
            let status = Command::new("powershell.exe")
                .arg("-NoProfile")
                .arg("-ExecutionPolicy")
                .arg("Bypass")
                .arg("-File")
                .arg(&sign_script)
                .arg(&file)
                .status();

            match status {
                Ok(s) => exit(s.code().unwrap_or(0)),
                Err(e) => {
                    eprintln!("[SystemPilot SignTool Shim] Failed to launch PowerShell: {}", e);
                    exit(0);
                }
            }
        }
    }

    exit(0);
}
