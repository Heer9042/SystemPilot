//! Windows-specific Security & Defender API bindings

pub fn is_security_supported() -> bool {
    cfg!(target_os = "windows")
}
