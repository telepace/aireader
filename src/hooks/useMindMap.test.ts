/**
 * useMindMap Hook测试
 */

import { renderHook, act } from '@testing-library/react';
import { useMindMap } from './useMindMap';

describe('useMindMap Hook', () => {
  test('初始化状态正确', () => {
    const { result } = renderHook(() => useMindMap('test-conversation'));
    
    expect(result.current.mindMapState.nodes.size).toBe(0);
    expect(result.current.mindMapState.currentNodeId).toBe('');
    expect(result.current.mindMapState.explorationPath).toEqual([]);
    expect(result.current.mindMapState.stats.totalNodes).toBe(0);
  });

  test('可以初始化思维导图', () => {
    const { result } = renderHook(() => useMindMap('test-conversation'));
    
    act(() => {
      result.current.initializeMindMap('测试主题', '这是一个测试主题');
    });
    
    expect(result.current.mindMapState.nodes.size).toBe(1);
    expect(result.current.mindMapState.stats.totalNodes).toBe(1);
    expect(result.current.mindMapState.explorationPath.length).toBe(1);
    
    // 获取根节点
    const nodes = Array.from(result.current.mindMapState.nodes.values());
    const rootNode = nodes[0];
    
    expect(rootNode.title).toBe('测试主题');
    expect(rootNode.type).toBe('root');
    expect(rootNode.metadata.summary).toBe('这是一个测试主题');
    expect(rootNode.metadata.explored).toBe(true);
  });

  test('可以添加子节点', () => {
    const { result } = renderHook(() => useMindMap('test-conversation'));
    
    let rootNodeId: string;
    
    act(() => {
      rootNodeId = result.current.initializeMindMap('测试主题');
    });
    
    act(() => {
      result.current.addNode('子主题', 'deepen', rootNodeId, {
        summary: '这是一个子主题',
        keywords: ['测试', '子节点']
      });
    });
    
    expect(result.current.mindMapState.nodes.size).toBe(2);
    expect(result.current.mindMapState.stats.totalNodes).toBe(2);
    expect(result.current.mindMapState.stats.maxDepth).toBe(1);
    
    // 检查根节点是否有子节点
    const rootNode = result.current.mindMapState.nodes.get(rootNodeId);
    expect(rootNode?.children.length).toBe(1);
    
    // 检查子节点
    const childId = rootNode?.children[0];
    const childNode = result.current.mindMapState.nodes.get(childId!);
    
    expect(childNode?.title).toBe('子主题');
    expect(childNode?.type).toBe('deepen');
    expect(childNode?.parentId).toBe(rootNodeId);
    expect(childNode?.level).toBe(1);
    expect(childNode?.metadata.summary).toBe('这是一个子主题');
  });

  test('可以导航到节点', () => {
    const { result } = renderHook(() => useMindMap('test-conversation'));
    
    let rootNodeId: string;
    let childNodeId: string;
    
    act(() => {
      rootNodeId = result.current.initializeMindMap('测试主题');
    });
    
    act(() => {
      childNodeId = result.current.addNode('子主题', 'deepen', rootNodeId);
    });
    
    act(() => {
      result.current.navigateToNode(childNodeId);
    });
    
    expect(result.current.mindMapState.currentNodeId).toBe(childNodeId);
    expect(result.current.mindMapState.explorationPath).toEqual([rootNodeId, childNodeId]);
    
    // 检查节点是否被标记为已探索
    const childNode = result.current.mindMapState.nodes.get(childNodeId);
    expect(childNode?.metadata.explored).toBe(true);
    expect(childNode?.interactions.clickCount).toBe(1);
  });

  test('可以生成AI上下文', () => {
    const { result } = renderHook(() => useMindMap('test-conversation'));
    
    let rootNodeId: string;
    let childNodeId: string;
    
    act(() => {
      rootNodeId = result.current.initializeMindMap('测试主题', '根主题摘要');
    });
    
    act(() => {
      childNodeId = result.current.addNode('子主题', 'deepen', rootNodeId, {
        summary: '子主题摘要',
        keywords: ['关键词1', '关键词2']
      });
    });
    
    act(() => {
      result.current.navigateToNode(childNodeId);
    });
    
    const context = result.current.generateMindMapContext();
    
    expect(context.currentTopic.title).toBe('子主题');
    expect(context.currentTopic.summary).toBe('子主题摘要');
    expect(context.currentTopic.keywords).toEqual(['关键词1', '关键词2']);
    expect(context.explorationHistory.path.length).toBe(2);
    expect(context.explorationHistory.path[0].title).toBe('测试主题');
    expect(context.explorationHistory.path[1].title).toBe('子主题');
  });
});