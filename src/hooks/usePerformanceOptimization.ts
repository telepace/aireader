/**
 * 性能优化Hook - 提供内存管理、状态清理和性能监控
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import { ContextManager, MemoryOptimizer } from '../utils/contextManager';

export interface PerformanceConfig {
  enableMemoryOptimization: boolean;
  maxMessagesInMemory: number;
  maxOptionsPerType: number;
  cleanupInterval: number; // milliseconds
  enablePerformanceMonitoring: boolean;
  debounceDelay: number;
}

export interface PerformanceStats {
  messagesCount: number;
  optionsCount: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  renderCount: number;
  lastCleanupTime: number;
}

const defaultConfig: PerformanceConfig = {
  enableMemoryOptimization: true,
  maxMessagesInMemory: 100,
  maxOptionsPerType: 20,
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
  enablePerformanceMonitoring: false,
  debounceDelay: 300
};

/**
 * 性能优化Hook
 */
export function usePerformanceOptimization(config: Partial<PerformanceConfig> = {}) {
  const finalConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    messagesCount: 0,
    optionsCount: 0,
    memoryUsage: { used: 0, total: 0, percentage: 0 },
    renderCount: 0,
    lastCleanupTime: Date.now()
  });

  const contextManagerRef = useRef<ContextManager>();

  // 初始化上下文管理器
  useEffect(() => {
    contextManagerRef.current = ContextManager.getInstance({
      maxTokens: 12000,
      preserveSystemMessage: true,
      preserveRecentMessages: 10,
      summarizeOldContext: false,
      enableMemoryOptimization: finalConfig.enableMemoryOptimization
    });

    if (finalConfig.enableMemoryOptimization) {
      MemoryOptimizer.startAutoCleanup(finalConfig.cleanupInterval);
    }

    return () => {
      MemoryOptimizer.stopAutoCleanup();
    };
  }, [finalConfig.enableMemoryOptimization, finalConfig.cleanupInterval]);

  /**
   * 清理过期状态
   */
  const performCleanup = useCallback((
    messages: any[],
    options: any[],
    setMessages: (fn: (prev: any[]) => any[]) => void,
    setOptions: (fn: (prev: any[]) => any[]) => void
  ) => {
    if (!finalConfig.enableMemoryOptimization) return;

    // 清理消息
    if (messages.length > finalConfig.maxMessagesInMemory) {
      setMessages(prev => prev.slice(-finalConfig.maxMessagesInMemory));
    }

    // 清理选项
    if (options.length > finalConfig.maxOptionsPerType * 2) {
      setOptions(prev => {
        const deepenOptions = prev.filter(o => o.type === 'deepen').slice(0, finalConfig.maxOptionsPerType);
        const nextOptions = prev.filter(o => o.type === 'next').slice(0, finalConfig.maxOptionsPerType);
        return [...deepenOptions, ...nextOptions];
      });
    }

    setPerformanceStats(prev => ({
      ...prev,
      lastCleanupTime: Date.now()
    }));
  }, [finalConfig.enableMemoryOptimization, finalConfig.maxMessagesInMemory, finalConfig.maxOptionsPerType]);

  /**
   * 防抖的清理函数
   */
  const debouncedCleanup = useMemo(
    () => debounce((
      messages: any[],
      options: any[],
      setMessages: (fn: (prev: any[]) => any[]) => void,
      setOptions: (fn: (prev: any[]) => any[]) => void
    ) => {
      performCleanup(messages, options, setMessages, setOptions);
    }, finalConfig.debounceDelay),
    [performCleanup, finalConfig.debounceDelay]
  );

  /**
   * 上下文裁剪
   */
  const trimContext = useCallback((messages: any[]) => {
    if (!contextManagerRef.current) return messages;
    return contextManagerRef.current.trimContext(messages);
  }, []);

  /**
   * 更新性能统计
   */
  const updateStats = useCallback((messagesCount: number, optionsCount: number, renderCount: number) => {
    if (!finalConfig.enablePerformanceMonitoring) return;

    const memoryUsage = MemoryOptimizer.getMemoryStats();
    
    setPerformanceStats(prev => ({
      messagesCount,
      optionsCount,
      memoryUsage,
      renderCount,
      lastCleanupTime: prev.lastCleanupTime
    }));
  }, [finalConfig.enablePerformanceMonitoring]);

  /**
   * 防抖的输入处理器
   */
  const createDebouncedHandler = useCallback(<T extends (...args: any[]) => any>(
    handler: T,
    delay: number = finalConfig.debounceDelay
  ) => {
    return debounce(handler, delay);
  }, [finalConfig.debounceDelay]);

  /**
   * 创建防抖的API调用
   */
  const createDebouncedApiCall = useCallback(<T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    delay: number = finalConfig.debounceDelay
  ) => {
    return debounce(apiCall, delay);
  }, [finalConfig.debounceDelay]);

  /**
   * 手动触发清理
   */
  const manualCleanup = useCallback(() => {
    MemoryOptimizer.performCleanup();
    setPerformanceStats(prev => ({
      ...prev,
      lastCleanupTime: Date.now()
    }));
  }, []);

  /**
   * 获取上下文统计信息
   */
  const getContextStats = useCallback((messages: any[]) => {
    if (!contextManagerRef.current) return null;
    return contextManagerRef.current.getContextStats(messages);
  }, []);

  return {
    // 主要功能
    performCleanup,
    debouncedCleanup,
    trimContext,
    manualCleanup,
    
    // 统计和监控
    performanceStats,
    updateStats,
    getContextStats,
    
    // 工具函数
    createDebouncedHandler,
    createDebouncedApiCall,
    
    // 配置
    config: finalConfig
  };
}

/**
 * 组件性能监控Hook
 */
export function useRenderOptimization(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(Date.now());

  useEffect(() => {
    renderCountRef.current += 1;
    const now = Date.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    lastRenderTimeRef.current = now;

    // 性能监控日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development' && timeSinceLastRender < 16) {
      console.warn(`${componentName} rendering too frequently: ${timeSinceLastRender}ms since last render`);
    }
  });

  return {
    renderCount: renderCountRef.current
  };
}

/**
 * 长列表虚拟化Hook
 */
export function useVirtualization<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number,
  buffer: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + buffer * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, buffer]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
      top: (visibleRange.start + index) * itemHeight
    }));
  }, [items, visibleRange, itemHeight]);

  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    visibleRange
  };
}

/**
 * 请求缓存Hook
 */
export function useApiCache<T>(
  cacheKey: string,
  apiCall: () => Promise<T>,
  ttl: number = 5 * 60 * 1000 // 5分钟
) {
  const cacheRef = useRef<Map<string, { data: T; expiry: number }>>(new Map());

  const cachedApiCall = useCallback(async (): Promise<T> => {
    const now = Date.now();
    const cached = cacheRef.current.get(cacheKey);

    if (cached && cached.expiry > now) {
      return cached.data;
    }

    const data = await apiCall();
    cacheRef.current.set(cacheKey, {
      data,
      expiry: now + ttl
    });

    // 清理过期缓存
    const entries = Array.from(cacheRef.current.entries());
    for (const [key, value] of entries) {
      if (value.expiry <= now) {
        cacheRef.current.delete(key);
      }
    }

    return data;
  }, [cacheKey, apiCall, ttl]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    cachedApiCall,
    clearCache
  };
}