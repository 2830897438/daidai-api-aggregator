# DaiDai API Aggregator - SillyTavern 扩展

一个用于 SillyTavern 的扩展，可以聚合多个 DaiDai API keys 并提供统一的本地代理服务，实现负载均衡和自动故障转移。

**✨ 安装即用，完全零配置！**

## 功能特性

- ✅ **安装即用** - 安装扩展后自动运行，无需任何配置
- ✅ **自动启动** - SillyTavern 启动时自动加载代理服务
- ✅ **前端控制** - 登录后自动同步 keys
- ✅ **负载均衡** - 轮询使用所有可用的 API keys
- ✅ **故障转移** - 自动跳过失败的 keys
- ✅ **流式响应** - 完整支持 OpenAI 流式输出

---

## 🚀 超简单安装

### 步骤 1: 安装扩展

1. 打开 SillyTavern
2. 点击顶部的 **扩展** 图标（🧩）
3. 点击 **"从 URL 安装"**
4. 粘贴：`https://github.com/2830897438/daidai-api-aggregator`
5. 点击 **安装** 并 **启用扩展**

**完成！** 代理服务已自动启动。

---

## 🎉 开始使用

安装完成后，使用非常简单：

1. **打开 SillyTavern** - 扩展自动加载
2. **登录** - 在扩展面板输入 DaiDai 账号密码
3. **同步 Keys** - 点击"同步 Keys"按钮
4. **配置 API** - 在 API 设置中使用：`http://localhost:5100/v1`
5. **开始聊天** - API Key 随意填写（会被代理自动替换）

**就这么简单！**

---

## 📖 工作原理

### 架构设计

```
┌─────────────────┐
│  SillyTavern   │
│   启动时...     │
└────────┬────────┘
         │ 自动加载
         ▼
┌─────────────────┐
│  扩展 server.js │ ← 自动启动代理服务
│  (自动运行)     │    (完全零配置)
└────────┬────────┘
         │
         ├─→ Port 5100: OpenAI 代理
         └─→ Port 5101: 管理 API

         ▼
┌─────────────────┐
│   扩展面板      │ ← 登录、同步 Keys
│  (前端 UI)      │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│   API Key 池    │
│  ┌───┬───┬───┐  │
│  │K1 │K2 │K3 │  │  ← 你的多个 API keys
│  └───┴───┴───┘  │
└────────┬────────┘
         │
         │ 轮询使用
         ▼
┌─────────────────┐
│  DaiDai API     │
│  (上游服务器)    │
└─────────────────┘
```

### 使用流程

1. **一次性安装** - 从 GitHub 安装扩展
2. **自动启动** - SillyTavern 启动时自动加载
3. **登录同步** - 在扩展面板登录并同步 keys
4. **开始使用** - 在 API 设置中配置代理地址

**完全不需要运行任何命令！**

---

## ⚙️ 常见操作

### 查看代理状态

在浏览器访问：
```
http://localhost:5100/health
```

### 手动同步 Keys

在扩展面板点击 **"同步 Keys"** 按钮。

### 停止代理

重启 SillyTavern 即可。

### 查看日志

在 SillyTavern 的控制台查看日志输出。

---

## 🐛 故障排除

### Q: 代理未运行？

**解决方案：**
1. 确认 SillyTavern 已正常启动
2. 检查 SillyTavern 控制台是否有错误
3. 访问 http://localhost:5100/health 确认代理状态

### Q: 提示 "node-fetch not found"？

**解决方案：**
在扩展目录运行：
```bash
cd SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator
npm install
```

### Q: Keys 没有同步？

**解决方案：**
1. 确认代理正在运行（访问 http://localhost:5100/health）
2. 点击 **"同步 Keys"** 按钮手动同步
3. 检查浏览器控制台（F12）查看错误信息

### Q: 端口被占用？

**解决方案：**
如果端口 5100 或 5101 被占用，可能已有其他程序在使用。
检查是否有其他代理服务在运行，或修改 server.js 中的端口号。

---

## 📁 文件结构

```
daidai-api-aggregator/
├── manifest.json         # 扩展清单
├── index.js              # 前端主文件
├── style.css             # 样式文件
├── server.js             # 后端代理服务（核心）
├── package.json          # 依赖配置
└── README.md             # 主文档（本文件）
```

---

## 🔐 安全建议

- 🔒 不要分享你的登录凭证
- 🔒 代理服务器仅绑定到 `127.0.0.1`，外部无法访问
- 🔒 Keys 缓存在本地文件 `.keys-cache.json`
- 🔒 建议定期更换密码和 API keys

---

## 🛠️ 技术栈

- **前端**: JavaScript (Vanilla), jQuery
- **后端**: Node.js, Express, node-fetch
- **API**: RESTful, OpenAI Compatible

---

## 📝 更新日志

### v5.0.0 (2024-12-05)

- 🎉 **完全零配置，安装即用**
- ✨ SillyTavern 启动时自动加载
- ✨ 无需任何手动脚本或命令
- ✨ 扩展后端自动启动代理服务
- 🎯 用户只需安装扩展，打开 SillyTavern 即可使用

### v4.0.0 (2024-12-05)

- 🎉 **双击安装，永久生效**
- ✨ 独立守护进程（proxy-daemon.js）
- ✨ 开机自启动支持

### v3.0.0 (2024-12-05)

- ✨ 自动配置脚本

### v2.0.0 (2024-12-05)

- ✨ 独立代理服务器

### v1.0.0 (2024-12-05)

- ✨ 初始版本发布

---

## 📞 支持

如果遇到问题或有功能建议，请联系：
- **Email**: support@daidaibird.top
- **Website**: https://api.daidaibird.top
- **GitHub**: https://github.com/2830897438/daidai-api-aggregator

---

**享受完全零配置的便利吧！** 🎉
