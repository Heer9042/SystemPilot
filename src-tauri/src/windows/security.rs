//! Windows-specific Security, UAC & Privilege Management

/// Checks if Windows security APIs are supported on the current target.
pub fn is_security_supported() -> bool {
    cfg!(target_os = "windows")
}

/// Checks whether the current process is running with elevated administrator privileges.
/// Uses the Win32 TokenElevation query on the primary process token.
pub fn is_current_process_elevated() -> bool {
    #[cfg(target_os = "windows")]
    {
        use windows_sys::Win32::Foundation::{CloseHandle, HANDLE};
        use windows_sys::Win32::Security::{
            GetTokenInformation, TokenElevation, TOKEN_ELEVATION, TOKEN_QUERY,
        };
        use windows_sys::Win32::System::Threading::{GetCurrentProcess, OpenProcessToken};

        unsafe {
            let mut token: HANDLE = std::ptr::null_mut();
            if OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &mut token) == 0 {
                return false;
            }
            let mut elevation = TOKEN_ELEVATION { TokenIsElevated: 0 };
            let mut size = std::mem::size_of::<TOKEN_ELEVATION>() as u32;
            let success = GetTokenInformation(
                token,
                TokenElevation,
                &mut elevation as *mut _ as *mut _,
                size,
                &mut size,
            );
            CloseHandle(token);
            success != 0 && elevation.TokenIsElevated != 0
        }
    }
    #[cfg(not(target_os = "windows"))]
    {
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_security_supported() {
        assert_eq!(is_security_supported(), cfg!(target_os = "windows"));
    }

    #[test]
    fn test_process_elevation_query_does_not_panic() {
        let _ = is_current_process_elevated();
    }
}
