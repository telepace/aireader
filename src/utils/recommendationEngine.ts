/**
 * 推荐型思维导图引擎
 * 实现智能推荐算法和节点状态管理
 */

import { MindMapNode, RecommendationNode, MindMapState } from '../types/mindMap';

// 推荐上下文接口
export interface RecommendationContext {
  currentNodeId: string;
  exploredNodes: MindMapNode[];
  userBehavior: {
    clickHistory: string[];
    dwellTimes: Record<string, number>;
    interests: string[];
  };
  semanticContext: string[];
}

/**
 * 推荐引擎类
 */
export class RecommendationEngine {
  /**
   * 计算推荐分数
   */
  calculateRecommendationScore(
    targetNode: MindMapNode, 
    context: RecommendationContext
  ): number {
    // 基础相关度 (40%)
    const relevanceScore = this.calculateRelevanceScore(targetNode, context);
    
    // 用户兴趣预测 (30%)
    const interestScore = this.predictUserInterest(targetNode, context);
    
    // 探索时机 (20%)
    const timingScore = this.calculateTimingScore(targetNode, context);
    
    // 知识图谱重要性 (10%)
    const importanceScore = targetNode.importance_weight || 0.5;
    
    return 0.4 * relevanceScore + 0.3 * interestScore + 0.2 * timingScore + 0.1 * importanceScore;
  }

  /**
   * 计算相关度分数
   */
  private calculateRelevanceScore(
    targetNode: MindMapNode,
    context: RecommendationContext
  ): number {
    if (!targetNode.semantic_tags || !context.semanticContext) return 0.3;
    
    const commonTags = targetNode.semantic_tags.filter(tag => 
      context.semanticContext.includes(tag)
    );
    
    const relevance = commonTags.length / Math.max(targetNode.semantic_tags.length, 1);
    return Math.min(relevance, 1.0);
  }

  /**
   * 预测用户兴趣
   */
  private predictUserInterest(
    targetNode: MindMapNode,
    context: RecommendationContext
  ): number {
    // 基于用户点击历史预测兴趣
    const clickedNodeTypes = context.userBehavior.clickHistory
      .map(nodeId => context.exploredNodes.find(n => n.id === nodeId)?.type)
      .filter(Boolean);
    
    const typeFrequency = clickedNodeTypes.filter(type => type === targetNode.type).length;
    const totalClicks = clickedNodeTypes.length;
    
    if (totalClicks === 0) return 0.5; // 默认中等兴趣
    
    return Math.min(typeFrequency / totalClicks * 2, 1.0); // *2 来放大差异
  }

  /**
   * 计算探索时机分数
   */
  private calculateTimingScore(
    targetNode: MindMapNode,
    context: RecommendationContext
  ): number {
    // 检查依赖节点是否已探索
    if (targetNode.dependencies && targetNode.dependencies.length > 0) {
      const exploredDeps = targetNode.dependencies.filter(depId =>
        context.exploredNodes.some(n => n.id === depId)
      );
      
      const dependencyScore = exploredDeps.length / targetNode.dependencies.length;
      return dependencyScore;
    }
    
    return 0.8; // 无依赖则认为时机较好
  }

