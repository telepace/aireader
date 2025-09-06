/**
 * 登录表单组件
 * TDD实现：用户友好的登录界面
 */

import React, { useState } from 'react';
import {
  TextField,
  Button,
  Paper,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  InputAdornment,
  Divider
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useAuth, useAuthForm } from '../../hooks/useAuth';
import { AuthCredentials } from '../../types/auth.types';
import { ClientValidator } from '../../utils/auth/validation';

interface LoginFormProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
  onForgotPasswordClick?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ 
  onSuccess, 
  onRegisterClick, 
  onForgotPasswordClick 
}) => {
  const { login, isLoading, error, clearError } = useAuth();
  const {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll
  } = useAuthForm();
  
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      return;
    }

    try {
      const credentials: AuthCredentials = {
        email: formData.email,
        password: formData.password
      };
      
      await login(credentials);
      onSuccess?.();
    } catch (error) {
      // 错误已在AuthProvider中处理
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    handleChange(field, value);
    if (error) clearError();
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 400, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        登录
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          fullWidth
          margin="normal"
          label="邮箱"
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          error={touched.email && !!errors.email}
          helperText={touched.email && errors.email}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Email />
              </InputAdornment>
            ),
          }}
          autoComplete="email"
          disabled={isLoading}
        />

        <TextField
          fullWidth
          margin="normal"
          label="密码"
          type={showPassword ? 'text' : 'password'}
          name="password"
          value={formData.password || ''}
          onChange={(e) => handleFieldChange('password', e.target.value)}
          onBlur={() => handleBlur('password')}
          error={touched.password && !!errors.password}
          helperText={touched.password && errors.password}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPassword(!showPassword)}
                  edge="end"
                >
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          autoComplete="current-password"
          disabled={isLoading}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1, mb: 2 }}>
          <Link
            component="button"
            variant="body2"
            onClick={onForgotPasswordClick}
            type="button"
          >
            忘记密码？
          </Link>
        </Box>

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading}
          sx={{ mt: 2, mb: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : '登录'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            还没有账户？{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onRegisterClick}
              type="button"
            >
              立即注册
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default LoginForm;