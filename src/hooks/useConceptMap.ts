/**
 * 概念管理 Hook
 * 提供概念提取、存储、查询、分析等完整功能
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ConceptMap,
  ConceptNode,
  ConceptTree,
  ConceptRecommendationContext,
  UseConceptMapResult,
  CONCEPT_STORAGE_KEYS,
  CONCEPT_DEFAULTS
} from '../types/concept';
import {
  calculateConceptSimilarity,
  deduplicateConcepts,
  generateAvoidanceList,
  analyzeConceptProgress
} from '../utils/conceptUtils';

export function useConceptMap(conversationId: string): UseConceptMapResult {
  const [conceptMap, setConceptMap] = useState<ConceptMap | null>(null);
  const [conceptTree, setConceptTree] = useState<ConceptTree | null>(null);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 简化调试日志 - 只在conversationId变化时记录，避免频繁输出
  useEffect(() => {
    console.log('🔧 useConceptMap initialized for conversation:', conversationId);
  }, [conversationId]); // 只在会话切换时记录

  // 初始化概念图 - 使用useRef避免依赖conceptMap造成的循环更新
  const initializeConceptMap = useCallback(() => {
    setConceptMap(prev => {
      if (prev) {
        return prev; // 如果已经初始化，直接返回
      }
      
      console.log('🔧 Creating new conceptMap for:', conversationId);
      const newConceptMap: ConceptMap = {
        id: uuidv4(),
        conversationId,
        nodes: new Map(),
        stats: {
          totalConcepts: 0,
          absorptionRate: 0,
          coverage: { core: 0, method: 0, application: 0, support: 0 },
          lastUpdated: Date.now()
        },
        avoidanceList: [],
        similarityThreshold: CONCEPT_DEFAULTS.SIMILARITY_THRESHOLD
      };
      
      return newConceptMap;
    });
  }, [conversationId]); // 移除conceptMap依赖，避免循环更新

  // 从存储中加载概念
  const loadConcepts = useCallback((targetConversationId: string) => {
    console.log('🔧 loadConcepts called for:', targetConversationId);
    try {
      const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS);
      if (!storedData) {
        console.log('🔧 No stored data, initializing new conceptMap');
        initializeConceptMap();
        return;
      }
      
      const allConversationConcepts = JSON.parse(storedData);
      const conversationData = allConversationConcepts[targetConversationId];
      
      if (conversationData) {
        console.log('🔧 Loading existing conceptMap with', Object.keys(conversationData.nodes || {}).length, 'nodes');
        const loadedMap: ConceptMap = {
          ...conversationData,
          nodes: new Map(Object.entries(conversationData.nodes))
        };
        setConceptMap(loadedMap);
        
        // 加载概念树
        if (conversationData.conceptTree) {
          console.log('🔧 Loading existing conceptTree');
          setConceptTree(conversationData.conceptTree);
        }
      } else {
        console.log('🔧 No data for conversation, initializing new conceptMap');
        initializeConceptMap();
      }
    } catch (error) {
      console.error('Failed to load concepts:', error);
      setError('加载概念数据失败');
      initializeConceptMap();
    }
  }, [initializeConceptMap]);

  // 保存概念到存储
  const saveConcepts = useCallback(() => {
    if (!conceptMap) return;
    
    try {
      const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS) || '{}';
      const allConversationConcepts = JSON.parse(storedData);
      
      const serializedMap = {
        ...conceptMap,
        nodes: Object.fromEntries(conceptMap.nodes),
        conceptTree: conceptTree // 保存概念树
      };
      
      allConversationConcepts[conversationId] = serializedMap;
      
      localStorage.setItem(
        CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS,
        JSON.stringify(allConversationConcepts)
      );
    } catch (error) {
      console.error('Failed to save concepts:', error);
      setError('保存概念数据失败');
    }
  }, [conceptMap, conceptTree, conversationId]);

  // 从内容中提取概念 - 解析LLM输出的JSON格式概念图谱
  const extractConcepts = useCallback(async (
    content: string,
    messageId: string,
    conversationId: string
  ): Promise<ConceptNode[]> => {
    try {
      console.log('🧠 开始提取概念，内容长度:', content.length);
      
      // 查找JSON格式的概念图谱数据
      const jsonMatch = content.match(/\{[\s\S]*"children"\s*:\s*\[[\s\S]*\]\s*\}/);
      if (!jsonMatch) {
        console.log('❌ 未找到JSON格式的概念图谱数据');
        return [];
      }
      
      const jsonStr = jsonMatch[0];
      const conceptTree = JSON.parse(jsonStr);
      
      console.log('✅ 解析到概念图谱:', conceptTree);
      
      // 递归提取所有概念节点
      const extractNodesFromTree = (node: any): ConceptNode[] => {
        const concepts: ConceptNode[] = [];
        
        // 当前节点转换为ConceptNode
        const conceptNode: ConceptNode = {
          id: node.id || uuidv4(),
          name: node.name || 'Unknown',
          category: node.type === 'method' ? 'method' : 'core',
          description: `探索深度: ${node.exploration_depth || 0.5}`,
          importance: node.exploration_depth || 0.5,
          keywords: node.semantic_tags || [],
          relations: node.related_nodes?.map((rel: any) => ({
            target: rel.node_id || rel.name || '',
            type: rel.relation_type || 'parallel',
            strength: rel.strength || 0.5
          })) || [],
          absorbed: (node.exploration_depth || 0) > 0.7,
          absorptionLevel: node.exploration_depth || 0.5,
          lastReviewed: Date.now(),
          sources: [{
            messageId: messageId,
            conversationId: conversationId,
            extractedAt: Date.now()
          }],
          mentionCount: 1,
          recommendationBlock: {
            blocked: false,
            reason: '',
            until: undefined
          }
        };
        
        concepts.push(conceptNode);
        
        // 递归处理子节点
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((child: any) => {
            concepts.push(...extractNodesFromTree(child));
          });
        }
        
        return concepts;
      };
      
      const extractedConcepts = extractNodesFromTree(conceptTree);
      
      console.log('✅ 成功提取概念数量:', extractedConcepts.length);
      console.log('概念列表:', extractedConcepts.map(c => c.name));
      
      return extractedConcepts;
      
    } catch (error) {
      console.error('❌ 概念提取失败:', error);
      return [];
    }
  }, []);

  // 添加概念（带去重）
  const addConcepts = useCallback((newConcepts: ConceptNode[]) => {
    if (!conceptMap || newConcepts.length === 0) return;
    
    const existingConcepts = Array.from(conceptMap.nodes.values());
    const allConcepts = [...existingConcepts, ...newConcepts];
    
    // 执行去重
    const { deduplicated, merged } = deduplicateConcepts(
      allConcepts,
      conceptMap.similarityThreshold
    );
    
    console.log(`概念去重: ${allConcepts.length} -> ${deduplicated.length}`, { merged });
    
    // 更新概念图
    const newNodes = new Map<string, ConceptNode>();
    deduplicated.forEach(concept => {
      newNodes.set(concept.id, concept);
    });
    
    // 重新计算统计信息
    const stats = analyzeConceptProgress(deduplicated);
    const newAvoidanceList = generateAvoidanceList(deduplicated);
    
    setConceptMap(prev => ({
      ...prev!,
      nodes: newNodes,
      stats: {
        totalConcepts: stats.total,
        absorptionRate: stats.total > 0 ? stats.absorbed / stats.total : 0,
        coverage: {
          core: stats.byCategory.core.total,
          method: stats.byCategory.method.total,
          application: stats.byCategory.application.total,
          support: stats.byCategory.support.total
        },
        lastUpdated: Date.now()
      },
      avoidanceList: newAvoidanceList.slice(0, CONCEPT_DEFAULTS.MAX_AVOIDANCE_LIST)
    }));
  }, [conceptMap]);

  // 更新概念吸收状态 - 移除conceptMap依赖，减少重渲染
  const updateConceptAbsorption = useCallback((
    conceptId: string,
    absorbed: boolean,
    level: number = 1
  ) => {
    setConceptMap(prev => {
      if (!prev) return prev;
      
      const concept = prev.nodes.get(conceptId);
      if (!concept) return prev;
      
      const updatedConcept: ConceptNode = {
        ...concept,
        absorbed,
        absorptionLevel: absorbed ? level : 0,
        lastReviewed: Date.now()
      };
      
      const newNodes = new Map(prev.nodes);
      newNodes.set(conceptId, updatedConcept);
      
      // 重新生成避免列表
      const allConcepts = Array.from(newNodes.values());
      const newAvoidanceList = generateAvoidanceList(allConcepts);
      
      return {
        ...prev,
        nodes: newNodes,
        avoidanceList: newAvoidanceList.slice(0, CONCEPT_DEFAULTS.MAX_AVOIDANCE_LIST)
      };
    });
  }, []);

  // 获取避免推荐列表 - 移除依赖，使用实时状态
  const getAvoidanceList = useCallback((): string[] => {
    return conceptMap?.avoidanceList || [];
  }, [conceptMap?.avoidanceList]);

  // 查找相似概念 - 优化依赖
  const getSimilarConcepts = useCallback((
    conceptName: string,
    threshold: number = CONCEPT_DEFAULTS.SIMILARITY_THRESHOLD
  ): ConceptNode[] => {
    if (!conceptMap) return [];
    
    const targetConcept = Array.from(conceptMap.nodes.values())
      .find(concept => concept.name === conceptName);
    
    if (!targetConcept) return [];
    
    const similarConcepts: ConceptNode[] = [];
    
    for (const concept of Array.from(conceptMap.nodes.values())) {
      if (concept.id === targetConcept.id) continue;
      
      const similarity = calculateConceptSimilarity(targetConcept, concept);
      if (similarity.similarity >= threshold) {
        similarConcepts.push(concept);
      }
    }
    
    return similarConcepts.sort((a, b) => b.importance - a.importance);
  }, [conceptMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // 按类别获取概念 - 优化依赖
  const getConceptsByCategory = useCallback((
    category: ConceptNode['category']
  ): ConceptNode[] => {
    if (!conceptMap) return [];
    
    return Array.from(conceptMap.nodes.values())
      .filter(concept => concept.category === category)
      .sort((a, b) => b.importance - a.importance);
  }, [conceptMap]); // eslint-disable-line react-hooks/exhaustive-deps

  // 获取推荐上下文
  const getRecommendationContext = useCallback((): ConceptRecommendationContext => {
    if (!conceptMap) {
      return {
        existingConcepts: [],
        recentConcepts: [],
        avoidanceList: [],
        mindMapConcepts: [],
        preferredCategories: ['core', 'method'],
        diversityWeight: 0.5
      };
    }
    
    const allConcepts = Array.from(conceptMap.nodes.values());
    const now = Date.now();
    const recentThreshold = now - 24 * 60 * 60 * 1000; // 最近24小时
    
    const recentConcepts = allConcepts
      .filter(concept => concept.lastReviewed > recentThreshold)
      .map(concept => concept.name);
    
    // 基于当前概念分布确定偏好类别
    const categoryStats = analyzeConceptProgress(allConcepts);
    const preferredCategories: ConceptNode['category'][] = [];
    
    // 优先推荐数量较少的类别
    if (categoryStats.byCategory.core.total < 3) preferredCategories.push('core');
    if (categoryStats.byCategory.method.total < 3) preferredCategories.push('method');
    if (categoryStats.byCategory.application.total < 2) preferredCategories.push('application');
    
    // 获取思维导图已覆盖的概念
    const mindMapConcepts = allConcepts
      .filter(concept => concept.absorbed)
      .map(concept => concept.name);

    return {
      existingConcepts: allConcepts.map(c => c.name),
      recentConcepts,
      avoidanceList: conceptMap.avoidanceList,
      mindMapConcepts,
      preferredCategories: preferredCategories.length > 0 ? preferredCategories : ['core', 'method'],
      diversityWeight: 0.6 // 较高的多样性权重
    };
  }, [conceptMap]);

  // 检查是否应避免某概念
  const shouldAvoidConcept = useCallback((conceptName: string): boolean => {
    if (!conceptMap) return false;
    return conceptMap.avoidanceList.includes(conceptName);
  }, [conceptMap]);

  // 获取吸收统计
  const getAbsorptionStats = useCallback(() => {
    if (!conceptMap) {
      return {
        totalAbsorbed: 0,
        absorptionRate: 0,
        byCategory: { core: 0, method: 0, application: 0, support: 0 }
      };
    }
    
    const allConcepts = Array.from(conceptMap.nodes.values());
    const stats = analyzeConceptProgress(allConcepts);
    
    return {
      totalAbsorbed: stats.absorbed,
      absorptionRate: stats.total > 0 ? stats.absorbed / stats.total : 0,
      byCategory: {
        core: stats.byCategory.core.absorbed,
        method: stats.byCategory.method.absorbed,
        application: stats.byCategory.application.absorbed,
        support: stats.byCategory.support.absorbed
      }
    };
  }, [conceptMap]);

  // 设置概念树
  const setConceptTreeData = useCallback((newConceptTree: ConceptTree | null) => {
    setConceptTree(newConceptTree);
  }, []);

  // 防抖标志，防止频繁调用clearConcepts
  const clearDebounceRef = useRef(false);
  
  // 清空概念 - 加入防抖保护避免频繁调用
  const clearConcepts = useCallback(() => {
    // 防抖保护：如果在短时间内重复调用，直接返回
    if (clearDebounceRef.current) {
      console.log('🚨 clearConcepts防抖保护：跳过重复调用');
      return;
    }
    
    clearDebounceRef.current = true;
    // 500ms后才允许再次调用
    setTimeout(() => {
      clearDebounceRef.current = false;
    }, 500);
    
    try {
      const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS) || '{}';
      const allConversationConcepts = JSON.parse(storedData);
      delete allConversationConcepts[conversationId];
      
      localStorage.setItem(
        CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS,
        JSON.stringify(allConversationConcepts)
      );
      
      // 一次性重置到完整的初始化状态，避免多次状态变化
      const newConceptMap: ConceptMap = {
        id: uuidv4(),
        conversationId,
        nodes: new Map(),
        stats: {
          totalConcepts: 0,
          absorptionRate: 0,
          coverage: { core: 0, method: 0, application: 0, support: 0 },
          lastUpdated: Date.now()
        },
        avoidanceList: [],
        similarityThreshold: CONCEPT_DEFAULTS.SIMILARITY_THRESHOLD
      };
      
      // 批量状态更新，减少重新渲染次数
      setConceptMap(newConceptMap);
      setConceptTree(null);
      setError(null);
      
      console.log('✅ 概念数据已清空并重新初始化', conversationId);
    } catch (error) {
      console.error('Failed to clear concepts:', error);
      setError('清空概念数据失败');
    }
  }, [conversationId]);

  // 自动保存 - 移除saveConcepts依赖避免循环
  useEffect(() => {
    if (conceptMap && (conceptMap.nodes.size > 0 || conceptTree)) {
      const timeoutId = setTimeout(() => {
        // 内联保存逻辑，避免依赖外部函数导致的循环更新
        if (!conceptMap) return;
        
        try {
          const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS) || '{}';
          const allConversationConcepts = JSON.parse(storedData);
          
          const serializedMap = {
            ...conceptMap,
            nodes: Object.fromEntries(conceptMap.nodes),
            conceptTree: conceptTree
          };
          
          allConversationConcepts[conversationId] = serializedMap;
          
          localStorage.setItem(
            CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS,
            JSON.stringify(allConversationConcepts)
          );
        } catch (error) {
          console.error('Failed to auto-save concepts:', error);
        }
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [conceptMap, conceptTree, conversationId]); // 只依赖状态，不依赖函数

  // 初始化加载 - 只在conversationId变化时加载，避免loadConcepts依赖导致的循环更新
  useEffect(() => {
    loadConcepts(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]); // 移除loadConcepts依赖，避免循环更新

  // 计算记忆化的统计数据
  const memoizedStats = useMemo(() => {
    return getAbsorptionStats();
  }, [getAbsorptionStats]);

  return {
    conceptMap,
    conceptTree,
    isLoading,
    error,
    extractConcepts,
    addConcepts,
    updateConceptAbsorption,
    getAvoidanceList,
    getSimilarConcepts,
    getConceptsByCategory,
    getRecommendationContext,
    shouldAvoidConcept,
    getAbsorptionStats: () => memoizedStats,
    saveConcepts,
    loadConcepts,
    clearConcepts,
    setConceptTreeData
  };
}

