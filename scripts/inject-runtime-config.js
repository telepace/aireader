#!/usr/bin/env node
/**
 * 运行时配置注入脚本
 * 在构建完成后，将环境变量注入到 build/config.js 文件中
 * 这样可以在 Railway 等平台上实现真正的运行时配置
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../build/config.js');

// 从环境变量中读取配置 - 使用安全默认值
const runtimeConfig = {
  REACT_APP_OPENROUTER_API_KEY: process.env.REACT_APP_OPENROUTER_API_KEY || '',
  REACT_APP_LANGFUSE_SECRET_KEY: process.env.REACT_APP_LANGFUSE_SECRET_KEY || '',
  REACT_APP_LANGFUSE_PUBLIC_KEY: process.env.REACT_APP_LANGFUSE_PUBLIC_KEY || '',
  REACT_APP_LANGFUSE_BASE_URL: process.env.REACT_APP_LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
  REACT_APP_APP_NAME: process.env.REACT_APP_APP_NAME || 'AI Prompt Tester',
  REACT_APP_APP_VERSION: process.env.REACT_APP_APP_VERSION || '1.0.0'
};

// 生成运行时配置内容
const configContent = `// Runtime Configuration - Auto Generated
// Generated at: ${new Date().toISOString()}
// Platform: ${process.platform}

window.ENV = ${JSON.stringify(runtimeConfig, null, 2)};

// 调试信息 - 在生产环境也显示以便于问题排查
console.log('📊 Runtime Configuration Loaded:', {
  hasApiKey: !!window.ENV.REACT_APP_OPENROUTER_API_KEY && window.ENV.REACT_APP_OPENROUTER_API_KEY.length > 0,
  hasLangfuseSecret: !!window.ENV.REACT_APP_LANGFUSE_SECRET_KEY && window.ENV.REACT_APP_LANGFUSE_SECRET_KEY.length > 0,
  hasLangfusePublic: !!window.ENV.REACT_APP_LANGFUSE_PUBLIC_KEY && window.ENV.REACT_APP_LANGFUSE_PUBLIC_KEY.length > 0,
  langfuseBaseUrl: window.ENV.REACT_APP_LANGFUSE_BASE_URL,
  appName: window.ENV.REACT_APP_APP_NAME,
  appVersion: window.ENV.REACT_APP_APP_VERSION,
  timestamp: '${new Date().toISOString()}',
  hostname: window.location.hostname
});

// 应用启动状态检查
window.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 DOM Content Loaded - checking app initialization...');
  
  setTimeout(function() {
    const root = document.getElementById('root');
    if (root && root.children.length === 0) {
      console.error('❌ React app failed to render - root element is empty');
      console.log('🔧 Troubleshooting info:', {
        rootElement: !!root,
        hasReactDevTools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__,
        userAgent: navigator.userAgent,
        location: window.location.href
      });
    } else {
      console.log('✅ React app appears to be rendering');
    }
  }, 3000);
});
`;

try {
  // 确保 build 目录存在
  if (!fs.existsSync(path.dirname(CONFIG_FILE))) {
    console.log('Build directory not found, skipping runtime config injection');
    process.exit(0);
  }

  // 写入配置文件
  fs.writeFileSync(CONFIG_FILE, configContent, 'utf8');
  
  console.log('✅ Runtime configuration injected successfully');
  console.log('📍 Config file:', CONFIG_FILE);
  console.log('🔑 Environment variables found:', {
    REACT_APP_OPENROUTER_API_KEY: process.env.REACT_APP_OPENROUTER_API_KEY ? '***SET***' : 'NOT_SET',
    REACT_APP_LANGFUSE_SECRET_KEY: process.env.REACT_APP_LANGFUSE_SECRET_KEY ? '***SET***' : 'NOT_SET',
    REACT_APP_LANGFUSE_PUBLIC_KEY: process.env.REACT_APP_LANGFUSE_PUBLIC_KEY ? '***SET***' : 'NOT_SET',
    REACT_APP_LANGFUSE_BASE_URL: process.env.REACT_APP_LANGFUSE_BASE_URL || 'NOT_SET',
    REACT_APP_APP_NAME: process.env.REACT_APP_APP_NAME || 'NOT_SET',
    REACT_APP_APP_VERSION: process.env.REACT_APP_APP_VERSION || 'NOT_SET'
  });

} catch (error) {
  console.error('❌ Failed to inject runtime configuration:', error.message);
  process.exit(1);
}