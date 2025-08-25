import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEYS = {
  LEFT_SIDEBAR_OPEN: 'promptTester_leftSidebarOpen',
  RIGHT_SIDEBAR_OPEN: 'promptTester_rightSidebarOpen',
  DARK_MODE: 'promptTester_darkMode'
};

export const useUIState = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN) !== 'false'
  );
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN) !== 'false'
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.DARK_MODE) === 'true'
  );

  // 持久化存储
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, String(rightSidebarOpen));
  }, [rightSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DARK_MODE, String(darkMode));
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleLeftSidebar = () => setLeftSidebarOpen(!leftSidebarOpen);
  const toggleRightSidebar = () => setRightSidebarOpen(!rightSidebarOpen);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  return {
    leftSidebarOpen,
    rightSidebarOpen,
    darkMode,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleDarkMode
  };
};