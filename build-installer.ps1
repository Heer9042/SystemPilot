<#
.SYNOPSIS
    Builds the production Windows Installer (.exe / .msi) for SystemPilot
.DESCRIPTION
    1. Prepares environment paths (Cargo, Node, LLVM)
    2. Builds the React production bundle (Vite)
    3. Packages the native Tauri NSIS and MSI installers
    4. Calculates SHA-256 checksums
    5. Opens the output folder in File Explorer
#>

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SystemPilot — Windows Installer Builder    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Ensure PATH has Cargo and LLVM
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$env:PATH = "$cargoBin;C:\Program Files\LLVM\bin;C:\Program Files\GitHub CLI;" + $env:PATH

# 2. Kill any conflicting dev server instances on port 1420
Write-Host "`n[1/4] Checking environment & closing background dev servers..." -ForegroundColor Yellow
Get-Process -Name "node", "vite" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Build React frontend bundle
Write-Host "`n[2/4] Building React frontend bundle with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# 4. Build Tauri Desktop Installer
Write-Host "`n[3/4] Compiling Rust backend & building Windows Installer (.exe / .msi)..." -ForegroundColor Yellow
npm run tauri build

# 5. Locate Output Artifacts
$nsisFolder = "src-tauri\target\release\bundle\nsis"
$msiFolder = "src-tauri\target\release\bundle\msi"

Write-Host "`n[4/4] Verifying generated installers & computing checksums..." -ForegroundColor Yellow

$installers = Get-ChildItem -Path "$nsisFolder\*.exe", "$msiFolder\*.msi" -ErrorAction SilentlyContinue

if ($installers) {
    Write-Host "`n✅ Build Successful! Generated Windows Installers:" -ForegroundColor Green
    foreach ($file in $installers) {
        $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        Set-Content -Path "$($file.FullName).sha256" -Value "$hash *$($file.Name)"
        Write-Host "  - File:     $($file.FullName)" -ForegroundColor White
        Write-Host "    Size:     $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "    SHA-256:  $hash" -ForegroundColor DarkCyan
    }

    # Open the installer folder in Windows File Explorer
    $primaryExe = Get-ChildItem -Path "$nsisFolder\*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($primaryExe) {
        explorer.exe /select, $primaryExe.FullName
    }
} else {
    Write-Host "`nInstaller bundle build completed. Check $nsisFolder" -ForegroundColor Gray
}

Write-Host "`n=============================================" -ForegroundColor Cyan
Write-Host "  Build process finished!                    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
