/**
 * 思维导图 Hook
 * 管理思维导图的节点、导航、状态等
 */

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { recommendationEngine, RecommendationContext } from '../utils/recommendationEngine';

// 导入统一的类型定义
import { MindMapNode as ImportedMindMapNode, MindMapState as ImportedMindMapState } from '../types/mindMap';

// 为了兼容性，重新导出类型（逐步迁移）
export type MindMapNode = ImportedMindMapNode;
export type MindMapState = ImportedMindMapState;

// Hook 返回类型
export interface UseMindMapReturn {
  mindMapState: MindMapState;
  initializeMindMap: (title: string, summary?: string) => string;
  addNode: (
    title: string,
    type: MindMapNode['type'],
    parentId: string,
    metadata?: Partial<MindMapNode['metadata']>
  ) => string;
  navigateToNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<MindMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  getNode: (nodeId: string) => MindMapNode | undefined;
  getChildren: (nodeId: string) => MindMapNode[];
  getPath: (nodeId: string) => string[];
  
  // === 推荐系统方法 ===
  updateNodeStatus: (nodeId: string, status: MindMapNode['status']) => void;
  generateRecommendations: (nodeId: string) => void;
  triggerRecommendationUpdate: () => void;
  getRecommendationContext: () => RecommendationContext;
  
  generateMindMapContext: () => {
    currentTopic: {
      id: string;
      title: string;
      summary?: string;
      keywords?: string[];
    };
    explorationHistory: {
      path: Array<{
        id: string;
        title: string;
        type: string;
        level: number;
      }>;
      depth: number;
    };
    availableNodes: Array<{
      id: string;
      title: string;
      type: string;
      level: number;
      explored: boolean;
    }>;
  };
  clearMindMap: () => void;
}

// 存储键
const MIND_MAP_STORAGE_KEY = 'prompt_tester_mind_maps';

