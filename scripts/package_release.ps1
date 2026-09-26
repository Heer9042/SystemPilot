# SystemPilot Release Packaging Script

if (-not (Test-Path "release")) {
    New-Item -ItemType Directory -Force -Path "release" | Out-Null
}

Write-Host "Copying production binaries..."
Copy-Item "src-tauri/target/release/systempilot.exe" "release/SystemPilot.exe" -Force
Copy-Item "src-tauri/target/release/bundle/nsis/*.exe" "release/SystemPilot-Setup.exe" -Force
Copy-Item "src-tauri/target/release/bundle/msi/*.msi" "release/SystemPilot.msi" -Force

if (Test-Path "src-tauri/target/release/WebView2Loader.dll") {
    Copy-Item "src-tauri/target/release/WebView2Loader.dll" "release/WebView2Loader.dll" -Force
    Compress-Archive -Path "release/SystemPilot.exe","release/WebView2Loader.dll" -DestinationPath "release/SystemPilot-Portable.zip" -Force
} else {
    Compress-Archive -Path "release/SystemPilot.exe" -DestinationPath "release/SystemPilot-Portable.zip" -Force
}

Write-Host "Calculating SHA-256 Checksums..."
$items = Get-ChildItem -Path "release/*" -Exclude "SHA256SUMS.txt"
$checksumLines = @()
foreach ($item in $items) {
    $hash = (Get-FileHash -Path $item.FullName -Algorithm SHA256).Hash
    $checksumLines += "$hash  $($item.Name)"
    Write-Host "  $($item.Name): $hash"
}

$checksumLines | Out-File -FilePath "release/SHA256SUMS.txt" -Encoding ascii
Write-Host "Release packaging complete. Checksums saved to release/SHA256SUMS.txt"
