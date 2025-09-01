/**
 * 概念管理工具函数
 * 提供概念相似度计算、去重、分析等核心功能
 */

import { ConceptNode, ConceptSimilarity, ConceptRelation } from '../types/concept';

/**
 * 计算两个概念的语义相似度
 * 基于关键词、名称、描述的多维度相似度计算
 */
export function calculateConceptSimilarity(
  concept1: ConceptNode, 
  concept2: ConceptNode
): ConceptSimilarity {
  let similarity = 0;
  const reasons: string[] = [];
  
  // 1. 名称相似度 (权重: 40%)
  const nameSimilarity = calculateStringSimilarity(concept1.name, concept2.name);
  similarity += nameSimilarity * 0.4;
  if (nameSimilarity > 0.7) {
    reasons.push('名称高度相似');
  }
  
  // 2. 关键词重叠度 (权重: 30%)
  const keywordOverlap = calculateKeywordOverlap(concept1.keywords, concept2.keywords);
  similarity += keywordOverlap * 0.3;
  if (keywordOverlap > 0.5) {
    reasons.push('关键词重叠');
  }
  
  // 3. 描述相似度 (权重: 20%)
  const descSimilarity = calculateStringSimilarity(concept1.description, concept2.description);
  similarity += descSimilarity * 0.2;
  if (descSimilarity > 0.6) {
    reasons.push('描述相似');
  }
  
  // 4. 类别匹配 (权重: 10%)
  const categoryMatch = concept1.category === concept2.category ? 1 : 0;
  similarity += categoryMatch * 0.1;
  if (categoryMatch) {
    reasons.push('同类概念');
  }
  
  // 5. 关系连接检查 - 额外加权
  const hasRelation = concept1.relations.some(rel => rel.target === concept2.name) ||
                     concept2.relations.some(rel => rel.target === concept1.name);
  if (hasRelation) {
    similarity = Math.min(1, similarity + 0.2);
    reasons.push('存在关系连接');
  }
  
  return {
    concept1: concept1.name,
    concept2: concept2.name,
    similarity: Math.round(similarity * 100) / 100,
    reason: reasons.length > 0 ? reasons.join('、') : '低相似度'
  };
}

/**
 * 字符串相似度计算 (使用简化的编辑距离)
 */
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1;
  if (str1.length === 0 || str2.length === 0) return 0;
  
  // 包含关系检查
  if (str1.includes(str2) || str2.includes(str1)) {
    return 0.8;
  }
  
  // 简化的编辑距离计算
  const maxLength = Math.max(str1.length, str2.length);
  const distance = levenshteinDistance(str1, str2);
  return Math.max(0, 1 - distance / maxLength);
}

/**
 * 计算编辑距离
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * 关键词重叠度计算
 */
function calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
  if (keywords1.length === 0 || keywords2.length === 0) return 0;
  
  const set1 = new Set(keywords1.map(k => k.toLowerCase()));
  const set2 = new Set(keywords2.map(k => k.toLowerCase()));
  
  const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
  const union = new Set([...Array.from(set1), ...Array.from(set2)]);
  
  return intersection.size / union.size;
}

/**
 * 概念去重 - 根据相似度阈值合并相似概念
 */
export function deduplicateConcepts(
  concepts: ConceptNode[], 
  threshold: number = 0.7
): {
  deduplicated: ConceptNode[];
  merged: Array<{ primary: string; duplicates: string[] }>;
} {
  const deduplicated: ConceptNode[] = [];
  const merged: Array<{ primary: string; duplicates: string[] }> = [];
  const processedIds = new Set<string>();
  
  for (const concept of concepts) {
    if (processedIds.has(concept.id)) continue;
    
    const duplicates: ConceptNode[] = [];
    
    // 找到所有相似的概念
    for (const otherConcept of concepts) {
      if (otherConcept.id === concept.id || processedIds.has(otherConcept.id)) continue;
      
      const similarity = calculateConceptSimilarity(concept, otherConcept);
      if (similarity.similarity >= threshold) {
        duplicates.push(otherConcept);
        processedIds.add(otherConcept.id);
      }
    }
    
    // 合并重复概念
    if (duplicates.length > 0) {
      const mergedConcept = mergeConcepts(concept, duplicates);
      deduplicated.push(mergedConcept);
      merged.push({
        primary: concept.name,
        duplicates: duplicates.map(d => d.name)
      });
    } else {
      deduplicated.push(concept);
    }
    
    processedIds.add(concept.id);
  }
  
  return { deduplicated, merged };
}

