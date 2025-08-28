import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from './useTaskManager';
import { OptionItem } from '../types/types';

export type CardVisualState = 'idle' | 'clicked' | 'queued' | 'processing' | 'completed' | 'error' | 'cancelled';

export interface CardState {
  id: string;
  visual: CardVisualState;
  interactive: boolean;
  progress: number;
  message?: string;
  eta?: number; // 预计完成时间 (毫秒)
  taskId?: string;
  clickCount: number;
  lastClickAt?: number;
}

interface CardStateManager {
  cardStates: Map<string, CardState>;
  updateCardState: (cardId: string, updates: Partial<CardState>) => void;
  getCardState: (cardId: string) => CardState | undefined;
  createCardState: (option: OptionItem) => CardState;
  syncWithTask: (task: Task) => void;
  clearCompletedCards: () => void;
  getCardStats: () => {
    total: number;
    processing: number;
    completed: number;
    queued: number;
  };
  handleCardClick: (option: OptionItem, taskId: string) => void;
  resetCardState: (cardId: string) => void;
  batchUpdateCardStates: (updates: Array<{ cardId: string; updates: Partial<CardState> }>) => void;
}

// 将任务状态映射到卡片视觉状态
const mapTaskStatusToVisual = (status: TaskStatus): CardVisualState => {
  switch (status) {
    case 'pending':
      return 'queued';
    case 'processing':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'error';
    case 'cancelled':
      return 'cancelled';
    case 'paused':
      return 'queued'; // 暂停状态显示为排队
    default:
      return 'idle';
  }
};

// 生成状态消息
const getStatusMessage = (task: Task): string => {
  switch (task.status) {
    case 'pending':
      return '等待处理中...';
    case 'processing':
      return '正在分析...';
    case 'completed':
      return '分析完成';
    case 'failed':
      return task.error ? `错误: ${task.error}` : '处理失败';
    case 'cancelled':
      return '已取消';
    case 'paused':
      return '已暂停';
    default:
      return '';
  }
};

// 计算预计完成时间
const calculateETA = (task: Task): number => {
  if (!task.startedAt || !task.estimatedDuration) return 0;
  
  const elapsed = Date.now() - task.startedAt;
  const progressRatio = Math.max(0.01, task.progress / 100); // 避免除零
  const estimatedTotal = elapsed / progressRatio;
  const remaining = Math.max(0, estimatedTotal - elapsed);
  
  return remaining;
};

