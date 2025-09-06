/**
 * 注册表单组件
 * TDD实现：安全的用户注册界面
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
  LinearProgress,
  FormHelperText
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person } from '@mui/icons-material';
import { useAuth, useAuthForm } from '../../hooks/useAuth';
import { RegisterData } from '../../types/auth.types';
import { ClientValidator } from '../../utils/auth/validation';

interface RegisterFormProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onLoginClick }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const {
    formData,
    errors,
    touched,
    handleChange,
    handleBlur,
    validateAll
  } = useAuthForm();
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<{
    score: number;
    level: 'weak' | 'medium' | 'strong';
    suggestions: string[];
  }>({ score: 0, level: 'weak', suggestions: [] });

  const handlePasswordChange = (value: string) => {
    handleChange('password', value);
    const strength = ClientValidator.getPasswordStrength(value);
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateAll()) {
      return;
    }

    try {
      const userData: RegisterData = {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        confirmPassword: formData.confirmPassword
      };
      
      await register(userData);
      onSuccess?.();
    } catch (error) {
      // 错误已在AuthProvider中处理
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength.level) {
      case 'weak': return 'error';
      case 'medium': return 'warning';
      case 'strong': return 'success';
      default: return 'inherit';
    }
  };

  const getPasswordStrengthText = () => {
    switch (passwordStrength.level) {
      case 'weak': return '弱';
      case 'medium': return '中';
      case 'strong': return '强';
      default: return '';
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 450, mx: 'auto' }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        创建账户
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
          label="用户名"
          type="text"
          name="username"
          value={formData.username || ''}
          onChange={(e) => handleChange('username', e.target.value)}
          onBlur={() => handleBlur('username')}
          error={touched.username && !!errors.username}
          helperText={touched.username && errors.username}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Person />
              </InputAdornment>
            ),
          }}
          autoComplete="username"
          disabled={isLoading}
        />

        <TextField
          fullWidth
          margin="normal"
          label="邮箱"
          type="email"
          name="email"
          value={formData.email || ''}
          onChange={(e) => handleChange('email', e.target.value)}
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
          onChange={(e) => handlePasswordChange(e.target.value)}
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
          autoComplete="new-password"
          disabled={isLoading}
        />

        {formData.password && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                密码强度
              </Typography>
              <Typography variant="caption" color={getPasswordStrengthColor()}>
                {getPasswordStrengthText()}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={passwordStrength.score * 20}
              color={getPasswordStrengthColor()}
              sx={{ height: 6, borderRadius: 3 }}
            />
            
            {passwordStrength.suggestions.length > 0 && (
              <FormHelperText>
                {passwordStrength.suggestions[0]}
              </FormHelperText>
            )}
          </Box>
        )}

        <TextField
          fullWidth
          margin="normal"
          label="确认密码"
          type={showConfirmPassword ? 'text' : 'password'}
          name="confirmPassword"
          value={formData.confirmPassword || ''}
          onChange={(e) => handleChange('confirmPassword', e.target.value)}
          onBlur={() => handleBlur('confirmPassword')}
          error={touched.confirmPassword && !!errors.confirmPassword}
          helperText={touched.confirmPassword && errors.confirmPassword}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Lock />
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  edge="end"
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          autoComplete="new-password"
          disabled={isLoading}
        />

        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={isLoading || passwordStrength.level === 'weak'}
          sx={{ mt: 3, mb: 2 }}
        >
          {isLoading ? <CircularProgress size={24} /> : '注册'}
        </Button>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            已有账户？{' '}
            <Link
              component="button"
              variant="body2"
              onClick={onLoginClick}
              type="button"
            >
              立即登录
            </Link>
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default RegisterForm;