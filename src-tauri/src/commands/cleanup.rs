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
    pub risk_level: String, // "Safe", "Review recommended", "Requires confirmation"
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LargeFileItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub last_modified_epoch_ms: u64,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecycleBinInfo {
    pub total_bytes: u64,
    pub item_count: u64,
    pub is_available: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupScanResult {
    pub categories: Vec<CleanupCategoryScan>,
    pub total_bytes: u64,
    pub total_files: usize,
    pub recycle_bin: RecycleBinInfo,
    pub scan_timestamp_ms: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupExecutionResult {
    pub total_cleaned_bytes: u64,
    pub total_cleaned_files: usize,
    pub total_skipped_files: usize,
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

fn clean_dir_safe(path: &Path) -> (usize, u64, usize) {
    let mut cleaned_count = 0usize;
    let mut cleaned_bytes = 0u64;
    let mut skipped_count = 0usize;

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let p = entry.path();
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let len = meta.len();
                    if fs::remove_file(&p).is_ok() {
                        cleaned_count += 1;
                        cleaned_bytes += len;
                    } else {
                        // File is in use, locked, or protected - safe skip
                        skipped_count += 1;
                    }
                } else if meta.is_dir() {
                    let (sub_c, sub_b, sub_skip) = clean_dir_safe(&p);
                    cleaned_count += sub_c;
                    cleaned_bytes += sub_b;
                    skipped_count += sub_skip;
                    let _ = fs::remove_dir(&p);
                }
            }
        }
    }
    (cleaned_count, cleaned_bytes, skipped_count)
}

