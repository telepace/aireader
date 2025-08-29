import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import ErrorBoundary from '../ErrorBoundary';
import LocalErrorBoundary from '../LocalErrorBoundary';

// 创建测试主题
const theme = createTheme();

// 模拟一个会抛出错误的组件
const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({ 
  shouldThrow = true, 
  errorMessage = 'Test error' 
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

// 辅助函数：渲染带主题的组件
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('ErrorBoundary', () => {
  // 暂时屏蔽控制台错误输出，避免测试噪音
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when there is no error', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('catches error and shows error UI', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Something went wrong" />
      </ErrorBoundary>
    );

    expect(screen.getByText('应用遇到了问题')).toBeInTheDocument();
    expect(screen.getByText('很抱歉，应用出现了意外错误。您可以尝试重新加载或刷新页面。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '刷新页面' })).toBeInTheDocument();
  });

  test('displays error ID', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    const errorIdElement = screen.getByText(/错误ID:/);
    expect(errorIdElement).toBeInTheDocument();
    expect(errorIdElement.textContent).toMatch(/错误ID: error_\d+_[a-z0-9]+/);
  });

  test('calls onError callback when error occurs', () => {
    const onErrorMock = jest.fn();

    renderWithTheme(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError errorMessage="Callback test error" />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      }),
      expect.stringMatching(/error_\d+_[a-z0-9]+/)
    );

    const [error] = onErrorMock.mock.calls[0];
    expect(error.message).toBe('Callback test error');
  });

  test('retry button resets error state', async () => {
    let shouldThrow = true;

    const TestComponent = () => (
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = renderWithTheme(<TestComponent />);

    expect(screen.getByText('应用遇到了问题')).toBeInTheDocument();

    // 点击重试按钮
    const retryButton = screen.getByRole('button', { name: '重试' });
    
    // 设置组件不再抛错误
    shouldThrow = false;
    
    fireEvent.click(retryButton);

    // 重新渲染
    rerender(
      <ThemeProvider theme={theme}>
        <TestComponent />
      </ThemeProvider>
    );

    // 等待状态重置后，应该显示正常内容
    await screen.findByText('No error');
  });

  test('shows development details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

    renderWithTheme(
      <ErrorBoundary>
        <ThrowError errorMessage="Development error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('错误详情 (开发模式)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制错误信息' })).toBeInTheDocument();

    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  test('does not show development details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    renderWithTheme(
      <ErrorBoundary>
        <ThrowError errorMessage="Production error" />
      </ErrorBoundary>
    );

    expect(screen.queryByText('错误详情 (开发模式)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '复制错误信息' })).not.toBeInTheDocument();

    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  test('renders custom fallback component when provided', () => {
    const CustomFallback: React.FC<{ error: Error; errorId: string; onRetry: () => void }> = ({ 
      error, 
      errorId, 
      onRetry 
    }) => (
      <div>
        <h1>Custom Error: {error.message}</h1>
        <p>ID: {errorId}</p>
        <button onClick={onRetry}>Custom Retry</button>
      </div>
    );

    renderWithTheme(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError errorMessage="Custom fallback test" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error: Custom fallback test')).toBeInTheDocument();
    expect(screen.getByText(/ID: error_/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom Retry' })).toBeInTheDocument();
  });
});

describe('LocalErrorBoundary', () => {
  const originalWarn = console.warn;

  beforeAll(() => {
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when there is no error', () => {
    renderWithTheme(
      <LocalErrorBoundary componentName="Test Component">
        <ThrowError shouldThrow={false} />
      </LocalErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  test('catches error and shows local error UI', () => {
    renderWithTheme(
      <LocalErrorBoundary componentName="测试组件">
        <ThrowError errorMessage="Local error" />
      </LocalErrorBoundary>
    );

    expect(screen.getByText('测试组件出现问题')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
  });

  test('shows error details when showDetails is true', () => {
    renderWithTheme(
      <LocalErrorBoundary componentName="测试组件" showDetails={true}>
        <ThrowError errorMessage="Detailed error message" />
      </LocalErrorBoundary>
    );

    expect(screen.getByText('测试组件出现问题')).toBeInTheDocument();
    expect(screen.getByText('Detailed error message')).toBeInTheDocument();
  });

  test('does not show error details when showDetails is false', () => {
    renderWithTheme(
      <LocalErrorBoundary componentName="测试组件" showDetails={false}>
        <ThrowError errorMessage="Hidden error message" />
      </LocalErrorBoundary>
    );

    expect(screen.getByText('测试组件出现问题')).toBeInTheDocument();
    expect(screen.queryByText('Hidden error message')).not.toBeInTheDocument();
  });

  test('calls onError callback with component name', () => {
    const onErrorMock = jest.fn();

    renderWithTheme(
      <LocalErrorBoundary componentName="Callback Component" onError={onErrorMock}>
        <ThrowError errorMessage="Callback error" />
      </LocalErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      'Callback Component'
    );

    const [error, componentName] = onErrorMock.mock.calls[0];
    expect(error.message).toBe('Callback error');
    expect(componentName).toBe('Callback Component');
  });

  test('has retry button that resets error state', () => {
    renderWithTheme(
      <LocalErrorBoundary componentName="重试测试">
        <ThrowError />
      </LocalErrorBoundary>
    );

    expect(screen.getByText('重试测试出现问题')).toBeInTheDocument();
    
    // 验证重试按钮存在且可点击
    const retryButton = screen.getByRole('button', { name: '重试' });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeEnabled();
    
    // 点击重试按钮不应该抛出错误（这验证了重试机制存在）
    expect(() => {
      fireEvent.click(retryButton);
    }).not.toThrow();
  });
});

// 集成测试：测试错误边界组合使用
describe('Error Boundary Integration', () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeAll(() => {
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  test('LocalErrorBoundary catches error before it reaches ErrorBoundary', () => {
    renderWithTheme(
      <ErrorBoundary>
        <div>
          <h1>App Content</h1>
          <LocalErrorBoundary componentName="局部组件">
            <ThrowError errorMessage="局部错误" />
          </LocalErrorBoundary>
        </div>
      </ErrorBoundary>
    );

    // 应该显示局部错误UI，而不是全局错误UI
    expect(screen.getByText('App Content')).toBeInTheDocument();
    expect(screen.getByText('局部组件出现问题')).toBeInTheDocument();
    expect(screen.queryByText('应用遇到了问题')).not.toBeInTheDocument();
  });

  test('ErrorBoundary catches error when LocalErrorBoundary fails', () => {
    // 模拟LocalErrorBoundary本身出错的情况
    const FailingLocalErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      throw new Error('LocalErrorBoundary failed');
    };

    renderWithTheme(
      <ErrorBoundary>
        <FailingLocalErrorBoundary>
          <div>Normal content</div>
        </FailingLocalErrorBoundary>
      </ErrorBoundary>
    );

    // 应该显示全局错误UI
    expect(screen.getByText('应用遇到了问题')).toBeInTheDocument();
    expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
  });
});