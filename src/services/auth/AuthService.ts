/**
 * 认证服务核心实现
 * TDD实现：通过测试的最小功能
 */

import { 
  User, 
  AuthCredentials, 
  RegisterData, 
  AuthTokens, 
  AuthResult, 
  TokenPayload,
  AuthService as IAuthService,
  UserRole,
  AuditAction,
  LoginAttempt
} from '../../types/auth.types';
import { AuthValidator, RateLimiter } from '../../utils/auth/validation';
import { v4 as uuidv4 } from 'uuid';

// 内部用户类型，包含密码字段（仅在服务端使用）
interface InternalUser extends User {
  password: string;
}

// 从内部用户转换为公开用户（移除密码）
const toPublicUser = (internalUser: InternalUser): User => {
  const { password, ...publicUser } = internalUser;
  return publicUser;
};

// 内存存储（测试用）
class InMemoryStorage {
  private users: Map<string, InternalUser> = new Map();
  private tokens: Map<string, { userId: string; expiresAt: number }> = new Map();
  private loginAttempts: Map<string, LoginAttempt> = new Map();
  private auditLogs: any[] = [];

  createUser(userData: Omit<InternalUser, 'id' | 'createdAt' | 'updatedAt'>): InternalUser {
    const user: InternalUser = {
      ...userData,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.users.set(user.email, user);
    return user;
  }

  findUserByEmail(email: string): InternalUser | undefined {
    return this.users.get(email);
  }

  findUserById(id: string): InternalUser | undefined {
    return Array.from(this.users.values()).find(u => u.id === id);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.findUserById(id);
    if (user) {
      Object.assign(user, updates, { updatedAt: new Date() });
      this.users.set(user.email, user);
    }
    return user;
  }

  storeRefreshToken(token: string, userId: string, expiresAt: number): void {
    this.tokens.set(token, { userId, expiresAt });
  }

  getRefreshToken(token: string): { userId: string; expiresAt: number } | undefined {
    return this.tokens.get(token);
  }

  revokeRefreshToken(token: string): boolean {
    return this.tokens.delete(token);
  }

  addLoginAttempt(email: string, ip: string, attempts: number): void {
    this.loginAttempts.set(`${email}:${ip}`, {
      email,
      ip,
      attempts,
      lastAttempt: new Date()
    });
  }

  getLoginAttempt(email: string, ip: string): LoginAttempt | undefined {
    return this.loginAttempts.get(`${email}:${ip}`);
  }

  addAuditLog(log: any): void {
    this.auditLogs.push({ ...log, timestamp: new Date() });
  }

  getAuditLogs(userId: string): any[] {
    return this.auditLogs.filter(log => log.userId === userId);
  }
}

export class AuthService implements IAuthService {
  private storage = new InMemoryStorage();
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15分钟
  private readonly ACCESS_TOKEN_EXPIRY = 15 * 60; // 15分钟
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7天

  async register(userData: RegisterData): Promise<AuthResult> {
    // 验证输入
    const validation = AuthValidator.validateRegistration(userData);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    // 检查邮箱是否已存在
    if (this.storage.findUserByEmail(userData.email)) {
      throw new Error('Email already exists');
    }

    // 创建用户
    const user = this.storage.createUser({
      email: userData.email,
      username: userData.username,
      password: userData.password, // 注意：实际实现中需要加密
      isEmailVerified: false,
      role: UserRole.USER
    });

    // 生成令牌
    const tokens = this.generateTokens(user);

    // 记录审计日志
    this.storage.addAuditLog({
      userId: user.id,
      action: AuditAction.REGISTER,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });

    return {
      user: toPublicUser(user),
      tokens
    };
  }

