/**
 * 概念管理 Hook
 * 提供概念提取、存储、查询、分析等完整功能
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ConceptMap,
  ConceptNode,
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
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化概念图
  const initializeConceptMap = useCallback(() => {
    if (conceptMap) return;
    
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
    
    setConceptMap(newConceptMap);
  }, [conversationId, conceptMap]);

  // 从存储中加载概念
  const loadConcepts = useCallback((targetConversationId: string) => {
    try {
      const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS);
      if (!storedData) {
        initializeConceptMap();
        return;
      }
      
      const allConversationConcepts = JSON.parse(storedData);
      const conversationData = allConversationConcepts[targetConversationId];
      
      if (conversationData) {
        const loadedMap: ConceptMap = {
          ...conversationData,
          nodes: new Map(Object.entries(conversationData.nodes))
        };
        setConceptMap(loadedMap);
      } else {
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
        nodes: Object.fromEntries(conceptMap.nodes)
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
  }, [conceptMap, conversationId]);

  // 从内容中提取概念 - 简化实现，返回空数组
  const extractConcepts = useCallback(async (
    content: string,
    messageId: string,
    conversationId: string
  ): Promise<ConceptNode[]> => {
    console.log('概念提取功能已禁用，返回空数组');
    return [];
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

  // 更新概念吸收状态
  const updateConceptAbsorption = useCallback((
    conceptId: string,
    absorbed: boolean,
    level: number = 1
  ) => {
    if (!conceptMap) return;
    
    const concept = conceptMap.nodes.get(conceptId);
    if (!concept) return;
    
    const updatedConcept: ConceptNode = {
      ...concept,
      absorbed,
      absorptionLevel: absorbed ? level : 0,
      lastReviewed: Date.now()
    };
    
    setConceptMap(prev => {
      const newNodes = new Map(prev!.nodes);
      newNodes.set(conceptId, updatedConcept);
      
      // 重新生成避免列表
      const allConcepts = Array.from(newNodes.values());
      const newAvoidanceList = generateAvoidanceList(allConcepts);
      
      return {
        ...prev!,
        nodes: newNodes,
        avoidanceList: newAvoidanceList.slice(0, CONCEPT_DEFAULTS.MAX_AVOIDANCE_LIST)
      };
    });
  }, [conceptMap]);

  // 获取避免推荐列表
  const getAvoidanceList = useCallback((): string[] => {
    return conceptMap?.avoidanceList || [];
  }, [conceptMap]);

  // 查找相似概念
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
  }, [conceptMap]);

  // 按类别获取概念
  const getConceptsByCategory = useCallback((
    category: ConceptNode['category']
  ): ConceptNode[] => {
    if (!conceptMap) return [];
    
    return Array.from(conceptMap.nodes.values())
      .filter(concept => concept.category === category)
      .sort((a, b) => b.importance - a.importance);
  }, [conceptMap]);

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

  // 清空概念
  const clearConcepts = useCallback(() => {
    try {
      const storedData = localStorage.getItem(CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS) || '{}';
      const allConversationConcepts = JSON.parse(storedData);
      delete allConversationConcepts[conversationId];
      
      localStorage.setItem(
        CONCEPT_STORAGE_KEYS.CONVERSATION_CONCEPTS,
        JSON.stringify(allConversationConcepts)
      );
      
      initializeConceptMap();
    } catch (error) {
      console.error('Failed to clear concepts:', error);
      setError('清空概念数据失败');
    }
  }, [conversationId, initializeConceptMap]);

  // 自动保存
  useEffect(() => {
    if (conceptMap && conceptMap.nodes.size > 0) {
      const timeoutId = setTimeout(saveConcepts, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [conceptMap, saveConcepts]);

  // 初始化加载
  useEffect(() => {
    loadConcepts(conversationId);
  }, [conversationId, loadConcepts]);

  // 计算记忆化的统计数据
  const memoizedStats = useMemo(() => {
    return getAbsorptionStats();
  }, [getAbsorptionStats]);

  return {
    conceptMap,
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
    clearConcepts
  };
}