  /**
   * 生成推荐节点列表
   */
  generateRecommendations(
    sourceNode: MindMapNode,
    allNodes: MindMapNode[],
    context: RecommendationContext,
    maxRecommendations: number = 3
  ): RecommendationNode[] {
    // 过滤候选节点：排除已探索和当前节点
    const candidates = allNodes.filter(node => 
      node.id !== sourceNode.id &&
      node.status !== 'explored' &&
      node.status !== 'current' &&
      !context.exploredNodes.some(explored => explored.id === node.id)
    );

    // 计算推荐分数并排序
    const scoredCandidates = candidates
      .map(node => ({
        node,
        score: this.calculateRecommendationScore(node, context)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations);

    // 转换为推荐节点格式
    return scoredCandidates.map(({ node, score }) => ({
      id: `rec_${node.id}`,
      name: node.name || node.title,
      reason: this.generateRecommendationReason(node, sourceNode, score),
      confidence: score,
      trigger_condition: this.generateTriggerCondition(sourceNode, score),
      type: node.type as any
    }));
  }

  /**
   * 生成推荐理由
   */
  private generateRecommendationReason(
    targetNode: MindMapNode,
    sourceNode: MindMapNode,
    score: number
  ): string {
    if (score > 0.8) {
      return `与"${sourceNode.name || sourceNode.title}"高度相关，推荐深入了解`;
    } else if (score > 0.6) {
      return `可以很好地补充您对"${sourceNode.name || sourceNode.title}"的理解`;
    } else {
      return `为您提供新的视角和思路`;
    }
  }

  /**
   * 生成触发条件
   */
  private generateTriggerCondition(sourceNode: MindMapNode, score: number): string {
    const explorationThreshold = Math.round(score * 0.8 * 10) / 10; // 基于分数调整阈值
    return `当"${sourceNode.name || sourceNode.title}"探索深度>${explorationThreshold}时显示`;
  }

  /**
   * 更新节点状态
   */
  updateNodeStatus(
    nodeId: string,
    newStatus: MindMapNode['status'],
    mindMapState: MindMapState
  ): MindMapState {
    const updatedNodes = new Map(mindMapState.nodes);
    const node = updatedNodes.get(nodeId);
    
    if (node) {
      const updatedNode = {
        ...node,
        status: newStatus,
        last_visited: new Date().toISOString(),
        exploration_depth: newStatus === 'explored' ? 1.0 : node.exploration_depth
      };
      updatedNodes.set(nodeId, updatedNode);

      // 更新统计信息
      const stats = this.calculateStats(updatedNodes);
      
      return {
        ...mindMapState,
        nodes: updatedNodes,
        stats: {
          ...mindMapState.stats,
          ...stats
        }
      };
    }
    
    return mindMapState;
  }

  /**
   * 计算图谱统计信息
   */
  private calculateStats(nodes: Map<string, MindMapNode>) {
    const nodeArray = Array.from(nodes.values());
    
    return {
      totalNodes: nodeArray.length,
      exploredNodes: nodeArray.filter(n => n.status === 'explored').length,
      recommendedNodes: nodeArray.filter(n => n.status === 'recommended').length,
      potentialNodes: nodeArray.filter(n => n.status === 'potential').length,
      averageExplorationDepth: nodeArray
        .filter(n => n.exploration_depth)
        .reduce((sum, n) => sum + (n.exploration_depth || 0), 0) / nodeArray.length || 0,
      lastUpdateTime: Date.now()
    };
  }

  /**
   * 触发推荐更新
   */
  triggerRecommendationUpdate(
    mindMapState: MindMapState,
    context: RecommendationContext
  ): MindMapState {
    const updatedNodes = new Map(mindMapState.nodes);
    const nodeArray = Array.from(updatedNodes.values());
    
    // 为所有explored节点生成推荐
    nodeArray
      .filter(node => node.status === 'explored')
      .forEach(node => {
        const recommendations = this.generateRecommendations(
          node,
          nodeArray,
          context,
          3
        );
        
        const updatedNode = {
          ...node,
          recommendations
        };
        
        updatedNodes.set(node.id, updatedNode);
      });

    // 更新推荐状态
    const recommendationState = {
      hiddenRecommendations: [],
      recommendationHistory: [],
      ...mindMapState.recommendationState,
      lastRecommendationUpdate: Date.now(),
      activeRecommendations: nodeArray
        .filter(n => n.status === 'recommended')
        .map(n => n.id)
    };

    return {
      ...mindMapState,
      nodes: updatedNodes,
      recommendationState
    };
  }
}

// 导出单例实例
export const recommendationEngine = new RecommendationEngine();

// 便捷函数
export const generateRecommendationsForNode = (
  sourceNode: MindMapNode,
  allNodes: MindMapNode[],
  context: RecommendationContext
): RecommendationNode[] => {
  return recommendationEngine.generateRecommendations(sourceNode, allNodes, context);
};

export const updateNodeStatus = (
  nodeId: string,
  newStatus: MindMapNode['status'],
  mindMapState: MindMapState
): MindMapState => {
  return recommendationEngine.updateNodeStatus(nodeId, newStatus, mindMapState);
};

export const calculateRecommendationScore = (
  targetNode: MindMapNode,
  context: RecommendationContext
): number => {
  return recommendationEngine.calculateRecommendationScore(targetNode, context);
};