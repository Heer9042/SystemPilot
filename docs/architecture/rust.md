# Rust Backend Architecture

## Module Structure

- `commands/`: Tauri IPC invokable entrypoints annotated with `#[tauri::command]`.
- `system/`: Aggregator and cross-platform representations of CPU, Memory, GPU, Disk, Network, and Hardware telemetry.
- `windows/`: Platform-specific Win32 and Windows NT API bindings.
- `database/`: SQLite database initialization, migration engine, and time-series metric persistence.
- `monitoring/`: Background thread collector updating shared mutex states.
- `gaming/`: Automated game process detection and power profile switcher.
- `errors/`: Unified error types and result handlers.

## State Management
Application state is shared via Tauri's managed state pattern (`tauri::State<AppState>`). Mutex locks are held for minimal scopes to ensure responsive IPC calls.
