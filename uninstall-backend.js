#!/usr/bin/env node
/**
 * DaiDai API Aggregator - 卸载后端配置脚本
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('\n========================================');
console.log('  DaiDai API Aggregator');
console.log('  卸载后端配置向导');
console.log('========================================\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// 查找 SillyTavern 根目录
function findSillyTavernRoot() {
    let currentDir = __dirname;

    for (let i = 0; i < 5; i++) {
        const serverPath = path.join(currentDir, 'server.js');
        const packagePath = path.join(currentDir, 'package.json');

        if (fs.existsSync(serverPath) && fs.existsSync(packagePath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                if (pkg.name && pkg.name.toLowerCase().includes('sillytavern')) {
                    return currentDir;
                }
            } catch (error) {
                // 继续查找
            }
        }

        currentDir = path.dirname(currentDir);
    }

    return null;
}

// 移除配置代码
function removeConfiguration(serverJsPath) {
    console.log('📝 读取 server.js...');
    let content = fs.readFileSync(serverJsPath, 'utf8');

    // 检查是否已配置
    if (!content.includes('daidai-api-aggregator') && !content.includes('DaiDai API Aggregator')) {
        console.log('ℹ️  未检测到配置，无需卸载');
        return false;
    }

    // 备份
    const backupPath = serverJsPath + '.backup-before-uninstall-' + Date.now();
    console.log('💾 备份当前文件到:', backupPath);
    fs.writeFileSync(backupPath, content);

    // 移除配置块
    const configBlockRegex = /\/\/ =+ DaiDai API Aggregator Extension =+[\s\S]*?\/\/ =+\n/g;
    content = content.replace(configBlockRegex, '');

    // 写入
    fs.writeFileSync(serverJsPath, content);
    console.log('✅ 配置已移除');

    return true;
}

async function main() {
    try {
        // 查找根目录
        console.log('🔍 正在查找 SillyTavern 根目录...');
        let stRoot = findSillyTavernRoot();

        if (!stRoot) {
            console.log('⚠️  自动查找失败');
            const customPath = await question('\n请输入 SillyTavern 根目录的完整路径: ');
            stRoot = customPath.trim();

            if (!fs.existsSync(path.join(stRoot, 'server.js'))) {
                console.error('\n❌ 错误: 找不到 server.js 文件');
                rl.close();
                process.exit(1);
            }
        }

        console.log(`✅ 找到 SillyTavern 根目录: ${stRoot}\n`);

        // 确认
        console.log('即将移除 DaiDai API Aggregator 后端配置\n');
        const confirm = await question('是否继续? (y/n): ');

        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ 用户取消操作');
            rl.close();
            process.exit(0);
        }

        // 执行移除
        console.log('');
        const serverJsPath = path.join(stRoot, 'server.js');
        const success = removeConfiguration(serverJsPath);

        if (success) {
            console.log('\n========================================');
            console.log('  ✅ 卸载成功！');
            console.log('========================================\n');
            console.log('后续步骤:');
            console.log('  1. 重启 SillyTavern 服务器');
            console.log('  2. 扩展功能将恢复为独立模式');
            console.log('  3. 如需使用，请运行启动脚本');
            console.log('\n========================================\n');
        } else {
            console.log('\n✅ 未检测到配置，无需操作\n');
        }

        rl.close();
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        rl.close();
        process.exit(1);
    }
}

main();
