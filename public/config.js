// 运行时配置文件 - 用于在 Railway 等平台上动态配置
// 这个文件可以在运行时注入环境变量
window.ENV = window.ENV || {};

// 在 Railway 部署时，可以通过环境变量注入
if (typeof process !== 'undefined' && process.env) {
  window.ENV.REACT_APP_OPENROUTER_API_KEY = process.env.REACT_APP_OPENROUTER_API_KEY;
  window.ENV.REACT_APP_APP_NAME = process.env.REACT_APP_APP_NAME;
  window.ENV.REACT_APP_APP_VERSION = process.env.REACT_APP_APP_VERSION;
}