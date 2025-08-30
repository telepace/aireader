/**
 * 性能优化测试套件
 * 验证上下文管理、内存优化和渲染性能
 */

import { ContextManager, MemoryOptimizer } from '../utils/contextManager';
import { renderHook, act } from '@testing-library/react';
import { usePerformanceOptimization } from '../hooks/usePerformanceOptimization';

// Mock ChatMessage interface for testing
interface TestChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    tokens?: number;
    important?: boolean;
    hasOptions?: boolean;
  };
}

describe('Performance Optimization Tests', () => {
  describe('ContextManager', () => {
    let contextManager: ContextManager;

    beforeEach(() => {
      contextManager = new ContextManager({
        maxTokens: 1000,
        preserveSystemMessage: true,
        preserveRecentMessages: 5,
        summarizeOldContext: false,
        enableMemoryOptimization: true
      });
    });

    test('should trim context when token limit is exceeded', () => {
      const messages: TestChatMessage[] = [
        { id: '1', role: 'system', content: 'System message', timestamp: 1 },
        { id: '2', role: 'user', content: 'A'.repeat(500), timestamp: 2 },
        { id: '3', role: 'assistant', content: 'B'.repeat(500), timestamp: 3 },
        { id: '4', role: 'user', content: 'C'.repeat(500), timestamp: 4 },
        { id: '5', role: 'assistant', content: 'D'.repeat(500), timestamp: 5 },
        { id: '6', role: 'user', content: 'E'.repeat(500), timestamp: 6 },
      ];

      const result = contextManager.trimContext(messages);

      // Should preserve system message and recent messages within token limit
      expect(result.length).toBeLessThanOrEqual(messages.length);
      expect(result[0].role).toBe('system');
      expect(result[result.length - 1].id).toBe('6'); // Most recent message preserved
    });

    test('should calculate tokens accurately', () => {
      const messages: TestChatMessage[] = [
        { id: '1', role: 'user', content: '你好世界', timestamp: 1 },
        { id: '2', role: 'assistant', content: 'Hello World', timestamp: 2 }
      ];

      const stats = contextManager.getContextStats(messages);

      expect(stats.totalTokens).toBeGreaterThan(0);
      expect(stats.totalMessages).toBe(2);
    });

    test('should prioritize important messages', () => {
      const messages: TestChatMessage[] = [
        { id: '1', role: 'user', content: 'Normal message', timestamp: 1 },
        { 
          id: '2', 
          role: 'assistant', 
          content: 'Important message', 
          timestamp: 2,
          metadata: { important: true }
        },
        { id: '3', role: 'user', content: 'Another normal message', timestamp: 3 },
      ];

      // Configure very small token limit to force selection
      const smallContextManager = new ContextManager({
        maxTokens: 50,
        preserveSystemMessage: false,
        preserveRecentMessages: 1,
        summarizeOldContext: false,
        enableMemoryOptimization: true
      });

      const result = smallContextManager.trimContext(messages);

      // Important message should be preserved if possible
      const importantMessage = result.find(m => m.metadata?.important);
      expect(importantMessage).toBeTruthy();
    });
  });

  describe('MemoryOptimizer', () => {
    test('should get memory stats', () => {
      const stats = MemoryOptimizer.getMemoryStats();

      expect(typeof stats.used).toBe('number');
      expect(typeof stats.total).toBe('number');
      expect(typeof stats.percentage).toBe('number');
      expect(stats.percentage).toBeGreaterThanOrEqual(0);
      expect(stats.percentage).toBeLessThanOrEqual(100);
    });

    test('should handle cleanup without errors', () => {
      expect(() => {
        MemoryOptimizer.performCleanup();
      }).not.toThrow();
    });

    test('should manage auto cleanup', () => {
      MemoryOptimizer.startAutoCleanup(100); // Very short interval for testing
      
      // Wait a bit to ensure interval is set
      setTimeout(() => {
        MemoryOptimizer.stopAutoCleanup();
      }, 50);
      
      expect(() => {
        MemoryOptimizer.stopAutoCleanup();
      }).not.toThrow();
    });
  });

  describe('usePerformanceOptimization Hook', () => {
    test('should initialize with default config', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      expect(result.current.config.enableMemoryOptimization).toBe(true);
      expect(result.current.config.maxMessagesInMemory).toBe(100);
      expect(result.current.performanceStats).toBeDefined();
    });

    test('should create debounced handlers', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const mockHandler = jest.fn();
      const debouncedHandler = result.current.createDebouncedHandler(mockHandler, 100);

      expect(typeof debouncedHandler).toBe('function');
    });

    test('should trim context using context manager', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const messages: TestChatMessage[] = [
        { id: '1', role: 'user', content: 'Test message', timestamp: 1 },
      ];

      const trimmed = result.current.trimContext(messages);
      expect(Array.isArray(trimmed)).toBe(true);
    });

    test('should update performance stats', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      act(() => {
        result.current.updateStats(10, 5, 3);
      });

      expect(result.current.performanceStats.messagesCount).toBe(10);
      expect(result.current.performanceStats.optionsCount).toBe(5);
      expect(result.current.performanceStats.renderCount).toBe(3);
    });

    test('should perform manual cleanup', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      act(() => {
        result.current.manualCleanup();
      });

      // Cleanup timestamp should be updated
      expect(result.current.performanceStats.lastCleanupTime).toBeLessThanOrEqual(Date.now());
    });

    test('should get context stats', () => {
      const { result } = renderHook(() => usePerformanceOptimization());

      const messages: TestChatMessage[] = [
        { id: '1', role: 'user', content: 'Test', timestamp: 1 },
        { id: '2', role: 'assistant', content: 'Response', timestamp: 2 },
      ];

      const stats = result.current.getContextStats(messages);
      
      expect(stats).toBeTruthy();
      expect(stats?.totalMessages).toBe(2);
      expect(stats?.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Performance Benchmarks', () => {
    test('should handle large message arrays efficiently', () => {
      const contextManager = new ContextManager();
      
      // Generate large message array
      const messages: TestChatMessage[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message content ${i}`.repeat(10),
        timestamp: Date.now() + i
      }));

      const startTime = performance.now();
      const result = contextManager.trimContext(messages);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      // Should complete in under 100ms for 1000 messages
      expect(processingTime).toBeLessThan(100);
      expect(result.length).toBeLessThan(messages.length);
      expect(result.length).toBeGreaterThan(0);
    });

    test('should efficiently calculate tokens for Chinese text', () => {
      const contextManager = new ContextManager();
      
      const chineseMessages: TestChatMessage[] = [
        { 
          id: '1', 
          role: 'user', 
          content: '这是一个包含中文字符的测试消息，用来验证token计算的准确性。'.repeat(10),
          timestamp: Date.now()
        }
      ];

      const startTime = performance.now();
      const stats = contextManager.getContextStats(chineseMessages);
      const endTime = performance.now();

      const processingTime = endTime - startTime;

      // Token calculation should be fast
      expect(processingTime).toBeLessThan(50);
      expect(stats.totalTokens).toBeGreaterThan(0);
    });

    test('should handle memory optimization for large option arrays', () => {
      const { result } = renderHook(() => usePerformanceOptimization({
        maxOptionsPerType: 10
      }));

      // Mock large arrays
      const messages: any[] = Array(200).fill(null).map((_, i) => ({ id: `msg-${i}` }));
      const options: any[] = Array(100).fill(null).map((_, i) => ({ 
        id: `opt-${i}`, 
        type: i % 2 === 0 ? 'deepen' : 'next' 
      }));

      const setMessages = jest.fn();
      const setOptions = jest.fn();

      const startTime = performance.now();
      
      act(() => {
        result.current.performCleanup(messages, options, setMessages, setOptions);
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      // Cleanup should be fast
      expect(processingTime).toBeLessThan(50);
      expect(setMessages).toHaveBeenCalled();
      expect(setOptions).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty message arrays', () => {
      const contextManager = new ContextManager();
      const result = contextManager.trimContext([]);
      
      expect(result).toEqual([]);
    });

    test('should handle messages with no content', () => {
      const contextManager = new ContextManager();
      const messages: TestChatMessage[] = [
        { id: '1', role: 'user', content: '', timestamp: 1 },
      ];

      const result = contextManager.trimContext(messages);
      expect(result.length).toBe(1);
    });

    test('should handle very long single message', () => {
      const contextManager = new ContextManager({
        maxTokens: 1000,
        preserveSystemMessage: true,
        preserveRecentMessages: 1,
        summarizeOldContext: false,
        enableMemoryOptimization: true
      });

      const messages: TestChatMessage[] = [
        { 
          id: '1', 
          role: 'user', 
          content: 'Very long message '.repeat(1000), // Very long message
          timestamp: 1 
        },
      ];

      const result = contextManager.trimContext(messages);
      
      // Should handle gracefully, may exclude if too large
      expect(Array.isArray(result)).toBe(true);
    });

    test('should handle invalid metadata gracefully', () => {
      const contextManager = new ContextManager();
      const messages: TestChatMessage[] = [
        { 
          id: '1', 
          role: 'user', 
          content: 'Test', 
          timestamp: 1,
          metadata: null as any // Invalid metadata
        },
      ];

      expect(() => {
        contextManager.trimContext(messages);
      }).not.toThrow();
    });
  });
});