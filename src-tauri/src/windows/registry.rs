//! Windows Registry helper functions for fast, zero-process system telemetry.

#![allow(dead_code)]

#[cfg(target_os = "windows")]
use std::ffi::OsString;
#[cfg(target_os = "windows")]
use std::os::windows::ffi::OsStringExt;
#[cfg(target_os = "windows")]
use windows_sys::Win32::Foundation::ERROR_SUCCESS;
#[cfg(target_os = "windows")]
use windows_sys::Win32::System::Registry::{
    RegCloseKey, RegCreateKeyExW, RegDeleteValueW, RegEnumKeyExW, RegEnumValueW, RegOpenKeyExW,
    RegQueryValueExW, RegSetValueExW, HKEY, KEY_READ, KEY_WRITE, REG_DWORD,
    REG_EXPAND_SZ, REG_OPTION_NON_VOLATILE, REG_QWORD, REG_SZ,
};

#[cfg(target_os = "windows")]
pub fn to_wide_chars(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

#[cfg(target_os = "windows")]
pub fn from_wide_null_terminated(slice: &[u16]) -> String {
    let len = slice.iter().position(|&c| c == 0).unwrap_or(slice.len());
    OsString::from_wide(&slice[..len])
        .to_string_lossy()
        .trim_matches('\0')
        .trim()
        .to_string()
}

#[cfg(target_os = "windows")]
pub fn get_reg_string(root: HKEY, subkey: &str, value_name: &str) -> Option<String> {
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        if RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return None;
        }

        let wide_val = to_wide_chars(value_name);
        let mut val_type: u32 = 0;
        let mut data_size: u32 = 0;

        // First query size
        let res = RegQueryValueExW(
            hkey,
            wide_val.as_ptr(),
            std::ptr::null_mut(),
            &mut val_type,
            std::ptr::null_mut(),
            &mut data_size,
        );

        if res != ERROR_SUCCESS || data_size == 0 {
            RegCloseKey(hkey);
            return None;
        }

        let mut buffer: Vec<u8> = vec![0u8; data_size as usize + 2];
        let res = RegQueryValueExW(
            hkey,
            wide_val.as_ptr(),
            std::ptr::null_mut(),
            &mut val_type,
            buffer.as_mut_ptr(),
            &mut data_size,
        );

        RegCloseKey(hkey);

        if res != ERROR_SUCCESS {
            return None;
        }

        if val_type == REG_SZ || val_type == REG_EXPAND_SZ {
            let u16_slice =
                std::slice::from_raw_parts(buffer.as_ptr() as *const u16, (data_size as usize) / 2);
            let s = from_wide_null_terminated(u16_slice);
            if !s.is_empty() {
                return Some(s);
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
pub fn get_reg_dword(root: HKEY, subkey: &str, value_name: &str) -> Option<u32> {
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        if RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return None;
        }

        let wide_val = to_wide_chars(value_name);
        let mut val_type: u32 = 0;
        let mut data: u32 = 0;
        let mut data_size: u32 = std::mem::size_of::<u32>() as u32;

        let res = RegQueryValueExW(
            hkey,
            wide_val.as_ptr(),
            std::ptr::null_mut(),
            &mut val_type,
            &mut data as *mut u32 as *mut u8,
            &mut data_size,
        );

        RegCloseKey(hkey);

        if res == ERROR_SUCCESS && val_type == REG_DWORD {
            Some(data)
        } else {
            None
        }
    }
}

#[cfg(target_os = "windows")]
pub fn get_reg_qword(root: HKEY, subkey: &str, value_name: &str) -> Option<u64> {
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        if RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return None;
        }

        let wide_val = to_wide_chars(value_name);
        let mut val_type: u32 = 0;
        let mut data: u64 = 0;
        let mut data_size: u32 = std::mem::size_of::<u64>() as u32;

        let res = RegQueryValueExW(
            hkey,
            wide_val.as_ptr(),
            std::ptr::null_mut(),
            &mut val_type,
            &mut data as *mut u64 as *mut u8,
            &mut data_size,
        );

        RegCloseKey(hkey);

        if res == ERROR_SUCCESS {
            if val_type == REG_QWORD {
                return Some(data);
            } else if val_type == REG_DWORD {
                return Some(data as u32 as u64);
            }
        }
    }
    None
}

