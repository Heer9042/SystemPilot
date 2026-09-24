<#
.SYNOPSIS
    SystemPilot environment setup script.
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   SystemPilot Development Setup         " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Verify Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Node.js is required but not found in PATH." -ForegroundColor Red
    exit 1
}

# Verify Rust
if (Get-Command rustc -ErrorAction SilentlyContinue) {
    $rustVersion = rustc --version
    Write-Host "[OK] Rust found: $rustVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Rust is required but not found in PATH." -ForegroundColor Red
    exit 1
}

# Install frontend dependencies
Write-Host "`nInstalling frontend dependencies..." -ForegroundColor Yellow
npm install

Write-Host "`nEnvironment setup complete! Run 'npm run tauri dev' to start." -ForegroundColor Green
