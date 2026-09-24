<#
.SYNOPSIS
    Builds the SystemPilot production bundle (.EXE and .MSI Installer).
#>
param (
    [switch]$Debug
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         SystemPilot Production .EXE Builder            " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
Set-Location $projectRoot

# MinGW environment PATH check
$mingwPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
if (Test-Path $mingwPath) {
    $env:PATH = "$mingwPath;$env:PATH"
}
$env:RUST_MIN_STACK = "16777216"

Write-Host "Compiling SystemPilot desktop application..." -ForegroundColor Yellow
if ($Debug) {
    npm run tauri build -- --debug
} else {
    npm run tauri build
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================================" -ForegroundColor Green
    Write-Host " [SUCCESS] SystemPilot built successfully!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "`nStandalone Executable:" -ForegroundColor Cyan
    Write-Host "  $projectRoot\src-tauri\target\release\systempilot.exe" -ForegroundColor White
    Write-Host "`nInstallers:" -ForegroundColor Cyan
    Write-Host "  $projectRoot\src-tauri\target\release\bundle\msi\" -ForegroundColor White
    Write-Host "  $projectRoot\src-tauri\target\release\bundle\nsis\" -ForegroundColor White
} else {
    Write-Host "`n[ERROR] Build failed with exit code $LASTEXITCODE." -ForegroundColor Red
}

exit $LASTEXITCODE
