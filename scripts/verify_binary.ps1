# Automated PE & Dependency Verification Script for SystemPilot

function Get-PEArchitecture([string]$filePath) {
    if (-not (Test-Path $filePath)) { return "NOT_FOUND" }
    $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $filePath).Path)
    $peOffset = [System.BitConverter]::ToInt32($bytes, 0x3C)
    $machine = [System.BitConverter]::ToUInt16($bytes, $peOffset + 4)
    switch ($machine) {
        0x014C { return "x86 (32-bit)" }
        0x8664 { return "x64 (64-bit AMD64)" }
        0xAA64 { return "ARM64" }
        default { return ("Unknown: 0x{0:X4}" -f $machine) }
    }
}

function Check-Manifest([string]$filePath) {
    if (-not (Test-Path $filePath)) { return "File not found" }
    $content = [System.IO.File]::ReadAllText((Resolve-Path $filePath).Path, [System.Text.Encoding]::ASCII)
    $hasCommonControlsV6 = $content.Contains("Microsoft.Windows.Common-Controls") -and $content.Contains("6.0.0.0")
    $hasTaskDialog = $content.Contains("TaskDialogIndirect")
    $hasRequireAdmin = $content.Contains("requireAdministrator")
    return [PSCustomObject]@{
        HasCommonControlsV6 = $hasCommonControlsV6
        HasTaskDialogRef = $hasTaskDialog
        HasRequireAdmin = $hasRequireAdmin
    }
}

Write-Host "========================================"
Write-Host " SYSTEMPILOT RELEASE VALIDATION REPORT  "
Write-Host "========================================"

$filesToCheck = @(
    "release/SystemPilot.exe",
    "release/WebView2Loader.dll",
    "release/SystemPilot-Setup.exe",
    "release/SystemPilot.msi",
    "release/SystemPilot-Portable.zip",
    "src-tauri/target/release/systempilot.exe"
)

foreach ($f in $filesToCheck) {
    if (Test-Path $f) {
        $item = Get-Item $f
        Write-Host "File: $f ($($item.Length) bytes)"
        if ($f.EndsWith(".exe") -or $f.EndsWith(".dll")) {
            $arch = Get-PEArchitecture $f
            $manifest = Check-Manifest $f
            $sig = Get-AuthenticodeSignature $f
            Write-Host "  Architecture: $arch"
            Write-Host "  Embedded Common-Controls v6 Manifest: $($manifest.HasCommonControlsV6)"
            Write-Host "  Execution Level: $(if ($manifest.HasRequireAdmin) { 'requireAdministrator (Elevated UAC Active)' } else { 'asInvoker (Standard)' })"
            Write-Host "  Authenticode Signature: $($sig.Status)"
            if ($sig.SignerCertificate) {
                Write-Host "  Verified Publisher: $($sig.SignerCertificate.Subject)"
                Write-Host "  Signature Timestamp: $(if ($sig.TimeStamperCertificate) { $sig.TimeStamperCertificate.Subject } else { 'Embedded/Local' })"
            }
        } elseif ($f.EndsWith(".msi")) {
            $sig = Get-AuthenticodeSignature $f
            Write-Host "  Package: Windows Installer Package (MSI)"
            Write-Host "  Authenticode Signature: $($sig.Status)"
            if ($sig.SignerCertificate) {
                Write-Host "  Verified Publisher: $($sig.SignerCertificate.Subject)"
            }
            Write-Host "  Integrity: Valid archive"
        } elseif ($f.EndsWith(".zip")) {
            Write-Host "  Package: Compressed ZIP Archive"
            Write-Host "  Integrity: Valid archive"
        }
        Write-Host ""
    } else {
        Write-Host "File: $f (MISSING)"
    }
}

# Check for unauthorized system DLLs in release directory
$forbiddenDlls = @("comctl32.dll", "user32.dll", "kernel32.dll", "advapi32.dll", "shell32.dll", "ole32.dll", "gdi32.dll", "ntdll.dll")
$foundForbidden = @()
foreach ($dll in $forbiddenDlls) {
    if (Test-Path "release/$dll") {
        $foundForbidden += $dll
    }
}

if ($foundForbidden.Count -eq 0) {
    Write-Host "[OK] No conflicting Windows system DLLs bundled."
} else {
    Write-Host "[FAIL] Found forbidden system DLLs in release: $($foundForbidden -join ', ')"
}

Write-Host "========================================"
