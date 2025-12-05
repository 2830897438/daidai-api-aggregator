# DaiDai API Aggregator - SillyTavern 扩展

一个用于 SillyTavern 的扩展，可以聚合多个 DaiDai API keys 并提供统一的本地代理服务，实现负载均衡和自动故障转移。

## 功能特性

- ✅ **账号登录** - 使用 DaiDai 平台账号密码登录
- ✅ **自动获取 Keys** - 自动获取账号下所有可用的 API keys
- ✅ **余额显示** - 实时显示总余额和每个 key 的状态
- ✅ **本地代理** - 启动本地 OpenAI 格式的聚合代理服务器
- ✅ **负载均衡** - 轮询使用所有可用的 API keys
- ✅ **故障转移** - 自动跳过失败的 keys，并重试
- ✅ **流式响应** - 完整支持 OpenAI 流式输出
- ✅ **健康检查** - 实时监控代理状态和 keys 可用性

## 安装方法

### 1. 复制扩展文件

将整个 `daidai` 文件夹复制到 SillyTavern 的扩展目录：

```
SillyTavern/
└── public/
    └── scripts/
        └── extensions/
            └── third-party/
                └── daidai-api-aggregator/    ← 将扩展放在这里
                    ├── manifest.json
                    ├── index.js
                    ├── style.css
                    ├── server.js
                    └── README.md
```

**完整路径示例：**
```
Windows: C:\Users\YourName\SillyTavern\public\scripts\extensions\third-party\daidai-api-aggregator\
Linux/Mac: ~/SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/
```

### 2. 注册后端路由

在 SillyTavern 的 `server.js` 文件中注册扩展的后端路由。

找到 `server.js` 中注册扩展的部分（通常在文件末尾），添加以下代码：

```javascript
// DaiDai API Aggregator Extension
const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
const daidaiRouter = express.Router();
daidaiAggregator.registerEndpoints(daidaiRouter);
app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
```

**注意：** 如果找不到合适的位置，可以在 `server.js` 文件中搜索 `extensions` 或类似的扩展注册代码，并在附近添加。

### 3. 重启 SillyTavern

重启 SillyTavern 服务器以加载扩展。

### 4. 启用扩展

1. 打开 SillyTavern
2. 点击顶部菜单的 **"扩展"** 图标（拼图图标）
3. 在扩展列表中找到 **"DaiDai API Aggregator"**
4. 勾选启用该扩展

## 使用方法

### 1. 登录账号

1. 在扩展面板中输入你的 DaiDai 平台账号和密码
2. 点击 **"登录"** 按钮
3. 登录成功后，扩展会自动获取你账号下的所有 API keys

### 2. 查看余额和 Keys

登录后，你可以看到：
- **总余额** - 所有 keys 的余额总和
- **密钥数量** - 可用的 API keys 数量
- **Keys 列表** - 每个 key 的详细信息（余额、已用额度）

点击 **"刷新数据"** 按钮可以更新最新的余额信息。

### 3. 启动代理服务

1. 点击 **"启动代理"** 按钮
2. 代理服务器将在本地 `http://localhost:5100/v1` 启动
3. 代理地址会显示在面板上，可以点击复制按钮复制地址

### 4. 在 SillyTavern 中使用代理

1. 进入 SillyTavern 的 **API 设置**
2. 选择 **OpenAI** 或兼容的 API 类型
3. 设置 API URL 为：`http://localhost:5100/v1`
4. API Key 可以随意填写（会被代理自动替换）
5. 保存设置并开始使用

### 5. 停止代理

点击 **"停止代理"** 按钮可以停止代理服务器。

## 工作原理

### 架构图

```
┌─────────────────┐
│  SillyTavern   │
│   (前端)        │
└────────┬────────┘
         │
         │ API 请求
         ▼
┌─────────────────┐
│  本地代理服务器  │
│  (localhost:5100)│ ◄── 负载均衡 + 故障转移
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

### 负载均衡策略

1. **轮询机制** - 按顺序轮流使用每个 API key
2. **自动重试** - 如果某个 key 失败，自动尝试下一个 key（最多重试 3 次）
3. **错误计数** - 跟踪每个 key 的错误次数
4. **自动禁用** - 连续失败 3 次的 key 会被临时标记为不可用
5. **自动恢复** - 所有 keys 都不可用时，会重置状态并重新尝试

### 支持的功能

- ✅ 聊天补全 (Chat Completions)
- ✅ 流式输出 (Streaming)
- ✅ 嵌入 (Embeddings)
- ✅ 模型列表 (Models)
- ✅ 所有 OpenAI 兼容的端点

## 配置选项

### 修改代理端口

如果需要修改代理端口（默认 5100），可以编辑 `index.js` 文件：

```javascript
// 在文件开头找到这一行
const PROXY_PORT = 5100;

// 修改为你想要的端口
const PROXY_PORT = 8080;
```

### 修改上游 API 地址

如果你的 DaiDai API 地址不同，可以在 `server.js` 中修改：

```javascript
// 在文件开头找到这一行
const OPENAI_BASE_URL = 'https://api.daidaibird.top/v1';

// 修改为你的 API 地址
const OPENAI_BASE_URL = 'https://your-api.example.com/v1';
```

## 故障排除

### 扩展没有显示

1. 确认文件夹名称是 `daidai-api-aggregator`
2. 确认所有文件都在正确的位置
3. 重启 SillyTavern
4. 检查浏览器控制台是否有错误消息

### 登录失败

1. 检查账号和密码是否正确
2. 确认网络连接正常
3. 检查 DaiDai 平台是否正常运行

### 代理启动失败

1. 确认已正确注册后端路由（参见安装步骤 2）
2. 检查端口 5100 是否被占用
3. 查看 SillyTavern 服务器日志获取详细错误信息
4. 确认 `node-fetch` 依赖已安装

### API 请求失败

1. 确认代理服务器正在运行（状态显示"运行中"）
2. 检查是否有可用的 API keys
3. 确认 keys 有足够的余额
4. 查看代理服务器日志了解详细错误

### 安装依赖

如果遇到 `node-fetch` 未找到的错误，在 SillyTavern 目录下运行：

```bash
npm install node-fetch
```

## 安全建议

- 🔒 不要分享你的登录凭证
- 🔒 代理服务器仅绑定到 `127.0.0.1`（本地回环地址），外部无法访问
- 🔒 API keys 仅存储在浏览器的 localStorage 中
- 🔒 建议定期更换密码和 API keys

## 技术栈

- **前端**: JavaScript (Vanilla), jQuery
- **后端**: Node.js, Express
- **API**: RESTful, OpenAI Compatible

## 更新日志

### v1.0.0 (2024-12-05)

- ✨ 初始版本发布
- ✅ 账号登录和 key 获取
- ✅ 本地代理服务器
- ✅ 负载均衡和故障转移
- ✅ UI 界面和余额显示

## 许可证

MIT License

## 支持

如果遇到问题或有功能建议，请联系：
- **Email**: support@daidaibird.top
- **Website**: https://api.daidaibird.top

---

**享受聚合 API keys 带来的便利吧！** 🎉
