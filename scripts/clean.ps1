<#
.SYNOPSIS
    Cleans build artifacts and temporary files.
#>

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "   SystemPilot Workspace Cleaner         " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot

Set-Location $projectRoot

Write-Host "Cleaning dist/..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\dist") { Remove-Item -Recurse -Force "$projectRoot\dist" }

Write-Host "Cleaning target/..." -ForegroundColor Yellow
if (Test-Path "$projectRoot\src-tauri\target") {
    Set-Location "$projectRoot\src-tauri"
    cargo clean
    Set-Location $projectRoot
}

Write-Host "`nWorkspace cleaned." -ForegroundColor Green
