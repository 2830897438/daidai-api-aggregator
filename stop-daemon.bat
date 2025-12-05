@echo off
chcp 65001 >nul

echo.
echo 正在停止 DaiDai 代理服务...
echo.

REM 查找并终止 node proxy-daemon.js 进程
for /f "tokens=2" %%i in ('tasklist ^| findstr /i "node.exe"') do (
    wmic process where "ProcessId=%%i and CommandLine like '%%proxy-daemon.js%%'" delete >nul 2>&1
)

echo ✅ 代理服务已停止
echo.
pause
