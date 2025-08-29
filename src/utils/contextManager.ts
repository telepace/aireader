/**
 * 智能上下文管理器 - 解决大型对话性能问题
 * 提供基于token的精确裁剪和内存优化
 */

export interface ChatMessage {
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

export interface ContextConfig {
  maxTokens: number;
  preserveSystemMessage: boolean;
  preserveRecentMessages: number;
  summarizeOldContext: boolean;
  enableMemoryOptimization: boolean;
}

export class ContextManager {
  private config: ContextConfig;
  private static instance: ContextManager;

  constructor(config: ContextConfig = {
    maxTokens: 12000, // 保守的token限制
    preserveSystemMessage: true,
    preserveRecentMessages: 10,
    summarizeOldContext: false,
    enableMemoryOptimization: true
  }) {
    this.config = config;
  }

  static getInstance(config?: ContextConfig): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager(config);
    }
    return ContextManager.instance;
  }

  /**
   * 智能裁剪上下文，基于token计算和消息重要性
   */
  trimContext(messages: ChatMessage[]): ChatMessage[] {
    if (!messages.length) return [];

    // 1. 保留系统消息
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    if (!conversationMessages.length) return systemMessages;

    // 2. 计算系统消息的token数
    let usedTokens = this.calculateTokens(systemMessages);

    // 3. 保留最近的消息（这些消息通常最重要）
    const recentMessages = conversationMessages.slice(-this.config.preserveRecentMessages);
    const recentTokens = this.calculateTokens(recentMessages);

    // 4. 计算剩余预算
    const remainingBudget = this.config.maxTokens - usedTokens - recentTokens;

    if (remainingBudget <= 0) {
      // 如果最近消息已经超出预算，只保留部分最近消息
      return [...systemMessages, ...this.fitMessagesInBudget(recentMessages, this.config.maxTokens - usedTokens)];
    }

    // 5. 智能选择历史消息
    const historicalMessages = conversationMessages.slice(0, -this.config.preserveRecentMessages);
    const selectedHistorical = this.selectHistoricalMessages(historicalMessages, remainingBudget);

    return [...systemMessages, ...selectedHistorical, ...recentMessages];
  }

  /**
   * 估算消息的token数量
   * 使用更准确的估算方法，而不是简单的字符计数
   */
  private calculateTokens(messages: ChatMessage[]): number {
    return messages.reduce((total, msg) => {
      // 缓存token计算结果
      if (msg.metadata?.tokens) {
        return total + msg.metadata.tokens;
      }

      // 更准确的token估算公式
      // 1 token ≈ 4 characters for English, 2-3 for Chinese
      const content = msg.content || '';
      const chineseChars = (content.match(/[\u4e00-\u9fff]/g) || []).length;
      const otherChars = content.length - chineseChars;
      
      const estimatedTokens = Math.ceil(chineseChars / 2.5 + otherChars / 4) + 10; // 10 for metadata
      
      // 缓存结果
      if (msg.metadata) {
        msg.metadata.tokens = estimatedTokens;
      } else {
        msg.metadata = { tokens: estimatedTokens };
      }

      return total + estimatedTokens;
    }, 0);
  }

  /**
   * 智能选择历史消息，优先保留重要对话
   */
  private selectHistoricalMessages(messages: ChatMessage[], budget: number): ChatMessage[] {
    if (!messages.length || budget <= 0) return [];

    // 1. 为消息计算重要性分数
    const messagesWithScore = messages.map((msg, index) => ({
      message: msg,
      score: this.calculateImportanceScore(msg, index, messages.length),
      tokens: this.calculateTokens([msg])
    }));

    // 2. 按重要性排序
    messagesWithScore.sort((a, b) => b.score - a.score);

    // 3. 贪心选择，优先选择重要且token数少的消息
    const selected: ChatMessage[] = [];
    let usedBudget = 0;

    for (const { message, tokens } of messagesWithScore) {
      if (usedBudget + tokens <= budget) {
        selected.push(message);
        usedBudget += tokens;
      }
    }

    // 4. 按时间顺序重新排列
    return selected.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 计算消息的重要性分数
   */
  private calculateImportanceScore(msg: ChatMessage, index: number, total: number): number {
    let score = 0;

    // 1. 位置因子：较新的消息分数更高
    score += (index / total) * 30;

    // 2. 内容长度因子：适中长度的消息更重要
    const contentLength = (msg.content || '').length;
    if (contentLength > 50 && contentLength < 500) {
      score += 20;
    } else if (contentLength >= 500) {
      score += 10; // 长消息可能重要但占用更多token
    }

    // 3. 特殊内容标记
    const content = msg.content || '';
    if (msg.metadata?.important) {
      score += 50;
    }
    if (msg.metadata?.hasOptions) {
      score += 40; // 包含选项的消息通常很重要
    }
    if (content.includes('{"type"')) {
      score += 30; // 包含JSONL选项
    }
    if (msg.role === 'user') {
      score += 15; // 用户消息通常比助手消息更重要
    }

    // 4. 问答对完整性：如果是回答，检查是否有对应问题
    if (msg.role === 'assistant' && index > 0) {
      const prevMsg = msg;
      if (prevMsg && prevMsg.role === 'user') {
        score += 25; // 完整的问答对更重要
      }
    }

    return score;
  }

  /**
   * 在给定预算内选择消息
   */
  private fitMessagesInBudget(messages: ChatMessage[], budget: number): ChatMessage[] {
    const result: ChatMessage[] = [];
    let usedTokens = 0;

    // 从最后开始选择，保留最新的消息
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const tokens = this.calculateTokens([msg]);
      
      if (usedTokens + tokens <= budget) {
        result.unshift(msg);
        usedTokens += tokens;
      } else {
        break;
      }
    }

    return result;
  }

  /**
   * 获取上下文统计信息
   */
  getContextStats(messages: ChatMessage[]): {
    totalMessages: number;
    totalTokens: number;
    systemTokens: number;
    conversationTokens: number;
    memoryUsage: string;
  } {
    const systemMessages = messages.filter(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');
    
    const totalTokens = this.calculateTokens(messages);
    const systemTokens = this.calculateTokens(systemMessages);
    const conversationTokens = this.calculateTokens(conversationMessages);

    // 估算内存使用（粗略）
    const memoryUsage = `${Math.round(JSON.stringify(messages).length / 1024)}KB`;

    return {
      totalMessages: messages.length,
      totalTokens,
      systemTokens,
      conversationTokens,
      memoryUsage
    };
  }

  /**
   * 清理过期的消息缓存
   */
  cleanupCache(): void {
    // 实现缓存清理逻辑
    // 这里可以添加更多的内存清理逻辑
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * 内存优化工具
 */
export class MemoryOptimizer {
  private static cleanupInterval: NodeJS.Timeout | null = null;
  
  /**
   * 启动自动内存清理
   */
  static startAutoCleanup(intervalMs: number = 5 * 60 * 1000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, intervalMs);
  }

  /**
   * 停止自动清理
   */
  static stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * 执行内存清理
   */
  static performCleanup(): void {
    // 清理上下文管理器缓存
    const contextManager = ContextManager.getInstance();
    contextManager.cleanupCache();

    // 强制垃圾回收（如果支持）
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * 监控内存使用
   */
  static getMemoryStats(): {
    used: number;
    total: number;
    percentage: number;
  } {
    if (typeof window !== 'undefined' && (window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
      };
    }

    return {
      used: 0,
      total: 0,
      percentage: 0
    };
  }
}

// 导出默认实例
export const defaultContextManager = ContextManager.getInstance();