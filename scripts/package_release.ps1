# SystemPilot Release Packaging Script
Add-Type -AssemblyName System.IO.Compression.FileSystem

# Terminate any running SystemPilot processes to avoid file locks
Get-Process SystemPilot -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 300

# Ensure release directory exists
if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Force -Path "release" | Out-Null
}

# Clean any existing temp files
Get-ChildItem -Path "release/*.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Copying production binaries..."
$stagingDir = "release/.staging"
if (Test-Path $stagingDir) {
    Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null

# Copy raw binaries to staging first
Copy-Item "src-tauri/target/release/systempilot.exe" "$stagingDir/SystemPilot.exe" -Force
if (Test-Path "src-tauri/target/release/WebView2Loader.dll") {
    Copy-Item "src-tauri/target/release/WebView2Loader.dll" "$stagingDir/WebView2Loader.dll" -Force
}

# Create Portable ZIP from staging directory using .NET ZipFile
$zipDest = "$PSScriptRoot/../release/SystemPilot-Portable.zip"
$tmpZip = "$PSScriptRoot/../release/SystemPilot-Portable.tmp.zip"
$resolvedStaging = (Resolve-Path $stagingDir).Path
$resolvedZipDest = [System.IO.Path]::GetFullPath($zipDest)
$resolvedTmpZip = [System.IO.Path]::GetFullPath($tmpZip)

if (Test-Path $resolvedTmpZip) {
    Remove-Item -Path $resolvedTmpZip -Force -ErrorAction SilentlyContinue
}

try {
    [System.IO.Compression.ZipFile]::CreateFromDirectory($resolvedStaging, $resolvedTmpZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
    if (Test-Path $resolvedZipDest) {
        Remove-Item -Path $resolvedZipDest -Force -ErrorAction SilentlyContinue
    }
    Move-Item -Path $resolvedTmpZip -Destination $resolvedZipDest -Force
} catch {
    Write-Warning "Could not update Portable ZIP: $_"
}

# Copy installers to release
Copy-Item "src-tauri/target/release/systempilot.exe" "release/SystemPilot.exe" -Force
Copy-Item "src-tauri/target/release/bundle/nsis/*.exe" "release/SystemPilot-Setup.exe" -Force
Copy-Item "src-tauri/target/release/bundle/msi/*.msi" "release/SystemPilot.msi" -Force
if (Test-Path "src-tauri/target/release/WebView2Loader.dll") {
    Copy-Item "src-tauri/target/release/WebView2Loader.dll" "release/WebView2Loader.dll" -Force
}

# Cleanup staging
Remove-Item -Path $stagingDir -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "release/*.tmp*" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Calculating SHA-256 Checksums..."
$validFiles = @("SystemPilot.exe", "SystemPilot-Setup.exe", "SystemPilot.msi", "SystemPilot-Portable.zip", "WebView2Loader.dll")
$checksumLines = @()
$setupHash = ""
foreach ($name in $validFiles) {
    $filePath = "release/$name"
    if (Test-Path $filePath) {
        $hash = (Get-FileHash -Path $filePath -Algorithm SHA256).Hash
        $checksumLines += "$hash  $name"
        Write-Host "  $name : $hash"
        if ($name -eq "SystemPilot-Setup.exe") {
            $setupHash = $hash
        }
    }
}

$checksumLines | Out-File -FilePath "release/SHA256SUMS.txt" -Encoding ascii

# Read app version from package.json
$pkgJson = Get-Content -Raw "package.json" | ConvertFrom-Json
$appVer = $pkgJson.version

# Generate latest.json metadata
$latestMetadata = [PSCustomObject]@{
    version = $appVer
    downloadUrl = "https://github.com/Heer9042/SystemPilot/releases/download/v$($appVer)/SystemPilot-Setup.exe"
    sha256 = $setupHash
    releaseNotes = "Official release v$($appVer) - Performance optimizations, security updates, and bug fixes."
    mandatory = $false
    publishedAt = (Get-Date).ToString("yyyy-MM-dd")
}

$latestMetadata | ConvertTo-Json -Depth 4 | Out-File -FilePath "release/latest.json" -Encoding ascii
Write-Host "Release packaging complete. Checksums saved to release/SHA256SUMS.txt and release/latest.json"

# Run automated validation
& "$PSScriptRoot/verify_binary.ps1"
