import { useCallback, useRef, useEffect, useState } from 'react';

interface SwipeConfig {
  threshold?: number; // 触发滑动的最小距离
  velocity?: number;  // 触发滑动的最小速度
  preventScroll?: boolean; // 是否阻止默认滚动
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  isScrolling: boolean;
  direction: 'horizontal' | 'vertical' | null;
}

/**
 * 移动端流式滑动手势Hook
 * 
 * 特性：
 * 1. 高性能 - 使用RAF优化，避免频繁重渲染
 * 2. 智能识别 - 区分滚动和滑动手势
 * 3. 防误触 - 动态调整敏感度
 * 4. 平滑动画 - 内置缓动效果
 */
export const useSwipeGestures = (config: SwipeConfig) => {
  const {
    threshold = 50,
    velocity = 0.5,
    preventScroll = false,
    onSwipeUp,
    onSwipeDown,
    onSwipeLeft,
    onSwipeRight,
  } = config;

  const touchRef = useRef<TouchState | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);
  const rafId = useRef<number | null>(null);
  const [isActive, setIsActive] = useState(false);

  // 清理RAF
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    touchRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      isScrolling: false,
      direction: null,
    };

    setIsActive(true);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchRef.current) return;

    const touch = e.touches[0];
    if (!touch) return;

    const { startX, startY, direction } = touchRef.current;
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // 首次确定滑动方向
    if (!direction && (absDeltaX > 10 || absDeltaY > 10)) {
      touchRef.current.direction = absDeltaX > absDeltaY ? 'horizontal' : 'vertical';
      
      // 如果是垂直滑动且需要阻止滚动
      if (touchRef.current.direction === 'vertical' && preventScroll) {
        e.preventDefault();
      }
    }

    // 防止水平滑动时触发垂直滚动
    if (touchRef.current.direction === 'horizontal' && absDeltaX > absDeltaY) {
      e.preventDefault();
    }

    // 使用RAF优化性能
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }

    rafId.current = requestAnimationFrame(() => {
      // 这里可以添加实时反馈效果，如阻力感
      const element = elementRef.current;
      if (element && touchRef.current?.direction === 'vertical') {
        const resistance = Math.min(Math.abs(deltaY) / 200, 0.3);
        element.style.transform = `translateY(${deltaY * resistance}px)`;
      }
    });

  }, [preventScroll]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!touchRef.current) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const { startX, startY, startTime, direction } = touchRef.current;
    const endX = touch.clientX;
    const endY = touch.clientY;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const deltaTime = Date.now() - startTime;
    const velocityX = Math.abs(deltaX) / deltaTime;
    const velocityY = Math.abs(deltaY) / deltaTime;

    // 重置元素变换
    const element = elementRef.current;
    if (element) {
      element.style.transform = '';
      element.style.transition = 'transform 0.2s ease-out';
      
      // 清除过渡效果
      setTimeout(() => {
        if (element) {
          element.style.transition = '';
        }
      }, 200);
    }

    // 判断滑动手势
    const isValidSwipe = (delta: number, velocity: number) => 
      Math.abs(delta) > threshold && velocity > config.velocity!;

    if (direction === 'vertical') {
      if (deltaY < 0 && isValidSwipe(deltaY, velocityY) && onSwipeUp) {
        onSwipeUp();
      } else if (deltaY > 0 && isValidSwipe(deltaY, velocityY) && onSwipeDown) {
        onSwipeDown();
      }
    } else if (direction === 'horizontal') {
      if (deltaX < 0 && isValidSwipe(deltaX, velocityX) && onSwipeLeft) {
        onSwipeLeft();
      } else if (deltaX > 0 && isValidSwipe(deltaX, velocityX) && onSwipeRight) {
        onSwipeRight();
      }
    }

    touchRef.current = null;
    setIsActive(false);
  }, [threshold, velocity, onSwipeUp, onSwipeDown, onSwipeLeft, onSwipeRight, config.velocity]);

  // 绑定事件监听器
  const bindSwipeEvents = useCallback((element: HTMLElement) => {
    if (!element) return;

    elementRef.current = element;

    // 使用passive: false确保可以preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    bindSwipeEvents,
    isActive, // 是否正在进行滑动手势
    swipeDirection: touchRef.current?.direction || null
  };
};

/**
 * 消息列表专用的滑动Hook
 * 优化了聊天应用的特定需求
 */
export const useChatSwipeGestures = (config: {
  onPullToRefresh?: () => void;
  onSwipeToOptions?: () => void;
  containerRef?: React.RefObject<HTMLElement>;
}) => {
  const { onPullToRefresh, onSwipeToOptions, containerRef } = config;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const swipeConfig: SwipeConfig = {
    threshold: 60,
    velocity: 0.3,
    preventScroll: false, // 保持正常滚动
    onSwipeUp: onSwipeToOptions,
    onSwipeDown: () => {
      // 只在顶部时触发下拉刷新
      const container = containerRef?.current;
      if (container && container.scrollTop <= 0 && onPullToRefresh) {
        onPullToRefresh();
      }
    }
  };

  const { bindSwipeEvents, isActive, swipeDirection } = useSwipeGestures(swipeConfig);

  return {
    bindSwipeEvents,
    isActive,
    swipeDirection,
    isPulling,
    pullDistance
  };
};