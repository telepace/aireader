import React from 'react';
import { Box, Typography, Button, Alert, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ErrorInfo {
  componentStack: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorId: string; onRetry: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  isolate?: boolean; // 是否隔离错误，不影响父组件
}

/**
 * React错误边界组件 - 捕获并处理组件渲染错误
 * 
 * 功能特性：
 * - 捕获子组件的JavaScript错误
 * - 提供友好的错误恢复界面
 * - 支持错误重试和页面刷新
 * - 包含详细的错误信息（开发模式下）
 * - 支持自定义错误回调和UI
 * - 错误隔离选项
 */
class ErrorBoundary extends React.Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 生成唯一错误ID用于追踪
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;

    // 更新错误信息
    this.setState({ errorInfo });

    // 记录错误到控制台（开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary');
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
      console.error('Error ID:', errorId);
      console.groupEnd();
    }

    // 调用自定义错误处理器
    if (onError) {
      try {
        onError(error, errorInfo, errorId);
      } catch (callbackError) {
        console.error('Error in ErrorBoundary onError callback:', callbackError);
      }
    }

    // 上报错误到错误监控服务（如果已配置）
    this.reportError(error, errorInfo, errorId);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * 上报错误到外部服务
   */
  private reportError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      // 这里可以集成Sentry、Bugsnag等错误监控服务
      // 目前只在控制台记录，实际项目中应该上报到监控服务
      
      const errorReport = {
        errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: (window as any).userId || 'anonymous' // 如果有用户系统
      };

      // 在生产环境中，这里应该发送到错误监控服务
      if (process.env.NODE_ENV === 'production') {
        // Example: Sentry.captureException(error, { extra: errorReport });
        console.warn('Error reported:', errorReport);
      }
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  /**
   * 重试错误恢复
   */
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  /**
   * 延迟重试（给React时间清理状态）
   */
  private handleDelayedRetry = () => {
    this.retryTimeoutId = window.setTimeout(() => {
      this.handleRetry();
    }, 100);
  };

  /**
   * 刷新页面
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * 复制错误信息到剪贴板
   */
  private handleCopyError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    const errorText = [
      `Error ID: ${errorId}`,
      `Message: ${error?.message}`,
      `Stack: ${error?.stack}`,
      `Component Stack: ${errorInfo?.componentStack}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`
    ].join('\n\n');

    navigator.clipboard.writeText(errorText).then(() => {
      alert('错误信息已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制错误信息');
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { fallback: CustomFallback } = this.props;
    const { error, errorInfo, errorId } = this.state;

    // 如果提供了自定义错误UI，使用自定义UI
    if (CustomFallback && error) {
      return <CustomFallback error={error} errorId={errorId} onRetry={this.handleRetry} />;
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    return (
      <Box 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          maxWidth: 600,
          mx: 'auto',
          mt: 8
        }}
      >
        <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="h6" gutterBottom>
            应用遇到了问题
          </Typography>
          <Typography variant="body2">
            很抱歉，应用出现了意外错误。您可以尝试重新加载或刷新页面。
          </Typography>
        </Alert>

        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          错误ID: <code>{errorId}</code>
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
          <Button 
            variant="contained" 
            color="primary"
            onClick={this.handleDelayedRetry}
          >
            重试
          </Button>
          <Button 
            variant="outlined" 
            onClick={this.handleRefresh}
          >
            刷新页面
          </Button>
          {isDevelopment && (
            <Button 
              variant="outlined" 
              size="small"
              onClick={this.handleCopyError}
            >
              复制错误信息
            </Button>
          )}
        </Box>

        {/* 开发环境下显示详细错误信息 */}
        {isDevelopment && error && (
          <Accordion sx={{ textAlign: 'left', mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">错误详情 (开发模式)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>错误消息:</Typography>
                <Typography 
                  variant="body2" 
                  component="pre" 
                  sx={{ 
                    bgcolor: 'grey.100', 
                    p: 1, 
                    borderRadius: 1,
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    overflowX: 'auto'
                  }}
                >
                  {error.message}
                </Typography>
              </Box>

              {error.stack && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>错误堆栈:</Typography>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto'
                    }}
                  >
                    {error.stack}
                  </Typography>
                </Box>
              )}

              {errorInfo?.componentStack && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>组件堆栈:</Typography>
                  <Typography 
                    variant="body2" 
                    component="pre" 
                    sx={{ 
                      bgcolor: 'grey.100', 
                      p: 1, 
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      overflowX: 'auto'
                    }}
                  >
                    {errorInfo.componentStack}
                  </Typography>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  }
}

export default ErrorBoundary;