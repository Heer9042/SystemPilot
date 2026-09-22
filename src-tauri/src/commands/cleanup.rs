use crate::db::Database;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupCategoryScan {
    pub id: String,
    pub name: String,
    pub description: String,
    pub path: String,
    pub file_count: usize,
    pub total_bytes: u64,
    pub safe_to_clean: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupScanResult {
    pub categories: Vec<CleanupCategoryScan>,
    pub total_bytes: u64,
    pub total_files: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupExecutionResult {
    pub total_cleaned_bytes: u64,
    pub total_cleaned_files: usize,
    pub success: bool,
    pub message: String,
}

fn get_dir_stats(path: &Path) -> (usize, u64) {
    let mut count = 0usize;
    let mut bytes = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    count += 1;
                    bytes += meta.len();
                } else if meta.is_dir() {
                    let (sub_c, sub_b) = get_dir_stats(&entry.path());
                    count += sub_c;
                    bytes += sub_b;
                }
            }
        }
    }
    (count, bytes)
}

fn clean_dir(path: &Path) -> (usize, u64) {
    let mut count = 0usize;
    let mut bytes = 0u64;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let len = meta.len();
                    if fs::remove_file(&p).is_ok() {
                        count += 1;
                        bytes += len;
                    }
                } else if meta.is_dir() {
                    let (sub_c, sub_b) = clean_dir(&p);
                    count += sub_c;
                    bytes += sub_b;
                    let _ = fs::remove_dir(&p);
                }
            }
        }
    }
    (count, bytes)
}

#[tauri::command]
pub fn scan_cleanable_items() -> Result<CleanupScanResult, String> {
    let mut categories = Vec::new();

    // 1. User Temp
    if let Ok(temp_env) = std::env::var("TEMP") {
        let p = PathBuf::from(&temp_env);
        let (c, b) = get_dir_stats(&p);
        categories.push(CleanupCategoryScan {
            id: "user_temp".into(),
            name: "User Temporary Files".into(),
            description: "Temporary files created by running apps (%TEMP%)".into(),
            path: temp_env,
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
        });
    }

    // 2. Windows Temp
    let win_temp = PathBuf::from("C:\\Windows\\Temp");
    if win_temp.exists() {
        let (c, b) = get_dir_stats(&win_temp);
        categories.push(CleanupCategoryScan {
            id: "win_temp".into(),
            name: "System Windows Temp".into(),
            description: "Temporary files created by Windows system services".into(),
            path: win_temp.to_string_lossy().to_string(),
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
        });
    }

    // 3. Thumbnails Cache
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let thumb_path = PathBuf::from(&local_app_data).join("Microsoft\\Windows\\Explorer");
        let (c, b) = if thumb_path.exists() {
            let mut count = 0;
            let mut bytes = 0;
            if let Ok(entries) = fs::read_dir(&thumb_path) {
                for e in entries.flatten() {
                    if let Ok(name) = e.file_name().into_string() {
                        if name.starts_with("thumbcache_") {
                            if let Ok(meta) = e.metadata() {
                                count += 1;
                                bytes += meta.len();
                            }
                        }
                    }
                }
            }
            (count, bytes)
        } else {
            (0, 0)
        };

        categories.push(CleanupCategoryScan {
            id: "thumb_cache".into(),
            name: "Windows Thumbnail Cache".into(),
            description: "Pre-rendered image and video icon caches".into(),
            path: thumb_path.to_string_lossy().to_string(),
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
        });
    }

    let total_bytes: u64 = categories.iter().map(|c| c.total_bytes).sum();
    let total_files: usize = categories.iter().map(|c| c.file_count).sum();

    Ok(CleanupScanResult {
        categories,
        total_bytes,
        total_files,
    })
}

#[tauri::command]
pub fn execute_cleanup(
    category_ids: Vec<String>,
    empty_recycle_bin: bool,
    db: tauri::State<'_, Database>,
) -> Result<CleanupExecutionResult, String> {
    let mut cleaned_bytes = 0u64;
    let mut cleaned_files = 0usize;

    for id in &category_ids {
        if id == "user_temp" {
            if let Ok(temp_env) = std::env::var("TEMP") {
                let (c, b) = clean_dir(&PathBuf::from(temp_env));
                cleaned_files += c;
                cleaned_bytes += b;
            }
        } else if id == "win_temp" {
            let (c, b) = clean_dir(&PathBuf::from("C:\\Windows\\Temp"));
            cleaned_files += c;
            cleaned_bytes += b;
        } else if id == "thumb_cache" {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let thumb_path = PathBuf::from(&local_app_data).join("Microsoft\\Windows\\Explorer");
                if thumb_path.exists() {
                    if let Ok(entries) = fs::read_dir(&thumb_path) {
                        for e in entries.flatten() {
                            if let Ok(name) = e.file_name().into_string() {
                                if name.starts_with("thumbcache_") && name.ends_with(".db") {
                                    let p = e.path();
                                    if let Ok(meta) = e.metadata() {
                                        let len = meta.len();
                                        if fs::remove_file(&p).is_ok() {
                                            cleaned_files += 1;
                                            cleaned_bytes += len;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }


    if empty_recycle_bin {
        #[cfg(target_os = "windows")]
        {
            use windows_sys::Win32::UI::Shell::{
                SHEmptyRecycleBinW, SHERB_NOCONFIRMATION, SHERB_NOPROGRESSUI, SHERB_NOSOUND,
            };
            unsafe {
                let _ = SHEmptyRecycleBinW(
                    std::ptr::null_mut(),
                    std::ptr::null(),
                    SHERB_NOCONFIRMATION | SHERB_NOPROGRESSUI | SHERB_NOSOUND,
                );
            }
        }
    }

    let _ = db.add_cleanup_log(
        cleaned_bytes,
        &format!("Categories: {:?}", category_ids),
        true,
    );

    Ok(CleanupExecutionResult {
        total_cleaned_bytes: cleaned_bytes,
        total_cleaned_files: cleaned_files,
        success: true,
        message: format!(
            "Cleaned {} files ({:.2} MB freed).",
            cleaned_files,
            cleaned_bytes as f64 / (1024.0 * 1024.0)
        ),
    })
}

#[tauri::command]
pub fn get_cleanup_history(db: tauri::State<'_, Database>) -> Result<Vec<crate::db::CleanupLog>, String> {
    db.get_cleanup_history(50).map_err(|e| e.to_string())
}
