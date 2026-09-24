//! Windows-specific Services & SCManager API bindings

pub fn is_services_supported() -> bool {
    cfg!(target_os = "windows")
}
