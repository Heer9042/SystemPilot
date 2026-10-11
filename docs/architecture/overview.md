# SystemPilot Architecture Overview

SystemPilot is an enterprise-grade Windows system utility and telemetry monitor built on **Tauri 2**, **Rust**, and **React**.

## System Topology

```text
┌─────────────────────────────────────────────────────────┐
│ React Frontend (Vite + Tailwind CSS + Lucide + Recharts)│
│  ├── Components & Pages                                 │
│  ├── Hooks (useSystemStats, useMemory, useProcesses)   │
│  └── Services (Tauri IPC wrappers)                      │
└───────────────────────────┬─────────────────────────────┘
                            │ Tauri IPC (Commands / Events)
┌───────────────────────────▼─────────────────────────────┐
│ Tauri 2 Backend (Rust)                                  │
│  ├── commands/   (Thin IPC endpoint layer)              │
│  ├── system/     (Core metrics & orchestration)         │
│  ├── windows/    (Win32 / NT Native API implementations)│
│  ├── database/   (SQLite local metrics storage)         │
│  ├── monitoring/ (Background telemetry polling engine)  │
│  └── gaming/     (Process detection & profile boosts)   │
└─────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

1. **Presentation / UI**: Renders real-time telemetry, charts, and control interfaces. No business logic or direct native bindings.
2. **Services / Hooks**: Encapsulate Tauri IPC calls, error handling, state, and auto-refresh intervals.
3. **Commands**: Validate incoming parameters and delegate work to backend modules.
4. **System & Windows**: Interact with native Windows APIs (`NtSetSystemInformation`, `SetProcessWorkingSetSize`, `Psapi`, `WMI`, `PDH`).
