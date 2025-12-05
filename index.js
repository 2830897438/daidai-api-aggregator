/**
 * DaiDai API Aggregator Extension for SillyTavern
 * 聚合多个 API keys 并提供本地代理服务
 */

(function() {
    'use strict';

    const extensionName = "daidai-api-aggregator";
    const extensionFolderPath = `scripts/extensions/third-party/${extensionName}/`;

    // 配置
    const API_BASE = 'https://user.daidaibird.top';
    const PROXY_PORT = 5100;
    const MANAGEMENT_PORT = 5101;

    // 状态管理
    let state = {
        token: null,
        userData: null,
        apiKeys: [],
        totalBalance: 0,
        proxyRunning: false,
        proxyUrl: `http://localhost:${PROXY_PORT}/v1`
    };

    /**
     * 登录到 DaiDai 平台
     */
    async function login(email, password) {
        try {
            const response = await fetch(`${API_BASE}/api/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userEmail: email,
                    password: password
                })
            });

            const data = await response.json();

            if (data.code === 200 && data.token) {
                state.token = data.token;
                state.userData = data.msg;

                // 保存到本地存储
                saveSettings();

                return { success: true, data: data };
            } else {
                return { success: false, error: data.msg || '登录失败' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 获取 API keys 列表
     */
    async function fetchApiKeys() {
        if (!state.token || !state.userData) {
            return { success: false, error: '请先登录' };
        }

        try {
            const response = await fetch(`${API_BASE}/api/general/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.token}`
                },
                body: JSON.stringify({
                    userData: JSON.stringify(state.userData),
                    page: 1
                })
            });

            const data = await response.json();

            if (data.code === 200 && data.msg) {
                state.apiKeys = data.msg.filter(key => key.state === 'success' && !key.hasError);
                state.totalBalance = state.apiKeys.reduce((sum, key) => sum + parseFloat(key.balance || 0), 0);

                // 保存到本地存储
                saveSettings();

                return { success: true, keys: state.apiKeys, balance: state.totalBalance };
            } else {
                return { success: false, error: data.msg || '获取密钥失败' };
            }
        } catch (error) {
            console.error('Fetch keys error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 同步 keys 到代理服务器
     */
    async function syncKeys() {
        if (state.apiKeys.length === 0) {
            showToast('请先登录并获取 API keys', 'error');
            return;
        }

        try {
            // 同步 keys 到独立代理
            const response = await fetch(`http://localhost:${MANAGEMENT_PORT}/update-keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    keys: state.apiKeys.map(k => k.api_key)
                })
            });

            const data = await response.json();

            if (data.success) {
                state.proxyRunning = true;
                updateUI();
                showToast(`Keys 已同步 (${data.count} 个)`, 'success');
            } else {
                showToast(`同步失败: ${data.error}`, 'error');
            }
        } catch (error) {
            console.error('Sync keys error:', error);
            showToast('代理服务连接失败，请检查 SillyTavern 是否正常运行', 'error');
        }
    }

    // 保留 startProxy 作为别名
    const startProxy = syncKeys;


    /**
     * 保存设置到本地存储
     */
    function saveSettings() {
        const settings = {
            token: state.token,
            userData: state.userData,
            apiKeys: state.apiKeys,
            totalBalance: state.totalBalance
        };
        localStorage.setItem(`${extensionName}_settings`, JSON.stringify(settings));
    }

    /**
     * 从本地存储加载设置
     */
    function loadSettings() {
        const saved = localStorage.getItem(`${extensionName}_settings`);
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                state.token = settings.token;
                state.userData = settings.userData;
                state.apiKeys = settings.apiKeys || [];
                state.totalBalance = settings.totalBalance || 0;
            } catch (error) {
                console.error('Load settings error:', error);
            }
        }
    }

    /**
     * 更新 UI
     */
    function updateUI() {
        // 更新登录状态
        if (state.token && state.userData) {
            $('#daidai-login-form').hide();
            $('#daidai-dashboard').show();
            $('#daidai-user-email').text(state.userData.userEmail);
        } else {
            $('#daidai-login-form').show();
            $('#daidai-dashboard').hide();
        }

        // 更新余额
        $('#daidai-total-balance').text(state.totalBalance.toFixed(2));
        $('#daidai-keys-count').text(state.apiKeys.length);

        // 更新代理状态
        if (state.proxyRunning) {
            $('#daidai-proxy-status').text('运行中').removeClass('status-stopped').addClass('status-running');
            $('#daidai-start-proxy').hide();
            $('#daidai-stop-proxy').show();
            $('#daidai-proxy-url').show();
            $('#daidai-proxy-url-text').text(state.proxyUrl);
        } else {
            $('#daidai-proxy-status').text('已停止').removeClass('status-running').addClass('status-stopped');
            $('#daidai-start-proxy').show();
            $('#daidai-stop-proxy').hide();
            $('#daidai-proxy-url').hide();
        }

        // 更新 keys 列表
        updateKeysList();
    }

    /**
     * 更新 keys 列表显示
     */
    function updateKeysList() {
        const container = $('#daidai-keys-list');
        container.empty();

        if (state.apiKeys.length === 0) {
            container.html('<div class="no-keys">暂无可用密钥</div>');
            return;
        }

        state.apiKeys.forEach((key, index) => {
            const keyElement = $(`
                <div class="key-item">
                    <div class="key-info">
                        <span class="key-index">#${index + 1}</span>
                        <span class="key-value">${maskKey(key.api_key)}</span>
                    </div>
                    <div class="key-stats">
                        <span class="key-balance">余额: ¥${parseFloat(key.balance).toFixed(2)}</span>
                        <span class="key-used">已用: ¥${parseFloat(key.utilised).toFixed(2)}</span>
                    </div>
                </div>
            `);
            container.append(keyElement);
        });
    }

    /**
     * 遮罩 API key 显示
     */
    function maskKey(key) {
        if (!key || key.length < 10) return key;
        return key.substring(0, 8) + '...' + key.substring(key.length - 6);
    }

    /**
     * 显示提示消息
     */
    function showToast(message, type = 'info') {
        toastr[type](message);
    }

    /**
     * 创建 UI
     */
    function createUI() {
        const html = `
            <div id="daidai-aggregator-panel">
                <!-- 登录表单 -->
                <div id="daidai-login-form">
                    <h3>DaiDai API 聚合器</h3>
                    <div class="form-group">
                        <label>账号邮箱:</label>
                        <input type="email" id="daidai-email" class="text_pole" placeholder="请输入邮箱">
                    </div>
                    <div class="form-group">
                        <label>密码:</label>
                        <input type="password" id="daidai-password" class="text_pole" placeholder="请输入密码">
                    </div>
                    <button id="daidai-login-btn" class="menu_button">登录</button>
                </div>

                <!-- 仪表板 -->
                <div id="daidai-dashboard" style="display: none;">
                    <h3>DaiDai API 聚合器</h3>

                    <!-- 用户信息 -->
                    <div class="daidai-section">
                        <div class="info-row">
                            <span>账号:</span>
                            <span id="daidai-user-email"></span>
                        </div>
                        <button id="daidai-logout-btn" class="menu_button menu_button_icon">
                            <i class="fa-solid fa-sign-out-alt"></i> 退出登录
                        </button>
                    </div>

                    <!-- 余额信息 -->
                    <div class="daidai-section">
                        <h4>账户概览</h4>
                        <div class="balance-card">
                            <div class="balance-item">
                                <div class="balance-label">总余额</div>
                                <div class="balance-value">¥<span id="daidai-total-balance">0.00</span></div>
                            </div>
                            <div class="balance-item">
                                <div class="balance-label">密钥数量</div>
                                <div class="balance-value"><span id="daidai-keys-count">0</span></div>
                            </div>
                        </div>
                        <button id="daidai-refresh-btn" class="menu_button">
                            <i class="fa-solid fa-refresh"></i> 刷新数据
                        </button>
                    </div>

                    <!-- 代理状态 -->
                    <div class="daidai-section">
                        <h4>代理服务</h4>
                        <div class="proxy-status">
                            <span>状态: </span>
                            <span id="daidai-proxy-status" class="status-stopped">已停止</span>
                        </div>
                        <div id="daidai-proxy-url" class="proxy-url" style="display: none;">
                            代理地址: <code id="daidai-proxy-url-text"></code>
                            <button class="copy-btn" data-copy-target="daidai-proxy-url-text">
                                <i class="fa-solid fa-copy"></i>
                            </button>
                        </div>
                        <div class="button-group">
                            <button id="daidai-start-proxy" class="menu_button menu_button_positive">
                                <i class="fa-solid fa-sync"></i> 同步 Keys
                            </button>
                        </div>
                    </div>

                    <!-- Keys 列表 -->
                    <div class="daidai-section">
                        <h4>API Keys</h4>
                        <div id="daidai-keys-list" class="keys-list"></div>
                    </div>
                </div>
            </div>
        `;

        $('#extensions_settings2').append(html);
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 登录按钮
        $('#daidai-login-btn').on('click', async function() {
            const email = $('#daidai-email').val().trim();
            const password = $('#daidai-password').val().trim();

            if (!email || !password) {
                showToast('请输入账号和密码', 'error');
                return;
            }

            $(this).prop('disabled', true).text('登录中...');

            const result = await login(email, password);

            if (result.success) {
                showToast('登录成功', 'success');
                await fetchApiKeys();
                updateUI();
            } else {
                showToast(result.error, 'error');
            }

            $(this).prop('disabled', false).text('登录');
        });

        // 退出登录
        $('#daidai-logout-btn').on('click', function() {
            state.token = null;
            state.userData = null;
            state.apiKeys = [];
            state.totalBalance = 0;
            localStorage.removeItem(`${extensionName}_settings`);
            updateUI();
            showToast('已退出登录', 'info');
        });

        // 刷新数据
        $('#daidai-refresh-btn').on('click', async function() {
            $(this).prop('disabled', true);
            const result = await fetchApiKeys();
            if (result.success) {
                showToast('数据已刷新', 'success');
                updateUI();
            } else {
                showToast(result.error, 'error');
            }
            $(this).prop('disabled', false);
        });

        // 同步 Keys
        $('#daidai-start-proxy').on('click', startProxy);

        // 复制按钮
        $(document).on('click', '.copy-btn', function() {
            const target = $(this).data('copy-target');
            const text = $(`#${target}`).text();
            navigator.clipboard.writeText(text);
            showToast('已复制到剪贴板', 'success');
        });
    }

    /**
     * 初始化扩展
     */
    async function init() {
        console.log('DaiDai API Aggregator extension loaded');

        // 加载设置
        loadSettings();

        // 创建 UI
        createUI();

        // 绑定事件
        bindEvents();

        // 更新 UI
        updateUI();

        // 检查代理状态
        checkProxyStatus();
    }

    /**
     * 检查代理运行状态
     */
    async function checkProxyStatus() {
        try {
            const response = await fetch(`http://localhost:${MANAGEMENT_PORT}/status`, {
                signal: AbortSignal.timeout(2000)
            });
            const data = await response.json();
            if (data.running) {
                state.proxyRunning = true;
                // 如果已登录且有 keys，自动同步
                if (state.apiKeys.length > 0) {
                    await syncKeys();
                }
                updateUI();
            }
        } catch (error) {
            // 代理未运行
            state.proxyRunning = false;
            updateUI();
        }
    }

    // 注册扩展
    jQuery(async () => {
        await init();
    });

})();
