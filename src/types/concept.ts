/**
 * 概念管理系统 - 类型定义
 * 用于智能概念提取、去重和学习进度追踪
 */

export interface ConceptRelation {
  target: string;                         // 目标概念名称
  type: 'contains' | 'depends' | 'parallel' | 'contrast'; // 关系类型
  strength: number;                       // 关系强度 (0-1)
}

export interface ConceptNode {
  id: string;                            // 唯一标识
  name: string;                          // 概念名称（标准化）
  category: 'core' | 'method' | 'application' | 'support'; // 概念分类
  description: string;                   // 概念描述
  importance: number;                    // 重要性评分 (0-1)
  keywords: string[];                    // 关键词标签
  relations: ConceptRelation[];          // 概念关系
  
  // 学习状态
  absorbed: boolean;                     // 是否已被充分吸收
  absorptionLevel: number;              // 吸收程度 (0-1)
  lastReviewed: number;                 // 最后复习时间戳
  
  // 来源追踪
  sources: {
    messageId: string;                   // 来源消息ID
    conversationId: string;              // 来源对话ID
    extractedAt: number;                 // 提取时间戳
  }[];
  
  // 推荐影响
  mentionCount: number;                 // 被提及次数
  recommendationBlock: {               // 推荐阻挡信息
    blocked: boolean;                   // 是否阻挡相关推荐
    reason: string;                     // 阻挡原因
    until?: number;                     // 阻挡截止时间
  };
}

export interface ConceptExtractionResult {
  concepts: {
    name: string;
    category: 'core' | 'method' | 'application' | 'support';
    description: string;
    importance: number;
    keywords: string[];
    relations: ConceptRelation[];
  }[];
  summary: {
    totalConcepts: number;
    coreCount: number;
    methodCount: number;
    applicationCount: number;
    supportCount: number;
  };
}

export interface ConceptMap {
  id: string;                           // 概念图唯一标识
  conversationId: string;               // 关联的对话ID
  nodes: Map<string, ConceptNode>;      // 概念节点映射
  
  // 统计信息
  stats: {
    totalConcepts: number;              // 概念总数
    absorptionRate: number;             // 整体吸收率
    coverage: {                         // 各类型概念覆盖情况
      core: number;
      method: number; 
      application: number;
      support: number;
    };
    lastUpdated: number;                // 最后更新时间
  };
  
  // 推荐优化
  avoidanceList: string[];              // 应避免推荐的概念列表
  similarityThreshold: number;          // 相似度阈值
}

export interface ConceptSimilarity {
  concept1: string;
  concept2: string;
  similarity: number;                   // 相似度评分 (0-1)
  reason: string;                       // 相似性原因
}

export interface ConceptRecommendationContext {
  existingConcepts: string[];           // 已存在概念列表
  recentConcepts: string[];            // 近期概念列表
  avoidanceList: string[];             // 避免列表
  mindMapConcepts: string[];           // 思维导图已覆盖概念列表
  preferredCategories: ('core' | 'method' | 'application' | 'support')[]; // 偏好类型
  diversityWeight: number;             // 多样性权重
}

// Hook 接口定义
export interface UseConceptMapResult {
  // 状态
  conceptMap: ConceptMap | null;
  isLoading: boolean;
  error: string | null;
  
  // 核心操作
  extractConcepts: (content: string, messageId: string, conversationId: string) => Promise<ConceptNode[]>;
  addConcepts: (concepts: ConceptNode[]) => void;
  updateConceptAbsorption: (conceptId: string, absorbed: boolean, level?: number) => void;
  
  // 查询操作
  getAvoidanceList: () => string[];
  getSimilarConcepts: (conceptName: string, threshold?: number) => ConceptNode[];
  getConceptsByCategory: (category: ConceptNode['category']) => ConceptNode[];
  
  // 推荐优化
  getRecommendationContext: () => ConceptRecommendationContext;
  shouldAvoidConcept: (conceptName: string) => boolean;
  
  // 统计分析
  getAbsorptionStats: () => {
    totalAbsorbed: number;
    absorptionRate: number;
    byCategory: Record<ConceptNode['category'], number>;
  };
  
  // 持久化
  saveConcepts: () => void;
  loadConcepts: (conversationId: string) => void;
  clearConcepts: () => void;
}

// 存储键名常量
export const CONCEPT_STORAGE_KEYS = {
  CONVERSATION_CONCEPTS: 'nextstep_conversation_concepts',
  GLOBAL_CONCEPTS: 'nextstep_global_concepts', 
  CONCEPT_SETTINGS: 'nextstep_concept_settings'
} as const;

// 递归树状概念图谱类型定义
export interface ConceptTreeNode {
  id: string;                          // 节点唯一标识
  name: string;                        // 概念名称
  children: ConceptTreeNode[];         // 子概念列表
  
  // 可选的额外属性
  description?: string;                // 概念描述
  category?: 'core' | 'method' | 'application' | 'support'; // 概念分类
  importance?: number;                 // 重要性评分 (0-1)
  depth?: number;                     // 在树中的深度
  collapsed?: boolean;                // UI状态：是否折叠
}

export interface ConceptTree {
  id: string;                         // 概念树唯一标识
  name: string;                       // 根概念名称
  children: ConceptTreeNode[];        // 根级子概念
  
  // 元数据
  metadata?: {
    conversationId?: string;          // 关联对话ID
    totalNodes?: number;              // 节点总数
    maxDepth?: number;               // 最大深度
    createdAt?: number;              // 创建时间
    updatedAt?: number;              // 更新时间
  };
}

// LLM返回的概念图谱结构
export interface ConceptTreeLLMResponse {
  id: string;
  name: string;
  children: ConceptTreeNode[];
}

// 默认配置
export const CONCEPT_DEFAULTS = {
  SIMILARITY_THRESHOLD: 0.7,           // 默认相似度阈值
  MAX_AVOIDANCE_LIST: 50,              // 避免列表最大长度
  ABSORPTION_TIMEOUT: 7 * 24 * 60 * 60 * 1000, // 7天后重置吸收状态
  AUTO_BLOCK_THRESHOLD: 0.8,           // 自动阻挡阈值
  
  // 树状图谱默认配置
  MAX_TREE_DEPTH: 5,                  // 最大树深度
  DEFAULT_NODE_EXPANDED: true,        // 默认节点展开状态
  AUTO_COLLAPSE_DEPTH: 3,             // 自动折叠深度
} as const;