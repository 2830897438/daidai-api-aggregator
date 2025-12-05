/**
 * DaiDai API Aggregator - Auto-start Server
 * SillyTavern 会自动加载此文件，无需用户手动操作
 */

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const PROXY_PORT = 5100;
const MANAGEMENT_PORT = 5101;
const UPSTREAM_API = 'https://api.daidaibird.top/v1';
const KEYS_CACHE_FILE = path.join(__dirname, '.keys-cache.json');

/**
 * API Key 管理器
 */
class KeyManager {
    constructor() {
        this.keys = [];
        this.currentIndex = 0;
        this.loadKeysFromCache();
    }

    loadKeysFromCache() {
        try {
            if (fs.existsSync(KEYS_CACHE_FILE)) {
                const data = JSON.parse(fs.readFileSync(KEYS_CACHE_FILE, 'utf8'));
                if (data.keys && Array.isArray(data.keys)) {
                    this.updateKeys(data.keys);
                    console.log(`[KeyManager] 从缓存加载了 ${this.keys.length} 个密钥`);
                }
            }
        } catch (error) {
            console.error('[KeyManager] 加载缓存失败:', error.message);
        }
    }

    saveKeysToCache() {
        try {
            const data = {
                keys: this.keys.map(k => k.key),
                updatedAt: new Date().toISOString()
            };
            fs.writeFileSync(KEYS_CACHE_FILE, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[KeyManager] 保存缓存失败:', error.message);
        }
    }

    updateKeys(newKeys) {
        this.keys = newKeys.map(key => ({
            key: key,
            available: true,
            errorCount: 0,
            lastUsed: null
        }));
        this.currentIndex = 0;
        this.saveKeysToCache();
        console.log(`[KeyManager] 更新了 ${this.keys.length} 个密钥`);
    }

    getNextKey() {
        if (this.keys.length === 0) {
            return null;
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

        console.warn('[KeyManager] 没有可用的密钥');
        return null;
    }

    markKeySuccess(key) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount = 0;
            keyInfo.available = true;
        }
    }

    markKeyUnavailable(key, error) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount++;
            console.warn(`[KeyManager] 密钥失败 (${keyInfo.errorCount}/3):`, key.substring(0, 10) + '...', error);

            if (keyInfo.errorCount >= 3) {
                keyInfo.available = false;
                console.error('[KeyManager] 密钥已被禁用:', key.substring(0, 10) + '...');
            }
        }
    }

    getStatus() {
        const available = this.keys.filter(k => k.available).length;
        const total = this.keys.length;
        return {
            total,
            available,
            unavailable: total - available
        };
    }
}

// 初始化 Key 管理器
const keyManager = new KeyManager();

/**
 * 创建代理服务器 (端口 5100)
 */
function createProxyServer() {
    const app = express();
    app.use(express.json());

    // CORS
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // Health check
    app.get('/health', (req, res) => {
        const status = keyManager.getStatus();
        res.json({
            status: 'running',
            keys: status,
            uptime: process.uptime()
        });
    });

    // OpenAI 兼容代理
    app.post('/v1/chat/completions', async (req, res) => {
        const apiKey = keyManager.getNextKey();

        if (!apiKey) {
            return res.status(503).json({
                error: {
                    message: '没有可用的 API key',
                    type: 'no_available_keys'
                }
            });
        }

        try {
            const isStreaming = req.body.stream === true;

            const response = await fetch(`${UPSTREAM_API}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(req.body)
            });

            if (!response.ok) {
                const errorText = await response.text();
                keyManager.markKeyUnavailable(apiKey, `HTTP ${response.status}`);
                return res.status(response.status).json({
                    error: {
                        message: errorText || 'Upstream API error',
                        type: 'upstream_error',
                        status: response.status
                    }
                });
            }

            keyManager.markKeySuccess(apiKey);

            if (isStreaming) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');

                response.body.pipe(res);
            } else {
                const data = await response.json();
                res.json(data);
            }

        } catch (error) {
            console.error('[Proxy] 请求失败:', error.message);
            keyManager.markKeyUnavailable(apiKey, error.message);
            res.status(500).json({
                error: {
                    message: error.message,
                    type: 'proxy_error'
                }
            });
        }
    });

    // Models endpoint
    app.get('/v1/models', async (req, res) => {
        const apiKey = keyManager.getNextKey();
        if (!apiKey) {
            return res.status(503).json({ error: '没有可用的 API key' });
        }

        try {
            const response = await fetch(`${UPSTREAM_API}/models`, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            const data = await response.json();
            res.json(data);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return app;
}

/**
 * 创建管理服务器 (端口 5101)
 */
function createManagementServer() {
    const app = express();
    app.use(express.json());

    // CORS
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
        next();
    });

    // 更新 keys
    app.post('/update-keys', (req, res) => {
        const { keys } = req.body;

        if (!keys || !Array.isArray(keys) || keys.length === 0) {
            return res.status(400).json({
                success: false,
                error: '无效的密钥列表'
            });
        }

        keyManager.updateKeys(keys);

        res.json({
            success: true,
            count: keys.length
        });
    });

    // 获取状态
    app.get('/status', (req, res) => {
        res.json({
            running: true,
            keys: keyManager.getStatus()
        });
    });

    return app;
}

/**
 * 启动服务器
 */
function startServers() {
    const proxyApp = createProxyServer();
    const managementApp = createManagementServer();

    // 启动代理服务器
    const proxyServer = proxyApp.listen(PROXY_PORT, '127.0.0.1', () => {
        console.log(`✅ [DaiDai Proxy] 代理服务器运行在 http://localhost:${PROXY_PORT}/v1`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ [DaiDai Proxy] 端口 ${PROXY_PORT} 已被占用，代理可能已在运行`);
        } else {
            console.error(`❌ [DaiDai Proxy] 启动失败:`, err.message);
        }
    });

    // 启动管理服务器
    const managementServer = managementApp.listen(MANAGEMENT_PORT, '127.0.0.1', () => {
        console.log(`✅ [DaiDai Management] 管理服务器运行在 http://localhost:${MANAGEMENT_PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ [DaiDai Management] 端口 ${MANAGEMENT_PORT} 已被占用`);
        } else {
            console.error(`❌ [DaiDai Management] 启动失败:`, err.message);
        }
    });

    // 优雅退出
    process.on('SIGTERM', () => {
        console.log('\n[DaiDai] 正在关闭服务器...');
        proxyServer.close();
        managementServer.close();
        process.exit(0);
    });
}

// SillyTavern 加载此文件时自动启动
console.log('🚀 [DaiDai API Aggregator] 正在初始化...');
startServers();

// 导出空对象（SillyTavern 要求）
module.exports = {};
