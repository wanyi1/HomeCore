@echo off
chcp 65001 >nul
title HomeCore V1.0 - Windows 启动器
echo ==========================================================
echo        HomeCore V1.0 - 家庭数字操作系统 (Windows)
echo ==========================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-windows.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [!] 启动过程中断或遇到错误，退出码: %ERRORLEVEL%
    echo 按任意键退出...
    pause >nul
)
