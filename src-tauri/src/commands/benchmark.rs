use crate::db::{BenchmarkLog, Database};
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BenchmarkResult {
    pub test_type: String,
    pub score: f64,
    pub duration_ms: u64,
    pub throughput_mb_s: Option<f64>,
    pub details: String,
}

pub struct BenchmarkState {
    pub is_stress_running: Arc<AtomicBool>,
}

impl Default for BenchmarkState {
    fn default() -> Self {
        Self {
            is_stress_running: Arc::new(AtomicBool::new(false)),
        }
    }
}

#[tauri::command]
pub fn run_cpu_benchmark(db: tauri::State<'_, Database>) -> Result<BenchmarkResult, String> {
    let start = Instant::now();
    let num_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    let mut handles = Vec::new();
    let iters_per_thread = 20_000_000u64;

    for _ in 0..num_threads {
        handles.push(std::thread::spawn(move || {
            let mut acc = 0u64;
            for i in 0..iters_per_thread {
                acc = acc.wrapping_add(i.wrapping_mul(31)).rotate_left(3);
            }
            acc
        }));
    }

    let mut total_acc = 0u64;
    for h in handles {
        if let Ok(res) = h.join() {
            total_acc = total_acc.wrapping_add(res);
        }
    }

    let duration = start.elapsed();
    let duration_ms = duration.as_millis() as u64;
    let score = if duration_ms > 0 {
        ((num_threads as f64 * iters_per_thread as f64) / (duration_ms as f64)) * 100.0
    } else {
        10000.0
    };

    let details = format!(
        "Multi-core CPU compute test across {} threads in {} ms (check: {})",
        num_threads, duration_ms, total_acc % 1000
    );

    let _ = db.add_benchmark_log("CPU Multi-Core", score, duration_ms, &details);

    Ok(BenchmarkResult {
        test_type: "CPU Multi-Core".into(),
        score,
        duration_ms,
        throughput_mb_s: None,
        details,
    })
}

#[tauri::command]
pub fn run_memory_benchmark(db: tauri::State<'_, Database>) -> Result<BenchmarkResult, String> {
    let start = Instant::now();
    let buffer_size = 128 * 1024 * 1024; // 128 MB buffer
    let mut buffer: Vec<u8> = vec![0u8; buffer_size];

    // Write pass
    for i in 0..buffer_size {
        buffer[i] = (i % 255) as u8;
    }

    // Read/verify pass
    let mut sum = 0u64;
    for &b in &buffer {
        sum = sum.wrapping_add(b as u64);
    }

    let duration = start.elapsed();
    let duration_ms = duration.as_millis().max(1) as u64;
    let total_bytes = (buffer_size * 2) as f64;
    let throughput_mb_s = (total_bytes / (1024.0 * 1024.0)) / (duration.as_secs_f64());
    let score = throughput_mb_s * 10.0;

    let details = format!(
        "Memory bandwidth: {:.2} MB/s throughput across 128MB sequential buffer (sum: {})",
        throughput_mb_s, sum % 1000
    );

    let _ = db.add_benchmark_log("Memory Bandwidth", score, duration_ms, &details);

    Ok(BenchmarkResult {
        test_type: "Memory Bandwidth".into(),
        score,
        duration_ms,
        throughput_mb_s: Some(throughput_mb_s),
        details,
    })
}

#[tauri::command]
pub fn run_disk_benchmark(db: tauri::State<'_, Database>) -> Result<BenchmarkResult, String> {
    use std::io::{Read, Seek, SeekFrom, Write};

    let start = Instant::now();
    let temp_dir = std::env::temp_dir();
    let test_file = temp_dir.join("systempilot_disk_bench.tmp");

    let chunk_size = 1024 * 1024; // 1 MB
    let total_chunks = 64; // 64 MB total
    let data: Vec<u8> = vec![0xAA; chunk_size];

    let write_res = (|| -> std::io::Result<()> {
        let mut file = std::fs::File::create(&test_file)?;
        for _ in 0..total_chunks {
            file.write_all(&data)?;
        }
        file.sync_all()?;
        Ok(())
    })();

    if let Err(e) = write_res {
        return Err(format!("Disk write benchmark failed: {}", e));
    }

    let mut read_buf = vec![0u8; chunk_size];
    let read_res = (|| -> std::io::Result<()> {
        let mut file = std::fs::File::open(&test_file)?;
        file.seek(SeekFrom::Start(0))?;
        for _ in 0..total_chunks {
            file.read_exact(&mut read_buf)?;
        }
        Ok(())
    })();

    let _ = std::fs::remove_file(&test_file);

    if let Err(e) = read_res {
        return Err(format!("Disk read benchmark failed: {}", e));
    }

    let duration = start.elapsed();
    let duration_ms = duration.as_millis().max(1) as u64;
    let total_mb = (total_chunks * 2) as f64;
    let throughput_mb_s = total_mb / duration.as_secs_f64();
    let score = throughput_mb_s * 15.0;

    let details = format!(
        "Disk IO throughput: {:.2} MB/s (64MB sequential write + read sync)",
        throughput_mb_s
    );

    let _ = db.add_benchmark_log("Disk Sequential IO", score, duration_ms, &details);

    Ok(BenchmarkResult {
        test_type: "Disk Sequential IO".into(),
        score,
        duration_ms,
        throughput_mb_s: Some(throughput_mb_s),
        details,
    })
}

#[tauri::command]
pub fn start_cpu_stress(
    duration_seconds: u64,
    state: tauri::State<'_, BenchmarkState>,
) -> Result<bool, String> {
    let safe_duration = duration_seconds.clamp(1, 3600);
    let running = state.is_stress_running.clone();
    if running.load(Ordering::SeqCst) {
        return Ok(true);
    }

    running.store(true, Ordering::SeqCst);
    let flag = running.clone();

    let num_threads = std::thread::available_parallelism()
        .map(|n| n.get())
        .unwrap_or(4);

    std::thread::spawn(move || {
        let end_time = Instant::now() + std::time::Duration::from_secs(safe_duration);
        let mut workers = Vec::new();

        for _ in 0..num_threads {
            let f = flag.clone();
            workers.push(std::thread::spawn(move || {
                while f.load(Ordering::SeqCst) && Instant::now() < end_time {
                    let mut x = 1.0f64;
                    for _ in 0..10_000 {
                        x = (x + 0.12345).sin().cos();
                    }
                }
            }));
        }

        for w in workers {
            let _ = w.join();
        }
        flag.store(false, Ordering::SeqCst);
    });

    Ok(true)
}

#[tauri::command]
pub fn stop_cpu_stress(state: tauri::State<'_, BenchmarkState>) -> Result<bool, String> {
    state.is_stress_running.store(false, Ordering::SeqCst);
    Ok(true)
}

#[tauri::command]
pub fn get_benchmark_history(db: tauri::State<'_, Database>) -> Result<Vec<BenchmarkLog>, String> {
    db.get_benchmark_history(50).map_err(|e| e.to_string())
}
