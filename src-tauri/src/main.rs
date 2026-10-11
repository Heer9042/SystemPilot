// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Suppress "multiple non-default manifests" linker warning on MinGW/GNU builds.
// Our manifest (resources/systempilot.exe.manifest, with Common Controls v6)
// wins the .rsrc merge. The second manifest is from a dependency's resources.
// This warning does not affect correctness or the MSVC/CI release build.
#![allow(linker_messages)]

fn main() {
    systempilot_lib::run();
}
