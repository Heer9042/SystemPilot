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

$mingwPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
if (Test-Path $mingwPath) {
    $env:PATH = "$mingwPath;$env:PATH"
}
$env:RUST_MIN_STACK = "16777216"

Write-Host "`n[1/2] Running Rust backend tests..." -ForegroundColor Yellow
Set-Location "$projectRoot\src-tauri"
cargo test --lib --release
$rustExit = $LASTEXITCODE

Set-Location $projectRoot

if ($rustExit -ne 0) {
    Write-Host "[ERROR] Backend tests failed." -ForegroundColor Red
    exit $rustExit
}

Write-Host "[OK] Backend tests passed!" -ForegroundColor Green

Write-Host "`n[2/2] Running Frontend tests..." -ForegroundColor Yellow
npm test
$frontExit = $LASTEXITCODE

if ($frontExit -ne 0) {
    Write-Host "[ERROR] Frontend tests failed." -ForegroundColor Red
    exit $frontExit
}

Write-Host "[OK] Frontend tests passed!" -ForegroundColor Green
exit 0
