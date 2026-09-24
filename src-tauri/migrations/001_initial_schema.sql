-- SystemPilot initial database schema

CREATE TABLE IF NOT EXISTS system_metrics_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    cpu_percent REAL NOT NULL,
    ram_used_bytes INTEGER NOT NULL,
    ram_total_bytes INTEGER NOT NULL,
    disk_read_bytes INTEGER NOT NULL,
    disk_write_bytes INTEGER NOT NULL,
    net_recv_bytes INTEGER NOT NULL,
    net_sent_bytes INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    process_name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    boost_cpu_priority INTEGER DEFAULT 1,
    clean_memory_on_launch INTEGER DEFAULT 1,
    power_plan_guid TEXT
);

CREATE TABLE IF NOT EXISTS optimization_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    action_type TEXT NOT NULL,
    freed_bytes INTEGER DEFAULT 0,
    details TEXT
);
