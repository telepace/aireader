# Railway 部署指南 - aireader

## 📋 项目概述

**aireader** 是一个基于 React + TypeScript 的 LLM 提示词测试工具，使用 Material-UI 构建界面，通过 OpenRouter API 访问多种 AI 模型。

### 技术栈
- **前端**: React 18 + TypeScript
- **UI框架**: Material-UI (MUI)
- **构建工具**: Create React App
- **测试**: Jest + React Testing Library + Playwright
- **API**: OpenRouter API

## 🚄 Railway 部署步骤

### 1. 前期准备

#### 必需文件检查
确保项目根目录包含以下文件：

```
├── package.json          # 包含所有依赖和脚本
├── public/
│   ├── index.html        # 入口HTML
│   └── ...
├── src/                  # 源代码
├── .env                  # 环境变量（本地）
└── README.md
```

#### 环境变量配置
在 Railway 控制台中设置以下环境变量：

```bash
# 必需变量
REACT_APP_OPENROUTER_API_KEY=your_api_key_here

# 可选变量
GENERATE_SOURCEMAP=false          # 减少构建体积
NODE_ENV=production
PORT=3000                         # Railway默认端口
```

### 2. Railway 项目设置

#### 2.1 创建项目
1. 访问 [Railway](https://railway.app)
2. 点击 "New Project"
3. 选择 "Deploy from GitHub repo"
4. 选择 `telepace/aireader` 仓库

#### 2.2 配置构建设置

**构建器**: Nixpacks（默认）

**构建命令**:
```bash
npm ci --production=false && npm run build
```

**启动命令**:
```bash
npx serve -s build -l 3000
```

#### 2.3 资源配置建议

| 资源类型 | 建议配置 | 说明 |
|---------|----------|------|
| **CPU** | 1 vCPU | 基础配置 |
| **内存** | 512MB-1GB | 避免OOM错误 |
| **磁盘** | 1GB | 足够存储构建产物 |

### 3. 内存优化配置

由于项目遇到 OOM（内存不足）错误，建议以下优化：

#### 3.1 构建优化
在 `package.json` 中添加构建优化：

```json
{
  "scripts": {
    "build": "react-scripts build",
    "build:prod": "GENERATE_SOURCEMAP=false react-scripts build"
  }
}
```

#### 3.2 环境变量优化
在 Railway 环境变量中添加：

```bash
# 减少内存使用
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
IMAGE_INLINE_SIZE_LIMIT=0

# Node.js 内存限制
NODE_OPTIONS="--max-old-space-size=512"
```

#### 3.3 使用替代服务器
使用轻量级服务器替代 React 开发服务器：

**安装 serve**:
```bash
npm install --save-dev serve
```

**更新启动命令**:
```bash
npx serve -s build --single --listen 3000
```

### 4. Railway 配置文件

创建 `railway.json` 文件用于配置即代码：

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm ci --production=false && npm run build",
    "startCommand": "npx serve -s build -l 3000",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "deploy": {
    "startCommand": "npx serve -s build -l 3000",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  },
  "environments": {
    "production": {
      "variables": {
        "NODE_ENV": "production",
        "GENERATE_SOURCEMAP": "false"
      }
    }
  }
}
```

### 5. 部署流程

#### 5.1 自动部署（推荐）
1. 推送代码到 `main` 分支
2. Railway 自动触发部署
3. 查看部署日志确认成功

#### 5.2 手动部署
```bash
# 在 Railway 控制台点击 "Deploy" 按钮
# 或使用 CLI
railway up
```

#### 5.3 部署验证
部署成功后，访问以下URL验证：
- **主域名**: `https://aireader-production.up.railway.app`
- **健康检查**: `https://aireader-production.up.railway.app/health`

### 6. 故障排除

#### 6.1 OOM 错误解决

**症状**: 部署日志显示 "Out of Memory (OOM)"

**解决方案**: 
1. **减少构建内存**: 
   ```bash
   NODE_OPTIONS="--max-old-space-size=512"
   ```

2. **优化构建**: 
   ```bash
   GENERATE_SOURCEMAP=false npm run build
   ```

3. **升级资源**: 在 Railway 设置中增加内存到 1GB

#### 6.2 构建失败

**症状**: 构建阶段报错

**检查清单**:
- [ ] 确认 Node.js 版本兼容
- [ ] 检查环境变量是否正确设置
- [ ] 验证依赖安装是否成功

#### 6.3 启动失败

**症状**: 应用启动后立即崩溃

**解决方案**:
1. 检查端口设置（必须使用 3000）
2. 确认构建产物存在 `build/` 目录
3. 检查服务器日志获取详细错误信息

### 7. 监控和维护

#### 7.1 健康检查
设置健康检查端点：

```json
{
  "deploy": {
    "healthcheckPath": "/",
    "healthcheckTimeout": 300
  }
}
```

#### 7.2 日志监控
- **Railway 控制台**: 实时查看部署日志
- **应用日志**: 通过 `railway logs` 查看

#### 7.3 性能监控
- **内存使用**: 监控应用内存占用
- **响应时间**: 确保页面加载时间 < 3秒

### 8. 环境管理

#### 8.1 多环境部署
```
├── 生产环境 (main分支)
├── 预发布环境 (develop分支)
└── 测试环境 (feature分支)
```

#### 8.2 环境变量模板
创建 `.env.railway` 模板：

```bash
# Railway 环境变量模板
REACT_APP_OPENROUTER_API_KEY=<your-api-key>
NODE_ENV=production
GENERATE_SOURCEMAP=false
PORT=3000
```

### 9. 回滚策略

#### 9.1 自动回滚
Railway 默认支持失败时自动回滚

#### 9.2 手动回滚
1. 在 Railway 控制台选择历史部署
2. 点击 "Promote" 回滚到指定版本

## 🎯 快速部署检查清单

部署前确认：
- [ ] 已配置 Railway 项目
- [ ] 已设置 `REACT_APP_OPENROUTER_API_KEY`
- [ ] 已配置内存优化参数
- [ ] 已添加 `railway.json` 文件
- [ ] 已测试本地构建成功

## 📞 技术支持

如遇到问题：
1. 检查 Railway 部署日志
2. 验证环境变量配置
3. 确认 API 密钥有效性
4. 查看应用运行状态

---

**最后更新**: 2025年8月26日
**维护者**: telepace 团队