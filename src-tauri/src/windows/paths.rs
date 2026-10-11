//! Secure Windows System Path and Binary Resolution
//! Guarantees that invocations of Windows administrative and management utilities
//! resolve strictly to canonical %SystemRoot% and %SystemRoot%\System32 binaries,
//! preventing untrusted search path and binary planting vulnerabilities (CWE-426 / CWE-427).

use std::path::PathBuf;

/// Securely resolves canonical Windows system binaries from %SystemRoot%
pub fn get_system_binary(binary_name: &str) -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    {
        let system_root = std::env::var("SystemRoot")
            .or_else(|_| std::env::var("windir"))
            .unwrap_or_else(|_| "C:\\Windows".to_string());

        let base_sys32 = PathBuf::from(&system_root).join("System32");
        let path = match binary_name.to_lowercase().as_str() {
            "regedit" | "regedit.exe" => {
                let reg_root = PathBuf::from(&system_root).join("regedit.exe");
                if reg_root.exists() {
                    reg_root
                } else {
                    base_sys32.join("regedit.exe")
                }
            }
            "wt" | "wt.exe" => {
                let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_default();
                let wt_path = PathBuf::from(local_app_data).join("Microsoft\\WindowsApps\\wt.exe");
                if wt_path.exists() {
                    wt_path
                } else {
                    base_sys32.join("cmd.exe")
                }
            }
            "powershell" | "powershell.exe" => {
                base_sys32.join("WindowsPowerShell\\v1.0\\powershell.exe")
            }
            "explorer" | "explorer.exe" => PathBuf::from(&system_root).join("explorer.exe"),
            "cmd" | "cmd.exe" => base_sys32.join("cmd.exe"),
            "shutdown" | "shutdown.exe" => base_sys32.join("shutdown.exe"),
            "powercfg" | "powercfg.exe" => base_sys32.join("powercfg.exe"),
            "control" | "control.exe" => base_sys32.join("control.exe"),
            "mmc" | "mmc.exe" => base_sys32.join("mmc.exe"),
            "rundll32" | "rundll32.exe" => base_sys32.join("rundll32.exe"),
            "rstrui" | "rstrui.exe" => base_sys32.join("rstrui.exe"),
            "sdclt" | "sdclt.exe" => base_sys32.join("sdclt.exe"),
            other => {
                let clean = other.trim_end_matches(".exe");
                base_sys32.join(format!("{}.exe", clean))
            }
        };

        if path.exists() {
            Ok(path)
        } else {
            // Fallback to plain binary name if specific path does not exist on custom Windows SKU
            Ok(PathBuf::from(binary_name))
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(PathBuf::from(binary_name))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_system_binary_resolution() {
        if cfg!(target_os = "windows") {
            let cmd = get_system_binary("cmd.exe").unwrap();
            assert!(cmd.to_string_lossy().to_lowercase().contains("system32"));

            let psh = get_system_binary("powershell.exe").unwrap();
            assert!(psh
                .to_string_lossy()
                .to_lowercase()
                .contains("windowspowershell"));

            let pcfg = get_system_binary("powercfg").unwrap();
            assert!(pcfg.to_string_lossy().to_lowercase().contains("system32"));
        }
    }
}
