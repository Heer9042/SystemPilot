@echo off
setlocal
title SystemPilot - Windows Installer Builder

echo =============================================
echo   SystemPilot - Windows Installer Builder
echo =============================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1"

pause
