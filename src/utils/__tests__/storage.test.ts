/**
 * Tests for storage utilities
 */

import {
  savePromptTest,
  getSavedPromptTests,
  deletePromptTest,
  listConversations,
  getConversation,
  upsertConversation,
  deleteConversation,
  exportConversations,
  importConversations,
} from '../storage';

import { PromptTest, ChatConversation } from '../../types/types';

// Mock PromptTest and ChatConversation data
const mockPromptTest: PromptTest = {
  id: 'test-1',
  promptObject: 'Write a story about a robot',
  promptText: 'Write a story about a robot',
  promptResult: 'Once upon a time...',
  timestamp: Date.now(),
  modelName: 'openai/o3-mini',
};

const mockConversation: ChatConversation = {
  id: 'conv-1',
  messages: [
    { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
    { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
  ],
  timestamp: Date.now(),
  title: 'Test Chat',
  updatedAt: Date.now(),
};

describe('Storage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('PromptTest storage', () => {
    test('saves prompt test to localStorage', () => {
      savePromptTest(mockPromptTest);
      
      const tests = getSavedPromptTests();
      expect(tests).toHaveLength(1);
      expect(tests[0]).toEqual(mockPromptTest);
    });

    test('retrieves empty array when no tests saved', () => {
      const tests = getSavedPromptTests();
      expect(tests).toEqual([]);
    });

    test('handles multiple prompt tests', () => {
      const test2: PromptTest = { ...mockPromptTest, id: 'test-2' };
      
      savePromptTest(mockPromptTest);
      savePromptTest(test2);
      
      const tests = getSavedPromptTests();
      expect(tests).toHaveLength(2);
      expect(tests[0]).toEqual(mockPromptTest);
      expect(tests[1]).toEqual(test2);
    });

    test('deletes prompt test by id', () => {
      const test2: PromptTest = { ...mockPromptTest, id: 'test-2' };
      
      savePromptTest(mockPromptTest);
      savePromptTest(test2);
      
      deletePromptTest('test-1');
      
      const tests = getSavedPromptTests();
      expect(tests).toHaveLength(1);
      expect(tests[0].id).toBe('test-2');
    });

    test('handles invalid JSON gracefully', () => {
      localStorage.setItem('prompt_tests', 'invalid json');
      
      const tests = getSavedPromptTests();
      expect(tests).toEqual([]);
    });

    test('handles localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => savePromptTest(mockPromptTest)).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('Conversation storage', () => {
    test('lists empty conversations when none saved', () => {
      const conversations = listConversations();
      expect(conversations).toEqual([]);
    });

    test('upserts new conversation', () => {
      upsertConversation(mockConversation);
      
      const conversations = listConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0]).toEqual(mockConversation);
    });

    test('updates existing conversation', () => {
      upsertConversation(mockConversation);
      
      const updatedConv: ChatConversation = {
        ...mockConversation,
        title: 'Updated Name',
      };
      
      upsertConversation(updatedConv);
      
      const conversations = listConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].title).toBe('Updated Name');
    });

    test('adds new conversation to beginning of list', () => {
      const conv2: ChatConversation = { ...mockConversation, id: 'conv-2', title: 'Conv 2' };
      
      upsertConversation(mockConversation);
      upsertConversation(conv2);
      
      const conversations = listConversations();
      expect(conversations).toHaveLength(2);
      expect(conversations[0].id).toBe('conv-2'); // Most recent first
      expect(conversations[1].id).toBe('conv-1');
    });

    test('gets conversation by id', () => {
      upsertConversation(mockConversation);
      
      const conversation = getConversation('conv-1');
      expect(conversation).toEqual(mockConversation);
    });

    test('returns undefined for non-existent conversation', () => {
      const conversation = getConversation('non-existent');
      expect(conversation).toBeUndefined();
    });

    test('deletes conversation by id', () => {
      const conv2: ChatConversation = { ...mockConversation, id: 'conv-2', title: 'Conv 2' };
      
      upsertConversation(mockConversation);
      upsertConversation(conv2);
      
      deleteConversation('conv-1');
      
      const conversations = listConversations();
      expect(conversations).toHaveLength(1);
      expect(conversations[0].id).toBe('conv-2');
    });

    test('handles invalid conversation JSON gracefully', () => {
      localStorage.setItem('nextstep_conversations', 'invalid json');
      
      const conversations = listConversations();
      expect(conversations).toEqual([]);
    });

    test('handles localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      expect(() => upsertConversation(mockConversation)).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('Export/Import functionality', () => {
    test('exports conversations as JSON string', () => {
      upsertConversation(mockConversation);
      
      const exported = exportConversations();
      const parsed = JSON.parse(exported);
      
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(mockConversation);
    });

    test('exports empty array when no conversations', () => {
      const exported = exportConversations();
      expect(exported).toBe('[]');
    });

    test('imports conversations from JSON string', () => {
      const conversations = [mockConversation];
      const jsonString = JSON.stringify(conversations);
      
      importConversations(jsonString);
      
      const imported = listConversations();
      expect(imported).toEqual(conversations);
    });

    test('handles export errors gracefully', () => {
      const originalStringify = JSON.stringify;
      JSON.stringify = jest.fn(() => {
        throw new Error('Stringify error');
      });

      const exported = exportConversations();
      expect(exported).toBe('[]');

      JSON.stringify = originalStringify;
    });

    test('handles import errors gracefully', () => {
      expect(() => importConversations('invalid json')).not.toThrow();
    });

    test('handles import localStorage errors gracefully', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = jest.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const validJson = JSON.stringify([mockConversation]);
      expect(() => importConversations(validJson)).not.toThrow();

      localStorage.setItem = originalSetItem;
    });
  });

  describe('Integration scenarios', () => {
    test('complete workflow with prompt tests and conversations', () => {
      // Save prompt test
      savePromptTest(mockPromptTest);
      
      // Save conversation
      upsertConversation(mockConversation);
      
      // Verify both are stored
      expect(getSavedPromptTests()).toHaveLength(1);
      expect(listConversations()).toHaveLength(1);
      
      // Export conversations
      const exported = exportConversations();
      
      // Clear all data
      localStorage.clear();
      expect(getSavedPromptTests()).toHaveLength(0);
      expect(listConversations()).toHaveLength(0);
      
      // Import conversations back
      importConversations(exported);
      expect(listConversations()).toHaveLength(1);
      expect(getSavedPromptTests()).toHaveLength(0); // Prompt tests not restored
    });

    test('handles mixed valid and invalid data', () => {
      // Save valid data
      savePromptTest(mockPromptTest);
      upsertConversation(mockConversation);
      
      // Corrupt conversation data
      localStorage.setItem('nextstep_conversations', 'invalid json');
      
      // Should still work for prompt tests
      expect(getSavedPromptTests()).toHaveLength(1);
      expect(listConversations()).toEqual([]); // Returns empty array for invalid data
    });
  });

  describe('Edge cases', () => {
    test('handles non-array data in localStorage', () => {
      localStorage.setItem('prompt_tests', '{"not": "array"}');
      localStorage.setItem('nextstep_conversations', '{"not": "array"}');
      
      expect(getSavedPromptTests()).toEqual([]);
      expect(listConversations()).toEqual([]);
    });

    test('handles null localStorage values', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = jest.fn(() => null);

      expect(getSavedPromptTests()).toEqual([]);
      expect(listConversations()).toEqual([]);

      localStorage.getItem = originalGetItem;
    });

    test('handles empty string localStorage values', () => {
      localStorage.setItem('prompt_tests', '');
      localStorage.setItem('nextstep_conversations', '');
      
      expect(getSavedPromptTests()).toEqual([]);
      expect(listConversations()).toEqual([]);
    });
  });
});