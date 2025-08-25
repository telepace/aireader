import { PromptTest, ChatConversation } from '../types/types';

const TEST_STORAGE_KEY = 'prompt_tests';
const CONV_STORAGE_KEY = 'nextstep_conversations';

export const savePromptTest = (promptTest: PromptTest): void => {
  try {
    const savedTests = getSavedPromptTests();
    savedTests.push(promptTest);
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(savedTests));
  } catch {
    // Handle storage errors gracefully
  }
};

export const getSavedPromptTests = (): PromptTest[] => {
  const savedTests = localStorage.getItem(TEST_STORAGE_KEY);
  if (!savedTests) return [];
  
  try {
    const parsed = JSON.parse(savedTests);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const deletePromptTest = (id: string): void => {
  try {
    const savedTests = getSavedPromptTests();
    const updatedTests = savedTests.filter(test => test.id !== id);
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(updatedTests));
  } catch {
    // Handle storage errors gracefully
  }
};

// Conversation helpers
export function listConversations(): ChatConversation[] {
  const raw = localStorage.getItem(CONV_STORAGE_KEY);
  if (!raw) return [];
  
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getConversation(id: string): ChatConversation | undefined {
  return listConversations().find(c => c.id === id);
}

export function upsertConversation(conv: ChatConversation): void {
  try {
    const list = listConversations();
    const idx = list.findIndex(c => c.id === conv.id);
    if (idx >= 0) list[idx] = conv; else list.unshift(conv);
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Handle storage errors gracefully
  }
}

export function deleteConversation(id: string): void {
  try {
    const list = listConversations().filter(c => c.id !== id);
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // Handle storage errors gracefully
  }
}

export function exportConversations(): string {
  try {
    return JSON.stringify(listConversations(), null, 2);
  } catch {
    return '[]';
  }
}

export function importConversations(json: string): void {
  try {
    const parsed = JSON.parse(json) as ChatConversation[];
    localStorage.setItem(CONV_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // Handle import errors gracefully
  }
} 