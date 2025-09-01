const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 为 .j2 文件添加自定义处理规则
      webpackConfig.module.rules.unshift({
        test: /\.j2$/,
        use: [
          {
            loader: 'raw-loader',
          },
        ],
      });

      // 确保 .j2 文件能被解析
      if (webpackConfig.resolve.extensions) {
        webpackConfig.resolve.extensions.push('.j2');
      } else {
        webpackConfig.resolve.extensions = ['.j2'];
      }

      return webpackConfig;
    },
  },
};