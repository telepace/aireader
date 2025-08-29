# OpenRouter 并发测试指南

本指南介绍如何使用新创建的并发测试工具来测试OpenRouter API的多模型并发能力和负载均衡特性。

## 📋 功能概述

我们创建了一套完整的测试工具，包括：

1. **ConcurrentTestService** - 核心测试服务
2. **ConcurrentTestPanel** - 可视化测试面板
3. **TestRunner** - 自动化测试运行器
4. **测试用例** - 预定义的测试场景

## 🚀 如何使用

### 方法1: 使用可视化界面

1. 启动应用后，点击顶部标签切换到"并发测试"面板
2. 在测试面板中配置：
   - 选择要测试的模型（可多选）
   - 设置测试提示词
   - 调整并发数和迭代次数
3. 点击"运行并发测试"或"运行负载测试"
4. 查看实时结果和性能指标

### 方法2: 使用测试运行器

```typescript
import { globalTestRunner } from './src/utils/testRunner';

// 运行所有测试
const reports = await globalTestRunner.runAllTests();

// 运行特定测试
const singleReport = await globalTestRunner.runTest('单模型基础测试');

// 生成报告
const htmlReport = globalTestRunner.generateHTMLReport(reports);
```

### 方法3: 直接调用服务

```typescript
import { ConcurrentTestService } from './src/services/concurrentTestService';

const testService = ConcurrentTestService.getInstance();

// 并发测试多个模型
const results = await testService.testModelsConcurrently(
  ['测试提示词1', '测试提示词2'],
  ['google/gemini-2.5-flash', 'deepseek/deepseek-chat-v3-0324'],
  3 // 最大并发数
);

// 负载测试
const loadResult = await testService.runLoadTest({
  maxConcurrency: 5,
  timeout: 15000,
  prompts: ['测试提示'],
  models: ['google/gemini-2.5-flash']
});
```

## 📊 测试场景

### 1. 单模型基础测试
- **目的**: 测试单个模型的基本响应能力
- **配置**: 1个模型，3次迭代，低并发
- **预期**: 成功率≥90%，延迟≤3秒

### 2. 多模型并发测试
- **目的**: 测试多个模型同时处理请求的能力
- **配置**: 3个模型，5次迭代，3并发
- **预期**: 成功率≥80%，延迟≤5秒

### 3. 高并发压力测试
- **目的**: 测试系统在高并发下的稳定性
- **配置**: 2个模型，10次迭代，5并发
- **预期**: 成功率≥70%，延迟≤8秒

### 4. 负载均衡测试
- **目的**: 测试不同模型的负载均衡效果
- **配置**: 4个模型，8次迭代，4并发
- **预期**: 成功率≥75%，延迟≤4秒

## 📈 性能指标

测试完成后，您将获得以下指标：

- **总请求数**: 发送的总API请求数量
- **成功请求**: 成功完成的请求数量
- **失败请求**: 失败的请求数量
- **成功率**: 成功请求占总请求的比例
- **平均延迟**: 所有成功请求的平均响应时间
- **最小/最大延迟**: 最快和最慢的响应时间
- **吞吐量**: 每秒处理的请求数
- **模型性能**: 每个模型的详细性能数据

## 🔍 结果分析

### 正常指标参考
- **成功率**: >80% 为良好
- **平均延迟**: <5秒 为可接受
- **吞吐量**: >0.5 req/s 为合理

### 常见问题
- **高延迟**: 可能是网络问题或模型响应慢
- **失败率高**: 可能是API限制或模型服务异常
- **并发瓶颈**: 可能需要调整并发数限制

## 🛠️ 故障排除

### 测试失败的处理
1. **检查API密钥**: 确保OpenRouter API密钥有效
2. **网络连接**: 验证网络连接稳定性
3. **模型可用性**: 使用健康检查功能确认模型状态
4. **并发限制**: 适当降低并发数以避免API限制

### 性能优化建议
1. **选择合适的模型**: 根据需求选择响应速度快的模型
2. **调整并发数**: 找到最佳并发平衡点
3. **设置合理超时**: 避免过长等待影响测试效率

## 📁 文件结构

```
src/
├── services/
│   ├── concurrentTestService.ts      # 核心测试服务
│   └── concurrentTestService.test.ts # 单元测试
├── components/
│   └── ConcurrentTestPanel.tsx       # 可视化测试面板
└── utils/
    └── testRunner.ts                 # 自动化测试运行器
```

## 🧪 运行测试

### 运行单元测试
```bash
npm test -- src/services/concurrentTestService.test.ts
```

### 运行完整测试套件
```bash
# 在浏览器中打开应用，切换到"并发测试"标签页
npm start
# 然后在UI中运行测试
```

### 使用测试运行器
```bash
# 运行所有测试
node -e "require('./src/utils/testRunner').globalTestRunner.runAllTests().then(console.log)"

# 运行特定测试
node -e "require('./src/utils/testRunner').globalTestRunner.runTest('单模型基础测试').then(console.log)"
```

## 🎯 实际测试示例

### 测试OpenRouter负载均衡特性

```typescript
// 测试轮询负载均衡
const results = await ConcurrentTestService.getInstance()
  .testRoundRobinLoadBalancing(
    '请用一句话介绍人工智能',
    ['google/gemini-2.5-flash', 'deepseek/deepseek-chat-v3-0324'],
    10
  );

// 分析结果
const modelCounts = results.reduce((acc, r) => {
  acc[r.model] = (acc[r.model] || 0) + 1;
  return acc;
}, {});
console.log('负载分布:', modelCounts);
```

### 测试并发性能

```typescript
// 高并发测试
const loadTest = {
  maxConcurrency: 5,
  timeout: 20000,
  prompts: Array(20).fill('测试并发性能'),
  models: ['google/gemini-2.5-flash']
};

const result = await ConcurrentTestService.getInstance().runLoadTest(loadTest);
console.log(`吞吐量: ${result.throughput} req/s`);
console.log(`平均延迟: ${result.averageLatency}ms`);
```

## 📋 测试报告

测试完成后，您可以选择以下格式导出结果：
- **HTML报告**: 可视化展示，适合分享
- **CSV数据**: 便于进一步分析
- **JSON格式**: 程序化使用

## 🔄 持续集成

可以将这些测试集成到CI/CD流程中，定期检查API性能和可用性。

这套测试工具将帮助您全面了解OpenRouter API的并发性能和负载均衡特性，为生产环境的使用提供可靠的数据支持。