# 安装指南

## 快速安装（推荐）

### 方法 1: 手动安装

1. **下载扩展**
   - 下载整个 `daidai-api-aggregator` 文件夹

2. **复制到 SillyTavern**

   将文件夹复制到以下路径：
   ```
   SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/
   ```

   完整路径示例：
   - Windows: `C:\Users\你的用户名\SillyTavern\public\scripts\extensions\third-party\daidai-api-aggregator\`
   - Linux/Mac: `~/SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/`

3. **修改 SillyTavern 的 server.js**

   打开 `SillyTavern/server.js` 文件，找到扩展注册部分（通常在文件末尾），添加以下代码：

   ```javascript
   // DaiDai API Aggregator Extension
   const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
   const daidaiRouter = express.Router();
   daidaiAggregator.registerEndpoints(daidaiRouter);
   app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
   ```

   **插入位置建议：**

   搜索类似这样的代码块：
   ```javascript
   // Extension endpoints
   app.use('/api/extensions', router);
   ```

   在它之后添加上面的代码。

4. **安装依赖（如果需要）**

   在 SillyTavern 根目录下运行：
   ```bash
   npm install node-fetch
   ```

5. **重启 SillyTavern**

   关闭并重新启动 SillyTavern 服务器。

6. **启用扩展**

   - 打开 SillyTavern 网页界面
   - 点击顶部的 **扩展** 图标（拼图图标）
   - 找到 **DaiDai API Aggregator**
   - 勾选启用

### 方法 2: Git Clone（开发者）

```bash
cd SillyTavern/public/scripts/extensions/third-party/
git clone <repository-url> daidai-api-aggregator
cd daidai-api-aggregator
npm install
```

然后按照方法 1 的步骤 3-6 继续操作。

## 详细配置说明

### server.js 完整示例

如果你不确定如何修改 `server.js`，以下是一个完整的示例：

```javascript
// ... 其他代码 ...

// 在文件接近末尾的地方，找到或创建扩展注册区域

// ========== 扩展注册区域 ==========

// DaiDai API Aggregator Extension
try {
    const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
    const daidaiRouter = express.Router();
    daidaiAggregator.registerEndpoints(daidaiRouter);
    app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
    console.log('DaiDai API Aggregator extension loaded');
} catch (error) {
    console.error('Failed to load DaiDai API Aggregator extension:', error);
}

// ===================================

// ... 其他代码 ...

// 启动服务器
const server = app.listen(serverPort, serverHost, () => {
    // ... 服务器启动代码 ...
});
```

**重要提示：**
- 使用 `try-catch` 块可以避免扩展加载失败导致整个服务器无法启动
- 确保在 `app.listen()` 之前注册扩展路由

## 验证安装

### 1. 检查文件结构

确认以下文件存在：
```
SillyTavern/
└── public/
    └── scripts/
        └── extensions/
            └── third-party/
                └── daidai-api-aggregator/
                    ├── manifest.json
                    ├── index.js
                    ├── style.css
                    ├── server.js
                    ├── package.json
                    ├── README.md
                    └── INSTALL.md
```

### 2. 检查浏览器控制台

打开 SillyTavern，按 `F12` 打开开发者工具，查看控制台输出：

**成功的标志：**
```
DaiDai API Aggregator extension loaded
```

**如果看到错误：**
- 检查文件路径是否正确
- 确认所有文件都已复制
- 查看完整的错误消息

### 3. 检查服务器日志

在 SillyTavern 服务器的终端/命令行窗口中，应该看到：
```
DaiDai API Aggregator extension loaded
[DaiDai API Aggregator] Server endpoints registered
```

### 4. 测试扩展功能

1. 打开扩展面板
2. 输入账号密码并登录
3. 查看是否能成功获取 API keys
4. 尝试启动代理服务器

## 常见问题

### Q1: 扩展没有出现在列表中

**解决方案：**
1. 确认文件夹名称是 `daidai-api-aggregator`（不是其他名称）
2. 确认 `manifest.json` 文件存在且格式正确
3. 清除浏览器缓存并刷新页面
4. 重启 SillyTavern 服务器

### Q2: 登录功能正常，但代理无法启动

**解决方案：**
1. 确认已正确修改 `server.js` 并注册了后端路由
2. 检查服务器日志是否有错误消息
3. 确认端口 5100 没有被其他程序占用
4. 尝试修改代理端口（编辑 `index.js` 中的 `PROXY_PORT`）

### Q3: 提示 "node-fetch" 模块未找到

**解决方案：**
```bash
cd SillyTavern
npm install node-fetch
```

然后重启服务器。

### Q4: server.js 找不到合适的位置添加代码

**解决方案：**

如果你的 `server.js` 结构不同，可以：

1. 在 `server.js` 末尾，`app.listen()` 之前的任意位置添加
2. 或者搜索 `router` 或 `express.Router()` 找到类似的扩展注册代码
3. 如果实在找不到，可以在文件末尾、`app.listen()` 之前添加

示例：
```javascript
// ... 其他代码 ...

// 在这里添加扩展注册代码
const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
const daidaiRouter = express.Router();
daidaiAggregator.registerEndpoints(daidaiRouter);
app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);

// 启动服务器
const server = app.listen(serverPort, serverHost, () => {
    console.log('Server listening on ' + serverHost + ':' + serverPort);
});
```

### Q5: 代理启动后，SillyTavern 还是无法连接

**解决方案：**
1. 确认代理状态显示为"运行中"
2. 检查代理地址是否为 `http://localhost:5100/v1`（注意 `/v1` 后缀）
3. 在 SillyTavern 的 API 设置中：
   - API 类型选择 **OpenAI**
   - API URL 填写：`http://localhost:5100/v1`
   - API Key 随意填写（会被代理替换）
4. 测试连接

### Q6: 所有 keys 都显示不可用

**解决方案：**
1. 检查每个 key 的余额是否充足
2. 确认 keys 状态为 "success" 且没有错误
3. 点击"刷新数据"按钮更新状态
4. 检查代理服务器日志查看详细错误
5. 尝试停止并重新启动代理

## 卸载扩展

如果你想卸载扩展：

1. **停止代理服务器**
   - 在扩展面板中点击"停止代理"

2. **禁用扩展**
   - 在 SillyTavern 扩展列表中取消勾选

3. **删除文件**
   - 删除 `SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/` 文件夹

4. **移除 server.js 中的代码**
   - 打开 `SillyTavern/server.js`
   - 删除之前添加的扩展注册代码：
   ```javascript
   // 删除这些行
   const daidaiAggregator = require('./public/scripts/extensions/third-party/daidai-api-aggregator/server.js');
   const daidaiRouter = express.Router();
   daidaiAggregator.registerEndpoints(daidaiRouter);
   app.use('/api/extensions/daidai-api-aggregator', daidaiRouter);
   ```

5. **重启 SillyTavern**

## 获取帮助

如果遇到其他问题：

1. **检查日志**
   - 浏览器控制台（F12）
   - SillyTavern 服务器终端输出

2. **提供信息**
   - SillyTavern 版本
   - 操作系统
   - 错误消息截图
   - 相关日志

3. **联系支持**
   - Email: support@daidaibird.top
   - Website: https://api.daidaibird.top

---

**祝你使用愉快！** 🎉
