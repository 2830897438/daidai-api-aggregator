/**
 * DaiDai API Aggregator Server
 * SillyTavern 后端集成 - 实现 API keys 聚合和负载均衡
 */

const express = require('express');
const http = require('http');

// 尝试加载 node-fetch
let fetch;
try {
    fetch = require('node-fetch');
} catch (error) {
    console.warn('[DaiDai] node-fetch not found, please run: npm install node-fetch');
}

// 配置
const OPENAI_BASE_URL = 'https://api.daidaibird.top/v1';
let proxyServer = null;
let proxyApp = null;

// Keys 管理
class KeyManager {
    constructor(keys) {
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

        console.warn('[DaiDai] All keys unavailable, resetting...');
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
                console.warn(`[DaiDai] Key ${key.substring(0, 10)}... marked as unavailable`);
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
    }

    getStats() {
        return {
            total: this.keys.length,
            available: this.keys.filter(k => k.available).length,
            unavailable: this.keys.filter(k => !k.available).length
        };
    }
}

let keyManager = null;

/**
 * 创建代理服务器
 */
function createProxyServer(keys, port) {
    if (!fetch) {
        return { success: false, error: 'node-fetch not installed. Run: npm install node-fetch' };
    }

    if (proxyServer) {
        console.log('[DaiDai] Proxy server already running');
        return { success: true, port: port, message: 'Already running' };
    }

    try {
        keyManager = new KeyManager(keys);

        proxyApp = express();
        proxyApp.use(express.json({ limit: '50mb' }));

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
                    console.error(`[DaiDai] Request error (attempt ${attempts}):`, error.message);

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

        // 启动服务器
        proxyServer = http.createServer(proxyApp);
        proxyServer.listen(port, '127.0.0.1', () => {
            console.log(`[DaiDai] Proxy started on http://localhost:${port}/v1`);
            console.log(`[DaiDai] Managing ${keys.length} API keys`);
        });

        return { success: true, port: port };
    } catch (error) {
        console.error('[DaiDai] Failed to start proxy:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 停止代理服务器
 */
function stopProxyServer() {
    return new Promise((resolve) => {
        if (!proxyServer) {
            resolve({ success: true, message: 'Server not running' });
            return;
        }

        proxyServer.close(() => {
            console.log('[DaiDai] Proxy stopped');
            proxyServer = null;
            proxyApp = null;
            keyManager = null;
            resolve({ success: true, message: 'Server stopped' });
        });
    });
}

/**
 * 获取代理状态
 */
function getProxyStatus() {
    if (!proxyServer || !keyManager) {
        return { running: false };
    }

    return {
        running: true,
        stats: keyManager.getStats()
    };
}

/**
 * 更新 keys
 */
function updateProxyKeys(keys) {
    if (!keyManager) {
        return { success: false, error: 'Proxy not running' };
    }

    keyManager.updateKeys(keys);
    console.log(`[DaiDai] Keys updated: ${keys.length} keys`);
    return { success: true, count: keys.length };
}

/**
 * 注册 SillyTavern 路由
 */
function registerEndpoints(router) {
    // 启动代理
    router.post('/start-proxy', async (req, res) => {
        try {
            const { keys, port } = req.body;

            if (!keys || keys.length === 0) {
                return res.json({ success: false, error: 'No API keys provided' });
            }

            const result = createProxyServer(keys, port || 5100);
            res.json(result);
        } catch (error) {
            console.error('[DaiDai] Start proxy error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // 停止代理
    router.post('/stop-proxy', async (req, res) => {
        try {
            const result = await stopProxyServer();
            res.json(result);
        } catch (error) {
            console.error('[DaiDai] Stop proxy error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // 获取代理状态
    router.get('/proxy-status', (req, res) => {
        try {
            const status = getProxyStatus();
            res.json(status);
        } catch (error) {
            console.error('[DaiDai] Get status error:', error);
            res.json({ running: false, error: error.message });
        }
    });

    // 更新 keys
    router.post('/update-keys', (req, res) => {
        try {
            const { keys } = req.body;

            if (!keys || keys.length === 0) {
                return res.json({ success: false, error: 'No API keys provided' });
            }

            const result = updateProxyKeys(keys);
            res.json(result);
        } catch (error) {
            console.error('[DaiDai] Update keys error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    console.log('[DaiDai] Server endpoints registered');
}

// 导出模块
module.exports = {
    registerEndpoints,
    stopProxyServer
};
