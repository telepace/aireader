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

# 构建应用
ENV NODE_ENV=production
ENV GENERATE_SOURCEMAP=false
ENV INLINE_RUNTIME_CHUNK=false
ENV IMAGE_INLINE_SIZE_LIMIT=0
ENV CI=false

RUN npm run build:optimized

# 安装 serve 用于提供静态文件
RUN npm install -g serve

# 暴露端口
EXPOSE 3000

# 安装必要的工具
RUN apk add --no-cache curl

# 启动应用 - 使用环境变量或默认端口
CMD ["sh", "-c", "serve -s build -l 0.0.0.0:${PORT:-3000}"]