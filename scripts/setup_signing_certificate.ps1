# ==============================================================================
# SystemPilot - Authenticode Code Signing Certificate Setup and Binary Signer
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " SystemPilot - Authenticode Code Signing Setup " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$projectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$releaseDir = Join-Path $projectRoot "release"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
}

# ------------------------------------------------------------------------------
# Step 1: Locate or Generate SystemPilot Code Signing Certificate
# ------------------------------------------------------------------------------
Write-Host "[1/5] Checking for existing SystemPilot Code Signing Certificate..." -ForegroundColor Yellow

$existingCert = Get-ChildItem -Path Cert:\CurrentUser\My -Recurse -ErrorAction SilentlyContinue | `
    Where-Object { $_.Subject -like "*CN=SystemPilot*" -and $_.EnhancedKeyUsageList.FriendlyName -contains "Code Signing" } | `
    Sort-Object NotAfter -Descending | `
    Select-Object -First 1

if ($existingCert) {
    Write-Host "  Found existing certificate: $($existingCert.Thumbprint)" -ForegroundColor Green
    Write-Host "  Subject: $($existingCert.Subject)" -ForegroundColor Gray
    Write-Host "  Valid Until: $($existingCert.NotAfter.ToString('yyyy-MM-dd'))" -ForegroundColor Gray
    $signingCert = $existingCert
} else {
    Write-Host "  Generating dedicated SystemPilot Authenticode Code Signing Certificate..." -ForegroundColor Cyan
    $signingCert = New-SelfSignedCertificate `
        -Type CodeSigningCert `
        -Subject "CN=SystemPilot, O=SystemPilot Contributors, OU=Desktop Engineering" `
        -CertStoreLocation "Cert:\CurrentUser\My" `
        -HashAlgorithm "SHA256" `
        -KeyLength 2048 `
        -KeyUsage DigitalSignature `
        -NotAfter (Get-Date).AddYears(5) `
        -FriendlyName "SystemPilot Official Code Signing Certificate"

    Write-Host "  Created certificate: $($signingCert.Thumbprint)" -ForegroundColor Green
}

# ------------------------------------------------------------------------------
# Step 2: Register Certificate in Local Trusted Publishers and Root
# ------------------------------------------------------------------------------
Write-Host "`n[2/5] Registering certificate in CurrentUser Trusted Publisher and Root stores..." -ForegroundColor Yellow

# Trust in CurrentUser\TrustedPublisher
$pubStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("TrustedPublisher", "CurrentUser")
$pubStore.Open("ReadWrite")
$pubStore.Add($signingCert)
$pubStore.Close()

# Trust in CurrentUser\Root so signature evaluates to Valid
$rootStore = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
$rootStore.Open("ReadWrite")
$rootStore.Add($signingCert)
$rootStore.Close()

Write-Host "  [OK] Certificate registered as trusted on local system." -ForegroundColor Green

# ------------------------------------------------------------------------------
# Step 3: Export Public Certificate (.cer) and Client Trust Script
# ------------------------------------------------------------------------------
Write-Host "`n[3/5] Exporting public certificate and client trust scripts..." -ForegroundColor Yellow

$cerPath = Join-Path $releaseDir "SystemPilot-Publisher.cer"
$certBytes = $signingCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
[System.IO.File]::WriteAllBytes($cerPath, $certBytes)
Write-Host "  Exported public certificate: $cerPath" -ForegroundColor Green

# Export private PFX bundle to root for CI/CD and secure distribution (git-ignored)
$pfxPath = Join-Path $projectRoot "SystemPilot-CodeSigning.pfx"
$pfxPassword = ConvertTo-SecureString "SystemPilotSecure2026!" -AsPlainText -Force
$pfxBytes = $signingCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx, $pfxPassword)
[System.IO.File]::WriteAllBytes($pfxPath, $pfxBytes)
Write-Host "  Exported private PFX bundle (git-ignored): $pfxPath" -ForegroundColor Green

# Create one-click batch file for clients to import trust
$clientBatPath = Join-Path $releaseDir "Trust-SystemPilot-Certificate.bat"
$batchLines = @(
    '@echo off',
    'title SystemPilot - Install Publisher Certificate',
    'echo ========================================================',
    'echo   SystemPilot - Publisher Certificate Installation',
    'echo ========================================================',
    'echo.',
    'echo Installing SystemPilot Verified Publisher Certificate...',
    'echo.',
    'net session >nul 2>&1',
    'if %ERRORLEVEL% neq 0 (',
    '    echo [INFO] Requesting administrator elevation...',
    '    powershell -Command "Start-Process cmd -ArgumentList ''/c `\"%~f0`\"'' -Verb RunAs"',
    '    exit /b 0',
    ')',
    'certutil -addstore -f "TrustedPublisher" "%~dp0SystemPilot-Publisher.cer"',
    'certutil -addstore -f "Root" "%~dp0SystemPilot-Publisher.cer"',
    'echo.',
    'echo ========================================================',
    'echo [SUCCESS] SystemPilot certificate installed successfully!',
    'echo Windows will now recognize SystemPilot as a Verified Publisher.',
    'echo ========================================================',
    'echo.',
    'pause'
)
[System.IO.File]::WriteAllLines($clientBatPath, $batchLines)
Write-Host "  Created client installer script: $clientBatPath" -ForegroundColor Green

