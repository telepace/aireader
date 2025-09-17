import { useState, useEffect } from 'react';

/**
 * 检测移动端键盘高度的Hook
 * 
 * 解决的问题：
 * 1. iOS和Android键盘弹出时界面适配
 * 2. 确保输入框不被键盘遮挡
 * 3. 提供平滑的键盘动画过渡
 */
export const useKeyboardHeight = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleResize = () => {
      // 使用 visualViewport API 获得更准确的高度变化
      const newViewportHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - newViewportHeight;
      
      // 只有高度变化超过100px才认为是键盘弹出（避免误判）
      if (heightDifference > 100) {
        setKeyboardHeight(heightDifference);
        setIsKeyboardOpen(true);
      } else {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }
    };

    const handleViewportChange = () => {
      // 延迟处理以确保获得准确的高度
      setTimeout(handleResize, 150);
    };

    // 监听视口变化
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
    } else {
      // 降级方案：监听 window resize
      window.addEventListener('resize', handleViewportChange);
    }

    // 监听焦点事件作为补充
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // 给一点延迟让键盘完全弹出
        setTimeout(handleViewportChange, 300);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        setKeyboardHeight(0);
        setIsKeyboardOpen(false);
      }, 300);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
      } else {
        window.removeEventListener('resize', handleViewportChange);
      }
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
    // 计算可用高度（减去键盘高度）
    availableHeight: (window.visualViewport?.height || window.innerHeight) - keyboardHeight
  };
};