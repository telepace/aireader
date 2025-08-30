import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  timestamp: number;
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  onClick: () => void;
  color?: 'primary' | 'secondary' | 'error';
}

export interface NotificationConfig {
  maxVisible: number;
  defaultDuration: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

const DEFAULT_CONFIG: NotificationConfig = {
  maxVisible: 3,
  defaultDuration: 4000,
  position: 'top-right'
};

export const useNotification = (config: Partial<NotificationConfig> = {}) => {
  const finalConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // 移除通知
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // 添加通知
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = uuidv4();
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? finalConfig.defaultDuration
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // 限制最大显示数量
      return updated.slice(0, finalConfig.maxVisible);
    });

    // 自动移除
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [finalConfig, removeNotification]);

  // 清除所有通知
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // 便捷方法
  const showSuccess = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'success', title, message, actions });
  }, [addNotification]);

  const showError = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'error', title, message, actions, duration: 6000 });
  }, [addNotification]);

  const showInfo = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'info', title, message, actions });
  }, [addNotification]);

  const showWarning = useCallback((title: string, message?: string, actions?: NotificationAction[]) => {
    return addNotification({ type: 'warning', title, message, actions });
  }, [addNotification]);

  // 任务相关的便捷方法
  const showTaskComplete = useCallback((taskContent: string, resultId?: string) => {
    return showSuccess(
      '任务完成',
      `"${taskContent.slice(0, 50)}..." 已生成完成`,
      resultId ? [
        {
          label: '查看结果',
          onClick: () => {
            const element = document.getElementById(`message-${resultId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      ] : undefined
    );
  }, [showSuccess]);

  const showTaskFailed = useCallback((taskContent: string, error: string) => {
    return showError(
      '任务失败',
      `"${taskContent.slice(0, 30)}..." 处理失败: ${error}`,
      [
        {
          label: '重试',
          onClick: () => {
            // 这里可以触发重试逻辑
            console.log('Retry task:', taskContent);
          },
          color: 'primary'
        }
      ]
    );
  }, [showError]);

  const showTaskQueued = useCallback((taskContent: string, position: number) => {
    return showInfo(
      '任务已添加',
      `"${taskContent.slice(0, 30)}..." 已加入队列，排队位置: ${position}`,
      []
    );
  }, [showInfo]);

  const showConnectionError = useCallback(() => {
    return showError(
      '连接错误',
      '无法连接到服务器，请检查网络连接',
      [
        {
          label: '重试',
          onClick: () => {
            window.location.reload();
          },
          color: 'primary'
        }
      ]
    );
  }, [showError]);

  return {
    // 状态
    notifications,
    
    // 基础方法
    addNotification,
    removeNotification,
    clearAll,
    
    // 便捷方法
    showSuccess,
    showError,
    showInfo,
    showWarning,
    
    // 任务相关方法
    showTaskComplete,
    showTaskFailed,
    showTaskQueued,
    showConnectionError,
    
    // 配置
    config: finalConfig
  };
};

export default useNotification;