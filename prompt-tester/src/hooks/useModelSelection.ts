import { useState, useEffect } from 'react';

const LOCAL_STORAGE_KEY = 'promptTester_selectedModel';

export const AVAILABLE_MODELS = [
  'openai/o4-mini',
  'openai/o3',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1-0528'
];

/**
 * Custom hook for managing model selection and persistence in local storage.
 */
export const useModelSelection = () => {
  const [selectedModel, setSelectedModel] = useState<string>(
    () => localStorage.getItem(LOCAL_STORAGE_KEY) || AVAILABLE_MODELS[0]
  );

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, selectedModel);
  }, [selectedModel]);

  return {
    selectedModel,
    setSelectedModel,
    availableModels: AVAILABLE_MODELS
  };
};