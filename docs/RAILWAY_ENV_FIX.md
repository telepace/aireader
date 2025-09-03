# Railway 环境变量修复方案

## 🔍 问题分析

在 Railway 部署 React 应用时遇到"未找到API密钥"错误的根本原因：

### React 环境变量的构建时特性
- React 应用的环境变量（`REACT_APP_*`）是在**构建时**被嵌入到代码中的
- Railway 可能在构建完成后才注入环境变量，导致构建时变量为空
- 即使在 Railway 面板中配置了环境变量，如果构建时不可用，也不会生效

## 🛠️ 解决方案：运行时配置注入

我们实现了一个混合方案，同时支持构建时和运行时环境变量：

### 1. 运行时配置文件 (`public/config.js`)
```javascript
window.ENV = {
  REACT_APP_OPENROUTER_API_KEY: "__REACT_APP_OPENROUTER_API_KEY__",
  REACT_APP_APP_NAME: "__REACT_APP_APP_NAME__",
  REACT_APP_APP_VERSION: "__REACT_APP_APP_VERSION__"
};
```

### 2. 构建后环境变量注入脚本 (`scripts/inject-runtime-config.js`)
- 在构建完成后自动运行
- 将环境变量注入到 `build/config.js` 文件中
- 生成带时间戳的调试信息

### 3. API 服务双重检查机制 (`src/services/api.ts`)
```javascript
const getApiKey = (modelName: string): string => {
  // 优先级：运行时配置 > 构建时环境变量
  let apiKey = '';
  
  // 1. 尝试从运行时配置获取
  const runtimeKey = (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY;
  if (runtimeKey && runtimeKey !== '__REACT_APP_OPENROUTER_API_KEY__') {
    apiKey = runtimeKey;
  }
  
  // 2. 如果运行时配置不可用，尝试构建时环境变量
  if (!apiKey) {
    apiKey = process.env.REACT_APP_OPENROUTER_API_KEY || '';
  }
  
  // 3. 验证和错误处理...
};
```

### 4. Dockerfile 优化
- 使用 `npm run build:railway` 命令
- 自动调用运行时配置注入脚本
- 包含构建验证步骤

## 🚀 部署流程

### Railway 上的配置步骤：

1. **确保环境变量已配置**
   - 在 Railway 项目设置中配置：
     - `REACT_APP_OPENROUTER_API_KEY`
     - `REACT_APP_APP_NAME`（可选）
     - `REACT_APP_APP_VERSION`（可选）

2. **触发重新部署**
   - 环境变量设置后，必须重新部署才能生效
   - 推送新代码或手动触发部署

3. **验证部署**
   - 检查部署日志中的构建输出
   - 访问 `/health.html` 查看部署状态

## 🔧 本地开发

### 本地环境设置：
```bash
# .env 文件
REACT_APP_OPENROUTER_API_KEY=your_api_key_here
REACT_APP_APP_NAME=AI Reader
REACT_APP_APP_VERSION=1.0.0
```

### 测试构建：
```bash
npm run build
# 查看生成的配置文件
cat build/config.js
```

## 📊 调试工具

### 浏览器调试信息
在本地开发时（localhost），打开浏览器控制台查看：
```javascript
// 显示环境变量加载状态
Runtime ENV injected: {
  hasApiKey: true,
  appName: "AI Reader",
  appVersion: "1.0.0",
  timestamp: "2025-08-26T10:50:07.711Z"
}
```

### API 密钥调试
如果仍然遇到 API 密钥错误，检查控制台中的调试信息：
```javascript
API Key Debug Info: {
  runtimeKey: "sk-xxx...",
  buildTimeKey: "sk-xxx...",
  finalKey: "sk-xxx..."
}
```

## 🎯 优势

1. **向后兼容**：仍然支持传统的构建时环境变量
2. **运行时灵活性**：支持容器运行时环境变量注入
3. **调试友好**：详细的日志和调试信息
4. **平台无关**：适用于 Railway、Vercel、Docker 等各种部署平台

## ⚠️ 常见问题：点击概念节点无反应

### 症状诊断
如果在 Railway 部署的应用中点击概念节点没有任何反应（本地正常），这通常表明 API 密钥配置问题：

```javascript
// 浏览器控制台会看到：
🎯 点击概念节点: {id: 'xxx', name: 'xxx', children: []}
🚨 AI内容生成失败: 未找到API密钥...
```

### 快速修复步骤

1. **立即检查 Railway 环境变量**
   - 登录 [Railway Dashboard](https://railway.app)
   - 进入项目 → Variables 标签页
   - 确认 `REACT_APP_OPENROUTER_API_KEY` 已设置
   - 值应该以 `sk-or-v1-` 开头

2. **重新部署应用**
   ```bash
   # 方法1: 推送代码触发部署
   git commit --allow-empty -m "trigger redeploy"
   git push

   # 方法2: 在 Railway Dashboard 手动重新部署
   ```

3. **验证修复结果**
   - 访问 `https://your-app.railway.app/config.js`
   - 确认看到正确的配置而不是占位符
   - 在浏览器控制台查看诊断信息

## 🔍 故障排除

### 如果仍然看到 API 密钥错误：

1. **检查环境变量是否正确设置**
   ```bash
   # 在 Railway 部署日志中查找
   🔑 Environment variables found: {
     REACT_APP_OPENROUTER_API_KEY: '***SET***'
   }
   ```

2. **确认运行时配置文件存在**
   ```bash
   # 在部署日志中查找
   ✅ Runtime config file found
   ```

3. **清除 Railway 构建缓存**
   - 在 Railway 项目设置中清除构建缓存
   - 重新部署项目

4. **手动验证配置**
   - 访问 `https://your-app.railway.app/config.js`
   - 确认文件内容中包含正确的 API 密钥（部分屏蔽）

## 📝 更新日志

- **2025-08-26**: 实现运行时环境变量注入方案
- **2025-08-26**: 添加双重检查机制和详细调试信息
- **2025-08-26**: 优化 Dockerfile 和构建流程