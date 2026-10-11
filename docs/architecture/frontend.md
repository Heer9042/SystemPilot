# Frontend Architecture

## Principles
- **Separation of Concerns**: UI components never call `invoke()` directly. They consume custom hooks or service functions from `services/tauri/`.
- **Component Isolation**: Reusable components live under `components/` grouped by domain (e.g. `memory/`, `processes/`, `charts/`).
- **Page Assembly**: Full screens live in `pages/` and combine reusable components with the layout frame in `layouts/`.

## Directory Map
- `components/`: Modular widgets and controls.
- `layouts/`: `AppLayout`, `Sidebar`, `TopBar`, `TitleBar`.
- `pages/`: Route/tab targets.
- `hooks/`: Domain-specific state lifecycle hooks.
- `services/`: Tauri IPC wrappers.
- `utils/`: Unit conversions, formatting, and mathematical utilities.
