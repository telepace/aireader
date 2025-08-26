#!/usr/bin/env node
/**
 * 运行时配置注入脚本
 * 在构建完成后，将环境变量注入到 build/config.js 文件中
 * 这样可以在 Railway 等平台上实现真正的运行时配置
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../build/config.js');

// 从环境变量中读取配置
const runtimeConfig = {
  REACT_APP_OPENROUTER_API_KEY: process.env.REACT_APP_OPENROUTER_API_KEY || '__REACT_APP_OPENROUTER_API_KEY__',
  REACT_APP_APP_NAME: process.env.REACT_APP_APP_NAME || '__REACT_APP_APP_NAME__',
  REACT_APP_APP_VERSION: process.env.REACT_APP_APP_VERSION || '__REACT_APP_APP_VERSION__'
};

// 生成运行时配置内容
const configContent = `// Runtime Configuration - Auto Generated
// Generated at: ${new Date().toISOString()}
// Platform: ${process.platform}

window.ENV = ${JSON.stringify(runtimeConfig, null, 2)};

// 调试信息 - 只在开发环境显示
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('Runtime ENV injected:', {
    hasApiKey: !!window.ENV.REACT_APP_OPENROUTER_API_KEY && window.ENV.REACT_APP_OPENROUTER_API_KEY !== "__REACT_APP_OPENROUTER_API_KEY__",
    appName: window.ENV.REACT_APP_APP_NAME,
    appVersion: window.ENV.REACT_APP_APP_VERSION,
    timestamp: '${new Date().toISOString()}'
  });
}
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
    REACT_APP_APP_NAME: process.env.REACT_APP_APP_NAME || 'NOT_SET',
    REACT_APP_APP_VERSION: process.env.REACT_APP_APP_VERSION || 'NOT_SET'
  });

} catch (error) {
  console.error('❌ Failed to inject runtime configuration:', error.message);
  process.exit(1);
}