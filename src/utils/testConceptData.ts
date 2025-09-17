/**
 * 测试用概念数据，用于验证话题按钮功能
 */

import { ConceptTree, ConceptMap, ConceptNode } from '../types/concept';

export const createTestConceptTree = (conversationId: string): ConceptTree => {
  return {
    id: 'test-root',
    name: '香港',
    children: [
      {
        id: 'geography',
        name: '地理环境',
        children: [
          { id: 'location', name: '地理位置', children: [] },
          { id: 'terrain', name: '地形地貌', children: [] },
          { id: 'climate', name: '气候特征', children: [] }
        ]
      },
      {
        id: 'history',
        name: '历史发展',
        children: [
          { id: 'ancient', name: '古代历史', children: [] },
          { id: 'colonial', name: '殖民时期', children: [] },
          { id: 'modern', name: '现代发展', children: [] }
        ]
      },
      {
        id: 'culture',
        name: '文化特色',
        children: [
          { id: 'language', name: '语言文化', children: [] },
          { id: 'food', name: '饮食文化', children: [] },
          { id: 'festival', name: '节庆文化', children: [] }
        ]
      }
    ],
    metadata: {
      conversationId,
      totalNodes: 13,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  };
};

export const createTestConceptMap = (conversationId: string): ConceptMap => {
  const concepts: ConceptNode[] = [
    {
      id: 'concept-hk',
      name: '香港',
      category: 'core',
      description: '中国特别行政区，国际金融中心',
      importance: 0.9,
      keywords: ['金融', '贸易', '一国两制'],
      relations: [],
      absorbed: false,
      absorptionLevel: 0.5,
      lastReviewed: Date.now(),
      sources: [{
        messageId: 'test-message',
        conversationId,
        extractedAt: Date.now()
      }],
      mentionCount: 1,
      recommendationBlock: {
        blocked: false,
        reason: '',
        until: undefined
      }
    },
    {
      id: 'concept-finance',
      name: '国际金融中心',
      category: 'core',
      description: '全球重要的金融枢纽',
      importance: 0.8,
      keywords: ['银行', '股市', '投资'],
      relations: [],
      absorbed: false,
      absorptionLevel: 0.3,
      lastReviewed: Date.now(),
      sources: [{
        messageId: 'test-message',
        conversationId,
        extractedAt: Date.now()
      }],
      mentionCount: 1,
      recommendationBlock: {
        blocked: false,
        reason: '',
        until: undefined
      }
    },
    {
      id: 'concept-trade',
      name: '自由贸易港',
      category: 'application',
      description: '重要的国际贸易中转站',
      importance: 0.7,
      keywords: ['贸易', '物流', '转口'],
      relations: [],
      absorbed: false,
      absorptionLevel: 0.2,
      lastReviewed: Date.now(),
      sources: [{
        messageId: 'test-message',
        conversationId,
        extractedAt: Date.now()
      }],
      mentionCount: 1,
      recommendationBlock: {
        blocked: false,
        reason: '',
        until: undefined
      }
    }
  ];

  const conceptsMap = new Map<string, ConceptNode>();
  concepts.forEach(concept => {
    conceptsMap.set(concept.id, concept);
  });

  return {
    id: 'test-concept-map',
    conversationId,
    nodes: conceptsMap,
    stats: {
      totalConcepts: concepts.length,
      absorptionRate: 0.3,
      coverage: {
        core: 2,
        method: 0,
        application: 1,
        support: 0
      },
      lastUpdated: Date.now()
    },
    avoidanceList: [],
    similarityThreshold: 0.8
  };
};