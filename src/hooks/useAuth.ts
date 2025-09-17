/**
 * 认证状态管理Hook
 * TDD实现：响应式认证状态管理
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { User, AuthTokens, AuthCredentials, RegisterData } from '../types/auth.types';
import { authService } from '../services/auth/AuthService';
import { AuthValidator } from '../utils/auth/validation';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: AuthCredentials) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从localStorage恢复会话
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedTokens = localStorage.getItem('authTokens');
        if (savedTokens) {
          const parsedTokens = JSON.parse(savedTokens);
          setTokens(parsedTokens);
          
          // 验证令牌并获取用户信息
          const currentUser = await authService.getCurrentUser(parsedTokens.accessToken);
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('authTokens');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // 自动刷新令牌
  useEffect(() => {
    if (!tokens?.refreshToken) return;

    const refreshInterval = setInterval(async () => {
      try {
        const newTokens = await authService.refreshAccessToken(tokens.refreshToken);
        setTokens(newTokens);
        localStorage.setItem('authTokens', JSON.stringify(newTokens));
      } catch (error) {
        console.error('Failed to refresh token:', error);
        logout();
      }
    }, (tokens.expiresIn - 60) * 1000); // 提前1分钟刷新

    return () => clearInterval(refreshInterval);
  }, [tokens]);

  const login = useCallback(async (credentials: AuthCredentials) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login(credentials);
      setUser(result.user);
      setTokens(result.tokens);
      localStorage.setItem('authTokens', JSON.stringify(result.tokens));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: RegisterData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.register(userData);
      setUser(result.user);
      setTokens(result.tokens);
      localStorage.setItem('authTokens', JSON.stringify(result.tokens));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    
    try {
      if (tokens?.refreshToken) {
        await authService.logout(tokens.refreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('authTokens');
      setIsLoading(false);
    }
  }, [tokens]);

  const refreshToken = useCallback(async () => {
    if (!tokens?.refreshToken) return;

    try {
      const newTokens = await authService.refreshAccessToken(tokens.refreshToken);
      setTokens(newTokens);
      localStorage.setItem('authTokens', JSON.stringify(newTokens));
    } catch (error) {
      logout();
      throw error;
    }
  }, [tokens, logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    clearError,
    error
  };

  return React.createElement(AuthContext.Provider, {value}, children);
};

// 认证守卫Hook
export const useAuthGuard = () => {
  const { isAuthenticated, isLoading } = useAuth();

  return {
    isAuthenticated,
    isLoading,
    shouldRedirect: !isLoading && !isAuthenticated
  };
};

// 权限检查Hook
export const usePermission = (requiredRole?: string) => {
  const { user, isAuthenticated } = useAuth();

  const hasPermission = useCallback(() => {
    if (!isAuthenticated || !user) return false;
    if (!requiredRole) return true;
    return user.role === requiredRole;
  }, [user, isAuthenticated, requiredRole]);

  return {
    hasPermission: hasPermission(),
    userRole: user?.role,
    isAuthenticated
  };
};

// API请求Hook（自动添加认证头）
export const useAuthenticatedRequest = () => {
  const { tokens, refreshToken } = useAuth();

  const makeRequest = useCallback(async (
    url: string,
    options: RequestInit = {}
  ) => {
    if (!tokens?.accessToken) {
      throw new Error('No access token available');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json'
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // 尝试刷新令牌
        await refreshToken();
        
        // 重试请求
        const newHeaders = {
          ...options.headers,
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        };

        return fetch(url, {
          ...options,
          headers: newHeaders
        });
      }

      return response;
    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }, [tokens, refreshToken]);

  return { makeRequest };
};

// 表单验证Hook
export const useAuthForm = () => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 实时验证
    if (touched[name]) {
      validateField(name, value);
    }
  }, [touched]);

  const handleBlur = useCallback((name: string) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  }, [formData]);

  const validateField = useCallback((name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'email':
        const emailValidation = AuthValidator.validateEmail(value);
        if (!emailValidation.isValid) {
          error = emailValidation.errors[0];
        }
        break;
      case 'password':
        const passwordValidation = AuthValidator.validatePassword(value);
        if (!passwordValidation.isValid) {
          error = passwordValidation.errors[0];
        }
        break;
      case 'username':
        const usernameValidation = AuthValidator.validateUsername(value);
        if (!usernameValidation.isValid) {
          error = usernameValidation.errors[0];
        }
        break;
      case 'confirmPassword':
        if (value !== formData.password) {
          error = 'Passwords do not match';
        }
        break;
    }

    setErrors(prev => ({ ...prev, [name]: error }));
  }, [formData]);

  const validateAll = useCallback(() => {
    const newErrors: Record<string, string> = {};
    
    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });

    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const resetForm = useCallback(() => {
    setFormData({});
    setErrors({});
    setTouched({});
  }, []);

  return {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll,
    resetForm,
    isValid: Object.keys(errors).length === 0
  };
};