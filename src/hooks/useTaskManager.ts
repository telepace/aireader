import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '../types/types';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'paused';

export interface Task {
  id: string;
  type: 'deepen' | 'next';
  content: string;
  describe: string;
  priority: number;
  status: TaskStatus;
  progress: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: ChatMessage;
  error?: string;
  abortController?: AbortController;
  retryCount: number;
  estimatedDuration?: number;
}

export interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  paused: number;
}

export interface TaskManagerConfig {
  maxConcurrent: number;
  retryLimit: number;
  retryDelays: number[];
}

type TaskEventType = 'taskAdded' | 'taskStarted' | 'taskProgress' | 'taskCompleted' | 'taskFailed' | 'taskCancelled';
type TaskEventCallback = (task: Task) => void;

const DEFAULT_CONFIG: TaskManagerConfig = {
  maxConcurrent: 3,
  retryLimit: 3,
  retryDelays: [1000, 3000, 10000] // 指数退避
};

export const useTaskManager = (config: Partial<TaskManagerConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [activeTaskIds, setActiveTaskIds] = useState<Set<string>>(new Set());
  
  // 事件监听器
  const eventListeners = useRef<Map<TaskEventType, Set<TaskEventCallback>>>(new Map());
  
  // 任务执行器引用
  const taskExecutor = useRef<((task: Task) => Promise<ChatMessage>) | null>(null);
  
  // 初始化事件监听器Map
  useEffect(() => {
    const events: TaskEventType[] = ['taskAdded', 'taskStarted', 'taskProgress', 'taskCompleted', 'taskFailed', 'taskCancelled'];
    events.forEach(event => {
      if (!eventListeners.current.has(event)) {
        eventListeners.current.set(event, new Set());
      }
    });
  }, []);

  // 触发事件
  const emitEvent = useCallback((event: TaskEventType, task: Task) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(task));
    }
  }, []);

  // 添加事件监听器
  const addEventListener = useCallback((event: TaskEventType, callback: TaskEventCallback) => {
    const listeners = eventListeners.current.get(event);
    if (listeners) {
      listeners.add(callback);
    }
    return () => {
      const listeners = eventListeners.current.get(event);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }, []);

  // 计算任务优先级
  const calculatePriority = useCallback((taskType: 'deepen' | 'next', createdAt: number): number => {
    const ageFactor = (Date.now() - createdAt) / 60000; // 等待分钟数
    const typePriority = taskType === 'deepen' ? 1.2 : 1.0; // 深度阅读优先级更高
    return ageFactor * typePriority;
  }, []);

  // 估算任务执行时间
  const estimateTaskDuration = useCallback((task: Task): number => {
    // 基于历史数据估算，这里用简单的启发式算法
    const baseTime = 8000; // 8秒基础时间
    const typeMultiplier = task.type === 'deepen' ? 1.3 : 1.0;
    const contentLengthFactor = Math.min(task.content.length / 50, 2); // 内容长度因子
    
    return Math.round(baseTime * typeMultiplier * contentLengthFactor);
  }, []);

  // 添加任务到队列
  const enqueueTask = useCallback((taskConfig: {
    type: 'deepen' | 'next';
    content: string;
    describe: string;
    priority?: number;
  }): string => {
    const taskId = uuidv4();
    const now = Date.now();
    
    const task: Task = {
      id: taskId,
      type: taskConfig.type,
      content: taskConfig.content,
      describe: taskConfig.describe,
      priority: taskConfig.priority || calculatePriority(taskConfig.type, now),
      status: 'pending',
      progress: 0,
      createdAt: now,
      retryCount: 0,
      abortController: new AbortController(),
    };
    
    // 估算执行时间
    task.estimatedDuration = estimateTaskDuration(task);
    
    setTasks(prev => {
      const newTasks = new Map(prev);
      newTasks.set(taskId, task);
      return newTasks;
    });
    
    emitEvent('taskAdded', task);
    
    // 尝试立即开始处理
    processNextTasks();
    
    return taskId;
  }, [calculatePriority, estimateTaskDuration, emitEvent]);

  // 处理下一个任务
  const processNextTasks = useCallback(async () => {
    const currentTasks = Array.from(tasks.values());
    const activeTasks = currentTasks.filter(t => t.status === 'processing');
    
    if (activeTasks.length >= finalConfig.maxConcurrent) {
      return; // 已达到最大并发数
    }
    
    // 找到待处理的任务，按优先级排序
    const pendingTasks = currentTasks
      .filter(t => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority);
    
    const slotsAvailable = finalConfig.maxConcurrent - activeTasks.length;
    const tasksToStart = pendingTasks.slice(0, slotsAvailable);
    
    tasksToStart.forEach(task => {
      startTask(task.id);
    });
  }, [tasks, finalConfig.maxConcurrent]);

  // 开始执行任务
  const startTask = useCallback(async (taskId: string) => {
    if (!taskExecutor.current) {
      console.error('Task executor not set');
      return;
    }

    const task = tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return;
    }

    // 更新任务状态
    setTasks(prev => {
      const newTasks = new Map(prev);
      const updatedTask = {
        ...task,
        status: 'processing' as TaskStatus,
        startedAt: Date.now()
      };
      newTasks.set(taskId, updatedTask);
      return newTasks;
    });

    setActiveTaskIds(prev => new Set(prev).add(taskId));
    
    const updatedTask = { ...task, status: 'processing' as TaskStatus, startedAt: Date.now() };
    emitEvent('taskStarted', updatedTask);

    try {
      // 执行任务
      const result = await taskExecutor.current(updatedTask);
      
      // 任务完成
      setTasks(prev => {
        const newTasks = new Map(prev);
        const completedTask = {
          ...updatedTask,
          status: 'completed' as TaskStatus,
          progress: 100,
          completedAt: Date.now(),
          result
        };
        newTasks.set(taskId, completedTask);
        return newTasks;
      });

      setActiveTaskIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      const completedTask = {
        ...updatedTask,
        status: 'completed' as TaskStatus,
        progress: 100,
        completedAt: Date.now(),
        result
      };
      
      emitEvent('taskCompleted', completedTask);

      // 处理下一批任务
      processNextTasks();

    } catch (error) {
      // 任务失败处理
      const currentTask = tasks.get(taskId);
      if (currentTask && currentTask.retryCount < finalConfig.retryLimit) {
        // 重试逻辑
        setTimeout(() => {
          setTasks(prev => {
            const newTasks = new Map(prev);
            const retryTask = {
              ...currentTask,
              status: 'pending' as TaskStatus,
              retryCount: currentTask.retryCount + 1,
              abortController: new AbortController()
            };
            newTasks.set(taskId, retryTask);
            return newTasks;
          });
          
          setActiveTaskIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });

          processNextTasks();
        }, finalConfig.retryDelays[currentTask.retryCount] || 10000);

      } else {
        // 永久失败
        setTasks(prev => {
          const newTasks = new Map(prev);
          const failedTask = {
            ...updatedTask,
            status: 'failed' as TaskStatus,
            completedAt: Date.now(),
            error: error instanceof Error ? error.message : String(error)
          };
          newTasks.set(taskId, failedTask);
          return newTasks;
        });

        setActiveTaskIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });

        const failedTask = {
          ...updatedTask,
          status: 'failed' as TaskStatus,
          completedAt: Date.now(),
          error: error instanceof Error ? error.message : String(error)
        };

        emitEvent('taskFailed', failedTask);

        // 处理下一批任务
        processNextTasks();
      }
    }
  }, [tasks, taskExecutor, finalConfig, emitEvent, processNextTasks]);

  // 监听tasks变化，自动处理队列
  useEffect(() => {
    processNextTasks();
  }, [processNextTasks]);

  // 取消任务
  const cancelTask = useCallback((taskId: string): boolean => {
    const task = tasks.get(taskId);
    if (!task) return false;

    if (task.status === 'processing') {
      task.abortController?.abort();
    }

    setTasks(prev => {
      const newTasks = new Map(prev);
      const cancelledTask = {
        ...task,
        status: 'cancelled' as TaskStatus,
        completedAt: Date.now()
      };
      newTasks.set(taskId, cancelledTask);
      return newTasks;
    });

    setActiveTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });

    const cancelledTask = {
      ...task,
      status: 'cancelled' as TaskStatus,
      completedAt: Date.now()
    };

    emitEvent('taskCancelled', cancelledTask);

    // 处理下一批任务
    processNextTasks();

    return true;
  }, [tasks, emitEvent, processNextTasks]);

  // 暂停任务
  const pauseTask = useCallback((taskId: string): boolean => {
    const task = tasks.get(taskId);
    if (!task || task.status !== 'processing') return false;

    task.abortController?.abort();

    setTasks(prev => {
      const newTasks = new Map(prev);
      const pausedTask = {
        ...task,
        status: 'paused' as TaskStatus
      };
      newTasks.set(taskId, pausedTask);
      return newTasks;
    });

    setActiveTaskIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });

    processNextTasks();
    return true;
  }, [tasks, processNextTasks]);

  // 恢复任务
  const resumeTask = useCallback((taskId: string): boolean => {
    const task = tasks.get(taskId);
    if (!task || task.status !== 'paused') return false;

    setTasks(prev => {
      const newTasks = new Map(prev);
      const resumedTask = {
        ...task,
        status: 'pending' as TaskStatus,
        abortController: new AbortController()
      };
      newTasks.set(taskId, resumedTask);
      return newTasks;
    });

    processNextTasks();
    return true;
  }, [tasks, processNextTasks]);

  // 获取任务状态
  const getTaskStatus = useCallback((taskId: string): Task | undefined => {
    return tasks.get(taskId);
  }, [tasks]);

  // 获取队列统计
  const getQueueStats = useCallback((): QueueStats => {
    const taskArray = Array.from(tasks.values());
    
    return {
      total: taskArray.length,
      pending: taskArray.filter(t => t.status === 'pending').length,
      processing: taskArray.filter(t => t.status === 'processing').length,
      completed: taskArray.filter(t => t.status === 'completed').length,
      failed: taskArray.filter(t => t.status === 'failed').length,
      cancelled: taskArray.filter(t => t.status === 'cancelled').length,
      paused: taskArray.filter(t => t.status === 'paused').length,
    };
  }, [tasks]);

  // 清除已完成的任务
  const clearCompleted = useCallback(() => {
    setTasks(prev => {
      const newTasks = new Map();
      prev.forEach((task, id) => {
        if (task.status !== 'completed') {
          newTasks.set(id, task);
        }
      });
      return newTasks;
    });
  }, []);

  // 设置任务执行器
  const setTaskExecutor = useCallback((executor: (task: Task) => Promise<ChatMessage>) => {
    taskExecutor.current = executor;
  }, []);

  // 更新任务进度
  const updateTaskProgress = useCallback((taskId: string, progress: number) => {
    setTasks(prev => {
      const newTasks = new Map(prev);
      const task = newTasks.get(taskId);
      if (task && task.status === 'processing') {
        const updatedTask = { ...task, progress: Math.min(100, Math.max(0, progress)) };
        newTasks.set(taskId, updatedTask);
        emitEvent('taskProgress', updatedTask);
      }
      return newTasks;
    });
  }, [emitEvent]);

  // 重新排序任务
  const reorderTasks = useCallback((taskIds: string[]) => {
    const now = Date.now();
    setTasks(prev => {
      const newTasks = new Map(prev);
      taskIds.forEach((taskId, index) => {
        const task = newTasks.get(taskId);
        if (task && task.status === 'pending') {
          // 通过调整priority来实现重排序
          const updatedTask = {
            ...task,
            priority: 1000 - index // 越靠前优先级越高
          };
          newTasks.set(taskId, updatedTask);
        }
      });
      return newTasks;
    });
    
    processNextTasks();
  }, [processNextTasks]);

  return {
    // 状态
    tasks: Array.from(tasks.values()),
    activeTaskIds,
    
    // 操作
    enqueueTask,
    cancelTask,
    pauseTask,
    resumeTask,
    clearCompleted,
    reorderTasks,
    updateTaskProgress,
    
    // 查询
    getTaskStatus,
    getQueueStats,
    
    // 配置
    setTaskExecutor,
    
    // 事件
    addEventListener,
    
    // 工具方法
    processNextTasks
  };
};

export default useTaskManager;