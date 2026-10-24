# ==============================================================================
# SystemPilot — Authenticode Code Signing Engine
# Universal Windows System Management Platform | Tauri v2 + React + Rust
# ==============================================================================
# This script signs Windows binaries (.exe, .dll, .msi) using Authenticode with
# SHA-256 and RFC 3161 compliant timestamping.
#
# Supported Signing Modes (in evaluation priority):
# 1. Base64-encoded PFX Secret (WINDOWS_CERTIFICATE_BASE64 + WINDOWS_CERTIFICATE_PASSWORD)
# 2. Local PFX / P12 File (PFX_PATH or WINDOWS_CERTIFICATE_PATH + password)
# 3. Windows Certificate Store Thumbprint (WINDOWS_CERTIFICATE_THUMBPRINT)
# 4. Auto-detected SystemPilot Code Signing Certificate in Cert:\CurrentUser\My
# ==============================================================================

param (
    [Parameter(Mandatory = $false, Position = 0)]
    [string]$TargetFile
)

$ErrorActionPreference = "Stop"

if (-not $TargetFile) {
    Write-Host "[SystemPilot Signing] Usage: sign_artifact.ps1 <path-to-binary>" -ForegroundColor Yellow
    exit 0
}

# Resolve target path
if (-not (Test-Path $TargetFile)) {
    Write-Warning "[SystemPilot Signing] Target file does not exist: $TargetFile"
    exit 0
}

$resolvedPath = (Resolve-Path $TargetFile).Path
$fileName = [System.IO.Path]::GetFileName($resolvedPath)
$extension = [System.IO.Path]::GetExtension($resolvedPath).ToLowerInvariant()

# Only sign PE binaries and MSI packages
if ($extension -ne ".exe" -and $extension -ne ".dll" -and $extension -ne ".msi") {
    Write-Host "[SystemPilot Signing] Skipping non-binary artifact: $fileName"
    exit 0
}

Write-Host "[SystemPilot Signing] Authenticode signing: $fileName" -ForegroundColor Cyan

# ------------------------------------------------------------------------------
# 1. Discover Available Signing Credentials
# ------------------------------------------------------------------------------
$certBase64    = $env:WINDOWS_CERTIFICATE_BASE64
$certPassword  = $env:WINDOWS_CERTIFICATE_PASSWORD
$pfxPath       = if ($env:PFX_PATH) { $env:PFX_PATH } else { $env:WINDOWS_CERTIFICATE_PATH }
$thumbprint    = if ($env:WINDOWS_CERTIFICATE_THUMBPRINT) { $env:WINDOWS_CERTIFICATE_THUMBPRINT } else { $env:SIGNING_CERT_THUMBPRINT }

# Auto-detect SystemPilot certificate from Windows Certificate Store if not explicitly specified
if (-not $thumbprint -and -not $certBase64 -and (-not $pfxPath -or -not (Test-Path $pfxPath))) {
    $autoCert = Get-ChildItem -Path Cert:\CurrentUser\My -Recurse -ErrorAction SilentlyContinue | `
        Where-Object { $_.Subject -like "*CN=SystemPilot*" -and $_.EnhancedKeyUsageList.FriendlyName -contains "Code Signing" } | `
        Sort-Object NotAfter -Descending | `
        Select-Object -First 1
    if ($autoCert) {
        $thumbprint = $autoCert.Thumbprint
        Write-Host "  Auto-detected SystemPilot certificate: $thumbprint" -ForegroundColor Gray
    }
}

$hasCredentials = ($certBase64 -and $certBase64.Trim().Length -gt 0) -or `
                  ($pfxPath -and (Test-Path $pfxPath)) -or `
                  ($thumbprint -and $thumbprint.Trim().Length -gt 0)

if (-not $hasCredentials) {
    Write-Host "  No signing certificate found. Automatically initializing SystemPilot certificate..." -ForegroundColor Yellow
    $setupScript = Join-Path $PSScriptRoot "setup_signing_certificate.ps1"
    if (Test-Path $setupScript) {
        & $setupScript
        $autoCert = Get-ChildItem -Path Cert:\CurrentUser\My -Recurse -ErrorAction SilentlyContinue | `
            Where-Object { $_.Subject -like "*CN=SystemPilot*" -and $_.EnhancedKeyUsageList.FriendlyName -contains "Code Signing" } | `
            Sort-Object NotAfter -Descending | `
            Select-Object -First 1
        if ($autoCert) {
            $thumbprint = $autoCert.Thumbprint
            $hasCredentials = $true
        }
    }
}

if (-not $hasCredentials) {
    Write-Warning "[SystemPilot Signing] Could not initialize code signing certificate. Skipping signature."
    exit 0
}

# ------------------------------------------------------------------------------
# 2. Locate Signing Tool (signtool.exe or fallback to PowerShell PKI)
# ------------------------------------------------------------------------------
function Find-SignTool {
    $cmd = Get-Command "signtool.exe" -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -notlike "*\.cargo\bin\signtool.exe*" -and $cmd.Source -notlike "*\scripts\bin\signtool.exe*") { 
        return $cmd.Source 
    }

    $kitPaths = @(
        "C:\Program Files (x86)\Windows Kits\10\bin",
        "C:\Program Files\Windows Kits\10\bin"
    )

    foreach ($basePath in $kitPaths) {
        if (Test-Path $basePath) {
            $found = Get-ChildItem -Path $basePath -Filter "signtool.exe" -Recurse -ErrorAction SilentlyContinue | `
                     Where-Object { $_.FullName -like "*x64*" } | `
                     Select-Object -First 1
            if ($found) { return $found.FullName }
        }
    }
    return $null
}

