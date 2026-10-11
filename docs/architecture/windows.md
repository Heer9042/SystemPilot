# Windows Native Implementation

SystemPilot interacts directly with Windows kernel and user-mode subsystems to deliver accurate metrics and optimization features.

## Subsystems

1. **Memory Optimization (`windows/memory.rs`)**:
   - `EmptyWorkingSet`: Empties process working sets.
   - `NtSetSystemInformation`: Flushes standby lists and modified page lists with `SeIncreaseQuotaPrivilege` and `SeProfileSingleProcessPrivilege`.

2. **Power Schemes (`windows/power.rs`)**:
   - `PowerGetActiveScheme` / `PowerSetActiveScheme`: Switches between Ultimate Performance, High Performance, and Balanced plans.

3. **Processes & Services (`windows/process.rs`, `windows/services.rs`)**:
   - `OpenProcess`, `TerminateProcess`, `SetPriorityClass`.
   - Windows Service Control Manager (`SCManager`) interaction.

4. **Startup & Registry (`windows/startup.rs`)**:
   - Inspects `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` and `HKLM\Software\Microsoft\Windows\CurrentVersion\Run`.