pub fn query_recycle_bin_stats() -> RecycleBinInfo {
    #[cfg(target_os = "windows")]
    {
        #[repr(C)]
        #[allow(non_snake_case)]
        struct SHQUERYRBINFO {
            cbSize: u32,
            i64Size: i64,
            i64NumItems: i64,
        }

        #[link(name = "shell32")]
        extern "system" {
            fn SHQueryRecycleBinW(pszRootPath: *const u16, pSHQueryRBInfo: *mut SHQUERYRBINFO) -> i32;
        }

        let mut rb_info = SHQUERYRBINFO {
            cbSize: std::mem::size_of::<SHQUERYRBINFO>() as u32,
            i64Size: 0,
            i64NumItems: 0,
        };

        unsafe {
            if SHQueryRecycleBinW(std::ptr::null(), &mut rb_info) == 0 {
                return RecycleBinInfo {
                    total_bytes: rb_info.i64Size.max(0) as u64,
                    item_count: rb_info.i64NumItems.max(0) as u64,
                    is_available: true,
                };
            }
        }
    }

    RecycleBinInfo {
        total_bytes: 0,
        item_count: 0,
        is_available: false,
    }
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
            description: "Temporary data created by running applications (%TEMP%)".into(),
            path: temp_env,
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
            risk_level: "Safe to remove".into(),
        });
    }

    // 2. Windows Temp
    let win_temp = PathBuf::from("C:\\Windows\\Temp");
    if win_temp.exists() {
        let (c, b) = get_dir_stats(&win_temp);
        categories.push(CleanupCategoryScan {
            id: "win_temp".into(),
            name: "System Windows Temp".into(),
            description: "Temporary files generated by Windows operating system services".into(),
            path: win_temp.to_string_lossy().to_string(),
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
            risk_level: "Safe to remove".into(),
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
                        if name.starts_with("thumbcache_") && name.ends_with(".db") {
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
            description: "Pre-rendered image, folder, and video thumbnail icons".into(),
            path: thumb_path.to_string_lossy().to_string(),
            file_count: c,
            total_bytes: b,
            safe_to_clean: true,
            risk_level: "Safe to remove".into(),
        });

        // 4. Microsoft Edge Cache
        let edge_cache = PathBuf::from(&local_app_data).join("Microsoft\\Edge\\User Data\\Default\\Cache");
        if edge_cache.exists() {
            let (c, b) = get_dir_stats(&edge_cache);
            categories.push(CleanupCategoryScan {
                id: "edge_cache".into(),
                name: "Microsoft Edge Web Cache".into(),
                description: "Temporary web assets (images, stylesheets). Passwords and cookies are never touched.".into(),
                path: edge_cache.to_string_lossy().to_string(),
                file_count: c,
                total_bytes: b,
                safe_to_clean: true,
                risk_level: "Safe to remove".into(),
            });
        }

        // 5. Google Chrome Cache
        let chrome_cache = PathBuf::from(&local_app_data).join("Google\\Chrome\\User Data\\Default\\Cache");
        if chrome_cache.exists() {
            let (c, b) = get_dir_stats(&chrome_cache);
            categories.push(CleanupCategoryScan {
                id: "chrome_cache".into(),
                name: "Google Chrome Web Cache".into(),
                description: "Cached web page assets. Saved logins, bookmarks, and sessions are preserved.".into(),
                path: chrome_cache.to_string_lossy().to_string(),
                file_count: c,
                total_bytes: b,
                safe_to_clean: true,
                risk_level: "Safe to remove".into(),
            });
        }

        // 6. User Crash Dumps
        let user_dumps = PathBuf::from(&local_app_data).join("CrashDumps");
        if user_dumps.exists() {
            let (c, b) = get_dir_stats(&user_dumps);
            categories.push(CleanupCategoryScan {
                id: "crash_dumps".into(),
                name: "Application Crash Dumps".into(),
                description: "Saved diagnostic memory dumps created during application errors".into(),
                path: user_dumps.to_string_lossy().to_string(),
                file_count: c,
                total_bytes: b,
                safe_to_clean: true,
                risk_level: "Review recommended".into(),
            });
        }
    }

    // 7. Windows Minidumps
    let minidump_path = PathBuf::from("C:\\Windows\\Minidump");
    if minidump_path.exists() {
        let (c, b) = get_dir_stats(&minidump_path);
        if c > 0 {
            categories.push(CleanupCategoryScan {
                id: "minidumps".into(),
                name: "Windows Kernel Minidumps".into(),
                description: "Historical BSOD crash memory dumps from past system errors".into(),
                path: minidump_path.to_string_lossy().to_string(),
                file_count: c,
                total_bytes: b,
                safe_to_clean: true,
                risk_level: "Review recommended".into(),
            });
        }
    }

    // 8. Windows Delivery Optimization
    let do_path = PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization");
    if do_path.exists() {
        let (c, b) = get_dir_stats(&do_path);
        if c > 0 {
            categories.push(CleanupCategoryScan {
                id: "delivery_opt".into(),
                name: "Delivery Optimization Cache".into(),
                description: "Peer-to-peer Windows update download fragments".into(),
                path: do_path.to_string_lossy().to_string(),
                file_count: c,
                total_bytes: b,
                safe_to_clean: true,
                risk_level: "Safe to remove".into(),
            });
        }
    }

    let rb = query_recycle_bin_stats();

    let total_bytes: u64 = categories.iter().map(|c| c.total_bytes).sum::<u64>() + rb.total_bytes;
    let total_files: usize = categories.iter().map(|c| c.file_count).sum::<usize>() + rb.item_count as usize;

    let now_epoch_ms = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64;

    Ok(CleanupScanResult {
        categories,
        total_bytes,
        total_files,
        recycle_bin: rb,
        scan_timestamp_ms: now_epoch_ms,
    })
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CleanupProgressPayload {
    pub percent: f32,
    pub stage: String,
    pub current_item: String,
    pub cleaned_bytes: u64,
    pub cleaned_files: usize,
}

#[tauri::command]
pub fn execute_cleanup(
    app: tauri::AppHandle,
    category_ids: Vec<String>,
    empty_recycle_bin: bool,
    db: tauri::State<'_, Database>,
) -> Result<CleanupExecutionResult, String> {
    use tauri::Emitter;

    let mut cleaned_bytes = 0u64;
    let mut cleaned_files = 0usize;
    let mut skipped_files = 0usize;

    let total_steps = category_ids.len() + if empty_recycle_bin { 1 } else { 0 };
    let step_weight = if total_steps > 0 {
        90.0 / total_steps as f32
    } else {
        90.0
    };

    let _ = app.emit(
        "cleanup-progress",
        CleanupProgressPayload {
            percent: 5.0,
            stage: "Preparing".into(),
            current_item: "Initializing safe cleanup engine...".into(),
            cleaned_bytes: 0,
            cleaned_files: 0,
        },
    );

    for (idx, id) in category_ids.iter().enumerate() {
        let base_pct = 5.0 + (idx as f32 * step_weight);
        let cat_label = match id.as_str() {
            "user_temp" => "User Temporary Files",
            "win_temp" => "System Windows Temp",
            "thumb_cache" => "Windows Thumbnail Cache",
            "edge_cache" => "Microsoft Edge Web Cache",
            "chrome_cache" => "Google Chrome Web Cache",
            "crash_dumps" => "Application Crash Dumps",
            "minidumps" => "Windows Kernel Minidumps",
            "delivery_opt" => "Delivery Optimization Cache",
            _ => id.as_str(),
        };

        let _ = app.emit(
            "cleanup-progress",
            CleanupProgressPayload {
                percent: base_pct + (step_weight * 0.2),
                stage: format!("Cleaning {}", cat_label),
                current_item: format!("Safely purging {}", cat_label),
                cleaned_bytes,
                cleaned_files,
            },
        );

        if id == "user_temp" {
            if let Ok(temp_env) = std::env::var("TEMP") {
                let (c, b, s) = clean_dir_safe(&PathBuf::from(temp_env));
                cleaned_files += c;
                cleaned_bytes += b;
                skipped_files += s;
            }
        } else if id == "win_temp" {
            let (c, b, s) = clean_dir_safe(&PathBuf::from("C:\\Windows\\Temp"));
            cleaned_files += c;
            cleaned_bytes += b;
            skipped_files += s;
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
                                        } else {
                                            skipped_files += 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if id == "edge_cache" {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let edge_cache = PathBuf::from(&local_app_data).join("Microsoft\\Edge\\User Data\\Default\\Cache");
                let (c, b, s) = clean_dir_safe(&edge_cache);
                cleaned_files += c;
                cleaned_bytes += b;
                skipped_files += s;
            }
        } else if id == "chrome_cache" {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let chrome_cache = PathBuf::from(&local_app_data).join("Google\\Chrome\\User Data\\Default\\Cache");
                let (c, b, s) = clean_dir_safe(&chrome_cache);
                cleaned_files += c;
                cleaned_bytes += b;
                skipped_files += s;
            }
        } else if id == "crash_dumps" {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                let user_dumps = PathBuf::from(&local_app_data).join("CrashDumps");
                let (c, b, s) = clean_dir_safe(&user_dumps);
                cleaned_files += c;
                cleaned_bytes += b;
                skipped_files += s;
            }
        } else if id == "minidumps" {
            let (c, b, s) = clean_dir_safe(&PathBuf::from("C:\\Windows\\Minidump"));
            cleaned_files += c;
            cleaned_bytes += b;
            skipped_files += s;
        } else if id == "delivery_opt" {
            let (c, b, s) = clean_dir_safe(&PathBuf::from("C:\\Windows\\SoftwareDistribution\\DeliveryOptimization"));
            cleaned_files += c;
            cleaned_bytes += b;
            skipped_files += s;
        }

        let _ = app.emit(
            "cleanup-progress",
            CleanupProgressPayload {
                percent: base_pct + step_weight,
                stage: format!("Processed {}", cat_label),
                current_item: format!(
                    "Freed {:.2} MB so far ({} in-use files safely skipped)",
                    cleaned_bytes as f64 / (1024.0 * 1024.0),
                    skipped_files
                ),
                cleaned_bytes,
                cleaned_files,
            },
        );
    }

    if empty_recycle_bin {
        let _ = app.emit(
            "cleanup-progress",
            CleanupProgressPayload {
                percent: 92.0,
                stage: "Recycle Bin".into(),
                current_item: "Permanently emptying Windows Recycle Bin...".into(),
                cleaned_bytes,
                cleaned_files,
            },
        );

        #[cfg(target_os = "windows")]
        {
            #[link(name = "shell32")]
            extern "system" {
                fn SHEmptyRecycleBinW(
                    hwnd: *mut std::ffi::c_void,
                    psz_root_path: *const u16,
                    dw_flags: u32,
                ) -> i32;
            }
            const SHERB_NOCONFIRMATION: u32 = 0x00000001;
            const SHERB_NOPROGRESSUI: u32 = 0x00000002;
            const SHERB_NOSOUND: u32 = 0x00000004;

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
        &format!("Cleaned {} categories (skipped {} in-use)", category_ids.len(), skipped_files),
        true,
    );

    let _ = app.emit(
        "cleanup-progress",
        CleanupProgressPayload {
            percent: 100.0,
            stage: "Completed".into(),
            current_item: format!(
                "Reclaimed {:.2} MB across {} files ({} in-use skipped)",
                cleaned_bytes as f64 / (1024.0 * 1024.0),
                cleaned_files,
                skipped_files
            ),
            cleaned_bytes,
            cleaned_files,
        },
    );

    Ok(CleanupExecutionResult {
        total_cleaned_bytes: cleaned_bytes,
        total_cleaned_files: cleaned_files,
        total_skipped_files: skipped_files,
        success: true,
        message: format!(
            "Reclaimed {:.2} MB across {} files. {} in-use files were safely preserved.",
            cleaned_bytes as f64 / (1024.0 * 1024.0),
            cleaned_files,
            skipped_files
        ),
    })
}

