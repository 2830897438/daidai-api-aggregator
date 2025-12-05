#!/usr/bin/env node
/**
 * DaiDai API Aggregator - 守护进程代理服务器
 * 开机自启动，完全在后台运行
 */

const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const PROXY_PORT = 5100;       // OpenAI API 代理端口
const MANAGEMENT_PORT = 5101;  // 管理 API 端口
const OPENAI_BASE_URL = 'https://api.daidaibird.top/v1';
const KEYS_FILE = path.join(__dirname, '.keys-cache.json');
const LOG_FILE = path.join(__dirname, 'proxy.log');

// 日志函数
function log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(message);
    try {
        fs.appendFileSync(LOG_FILE, logMessage);
    } catch (error) {
        // 忽略日志写入错误
    }
}

log('========================================');
log('  DaiDai API Aggregator Daemon');
log('========================================');

// 尝试加载 node-fetch
let fetch;
try {
    fetch = require('node-fetch');
} catch (error) {
    log('ERROR: node-fetch not found. Please run: npm install node-fetch');
    process.exit(1);
}

// Keys 管理
class KeyManager {
    constructor(keys = []) {
        this.keys = keys.map(key => ({
            key: key,
            available: true,
            errorCount: 0,
            lastUsed: 0
        }));
        this.currentIndex = 0;
    }

    getNextKey() {
        if (this.keys.length === 0) {
            throw new Error('No API keys available');
        }

        let attempts = 0;
        while (attempts < this.keys.length) {
            const keyInfo = this.keys[this.currentIndex];
            this.currentIndex = (this.currentIndex + 1) % this.keys.length;

            if (keyInfo.available) {
                keyInfo.lastUsed = Date.now();
                return keyInfo.key;
            }
            attempts++;
        }

        log('WARNING: All keys unavailable, resetting...');
        this.keys.forEach(k => {
            k.available = true;
            k.errorCount = 0;
        });

        const keyInfo = this.keys[0];
        keyInfo.lastUsed = Date.now();
        return keyInfo.key;
    }

    markKeyUnavailable(key) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount++;
            if (keyInfo.errorCount >= 3) {
                keyInfo.available = false;
                log(`WARNING: Key ${key.substring(0, 10)}... marked as unavailable`);
            }
        }
    }

    resetKeyErrors(key) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount = 0;
        }
    }

    updateKeys(newKeys) {
        this.keys = newKeys.map(key => ({
            key: key,
            available: true,
            errorCount: 0,
            lastUsed: 0
        }));
        this.currentIndex = 0;
        this.saveKeys();
        log(`Keys updated: ${newKeys.length} keys`);
    }

    getStats() {
        return {
            total: this.keys.length,
            available: this.keys.filter(k => k.available).length,
            unavailable: this.keys.filter(k => !k.available).length
        };
    }

    saveKeys() {
        try {
            const data = {
                keys: this.keys.map(k => k.key),
                updated: new Date().toISOString()
            };
            fs.writeFileSync(KEYS_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            log(`ERROR: Failed to save keys: ${error.message}`);
        }
    }

    loadKeys() {
        try {
            if (fs.existsSync(KEYS_FILE)) {
                const data = JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8'));
                if (data.keys && data.keys.length > 0) {
                    this.updateKeys(data.keys);
                    log(`Loaded ${data.keys.length} keys from cache`);
                    return true;
                }
            }
        } catch (error) {
            log(`ERROR: Failed to load keys: ${error.message}`);
        }
        return false;
    }
}

let keyManager = new KeyManager();

// 启动时加载缓存的 keys
keyManager.loadKeys();

// ========== OpenAI 代理服务器 ==========
const proxyApp = express();
proxyApp.use(express.json({ limit: '50mb' }));

// CORS 支持
proxyApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 健康检查
proxyApp.get('/health', (req, res) => {
    const stats = keyManager.getStats();
    res.json({
        status: 'ok',
        keys: stats,
        timestamp: new Date().toISOString()
    });
});

