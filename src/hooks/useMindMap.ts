/**
 * 思维导图 Hook
 * 管理思维导图的节点、导航、状态等
 */

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// 思维导图节点类型
export interface MindMapNode {
  id: string;
  title: string;
  type: 'root' | 'deepen' | 'next' | 'explore';
  parentId?: string;
  children: string[];
  level: number;
  metadata: {
    summary?: string;
    keywords?: string[];
    explored: boolean;
    createdAt: number;
    updatedAt: number;
    interactions: {
      clickCount: number;
      lastInteraction?: number;
    };
  };
}

// 思维导图状态
export interface MindMapState {
  nodes: Map<string, MindMapNode>;
  currentNodeId: string;
  explorationPath: string[];
  stats: {
    totalNodes: number;
    maxDepth: number;
    exploredNodes: number;
    lastUpdated: number;
  };
}

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
    currentNodeId: '',
    explorationPath: [],
    stats: {
      totalNodes: 0,
      maxDepth: 0,
      exploredNodes: 0,
      lastUpdated: Date.now()
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
          
          setMindMapState({
            nodes,
            currentNodeId: conversationMap.currentNodeId || '',
            explorationPath: conversationMap.explorationPath || [],
            stats: {
              totalNodes: nodes.size,
              maxDepth: calculateMaxDepth(nodes),
              exploredNodes: Array.from(nodes.values()).filter(n => n.metadata.explored).length,
              lastUpdated: Date.now()
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load mind map:', error);
    }
  }, [conversationId]);

  // 保存到本地存储
  const saveMindMap = useCallback(() => {
    try {
      const stored = localStorage.getItem(MIND_MAP_STORAGE_KEY) || '{}';
      const allMindMaps = JSON.parse(stored);
      
      // 序列化 Map 为对象
      const serializedNodes: Record<string, MindMapNode> = {};
      mindMapState.nodes.forEach((node, id) => {
        serializedNodes[id] = node;
      });
      
      allMindMaps[conversationId] = {
        nodes: serializedNodes,
        currentNodeId: mindMapState.currentNodeId,
        explorationPath: mindMapState.explorationPath,
        stats: mindMapState.stats
      };
      
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
        summary,
        keywords: [],
        explored: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        interactions: {
          clickCount: 1,
          lastInteraction: Date.now()
        }
      }
    };

    const newNodes = new Map<string, MindMapNode>();
    newNodes.set(rootId, rootNode);

    setMindMapState({
      nodes: newNodes,
      currentNodeId: rootId,
      explorationPath: [rootId],
      stats: {
        totalNodes: 1,
        maxDepth: 0,
        exploredNodes: 1,
        lastUpdated: Date.now()
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
        keywords: [],
        explored: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        interactions: {
          clickCount: 0,
          ...metadata.interactions
        },
        ...metadata
      }
    };

    const newNodes = new Map(mindMapState.nodes);
    newNodes.set(nodeId, newNode);

    // 更新父节点的 children
    const parentNode = newNodes.get(parentId)!;
    parentNode.children.push(nodeId);
    parentNode.metadata.updatedAt = Date.now();

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes,
      stats: {
        totalNodes: newNodes.size,
        maxDepth: Math.max(prev.stats.maxDepth, newNode.level),
        exploredNodes: prev.stats.exploredNodes,
        lastUpdated: Date.now()
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
    targetNode.metadata.interactions.clickCount++;
    targetNode.metadata.interactions.lastInteraction = Date.now();
    targetNode.metadata.updatedAt = Date.now();

    setMindMapState(prev => ({
      ...prev,
      nodes: newNodes,
      currentNodeId: nodeId,
      explorationPath: path,
      stats: {
        ...prev.stats,
        exploredNodes: Array.from(newNodes.values()).filter(n => n.metadata.explored).length,
        lastUpdated: Date.now()
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
          lastUpdated: Date.now()
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
        totalNodes: newNodes.size,
        maxDepth: calculateMaxDepth(newNodes),
        exploredNodes: Array.from(newNodes.values()).filter(n => n.metadata.explored).length,
        lastUpdated: Date.now()
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
    setMindMapState({
      nodes: new Map(),
      currentNodeId: '',
      explorationPath: [],
      stats: {
        totalNodes: 0,
        maxDepth: 0,
        exploredNodes: 0,
        lastUpdated: Date.now()
      }
    });
  }, []);

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
    generateMindMapContext,
    clearMindMap
  };
}