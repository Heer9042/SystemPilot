use crate::db::{Database, GamingProfile};

#[tauri::command]
pub fn get_gaming_profiles(db: tauri::State<'_, Database>) -> Result<Vec<GamingProfile>, String> {
    db.get_gaming_profiles().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_gaming_profile(db: tauri::State<'_, Database>, profile: GamingProfile) -> Result<bool, String> {
    db.save_gaming_profile(&profile).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn delete_gaming_profile(db: tauri::State<'_, Database>, id: i64) -> Result<bool, String> {
    db.delete_gaming_profile(id).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn check_active_game(
    state: tauri::State<'_, super::system::SystemState>,
    db: tauri::State<'_, Database>,
) -> Result<Option<GamingProfile>, String> {
    let profiles = db.get_gaming_profiles().unwrap_or_default();
    let enabled_profiles: Vec<GamingProfile> = profiles.into_iter().filter(|p| p.enabled).collect();

    if enabled_profiles.is_empty() {
        return Ok(None);
    }

    let mut sys = state.sys.lock().map_err(|e| e.to_string())?;
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

    for (_pid, proc_) in sys.processes() {
        let name = proc_.name().to_lowercase();
        for profile in &enabled_profiles {
            let target = profile.process_name.to_lowercase();
            if name.contains(&target) || target.contains(&name) {
                return Ok(Some(profile.clone()));
            }
        }
    }

    Ok(None)
}
