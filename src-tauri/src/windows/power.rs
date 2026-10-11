//! Windows-specific Power Scheme API bindings

pub fn is_windows() -> bool {
    cfg!(target_os = "windows")
}
