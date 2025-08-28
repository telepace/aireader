import { renderHook, act } from '@testing-library/react';
import { useUIState } from './useUIState';

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

describe('useUIState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should initialize with default values (both sidebars open)', () => {
    const { result } = renderHook(() => useUIState());

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(true);
  });

  it('should initialize from localStorage when values are stored', () => {
    localStorage.setItem('promptTester_leftSidebarOpen', 'false');
    localStorage.setItem('promptTester_rightSidebarOpen', 'true');

    const { result } = renderHook(() => useUIState());

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(true);
  });

  it('should handle "false" string correctly for closed sidebars', () => {
    localStorage.setItem('promptTester_leftSidebarOpen', 'false');
    localStorage.setItem('promptTester_rightSidebarOpen', 'false');

    const { result } = renderHook(() => useUIState());

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(false);
  });

  it('should treat any non-"false" string as true', () => {
    localStorage.setItem('promptTester_leftSidebarOpen', 'true');
    localStorage.setItem('promptTester_rightSidebarOpen', 'anything');

    const { result } = renderHook(() => useUIState());

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(true);
  });

  it('should toggle left sidebar and persist to localStorage', () => {
    const { result } = renderHook(() => useUIState());

    // Initial state is true
    expect(result.current.leftSidebarOpen).toBe(true);

    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(localStorage.getItem('promptTester_leftSidebarOpen')).toBe('false');

    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(localStorage.getItem('promptTester_leftSidebarOpen')).toBe('true');
  });

  it('should toggle right sidebar and persist to localStorage', () => {
    const { result } = renderHook(() => useUIState());

    // Initial state is true
    expect(result.current.rightSidebarOpen).toBe(true);

    act(() => {
      result.current.toggleRightSidebar();
    });

    expect(result.current.rightSidebarOpen).toBe(false);
    expect(localStorage.getItem('promptTester_rightSidebarOpen')).toBe('false');

    act(() => {
      result.current.toggleRightSidebar();
    });

    expect(result.current.rightSidebarOpen).toBe(true);
    expect(localStorage.getItem('promptTester_rightSidebarOpen')).toBe('true');
  });

  it('should handle independent sidebar toggles', () => {
    const { result } = renderHook(() => useUIState());

    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(true);

    act(() => {
      result.current.toggleRightSidebar();
    });

    expect(result.current.leftSidebarOpen).toBe(false);
    expect(result.current.rightSidebarOpen).toBe(false);
  });

  it('should persist state changes through useEffect', async () => {
    const { result } = renderHook(() => useUIState());

    act(() => {
      result.current.toggleLeftSidebar();
      result.current.toggleRightSidebar();
    });

    // Wait for useEffect to run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(localStorage.getItem('promptTester_leftSidebarOpen')).toBe('false');
    expect(localStorage.getItem('promptTester_rightSidebarOpen')).toBe('false');
  });

  it('should handle localStorage errors gracefully during initialization', () => {
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = jest.fn(() => {
      throw new Error('Storage access denied');
    });

    // Should not throw error and should use default values
    const { result } = renderHook(() => useUIState());

    expect(result.current.leftSidebarOpen).toBe(true);
    expect(result.current.rightSidebarOpen).toBe(true);

    localStorage.getItem = originalGetItem;
  });

  it('should handle localStorage errors gracefully during state updates', () => {
    const { result } = renderHook(() => useUIState());

    const originalSetItem = localStorage.setItem;
    localStorage.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw error
    act(() => {
      result.current.toggleLeftSidebar();
    });

    expect(result.current.leftSidebarOpen).toBe(false);

    localStorage.setItem = originalSetItem;
  });
});