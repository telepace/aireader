import { ConcurrentTestService } from './concurrentTestService';

// 简化测试，只测试核心逻辑
describe('ConcurrentTestService', () => {
  let testService: ConcurrentTestService;

  beforeEach(() => {
    testService = ConcurrentTestService.getInstance();
  });

  describe('Token Estimation', () => {
    it('should estimate tokens for English text', () => {
      const text = 'This is a simple test sentence';
      const tokens = testService['estimateTokens'](text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should estimate tokens for Chinese text', () => {
      const text = '这是一个中文测试';
      const tokens = testService['estimateTokens'](text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });

    it('should estimate tokens for mixed text', () => {
      const text = 'Hello 你好 world 世界';
      const tokens = testService['estimateTokens'](text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(typeof tokens).toBe('number');
    });
  });

  describe('Metrics Calculation', () => {
    it('should calculate basic metrics correctly', () => {
      const results = [
        { model: 'model1', status: 'success', latency: 100, tokens: 50, response: '', prompt: '' },
        { model: 'model1', status: 'success', latency: 200, tokens: 75, response: '', prompt: '' },
        { model: 'model2', status: 'error', latency: 300, tokens: 0, response: '', prompt: '' }
      ] as any;

      const metrics = testService['calculateLoadTestMetrics'](results, 1000);

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.successfulRequests).toBe(2);
      expect(metrics.failedRequests).toBe(1);
      expect(typeof metrics.averageLatency).toBe('number');
      expect(typeof metrics.throughput).toBe('number');
    });
  });

  describe('Service Initialization', () => {
    it('should create singleton instance', () => {
      const instance1 = ConcurrentTestService.getInstance();
      const instance2 = ConcurrentTestService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Semaphore', () => {
    it('should be defined', () => {
      expect(testService).toBeDefined();
    });
  });
});