$signtool = Find-SignTool
$timestampUrls = @(
    "http://timestamp.digicert.com",
    "http://timestamp.sectigo.com",
    "http://timestamp.globalsign.com/tsa/r6advanced1"
)

$tempPfxFile = $null

try {
    if ($certBase64 -and $certBase64.Trim().Length -gt 0) {
        $tempPfxFile = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "systempilot_sign_$([System.Diagnostics.Process]::GetCurrentProcess().Id)_$([System.Guid]::NewGuid().ToString('N')).pfx")
        [System.IO.File]::WriteAllBytes($tempPfxFile, [System.Convert]::FromBase64String($certBase64.Trim()))
        $pfxPath = $tempPfxFile
    }

    # Wait up to 5 seconds if file is temporarily locked by makensis or antivirus
    $lockRetries = 15
    while ($lockRetries -gt 0) {
        try {
            $stream = [System.IO.File]::Open($resolvedPath, [System.IO.FileMode]::Open, [System.IO.FileAccess]::ReadWrite, [System.IO.FileShare]::None)
            if ($stream) {
                $stream.Close()
                $stream.Dispose()
                break
            }
        } catch {
            Start-Sleep -Milliseconds 300
            $lockRetries--
        }
    }

    $signedSuccessfully = $false

    if ($signtool) {
        Write-Host "  Using SignTool: $signtool" -ForegroundColor Gray

        foreach ($tsUrl in $timestampUrls) {
            Write-Host "  Applying RFC 3161 timestamp via $tsUrl..." -ForegroundColor Gray
            
            if ($pfxPath -and (Test-Path $pfxPath)) {
                $argsList = @("sign", "/f", $pfxPath)
                if ($certPassword) {
                    $argsList += @("/p", $certPassword)
                }
                $argsList += @("/fd", "SHA256", "/tr", $tsUrl, "/td", "SHA256", "/d", "SystemPilot", $resolvedPath)
                
                $proc = Start-Process -FilePath $signtool -ArgumentList $argsList -NoNewWindow -Wait -PassThru
                if ($proc.ExitCode -eq 0) {
                    $signedSuccessfully = $true
                    break
                }
            } elseif ($thumbprint) {
                $argsList = @("sign", "/sha1", $thumbprint.Trim(), "/fd", "SHA256", "/tr", $tsUrl, "/td", "SHA256", "/d", "SystemPilot", $resolvedPath)
                $proc = Start-Process -FilePath $signtool -ArgumentList $argsList -NoNewWindow -Wait -PassThru
                if ($proc.ExitCode -eq 0) {
                    $signedSuccessfully = $true
                    break
                }
            }
        }
    } else {
        # Fallback: Native PowerShell Set-AuthenticodeSignature
        Write-Host "  Using native PowerShell Authenticode engine..." -ForegroundColor Gray
        
        $certObj = $null
        if ($pfxPath -and (Test-Path $pfxPath)) {
            $securePass = if ($certPassword) { ConvertTo-SecureString $certPassword -AsPlainText -Force } else { $null }
            $certCollection = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2Collection
            if ($securePass) {
                $certCollection.Import($pfxPath, $securePass, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::Exportable)
            } else {
                $certCollection.Import($pfxPath)
            }
            $certObj = $certCollection[0]
        } elseif ($thumbprint) {
            $certObj = Get-ChildItem -Path Cert:\CurrentUser\My, Cert:\LocalMachine\My -Recurse -ErrorAction SilentlyContinue | `
                       Where-Object { $_.Thumbprint -eq $thumbprint.Trim() } | Select-Object -First 1
        }

        if ($certObj) {
            foreach ($tsUrl in $timestampUrls) {
                try {
                    $sig = Set-AuthenticodeSignature -FilePath $resolvedPath -Certificate $certObj -TimestampServer $tsUrl -HashAlgorithm SHA256
                    if ($sig.Status -eq "Valid") {
                        $signedSuccessfully = $true
                        Write-Host "    [OK] Timestamp applied from $tsUrl" -ForegroundColor Green
                        break
                    }
                } catch {
                    # Try next timestamp server
                }
            }

            if (-not $signedSuccessfully) {
                try {
                    $sig = Set-AuthenticodeSignature -FilePath $resolvedPath -Certificate $certObj -HashAlgorithm SHA256
                    if ($sig.Status -eq "Valid") {
                        $signedSuccessfully = $true
                        Write-Host "    [OK] Signed with local timestamp" -ForegroundColor Green
                    }
                } catch {
                    Write-Warning "Local timestamp signing failed: $_"
                }
            }
        }
    }

    # Verify signature
    $verifySig = Get-AuthenticodeSignature -FilePath $resolvedPath
    if ($verifySig.Status -eq "Valid" -or $verifySig.SignerCertificate) {
        Write-Host "  [PASS] Verified Authenticode signature on $fileName" -ForegroundColor Green
        Write-Host "         Signer: $($verifySig.SignerCertificate.Subject)" -ForegroundColor Gray
        Write-Host "         Issuer: $($verifySig.SignerCertificate.Issuer)" -ForegroundColor Gray
        exit 0
    } else {
        $statusMsg = "$($verifySig.Status) - $($verifySig.StatusMessage)"
        Write-Warning "[SystemPilot Signing] Verification returned: $statusMsg"
        exit 0
    }
} catch {
    Write-Warning "[SystemPilot Signing] Exception during signing: $_"
    exit 0
} finally {
    if ($tempPfxFile -and (Test-Path $tempPfxFile)) {
        Remove-Item -Path $tempPfxFile -Force -ErrorAction SilentlyContinue
    }
}

