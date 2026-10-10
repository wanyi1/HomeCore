@echo off
title HomeCore V1.0 - Windows 启动器
echo ==========================================================
echo        HomeCore V1.0 - 家庭数字操作系统 (Windows)
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-windows.ps1"

pause
