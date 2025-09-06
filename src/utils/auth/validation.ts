/**
 * 认证验证工具
 * TDD实现：通过测试的最小功能
 */

import { RegisterData, AuthCredentials, ValidationResult, PasswordValidationOptions } from '../../types/auth.types';

export class AuthValidator {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly PASSWORD_MIN_LENGTH = 8;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

  static validateEmail(email: string): ValidationResult {
    const errors: string[] = [];

    if (!email || email.trim() === '') {
      errors.push('Email is required');
    } else if (!this.EMAIL_REGEX.test(email)) {
      errors.push('Please enter a valid email address');
    } else if (email.length > 254) {
      errors.push('Email is too long');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validatePassword(password: string, options: PasswordValidationOptions = {}): ValidationResult {
    const {
      minLength = this.PASSWORD_MIN_LENGTH,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      maxLength = 128
    } = options;

    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must be no more than ${maxLength} characters long`);
    }

    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // 检查常见弱密码
    const weakPasswords = ['password', '12345678', 'qwerty', 'admin', 'letmein'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      errors.push('Password is too common and insecure');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateUsername(username: string): ValidationResult {
    const errors: string[] = [];

    if (!username || username.trim() === '') {
      errors.push('Username is required');
    } else if (!this.USERNAME_REGEX.test(username)) {
      errors.push('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateRegistration(data: RegisterData): ValidationResult {
    const errors: string[] = [];

    // 验证邮箱
    const emailValidation = this.validateEmail(data.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    // 验证用户名
    const usernameValidation = this.validateUsername(data.username);
    if (!usernameValidation.isValid) {
      errors.push(...usernameValidation.errors);
    }

    // 验证密码
    const passwordValidation = this.validatePassword(data.password);
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors);
    }

    // 验证密码确认
    if (data.confirmPassword && data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static validateLogin(credentials: AuthCredentials): ValidationResult {
    const errors: string[] = [];

    const emailValidation = this.validateEmail(credentials.email);
    if (!emailValidation.isValid) {
      errors.push(...emailValidation.errors);
    }

    if (!credentials.password || credentials.password.trim() === '') {
      errors.push('Password is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getPasswordStrength(password: string): {
    score: number;
    level: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // 长度检查
    if (password.length >= 8) score += 1;
    else suggestions.push('Use at least 8 characters');

    if (password.length >= 12) score += 1;
    else suggestions.push('Consider using 12+ characters for better security');

    // 字符类型检查
    if (/[a-z]/.test(password)) score += 1;
    else suggestions.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score += 1;
    else suggestions.push('Add uppercase letters');

    if (/\d/.test(password)) score += 1;
    else suggestions.push('Add numbers');

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
    else suggestions.push('Add special characters');

    // 复杂性检查
    if (/(.)\1{2,}/.test(password)) {
      score -= 1;
      suggestions.push('Avoid repeated characters');
    }

    if (password.match(/(\w+)\1+/)) {
      score -= 1;
      suggestions.push('Avoid repeated patterns');
    }

    let level: 'weak' | 'medium' | 'strong';
    if (score <= 2) level = 'weak';
    else if (score <= 4) level = 'medium';
    else level = 'strong';

    return { score, level, suggestions };
  }

  static sanitizeInput(input: string): string {
    return input.trim().replace(/<[^>]*>/g, ''); // 移除HTML标签防止XSS
  }

  static isRateLimited(attempts: number, maxAttempts: number): boolean {
    return attempts >= maxAttempts;
  }

  static generateRateLimitKey(email: string, ip: string): string {
    return `rate_limit:${email}:${ip}`;
  }
}

// 速率限制器
export class RateLimiter {
  private static attempts = new Map<string, { count: number; resetTime: number }>();

  static checkLimit(key: string, maxAttempts: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const attempt = this.attempts.get(key);

    if (!attempt || now >= attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }

    if (attempt.count >= maxAttempts) {
      return { allowed: false, remaining: 0, resetTime: attempt.resetTime };
    }

    attempt.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - attempt.count,
      resetTime: attempt.resetTime
    };
  }

  static reset(key: string): void {
    this.attempts.delete(key);
  }

  static clear(): void {
    this.attempts.clear();
  }
}

// 客户端验证器
export class ClientValidator {
  static validateEmail(email: string): ValidationResult {
    return AuthValidator.validateEmail(email);
  }

  static validatePassword(password: string): ValidationResult {
    return AuthValidator.validatePassword(password);
  }

  static validateUsername(username: string): ValidationResult {
    return AuthValidator.validateUsername(username);
  }

  static getPasswordStrength(password: string) {
    return AuthValidator.getPasswordStrength(password);
  }

  static sanitizeInput(input: string): string {
    return AuthValidator.sanitizeInput(input);
  }
}

export default AuthValidator;