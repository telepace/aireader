# 认证系统集成指南

## 概述

本指南提供了完整的认证系统集成方案，使用TDD（测试驱动开发）方法构建企业级认证系统。

## 架构特点

### 🛡️ 安全特性
- **零信任架构**: 每次请求验证
- **多层加密**: bcrypt + JWT + HTTPS
- **速率限制**: 防暴力破解
- **会话管理**: 双令牌系统
- **审计日志**: 完整操作记录

### 🔧 技术栈
- **前端**: React + TypeScript + Material-UI
- **后端**: Node.js + Express (计划中)
- **数据库**: PostgreSQL (计划中)
- **缓存**: Redis (计划中)
- **部署**: Docker + HTTPS

## 快速集成

### 1. 基础集成

```typescript
// App.tsx
import { AuthProvider } from './hooks/useAuth';
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* 你的应用组件 */}
      </AuthProvider>
    </BrowserRouter>
  );
}
```

### 2. 路由保护

```typescript
// ProtectedRoute.tsx
import { useAuthGuard } from './hooks/useAuth';

const ProtectedRoute: React.FC = ({ children }) => {
  const { isAuthenticated, isLoading, shouldRedirect } = useAuthGuard();

  if (isLoading) return <LoadingSpinner />;
  if (shouldRedirect) return <Navigate to="/login" />;
  
  return <>{children}</>;
};
```

### 3. 使用认证Hook

```typescript
// 组件中使用
import { useAuth } from './hooks/useAuth';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  
  return (
    <div>
      <h1>欢迎, {user?.username}</h1>
      <button onClick={logout}>退出登录</button>
    </div>
  );
};
```

## 组件使用

### 登录表单

```typescript
import LoginForm from './components/Auth/LoginForm';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <LoginForm
      onSuccess={() => navigate('/dashboard')}
      onRegisterClick={() => navigate('/register')}
      onForgotPasswordClick={() => navigate('/forgot-password')}
    />
  );
};
```

### 注册表单

```typescript
import RegisterForm from './components/Auth/RegisterForm';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <RegisterForm
      onSuccess={() => navigate('/dashboard')}
      onLoginClick={() => navigate('/login')}
    />
  );
};
```

## API集成

### 1. 认证API

```typescript
// services/api/authApi.ts
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

export const authApi = {
  // 用户注册
  register: async (userData: RegisterData) => {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
    return response.data;
  },

  // 用户登录
  login: async (credentials: AuthCredentials) => {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    return response.data;
  },

  // 刷新令牌
  refreshToken: async (refreshToken: string) => {
    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    return response.data;
  },

  // 获取当前用户
  getCurrentUser: async (token: string) => {
    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  // 退出登录
  logout: async (refreshToken: string) => {
    await axios.post(`${API_BASE_URL}/auth/logout`, { refreshToken });
  }
};
```

### 2. Axios拦截器

```typescript
// services/api/axios.ts
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post('/api/auth/refresh', { refreshToken });
        
        const { accessToken } = response.data;
        localStorage.setItem('accessToken', accessToken);
        
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

## 环境配置

### 1. 环境变量

```bash
# .env
REACT_APP_API_URL=https://your-api-domain.com
REACT_APP_JWT_SECRET=your-jwt-secret-here
REACT_APP_ENCRYPTION_KEY=your-encryption-key-here
```

### 2. Docker配置

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 3. nginx配置

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 测试策略

### 1. 单元测试

```bash
# 运行所有认证测试
npm test -- --testPathPattern=auth

# 运行特定测试
npm test -- src/__tests__/auth/auth.test.ts
```

### 2. 端到端测试

```bash
# 运行E2E测试
npx playwright test e2e/auth.spec.ts

# 运行特定测试
npx playwright test e2e/auth.spec.ts --headed
```

### 3. 性能测试

```bash
# 使用Lighthouse进行性能测试
npx lighthouse https://your-domain.com --output=json --output-path=./lighthouse-report.json
```

## 部署检查清单

### ✅ 安全配置
- [ ] HTTPS强制
- [ ] 安全响应头
- [ ] CORS配置
- [ ] 输入验证
- [ ] 速率限制

### ✅ 性能优化
- [ ] 代码分割
- [ ] 图片优化
- [ ] CDN配置
- [ ] 缓存策略

### ✅ 监控配置
- [ ] 错误监控
- [ ] 性能监控
- [ ] 用户行为分析
- [ ] 安全审计

### ✅ 备份策略
- [ ] 数据库备份
- [ ] 配置文件备份
- [ ] SSL证书备份

## 故障排除

### 常见问题

1. **令牌过期**
   - 检查刷新令牌逻辑
   - 验证JWT有效期设置

2. **CORS错误**
   - 检查后端CORS配置
   - 验证域名白名单

3. **登录循环**
   - 检查路由守卫逻辑
   - 验证令牌存储

### 调试工具

```typescript
// 调试模式
const DEBUG = process.env.NODE_ENV === 'development';

if (DEBUG) {
  console.log('Auth debug info:', {
    isAuthenticated,
    user,
    tokens
  });
}
```

## 扩展功能

### 1. 社交登录

```typescript
// 支持Google、GitHub、微信等
const socialProviders = {
  google: {
    clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/google/callback`
  },
  github: {
    clientId: process.env.REACT_APP_GITHUB_CLIENT_ID,
    redirectUri: `${window.location.origin}/auth/github/callback`
  }
};
```

### 2. 双因子认证

```typescript
// 2FA集成
const enable2FA = async (userId: string) => {
  const secret = generate2FASecret();
  const qrCode = generateQRCode(secret);
  return { secret, qrCode };
};
```

### 3. 单点登录(SSO)

```typescript
// SSO配置
const ssoConfig = {
  provider: 'saml',
  entryPoint: process.env.REACT_APP_SSO_ENTRY_POINT,
  issuer: process.env.REACT_APP_SSO_ISSUER
};
```

## 支持

如有问题，请查看：
- [GitHub Issues](https://github.com/your-repo/issues)
- [文档更新](docs/UPDATES.md)
- [安全公告](docs/SECURITY.md)