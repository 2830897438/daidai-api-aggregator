# 通过 SillyTavern 扩展管理器安装

## 方法 1: 自动安装（推荐）⚡

### 步骤 1: 打开扩展管理器

1. 启动 SillyTavern
2. 点击顶部菜单的 **扩展** 图标（拼图图标 🧩）
3. 点击 **"从 URL 安装"** 或 **"Install from URL"** 按钮

### 步骤 2: 输入仓库 URL

在输入框中粘贴以下 URL：

```
https://github.com/2830897438/daidai-api-aggregator
```

### 步骤 3: 安装

1. 点击 **安装** 或 **Install** 按钮
2. 等待安装完成
3. 安装完成后，扩展会自动出现在列表中

### 步骤 4: 启用扩展

1. 在扩展列表中找到 **"DaiDai API Aggregator"**
2. 勾选以启用扩展
3. 页面会刷新并加载扩展

### 步骤 5: 配置后端（重要！）⚠️

**这一步必须手动完成，否则代理功能无法使用：**

1. 打开 SillyTavern 安装目录下的 `server.js` 文件
2. 找到扩展注册部分（通常在文件末尾，搜索 `extensions` 或 `router`）
3. 添加以下代码：

```javascript
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
```

4. 保存文件并**重启 SillyTavern**

### 步骤 6: 开始使用

1. 在扩展面板中输入你的 DaiDai 账号和密码
2. 点击 **登录**
3. 查看余额和 API keys
4. 点击 **启动代理**
5. 在 API 设置中使用代理地址：`http://localhost:5100/v1`

---

## 方法 2: 手动安装

如果自动安装失败，可以手动安装：

### 下载源代码

1. 访问：https://github.com/2830897438/daidai-api-aggregator
2. 点击绿色的 **Code** 按钮
3. 选择 **Download ZIP**
4. 解压文件

### 复制到 SillyTavern

将解压后的文件夹复制到：
```
SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/
```

### 后续步骤

按照方法 1 的步骤 4-6 继续操作。

---

## 验证安装

### 检查文件

确认以下文件存在：
```
SillyTavern/public/scripts/extensions/third-party/daidai-api-aggregator/
├── manifest.json
├── index.js
├── style.css
├── server.js
└── README.md
```

### 检查日志

打开浏览器控制台（F12），查看是否有以下输出：
```
DaiDai API Aggregator extension loaded
```

在 SillyTavern 服务器终端，查看是否有：
```
[DaiDai API Aggregator] Server endpoints registered
```

---

## 常见问题

### Q: 扩展安装后不显示？

**解决方案：**
1. 刷新浏览器页面（Ctrl+F5 或 Cmd+R）
2. 清除浏览器缓存
3. 重启 SillyTavern

### Q: 代理无法启动？

**解决方案：**
1. 确认已完成步骤 5（修改 server.js）
2. 确认已重启 SillyTavern
3. 检查服务器日志是否有错误
4. 确认端口 5100 未被占用

### Q: 从 URL 安装失败？

**解决方案：**
1. 检查网络连接
2. 尝试使用 VPN
3. 使用方法 2 手动安装

---

## 快速链接

- **GitHub 仓库**: https://github.com/2830897438/daidai-api-aggregator
- **安装 URL**: `https://github.com/2830897438/daidai-api-aggregator`
- **详细文档**: https://github.com/2830897438/daidai-api-aggregator/blob/main/README.md
- **安装指南**: https://github.com/2830897438/daidai-api-aggregator/blob/main/INSTALL.md
- **快速开始**: https://github.com/2830897438/daidai-api-aggregator/blob/main/QUICKSTART.md

---

## 一键复制安装 URL

```
https://github.com/2830897438/daidai-api-aggregator
```

---

**享受聚合 API 的便利！** 🎉
