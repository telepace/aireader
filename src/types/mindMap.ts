/**
 * 智能思维地图系统 - 类型定义
 * 用于NextStep推荐系统的思维导图功能
 */

// 推荐节点信息
export interface RecommendationNode {
  id: string;                           // 推荐节点ID
  name: string;                         // 推荐节点名称
  reason: string;                       // 推荐理由
  confidence: number;                   // 推荐置信度 (0.0-1.0)
  trigger_condition: string;            // 触发条件描述
  type?: 'concept' | 'person' | 'method' | 'case'; // 推荐节点类型
}

// 语义关联节点
export interface RelatedNode {
  node_id: string;                      // 关联节点ID
  relation_type: 'contrast' | 'supplement' | 'example' | 'application'; // 关联类型
  strength: number;                     // 关联强度 (0.0-1.0)
}

export interface MindMapNode {
  id: string;                           // 唯一标识
  title: string;                        // 节点标题
  name?: string;                        // 推荐型图谱中的精准名词（兼容字段）
  type: 'root' | 'topic' | 'deepen' | 'next' | 'current' | 'concept' | 'person' | 'method' | 'case';
  level: number;                        // 层级深度 (0=根, 1=主题, 2+子主题)
  parentId?: string;                    // 父节点ID
  children: string[];                   // 子节点ID列表
  position: {                           // 可视化位置坐标
    x: number;
    y: number;
  };
  
  // === 推荐型图谱新增字段 ===
  status?: 'explored' | 'current' | 'recommended' | 'potential'; // 节点状态
  exploration_depth?: number;           // 探索深度 (0.0-1.0)
  last_visited?: string;                // 最后访问时间戳
  
  // 推荐引擎数据
  relevance_score?: number;             // 与当前话题相关度 (0.0-1.0)
  importance_weight?: number;           // 在整体知识图谱中的重要性 (0.0-1.0)
  user_interest?: number;               // 基于用户行为的兴趣预测 (0.0-1.0)
  
  // 语义关联
  semantic_tags?: string[];             // 语义标签
  dependencies?: string[];              // 理解此节点需要先理解的节点
  related_nodes?: RelatedNode[];        // 跨层级的语义关联
  
  // 推荐系统
  recommendations?: RecommendationNode[]; // 基于此节点生成的推荐
  
  metadata: {
    messageId: string;                  // 关联的聊天消息ID
    timestamp: number;                  // 创建时间戳
    explored: boolean;                  // 是否已被用户探索
    summary: string;                    // 节点内容摘要
    keywords: string[];                 // 关键词标签
    explorationDepth: number;           // 该分支的探索深度
    aiInsight?: string;                 // AI生成的洞察
    updatedAt?: number;                 // 最后更新时间戳
  };
  style: {
    color: string;                      // 节点颜色
    size: 'small' | 'medium' | 'large'; // 节点尺寸
    icon: string;                       // 节点图标 emoji
    emphasis: boolean;                  // 是否强调显示
    opacity: number;                    // 透明度 (0-1)
  };
  interactions: {
    clickCount: number;                 // 用户点击次数
    lastVisited: number;                // 最后访问时间
    userRating?: 1 | 2 | 3 | 4 | 5;     // 用户评分
  };
}

export interface MindMapState {
  nodes: Map<string, MindMapNode>;      // 所有节点数据
  edges: Map<string, string[]>;         // 连接关系映射
  currentNodeId: string;                // 当前活跃节点
  rootNodeId: string;                   // 根节点ID
  explorationPath: string[];            // 当前探索路径
  
  // === 推荐系统状态 ===
  recommendationState?: {
    activeRecommendations: string[];    // 当前激活的推荐节点ID列表
    hiddenRecommendations: string[];    // 用户隐藏的推荐节点ID列表  
    recommendationHistory: Array<{      // 推荐历史记录
      nodeId: string;
      timestamp: number;
      action: 'shown' | 'clicked' | 'dismissed';
    }>;
    lastRecommendationUpdate: number;   // 最后推荐更新时间
  };
  
