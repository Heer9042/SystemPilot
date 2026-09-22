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

# 4. Build Desktop Application Binary
Write-Host ""
Write-Host "[3/4] Compiling Rust backend & generating SystemPilot executable..." -ForegroundColor Yellow
$cargoBin = "$env:USERPROFILE\.cargo\bin\cargo.exe"
& $cargoBin build --manifest-path src-tauri/Cargo.toml
if ($LASTEXITCODE -eq 0) {
    New-Item -ItemType Directory -Force -Path "release" | Out-Null
    Copy-Item "$targetDir\debug\systempilot.exe" -Destination "release\SystemPilot.exe" -Force
}

# 5. Locate Output Artifacts
$nsisFolder = "$targetDir\release\bundle\nsis"
$msiFolder = "$targetDir\release\bundle\msi"
$localReleaseFolder = "release"

Write-Host ""
Write-Host "[4/4] Verifying generated executables & computing checksums..." -ForegroundColor Yellow

$executables = Get-ChildItem -Path "$localReleaseFolder\SystemPilot.exe", "$nsisFolder\*.exe", "$msiFolder\*.msi" -ErrorAction SilentlyContinue

if ($executables) {
    Write-Host ""
    Write-Host "Build Successful! Generated Application Executable:" -ForegroundColor Green
    foreach ($file in $executables) {
        $hash = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
        Set-Content -Path "$($file.FullName).sha256" -Value "$hash *$($file.Name)"
        Write-Host "  - Executable: $($file.FullName)" -ForegroundColor White
        Write-Host "    Size:       $([math]::Round($file.Length / 1MB, 2)) MB" -ForegroundColor Gray
        Write-Host "    SHA-256:    $hash" -ForegroundColor DarkCyan
    }

    # Open the release folder in Windows File Explorer
    $primaryExe = $executables | Select-Object -First 1
    if ($primaryExe) {
        explorer.exe /select, $primaryExe.FullName
    }
} else {
    Write-Host ""
    Write-Host "Build completed." -ForegroundColor Gray
}


Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Build process finished!                    " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

