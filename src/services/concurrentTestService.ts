import { AVAILABLE_MODELS } from '../hooks/useModelSelection';
import { generateContent } from './api';

export interface ConcurrentTestResult {
  model: string;
  prompt: string;
  response: string;
  latency: number;
  tokens: number;
  status: 'success' | 'error' | 'timeout';
  error?: string;
}

export interface LoadTestConfig {
  maxConcurrency: number;
  timeout: number;
  prompts: string[];
  models: string[];
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  minLatency: number;
  maxLatency: number;
  throughput: number; // requests per second
  results: ConcurrentTestResult[];
  modelPerformance: Record<string, {
    avgLatency: number;
    successRate: number;
    totalRequests: number;
  }>;
}

export class ConcurrentTestService {
  private static instance: ConcurrentTestService;

  static getInstance(): ConcurrentTestService {
    if (!ConcurrentTestService.instance) {
      ConcurrentTestService.instance = new ConcurrentTestService();
    }
    return ConcurrentTestService.instance;
  }

  /**
   * 并发测试多个模型
   */
  async testModelsConcurrently(
    prompts: string[],
    models: string[] = AVAILABLE_MODELS,
    maxConcurrency = 3
  ): Promise<ConcurrentTestResult[]> {
    const semaphore = new Semaphore(maxConcurrency);

    const promises = prompts.flatMap(prompt =>
      models.map(model =>
        semaphore.acquire().then(() =>
          this.executeSingleTest(prompt, model).finally(() => semaphore.release())
        )
      )
    );

    return Promise.allSettled(promises).then(results =>
      results.map(result =>
        result.status === 'fulfilled' ? result.value : {
          model: '',
          prompt: '',
          response: '',
          latency: 0,
          tokens: 0,
          status: 'error',
          error: result.reason
        }
      )
    );
  }

  /**
   * 负载测试
   */
  async runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
    const startTime = Date.now();
    const results: ConcurrentTestResult[] = [];
    const semaphore = new Semaphore(config.maxConcurrency);

    const testPromises = config.prompts.flatMap(prompt =>
      config.models.map(model =>
        semaphore.acquire().then(() =>
          this.executeSingleTest(prompt, model, config.timeout)
            .finally(() => semaphore.release())
        )
      )
    );

    const settledResults = await Promise.allSettled(testPromises);
    
    settledResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          model: '',
          prompt: '',
          response: '',
          latency: 0,
          tokens: 0,
          status: 'error',
          error: result.reason.message || 'Unknown error'
        });
      }
    });

    return this.calculateLoadTestMetrics(results, Date.now() - startTime);
  }

  /**
   * 执行单个测试
   */
  private async executeSingleTest(
    prompt: string,
    model: string,
    timeout = 30000
  ): Promise<ConcurrentTestResult> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await generateContent(
        'Test Prompt',
        prompt,
        model
      );

      clearTimeout(timeoutId);

      const endTime = Date.now();
      const latency = endTime - startTime;
      const tokens = this.estimateTokens(response);

      return {
        model,
        prompt,
        response,
        latency,
        tokens,
        status: 'success'
      };
    } catch (error) {
      return {
        model,
        prompt,
        response: '',
        latency: Date.now() - startTime,
        tokens: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 计算负载测试指标
   */
  private calculateLoadTestMetrics(
    results: ConcurrentTestResult[],
    totalTime: number
  ): LoadTestResult {
    const successfulResults = results.filter(r => r.status === 'success');
    const latencies = successfulResults.map(r => r.latency);
    
    const modelPerformance: Record<string, any> = {};
    
    AVAILABLE_MODELS.forEach(model => {
      const modelResults = results.filter(r => r.model === model);
      const successful = modelResults.filter(r => r.status === 'success');
      
      if (modelResults.length > 0) {
        modelPerformance[model] = {
          avgLatency: successful.length > 0 
            ? successful.reduce((sum, r) => sum + r.latency, 0) / successful.length 
            : 0,
          successRate: successful.length / modelResults.length,
          totalRequests: modelResults.length
        };
      }
    });

    return {
      totalRequests: results.length,
      successfulRequests: successfulResults.length,
      failedRequests: results.length - successfulResults.length,
      averageLatency: latencies.length > 0 
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length 
        : 0,
      minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
      maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
      throughput: (results.length / totalTime) * 1000, // requests per second
      results,
      modelPerformance
    };
  }

  /**
   * 估算token数量（简单估算）
   */
  private estimateTokens(text: string): number {
    // 简单估算：英文单词平均4字符，中文每个字符算2token
    const englishWords = text.match(/[a-zA-Z]+/g)?.length || 0;
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g)?.length || 0;
    return Math.ceil(englishWords * 0.75 + chineseChars * 2);
  }

  /**
   * 轮询负载均衡测试
   */
  async testRoundRobinLoadBalancing(
    prompt: string,
    models: string[] = AVAILABLE_MODELS,
    iterations = 10
  ) {
    const results: ConcurrentTestResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const model = models[i % models.length];
      const result = await this.executeSingleTest(prompt, model);
      results.push(result);
    }

    return results;
  }

  /**
   * 健康检查
   */
  async checkModelHealth(models: string[] = AVAILABLE_MODELS): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};
    
    for (const model of models) {
      try {
        await this.executeSingleTest('健康检查', model, 5000);
        health[model] = true;
      } catch {
        health[model] = false;
      }
    }
    
    return health;
  }
}

/**
 * 信号量类用于控制并发
 */
class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.permits++;
    if (this.queue.length > 0) {
      const resolve = this.queue.shift();
      if (resolve) {
        this.permits--;
        resolve();
      }
    }
  }
}