import { renderHook, act } from '@testing-library/react';
import { useModelSelection, AVAILABLE_MODELS } from './useModelSelection';

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

describe('useModelSelection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with first available model when no stored data', () => {
    const { result } = renderHook(() => useModelSelection());

    expect(result.current.selectedModel).toBe(AVAILABLE_MODELS[0]);
    expect(result.current.availableModels).toBe(AVAILABLE_MODELS);
  });

  it('should initialize with stored model from localStorage', () => {
    const storedModel = 'deepseek/deepseek-chat-v3-0324';
    localStorage.setItem('promptTester_selectedModel', storedModel);

    const { result } = renderHook(() => useModelSelection());

    expect(result.current.selectedModel).toBe(storedModel);
  });

  it('should return all available models', () => {
    const { result } = renderHook(() => useModelSelection());

    expect(result.current.availableModels).toEqual([
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'deepseek/deepseek-chat-v3-0324',
      'deepseek/deepseek-r1-0528'
    ]);
    expect(result.current.availableModels.length).toBe(4);
  });

  it('should update selected model and persist to localStorage', () => {
    const { result } = renderHook(() => useModelSelection());
    const newModel = 'google/gemini-2.5-flash';

    act(() => {
      result.current.setSelectedModel(newModel);
    });

    expect(result.current.selectedModel).toBe(newModel);
    expect(localStorage.getItem('promptTester_selectedModel')).toBe(newModel);
  });

  it('should allow selecting any model from available models', () => {
    const { result } = renderHook(() => useModelSelection());

    AVAILABLE_MODELS.forEach(model => {
      act(() => {
        result.current.setSelectedModel(model);
      });

      expect(result.current.selectedModel).toBe(model);
      expect(localStorage.getItem('promptTester_selectedModel')).toBe(model);
    });
  });

  it('should persist state changes through useEffect', async () => {
    const { result } = renderHook(() => useModelSelection());
    const targetModel = 'deepseek/deepseek-r1-0528';

    act(() => {
      result.current.setSelectedModel(targetModel);
    });

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(localStorage.getItem('promptTester_selectedModel')).toBe(targetModel);
  });

  it('should handle localStorage errors gracefully during initialization', () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error('Storage access denied');
    });

    // Should not throw error and should use default value
    const { result } = renderHook(() => useModelSelection());

    expect(result.current.selectedModel).toBe(AVAILABLE_MODELS[0]);

    localStorage.getItem = originalGetItem;
  });

  it('should handle localStorage errors gracefully during model updates', () => {
    const { result } = renderHook(() => useModelSelection());

    const targetModel = 'google/gemini-2.5-flash';
    
    // First set the model normally
    act(() => {
      result.current.setSelectedModel(targetModel);
    });

    // Then mock localStorage to throw errors for subsequent calls
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    const nextModel = 'deepseek/deepseek-chat-v3-0324';

    // Should not throw error
    act(() => {
      result.current.setSelectedModel(nextModel);
    });

    expect(result.current.selectedModel).toBe(nextModel);

    localStorage.setItem = originalSetItem;
  });

  it('should handle empty or null localStorage values', () => {
    localStorage.setItem('promptTester_selectedModel', '');

    const { result } = renderHook(() => useModelSelection());

    expect(result.current.selectedModel).toBe(AVAILABLE_MODELS[0]);

    localStorage.removeItem('promptTester_selectedModel');

    const { result: result2 } = renderHook(() => useModelSelection());

    expect(result2.current.selectedModel).toBe(AVAILABLE_MODELS[0]);
  });

  it('should maintain model consistency across re-renders', () => {
    const { result, rerender } = renderHook(() => useModelSelection());
    const targetModel = 'deepseek/deepseek-chat-v3-0324';

    act(() => {
      result.current.setSelectedModel(targetModel);
    });

    rerender();

    expect(result.current.selectedModel).toBe(targetModel);
  });
});