export function useMindMap(conversationId: string): UseMindMapReturn {
  const [mindMapState, setMindMapState] = useState<MindMapState>({
    nodes: new Map(),
    edges: new Map(),
    currentNodeId: '',
    rootNodeId: '',
    explorationPath: [],
    layout: {
      centerX: 400,
      centerY: 300,
      scale: 1.0,
      viewBox: { x: 0, y: 0, width: 800, height: 600 }
    },
    stats: {
      totalNodes: 0,
      exploredNodes: 0,
      recommendedNodes: 0,
      potentialNodes: 0,
      maxDepth: 0,
      averageExplorationDepth: 0,
      lastUpdateTime: Date.now(),
      sessionStartTime: Date.now()
    },
    preferences: {
      autoLayout: true,
      showLabels: true,
      animationEnabled: true,
      compactMode: false,
      showRecommendations: true,
      recommendationThreshold: 0.7
    }
  });

  // 从本地存储加载思维导图
  const loadMindMap = useCallback(() => {
    try {
      const stored = localStorage.getItem(MIND_MAP_STORAGE_KEY);
      if (stored) {
        const allMindMaps = JSON.parse(stored);
        const conversationMap = allMindMaps[conversationId];
        
        if (conversationMap) {
          // 重建 Map 对象
          const nodes = new Map<string, MindMapNode>();
          Object.entries(conversationMap.nodes || {}).forEach(([id, node]) => {
            nodes.set(id, node as MindMapNode);
          });
          
          setMindMapState(prev => {
            // 只有当数据实际变化时才更新状态，避免不必要的重渲染
            const currentNodeId = conversationMap.currentNodeId || '';
            const rootNodeId = conversationMap.rootNodeId || '';
            
            if (prev.nodes.size === nodes.size && 
                prev.currentNodeId === currentNodeId &&
                prev.rootNodeId === rootNodeId) {
              return prev;
            }
            
            return {
              nodes,
              edges: new Map(),
              currentNodeId,
              rootNodeId,
              explorationPath: conversationMap.explorationPath || [],
              layout: prev.layout, // 保持现有布局避免视觉跳跃
              stats: {
                totalNodes: nodes.size,
                exploredNodes: Array.from(nodes.values()).filter(n => n.metadata.explored).length,
                recommendedNodes: Array.from(nodes.values()).filter(n => n.status === 'recommended').length,
                potentialNodes: Array.from(nodes.values()).filter(n => n.status === 'potential').length,
                maxDepth: calculateMaxDepth(nodes),
                averageExplorationDepth: Array.from(nodes.values()).reduce((sum, n) => sum + (n.exploration_depth || 0), 0) / nodes.size || 0,
                lastUpdateTime: Date.now(),
                sessionStartTime: prev.stats.sessionStartTime || Date.now() // 保持会话开始时间
              },
              preferences: prev.preferences // 保持用户偏好设置
            };
          });
        }
      }
    } catch (error) {
      console.error('Failed to load mind map:', error);
    }
  }, [conversationId]);

  // 保存到本地存储 - 增加防抖机制避免频繁保存
  const saveMindMap = useCallback(() => {
    try {
      const stored = localStorage.getItem(MIND_MAP_STORAGE_KEY) || '{}';
      const allMindMaps = JSON.parse(stored);
      
      // 序列化 Map 为对象
      const serializedNodes: Record<string, MindMapNode> = {};
      mindMapState.nodes.forEach((node, id) => {
        serializedNodes[id] = node;
      });
      
      const newData = {
        nodes: serializedNodes,
        currentNodeId: mindMapState.currentNodeId,
        explorationPath: mindMapState.explorationPath,
        stats: mindMapState.stats
      };
      
      // 检查数据是否真的变化了，避免不必要的保存
      const existingData = allMindMaps[conversationId];
      if (existingData && 
          existingData.currentNodeId === newData.currentNodeId &&
          Object.keys(existingData.nodes || {}).length === Object.keys(newData.nodes).length) {
        return; // 数据没有实质性变化，跳过保存
      }
      
      allMindMaps[conversationId] = newData;
      localStorage.setItem(MIND_MAP_STORAGE_KEY, JSON.stringify(allMindMaps));
    } catch (error) {
      console.error('Failed to save mind map:', error);
    }
  }, [conversationId, mindMapState]);

  // 初始化思维导图
  const initializeMindMap = useCallback((title: string, summary?: string): string => {
    const rootId = uuidv4();
    const rootNode: MindMapNode = {
      id: rootId,
      title,
      type: 'root',
      children: [],
      level: 0,
      metadata: {
        messageId: '',
        timestamp: Date.now(),
        explored: true,
        summary: summary || '',
        keywords: [],
        explorationDepth: 1.0,
        aiInsight: undefined
      },
      interactions: {
        clickCount: 1,
        lastVisited: Date.now(),
        userRating: undefined
      },
      style: {
        color: '#6366f1',
        size: 'medium' as const,
        icon: '🌟',
        emphasis: true,
        opacity: 1.0
      },
      position: {
        x: 400,
        y: 300
      }
    };

    const newNodes = new Map<string, MindMapNode>();
    newNodes.set(rootId, rootNode);

    setMindMapState({
      nodes: newNodes,
      edges: new Map(),
      currentNodeId: rootId,
      rootNodeId: rootId,
      explorationPath: [rootId],
      layout: {
        centerX: 400,
        centerY: 300,
        scale: 1.0,
        viewBox: { x: 0, y: 0, width: 800, height: 600 }
      },
      stats: {
        totalNodes: 1,
        exploredNodes: 1,
        recommendedNodes: 0,
        potentialNodes: 0,
        maxDepth: 0,
        averageExplorationDepth: 1.0,
        lastUpdateTime: Date.now(),
        sessionStartTime: Date.now()
      },
      preferences: {
        autoLayout: true,
        showLabels: true,
        animationEnabled: true,
        compactMode: false,
        showRecommendations: true,
        recommendationThreshold: 0.7
      }
    });

    return rootId;
  }, []);

  // 添加节点
  const addNode = useCallback((
    title: string,
    type: MindMapNode['type'],
    parentId: string,
    metadata: Partial<MindMapNode['metadata']> = {}
  ): string => {
    const parent = mindMapState.nodes.get(parentId);
    if (!parent) {
      throw new Error(`Parent node ${parentId} not found`);
    }

    const nodeId = uuidv4();
    const newNode: MindMapNode = {
      id: nodeId,
      title,
      type,
      parentId,
      children: [],
      level: parent.level + 1,
      metadata: {
        messageId: '',
        timestamp: Date.now(),
        explored: false,
        summary: '',
        keywords: [],
        explorationDepth: 0,
        aiInsight: undefined,
        ...metadata
      },
      interactions: {
        clickCount: 0,
        lastVisited: Date.now(),
        userRating: undefined
      },
      style: {
        color: '#8b5cf6',
        size: 'medium' as const,
        icon: '💭',
        emphasis: false,
        opacity: 0.8
      },
      position: {
        x: 0,
        y: 0
      }
    };

    const newNodes = new Map(mindMapState.nodes);
    newNodes.set(nodeId, newNode);

    // 更新父节点的 children
    const parentNode = newNodes.get(parentId)!;
    parentNode.children.push(nodeId);
    parentNode.metadata.timestamp = Date.now();

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes,
      stats: {
        totalNodes: newNodes.size,
        exploredNodes: prev.stats.exploredNodes,
        recommendedNodes: Array.from(newNodes.values()).filter(n => n.status === 'recommended').length,
        potentialNodes: Array.from(newNodes.values()).filter(n => n.status === 'potential').length,
        maxDepth: Math.max(prev.stats.maxDepth, newNode.level),
        averageExplorationDepth: Array.from(newNodes.values()).reduce((sum, n) => sum + (n.exploration_depth || 0), 0) / newNodes.size || 0,
        lastUpdateTime: Date.now(),
        sessionStartTime: prev.stats.sessionStartTime
      }
    }));

    return nodeId;
  }, [mindMapState.nodes]);

  // 导航到节点
  const navigateToNode = useCallback((nodeId: string) => {
    const node = mindMapState.nodes.get(nodeId);
    if (!node) return;

    // 构建从根到该节点的路径
    const path: string[] = [];
    let current: MindMapNode | undefined = node;
    while (current) {
      path.unshift(current.id);
      if (current.parentId) {
        current = mindMapState.nodes.get(current.parentId);
      } else {
        break;
      }
    }

    // 更新节点交互状态
    const newNodes = new Map(mindMapState.nodes);
    const targetNode = newNodes.get(nodeId)!;
    targetNode.metadata.explored = true;
    targetNode.interactions.clickCount++;
    targetNode.interactions.lastVisited = Date.now();
    targetNode.metadata.timestamp = Date.now();

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes,
      currentNodeId: nodeId,
      explorationPath: path,
      stats: {
        ...prev.stats,
        exploredNodes: Array.from(newNodes.values()).filter(n => n.metadata.explored).length,
        lastUpdateTime: Date.now()
      }
    }));
  }, [mindMapState.nodes]);

  // 更新节点
  const updateNode = useCallback((nodeId: string, updates: Partial<MindMapNode>) => {
    const newNodes = new Map(mindMapState.nodes);
    const node = newNodes.get(nodeId);
    if (node) {
      newNodes.set(nodeId, { ...node, ...updates, metadata: { ...node.metadata, updatedAt: Date.now() } });
      
      setMindMapState(prev => ({
        ...prev,
        nodes: newNodes,
        stats: {
          ...prev.stats,
          lastUpdateTime: Date.now()
        }
      }));
    }
  }, [mindMapState.nodes]);

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === mindMapState.currentNodeId) return; // 不能删除当前节点

    const newNodes = new Map(mindMapState.nodes);
    const node = newNodes.get(nodeId);
    if (!node) return;

    // 递归删除所有子节点
    const deleteRecursive = (id: string) => {
      const target = newNodes.get(id);
      if (target) {
        target.children.forEach(childId => deleteRecursive(childId));
        newNodes.delete(id);
      }
    };

    // 从父节点的 children 中移除
    if (node.parentId) {
      const parent = newNodes.get(node.parentId);
      if (parent) {
        parent.children = parent.children.filter(id => id !== nodeId);
      }
    }

    deleteRecursive(nodeId);

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes,
      stats: {
        ...prev.stats,
        totalNodes: newNodes.size,
        maxDepth: calculateMaxDepth(newNodes),
        exploredNodes: Array.from(newNodes.values()).filter(n => n.metadata.explored).length,
        recommendedNodes: Array.from(newNodes.values()).filter(n => n.status === 'recommended').length,
        potentialNodes: Array.from(newNodes.values()).filter(n => n.status === 'potential').length,
        averageExplorationDepth: newNodes.size > 0 
          ? Array.from(newNodes.values()).reduce((sum, node) => sum + (node.exploration_depth || 0), 0) / newNodes.size 
          : 0,
        lastUpdateTime: Date.now()
      }
    }));
  }, [mindMapState.nodes, mindMapState.currentNodeId]);

  // 获取节点
  const getNode = useCallback((nodeId: string) => {
    return mindMapState.nodes.get(nodeId);
  }, [mindMapState.nodes]);

  // 获取子节点
  const getChildren = useCallback((nodeId: string) => {
    const node = mindMapState.nodes.get(nodeId);
    if (!node) return [];
    return node.children.map(childId => mindMapState.nodes.get(childId)!).filter(Boolean);
  }, [mindMapState.nodes]);

  // 获取从根到节点的路径
  const getPath = useCallback((nodeId: string): string[] => {
    const path: string[] = [];
    let current = mindMapState.nodes.get(nodeId);
    
    while (current) {
      path.unshift(current.id);
      if (current.parentId) {
        current = mindMapState.nodes.get(current.parentId);
      } else {
        break;
      }
    }
    
    return path;
  }, [mindMapState.nodes]);

  // 生成AI上下文
  const generateMindMapContext = useCallback(() => {
    const currentNode = mindMapState.nodes.get(mindMapState.currentNodeId);
    const allNodes = Array.from(mindMapState.nodes.values());

    return {
      currentTopic: {
        id: currentNode?.id || '',
        title: currentNode?.title || '',
        summary: currentNode?.metadata.summary,
        keywords: currentNode?.metadata.keywords
      },
      explorationHistory: {
        path: mindMapState.explorationPath.map(id => {
          const node = mindMapState.nodes.get(id);
          return {
            id,
            title: node?.title || '',
            type: node?.type || 'root',
            level: node?.level || 0
          };
        }),
        depth: mindMapState.explorationPath.length
      },
      availableNodes: allNodes.map(node => ({
        id: node.id,
        title: node.title,
        type: node.type,
        level: node.level,
        explored: node.metadata.explored
      }))
    };
  }, [mindMapState]);

  // 清空思维导图
  const clearMindMap = useCallback(() => {
    try {
      // 清理localStorage中的数据
      const stored = localStorage.getItem(MIND_MAP_STORAGE_KEY) || '{}';
      const allMindMaps = JSON.parse(stored);
      delete allMindMaps[conversationId];
      localStorage.setItem(MIND_MAP_STORAGE_KEY, JSON.stringify(allMindMaps));
    } catch (error) {
      console.error('Failed to clear mind map storage:', error);
    }
    
    // 重置状态
    setMindMapState({
      nodes: new Map(),
      edges: new Map(),
      currentNodeId: '',
      rootNodeId: '',
      explorationPath: [],
      layout: {
        centerX: 400,
        centerY: 300,
        scale: 1.0,
        viewBox: { x: 0, y: 0, width: 800, height: 600 }
      },
      stats: {
        totalNodes: 0,
        exploredNodes: 0,
        recommendedNodes: 0,
        potentialNodes: 0,
        maxDepth: 0,
        averageExplorationDepth: 0,
        lastUpdateTime: Date.now(),
        sessionStartTime: Date.now()
      },
      preferences: {
        autoLayout: true,
        showLabels: true,
        animationEnabled: true,
        compactMode: false,
        showRecommendations: true,
        recommendationThreshold: 0.7
      }
    });
  }, [conversationId]);

  // === 推荐系统方法 ===
  
  // 更新节点状态
  const updateNodeStatus = useCallback((nodeId: string, status: MindMapNode['status']) => {
    const newMindMapState = recommendationEngine.updateNodeStatus(nodeId, status, mindMapState);
    setMindMapState(newMindMapState);
  }, [mindMapState]);

  // 获取推荐上下文
  const getRecommendationContext = useCallback((): RecommendationContext => {
    const exploredNodes = Array.from(mindMapState.nodes.values())
      .filter(node => node.metadata.explored || node.status === 'explored');
    
    // 模拟用户行为数据（实际应该从用户交互中收集）
    const clickHistory = mindMapState.explorationPath;
    
    // 从探索路径提取语义上下文
    const semanticContext = exploredNodes
      .flatMap(node => node.semantic_tags || [])
      .filter((tag, index, array) => array.indexOf(tag) === index); // 去重

    return {
      currentNodeId: mindMapState.currentNodeId,
      exploredNodes,
      userBehavior: {
        clickHistory,
        dwellTimes: {}, // 应该从实际用户交互中收集
        interests: semanticContext
      },
      semanticContext
    };
  }, [mindMapState]);

  // 为特定节点生成推荐
  const generateRecommendations = useCallback((nodeId: string) => {
    const node = mindMapState.nodes.get(nodeId);
    if (!node) return;

    const context = getRecommendationContext();
    const allNodes = Array.from(mindMapState.nodes.values());
    const recommendations = recommendationEngine.generateRecommendations(node, allNodes, context);

    const updatedNode = { ...node, recommendations };
    const newNodes = new Map(mindMapState.nodes);
    newNodes.set(nodeId, updatedNode);

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes
    }));
  }, [mindMapState.nodes, getRecommendationContext]);

  // 触发全局推荐更新
  const triggerRecommendationUpdate = useCallback(() => {
    const context = getRecommendationContext();
    const newMindMapState = recommendationEngine.triggerRecommendationUpdate(mindMapState, context);
    setMindMapState(newMindMapState);
  }, [mindMapState, getRecommendationContext]);

  // 计算最大深度
  function calculateMaxDepth(nodes: Map<string, MindMapNode>): number {
    if (nodes.size === 0) return 0;
    return Math.max(...Array.from(nodes.values()).map(node => node.level));
  }

  // 自动保存
  useEffect(() => {
    saveMindMap();
  }, [saveMindMap]);

  // 初始化加载
  useEffect(() => {
    loadMindMap();
  }, [loadMindMap]);

  return {
    mindMapState,
    initializeMindMap,
    addNode,
    navigateToNode,
    updateNode,
    deleteNode,
    getNode,
    getChildren,
    getPath,
    
    // 推荐系统方法
    updateNodeStatus,
    generateRecommendations,
    triggerRecommendationUpdate,
    getRecommendationContext,
    
    generateMindMapContext,
    clearMindMap
  };
}