# DaiDai API Aggregator - SillyTavern 扩展

一个用于 SillyTavern 的扩展，可以聚合多个 DaiDai API keys 并提供统一的本地代理服务，实现负载均衡和自动故障转移。

**✨ 双击安装，永久生效！**

## 功能特性

- ✅ **双击安装** - 一次性安装，永久生效
- ✅ **开机自启** - 代理服务开机自动启动（可选）
- ✅ **前端控制** - 登录后自动同步 keys
- ✅ **负载均衡** - 轮询使用所有可用的 API keys
- ✅ **故障转移** - 自动跳过失败的 keys
- ✅ **流式响应** - 完整支持 OpenAI 流式输出

---

## 🚀 超简单安装（1步）

### 步骤 1: 安装扩展

1. 打开 SillyTavern
2. 点击顶部的 **扩展** 图标（🧩）
3. 点击 **"从 URL 安装"**
4. 粘贴：`https://github.com/2830897438/daidai-api-aggregator`
5. 点击 **安装** 并 **启用扩展**

### 步骤 2: 双击安装

进入扩展安装目录，**双击** `install.bat`（Windows）：

```
SillyTavern\public\scripts\extensions\third-party\daidai-api-aggregator\install.bat
```

**Linux/Mac 用户：**
```bash
cd SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator
chmod +x install.sh
./install.sh
```

**安装脚本会自动：**
- ✅ 安装依赖
- ✅ 启动代理服务
- ✅ （可选）设置开机自启动

**完成！**

---

## 🎉 开始使用

安装完成后，每次使用非常简单：

1. **打开 SillyTavern**
2. **登录** - 在扩展面板输入 DaiDai 账号密码
3. **自动同步** - Keys 会自动同步到代理
4. **配置 API** - 在 API 设置中使用：`http://localhost:5100/v1`
5. **开始聊天** - API Key 随意填写（会被代理自动替换）

**就这么简单！**

---

## 📖 工作原理

### 架构设计

```
┌─────────────────┐
│  SillyTavern   │
│   扩展面板      │ ← 登录、查看余额
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  独立代理守护进程 │ ← 负载均衡 + 故障转移
│  (后台自启动)    │    (开机自动运行)
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

### 使用流程

1. **一次性安装** - 双击 `install.bat`（只需一次）
2. **以后每次使用**：
   - 打开 SillyTavern
   - 登录账号
   - Keys 自动同步到代理
   - 开始聊天！

**无需手动运行任何后端命令！**

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

**Windows:**
```
双击: stop-daemon.bat
```

**Linux/Mac:**
```bash
# 如果设置了 systemd 服务
sudo systemctl stop daidai-proxy

# 如果手动启动
pkill -f proxy-daemon.js
```

### 查看日志

```
proxy.log
```

### 卸载开机自启动

**Windows:**
删除文件：
```
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\DaiDaiProxy.vbs
```

**Linux:**
```bash
sudo systemctl disable daidai-proxy
sudo systemctl stop daidai-proxy
```

---

## 🐛 故障排除

### Q: 代理未运行？

**解决方案：**
1. 确认已运行 `install.bat`
2. 检查是否有错误消息
3. 查看 `proxy.log` 日志文件

### Q: 提示 "node-fetch not found"？

**解决方案：**
在扩展目录运行：
```bash
npm install
```

### Q: Keys 没有同步？

**解决方案：**
1. 确认代理正在运行（访问 http://localhost:5100/health）
2. 点击 **"同步 Keys"** 按钮手动同步
3. 检查浏览器控制台（F12）查看错误信息

### Q: 如何确认代理运行成功？

**解决方案：**
打开浏览器访问：`http://localhost:5100/health`
如果返回 JSON 数据，说明代理正在运行。

---

## 📁 文件结构

```
daidai-api-aggregator/
├── manifest.json              # 扩展清单
├── index.js                   # 前端主文件
├── style.css                  # 样式文件
├── proxy-daemon.js            # 代理守护进程（核心）
├── install.bat                # Windows 安装脚本
├── install.sh                 # Linux/Mac 安装脚本
├── install-autostart.js       # 设置开机自启动
├── stop-daemon.bat            # 停止代理（Windows）
├── package.json               # 依赖配置
└── README.md                  # 主文档（本文件）
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

### v4.0.0 (2024-12-05)

- 🎉 **双击安装，永久生效**
- ✨ 独立守护进程（proxy-daemon.js）
- ✨ 开机自启动支持
- ✨ 无需任何后端配置
- ✨ 完全自动化的用户体验
- 🎯 用户完全不需要在后端运行命令

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

**享受双击安装的便利吧！** 🎉
