# 快速开始指南

## 5 分钟上手

### 步骤 1: 安装扩展 (2 分钟)

1. 将 `daidai-api-aggregator` 文件夹复制到：
   ```
   SillyTavern/public/scripts/extensions/third-party/
   ```

2. 编辑 `SillyTavern/server.js`，在文件中添加：
   ```javascript
   const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
   const daidaiRouter = express.Router();
   daidaiAggregator.registerEndpoints(daidaiRouter);
   app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
   ```

3. 重启 SillyTavern

### 步骤 2: 配置扩展 (1 分钟)

1. 打开 SillyTavern，点击 **扩展** 图标
2. 启用 **DaiDai API Aggregator**
3. 输入你的账号和密码，点击 **登录**

### 步骤 3: 启动代理 (30 秒)

1. 登录成功后，查看你的余额和 keys
2. 点击 **启动代理** 按钮
3. 复制代理地址：`http://localhost:5100/v1`

### 步骤 4: 在 SillyTavern 中使用 (1.5 分钟)

1. 进入 SillyTavern 的 **API 设置**
2. 选择 **OpenAI** 或兼容类型
3. 设置 API URL：`http://localhost:5100/v1`
4. API Key 随意填写（会被自动替换）
5. 保存并测试连接
6. 开始聊天！

## 核心功能速览

### 登录管理
- ✅ 账号密码登录
- ✅ 自动获取所有 API keys
- ✅ 本地安全存储

### 余额监控
- ✅ 实时显示总余额
- ✅ 查看每个 key 的详细信息
- ✅ 一键刷新数据

### 代理服务
- ✅ 一键启动/停止
- ✅ OpenAI 完全兼容
- ✅ 轮询负载均衡
- ✅ 自动故障转移
- ✅ 流式输出支持

## 常用操作

### 刷新余额
```
点击 "刷新数据" 按钮
```

### 查看代理状态
```
代理状态显示 "运行中" = 正常工作
代理状态显示 "已停止" = 需要启动
```

### 更换账号
```
点击 "退出登录" → 输入新账号 → 点击 "登录"
```

### 复制代理地址
```
点击代理地址旁边的复制按钮
```

## 工作原理

```
你的请求 → 本地代理 → 自动选择可用的 key → DaiDai API → 返回响应
           (localhost:5100)   (负载均衡 + 故障转移)
```

## 技术特性

### 负载均衡
- 轮询算法，均匀分配请求
- 自动跳过失败的 keys
- 智能错误计数和恢复

### 容错机制
- 连续失败 3 次自动禁用 key
- 自动切换到其他可用 keys
- 最多重试 3 次
- 所有 keys 失败时自动重置

### 支持的 API
- ✅ Chat Completions（聊天补全）
- ✅ Streaming（流式输出）
- ✅ Embeddings（嵌入）
- ✅ Models（模型列表）
- ✅ 所有 OpenAI 兼容端点

## 最佳实践

### 1. 定期刷新余额
- 每次使用前刷新一次
- 确保 keys 状态最新

### 2. 监控代理状态
- 确保代理显示 "运行中"
- 遇到问题先检查代理状态

### 3. 合理使用 keys
- 不要同时在多个地方使用同一组 keys
- 避免频繁切换账号

### 4. 保持登录状态
- 登录信息会本地缓存
- 下次打开自动恢复

### 5. 安全建议
- 不要分享你的登录凭证
- 定期更换密码
- 仅在可信设备上使用

## 性能优化

### 提高响应速度
1. 确保网络连接稳定
2. 清理无用的 keys
3. 关闭其他占用带宽的程序

### 减少失败率
1. 使用余额充足的 keys
2. 避免超出速率限制
3. 定期检查 keys 状态

## 故障排除速查表

| 问题 | 解决方案 |
|------|----------|
| 扩展不显示 | 检查文件路径，重启 SillyTavern |
| 登录失败 | 确认账号密码，检查网络 |
| 代理无法启动 | 确认已修改 server.js，检查端口 |
| 请求失败 | 检查余额，刷新 keys 状态 |
| 连接超时 | 检查代理是否运行，确认地址正确 |

## 高级配置

### 修改代理端口

编辑 `index.js`：
```javascript
const PROXY_PORT = 5100;  // 改成你想要的端口
```

### 修改上游 API

编辑 `server.js`：
```javascript
const OPENAI_BASE_URL = 'https://api.daidaibird.top/v1';  // 改成你的 API 地址
```

### 调整重试次数

编辑 `server.js`：
```javascript
const maxAttempts = Math.min(3, keyManager.keys.length);  // 改成你想要的次数
```

## API 端点说明

扩展提供以下后端 API：

| 端点 | 方法 | 功能 |
|------|------|------|
| `/start-proxy` | POST | 启动代理服务器 |
| `/stop-proxy` | POST | 停止代理服务器 |
| `/proxy-status` | GET | 获取代理状态 |
| `/update-keys` | POST | 更新 keys 列表 |

健康检查端点（代理运行时）：
```
http://localhost:5100/health
```

## 调试技巧

### 查看浏览器日志
```
按 F12 → Console 标签 → 查看输出
```

### 查看服务器日志
```
查看 SillyTavern 启动终端的输出
```

### 测试代理连接
```
curl http://localhost:5100/health
```

### 查看 keys 统计
```
访问 http://localhost:5100/health
返回 JSON 包含 keys 统计信息
```

## 更多帮助

- 详细文档：`README.md`
- 安装指南：`INSTALL.md`
- 问题反馈：support@daidaibird.top

---

**开始享受聚合 API 的便利吧！** 🚀
