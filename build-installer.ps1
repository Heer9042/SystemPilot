# SystemPilot - Windows Installer Builder Script
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  SystemPilot - Windows Installer Builder    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# 1. Ensure PATH has Cargo, MinGW GCC, LLVM, and Git
$cargoBin = "$env:USERPROFILE\.cargo\bin"
$mingwWinLibs = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin"
$mingwLlvm = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\MartinStorsjo.LLVM-MinGW.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\llvm-mingw-20260616-ucrt-x86_64\bin"

if (Test-Path $mingwWinLibs) {
    $env:PATH = "$cargoBin;$mingwWinLibs;C:\Program Files\LLVM\bin;C:\Program Files\GitHub CLI;" + $env:PATH
} elseif (Test-Path $mingwLlvm) {
    $env:PATH = "$cargoBin;$mingwLlvm;C:\Program Files\LLVM\bin;C:\Program Files\GitHub CLI;" + $env:PATH
} else {
    $env:PATH = "$cargoBin;C:\Program Files\LLVM\bin;C:\Program Files\GitHub CLI;" + $env:PATH
}

# Avoid OneDrive AppLocker / Smart App Control issues by using local target directory
$targetDir = "$env:LOCALAPPDATA\SystemPilot-Build\target"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}
$env:CARGO_TARGET_DIR = $targetDir

# 2. Close any conflicting dev server instances on port 1420
Write-Host ""
Write-Host "[1/4] Checking environment & closing background dev servers..." -ForegroundColor Yellow
Get-Process -Name "node", "vite" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# 3. Build React frontend bundle
Write-Host ""
Write-Host "[2/4] Building React frontend bundle with Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor Red
    exit 1
}

# 4. Build Tauri Desktop Installer
Write-Host ""
Write-Host "[3/4] Compiling Rust backend & building Windows Installer (.exe / .msi)..." -ForegroundColor Yellow
npm run tauri build

# 5. Locate Output Artifacts
$nsisFolder = "$targetDir\release\bundle\nsis"
$msiFolder = "$targetDir\release\bundle\msi"
$localNsisFolder = "src-tauri\target\release\bundle\nsis"
$localMsiFolder = "src-tauri\target\release\bundle\msi"

Write-Host ""
Write-Host "[4/4] Verifying generated installers & computing checksums..." -ForegroundColor Yellow

$installers = Get-ChildItem -Path "$nsisFolder\*.exe", "$msiFolder\*.msi", "$localNsisFolder\*.exe", "$localMsiFolder\*.msi" -ErrorAction SilentlyContinue

if ($installers) {
    Write-Host ""
    Write-Host "Build Successful! Generated Windows Installers:" -ForegroundColor Green
    foreach ($file in $installers) {
        $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        Set-Content -Path "$($file.FullName).sha256" -Value "$hash *$($file.Name)"
        Write-Host "  - File:     $($file.FullName)" -ForegroundColor White
        Write-Host "    Size:     $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "    SHA-256:  $hash" -ForegroundColor DarkCyan
    }

    # Open the installer folder in Windows File Explorer
    $primaryExe = $installers | Where-Object { $_.Extension -eq ".exe" } | Select-Object -First 1
    if ($primaryExe) {
        explorer.exe /select, $primaryExe.FullName
    }
} else {
    Write-Host ""
    Write-Host "Installer build completed." -ForegroundColor Gray
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Build process finished!                    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