// 代理所有 OpenAI API 请求
proxyApp.all('/v1/*', async (req, res) => {
    const path = req.path;
    const method = req.method;

    if (keyManager.keys.length === 0) {
        return res.status(503).json({
            error: {
                message: 'No API keys configured. Please login in the extension panel.',
                type: 'no_keys_error'
            }
        });
    }

    let attempts = 0;
    const maxAttempts = Math.min(3, keyManager.keys.length);

    while (attempts < maxAttempts) {
        attempts++;

        try {
            const apiKey = keyManager.getNextKey();

            const fetchOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    ...req.headers
                }
            };

            delete fetchOptions.headers.host;
            delete fetchOptions.headers['content-length'];

            if (method !== 'GET' && method !== 'HEAD' && req.body) {
                fetchOptions.body = JSON.stringify(req.body);
            }

            const response = await fetch(`${OPENAI_BASE_URL}${path}`, fetchOptions);

            if (response.ok) {
                keyManager.resetKeyErrors(apiKey);

                // 流式响应
                if (path.includes('/chat/completions') && req.body && req.body.stream) {
                    res.setHeader('Content-Type', 'text/event-stream');
                    res.setHeader('Cache-Control', 'no-cache');
                    res.setHeader('Connection', 'keep-alive');
                    response.body.pipe(res);
                    return;
                }

                // JSON 响应
                const data = await response.json();
                res.status(response.status).json(data);
                return;
            } else {
                const errorData = await response.text();

                if (response.status === 401 || response.status === 429 || response.status === 403) {
                    keyManager.markKeyUnavailable(apiKey);

                    if (attempts < maxAttempts) {
                        continue;
                    }
                }

                res.status(response.status).send(errorData);
                return;
            }
        } catch (error) {
            log(`ERROR: Request error (attempt ${attempts}): ${error.message}`);

            if (attempts < maxAttempts) {
                continue;
            }

            res.status(500).json({
                error: {
                    message: `Proxy error: ${error.message}`,
                    type: 'proxy_error'
                }
            });
            return;
        }
    }

    res.status(500).json({
        error: {
            message: 'All retry attempts failed',
            type: 'proxy_error'
        }
    });
});

// ========== 管理 API 服务器 ==========
const managementApp = express();
managementApp.use(express.json());

// CORS 支持
managementApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 获取状态
managementApp.get('/status', (req, res) => {
    res.json({
        running: true,
        stats: keyManager.getStats(),
        ports: {
            proxy: PROXY_PORT,
            management: MANAGEMENT_PORT
        }
    });
});

// 更新 keys
managementApp.post('/update-keys', (req, res) => {
    try {
        const { keys } = req.body;

        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No API keys provided'
            });
        }

        keyManager.updateKeys(keys);
        res.json({
            success: true,
            count: keys.length,
            stats: keyManager.getStats()
        });
    } catch (error) {
        log(`ERROR: Update keys error: ${error.message}`);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ========== 启动服务器 ==========
const proxyServer = http.createServer(proxyApp);
const managementServer = http.createServer(managementApp);

proxyServer.listen(PROXY_PORT, '127.0.0.1', () => {
    log(`OpenAI Proxy listening on http://localhost:${PROXY_PORT}/v1`);
});

managementServer.listen(MANAGEMENT_PORT, '127.0.0.1', () => {
    log(`Management API listening on http://localhost:${MANAGEMENT_PORT}`);
});

log(`Keys loaded: ${keyManager.keys.length}`);
log('Daemon started successfully');
log('========================================');

// 优雅退出
process.on('SIGINT', () => {
    log('Shutting down gracefully...');
    proxyServer.close();
    managementServer.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    log('Shutting down gracefully...');
    proxyServer.close();
    managementServer.close();
    process.exit(0);
});

// 保持进程运行
process.stdin.resume();
