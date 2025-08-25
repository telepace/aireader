import { PromptTest, ChatConversation } from '../types/types';

const TEST_STORAGE_KEY = 'prompt_tests';
const CONV_STORAGE_KEY = 'nextstep_conversations';

export const savePromptTest = (promptTest: PromptTest): void => {
  const savedTests = getSavedPromptTests();
  savedTests.push(promptTest);
  localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(savedTests));
};

export const getSavedPromptTests = (): PromptTest[] => {
  const savedTests = localStorage.getItem(TEST_STORAGE_KEY);
  return savedTests ? JSON.parse(savedTests) : [];
};

export const deletePromptTest = (id: string): void => {
  const savedTests = getSavedPromptTests();
  const updatedTests = savedTests.filter(test => test.id !== id);
  localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(updatedTests));
};

// Conversation helpers
export function listConversations(): ChatConversation[] {
  const raw = localStorage.getItem(CONV_STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getConversation(id: string): ChatConversation | undefined {
  return listConversations().find(c => c.id === id);
}

export function upsertConversation(conv: ChatConversation): void {
  const list = listConversations();
  const idx = list.findIndex(c => c.id === conv.id);
  if (idx >= 0) list[idx] = conv; else list.unshift(conv);
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(list));
}

export function deleteConversation(id: string): void {
  const list = listConversations().filter(c => c.id !== id);
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(list));
}

export function exportConversations(): string {
  return JSON.stringify(listConversations(), null, 2);
}

export function importConversations(json: string): void {
  const parsed = JSON.parse(json) as ChatConversation[];
  localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(parsed));
} 