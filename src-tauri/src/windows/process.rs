//! Windows-specific Process Management API bindings

#[cfg(target_os = "windows")]
pub fn terminate_win32_process(pid: u32) -> Result<(), String> {
    use windows_sys::Win32::Foundation::CloseHandle;
    use windows_sys::Win32::System::Threading::{OpenProcess, TerminateProcess, PROCESS_TERMINATE};

    unsafe {
        let handle = OpenProcess(PROCESS_TERMINATE, 0, pid);
        if handle == std::ptr::null_mut() {
            return Err("Failed to open process".to_string());
        }
        let res = TerminateProcess(handle, 1);
        let _ = CloseHandle(handle);
        if res != 0 {
            Ok(())
        } else {
            Err("Failed to terminate process".to_string())
        }
    }
}
