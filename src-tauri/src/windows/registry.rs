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
    RegCloseKey, RegEnumKeyExW, RegEnumValueW, RegOpenKeyExW, RegQueryValueExW, HKEY,
    KEY_READ, REG_DWORD, REG_EXPAND_SZ, REG_QWORD, REG_SZ,
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
            let u16_slice = std::slice::from_raw_parts(
                buffer.as_ptr() as *const u16,
                (data_size as usize) / 2,
            );
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
