/**
 * 智能思维地图 Hook
 * 管理思维导图的状态、布局、交互和AI集成
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  MindMapNode,
  MindMapState,
  MindMapContext,
  MindMapEvent,
  MindMapConfig,
  EnhancedNextStepOption,
  MindMapUpdateInstruction
} from '../types/mindMap';

// 默认配置
const DEFAULT_CONFIG: MindMapConfig = {
  layout: {
    algorithm: 'tree',
    spacing: { horizontal: 120, vertical: 80 },
    animation: { duration: 300, easing: 'ease-in-out' }
  },
  appearance: {
    theme: 'light',
    nodeStyles: {
      root: { color: '#6366f1', icon: '📚', size: 40 },
      topic: { color: '#8b5cf6', icon: '💭', size: 32 },
      deepen: { color: '#10b981', icon: '🌿', size: 28 },
      next: { color: '#f59e0b', icon: '🔗', size: 28 },
      current: { color: '#ef4444', icon: '🎯', size: 36 }
    },
    connectionStyles: {
      strokeWidth: 2,
      strokeColor: '#d1d5db',
      curved: true
    }
  },
  interaction: {
    zoomRange: [0.5, 2.0],
    doubleClickAction: 'explore',
    hoverDelay: 500
  },
  preferences: {
    autoLayout: true,
    showLabels: true,
    animationEnabled: true,
    compactMode: false
  }
};

export const useMindMap = (conversationId: string, config: Partial<MindMapConfig> = {}) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [mindMapState, setMindMapState] = useState<MindMapState>({
    nodes: new Map(),
    edges: new Map(),
    currentNodeId: '',
    rootNodeId: '',
    explorationPath: [],
    layout: {
      centerX: 400,
      centerY: 300,
      scale: 1,
      viewBox: { x: 0, y: 0, width: 800, height: 600 }
    },
    stats: {
      totalNodes: 0,
      exploredNodes: 0,
      maxDepth: 0,
      lastUpdateTime: Date.now(),
      sessionStartTime: Date.now()
    },
    preferences: {
      autoLayout: true,
      showLabels: true,
      animationEnabled: true,
      compactMode: false
    }
  });

  const eventListeners = useRef<Array<(event: MindMapEvent) => void>>([]);

  // 初始化思维图
  const initializeMindMap = useCallback((rootTitle: string, summary: string = '') => {
    const rootId = uuidv4();
    const rootNode: MindMapNode = {
      id: rootId,
      title: rootTitle,
      type: 'root',
      level: 0,
      children: [],
      position: { x: finalConfig.layout.spacing.horizontal * 2, y: finalConfig.layout.spacing.vertical },
      metadata: {
        messageId: '',
        timestamp: Date.now(),
        explored: true,
        summary,
        keywords: [],
        explorationDepth: 0
      },
      style: {
        color: finalConfig.appearance.nodeStyles.root.color,
        size: 'large',
        icon: finalConfig.appearance.nodeStyles.root.icon,
        emphasis: true,
        opacity: 1
      },
      interactions: {
        clickCount: 0,
        lastVisited: Date.now()
      }
    };

    setMindMapState(prev => ({
      ...prev,
      nodes: new Map([[rootId, rootNode]]),
      edges: new Map(),
      currentNodeId: rootId,
      rootNodeId: rootId,
      explorationPath: [rootId],
      stats: {
        ...prev.stats,
        totalNodes: 1,
        exploredNodes: 1,
        maxDepth: 0,
        lastUpdateTime: Date.now()
      }
    }));

    return rootId;
  }, [finalConfig]);

  // 添加节点
  const addNode = useCallback((
    title: string,
    type: MindMapNode['type'],
    parentId: string,
    metadata: Partial<MindMapNode['metadata']> = {}
  ): string => {
    const nodeId = uuidv4();
    const parentNode = mindMapState.nodes.get(parentId);
    
    if (!parentNode) {
      console.error('Parent node not found:', parentId);
      return '';
    }

    const level = parentNode.level + 1;
    const position = calculateNodePosition(parentNode, mindMapState.nodes, type, finalConfig);

    const newNode: MindMapNode = {
      id: nodeId,
      title,
      type,
      level,
      parentId,
      children: [],
      position,
      metadata: {
        messageId: '',
        timestamp: Date.now(),
        explored: false,
        summary: '',
        keywords: [],
        explorationDepth: 0,
        ...metadata
      },
      style: {
        color: finalConfig.appearance.nodeStyles[type].color,
        size: level <= 1 ? 'large' : level <= 2 ? 'medium' : 'small',
        icon: finalConfig.appearance.nodeStyles[type].icon,
        emphasis: false,
        opacity: 0.8
      },
      interactions: {
        clickCount: 0,
        lastVisited: Date.now()
      }
    };

    setMindMapState(prev => {
      const newNodes = new Map(prev.nodes);
      const newEdges = new Map(prev.edges);
      
      // 添加新节点
      newNodes.set(nodeId, newNode);
      
      // 更新父节点
      const updatedParent = { ...parentNode };
      updatedParent.children.push(nodeId);
      newNodes.set(parentId, updatedParent);
      
      // 更新边
      const parentEdges = newEdges.get(parentId) || [];
      newEdges.set(parentId, [...parentEdges, nodeId]);

      return {
        ...prev,
        nodes: newNodes,
        edges: newEdges,
        stats: {
          ...prev.stats,
          totalNodes: newNodes.size,
          maxDepth: Math.max(prev.stats.maxDepth, level),
          lastUpdateTime: Date.now()
        }
      };
    });

    // 触发事件
    emitEvent({
      type: 'node_click',
      nodeId,
      timestamp: Date.now(),
      metadata: { action: 'add', parentId }
    });

    return nodeId;
  }, [mindMapState.nodes, finalConfig]);

  // 处理增强JSONL选项点击
  const handleEnhancedOptionClick = useCallback((
    option: EnhancedNextStepOption,
    messageId: string
  ) => {
    const update = option.mindmap_update;
    
    switch (update.action) {
      case 'add_child':
        if (update.parentId && update.nodeData) {
          const nodeId = addNode(
            update.nodeData.title,
            update.nodeData.type,
            update.parentId,
            {
              messageId,
              summary: update.nodeData.summary,
              keywords: update.nodeData.keywords,
              aiInsight: update.metadata?.aiInsight
            }
          );
          
          // 导航到新节点
          navigateToNode(nodeId);
        }
        break;
        
      case 'add_sibling':
        if (update.referenceId && update.nodeData) {
          const referenceNode = mindMapState.nodes.get(update.referenceId);
          if (referenceNode && referenceNode.parentId) {
            const nodeId = addNode(
              update.nodeData.title,
              update.nodeData.type,
              referenceNode.parentId,
              {
                messageId,
                summary: update.nodeData.summary,
                keywords: update.nodeData.keywords,
                aiInsight: update.metadata?.aiInsight
              }
            );
            navigateToNode(nodeId);
          }
        }
        break;
        
      case 'highlight_path':
        // TODO: 实现路径高亮
        break;
    }
  }, [mindMapState.nodes, addNode]);

  // 导航到指定节点
  const navigateToNode = useCallback((nodeId: string) => {
    const node = mindMapState.nodes.get(nodeId);
    if (!node) return;

    // 构建路径
    const path = buildPathToNode(mindMapState.nodes, nodeId);
    
    // 标记节点为已探索
    setMindMapState(prev => {
      const newNodes = new Map(prev.nodes);
      const updatedNode = { ...node };
      updatedNode.metadata.explored = true;
      updatedNode.interactions.lastVisited = Date.now();
      updatedNode.interactions.clickCount += 1;
      newNodes.set(nodeId, updatedNode);

      return {
        ...prev,
        nodes: newNodes,
        currentNodeId: nodeId,
        explorationPath: path,
        stats: {
          ...prev.stats,
          exploredNodes: Array.from(newNodes.values()).filter(n => n.metadata.explored).length,
          lastUpdateTime: Date.now()
        }
      };
    });

    // 触发事件
    emitEvent({
      type: 'path_change',
      nodeId,
      timestamp: Date.now(),
      metadata: { path }
    });
  }, [mindMapState.nodes]);

  // 生成AI上下文
  const generateMindMapContext = useCallback((): MindMapContext => {
    const currentNode = mindMapState.nodes.get(mindMapState.currentNodeId);
    const nodes = Array.from(mindMapState.nodes.values());
    
    if (!currentNode) {
      return {
        currentTopic: { title: '', summary: '', keywords: [] },
        explorationHistory: { path: [], keyInsights: [], unansweredQuestions: [], explorationGaps: [] },
        contextMap: {},
        aiRecommendations: { suggestedDeepens: [], relatedTopics: [], missingPerspectives: [], structuralGaps: [] },
        conversationFlow: { messageCount: 0, averageResponseLength: 0, topicSwitchCount: 0, explorationPattern: 'mixed' }
      };
    }

    return {
      currentTopic: {
        title: currentNode.title,
        summary: currentNode.metadata.summary,
        keywords: currentNode.metadata.keywords
      },
      explorationHistory: {
        path: mindMapState.explorationPath.map(id => {
          const node = mindMapState.nodes.get(id);
          return {
            id,
            title: node?.title || '',
            timestamp: node?.metadata.timestamp || 0
          };
        }),
        keyInsights: nodes
          .filter(n => n.metadata.explored && n.metadata.aiInsight)
          .map(n => n.metadata.aiInsight!)
          .slice(0, 5),
        unansweredQuestions: nodes
          .filter(n => !n.metadata.explored && n.level > 0)
          .map(n => n.title),
        explorationGaps: analyzeExplorationGaps(mindMapState)
      },
      contextMap: Object.fromEntries(
        nodes.map(node => [
          node.id,
          {
            title: node.title,
            summary: node.metadata.summary,
            relatedTopics: node.metadata.keywords,
            explorationDepth: node.metadata.explorationDepth,
            connectionStrength: calculateConnectionStrength(node, currentNode)
          }
        ])
      ),
      aiRecommendations: generateAIRecommendations(mindMapState, currentNode),
      conversationFlow: analyzeConversationFlow(mindMapState)
    };
  }, [mindMapState]);

  // 事件系统
  const emitEvent = useCallback((event: MindMapEvent) => {
    eventListeners.current.forEach(listener => listener(event));
  }, []);

  const addEventListener = useCallback((listener: (event: MindMapEvent) => void) => {
    eventListeners.current.push(listener);
    return () => {
      const index = eventListeners.current.indexOf(listener);
      if (index > -1) {
        eventListeners.current.splice(index, 1);
      }
    };
  }, []);

  // 布局计算
  const updateLayout = useCallback((algorithm?: MindMapConfig['layout']['algorithm']) => {
    const layoutAlgorithm = algorithm || finalConfig.layout.algorithm;
    const newPositions = calculateLayout(mindMapState, layoutAlgorithm, finalConfig);
    
    setMindMapState(prev => ({
      ...prev,
      nodes: new Map(
        Array.from(prev.nodes.entries()).map(([id, node]) => [
          id,
          { ...node, position: newPositions.get(id) || node.position }
        ])
      )
    }));
  }, [mindMapState, finalConfig]);

  // 持久化
  useEffect(() => {
    const saveState = () => {
      if (conversationId && mindMapState.stats.totalNodes > 0) {
        const stateToSave = {
          ...mindMapState,
          nodes: Array.from(mindMapState.nodes.entries()),
          edges: Array.from(mindMapState.edges.entries())
        };
        localStorage.setItem(`mindmap_${conversationId}`, JSON.stringify(stateToSave));
      }
    };

    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [conversationId, mindMapState]);

  return {
    // 状态
    mindMapState,
    config: finalConfig,
    
    // 操作方法
    initializeMindMap,
    addNode,
    navigateToNode,
    handleEnhancedOptionClick,
    updateLayout,
    
    // AI集成
    generateMindMapContext,
    
    // 事件系统
    addEventListener,
    emitEvent
  };
};

// 辅助函数
function calculateNodePosition(
  parentNode: MindMapNode,
  allNodes: Map<string, MindMapNode>,
  type: MindMapNode['type'],
  config: MindMapConfig
): { x: number; y: number } {
  const siblings = Array.from(allNodes.values())
    .filter(n => n.parentId === parentNode.id);
  const siblingIndex = siblings.length;
  
  const spacing = config.layout.spacing;
  const baseX = parentNode.position.x + (type === 'deepen' ? spacing.horizontal : spacing.horizontal * 1.2);
  const baseY = parentNode.position.y + (siblingIndex - siblings.length/2 + 0.5) * spacing.vertical;
  
  return { x: baseX, y: baseY };
}

function buildPathToNode(nodes: Map<string, MindMapNode>, nodeId: string): string[] {
  const path: string[] = [];
  let currentId: string | undefined = nodeId;
  
  while (currentId) {
    path.unshift(currentId);
    const node = nodes.get(currentId);
    currentId = node?.parentId;
  }
  
  return path;
}

function analyzeExplorationGaps(state: MindMapState): string[] {
  // 分析思维图中的探索空白
  const gaps: string[] = [];
  const nodes = Array.from(state.nodes.values());
  
  // 找到有子节点但子节点未完全探索的节点
  nodes.forEach(node => {
    if (node.children.length > 0) {
      const exploredChildren = node.children.filter(childId => {
        const child = state.nodes.get(childId);
        return child?.metadata.explored;
      }).length;
      
      if (exploredChildren < node.children.length) {
        gaps.push(`"${node.title}" has unexplored aspects`);
      }
    }
  });
  
  return gaps;
}

function calculateConnectionStrength(node: MindMapNode, currentNode: MindMapNode): number {
  // 计算节点间的关联强度
  let strength = 0;
  
  // 共享关键词
  const sharedKeywords = node.metadata.keywords.filter(k => 
    currentNode.metadata.keywords.includes(k)
  ).length;
  strength += sharedKeywords * 0.2;
  
  // 层级距离
  const levelDiff = Math.abs(node.level - currentNode.level);
  strength += Math.max(0, (5 - levelDiff) * 0.1);
  
  // 路径距离
  // TODO: 实现基于路径的距离计算
  
  return Math.min(1, strength);
}

function generateAIRecommendations(state: MindMapState, currentNode: MindMapNode) {
  // 基于当前状态生成AI推荐
  // 这里返回模拟数据，实际实现时可以调用AI服务
  return {
    suggestedDeepens: [
      { title: "深入分析核心概念", reasoning: "当前话题还有更深层的内容可以探索", priority: 0.8 },
      { title: "实际应用案例", reasoning: "理论需要结合实践来理解", priority: 0.7 }
    ],
    relatedTopics: [
      { title: "相关理论框架", reasoning: "可以提供更广阔的视角", priority: 0.6 },
      { title: "历史发展脉络", reasoning: "了解演进过程有助于理解", priority: 0.5 }
    ],
    missingPerspectives: ["批判性视角", "实践应用", "未来趋势"],
    structuralGaps: ["缺少具体案例", "理论基础薄弱", "应用场景不明确"]
  };
}

function analyzeConversationFlow(state: MindMapState) {
  const nodes = Array.from(state.nodes.values());
  const exploredNodes = nodes.filter(n => n.metadata.explored);
  
  return {
    messageCount: exploredNodes.length,
    averageResponseLength: 500, // 模拟数据
    topicSwitchCount: nodes.filter(n => n.type === 'next').length,
    explorationPattern: exploredNodes.length > nodes.length * 0.7 ? 'deep' as const : 'broad' as const
  };
}

function calculateLayout(
  state: MindMapState,
  algorithm: MindMapConfig['layout']['algorithm'],
  config: MindMapConfig
): Map<string, { x: number; y: number }> {
  // 布局算法实现
  const positions = new Map<string, { x: number; y: number }>();
  
  // 简单的树布局算法
  const nodes = Array.from(state.nodes.values());
  const rootNode = nodes.find(n => n.type === 'root');
  
  if (rootNode) {
    positions.set(rootNode.id, { x: 400, y: 100 });
    layoutChildren(rootNode, nodes, positions, config, 0);
  }
  
  return positions;
}

function layoutChildren(
  parent: MindMapNode,
  allNodes: MindMapNode[],
  positions: Map<string, { x: number; y: number }>,
  config: MindMapConfig,
  depth: number
) {
  const children = allNodes.filter(n => n.parentId === parent.id);
  const parentPos = positions.get(parent.id)!;
  const spacing = config.layout.spacing;
  
  children.forEach((child, index) => {
    const x = parentPos.x + spacing.horizontal;
    const y = parentPos.y + (index - (children.length - 1) / 2) * spacing.vertical;
    
    positions.set(child.id, { x, y });
    layoutChildren(child, allNodes, positions, config, depth + 1);
  });
}