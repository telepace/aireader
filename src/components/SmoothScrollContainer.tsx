import React, { useRef, useEffect, useCallback, ReactNode } from 'react';
import { Box } from '@mui/material';

interface SmoothScrollContainerProps {
  children: ReactNode;
  className?: string;
  onScrollEnd?: () => void;
  enablePullToRefresh?: boolean;
  onPullToRefresh?: () => void;
  height?: string | number;
}

/**
 * 流畅滚动容器组件
 * 
 * 特性：
 * 1. 硬件加速 - 使用transform3d触发GPU加速
 * 2. 惯性滚动 - iOS风格的惯性滚动效果
 * 3. 弹性边界 - 滚动到边界时的弹性效果
 * 4. 性能优化 - 使用RAF和防抖优化
 * 5. 触控友好 - 适配各种触控设备
 */
const SmoothScrollContainer: React.FC<SmoothScrollContainerProps> = ({
  children,
  className,
  onScrollEnd,
  enablePullToRefresh = false,
  onPullToRefresh,
  height = '100%'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollState = useRef({
    isScrolling: false,
    startY: 0,
    lastY: 0,
    velocity: 0,
    amplitude: 0,
    target: 0,
    timeConstant: 325, // 惯性滚动时间常数
    rafId: 0
  });

  // 惯性滚动动画
  const autoScroll = useCallback(() => {
    const state = scrollState.current;
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    const elapsed = Date.now() - state.startY;
    const delta = -state.amplitude * Math.exp(-elapsed / state.timeConstant);

    if (delta > 0.5 || delta < -0.5) {
      scroll(state.target + delta);
      state.rafId = requestAnimationFrame(autoScroll);
    } else {
      scroll(state.target);
      if (onScrollEnd) {
        onScrollEnd();
      }
    }
  }, [onScrollEnd]);

  // 滚动函数
  const scroll = useCallback((y: number) => {
    const container = containerRef.current;
    const content = contentRef.current;
    
    if (!container || !content) return;

    const maxScroll = content.scrollHeight - container.clientHeight;
    let newY = Math.max(0, Math.min(y, maxScroll));

    // 弹性边界效果
    if (y < 0) {
      newY = y * 0.3; // 上边界阻力
    } else if (y > maxScroll) {
      newY = maxScroll + (y - maxScroll) * 0.3; // 下边界阻力
    }

    content.style.transform = `translate3d(0, ${-newY}px, 0)`;
    scrollState.current.lastY = newY;

    // 触发下拉刷新
    if (enablePullToRefresh && y < -80 && onPullToRefresh) {
      onPullToRefresh();
    }
  }, [enablePullToRefresh, onPullToRefresh]);

  // 触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const state = scrollState.current;
    const touch = e.touches[0];
    
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
    }

    state.isScrolling = true;
    state.startY = Date.now();
    state.lastY = state.target = scrollState.current.lastY;
    state.velocity = state.amplitude = 0;
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!scrollState.current.isScrolling) return;

    const state = scrollState.current;
    const touch = e.touches[0];
    const now = Date.now();
    const elapsed = now - state.startY;
    
    if (elapsed > 0) {
      const deltaY = state.lastY - touch.clientY;
      state.velocity = 0.8 * (1000 * deltaY / elapsed) + 0.2 * state.velocity;
    }

    scroll(state.lastY + touch.clientY - state.lastY);
    
    // 防止页面滚动
    e.preventDefault();
  }, [scroll]);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    const state = scrollState.current;
    
    if (!state.isScrolling) return;
    
    state.isScrolling = false;

    if (state.velocity > 10 || state.velocity < -10) {
      state.amplitude = 0.8 * state.velocity;
      state.target = Math.round(state.lastY + state.amplitude);
      state.startY = Date.now();
      state.rafId = requestAnimationFrame(autoScroll);
    }
  }, [autoScroll]);

  // 绑定事件
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 触控事件
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    // 滚轮事件兼容
    const handleWheel = (e: WheelEvent) => {
      const state = scrollState.current;
      scroll(state.lastY + e.deltaY);
      e.preventDefault();
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('wheel', handleWheel);
      
      if (scrollState.current.rafId) {
        cancelAnimationFrame(scrollState.current.rafId);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height,
        overflow: 'hidden',
        position: 'relative',
        // 启用硬件加速
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        // 优化触控
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
        touchAction: 'none',
        // 性能优化
        willChange: 'transform',
        contain: 'layout style paint'
      }}
    >
      <Box
        ref={contentRef}
        sx={{
          position: 'relative',
          // 启用硬件加速
          transform: 'translate3d(0, 0, 0)',
          WebkitTransform: 'translate3d(0, 0, 0)',
          transition: 'none',
          willChange: 'transform'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SmoothScrollContainer;