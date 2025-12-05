@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo.
echo ========================================
echo   DaiDai API Aggregator
echo   一键安装
echo ========================================
echo.

REM 安装依赖
echo [1/3] 安装依赖...
call npm install >nul 2>&1
if %errorlevel% neq 0 (
    echo [×] 依赖安装失败，请确保已安装 Node.js
    pause
    exit /b 1
)
echo [√] 依赖安装完成

REM 启动代理
echo.
echo [2/3] 启动代理服务...
start /B node proxy-daemon.js
timeout /t 2 /nobreak >nul

REM 检查是否启动成功
echo [√] 代理服务已启动

REM 设置开机自启动（可选）
echo.
echo [3/3] 是否设置开机自启动？
choice /C YN /M "按 Y 设置，按 N 跳过"
if %errorlevel%==1 (
    node install-autostart.js
    if %errorlevel%==0 (
        echo [√] 开机自启动已设置
    )
) else (
    echo [!] 跳过开机自启动设置
    echo     如需设置，请稍后运行 install-autostart.bat
)

echo.
echo ========================================
echo   ✅ 安装完成！
echo ========================================
echo.
echo 代理服务已在后台运行
echo 代理地址: http://localhost:5100/v1
echo.
echo 下一步：
echo   1. 打开 SillyTavern
echo   2. 进入扩展面板
echo   3. 登录你的 DaiDai 账号
echo   4. Keys 会自动同步到代理
echo   5. 在 API 设置中使用上面的代理地址
echo.
echo 提示：
echo   - 关闭此窗口不影响代理运行
echo   - 如需停止代理，运行 stop-daemon.bat
echo   - 查看日志：proxy.log
echo.
pause
