#!/usr/bin/env node
/**
 * DaiDai API Aggregator - 自动后端配置脚本
 * 一键配置 SillyTavern 后端，之后就可以在前端点击启动代理
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

console.log('\n========================================');
console.log('  DaiDai API Aggregator');
console.log('  自动后端配置向导');
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

    // 向上查找最多 5 层
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

// 检查是否已经配置
function isAlreadyConfigured(serverJsContent) {
    return serverJsContent.includes('daidai-api-aggregator') ||
           serverJsContent.includes('DaiDai API Aggregator');
}

// 生成要插入的代码
function generateInsertCode() {
    return `
// ==================== DaiDai API Aggregator Extension ====================
try {
    const daidaiAggregatorPath = path.join(__dirname, 'public', 'scripts', 'extensions', 'third-party', 'daidai-api-aggregator', 'server.js');
    if (fs.existsSync(daidaiAggregatorPath)) {
        const daidaiAggregator = require(daidaiAggregatorPath);
        const daidaiRouter = express.Router();
        daidaiAggregator.registerEndpoints(daidaiRouter);
        app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
        console.log('✅ DaiDai API Aggregator extension loaded');
    }
} catch (error) {
    console.error('❌ Failed to load DaiDai API Aggregator:', error.message);
}
// =========================================================================
`;
}

// 修改 server.js
function modifyServerJs(serverJsPath) {
    console.log('📝 读取 server.js...');
    let content = fs.readFileSync(serverJsPath, 'utf8');

    // 检查是否已配置
    if (isAlreadyConfigured(content)) {
        console.log('✅ 检测到已配置，无需重复配置');
        return false;
    }

    // 备份原文件
    const backupPath = serverJsPath + '.backup-' + Date.now();
    console.log('💾 备份原文件到:', backupPath);
    fs.writeFileSync(backupPath, content);

    // 查找插入位置
    const insertCode = generateInsertCode();

    // 尝试多种插入策略
    let modified = false;

    // 策略1: 在 app.listen 之前插入
    const listenRegex = /(const\s+server\s*=\s*)?app\.listen\s*\(/;
    if (listenRegex.test(content) && !modified) {
        content = content.replace(listenRegex, (match) => {
            return insertCode + '\n' + match;
        });
        modified = true;
        console.log('✅ 已在 app.listen 之前插入配置代码');
    }

    // 策略2: 在文件末尾插入（如果策略1失败）
    if (!modified) {
        content = content.trim() + '\n' + insertCode;
        modified = true;
        console.log('✅ 已在文件末尾插入配置代码');
    }

    // 写入修改后的内容
    fs.writeFileSync(serverJsPath, content);
    console.log('✅ server.js 已更新');

    return true;
}

async function main() {
    try {
        // 查找 SillyTavern 根目录
        console.log('🔍 正在查找 SillyTavern 根目录...');
        let stRoot = findSillyTavernRoot();

        if (!stRoot) {
            console.log('⚠️  自动查找失败');
            const customPath = await question('\n请输入 SillyTavern 根目录的完整路径: ');
            stRoot = customPath.trim();

            if (!fs.existsSync(path.join(stRoot, 'server.js'))) {
                console.error('\n❌ 错误: 找不到 server.js 文件');
                console.log('请确认路径是否正确');
                rl.close();
                process.exit(1);
            }
        }

        console.log(`✅ 找到 SillyTavern 根目录: ${stRoot}\n`);

        // 确认
        console.log('即将修改以下文件:');
        console.log(`  ${path.join(stRoot, 'server.js')}`);
        console.log('\n操作内容:');
        console.log('  1. 备份原 server.js 文件');
        console.log('  2. 添加 DaiDai API Aggregator 后端配置');
        console.log('  3. 配置完成后可在前端点击启动代理\n');

        const confirm = await question('是否继续? (y/n): ');

        if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
            console.log('\n❌ 用户取消操作');
            rl.close();
            process.exit(0);
        }

        // 执行修改
        console.log('');
        const serverJsPath = path.join(stRoot, 'server.js');
        const success = modifyServerJs(serverJsPath);

        if (success) {
            console.log('\n========================================');
            console.log('  ✅ 配置成功！');
            console.log('========================================\n');
            console.log('下一步操作:');
            console.log('  1. 重启 SillyTavern 服务器');
            console.log('  2. 打开扩展面板');
            console.log('  3. 登录你的 DaiDai 账号');
            console.log('  4. 点击 "启动代理" 按钮');
            console.log('  5. 代理会自动在后台启动！');
            console.log('\n提示:');
            console.log('  - 代理地址: http://localhost:5100/v1');
            console.log('  - 如需卸载，运行: node uninstall-backend.js');
            console.log('\n========================================\n');
        } else {
            console.log('\n✅ 检测到已配置，无需重复操作');
            console.log('\n如需重新配置:');
            console.log('  1. 运行: node uninstall-backend.js');
            console.log('  2. 再次运行此脚本\n');
        }

        rl.close();
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        rl.close();
        process.exit(1);
    }
}

main();
