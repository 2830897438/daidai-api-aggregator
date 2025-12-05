# DaiDai API Aggregator - SillyTavern 扩展

一个用于 SillyTavern 的扩展，可以聚合多个 DaiDai API keys 并提供统一的本地代理服务，实现负载均衡和自动故障转移。

**🎉 无需修改 SillyTavern 任何文件！**

## 功能特性

- ✅ **账号登录** - 使用 DaiDai 平台账号密码登录
- ✅ **自动获取 Keys** - 自动获取账号下所有可用的 API keys
- ✅ **余额显示** - 实时显示总余额和每个 key 的状态
- ✅ **本地代理** - 启动本地 OpenAI 格式的聚合代理服务器
- ✅ **负载均衡** - 轮询使用所有可用的 API keys
- ✅ **故障转移** - 自动跳过失败的 keys，并重试
- ✅ **流式响应** - 完整支持 OpenAI 流式输出
- ✅ **健康检查** - 实时监控代理状态和 keys 可用性
- ✅ **零配置** - 无需修改 SillyTavern 的任何文件

---

## 🚀 快速开始（3步安装）

### 步骤 1: 安装扩展

1. 打开 SillyTavern
2. 点击顶部的 **扩展** 图标（🧩）
3. 点击 **"从 URL 安装"**
4. 粘贴：`https://github.com/2830897438/daidai-api-aggregator`
5. 点击 **安装** 并 **启用扩展**

### 步骤 2: 启动代理服务器

找到扩展安装目录并运行启动脚本：

**Windows:**
```
双击运行: SillyTavern\public\scripts\extensions\third-party\daidai-api-aggregator\start-proxy.bat
```

**Linux/Mac:**
```bash
cd SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator
./start-proxy.sh
```

看到以下输出说明启动成功：
```
✅ OpenAI Proxy: http://localhost:5100/v1
✅ Management API: http://localhost:5101
```

### 步骤 3: 登录并使用

1. 在 SillyTavern 扩展面板中输入 DaiDai 账号密码
2. 点击 **登录**
3. 登录成功后，keys 会自动同步到代理服务器
4. 在 API 设置中使用代理地址：`http://localhost:5100/v1`
5. API Key 随意填写（会被代理自动替换）
6. 开始聊天！

---

## 📖 详细说明

### 架构设计

```
┌─────────────────┐
│  SillyTavern   │
│   扩展面板      │ ← 登录、查看余额、管理
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│ 独立代理服务器   │ ← 负载均衡 + 故障转移
│  (standalone)   │    (无需修改 ST)
└────────┬────────┘
         │
         │ 轮询使用
         ▼
┌─────────────────┐
│   API Key 池    │
│  ┌───┬───┬───┐  │
│  │K1 │K2 │K3 │  │  ← 你的多个 API keys
│  └───┴───┴───┘  │
└────────┬────────┘
         │
         │ 转发请求
         ▼
┌─────────────────┐
│  DaiDai API     │
│  (上游服务器)    │
└─────────────────┘
```

### 工作流程

1. **用户在扩展面板登录** → 获取所有 API keys
2. **运行独立代理服务器** → 监听端口 5100(代理) 和 5101(管理)
3. **扩展自动同步 keys** → 通过 5101 端口发送到代理
4. **SillyTavern 发送请求** → 代理服务器轮询使用 keys
5. **自动负载均衡** → 失败自动切换下一个 key

### 为什么不需要修改 server.js？

传统方案需要修改 `SillyTavern/server.js` 来注册后端路由，这对用户来说太复杂。

**新方案**：使用完全独立的代理服务器程序，通过 HTTP API 与扩展通信，无需任何配置！

---

## 🎯 常见操作

### 查看代理状态

在浏览器访问：
```
http://localhost:5100/health
```

返回 JSON：
```json
{
  "status": "ok",
  "keys": {
    "total": 4,
    "available": 4,
    "unavailable": 0
  }
}
```