#[tauri::command]
pub fn scan_large_files() -> Result<Vec<LargeFileItem>, String> {
    let mut results = Vec::new();
    let threshold_bytes = 100 * 1024 * 1024; // 100 MB

    let mut scan_dirs = Vec::new();
    if let Ok(profile) = std::env::var("USERPROFILE") {
        scan_dirs.push(PathBuf::from(&profile).join("Downloads"));
        scan_dirs.push(PathBuf::from(&profile).join("Videos"));
        scan_dirs.push(PathBuf::from(&profile).join("Documents"));
    }

    for dir in scan_dirs {
        if dir.exists() {
            if let Ok(entries) = fs::read_dir(&dir) {
                for entry in entries.flatten() {
                    if let Ok(meta) = entry.metadata() {
                        if meta.is_file() && meta.len() >= threshold_bytes {
                            let path = entry.path();
                            let ext = path
                                .extension()
                                .and_then(|e| e.to_str())
                                .unwrap_or("file")
                                .to_string();
                            let modified = meta
                                .modified()
                                .ok()
                                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_millis() as u64)
                                .unwrap_or(0);

                            results.push(LargeFileItem {
                                name: entry.file_name().to_string_lossy().to_string(),
                                path: path.to_string_lossy().to_string(),
                                size_bytes: meta.len(),
                                last_modified_epoch_ms: modified,
                                extension: ext,
                            });
                        }
                    }
                }
            }
        }
    }

    results.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
    results.truncate(50); // bounded top 50

    Ok(results)
}

#[tauri::command]
pub fn get_cleanup_history(
    db: tauri::State<'_, Database>,
) -> Result<Vec<crate::db::CleanupLog>, String> {
    db.get_cleanup_history(50).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dir_stats_calculation() {
        let temp_dir = std::env::temp_dir().join(format!(
            "sp_test_clean_{}",
            chrono::Utc::now().timestamp_nanos_opt().unwrap_or(0)
        ));
        fs::create_dir_all(&temp_dir).unwrap();
        let file1 = temp_dir.join("test1.txt");
        let file2 = temp_dir.join("test2.txt");
        fs::write(&file1, b"hello").unwrap();
        fs::write(&file2, b"world!").unwrap();

        let (count, bytes) = get_dir_stats(&temp_dir);
        assert_eq!(count, 2);
        assert_eq!(bytes, 11);

        let (cleaned_c, cleaned_b, skipped) = clean_dir_safe(&temp_dir);
        assert_eq!(cleaned_c, 2);
        assert_eq!(cleaned_b, 11);
        assert_eq!(skipped, 0);

        let _ = fs::remove_dir_all(&temp_dir);
    }
}
