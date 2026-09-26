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

# TOOLCHAIN NOTE:
# - PRODUCTION RELEASES: Must use x86_64-pc-windows-msvc (GitHub Actions CI enforces this).
# - LOCAL DEVELOPMENT:   MinGW (GNU) toolchain is OK. The .cargo/config.toml now
#   correctly configures the stack size WITHOUT the broken no-default-manifest.spec
#   that caused "TaskDialogIndirect - Entry Point Not Found". tauri-build embeds
#   the manifest via windres which works correctly without that spec file.
# - Do NOT add no-default-manifest.spec back to .cargo/config.toml.
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