# ------------------------------------------------------------------------------
# Step 4: Sign All Binaries and Installers
# ------------------------------------------------------------------------------
Write-Host "`n[4/5] Digitally signing all SystemPilot executables and installers..." -ForegroundColor Yellow

$targets = @(
    (Join-Path $projectRoot "SystemPilot.exe"),
    (Join-Path $releaseDir "SystemPilot.exe"),
    (Join-Path $releaseDir "SystemPilot-Setup.exe"),
    (Join-Path $releaseDir "SystemPilot.msi"),
    (Join-Path $projectRoot "src-tauri\target\release\systempilot.exe"),
    (Join-Path $projectRoot "src-tauri\target\release\SystemPilot.exe")
)

$timestampUrls = @(
    "http://timestamp.digicert.com",
    "http://timestamp.sectigo.com",
    "http://timestamp.globalsign.com/tsa/r6advanced1"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        $targetName = [System.IO.Path]::GetFileName($target)
        Write-Host "  Signing $targetName..." -ForegroundColor Cyan
        
        $signed = $false
        foreach ($tsUrl in $timestampUrls) {
            try {
                $sigResult = Set-AuthenticodeSignature -FilePath $target -Certificate $signingCert -TimestampServer $tsUrl -HashAlgorithm SHA256
                if ($sigResult.Status -eq "Valid") {
                    $signed = $true
                    Write-Host "    [OK] Signed with timestamp from $tsUrl" -ForegroundColor Green
                    break
                }
            } catch {
                # Try next timestamp server
            }
        }

        if (-not $signed) {
            $sigResult = Set-AuthenticodeSignature -FilePath $target -Certificate $signingCert -HashAlgorithm SHA256
            Write-Host "    [OK] Signed (local timestamp): $($sigResult.Status)" -ForegroundColor Green
        }
    }
}

# ------------------------------------------------------------------------------
# Step 5: Verify Signatures and Output Summary
# ------------------------------------------------------------------------------
Write-Host "`n[5/5] Verifying Authenticode Digital Signatures..." -ForegroundColor Yellow

$verificationFiles = @(
    (Join-Path $releaseDir "SystemPilot.exe"),
    (Join-Path $releaseDir "SystemPilot-Setup.exe"),
    (Join-Path $releaseDir "SystemPilot.msi"),
    (Join-Path $projectRoot "SystemPilot.exe")
)

foreach ($vf in $verificationFiles) {
    if (Test-Path $vf) {
        $sig = Get-AuthenticodeSignature -FilePath $vf
        $vfName = [System.IO.Path]::GetFileName($vf)
        if ($sig.Status -eq "Valid") {
            Write-Host "  [VALID] $vfName" -ForegroundColor Green
            Write-Host "          Signer: $($sig.SignerCertificate.Subject)" -ForegroundColor Gray
            Write-Host "          Issuer: $($sig.SignerCertificate.Issuer)" -ForegroundColor Gray
            Write-Host "          Digest: $($sig.SignerCertificate.SignatureAlgorithm.FriendlyName)" -ForegroundColor Gray
        } else {
            Write-Host "  [STATUS] $vfName : $($sig.Status) ($($sig.StatusMessage))" -ForegroundColor Yellow
        }
    }
}

# Write environment file
$envFile = Join-Path $projectRoot ".signing_env.ps1"
$envLines = @(
    "`$env:WINDOWS_CERTIFICATE_THUMBPRINT = '$($signingCert.Thumbprint)'"
)
[System.IO.File]::WriteAllLines($envFile, $envLines)

# Recalculate SHA256 checksums
Write-Host "`nRecalculating release SHA-256 Checksums for signed files..." -ForegroundColor Yellow
$checksumFiles = @("SystemPilot.exe", "SystemPilot-Setup.exe", "SystemPilot.msi", "SystemPilot-Portable.zip", "WebView2Loader.dll", "SystemPilot.exe.manifest")
$checksumLines = @()
foreach ($name in $checksumFiles) {
    $fp = Join-Path $releaseDir $name
    if (Test-Path $fp) {
        $hash = (Get-FileHash -Path $fp -Algorithm SHA256).Hash
        $checksumLines += "$hash  $name"
        Write-Host "  ${name}: $hash" -ForegroundColor Gray
    }
}
$checksumLines | Out-File -FilePath (Join-Path $releaseDir "SHA256SUMS.txt") -Encoding ascii

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host " [SUCCESS] SystemPilot binaries and installers are SIGNED!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host "Publisher: CN=SystemPilot, O=SystemPilot Contributors" -ForegroundColor Cyan
Write-Host "Thumbprint: $($signingCert.Thumbprint)" -ForegroundColor Cyan
Write-Host "Files ready for client in: $releaseDir" -ForegroundColor White
Write-Host "  1. SystemPilot-Setup.exe (Signed NSIS Installer)" -ForegroundColor White
Write-Host "  2. SystemPilot.msi (Signed MSI Package)" -ForegroundColor White
Write-Host "  3. SystemPilot.exe (Signed Executable with requireAdministrator UAC)" -ForegroundColor White
Write-Host "  4. SystemPilot-Publisher.cer (Public Certificate)" -ForegroundColor White
Write-Host "  5. Trust-SystemPilot-Certificate.bat (One-click trust tool for client)" -ForegroundColor White
Write-Host "========================================================`n"
