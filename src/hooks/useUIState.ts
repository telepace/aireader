import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEYS = {
  LEFT_SIDEBAR_OPEN: 'promptTester_leftSidebarOpen',
  RIGHT_SIDEBAR_OPEN: 'promptTester_rightSidebarOpen'
};

export const useUIState = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN) !== 'false'
  );
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN) !== 'false'
  );

  // 持久化存储
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, String(rightSidebarOpen));
  }, [rightSidebarOpen]);

  const toggleLeftSidebar = () => setLeftSidebarOpen(!leftSidebarOpen);
  const toggleRightSidebar = () => setRightSidebarOpen(!rightSidebarOpen);

  return {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar
  };
};