#[cfg(target_os = "windows")]
pub fn enum_reg_values(root: HKEY, subkey: &str) -> Vec<(String, String)> {
    let mut entries = Vec::new();
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        if RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return entries;
        }

        let mut index = 0u32;
        let mut name_buf = [0u16; 512];
        let mut data_buf = [0u8; 2048];

        loop {
            let mut name_len = name_buf.len() as u32;
            let mut data_len = data_buf.len() as u32;
            let mut val_type: u32 = 0;

            let res = RegEnumValueW(
                hkey,
                index,
                name_buf.as_mut_ptr(),
                &mut name_len,
                std::ptr::null_mut(),
                &mut val_type,
                data_buf.as_mut_ptr(),
                &mut data_len,
            );

            if res != ERROR_SUCCESS {
                break;
            }

            let name = from_wide_null_terminated(&name_buf[..name_len as usize]);
            let value = if val_type == REG_SZ || val_type == REG_EXPAND_SZ {
                let u16_slice = std::slice::from_raw_parts(
                    data_buf.as_ptr() as *const u16,
                    (data_len as usize) / 2,
                );
                from_wide_null_terminated(u16_slice)
            } else if val_type == REG_DWORD {
                let val = *(data_buf.as_ptr() as *const u32);
                val.to_string()
            } else {
                "".to_string()
            };

            if !name.is_empty() {
                entries.push((name, value));
            }

            index += 1;
            if index > 200 {
                break; // safety cap
            }
        }

        RegCloseKey(hkey);
    }
    entries
}

/// Write a REG_SZ string value to the registry (creates the key if needed).
/// Only use for HKCU paths which do not require elevation.
#[cfg(target_os = "windows")]
pub fn set_reg_string(root: HKEY, subkey: &str, value_name: &str, value: &str) -> Result<(), String> {
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();
        let mut disposition: u32 = 0;

        let res = RegCreateKeyExW(
            root,
            wide_subkey.as_ptr(),
            0,
            std::ptr::null_mut(),
            REG_OPTION_NON_VOLATILE,
            KEY_WRITE,
            std::ptr::null_mut(),
            &mut hkey,
            &mut disposition,
        );

        if res != 0 {
            return Err(format!("RegCreateKeyExW failed with code {}", res));
        }

        let wide_val = to_wide_chars(value_name);
        let wide_data: Vec<u16> = value.encode_utf16().chain(std::iter::once(0)).collect();
        let byte_data: &[u8] = std::slice::from_raw_parts(
            wide_data.as_ptr() as *const u8,
            wide_data.len() * 2,
        );

        let res2 = RegSetValueExW(
            hkey,
            wide_val.as_ptr(),
            0,
            REG_SZ,
            byte_data.as_ptr(),
            byte_data.len() as u32,
        );

        RegCloseKey(hkey);

        if res2 != 0 {
            Err(format!("RegSetValueExW failed with code {}", res2))
        } else {
            Ok(())
        }
    }
}

/// Delete a registry value.
#[cfg(target_os = "windows")]
pub fn delete_reg_value(root: HKEY, subkey: &str, value_name: &str) -> Result<(), String> {
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        let res = RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_WRITE, &mut hkey);
        if res != 0 {
            return Err(format!("RegOpenKeyExW failed with code {}", res));
        }

        let wide_val = to_wide_chars(value_name);
        let res2 = RegDeleteValueW(hkey, wide_val.as_ptr());
        RegCloseKey(hkey);

        if res2 != 0 {
            Err(format!("RegDeleteValueW failed with code {}", res2))
        } else {
            Ok(())
        }
    }
}

#[cfg(target_os = "windows")]
pub fn enum_subkeys(root: HKEY, subkey: &str) -> Vec<String> {
    let mut keys = Vec::new();
    unsafe {
        let wide_subkey = to_wide_chars(subkey);
        let mut hkey: HKEY = std::ptr::null_mut();

        if RegOpenKeyExW(root, wide_subkey.as_ptr(), 0, KEY_READ, &mut hkey) != ERROR_SUCCESS {
            return keys;
        }

        let mut index = 0u32;
        let mut name_buf = [0u16; 256];

        loop {
            let mut name_len = name_buf.len() as u32;
            let res = RegEnumKeyExW(
                hkey,
                index,
                name_buf.as_mut_ptr(),
                &mut name_len,
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
                std::ptr::null_mut(),
            );

            if res != ERROR_SUCCESS {
                break;
            }

            let sub = from_wide_null_terminated(&name_buf[..name_len as usize]);
            if !sub.is_empty() {
                keys.push(sub);
            }

            index += 1;
            if index > 100 {
                break;
            }
        }

        RegCloseKey(hkey);
    }
    keys
}
