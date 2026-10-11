//! Background monitoring scheduler

use std::time::Duration;

pub struct MonitorScheduler {
    interval: Duration,
}

impl MonitorScheduler {
    pub fn new(interval_ms: u64) -> Self {
        Self {
            interval: Duration::from_millis(interval_ms),
        }
    }

    pub fn interval(&self) -> Duration {
        self.interval
    }
}
