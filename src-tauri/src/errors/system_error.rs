use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SystemError {
    ProcessNotFound(u32),
    AccessDenied(String),
    Win32Error(String),
    DatabaseError(String),
    IoError(String),
    CommandFailed(String),
}

impl fmt::Display for SystemError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SystemError::ProcessNotFound(pid) => write!(f, "Process with PID {} not found", pid),
            SystemError::AccessDenied(msg) => write!(f, "Access Denied: {}", msg),
            SystemError::Win32Error(msg) => write!(f, "Win32 Error: {}", msg),
            SystemError::DatabaseError(msg) => write!(f, "Database Error: {}", msg),
            SystemError::IoError(msg) => write!(f, "IO Error: {}", msg),
            SystemError::CommandFailed(msg) => write!(f, "Command Failed: {}", msg),
        }
    }
}

impl std::error::Error for SystemError {}

impl From<std::io::Error> for SystemError {
    fn from(err: std::io::Error) -> Self {
        SystemError::IoError(err.to_string())
    }
}
