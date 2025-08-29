import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEYS = {
  LEFT_SIDEBAR_OPEN: 'promptTester_leftSidebarOpen',
  RIGHT_SIDEBAR_OPEN: 'promptTester_rightSidebarOpen'
};

const getStorageValue = (key: string, defaultValue: boolean): boolean => {
  try {
    const value = localStorage.getItem(key);
    return value !== 'false';
  } catch (error) {
    console.warn(`Failed to read localStorage key ${key}:`, error);
    return defaultValue;
  }
};

const setStorageValue = (key: string, value: boolean): void => {
  try {
    localStorage.setItem(key, String(value));
  } catch (error) {
    console.warn(`Failed to write to localStorage key ${key}:`, error);
  }
};

export const useUIState = () => {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => 
    getStorageValue(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, true)
  );
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => 
    getStorageValue(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, true)
  );

  // 持久化存储
  useEffect(() => {
    setStorageValue(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, leftSidebarOpen);
  }, [leftSidebarOpen]);

  useEffect(() => {
    setStorageValue(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, rightSidebarOpen);
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