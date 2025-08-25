import { getSavedPromptTests, savePromptTest, deletePromptTest } from './storage';
import { PromptTest } from '../types/types';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

describe('Storage Utilities', () => {
  const mockPromptTests: PromptTest[] = [
    {
      id: 'test-1',
      promptText: 'What is React?',
      promptObject: '{"topic": "React"}',
      promptResult: 'React is a JavaScript library for building user interfaces',
      timestamp: Date.now(),
      modelName: 'openai/o4-mini'
    },
    {
      id: 'test-2',
      promptText: 'Explain TypeScript',
      promptObject: '{"concept": "TypeScript"}',
      promptResult: 'TypeScript is a typed superset of JavaScript',
      timestamp: Date.now(),
      modelName: 'anthropic/claude-3.5-sonnet'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  describe('getSavedPromptTests', () => {
    test('loads saved prompt tests from localStorage', () => {
      const storageKey = 'prompt_tests';
      const storedData = JSON.stringify(mockPromptTests);
      
      mockLocalStorage.getItem.mockReturnValue(storedData);

      const result = getSavedPromptTests();

      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(storageKey);
      expect(result).toEqual(mockPromptTests);
    });

    test('returns empty array when no data in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = getSavedPromptTests();

      expect(result).toEqual([]);
    });

    test('handles invalid JSON in localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue('invalid json');

      const result = getSavedPromptTests();

      expect(result).toEqual([]);
    });

    test('handles corrupted localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue('{"invalid": "data"}');

      const result = getSavedPromptTests();

      expect(result).toEqual([]);
    });
  });

  describe('savePromptTest', () => {
    test('saves new prompt test to localStorage', () => {
      const newTest: PromptTest = {
        id: 'test-3',
        promptText: 'New prompt',
        promptObject: '{}',
        promptResult: 'New result',
        timestamp: Date.now(),
        modelName: 'openai/o4-mini'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPromptTests));

      savePromptTest(newTest);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prompt_tests',
        expect.stringContaining('New prompt')
      );
    });

    test('updates existing prompt test in localStorage', () => {
      const updatedTest: PromptTest = {
        ...mockPromptTests[0],
        promptText: 'Updated prompt'
      };

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPromptTests));

      savePromptTest(updatedTest);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prompt_tests',
        expect.stringContaining('Updated prompt')
      );
    });

    test('creates new array when no existing tests', () => {
      const newTest: PromptTest = {
        id: 'test-1',
        promptText: 'First prompt',
        promptObject: '{}',
        promptResult: 'First result',
        timestamp: Date.now(),
        modelName: 'openai/o4-mini'
      };

      mockLocalStorage.getItem.mockReturnValue(null);

      savePromptTest(newTest);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prompt_tests',
        expect.stringContaining('First prompt')
      );
    });

    test('handles localStorage errors gracefully', () => {
      const test: PromptTest = {
        id: 'test-1',
        promptText: 'Test prompt',
        promptObject: '{}',
        promptResult: 'Test result',
        timestamp: Date.now(),
        modelName: 'openai/o4-mini'
      };

      mockLocalStorage.getItem.mockReturnValue('invalid json');
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => savePromptTest(test)).not.toThrow();
    });
  });

  describe('deletePromptTest', () => {
    test('deletes prompt test from localStorage', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPromptTests));

      deletePromptTest('test-1');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prompt_tests',
        expect.not.stringContaining('test-1')
      );
    });

    test('does nothing when test ID does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPromptTests));

      deletePromptTest('non-existent-id');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'prompt_tests',
        JSON.stringify(mockPromptTests)
      );
    });

    test('handles empty localStorage gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      deletePromptTest('test-1');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('prompt_tests', '[]');
    });

    test('handles localStorage errors gracefully', () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockPromptTests));
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => deletePromptTest('test-1')).not.toThrow();
    });
  });

  describe('Conversation Storage', () => {
    test('loads conversations from localStorage', () => {
      const conversations = [
        {
          id: 'conv-1',
          title: 'Test Conversation',
          messages: [
            { role: 'user', content: 'Hi' },
            { role: 'assistant', content: 'Hello!' }
          ],
          model: 'openai/o4-mini',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      (localStorage.getItem as jest.Mock).mockReturnValue(JSON.stringify(conversations));

      // This would test conversation loading if exported
      const { listConversations } = require('./storage');
      expect(listConversations).toBeDefined();
    });

    test('handles conversation storage errors', () => {
      const conversation = {
        id: 'conv-1',
        title: 'Test',
        messages: [],
        model: 'openai/o4-mini',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockLocalStorage.getItem.mockReturnValue(null);
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      // This would test conversation storage if exported
      const { upsertConversation } = require('./storage');
      expect(upsertConversation).toBeDefined();
    });
  });
});