import { renderHook, act } from '@testing-library/react';
import { useTaskManager, Task } from '../useTaskManager';
import { ChatMessage } from '../../types/types';

// Mock uuidv4
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('useTaskManager', () => {
  let taskExecutor: jest.Mock<Promise<ChatMessage>, [Task]>;

  beforeEach(() => {
    taskExecutor = jest.fn();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should initialize with empty tasks', () => {
    const { result } = renderHook(() => useTaskManager());
    
    expect(result.current.tasks).toEqual([]);
    expect(result.current.activeTaskIds.size).toBe(0);
  });

  it('should enqueue tasks correctly', () => {
    const { result } = renderHook(() => useTaskManager());
    
    let taskId: string = '';
    act(() => {
      taskId = result.current.enqueueTask({
        type: 'deepen',
        content: 'Test task',
        describe: 'Test description'
      });
    });

    expect(taskId).toBe('test-uuid-123');
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0]).toMatchObject({
      id: 'test-uuid-123',
      type: 'deepen',
      content: 'Test task',
      describe: 'Test description',
      status: 'pending'
    });
  });

  it('should respect maxConcurrent limit', async () => {
    const { result } = renderHook(() => useTaskManager({ maxConcurrent: 2 }));

    // Setup a mock executor that never resolves
    const mockExecutor = jest.fn(() => new Promise<any>(() => {}));
    
    act(() => {
      result.current.setTaskExecutor(mockExecutor);
    });

    // Enqueue 3 tasks
    act(() => {
      result.current.enqueueTask({ type: 'deepen', content: 'Task 1', describe: 'Desc 1' });
      result.current.enqueueTask({ type: 'next', content: 'Task 2', describe: 'Desc 2' });
      result.current.enqueueTask({ type: 'deepen', content: 'Task 3', describe: 'Desc 3' });
    });

    // Wait for task processing
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.tasks).toHaveLength(3);
    
    // Should have 2 processing and 1 pending
    const processingTasks = result.current.tasks.filter(t => t.status === 'processing');
    const pendingTasks = result.current.tasks.filter(t => t.status === 'pending');
    
    expect(processingTasks).toHaveLength(2);
    expect(pendingTasks).toHaveLength(1);
  });

  it('should cancel tasks correctly', async () => {
    const { result } = renderHook(() => useTaskManager());

    let taskId: string = '';
    act(() => {
      taskId = result.current.enqueueTask({
        type: 'deepen',
        content: 'Test task',
        describe: 'Test description'
      });
    });

    act(() => {
      const success = result.current.cancelTask(taskId);
      expect(success).toBe(true);
    });

    expect(result.current.getTaskStatus(taskId)?.status).toBe('cancelled');
  });

  it('should handle task completion', async () => {
    const { result } = renderHook(() => useTaskManager());

    const mockResult: ChatMessage = {
      id: 'message-123',
      role: 'assistant',
      content: 'Test response',
      timestamp: Date.now()
    };

    const mockExecutor = jest.fn().mockResolvedValue(mockResult);
    
    let completedTask: Task | null = null;
    const mockListener = jest.fn((task: Task) => {
      completedTask = task;
    });

    act(() => {
      result.current.setTaskExecutor(mockExecutor);
      result.current.addEventListener('taskCompleted', mockListener);
    });

    let taskId: string = '';
    act(() => {
      taskId = result.current.enqueueTask({
        type: 'deepen',
        content: 'Test task',
        describe: 'Test description'
      });
    });

    // Wait for task execution
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockExecutor).toHaveBeenCalledWith(
      expect.objectContaining({
        id: taskId,
        content: 'Test task',
        status: 'processing'
      })
    );

    expect(mockListener).toHaveBeenCalled();
    expect(completedTask).toMatchObject({
      id: taskId,
      status: 'completed',
      result: mockResult
    });
  });

  it('should retry failed tasks', async () => {
    const { result } = renderHook(() => useTaskManager({ retryLimit: 2 }));

    const mockExecutor = jest.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValueOnce({
        id: 'success-message',
        role: 'assistant',
        content: 'Success!',
        timestamp: Date.now()
      });

    act(() => {
      result.current.setTaskExecutor(mockExecutor);
    });

    act(() => {
      result.current.enqueueTask({
        type: 'deepen',
        content: 'Test task',
        describe: 'Test description'
      });
    });

    // Wait for initial execution and first retry
    await act(async () => {
      jest.advanceTimersByTime(1000); // First retry delay
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await act(async () => {
      jest.advanceTimersByTime(3000); // Second retry delay
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(mockExecutor).toHaveBeenCalledTimes(3);
    expect(result.current.tasks[0].status).toBe('completed');
  });

  it('should update queue statistics correctly', () => {
    const { result } = renderHook(() => useTaskManager());

    act(() => {
      result.current.enqueueTask({ type: 'deepen', content: 'Task 1', describe: 'Desc 1' });
      result.current.enqueueTask({ type: 'next', content: 'Task 2', describe: 'Desc 2' });
    });

    const stats = result.current.getQueueStats();
    expect(stats).toMatchObject({
      total: 2,
      pending: 2,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      paused: 0
    });
  });

  it('should clear completed tasks', async () => {
    const { result } = renderHook(() => useTaskManager());

    const mockExecutor = jest.fn().mockResolvedValue({
      id: 'message-123',
      role: 'assistant',
      content: 'Test response',
      timestamp: Date.now()
    });

    act(() => {
      result.current.setTaskExecutor(mockExecutor);
    });

    // Add and complete a task
    act(() => {
      result.current.enqueueTask({ type: 'deepen', content: 'Task 1', describe: 'Desc 1' });
    });

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(result.current.tasks[0].status).toBe('completed');

    // Clear completed tasks
    act(() => {
      result.current.clearCompleted();
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it('should handle task progress updates', () => {
    const { result } = renderHook(() => useTaskManager());

    let taskId: string = '';
    act(() => {
      taskId = result.current.enqueueTask({
        type: 'deepen',
        content: 'Test task',
        describe: 'Test description'
      });
    });

    act(() => {
      result.current.updateTaskProgress(taskId, 50);
    });

    expect(result.current.getTaskStatus(taskId)?.progress).toBe(50);
  });

  it('should calculate priority correctly', () => {
    const { result } = renderHook(() => useTaskManager());

    let deepenTaskId: string = '';
    let nextTaskId: string = '';

    act(() => {
      deepenTaskId = result.current.enqueueTask({
        type: 'deepen',
        content: 'Deepen task',
        describe: 'Desc'
      });
      
      nextTaskId = result.current.enqueueTask({
        type: 'next',
        content: 'Next task',
        describe: 'Desc'
      });
    });

    const deepenTask = result.current.getTaskStatus(deepenTaskId);
    const nextTask = result.current.getTaskStatus(nextTaskId);

    // Deepen tasks should have higher priority
    expect(deepenTask?.priority).toBeGreaterThan(nextTask?.priority || 0);
  });
});