// Runtime Configuration - 运行时配置文件
// 此文件在构建后会被Railway等平台的环境变量替换
// 占位符会在部署时被实际的环境变量值替换

window.ENV = {
  // 这些占位符会在部署时被替换
  REACT_APP_OPENROUTER_API_KEY: "__REACT_APP_OPENROUTER_API_KEY__",
  REACT_APP_APP_NAME: "__REACT_APP_APP_NAME__",
  REACT_APP_APP_VERSION: "__REACT_APP_APP_VERSION__"
};

// 调试信息 - 只在开发环境显示
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('Runtime ENV loaded:', {
    hasApiKey: !!window.ENV.REACT_APP_OPENROUTER_API_KEY && window.ENV.REACT_APP_OPENROUTER_API_KEY !== "__REACT_APP_OPENROUTER_API_KEY__",
    appName: window.ENV.REACT_APP_APP_NAME,
    appVersion: window.ENV.REACT_APP_APP_VERSION
  });
}