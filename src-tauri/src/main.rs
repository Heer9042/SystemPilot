// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(target_os = "windows")]
#[link(name = "comctl32")]
extern "system" {}

fn main() {
    systempilot_lib::run();
}
