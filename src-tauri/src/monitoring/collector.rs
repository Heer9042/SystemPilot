//! Real-time telemetry collector engine

use std::sync::{Arc, Mutex};
use sysinfo::System;

pub struct SystemCollector {
    sys: Arc<Mutex<System>>,
}

impl SystemCollector {
    pub fn new(sys: Arc<Mutex<System>>) -> Self {
        Self { sys }
    }

    pub fn refresh_all(&self) {
        if let Ok(mut s) = self.sys.lock() {
            s.refresh_all();
        }
    }
}
