import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  componentName?: string;
  onError?: (error: Error, componentName: string) => void;
  showDetails?: boolean;
}

/**
 * 轻量级局部错误边界 - 用于特定组件的错误处理
 * 
 * 适用场景：
 * - API调用密集的组件
 * - 复杂的交互组件
 * - 第三方库集成组件
 * - 实验性功能组件
 */
class LocalErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError, componentName = 'Unknown Component' } = this.props;

    // 记录错误
    console.warn(`LocalErrorBoundary caught error in ${componentName}:`, error);

    // 调用错误回调
    if (onError) {
      try {
        onError(error, componentName);
      } catch (callbackError) {
        console.error('Error in LocalErrorBoundary callback:', callbackError);
      }
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { componentName = '组件', showDetails = false } = this.props;
    const { error } = this.state;

    return (
      <Alert 
        severity="warning" 
        sx={{ 
          m: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={this.handleRetry}
          >
            重试
          </Button>
        }
      >
        <Box>
          <Typography variant="subtitle2">
            {componentName}出现问题
          </Typography>
          {showDetails && error && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {error.message}
            </Typography>
          )}
        </Box>
      </Alert>
    );
  }
}

export default LocalErrorBoundary;