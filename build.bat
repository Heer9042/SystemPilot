@echo off
setlocal

title SystemPilot - Production Executable Builder

echo ========================================================
echo         SystemPilot Production .EXE / .MSI Builder            
echo ========================================================
echo.

:: Ensure MinGW / GCC is in PATH if installed via WinGet
if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin" (
    set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin;%PATH%"
)

:: Set minimum stack size for Rust compiler and build scripts
set "RUST_MIN_STACK=16777216"

:: Navigate to project root
cd /d "%~dp0"

echo [1/3] Checking environment...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js.
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Rust / Cargo is not found in PATH. Please install Rust.
    pause
    exit /b 1
)

echo [OK] Node.js and Rust detected.
echo.

echo [2/3] Compiling Application (Frontend + Tauri 2 Backend)...

:: Build frontend
call npm --prefix frontend run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)

:: Build Tauri Desktop Application (NSIS + MSI)
call npm run tauri build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Application compilation failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging Release Artifacts and DLLs...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\package_release.ps1"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Packaging release artifacts failed.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo [SUCCESS] SystemPilot built successfully!
echo ========================================================
echo.
echo All ready-to-use release files are in: %~dp0release\
echo.
echo   1. Release Directory (Standalone):
echo      - %~dp0release\SystemPilot.exe
echo      - %~dp0release\WebView2Loader.dll
echo.
echo   2. Portable ZIP:
echo      - %~dp0release\SystemPilot-Portable.zip
echo.
echo   3. Installers:
echo      - %~dp0release\SystemPilot-Setup.exe (NSIS Setup Installer)
echo      - %~dp0release\SystemPilot.msi (Windows MSI Package)
echo.
echo   4. Cryptographic Checksums:
echo      - %~dp0release\SHA256SUMS.txt
echo.
pause
