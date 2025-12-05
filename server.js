/**
 * DaiDai API Aggregator Server
 * 后端服务器 - 实现 API keys 聚合和负载均衡
 */

const express = require('express');
const fetch = require('node-fetch');
const http = require('http');

// 代理配置
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

    /**
     * 获取下一个可用的 key（轮询）
     */
    getNextKey() {
        if (this.keys.length === 0) {
            throw new Error('No API keys available');
        }

        // 找到第一个可用的 key
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

        // 如果所有 keys 都不可用，重置所有 keys 状态并返回第一个
        console.warn('All keys are marked as unavailable, resetting...');
        this.keys.forEach(k => {
            k.available = true;
            k.errorCount = 0;
        });

        const keyInfo = this.keys[0];
        keyInfo.lastUsed = Date.now();
        return keyInfo.key;
    }

    /**
     * 标记 key 为不可用
     */
    markKeyUnavailable(key) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount++;
            if (keyInfo.errorCount >= 3) {
                keyInfo.available = false;
                console.warn(`Key ${key.substring(0, 10)}... marked as unavailable`);
            }
        }
    }

    /**
     * 重置 key 错误计数
     */
    resetKeyErrors(key) {
        const keyInfo = this.keys.find(k => k.key === key);
        if (keyInfo) {
            keyInfo.errorCount = 0;
        }
    }

    /**
     * 更新 keys 列表
     */
    updateKeys(newKeys) {
        this.keys = newKeys.map(key => ({
            key: key,
            available: true,
            errorCount: 0,
            lastUsed: 0
        }));
        this.currentIndex = 0;
    }

    /**
     * 获取统计信息
     */
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
    if (proxyServer) {
        console.log('Proxy server already running');
        return { success: true, port: port };
    }

    try {
        // 初始化 key 管理器
        keyManager = new KeyManager(keys);

        // 创建 Express 应用
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
                    // 获取下一个可用的 key
                    const apiKey = keyManager.getNextKey();

                    console.log(`[Proxy] ${method} ${path} - Attempt ${attempts} - Key: ${apiKey.substring(0, 10)}...`);

                    // 构建请求选项
                    const fetchOptions = {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${apiKey}`,
                            ...req.headers
                        }
                    };

                    // 移除不需要的 headers
                    delete fetchOptions.headers.host;
                    delete fetchOptions.headers['content-length'];

                    // 添加请求体（如果有）
                    if (method !== 'GET' && method !== 'HEAD' && req.body) {
                        fetchOptions.body = JSON.stringify(req.body);
                    }

                    // 发送请求到上游 API
                    const response = await fetch(`${OPENAI_BASE_URL}${path}`, fetchOptions);

                    // 检查响应状态
                    if (response.ok) {
                        // 成功 - 重置错误计数
                        keyManager.resetKeyErrors(apiKey);

                        // 处理流式响应
                        if (path.includes('/chat/completions') && req.body && req.body.stream) {
                            res.setHeader('Content-Type', 'text/event-stream');
                            res.setHeader('Cache-Control', 'no-cache');
                            res.setHeader('Connection', 'keep-alive');
                            response.body.pipe(res);
                            return;
                        }

                        // 处理 JSON 响应
                        const data = await response.json();
                        res.status(response.status).json(data);
                        return;
                    } else {
                        // 错误响应
                        const errorData = await response.text();
                        console.error(`[Proxy] Error ${response.status}: ${errorData}`);

                        // 如果是认证错误或配额错误，标记 key 为不可用
                        if (response.status === 401 || response.status === 429 || response.status === 403) {
                            keyManager.markKeyUnavailable(apiKey);

                            // 如果还有重试机会，继续下一次尝试
                            if (attempts < maxAttempts) {
                                console.log(`[Proxy] Retrying with next key...`);
                                continue;
                            }
                        }

                        // 返回错误
                        res.status(response.status).send(errorData);
                        return;
                    }
                } catch (error) {
                    console.error(`[Proxy] Request error (attempt ${attempts}):`, error.message);

                    // 如果还有重试机会，继续下一次尝试
                    if (attempts < maxAttempts) {
                        continue;
                    }

                    // 所有尝试都失败了
                    res.status(500).json({
                        error: {
                            message: `Proxy error: ${error.message}`,
                            type: 'proxy_error'
                        }
                    });
                    return;
                }
            }

            // 不应该到达这里，但以防万一
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
            console.log(`[DaiDai Proxy] Server started on http://localhost:${port}/v1`);
            console.log(`[DaiDai Proxy] Managing ${keys.length} API keys`);
        });

        return { success: true, port: port };
    } catch (error) {
        console.error('[DaiDai Proxy] Failed to start server:', error);
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
            console.log('[DaiDai Proxy] Server stopped');
            proxyServer = null;
            proxyApp = null;
            keyManager = null;
            resolve({ success: true, message: 'Server stopped' });
        });
    });
}

/**
 * 检查代理状态
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
    console.log(`[DaiDai Proxy] Keys updated: ${keys.length} keys`);
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
            console.error('Start proxy error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // 停止代理
    router.post('/stop-proxy', async (req, res) => {
        try {
            const result = await stopProxyServer();
            res.json(result);
        } catch (error) {
            console.error('Stop proxy error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    // 获取代理状态
    router.get('/proxy-status', (req, res) => {
        try {
            const status = getProxyStatus();
            res.json(status);
        } catch (error) {
            console.error('Get status error:', error);
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
            console.error('Update keys error:', error);
            res.json({ success: false, error: error.message });
        }
    });

    console.log('[DaiDai API Aggregator] Server endpoints registered');
}

// 导出模块
module.exports = {
    registerEndpoints,
    stopProxyServer
};