  async login(credentials: AuthCredentials): Promise<AuthResult> {
    const validation = AuthValidator.validateLogin(credentials);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    const user = this.storage.findUserByEmail(credentials.email);
    if (!user) {
      await this.recordFailedLogin(credentials.email, '127.0.0.1');
      throw new Error('Invalid credentials');
    }

    // 检查是否被锁定
    const isLocked = await this.isAccountLocked(credentials.email, '127.0.0.1');
    if (isLocked) {
      throw new Error('Account locked due to too many failed attempts');
    }

    // 验证密码（简化版，实际应使用bcrypt）
    if (credentials.password !== user.password) {
      await this.recordFailedLogin(credentials.email, '127.0.0.1');
      throw new Error('Invalid credentials');
    }

    // 生成令牌
    const tokens = this.generateTokens(user);

    // 更新最后登录时间
    this.storage.updateUser(user.id, { lastLoginAt: new Date() });

    // 记录审计日志
    this.storage.addAuditLog({
      userId: user.id,
      action: AuditAction.LOGIN,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });

    return {
      user: toPublicUser(user),
      tokens
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenData = this.storage.getRefreshToken(refreshToken);
    if (tokenData) {
      const user = this.storage.findUserById(tokenData.userId);
      if (user) {
        this.storage.addAuditLog({
          userId: user.id,
          action: AuditAction.LOGOUT,
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent'
        });
      }
    }

    this.storage.revokeRefreshToken(refreshToken);
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    const tokenData = this.storage.getRefreshToken(refreshToken);
    if (!tokenData || Date.now() > tokenData.expiresAt) {
      throw new Error('Invalid or expired refresh token');
    }

    const user = this.storage.findUserById(tokenData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tokens = this.generateTokens(user);

    // 撤销旧令牌
    this.storage.revokeRefreshToken(refreshToken);

    return tokens;
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    try {
      // 简化版JWT验证（实际应使用jsonwebtoken库）
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (Date.now() >= payload.exp * 1000) {
        throw new Error('Token expired');
      }

      const user = this.storage.findUserById(payload.userId);
      if (!user) {
        throw new Error('User not found');
      }

      return payload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  async getCurrentUser(accessToken: string): Promise<User> {
    const payload = await this.verifyToken(accessToken);
    const user = this.storage.findUserById(payload.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return toPublicUser(user);
  }

  async initiatePasswordReset(email: string): Promise<void> {
    const user = this.storage.findUserByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    // 实现密码重置逻辑
    this.storage.addAuditLog({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET,
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const validation = AuthValidator.validatePassword(newPassword);
    if (!validation.isValid) {
      throw new Error(validation.errors[0]);
    }

    // 验证重置令牌
    // 更新密码
    // 撤销所有令牌
  }

  async verifyEmail(token: string): Promise<void> {
    // 验证邮箱确认令牌
    // 更新用户邮箱验证状态
  }

  private generateTokens(user: User): AuthTokens {
    const now = Math.floor(Date.now() / 1000);
    
    const accessTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + this.ACCESS_TOKEN_EXPIRY
    };

    const refreshTokenPayload = {
      userId: user.id,
      iat: now,
      exp: now + this.REFRESH_TOKEN_EXPIRY
    };

    const accessToken = btoa(JSON.stringify(accessTokenPayload));
    const refreshToken = btoa(JSON.stringify(refreshTokenPayload));

    // 存储刷新令牌
    this.storage.storeRefreshToken(refreshToken, user.id, (now + this.REFRESH_TOKEN_EXPIRY) * 1000);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      tokenType: 'Bearer'
    };
  }

  private async isAccountLocked(email: string, ip: string): Promise<boolean> {
    const attempt = this.storage.getLoginAttempt(email, ip);
    if (!attempt) return false;

    // 简化的锁定逻辑
    return attempt.attempts >= this.MAX_LOGIN_ATTEMPTS;
  }

  private async recordFailedLogin(email: string, ip: string): Promise<void> {
    const attempt = this.storage.getLoginAttempt(email, ip);
    if (attempt) {
      attempt.attempts += 1;
      attempt.lastAttempt = new Date();
    } else {
      this.storage.addLoginAttempt(email, ip, 1);
    }
  }
}

// 单例实例
export const authService = new AuthService();
export default AuthService;