# SystemPilot Privacy Policy

**Last Updated:** September 2026

SystemPilot is designed from the ground up as a **local-first, private desktop utility**. We believe your system metrics, active processes, and hardware telemetry belong solely to you.

---

## 1. Zero Telemetry & Analytics
* SystemPilot **does not** include third-party tracking, analytics, or profiling SDKs (no Google Analytics, PostHog, Mixpanel, Sentry, or advertising SDKs).
* We do not track user behavior, page views, click metrics, or session duration.

## 2. Local-Only System Telemetry
* All hardware information, CPU loads, memory metrics, disk activity, and network bandwidth data are collected directly from local Windows APIs (`sysinfo`, Win32 API).
* Telemetry data is displayed live in-memory. Historical metrics and user preferences are stored exclusively in your local SQLite database:
  ```text
  %LOCALAPPDATA%\SystemPilot\systempilot.db
  ```
* No system telemetry or hardware specifications are ever transmitted over the network.

## 3. GitHub In-App Update Checks
* When enabled, SystemPilot connects over secure HTTPS to the official public GitHub Releases API:
  ```text
  https://api.github.com/repos/Heer9042/SystemPilot/releases/latest
  ```
* **Information Transmitted:** Standard HTTPS headers required by GitHub's API. No personal files, hardware telemetry, process names, or identifiers are included.
* **User Control:** You can disable automatic update checks at any time in **Settings → SystemPilot Updates & Release Channel**.
* SystemPilot continues to function seamlessly when offline or if internet connectivity is unavailable.

## 4. System Cleanup & Process Management
* System cleanup operations only delete files in designated temporary folders (`%TEMP%`, `C:\Windows\Temp`, Thumbnail cache, Windows Recycle Bin) upon explicit user confirmation.
* Process controls (priority adjustment, suspend, resume, termination) only interact with your local Windows operating system processes.

## 5. Contact & Questions
If you have questions regarding this privacy policy or our local-first architecture, please open an issue on the official GitHub repository:
`https://github.com/Heer9042/SystemPilot/issues`