/**
 * 合并多个相似概念为单一概念
 */
function mergeConcepts(primary: ConceptNode, duplicates: ConceptNode[]): ConceptNode {
  const allConcepts = [primary, ...duplicates];
  
  // 选择最高重要性的概念作为主概念
  const mainConcept = allConcepts.reduce((max, current) => 
    current.importance > max.importance ? current : max
  );
  
  // 合并关键词
  const allKeywords = new Set<string>();
  allConcepts.forEach(concept => {
    concept.keywords.forEach(keyword => allKeywords.add(keyword));
  });
  
  // 合并来源信息
  const allSources = allConcepts.flatMap(concept => concept.sources);
  
  // 合并关系
  const relationMap = new Map<string, ConceptRelation>();
  allConcepts.forEach(concept => {
    concept.relations.forEach(relation => {
      const key = `${relation.target}_${relation.type}`;
      const existing = relationMap.get(key);
      if (!existing || relation.strength > existing.strength) {
        relationMap.set(key, relation);
      }
    });
  });
  
  return {
    ...mainConcept,
    keywords: Array.from(allKeywords),
    sources: allSources,
    relations: Array.from(relationMap.values()),
    mentionCount: allConcepts.reduce((sum, concept) => sum + concept.mentionCount, 0),
    importance: Math.max(...allConcepts.map(c => c.importance))
  };
}

/**
 * 生成概念避免列表
 * 基于吸收状态、相似度、时间衰减等因素
 */
export function generateAvoidanceList(
  concepts: ConceptNode[],
  maxListSize: number = 50
): string[] {
  const now = Date.now();
  const avoidanceItems: Array<{
    name: string;
    score: number;
  }> = [];
  
  concepts.forEach(concept => {
    let avoidanceScore = 0;
    
    // 1. 吸收状态权重 (60%)
    if (concept.absorbed) {
      avoidanceScore += concept.absorptionLevel * 0.6;
    }
    
    // 2. 重要性反向权重 (20%) - 重要概念less likely被避免
    avoidanceScore += (1 - concept.importance) * 0.2;
    
    // 3. 时间衰减 (15%) - 最近学习的概念more likely被避免
    const timeSinceReview = now - concept.lastReviewed;
    const daysSinceReview = timeSinceReview / (24 * 60 * 60 * 1000);
    const timeDecay = Math.max(0, 1 - daysSinceReview / 30); // 30天衰减
    avoidanceScore += timeDecay * 0.15;
    
    // 4. 提及频率权重 (5%)
    const mentionWeight = Math.min(1, concept.mentionCount / 10);
    avoidanceScore += mentionWeight * 0.05;
    
    // 5. 手动阻挡
    if (concept.recommendationBlock.blocked) {
      if (!concept.recommendationBlock.until || concept.recommendationBlock.until > now) {
        avoidanceScore = 1; // 强制避免
      }
    }
    
    if (avoidanceScore > 0.3) { // 阈值过滤
      avoidanceItems.push({
        name: concept.name,
        score: avoidanceScore
      });
    }
  });
  
  // 按分数排序，取前N个
  return avoidanceItems
    .sort((a, b) => b.score - a.score)
    .slice(0, maxListSize)
    .map(item => item.name);
}

/**
 * 分析概念分布和学习进度
 */
