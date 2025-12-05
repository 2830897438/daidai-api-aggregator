#!/bin/bash

cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  DaiDai API Aggregator"
echo "  一键安装"
echo "========================================"
echo ""

# 安装依赖
echo "[1/3] 安装依赖..."
npm install > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "[×] 依赖安装失败，请确保已安装 Node.js"
    exit 1
fi
echo "[√] 依赖安装完成"

# 启动代理
echo ""
echo "[2/3] 启动代理服务..."
nohup node proxy-daemon.js > /dev/null 2>&1 &
sleep 2
echo "[√] 代理服务已启动"

# 设置开机自启动（可选）
echo ""
echo "[3/3] 是否设置开机自启动？(y/n)"
read -p "请选择: " choice

if [ "$choice" == "y" ] || [ "$choice" == "Y" ]; then
    node install-autostart.js
    if [ $? -eq 0 ]; then
        echo "[√] 开机自启动已设置"
    fi
else
    echo "[!] 跳过开机自启动设置"
    echo "    如需设置，请稍后运行: node install-autostart.js"
fi

echo ""
echo "========================================"
echo "  ✅ 安装完成！"
echo "========================================"
echo ""
echo "代理服务已在后台运行"
echo "代理地址: http://localhost:5100/v1"
echo ""
echo "下一步："
echo "  1. 打开 SillyTavern"
echo "  2. 进入扩展面板"
echo "  3. 登录你的 DaiDai 账号"
echo "  4. Keys 会自动同步到代理"
echo "  5. 在 API 设置中使用上面的代理地址"
echo ""
echo "提示："
echo "  - 代理会持续在后台运行"
echo "  - 如需停止代理: pkill -f proxy-daemon.js"
echo "  - 查看日志：proxy.log"
echo ""
