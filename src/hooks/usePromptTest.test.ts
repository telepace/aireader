import { renderHook, act } from '@testing-library/react';
import { usePromptTest } from './usePromptTest';
import { PromptTest } from '../types/types';

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('usePromptTest', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with empty values when no stored data', () => {
    const { result } = renderHook(() => usePromptTest());

    expect(result.current.promptObject).toBe('');
    expect(result.current.promptText).toBe('');
    expect(result.current.promptResult).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.selectedPromptTest).toBe(null);
  });

  it('should initialize with stored values from localStorage', () => {
    localStorage.setItem('promptTester_promptObject', 'test object');
    localStorage.setItem('promptTester_promptText', 'test prompt');

    const { result } = renderHook(() => usePromptTest());

    expect(result.current.promptObject).toBe('test object');
    expect(result.current.promptText).toBe('test prompt');
  });

  it('should update promptObject and persist to localStorage', () => {
    const { result } = renderHook(() => usePromptTest());

    act(() => {
      result.current.setPromptObject('new object');
    });

    expect(result.current.promptObject).toBe('new object');
    expect(localStorage.getItem('promptTester_promptObject')).toBe('new object');
  });

  it('should update promptText and persist to localStorage', () => {
    const { result } = renderHook(() => usePromptTest());

    act(() => {
      result.current.setPromptText('new prompt text');
    });

    expect(result.current.promptText).toBe('new prompt text');
    expect(localStorage.getItem('promptTester_promptText')).toBe('new prompt text');
  });

  it('should update promptResult without persisting', () => {
    const { result } = renderHook(() => usePromptTest());

    act(() => {
      result.current.setPromptResult('test result');
    });

    expect(result.current.promptResult).toBe('test result');
    // promptResult should not be persisted to localStorage
    expect(localStorage.getItem('promptTester_promptResult')).toBe(null);
  });

  it('should update loading state', () => {
    const { result } = renderHook(() => usePromptTest());

    act(() => {
      result.current.setIsLoading(true);
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      result.current.setIsLoading(false);
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should reset all prompt values', async () => {
    const { result } = renderHook(() => usePromptTest());

    // Set some initial values
    act(() => {
      result.current.setPromptObject('initial object');
      result.current.setPromptText('initial text');
      result.current.setPromptResult('initial result');
    });

    // Reset
    act(() => {
      result.current.resetPrompt();
    });

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.promptObject).toBe('');
    expect(result.current.promptText).toBe('');
    expect(result.current.promptResult).toBe('');
    expect(result.current.selectedPromptTest).toBe(null);
    expect(localStorage.getItem('promptTester_promptObject')).toBe(null);
    expect(localStorage.getItem('promptTester_promptText')).toBe(null);
  });

  it('should load prompt test data', () => {
    const { result } = renderHook(() => usePromptTest());

    const mockTest: PromptTest = {
      id: 'test-1',
      promptObject: 'test object',
      promptText: 'test prompt',
      promptResult: 'test result',
      modelName: 'test-model',
      timestamp: Date.now()
    };

    act(() => {
      result.current.loadPromptTest(mockTest);
    });

    expect(result.current.promptObject).toBe('test object');
    expect(result.current.promptText).toBe('test prompt');
    expect(result.current.promptResult).toBe('test result');
    expect(result.current.selectedPromptTest).toBe(mockTest);
    expect(localStorage.getItem('promptTester_promptObject')).toBe('test object');
    expect(localStorage.getItem('promptTester_promptText')).toBe('test prompt');
  });

  it('should persist multiple updates correctly', async () => {
    const { result } = renderHook(() => usePromptTest());

    // Multiple sequential updates
    act(() => {
      result.current.setPromptObject('first object');
    });
    
    act(() => {
      result.current.setPromptText('first text');
    });
    
    act(() => {
      result.current.setPromptObject('second object');
    });

    // Wait for all useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(localStorage.getItem('promptTester_promptObject')).toBe('second object');
    expect(localStorage.getItem('promptTester_promptText')).toBe('first text');
  });
});