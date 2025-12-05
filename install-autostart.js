#!/usr/bin/env node
/**
 * 设置开机自启动
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const platform = os.platform();
const daemonPath = path.join(__dirname, 'proxy-daemon.js');

console.log('\n正在设置开机自启动...\n');

try {
    if (platform === 'win32') {
        // Windows: 添加到启动文件夹
        const startupFolder = path.join(
            os.homedir(),
            'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup'
        );

        const vbsScript = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node ""${daemonPath.replace(/\\/g, '\\\\')}""", 0, False
`.trim();

        const vbsPath = path.join(startupFolder, 'DaiDaiProxy.vbs');
        fs.writeFileSync(vbsPath, vbsScript);

        console.log('✅ Windows 开机自启动已设置');
        console.log(`   位置: ${vbsPath}`);

    } else if (platform === 'linux') {
        // Linux: 创建 systemd 服务
        const serviceName = 'daidai-proxy';
        const serviceContent = `[Unit]
Description=DaiDai API Aggregator Proxy
After=network.target

[Service]
Type=simple
User=${os.userInfo().username}
WorkingDirectory=${__dirname}
ExecStart=/usr/bin/node ${daemonPath}
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

        const servicePath = `/etc/systemd/system/${serviceName}.service`;
        const tempPath = path.join(__dirname, `${serviceName}.service`);

        fs.writeFileSync(tempPath, serviceContent);

        console.log('需要 root 权限来安装服务...');
        execSync(`sudo cp ${tempPath} ${servicePath}`);
        execSync(`sudo systemctl daemon-reload`);
        execSync(`sudo systemctl enable ${serviceName}`);
        execSync(`sudo systemctl start ${serviceName}`);

        fs.unlinkSync(tempPath);

        console.log('✅ Linux systemd 服务已设置');
        console.log(`   服务名: ${serviceName}`);
        console.log(`   管理命令:`);
        console.log(`     启动: sudo systemctl start ${serviceName}`);
        console.log(`     停止: sudo systemctl stop ${serviceName}`);
        console.log(`     状态: sudo systemctl status ${serviceName}`);

    } else if (platform === 'darwin') {
        // macOS: 创建 launchd plist
        const plistName = 'com.daidai.proxy';
        const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${plistName}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${daemonPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${__dirname}</string>
</dict>
</plist>
`;

        const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', `${plistName}.plist`);
        fs.writeFileSync(plistPath, plistContent);

        execSync(`launchctl load ${plistPath}`);

        console.log('✅ macOS LaunchAgent 已设置');
        console.log(`   位置: ${plistPath}`);
        console.log(`   管理命令:`);
        console.log(`     启动: launchctl start ${plistName}`);
        console.log(`     停止: launchctl stop ${plistName}`);

    } else {
        console.log('❌ 不支持的操作系统:', platform);
        process.exit(1);
    }

    console.log('\n✅ 开机自启动设置完成！\n');
    process.exit(0);

} catch (error) {
    console.error('\n❌ 设置失败:', error.message);
    console.error('\n请确保有足够的权限，或手动设置开机自启动。\n');
    process.exit(1);
}
