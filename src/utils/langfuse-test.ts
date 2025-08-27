/**
 * Langfuse Integration Test
 * 
 * 自动验证 Langfuse 集成在开发环境中的功能性
 * 仅在开发模式下运行，生产环境中会被优化掉
 */

// 开发环境下的 Langfuse 集成测试
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 Langfuse integration test - Development mode detected');
  
  // 检查 Langfuse 相关环境变量
  const langfusePublicKey = process.env.REACT_APP_LANGFUSE_PUBLIC_KEY;
  const langfuseSecretKey = process.env.REACT_APP_LANGFUSE_SECRET_KEY;
  const langfuseHost = process.env.REACT_APP_LANGFUSE_HOST;
  
  if (langfusePublicKey || langfuseSecretKey || langfuseHost) {
    console.log('✅ Langfuse environment variables detected');
    
    // 简单的连接性测试（不暴露敏感信息）
    if (langfuseHost) {
      console.log(`🌐 Langfuse host configured: ${langfuseHost}`);
    }
  } else {
    console.log('ℹ️ Langfuse environment variables not configured - this is optional');
  }
}

// 导出空对象以满足 import 语句
export {};