/**
 * MarkdownTreeMap组件测试
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import MarkdownTreeMap from './MarkdownTreeMap';
import { MindMapState, MindMapNode } from '../../types/mindMap';

// Mock思维导图状态
const createMockMindMapState = (): MindMapState => {
  const rootNode: MindMapNode = {
    id: 'root-1',
    title: '测试主题',
    type: 'root',
    level: 0,
    children: ['child-1'],
    position: { x: 100, y: 100 },
    metadata: {
      messageId: 'msg-1',
      timestamp: Date.now(),
      explored: true,
      summary: '测试根节点',
      keywords: ['测试'],
      explorationDepth: 0
    },
    style: {
      color: '#6366f1',
      size: 'large',
      icon: '📚',
      emphasis: true,
      opacity: 1
    },
    interactions: {
      clickCount: 0,
      lastVisited: Date.now()
    }
  };

  const childNode: MindMapNode = {
    id: 'child-1',
    title: '子主题',
    type: 'deepen',
    level: 1,
    parentId: 'root-1',
    children: [],
    position: { x: 200, y: 150 },
    metadata: {
      messageId: 'msg-2',
      timestamp: Date.now(),
      explored: false,
      summary: '测试子节点',
      keywords: ['子测试'],
      explorationDepth: 1
    },
    style: {
      color: '#10b981',
      size: 'medium',
      icon: '🌿',
      emphasis: false,
      opacity: 0.8
    },
    interactions: {
      clickCount: 0,
      lastVisited: Date.now()
    }
  };

  const nodes = new Map([
    ['root-1', rootNode],
    ['child-1', childNode]
  ]);

  const edges = new Map([
    ['root-1', ['child-1']]
  ]);

  return {
    nodes,
    edges,
    currentNodeId: 'root-1',
    rootNodeId: 'root-1',
    explorationPath: ['root-1'],
    layout: {
      centerX: 400,
      centerY: 300,
      scale: 1,
      viewBox: { x: 0, y: 0, width: 800, height: 600 }
    },
    stats: {
      totalNodes: 2,
      exploredNodes: 1,
      recommendedNodes: 0,
      potentialNodes: 0,
      maxDepth: 1,
      averageExplorationDepth: 0.5,
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
  };
};

describe('MarkdownTreeMap Component', () => {
  const mockOnNodeClick = jest.fn();
  
  beforeEach(() => {
    mockOnNodeClick.mockClear();
  });

  test('renders without crashing', () => {
    const mockState = createMockMindMapState();
    render(
      <MarkdownTreeMap
        mindMapState={mockState}
        onNodeClick={mockOnNodeClick}
        currentNodeId="root-1"
      />
    );
    
    // 检查是否渲染了标题
    expect(screen.getByText('思维导图')).toBeInTheDocument();
  });

  test('displays empty state when no nodes', () => {
    const emptyState: MindMapState = {
      ...createMockMindMapState(),
      nodes: new Map(),
      stats: {
        totalNodes: 0,
        exploredNodes: 0,
        recommendedNodes: 0,
        potentialNodes: 0,
        maxDepth: 0,
        averageExplorationDepth: 0,
        lastUpdateTime: Date.now(),
        sessionStartTime: Date.now()
      }
    };

    render(
      <MarkdownTreeMap
        mindMapState={emptyState}
        onNodeClick={mockOnNodeClick}
        currentNodeId=""
      />
    );
    
    expect(screen.getByText('暂无思维导图数据')).toBeInTheDocument();
  });

  test('displays node titles', () => {
    const mockState = createMockMindMapState();
    render(
      <MarkdownTreeMap
        mindMapState={mockState}
        onNodeClick={mockOnNodeClick}
        currentNodeId="root-1"
      />
    );
    
    expect(screen.getByText('测试主题')).toBeInTheDocument();
    expect(screen.getByText('子主题')).toBeInTheDocument();
  });

  test('shows correct statistics', () => {
    const mockState = createMockMindMapState();
    render(
      <MarkdownTreeMap
        mindMapState={mockState}
        onNodeClick={mockOnNodeClick}
        currentNodeId="root-1"
      />
    );
    
    // 检查统计信息
    expect(screen.getByText('1/2')).toBeInTheDocument(); // 探索进度
    expect(screen.getByText(/深度: 1/)).toBeInTheDocument();
    expect(screen.getByText(/节点: 2/)).toBeInTheDocument();
  });
});