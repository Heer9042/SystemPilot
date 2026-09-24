@echo off
setlocal enabledelayedexpansion

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
call npm run tauri build
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Build failed.
    pause
    exit /b 1
)

echo.
echo [3/3] Packaging Release Artifacts and DLLs...
if not exist "release" mkdir "release"

:: Ensure WebView2Loader.dll is copied alongside standalone executable
if exist "src-tauri\target\release\WebView2Loader.dll" (
    copy /y "src-tauri\target\release\WebView2Loader.dll" "release\WebView2Loader.dll" >nul
    copy /y "src-tauri\target\release\WebView2Loader.dll" "src-tauri\resources\WebView2Loader.dll" >nul 2>nul
)

if exist "src-tauri\target\release\systempilot.exe" (
    copy /y "src-tauri\target\release\systempilot.exe" "release\SystemPilot.exe" >nul
)

:: Copy NSIS Installer
for %%F in (src-tauri\target\release\bundle\nsis\*.exe) do (
    copy /y "%%F" "release\SystemPilot-Setup.exe" >nul
)

:: Copy MSI Installer
for %%F in (src-tauri\target\release\bundle\msi\*.msi) do (
    copy /y "%%F" "release\SystemPilot.msi" >nul
)

:: Create Portable ZIP with Executable and DLL
powershell -NoProfile -Command "if (Test-Path 'release/SystemPilot.exe') { Compress-Archive -Path 'release/SystemPilot.exe','release/WebView2Loader.dll' -DestinationPath 'release/SystemPilot-Portable.zip' -Force }"

:: Generate SHA256 Checksums for all release artifacts
powershell -NoProfile -Command "$items = Get-ChildItem -Path 'release/*' -Exclude 'SHA256SUMS.txt'; $lines = @(); foreach ($i in $items) { $h = (Get-FileHash -Path $i.FullName -Algorithm SHA256).Hash; $lines += \"$h  $($i.Name)\" }; $lines | Out-File -FilePath 'release/SHA256SUMS.txt' -Encoding ascii"

echo.
echo ========================================================
echo [SUCCESS] SystemPilot built successfully!
echo ========================================================
echo.
echo All ready-to-use release files are in: %~dp0release\
echo.
echo   1. Release Directory (Standalone):
echo      - %~dp0release\SystemPilot.exe
echo      - %~dp0release\WebView2Loader.dll (required alongside .exe)
echo.
echo   2. Portable ZIP:
echo      - %~dp0release\SystemPilot-Portable.zip
echo.
echo   3. Installers:
echo      - %~dp0release\SystemPilot-Setup.exe (NSIS Installer)
echo      - %~dp0release\SystemPilot.msi (Windows Installer)
echo.
echo   4. Checksums:
echo      - %~dp0release\SHA256SUMS.txt
echo.
pause
