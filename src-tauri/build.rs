fn main() {
    // Use new_without_app_manifest() to suppress tauri-build's default manifest.
    // Without this, both tauri's default manifest AND our custom manifest get
    // embedded, causing the MinGW linker to warn: "multiple non-default manifests".
    // Our manifest (resources/systempilot.exe.manifest) is authoritative — it
    // includes Common Controls v6 (required for TaskDialogIndirect), DPI awareness,
    // long path support, and Windows 10/11 OS compatibility declarations.
    let windows = tauri_build::WindowsAttributes::new_without_app_manifest()
        .app_manifest(include_str!("resources/systempilot.exe.manifest"));
    tauri_build::try_build(
        tauri_build::Attributes::new().windows_attributes(windows)
    ).expect("failed to run tauri-build");
}
