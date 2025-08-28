# 使用官方的 Node.js 运行时作为基础镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（禁用缓存，避免 EBUSY 错误）
RUN npm ci --legacy-peer-deps --no-cache --no-fund --no-audit --prefer-offline

# 复制源代码
COPY . .

# 构建应用 - 使用 ARG 来接收构建参数
ARG REACT_APP_OPENROUTER_API_KEY
ARG REACT_APP_APP_NAME
ARG REACT_APP_APP_VERSION

ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false
ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV CI=false
ENV REACT_APP_OPENROUTER_API_KEY=$REACT_APP_OPENROUTER_API_KEY
ENV REACT_APP_APP_NAME=$REACT_APP_APP_NAME
ENV REACT_APP_APP_VERSION=$REACT_APP_APP_VERSION

# 构建应用（包含运行时配置注入）
RUN npm run build:railway

# 安装 serve 用于提供静态文件（更稳定的SPA支持）
RUN npm install -g serve

# 安装必要的工具
RUN apk add --no-cache curl

# 暴露端口
EXPOSE 3000

# 验证构建结果
RUN ls -la build/ && \
    echo "✅ Build directory contents verified" && \
    test -f build/config.js && echo "✅ Runtime config file found" || echo "⚠️  Runtime config file missing"

# 创建健康检查页面
RUN echo '<!DOCTYPE html><html><head><title>Aireader - Railway Health Check</title><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:2rem;background:#f8fafc}h1{color:#6366f1}</style></head><body><h1>🚀 Aireader - Deployed Successfully!</h1><p><strong>Status:</strong> Running</p><p><strong>Port:</strong> 3000</p><p><strong>Time:</strong> <script>document.write(new Date().toLocaleString())</script></p><a href="/">Go to App</a></body></html>' > build/health.html

# 启动应用
CMD ["serve", "-s", "build", "-l", "3000", "--no-clipboard"]