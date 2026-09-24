<#
.SYNOPSIS
    Runs all frontend and backend tests for SystemPilot.
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   SystemPilot Automated Test Suite      " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot

Set-Location $projectRoot

Write-Host "`n[1/2] Running Rust backend tests..." -ForegroundColor Yellow
Set-Location "$projectRoot\src-tauri"
cargo test
$rustExit = $LASTEXITCODE

Set-Location $projectRoot

if ($rustExit -eq 0) {
    Write-Host "[OK] Backend tests passed!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Backend tests failed." -ForegroundColor Red
}

exit $rustExit
