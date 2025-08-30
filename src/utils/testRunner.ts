import { ConcurrentTestService, LoadTestResult } from '../services/concurrentTestService';

export interface TestScenario {
  name: string;
  description: string;
  config: {
    prompts: string[];
    models: string[];
    maxConcurrency: number;
    timeout: number;
    iterations: number;
  };
  expected?: {
    minSuccessRate?: number;
    maxAverageLatency?: number;
    minThroughput?: number;
  };
}

export interface TestReport {
  scenario: TestScenario;
  result: LoadTestResult;
  passed: boolean;
  metrics: {
    successRate: number;
    averageLatency: number;
    throughput: number;
    errors: string[];
  };
}

export class TestRunner {
  private testService = ConcurrentTestService.getInstance();

  /**
   * 预定义的测试场景
   */
  private testScenarios: TestScenario[] = [
    {
      name: "单模型基础测试",
      description: "测试单个模型的基本响应能力",
      config: {
        prompts: ["你好，请做个简单的自我介绍"],
        models: ["google/gemini-2.5-flash"],
        maxConcurrency: 1,
        timeout: 10000,
        iterations: 3
      },
      expected: {
        minSuccessRate: 0.9,
        maxAverageLatency: 3000
      }
    },
    {
      name: "多模型并发测试",
      description: "测试多个模型同时处理请求的能力",
      config: {
        prompts: [
          "人工智能的主要应用场景有哪些？",
          "请介绍机器学习的基本概念",
          "深度学习与机器学习的区别是什么？"
        ],
        models: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-pro",
          "deepseek/deepseek-chat-v3-0324"
        ],
        maxConcurrency: 3,
        timeout: 15000,
        iterations: 5
      },
      expected: {
        minSuccessRate: 0.8,
        maxAverageLatency: 5000
      }
    },
    {
      name: "高并发压力测试",
      description: "测试系统在高并发情况下的稳定性",
      config: {
        prompts: [
          "请解释什么是神经网络",
          "描述一下强化学习",
          "什么是自然语言处理？",
          "计算机视觉有哪些应用？"
        ],
        models: [
          "google/gemini-2.5-flash",
          "deepseek/deepseek-chat-v3-0324"
        ],
        maxConcurrency: 5,
        timeout: 20000,
        iterations: 10
      },
      expected: {
        minSuccessRate: 0.7,
        maxAverageLatency: 8000,
        minThroughput: 0.5
      }
    },
    {
      name: "负载均衡测试",
      description: "测试不同模型的负载均衡效果",
      config: {
        prompts: ["请用一句话总结人工智能的发展趋势"],
        models: [
          "google/gemini-2.5-flash",
          "google/gemini-2.5-pro",
          "deepseek/deepseek-chat-v3-0324",
          "deepseek/deepseek-r1-0528"
        ],
        maxConcurrency: 4,
        timeout: 12000,
        iterations: 8
      },
      expected: {
        minSuccessRate: 0.75,
        maxAverageLatency: 4000
      }
    }
  ];

  /**
   * 运行所有测试场景
   */
  async runAllTests(): Promise<TestReport[]> {
    const reports: TestReport[] = [];
    
    console.log('🚀 开始运行OpenRouter并发测试套件...');
    
    for (const scenario of this.testScenarios) {
      console.log(`📊 运行测试场景: ${scenario.name}`);
      
      try {
        const result = await this.testService.runLoadTest({
          maxConcurrency: scenario.config.maxConcurrency,
          timeout: scenario.config.timeout,
          prompts: scenario.config.prompts,
          models: scenario.config.models
        });

        const report = this.generateReport(scenario, result);
        reports.push(report);

        console.log(`✅ 完成: ${scenario.name} - ${report.passed ? '通过' : '失败'}`);
        
        if (!report.passed) {
          console.log(`❌ 失败原因: ${report.metrics.errors.join(', ')}`);
        }
      } catch (error) {
        console.error(`❗ 测试场景 ${scenario.name} 运行失败:`, error);
        reports.push({
          scenario,
          result: {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            averageLatency: 0,
            minLatency: 0,
            maxLatency: 0,
            throughput: 0,
            results: [],
            modelPerformance: {}
          },
          passed: false,
          metrics: {
            successRate: 0,
            averageLatency: 0,
            throughput: 0,
            errors: [error instanceof Error ? error.message : '未知错误']
          }
        });
      }
    }

    console.log('🏁 所有测试运行完成');
    return reports;
  }

  /**
   * 运行单个测试场景
   */
  async runTest(scenarioName: string): Promise<TestReport> {
    const scenario = this.testScenarios.find(s => s.name === scenarioName);
    if (!scenario) {
      throw new Error(`测试场景 '${scenarioName}' 不存在`);
    }

    console.log(`🎯 运行测试: ${scenario.name}`);
    
    const result = await this.testService.runLoadTest({
      maxConcurrency: scenario.config.maxConcurrency,
      timeout: scenario.config.timeout,
      prompts: scenario.config.prompts,
      models: scenario.config.models
    });

    return this.generateReport(scenario, result);
  }

  /**
   * 生成测试报告
   */
  private generateReport(scenario: TestScenario, result: LoadTestResult): TestReport {
    const successRate = result.totalRequests > 0 ? result.successfulRequests / result.totalRequests : 0;
    const errors = [];

    if (scenario.expected) {
      if (scenario.expected.minSuccessRate && successRate < scenario.expected.minSuccessRate) {
        errors.push(`成功率 ${(successRate * 100).toFixed(1)}% 低于期望值 ${scenario.expected.minSuccessRate * 100}%`);
      }

      if (scenario.expected.maxAverageLatency && result.averageLatency > scenario.expected.maxAverageLatency) {
        errors.push(`平均延迟 ${result.averageLatency.toFixed(0)}ms 超过期望值 ${scenario.expected.maxAverageLatency}ms`);
      }

      if (scenario.expected.minThroughput && result.throughput < scenario.expected.minThroughput) {
        errors.push(`吞吐量 ${result.throughput.toFixed(2)} req/s 低于期望值 ${scenario.expected.minThroughput} req/s`);
      }
    }

    return {
      scenario,
      result,
      passed: errors.length === 0,
      metrics: {
        successRate,
        averageLatency: result.averageLatency,
        throughput: result.throughput,
        errors
      }
    };
  }

  /**
   * 生成HTML格式的测试报告
   */
  generateHTMLReport(reports: TestReport[]): string {
    const totalTests = reports.length;
    const passedTests = reports.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    const summary = {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: totalTests > 0 ? passedTests / totalTests : 0,
      averageLatency: reports.reduce((sum, r) => sum + r.metrics.averageLatency, 0) / totalTests,
      averageThroughput: reports.reduce((sum, r) => sum + r.metrics.throughput, 0) / totalTests
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <title>OpenRouter 并发测试报告</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .metric { background: #e8f4f8; padding: 15px; border-radius: 8px; text-align: center; }
        .test-result { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .passed { border-color: #4caf50; background: #f1f8e9; }
        .failed { border-color: #f44336; background: #ffebee; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>OpenRouter API 并发测试报告</h1>
        <p>生成时间: ${new Date().toLocaleString()}</p>
    </div>

    <div class="summary">
        <div class="metric">
            <h3>总测试数</h3>
            <p>${summary.total}</p>
        </div>
        <div class="metric">
            <h3>通过测试</h3>
            <p>${summary.passed}</p>
        </div>
        <div class="metric">
            <h3>失败测试</h3>
            <p>${summary.failed}</p>
        </div>
        <div class="metric">
            <h3>成功率</h3>
            <p>${(summary.successRate * 100).toFixed(1)}%</p>
        </div>
    </div>

    ${reports.map(report => `
    <div class="test-result ${report.passed ? 'passed' : 'failed'}">
        <h3>${report.scenario.name}</h3>
        <p>${report.scenario.description}</p>
        
        <table>
            <tr><th>指标</th><th>值</th></tr>
            <tr><td>总请求数</td><td>${report.result.totalRequests}</td></tr>
            <tr><td>成功请求</td><td>${report.result.successfulRequests}</td></tr>
            <tr><td>失败请求</td><td>${report.result.failedRequests}</td></tr>
            <tr><td>平均延迟</td><td>${report.result.averageLatency.toFixed(0)}ms</td></tr>
            <tr><td>吞吐量</td><td>${report.result.throughput.toFixed(2)} req/s</td></tr>
            <tr><td>状态</td><td>${report.passed ? '通过' : '失败'}</td></tr>
        </table>

        ${report.metrics.errors.length > 0 ? `
        <div>
            <h4>错误信息:</h4>
            <ul>${report.metrics.errors.map(error => `<li>${error}</li>`).join('')}</ul>
        </div>
        ` : ''}
    </div>
    `).join('')}

</body>
</html>
    `;
  }

  /**
   * 导出测试结果到JSON
   */
  exportToJSON(reports: TestReport[]): string {
    return JSON.stringify({
      summary: {
        totalTests: reports.length,
        passedTests: reports.filter(r => r.passed).length,
        failedTests: reports.filter(r => !r.passed).length,
        timestamp: new Date().toISOString()
      },
      reports,
      metadata: {
        service: 'OpenRouter Concurrent Testing',
        version: '1.0.0'
      }
    }, null, 2);
  }

  /**
   * 生成CSV格式的性能数据
   */
  exportToCSV(reports: TestReport[]): string {
    const headers = ['Scenario', 'Model', 'Requests', 'SuccessRate', 'AvgLatency', 'Throughput'];
    const rows: string[] = [headers.join(',')];

    reports.forEach(report => {
      Object.entries(report.result.modelPerformance).forEach(([model, perf]) => {
        rows.push([
          report.scenario.name,
          model,
          perf.totalRequests.toString(),
          (perf.successRate * 100).toFixed(1),
          perf.avgLatency.toFixed(0),
          report.result.throughput.toFixed(2)
        ].join(','));
      });
    });

    return rows.join('\n');
  }
}

// 命令行测试运行器
export class CLI {
  private testRunner = new TestRunner();

  async main(args: string[]) {
    if (args.includes('--help') || args.includes('-h')) {
      this.printHelp();
      return;
    }

    if (args.includes('--list')) {
      this.listScenarios();
      return;
    }

    const scenarioName = args.find(arg => !arg.startsWith('--'));
    
    if (scenarioName) {
      console.log(`🎯 运行指定测试: ${scenarioName}`);
      const report = await this.testRunner.runTest(scenarioName);
      console.log(this.formatReport(report));
      
      if (args.includes('--json')) {
        console.log('\n📊 JSON 输出:');
        console.log(this.testRunner.exportToJSON([report]));
      }
    } else {
      console.log('🚀 运行完整测试套件...');
      const reports = await this.testRunner.runAllTests();
      
      console.log('\n📋 测试总结:');
      const passed = reports.filter(r => r.passed).length;
      const total = reports.length;
      console.log(`通过: ${passed}/${total}  (${((passed/total)*100).toFixed(1)}%)`);

      if (args.includes('--html')) {
        const htmlReport = this.testRunner.generateHTMLReport(reports);
        console.log('\n📝 HTML 报告已生成');
        // 在浏览器环境中可以下载文件
        this.downloadFile('test-report.html', htmlReport, 'text/html');
      }

      if (args.includes('--csv')) {
        const csvReport = this.testRunner.exportToCSV(reports);
        this.downloadFile('test-results.csv', csvReport, 'text/csv');
      }
    }
  }

  private printHelp() {
    console.log(`
OpenRouter 并发测试工具

使用方法:
  node testRunner.js [场景名称] [选项]

选项:
  --help, -h     显示帮助信息
  --list         列出所有测试场景
  --json         输出JSON格式结果
  --html         生成HTML报告
  --csv          生成CSV格式数据

示例:
  node testRunner.js                    # 运行所有测试
  node testRunner.js "单模型基础测试"   # 运行指定测试
  node testRunner.js --list             # 列出测试场景
    `);
  }

  private listScenarios() {
    console.log('可用测试场景:');
    new TestRunner()['testScenarios'].forEach((scenario, index) => {
      console.log(`  ${index + 1}. ${scenario.name} - ${scenario.description}`);
    });
  }

  private formatReport(report: TestReport): string {
    return `
${report.passed ? '✅' : '❌'} ${report.scenario.name}
${report.scenario.description}

📊 结果:
  总请求: ${report.result.totalRequests}
  成功: ${report.result.successfulRequests}
  失败: ${report.result.failedRequests}
  成功率: ${(report.metrics.successRate * 100).toFixed(1)}%
  平均延迟: ${report.result.averageLatency.toFixed(0)}ms
  吞吐量: ${report.result.throughput.toFixed(2)} req/s

${report.metrics.errors.length > 0 ? `⚠️ 问题: ${report.metrics.errors.join(', ')}` : '✅ 所有指标正常'}
    `.trim();
  }

  private downloadFile(filename: string, content: string, type: string) {
    if (typeof window !== 'undefined') {
      // 浏览器环境
      const blob = new Blob([content], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // Node.js环境 - 需要文件系统支持
      console.log(`文件 ${filename} 已准备就绪 (需要在支持文件系统的环境中保存)`);
    }
  }
}

// 导出全局测试运行器
export const globalTestRunner = new TestRunner();