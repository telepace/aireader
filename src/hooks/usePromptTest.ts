import { useState, useEffect } from 'react';
import { PromptTest } from '../types/types';

const LOCAL_STORAGE_KEYS = {
  PROMPT_OBJECT: 'promptTester_promptObject',
  PROMPT_TEXT: 'promptTester_promptText',
  SELECTED_MODEL: 'promptTester_selectedModel',
  LEFT_SIDEBAR_OPEN: 'promptTester_leftSidebarOpen',
  RIGHT_SIDEBAR_OPEN: 'promptTester_rightSidebarOpen',
  DARK_MODE: 'promptTester_darkMode'
};

export const usePromptTest = () => {
  const [promptObject, setPromptObject] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_KEYS.PROMPT_OBJECT) || '');
  const [promptText, setPromptText] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_KEYS.PROMPT_TEXT) || '');
  const [promptResult, setPromptResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPromptTest, setSelectedPromptTest] = useState<PromptTest | null>(null);

  // 持久化存储
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROMPT_OBJECT, promptObject);
  }, [promptObject]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROMPT_TEXT, promptText);
  }, [promptText]);

  const resetPrompt = () => {
    setPromptObject('');
    setPromptText('');
    setPromptResult('');
    setSelectedPromptTest(null);
  };

  const loadPromptTest = (test: PromptTest) => {
    setPromptObject(test.promptObject);
    setPromptText(test.promptText);
    setPromptResult(test.promptResult);
    setSelectedPromptTest(test);
  };

  return {
    promptObject,
    setPromptObject,
    promptText,
    setPromptText,
    promptResult,
    setPromptResult,
    isLoading,
    setIsLoading,
    selectedPromptTest,
    setSelectedPromptTest,
    resetPrompt,
    loadPromptTest
  };
};