//! Windows-specific Memory API bindings

#[cfg(target_os = "windows")]
pub fn empty_working_set(handle: windows_sys::Win32::Foundation::HANDLE) -> bool {
    use windows_sys::Win32::System::ProcessStatus::K32EmptyWorkingSet;
    unsafe { K32EmptyWorkingSet(handle) != 0 }
}