  layout: {
    centerX: number;                    // 布局中心X坐标
    centerY: number;                    // 布局中心Y坐标
    scale: number;                      // 缩放比例
    viewBox: {                          // 可视区域
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  stats: {
    totalNodes: number;                 // 总节点数
    exploredNodes: number;              // 已探索节点数
    recommendedNodes: number;           // 推荐节点数
    potentialNodes: number;             // 潜在节点数
    maxDepth: number;                   // 最大探索深度
    averageExplorationDepth: number;    // 平均探索深度
    lastUpdateTime: number;             // 最后更新时间
    sessionStartTime: number;           // 会话开始时间
  };
  preferences: {
    autoLayout: boolean;                // 是否自动布局
    showLabels: boolean;                // 是否显示标签
    animationEnabled: boolean;          // 是否启用动画
    compactMode: boolean;               // 紧凑模式
    showRecommendations: boolean;       // 是否显示推荐节点
    recommendationThreshold: number;    // 推荐显示的置信度阈值
  };
}

// AI生成的思维图上下文，用于JSONL Prompt
export interface MindMapContext {
  currentTopic: {
    title: string;
    summary: string;
    keywords: string[];
  };
  explorationHistory: {
    path: Array<{
      id: string;
      title: string;
      timestamp: number;
    }>;
    keyInsights: string[];              // 关键洞察点
    unansweredQuestions: string[];      // 待解答的问题
    explorationGaps: string[];          // 探索空白区域
  };
  contextMap: {
    [nodeId: string]: {
      title: string;
      summary: string;
      relatedTopics: string[];
      explorationDepth: number;
      connectionStrength: number;       // 与当前话题的关联强度
    };
  };
  aiRecommendations: {
    suggestedDeepens: Array<{           // AI建议的深入方向
      title: string;
      reasoning: string;
      priority: number;
    }>;
    relatedTopics: Array<{              // 相关主题建议
      title: string;
      reasoning: string;
      priority: number;
    }>;
    missingPerspectives: string[];      // 缺失的视角
    structuralGaps: string[];           // 结构性空白
  };
  conversationFlow: {
    messageCount: number;
    averageResponseLength: number;
    topicSwitchCount: number;
    explorationPattern: 'deep' | 'broad' | 'mixed';
  };
}

// JSONL选项的思维图更新指令
export interface MindMapUpdateInstruction {
  action: 'add_child' | 'add_sibling' | 'update_node' | 'connect_nodes' | 'highlight_path';
  nodeId?: string;                      // 目标节点ID
  parentId?: string;                    // 父节点ID (用于add_child)
  referenceId?: string;                 // 参考节点ID (用于add_sibling)
  nodeData?: {
    title: string;
    summary: string;
    keywords: string[];
    type: MindMapNode['type'];
    style?: Partial<MindMapNode['style']>;
  };
  metadata?: {
    aiInsight?: string;
    priority?: number;
    estimatedExplorationTime?: number;
  };
}

// 扩展的NextStep选项，包含思维图更新
export interface EnhancedNextStepOption {
  type: 'deepen' | 'next';
  content: string;
  describe: string;
  mindmap_update: MindMapUpdateInstruction;
  ai_analysis?: {
    reasoning: string;                  // AI推荐理由
    complexity: 'low' | 'medium' | 'high';
    estimated_time: string;             // 预估阅读时间
    prerequisites: string[];            // 前置要求
    learning_outcomes: string[];        // 学习成果
  };
}

// 思维图事件类型
export interface MindMapEvent {
  type: 'node_click' | 'node_hover' | 'path_change' | 'layout_change' | 'zoom' | 'pan';
  nodeId?: string;
  position?: { x: number; y: number; };
  scale?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

// 思维图配置选项
export interface MindMapConfig {
  layout: {
    algorithm: 'tree' | 'radial' | 'force' | 'hierarchical';
    spacing: {
      horizontal: number;
      vertical: number;
    };
    animation: {
      duration: number;
      easing: string;
    };
  };
  appearance: {
    theme: 'light' | 'dark' | 'auto';
    nodeStyles: {
      [key in MindMapNode['type']]: {
        color: string;
        icon: string;
        size: number;
      };
    };
    connectionStyles: {
      strokeWidth: number;
      strokeColor: string;
      curved: boolean;
    };
  };
  interaction: {
    zoomRange: [number, number];        // 缩放范围 [min, max]
    panBounds?: {                       // 平移边界
      left: number;
      right: number;
      top: number;
      bottom: number;
    };
    doubleClickAction: 'zoom' | 'explore' | 'edit';
    hoverDelay: number;                 // 悬停延迟 (ms)
  };
  preferences: {
    autoLayout: boolean;                // 是否自动布局
    showLabels: boolean;                // 是否显示标签
    animationEnabled: boolean;          // 是否启用动画
    compactMode: boolean;               // 紧凑模式
  };
}