### 刷新余额

点击扩展面板的 **"刷新数据"** 按钮

### 更换账号

点击 **"退出登录"** → 输入新账号 → 点击 **"登录"**

### 重启代理

1. 在代理服务器终端按 `Ctrl+C` 停止
2. 重新运行启动脚本

---

## ⚙️ 配置选项

### 修改代理端口

编辑 `standalone-proxy.js`：
```javascript
const PROXY_PORT = 5100;       // OpenAI 代理端口
const MANAGEMENT_PORT = 5101;  // 管理 API 端口
```

同时修改 `index.js`：
```javascript
const PROXY_PORT = 5100;
const MANAGEMENT_PORT = 5101;
```

### 修改上游 API

编辑 `standalone-proxy.js`：
```javascript
const OPENAI_BASE_URL = 'https://api.daidaibird.top/v1';
```

---

## 🐛 故障排除

### Q: 扩展不显示？

**解决方案：**
1. 确认扩展已安装到正确位置
2. 刷新浏览器（Ctrl+F5）
3. 重启 SillyTavern

### Q: 代理无法启动？

**解决方案：**
1. 确认 Node.js 已安装
2. 检查端口 5100 和 5101 是否被占用
3. 在扩展目录运行 `npm install` 安装依赖

### Q: 提示 "Unexpected token '<'"？

这是旧版本的错误！请更新到最新版本：
1. 删除旧的扩展
2. 重新从 URL 安装
3. 按照新的安装步骤操作

### Q: Keys 没有自动同步？

**解决方案：**
1. 确认代理服务器正在运行
2. 点击 **"刷新状态"** 按钮
3. 点击 **"同步 Keys"** 按钮手动同步

### Q: 请求失败 / 连接超时？

**解决方案：**
1. 检查代理状态（应该显示"运行中"）
2. 确认 keys 有足够的余额
3. 查看代理服务器终端日志
4. 测试健康检查端点：`http://localhost:5100/health`

---

## 📁 文件结构

```
daidai-api-aggregator/
├── manifest.json              # 扩展清单
├── index.js                   # 前端主文件
├── style.css                  # 样式文件
├── standalone-proxy.js        # 独立代理服务器（核心）
├── start-proxy.bat            # Windows 启动脚本
├── start-proxy.sh             # Linux/Mac 启动脚本
├── package.json               # 依赖配置
├── README.md                  # 主文档（本文件）
├── QUICKSTART.md              # 快速开始指南
└── .gitignore                 # Git 忽略文件
```

---

## 🔐 安全建议

- 🔒 不要分享你的登录凭证
- 🔒 代理服务器仅绑定到 `127.0.0.1`，外部无法访问
- 🔒 API keys 缓存在本地文件 `.keys-cache.json`
- 🔒 建议定期更换密码和 API keys

---

## 🛠️ 技术栈

- **前端**: JavaScript (Vanilla), jQuery
- **后端**: Node.js, Express
- **API**: RESTful, OpenAI Compatible

---

## 📝 更新日志

### v2.0.0 (2024-12-05)

- 🎉 **重大更新：零配置安装**
- ✨ 独立代理服务器，无需修改 SillyTavern
- ✨ 一键启动脚本（Windows/Linux/Mac）
- ✨ 自动 keys 同步
- ✨ 实时状态监控
- 🐛 修复了需要修改 server.js 的问题

### v1.0.0 (2024-12-05)

- ✨ 初始版本发布
- ✅ 账号登录和 key 获取
- ✅ 本地代理服务器
- ✅ 负载均衡和故障转移

---

## 📞 支持

如果遇到问题或有功能建议，请联系：
- **Email**: support@daidaibird.top
- **Website**: https://api.daidaibird.top
- **GitHub**: https://github.com/2830897438/daidai-api-aggregator

---

**享受聚合 API keys 带来的便利吧！** 🎉
