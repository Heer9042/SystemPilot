@echo off
title SystemPilot - Install Publisher Certificate
echo ========================================================
echo   SystemPilot - Publisher Certificate Installation
echo ========================================================
echo.
echo Installing SystemPilot Verified Publisher Certificate...
echo.
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Requesting administrator elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c `\"%~f0`\"' -Verb RunAs"
    exit /b 0
)
certutil -addstore -f "TrustedPublisher" "%~dp0SystemPilot-Publisher.cer"
certutil -addstore -f "Root" "%~dp0SystemPilot-Publisher.cer"
echo.
echo ========================================================
echo [SUCCESS] SystemPilot certificate installed successfully!
echo Windows will now recognize SystemPilot as a Verified Publisher.
echo ========================================================
echo.
pause
