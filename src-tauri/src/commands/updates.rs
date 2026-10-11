use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};

const APP_NAME: &str = "SystemPilot";
const APP_VERSION: &str = env!("CARGO_PKG_VERSION");
const GITHUB_REPO: &str = "Heer9042/SystemPilot";
const OFFICIAL_RELEASE_URL: &str = "https://github.com/Heer9042/SystemPilot/releases";

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct AppVersionInfo {
    pub name: String,
    pub version: String,
    pub target_arch: String,
    pub target_os: String,
    pub git_repository: String,
    pub release_url: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ReleaseAssetInfo {
    pub name: String,
    pub browser_download_url: String,
    pub size: u64,
    pub content_type: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RemoteReleaseInfo {
    pub tag_name: String,
    pub name: String,
    pub published_at: String,
    pub html_url: String,
    pub body: String,
    pub is_newer: bool,
    pub current_version: String,
    pub latest_version: String,
    pub assets: Vec<ReleaseAssetInfo>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateProgressPayload {
    pub stage: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub message: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct UpdateVerificationResult {
    pub local_path: String,
    pub calculated_sha256: String,
    pub expected_sha256: Option<String>,
    pub is_verified: bool,
    pub error_message: Option<String>,
}

#[tauri::command]
pub fn get_app_version() -> Result<AppVersionInfo, String> {
    Ok(AppVersionInfo {
        name: APP_NAME.to_string(),
        version: APP_VERSION.to_string(),
        target_arch: std::env::consts::ARCH.to_string(),
        target_os: std::env::consts::OS.to_string(),
        git_repository: GITHUB_REPO.to_string(),
        release_url: OFFICIAL_RELEASE_URL.to_string(),
    })
}

#[tauri::command]
pub fn open_release_notes(url: Option<String>) -> Result<(), String> {
    let raw_url = match url {
        Some(u) => {
            // Security verification: Only permit official repository releases and documentation
            if u.starts_with("https://github.com/Heer9042/SystemPilot") {
                u
            } else {
                return Err("The requested operation could not be completed.".to_string());
            }
        }
        None => OFFICIAL_RELEASE_URL.to_string(),
    };

    // Sanitize URL: Never trigger a browser download for .exe, .msi, or .zip files.
    // Convert direct asset download links (/releases/download/<tag>/<filename>) into the official release notes web page (/releases/tag/<tag>).
    let target_url = if raw_url.contains("/releases/download/") {
        let parts: Vec<&str> = raw_url.split("/releases/download/").collect();
        if parts.len() == 2 {
            let tag_part = parts[1].split('/').next().unwrap_or("");
            if !tag_part.is_empty() {
                format!(
                    "https://github.com/Heer9042/SystemPilot/releases/tag/{}",
                    tag_part
                )
            } else {
                OFFICIAL_RELEASE_URL.to_string()
            }
        } else {
            OFFICIAL_RELEASE_URL.to_string()
        }
    } else {
        raw_url
    };

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;

        let rundll_bin = crate::windows::paths::get_system_binary("rundll32.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("rundll32.exe"));
        let mut cmd = std::process::Command::new(rundll_bin);
        cmd.arg("url.dll,FileProtocolHandler");
        cmd.arg(&target_url);
        cmd.creation_flags(CREATE_NO_WINDOW);

        cmd.spawn()
            .map_err(|_| "The requested operation could not be completed.".to_string())?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("The requested operation could not be completed.".to_string())
    }
}

/// Computes the SHA-256 hash of a file using native Rust (no subprocess spawning).
/// This avoids spawning certutil/powershell which can trigger AV false positives.
pub fn compute_file_sha256(path: &Path) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    use std::io::Read;

    let mut file = fs::File::open(path)
        .map_err(|e| format!("The update verification could not be completed: {}", e))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536]; // 64 KiB read buffer

    loop {
        let n = file
            .read(&mut buffer)
            .map_err(|e| format!("The update verification could not be completed: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let hash = hasher.finalize();
    Ok(format!("{:x}", hash))
}

/// Validates whether a download URL comes from an official trusted SystemPilot repository endpoint
pub fn is_trusted_download_url(url: &str) -> bool {
    url.starts_with("https://github.com/Heer9042/SystemPilot/releases/download/")
        || url.starts_with("https://objects.githubusercontent.com/")
}

/// Native Windows background downloader using WinINet with streaming real-time progress
#[cfg(target_os = "windows")]
fn download_file_with_progress(
    app: &AppHandle,
    download_url: &str,
    target_path: &Path,
) -> Result<u64, String> {
    let wide_url = crate::windows::registry::to_wide_chars(download_url);
    let agent_str = format!("SystemPilot-AutoUpdater/{}", env!("CARGO_PKG_VERSION"));
    let user_agent = crate::windows::registry::to_wide_chars(&agent_str);

    let h_wininet = unsafe {
        windows_sys::Win32::System::LibraryLoader::LoadLibraryA(b"wininet.dll\0".as_ptr())
    };

    if h_wininet.is_null() {
        return Err("The Windows network subsystem is unavailable.".to_string());
    }

    #[allow(non_snake_case)]
    type FnInternetOpenW = unsafe extern "system" fn(
        lpszAgent: *const u16,
        dwAccessType: u32,
        lpszProxy: *const u16,
        lpszProxyBypass: *const u16,
        dwFlags: u32,
    ) -> *mut std::ffi::c_void;

    #[allow(non_snake_case)]
    type FnInternetOpenUrlW = unsafe extern "system" fn(
        hInternet: *mut std::ffi::c_void,
        lpszUrl: *const u16,
        lpszHeaders: *const u16,
        dwHeadersLength: u32,
        dwFlags: u32,
        dwContext: usize,
    ) -> *mut std::ffi::c_void;

    #[allow(non_snake_case)]
    type FnHttpQueryInfoW = unsafe extern "system" fn(
        hRequest: *mut std::ffi::c_void,
        dwInfoLevel: u32,
        lpvBuffer: *mut std::ffi::c_void,
        lpdwBufferLength: *mut u32,
        lpdwIndex: *mut u32,
    ) -> i32;

    #[allow(non_snake_case)]
    type FnInternetReadFile = unsafe extern "system" fn(
        hFile: *mut std::ffi::c_void,
        lpBuffer: *mut u8,
        dwNumberOfBytesToRead: u32,
        lpdwNumberOfBytesRead: *mut u32,
    ) -> i32;

    #[allow(non_snake_case)]
    type FnInternetCloseHandle = unsafe extern "system" fn(hInternet: *mut std::ffi::c_void) -> i32;

    let p_open = unsafe {
        windows_sys::Win32::System::LibraryLoader::GetProcAddress(
            h_wininet,
            b"InternetOpenW\0".as_ptr(),
        )
    };
    let p_open_url = unsafe {
        windows_sys::Win32::System::LibraryLoader::GetProcAddress(
            h_wininet,
            b"InternetOpenUrlW\0".as_ptr(),
        )
    };
    let p_query_info = unsafe {
        windows_sys::Win32::System::LibraryLoader::GetProcAddress(
            h_wininet,
            b"HttpQueryInfoW\0".as_ptr(),
        )
    };
    let p_read_file = unsafe {
        windows_sys::Win32::System::LibraryLoader::GetProcAddress(
            h_wininet,
            b"InternetReadFile\0".as_ptr(),
        )
    };
    let p_close = unsafe {
        windows_sys::Win32::System::LibraryLoader::GetProcAddress(
            h_wininet,
            b"InternetCloseHandle\0".as_ptr(),
        )
    };

    if p_open.is_none() || p_open_url.is_none() || p_read_file.is_none() || p_close.is_none() {
        unsafe {
            windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
        }
        return Err("The network download service functions could not be resolved.".to_string());
    }

    let fn_open: FnInternetOpenW = unsafe { std::mem::transmute(p_open.unwrap()) };
    let fn_open_url: FnInternetOpenUrlW = unsafe { std::mem::transmute(p_open_url.unwrap()) };
    let fn_read_file: FnInternetReadFile = unsafe { std::mem::transmute(p_read_file.unwrap()) };
    let fn_close: FnInternetCloseHandle = unsafe { std::mem::transmute(p_close.unwrap()) };

    const INTERNET_OPEN_TYPE_PRECONFIG: u32 = 0;
    const INTERNET_FLAG_RELOAD: u32 = 0x80000000;
    const INTERNET_FLAG_NO_CACHE_WRITE: u32 = 0x04000000;
    const INTERNET_FLAG_SECURE: u32 = 0x00800000;
    const HTTP_QUERY_CONTENT_LENGTH: u32 = 5;
    const HTTP_QUERY_FLAG_NUMBER: u32 = 0x20000000;

    let h_session = unsafe {
        fn_open(
            user_agent.as_ptr(),
            INTERNET_OPEN_TYPE_PRECONFIG,
            std::ptr::null(),
            std::ptr::null(),
            0,
        )
    };

    if h_session.is_null() {
        unsafe {
            windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
        }
        return Err("Could not initialize secure download session.".to_string());
    }

    let flags = INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE | INTERNET_FLAG_SECURE;
    let h_url = unsafe { fn_open_url(h_session, wide_url.as_ptr(), std::ptr::null(), 0, flags, 0) };

    if h_url.is_null() {
        unsafe {
            fn_close(h_session);
            windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
        }
        return Err(
            "Could not establish connection to update server. Please check your connection."
                .to_string(),
        );
    }

    // Determine total file size (Content-Length)
    let mut total_bytes: u64 = 0;
    if let Some(p_qi) = p_query_info {
        let fn_query_info: FnHttpQueryInfoW = unsafe { std::mem::transmute(p_qi) };
        let mut content_length: u32 = 0;
        let mut len_size: u32 = std::mem::size_of::<u32>() as u32;
        let mut index: u32 = 0;
        let qi_res = unsafe {
            fn_query_info(
                h_url,
                HTTP_QUERY_CONTENT_LENGTH | HTTP_QUERY_FLAG_NUMBER,
                &mut content_length as *mut _ as *mut std::ffi::c_void,
                &mut len_size,
                &mut index,
            )
        };
        if qi_res != 0 && content_length > 0 {
            total_bytes = content_length as u64;
        }
    }

    // Stream download directly to file with real progress updates
    let mut out_file = fs::File::create(target_path).map_err(|e| {
        unsafe {
            fn_close(h_url);
            fn_close(h_session);
            windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
        }
        format!("Could not create local update destination file: {}", e)
    })?;

    let mut buffer = [0u8; 65536]; // 64 KiB buffer
    let mut downloaded_bytes: u64 = 0;
    let mut last_emit = std::time::Instant::now();
    let mut last_emitted_bytes = 0u64;

    loop {
        let mut bytes_read: u32 = 0;
        let read_res = unsafe {
            fn_read_file(
                h_url,
                buffer.as_mut_ptr(),
                buffer.len() as u32,
                &mut bytes_read,
            )
        };

        if read_res == 0 {
            unsafe {
                fn_close(h_url);
                fn_close(h_session);
                windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
            }
            return Err("Network stream was interrupted while downloading the update.".to_string());
        }

        if bytes_read == 0 {
            // EOF reached
            break;
        }

        if let Err(e) = out_file.write_all(&buffer[..bytes_read as usize]) {
            unsafe {
                fn_close(h_url);
                fn_close(h_session);
                windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
            }
            return Err(format!("Disk write failure during update download: {}", e));
        }

        downloaded_bytes += bytes_read as u64;

        let percentage = if total_bytes > 0 {
            ((downloaded_bytes as f64 / total_bytes as f64) * 100.0).min(99.0)
        } else {
            50.0
        };

        // Throttle progress events to UI: emit at least every 60ms or 256 KiB
        if last_emit.elapsed() >= std::time::Duration::from_millis(60)
            || downloaded_bytes.saturating_sub(last_emitted_bytes) >= 262144
            || (total_bytes > 0 && downloaded_bytes >= total_bytes)
        {
            last_emit = std::time::Instant::now();
            last_emitted_bytes = downloaded_bytes;

            let msg = if total_bytes > 0 {
                format!(
                    "{:.1} MB / {:.1} MB ({:.0}%)",
                    downloaded_bytes as f64 / (1024.0 * 1024.0),
                    total_bytes as f64 / (1024.0 * 1024.0),
                    percentage
                )
            } else {
                format!(
                    "{:.1} MB downloaded",
                    downloaded_bytes as f64 / (1024.0 * 1024.0)
                )
            };

            let _ = app.emit(
                "update-progress",
                UpdateProgressPayload {
                    stage: "downloading".to_string(),
                    downloaded_bytes,
                    total_bytes,
                    percentage,
                    message: msg,
                },
            );
        }
    }

    let _ = out_file.flush();
    drop(out_file);

    unsafe {
        fn_close(h_url);
        fn_close(h_session);
        windows_sys::Win32::Foundation::FreeLibrary(h_wininet);
    }

    Ok(downloaded_bytes)
}

/// Download and cryptographically verify an official release binary
#[tauri::command]
pub async fn download_and_verify_update(
    app: AppHandle,
    download_url: String,
    expected_sha256: Option<String>,
) -> Result<UpdateVerificationResult, String> {
    // 1. Strict URL Security Verification
    if !is_trusted_download_url(&download_url) {
        return Err("The update download source is untrusted or invalid.".to_string());
    }

    // 2. Prepare Updates Directory in Local App Data (isolated from installed binary)
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let updates_dir = PathBuf::from(&local_app_data)
        .join("SystemPilot")
        .join("updates");
    fs::create_dir_all(&updates_dir)
        .map_err(|e| format!("Failed to create update cache directory: {}", e))?;

    // Determine target filename and temporary stage file
    let file_name = if download_url.to_lowercase().ends_with(".msi") {
        "SystemPilot-Update.msi"
    } else {
        "SystemPilot-Update.exe"
    };
    let target_path = updates_dir.join(file_name);
    let tmp_path = updates_dir.join(format!("{}.download.tmp", file_name));

    // Clean up any stale partial files
    if tmp_path.exists() {
        let _ = fs::remove_file(&tmp_path);
    }

    // 3. Emit progress: Initiating connection
    let _ = app.emit(
        "update-progress",
        UpdateProgressPayload {
            stage: "downloading".to_string(),
            downloaded_bytes: 0,
            total_bytes: 0,
            percentage: 0.0,
            message: "Connecting to secure update service...".to_string(),
        },
    );

    // 4. Download file using native Windows background downloader with real byte streaming
    #[cfg(target_os = "windows")]
    {
        let download_result = download_file_with_progress(&app, &download_url, &tmp_path);
        let total_downloaded = match download_result {
            Ok(bytes) => bytes,
            Err(err) => {
                let _ = fs::remove_file(&tmp_path);
                return Err(err);
            }
        };

        if !tmp_path.exists() || total_downloaded == 0 {
            let _ = fs::remove_file(&tmp_path);
            return Err("Download completed but update payload was empty.".to_string());
        }

        // 5. Emit progress: Cryptographic verification
        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "verifying".to_string(),
                downloaded_bytes: total_downloaded,
                total_bytes: total_downloaded,
                percentage: 95.0,
                message: "Verifying update package integrity & SHA-256...".to_string(),
            },
        );

        // 6. SHA-256 Hash Calculation and Cryptographic Verification
        let calculated_hash = compute_file_sha256(&tmp_path)?;

        if let Some(ref expected) = expected_sha256 {
            let expected_clean = expected.trim().to_lowercase();
            if !expected_clean.is_empty() && calculated_hash != expected_clean {
                let _ = fs::remove_file(&tmp_path);
                return Err(format!(
                    "Update package verification failed: SHA-256 checksum mismatch (expected: {}, calculated: {}). The file may be corrupt.",
                    expected_clean, calculated_hash
                ));
            }
        }

        // 7. Atomic rename from .tmp to verified target_path
        if target_path.exists() {
            let _ = fs::remove_file(&target_path);
        }
        fs::rename(&tmp_path, &target_path)
            .map_err(|e| format!("Could not finalize verified update package: {}", e))?;

        // 8. Emit progress: Verification Successful, Ready to Apply
        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "ready".to_string(),
                downloaded_bytes: total_downloaded,
                total_bytes: total_downloaded,
                percentage: 100.0,
                message: "Update verified successfully. Ready to install.".to_string(),
            },
        );

        Ok(UpdateVerificationResult {
            local_path: target_path.to_string_lossy().to_string(),
            calculated_sha256: calculated_hash,
            expected_sha256,
            is_verified: true,
            error_message: None,
        })
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("In-app update is currently supported on Windows.".to_string())
    }
}

/// Launches the verified Windows update silently in-place (/S) and cleanly restarts SystemPilot
#[tauri::command]
pub fn install_update_and_restart(app: AppHandle, installer_path: String) -> Result<(), String> {
    let path = PathBuf::from(&installer_path);
    if !path.exists() {
        return Err("The verified update package could not be found.".to_string());
    }

    // Validate path is strictly inside SystemPilot updates folder
    let local_app_data = std::env::var("LOCALAPPDATA").unwrap_or_else(|_| ".".to_string());
    let allowed_dir = PathBuf::from(&local_app_data)
        .join("SystemPilot")
        .join("updates");
    if !path.starts_with(&allowed_dir) {
        return Err("The update package path is invalid or unauthorized.".to_string());
    }

    // Additional security checks: must be a genuine installer file with valid extension and size
    let extension = path
        .extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_lowercase();
    if extension != "exe" && extension != "msi" {
        return Err("Unauthorized file type for update execution.".to_string());
    }

    let meta = fs::metadata(&path)
        .map_err(|e| format!("Failed to read update package metadata: {}", e))?;
    if !meta.is_file() || meta.len() < 1024 * 1024 {
        return Err("The update package is incomplete or corrupted.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // 1. Determine current process and executable
        let current_exe = std::env::current_exe()
            .map_err(|e| format!("Could not get current executable path: {}", e))?;
        let current_pid = std::process::id();

        // 2. Emit UI event: applying update
        let _ = app.emit(
            "update-progress",
            UpdateProgressPayload {
                stage: "installing".to_string(),
                downloaded_bytes: 0,
                total_bytes: 0,
                percentage: 100.0,
                message: "Applying update in-place and restarting SystemPilot...".to_string(),
            },
        );

        // 3. Write updater supervisor script that:
        //    a) Waits for the current SystemPilot process (PID) to exit so files are unlocked
        //    b) Executes the NSIS installer silently (/S) with zero wizard screens
        //    c) Relaunches the updated SystemPilot.exe immediately
        //    d) Cleans up the temporary update installer and deletes itself
        let script_path = allowed_dir.join("apply_update.cmd");
        let script_content = format!(
            r#"@echo off
setlocal enabledelayedexpansion
set "PID={pid}"
set "INSTALLER={installer}"
set "TARGET_EXE={target_exe}"

:: 1. Wait for SystemPilot to gracefully shut down (max 15 seconds)
set /a wait_count=0
:wait_loop
timeout /t 1 /nobreak >nul
tasklist /fi "PID eq %PID%" 2>nul | findstr /i "%PID%" >nul
if errorlevel 1 goto apply_update
set /a wait_count+=1
if !wait_count! geq 15 (
    taskkill /f /pid %PID% >nul 2>nul
    goto apply_update
)
goto wait_loop

:apply_update
:: 2. Execute NSIS installer silently in-place (/S) - no wizard or prompts
start /wait "" "%INSTALLER%" /S

:: Brief pause for filesystem buffers to settle
timeout /t 1 /nobreak >nul

:: 3. Automatically relaunch updated SystemPilot
if exist "%TARGET_EXE%" (
    start "" "%TARGET_EXE%"
) else if exist "%ProgramFiles%\SystemPilot\SystemPilot.exe" (
    start "" "%ProgramFiles%\SystemPilot\SystemPilot.exe"
) else if exist "%LOCALAPPDATA%\Programs\SystemPilot\SystemPilot.exe" (
    start "" "%LOCALAPPDATA%\Programs\SystemPilot\SystemPilot.exe"
)

:: 4. Clean up temporary update installer and self-delete script
del /f /q "%INSTALLER%" >nul 2>nul
(goto) 2>nul & del "%~f0"
exit 0
"#,
            pid = current_pid,
            installer = path.to_string_lossy(),
            target_exe = current_exe.to_string_lossy(),
        );

        fs::write(&script_path, script_content)
            .map_err(|e| format!("Could not prepare update runner script: {}", e))?;

        // 4. Launch script using ShellExecuteW: use "runas" for protected machine-wide
        // directories (Program Files) and "open" for per-user user-space installations.
        let is_machine_install = current_exe
            .to_string_lossy()
            .to_lowercase()
            .contains("program files");
        let verb = if is_machine_install { "runas" } else { "open" };
        let cmd_bin = crate::windows::paths::get_system_binary("cmd.exe")
            .unwrap_or_else(|_| std::path::PathBuf::from("cmd.exe"));
        let wide_cmd = crate::windows::registry::to_wide_chars(&cmd_bin.to_string_lossy());
        let params_str = format!("/c \"{}\"", script_path.to_string_lossy());
        let wide_params = crate::windows::registry::to_wide_chars(&params_str);
        let wide_verb = crate::windows::registry::to_wide_chars(verb);

        let h_shell32 = unsafe {
            windows_sys::Win32::System::LibraryLoader::LoadLibraryA(b"shell32.dll\0".as_ptr())
        };
        if h_shell32.is_null() {
            return Err("The Windows Shell subsystem is unavailable.".to_string());
        }

        #[allow(non_snake_case)]
        type FnShellExecuteW = unsafe extern "system" fn(
            hwnd: *mut std::ffi::c_void,
            lpOperation: *const u16,
            lpFile: *const u16,
            lpParameters: *const u16,
            lpDirectory: *const u16,
            nShowCmd: i32,
        ) -> isize;

        let p_exec = unsafe {
            windows_sys::Win32::System::LibraryLoader::GetProcAddress(
                h_shell32,
                b"ShellExecuteW\0".as_ptr(),
            )
        };

        const SW_HIDE: i32 = 0;
        let exec_res = if let Some(proc) = p_exec {
            let fn_exec: FnShellExecuteW = unsafe { std::mem::transmute(proc) };
            unsafe {
                fn_exec(
                    std::ptr::null_mut(),
                    wide_verb.as_ptr(),
                    wide_cmd.as_ptr(),
                    wide_params.as_ptr(),
                    std::ptr::null(),
                    SW_HIDE,
                )
            }
        } else {
            0
        };
        unsafe {
            windows_sys::Win32::Foundation::FreeLibrary(h_shell32);
        }

        if exec_res <= 32 {
            return Err("Update installation could not be started or administrator permissions were denied.".to_string());
        }

        // 5. Cleanly shut down current process so installer can replace files in-place
        std::thread::spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(500));
            app.exit(0);
        });

        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("In-app update is currently supported on Windows.".to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn test_version_info_structure() {
        let info = get_app_version().expect("get_app_version should succeed");
        assert_eq!(info.name, "SystemPilot");
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
        assert_eq!(info.target_os, "windows");
        assert_eq!(info.git_repository, "Heer9042/SystemPilot");
    }

    #[test]
    fn test_trusted_download_url_validation() {
        assert!(is_trusted_download_url(
            "https://github.com/Heer9042/SystemPilot/releases/download/v0.0.1/SystemPilot-Setup.exe"
        ));
        assert!(is_trusted_download_url(
            "https://objects.githubusercontent.com/github-production-release-asset-2e65be/12345/SystemPilot.exe"
        ));
        assert!(!is_trusted_download_url(
            "https://malicious-site.com/SystemPilot.exe"
        ));
        assert!(!is_trusted_download_url(
            "http://github.com/Heer9042/SystemPilot/releases/download/v0.0.1/SystemPilot.exe"
        ));
    }

    #[test]
    fn test_compute_file_sha256() {
        let temp_dir = std::env::temp_dir();
        let test_file = temp_dir.join("systempilot_sha256_unit_test.tmp");
        let mut f = fs::File::create(&test_file).expect("create test file");
        f.write_all(b"SystemPilot seamless auto-update verification test payload")
            .expect("write test file");
        drop(f);

        let hash = compute_file_sha256(&test_file).expect("compute hash");
        let _ = fs::remove_file(&test_file);

        // Precomputed sha256 for "SystemPilot seamless auto-update verification test payload"
        assert_eq!(
            hash,
            "f5a99b71492667ed08669f2ff13b80a8c4c074db586b085d509e27b8b9c97407"
        );
    }
}