export const useCardState = (): CardStateManager => {
  const [cardStates, setCardStates] = useState<Map<string, CardState>>(new Map());
  
  // 任务到卡片的映射
  const taskToCardMap = useRef<Map<string, string>>(new Map());

  // 创建卡片状态
  const createCardState = useCallback((option: OptionItem): CardState => {
    const cardId = `${option.type}:${option.content.trim().toLowerCase()}`;
    
    return {
      id: cardId,
      visual: 'idle',
      interactive: true,
      progress: 0,
      clickCount: option.clickCount || 0,
      lastClickAt: undefined
    };
  }, []);

  // 更新卡片状态
  const updateCardState = useCallback((cardId: string, updates: Partial<CardState>) => {
    setCardStates(prev => {
      const newStates = new Map(prev);
      const currentState = newStates.get(cardId);
      
      if (currentState) {
        const updatedState = { ...currentState, ...updates };
        newStates.set(cardId, updatedState);
      } else {
        // 如果卡片状态不存在，创建一个基础状态
        const newState: CardState = {
          id: cardId,
          visual: 'idle',
          interactive: true,
          progress: 0,
          clickCount: 0,
          ...updates
        };
        newStates.set(cardId, newState);
      }
      
      return newStates;
    });
  }, []);

  // 获取卡片状态
  const getCardState = useCallback((cardId: string): CardState | undefined => {
    return cardStates.get(cardId);
  }, [cardStates]);

  // 与任务状态同步
  const syncWithTask = useCallback((task: Task) => {
    // 查找对应的卡片ID
    const cardId = taskToCardMap.current.get(task.id);
    
    if (!cardId) {
      // 如果没有找到对应的卡片，可能是因为任务是通过其他方式创建的
      // 这里可以根据任务内容尝试匹配
      const possibleCardId = `${task.type}:${task.content.trim().toLowerCase()}`;
      taskToCardMap.current.set(task.id, possibleCardId);
      
      updateCardState(possibleCardId, {
        visual: mapTaskStatusToVisual(task.status),
        interactive: task.status !== 'processing',
        progress: task.progress,
        message: getStatusMessage(task),
        eta: calculateETA(task),
        taskId: task.id
      });
      
      return;
    }

    updateCardState(cardId, {
      visual: mapTaskStatusToVisual(task.status),
      interactive: task.status !== 'processing',
      progress: task.progress,
      message: getStatusMessage(task),
      eta: calculateETA(task),
      taskId: task.id
    });
  }, [updateCardState]);

  // 处理卡片点击
  const handleCardClick = useCallback((option: OptionItem, taskId: string) => {
    const cardId = `${option.type}:${option.content.trim().toLowerCase()}`;
    
    // 建立任务到卡片的映射
    taskToCardMap.current.set(taskId, cardId);
    
    // 更新卡片状态
    updateCardState(cardId, {
      visual: 'clicked',
      interactive: false,
      clickCount: (getCardState(cardId)?.clickCount || 0) + 1,
      lastClickAt: Date.now(),
      taskId
    });

    // 短暂延迟后更新为排队状态
    setTimeout(() => {
      updateCardState(cardId, {
        visual: 'queued',
        message: '已加入处理队列'
      });
    }, 200);
  }, [updateCardState, getCardState]);

  // 清除已完成的卡片
  const clearCompletedCards = useCallback(() => {
    setCardStates(prev => {
      const newStates = new Map();
      prev.forEach((state, id) => {
        if (state.visual !== 'completed') {
          newStates.set(id, state);
        }
      });
      return newStates;
    });
  }, []);

  // 获取卡片统计
  const getCardStats = useCallback(() => {
    const statesArray = Array.from(cardStates.values());
    
    return {
      total: statesArray.length,
      processing: statesArray.filter(s => s.visual === 'processing').length,
      completed: statesArray.filter(s => s.visual === 'completed').length,
      queued: statesArray.filter(s => s.visual === 'queued').length
    };
  }, [cardStates]);

  // 重置卡片状态
  const resetCardState = useCallback((cardId: string) => {
    updateCardState(cardId, {
      visual: 'idle',
      interactive: true,
      progress: 0,
      message: undefined,
      eta: undefined,
      taskId: undefined
    });
  }, [updateCardState]);

  // 批量更新卡片状态
  const batchUpdateCardStates = useCallback((updates: Array<{ cardId: string; updates: Partial<CardState> }>) => {
    setCardStates(prev => {
      const newStates = new Map(prev);
      
      updates.forEach(({ cardId, updates: cardUpdates }) => {
        const currentState = newStates.get(cardId);
        if (currentState) {
          newStates.set(cardId, { ...currentState, ...cardUpdates });
        }
      });
      
      return newStates;
    });
  }, []);

  // 自动清理过期的完成状态
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      const staleTimeout = 30000; // 30秒后清理已完成的卡片状态
      
      setCardStates(prev => {
        const newStates = new Map(prev);
        let hasChanges = false;
        
        newStates.forEach((state, cardId) => {
          if (state.visual === 'completed' && state.lastClickAt) {
            if (now - state.lastClickAt > staleTimeout) {
              newStates.set(cardId, {
                ...state,
                visual: 'idle',
                interactive: true,
                progress: 0,
                message: undefined,
                eta: undefined
              });
              hasChanges = true;
            }
          }
        });
        
        return hasChanges ? newStates : prev;
      });
    }, 10000); // 每10秒检查一次

    return () => clearInterval(cleanup);
  }, []);

  return {
    cardStates,
    updateCardState,
    getCardState,
    createCardState,
    syncWithTask,
    clearCompletedCards,
    getCardStats,
    handleCardClick,
    resetCardState,
    batchUpdateCardStates
  };
};

export default useCardState;