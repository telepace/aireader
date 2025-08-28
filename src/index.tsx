import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// 全局错误处理机制
window.addEventListener('error', (event) => {
  console.error('🚨 Global JavaScript Error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error,
    stack: event.error?.stack
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🚨 Unhandled Promise Rejection:', {
    reason: event.reason,
    promise: event.promise
  });
});

// 应用初始化错误处理
try {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  console.log('🚀 Starting React application...');
  console.log('📊 Environment Debug Info:', {
    nodeEnv: process.env.NODE_ENV,
    windowEnv: (window as any).ENV,
    timestamp: new Date().toISOString()
  });

  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  );
  
  console.log('✅ React application rendered successfully');
} catch (error) {
  console.error('❌ Failed to initialize React application:', error);
  
  // 显示友好的错误信息
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 2rem; font-family: system-ui, sans-serif; max-width: 600px; margin: 2rem auto;">
        <h1 style="color: #dc2626;">应用启动失败</h1>
        <p style="color: #666; line-height: 1.6;">React 应用无法正常启动。这通常是配置问题导致的。</p>
        <details style="margin: 1rem 0; padding: 1rem; background: #f8f9fa; border-radius: 4px;">
          <summary style="cursor: pointer; font-weight: 500;">技术详情</summary>
          <pre style="margin-top: 1rem; font-size: 0.875rem; color: #dc2626;">${error}</pre>
        </details>
        <p style="color: #666; font-size: 0.875rem;">请联系开发者或稍后重试。</p>
      </div>
    `;
  }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