export function analyzeConceptProgress(concepts: ConceptNode[]) {
  const stats = {
    total: concepts.length,
    absorbed: 0,
    byCategory: {
      core: { total: 0, absorbed: 0 },
      method: { total: 0, absorbed: 0 },
      application: { total: 0, absorbed: 0 },
      support: { total: 0, absorbed: 0 }
    },
    avgImportance: 0,
    avgAbsorption: 0,
    recentActivity: 0 // 最近7天的活动
  };
  
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  let totalImportance = 0;
  let totalAbsorption = 0;
  
  concepts.forEach(concept => {
    // 基础统计
    totalImportance += concept.importance;
    totalAbsorption += concept.absorptionLevel;
    
    if (concept.absorbed) {
      stats.absorbed++;
    }
    
    // 分类统计
    stats.byCategory[concept.category].total++;
    if (concept.absorbed) {
      stats.byCategory[concept.category].absorbed++;
    }
    
    // 最近活动
    if (concept.lastReviewed > weekAgo) {
      stats.recentActivity++;
    }
  });
  
  stats.avgImportance = concepts.length > 0 ? totalImportance / concepts.length : 0;
  stats.avgAbsorption = concepts.length > 0 ? totalAbsorption / concepts.length : 0;
  
  return stats;
}

/**
 * 智能推荐多样性检查
 * 确保推荐的概念在类别和重要性上有良好的分布
 */
export function checkRecommendationDiversity(
  recommendedConcepts: string[],
  allConcepts: ConceptNode[]
): {
  diversityScore: number;
  suggestions: string[];
  analysis: {
    categoryDistribution: Record<string, number>;
    importanceRange: { min: number; max: number; avg: number };
  };
} {
  const conceptMap = new Map(allConcepts.map(c => [c.name, c]));
  const validConcepts = recommendedConcepts
    .map(name => conceptMap.get(name))
    .filter((concept): concept is ConceptNode => concept !== undefined);
  
  if (validConcepts.length === 0) {
    return {
      diversityScore: 0,
      suggestions: ['无有效概念进行分析'],
      analysis: {
        categoryDistribution: {},
        importanceRange: { min: 0, max: 0, avg: 0 }
      }
    };
  }
  
  // 分析类别分布
  const categoryCount: Record<string, number> = {};
  let totalImportance = 0;
  let minImportance = 1;
  let maxImportance = 0;
  
  validConcepts.forEach(concept => {
    categoryCount[concept.category] = (categoryCount[concept.category] || 0) + 1;
    totalImportance += concept.importance;
    minImportance = Math.min(minImportance, concept.importance);
    maxImportance = Math.max(maxImportance, concept.importance);
  });
  
  const avgImportance = totalImportance / validConcepts.length;
  
  // 计算多样性得分
  const categoryTypes = Object.keys(categoryCount).length;
  const maxCategories = 4; // core, method, application, support
  const categoryDiversity = categoryTypes / maxCategories;
  
  const importanceSpread = maxImportance - minImportance;
  const importanceDiversity = Math.min(1, importanceSpread * 2); // 0.5 spread = full diversity
  
  const diversityScore = (categoryDiversity * 0.6 + importanceDiversity * 0.4);
  
  // 生成改进建议
  const suggestions: string[] = [];
  
  if (categoryTypes <= 1) {
    suggestions.push('建议增加不同类别的概念以提高多样性');
  }
  
  if (importanceSpread < 0.3) {
    suggestions.push('建议包含不同重要性层次的概念');
  }
  
  if (validConcepts.length < 3) {
    suggestions.push('建议增加推荐概念的数量');
  }
  
  return {
    diversityScore: Math.round(diversityScore * 100) / 100,
    suggestions: suggestions.length > 0 ? suggestions : ['概念推荐多样性良好'],
    analysis: {
      categoryDistribution: categoryCount,
      importanceRange: {
        min: minImportance,
        max: maxImportance,
        avg: Math.round(avgImportance * 100) / 100
      }
    }
  };
}