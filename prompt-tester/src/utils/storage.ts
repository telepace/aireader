import { PromptTest } from '../types/types';

const STORAGE_KEY = 'prompt_tests';

export const savePromptTest = (promptTest: PromptTest): void => {
  const savedTests = getSavedPromptTests();
  savedTests.push(promptTest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTests));
};

export const getSavedPromptTests = (): PromptTest[] => {
  const savedTests = localStorage.getItem(STORAGE_KEY);
  return savedTests ? JSON.parse(savedTests) : [];
};

export const deletePromptTest = (id: string): void => {
  const savedTests = getSavedPromptTests();
  const updatedTests = savedTests.filter(test => test.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTests));
}; 