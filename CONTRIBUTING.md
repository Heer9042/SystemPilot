# Contributing to SystemPilot

Thank you for your interest in contributing to SystemPilot!

## Architecture Rules

SystemPilot follows a strict 7-layer architecture:
1. **UI Layer** (`components/`, `pages/`, `layouts/`)
2. **Hooks Layer** (`hooks/`)
3. **Frontend Services** (`services/tauri/`)
4. **Tauri Commands** (`src-tauri/src/commands/`)
5. **System Logic** (`src-tauri/src/system/`)
6. **Windows Platform** (`src-tauri/src/windows/`)
7. **Native APIs & Storage** (Win32, SQLite)

## Development Workflow

1. Fork the repository and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Follow code conventions specified in `.editorconfig`.
3. Test your changes using `npm test` or `cargo test`.
4. Commit your changes: `git commit -m 'feat: add amazing feature'`.
5. Push to the branch: `git push origin feature/amazing-feature`.
6. Open a Pull Request.

## Code Standards
- Keep responsibilities isolated. Never make direct Tauri invocations inside UI components; use service wrappers.
- Do not mix generic cross-platform logic with Windows-specific API implementations.
- Write unit/integration tests under `tests/` for new modules.
