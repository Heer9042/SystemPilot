//! Windows-specific Startup & Registry API bindings

pub fn is_startup_supported() -> bool {
    cfg!(target_os = "windows")
}
