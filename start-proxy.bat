@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   DaiDai API Aggregator Proxy Server
echo ========================================
echo.
echo Starting proxy server...
echo.

node standalone-proxy.js

pause
