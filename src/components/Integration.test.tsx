import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { usePromptTest } from '../hooks/usePromptTest';
import { useUIState } from '../hooks/useUIState';
import { useModelSelection } from '../hooks/useModelSelection';
import '@testing-library/jest-dom';

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
    },
    key: (index: number) => Object.keys(store)[index] || null,
    length: Object.keys(store).length
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Test component that uses multiple hooks
/**
 * A React functional component that manages and displays prompt-related data and UI state.
 */
const TestIntegrationComponent: React.FC = () => {
  const { 
    promptObject, 
    setPromptObject, 
    promptText, 
    setPromptText, 
    resetPrompt, 
    loadPromptTest 
  } = usePromptTest();
  
  const { 
    leftSidebarOpen, 
    rightSidebarOpen, 
    toggleLeftSidebar, 
    toggleRightSidebar 
  } = useUIState();
  
  const { 
    selectedModel, 
    setSelectedModel, 
    availableModels 
  } = useModelSelection();

  return (
    <div>
      <div data-testid="prompt-object-value">{promptObject}</div>
      <div data-testid="prompt-text-value">{promptText}</div>
      <div data-testid="selected-model">{selectedModel}</div>
      <div data-testid="left-sidebar">{leftSidebarOpen ? 'open' : 'closed'}</div>
      <div data-testid="right-sidebar">{rightSidebarOpen ? 'open' : 'closed'}</div>
      
      <input 
        data-testid="prompt-object-input" 
        value={promptObject}
        onChange={(e) => setPromptObject(e.target.value)}
      />
      <input 
        data-testid="prompt-text-input" 
        value={promptText}
        onChange={(e) => setPromptText(e.target.value)}
      />
      
      <select 
        data-testid="model-selector"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
      >
        {availableModels.map(model => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
      
      <button data-testid="toggle-left" onClick={toggleLeftSidebar}>
        Toggle Left
      </button>
      <button data-testid="toggle-right" onClick={toggleRightSidebar}>
        Toggle Right
      </button>
      <button data-testid="reset" onClick={resetPrompt}>
        Reset
      </button>
      <button 
        data-testid="load-test" 
        onClick={() => loadPromptTest({
          id: 'test-id',
          promptObject: 'loaded object',
          promptText: 'loaded text',
          promptResult: 'loaded result',
          modelName: 'deepseek/deepseek-chat-v3-0324',
          timestamp: Date.now()
        })}
      >
        Load Test
      </button>
    </div>
  );
};

describe('Integration Tests - State Synchronization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should persist prompt state changes to localStorage', async () => {
    render(<TestIntegrationComponent />);

    const promptObjectInput = screen.getByTestId('prompt-object-input');
    const promptTextInput = screen.getByTestId('prompt-text-input');

    fireEvent.change(promptObjectInput, { target: { value: 'test object' } });
    fireEvent.change(promptTextInput, { target: { value: 'test prompt' } });

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_promptObject')).toBe('test object');
      expect(localStorage.getItem('promptTester_promptText')).toBe('test prompt');
    });

    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('test object');
    expect(screen.getByTestId('prompt-text-value')).toHaveTextContent('test prompt');
  });

  it('should synchronize UI state changes with localStorage', async () => {
    render(<TestIntegrationComponent />);

    const toggleLeft = screen.getByTestId('toggle-left');
    const toggleRight = screen.getByTestId('toggle-right');

    // Initial state should be open
    expect(screen.getByTestId('left-sidebar')).toHaveTextContent('open');
    expect(screen.getByTestId('right-sidebar')).toHaveTextContent('open');

    fireEvent.click(toggleLeft);
    fireEvent.click(toggleRight);

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_leftSidebarOpen')).toBe('false');
      expect(localStorage.getItem('promptTester_rightSidebarOpen')).toBe('false');
    });

    expect(screen.getByTestId('left-sidebar')).toHaveTextContent('closed');
    expect(screen.getByTestId('right-sidebar')).toHaveTextContent('closed');
  });

  it('should synchronize model selection with localStorage', async () => {
    render(<TestIntegrationComponent />);

    const modelSelector = screen.getByTestId('model-selector');

    fireEvent.change(modelSelector, { target: { value: 'deepseek/deepseek-chat-v3-0324' } });

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_selectedModel')).toBe('deepseek/deepseek-chat-v3-0324');
    });

    expect(screen.getByTestId('selected-model')).toHaveTextContent('deepseek/deepseek-chat-v3-0324');
  });

  it('should maintain state across component re-renders', () => {
    // Pre-populate localStorage
    localStorage.setItem('promptTester_promptObject', 'persisted object');
    localStorage.setItem('promptTester_promptText', 'persisted text');
    localStorage.setItem('promptTester_selectedModel', 'google/gemini-2.5-flash');
    localStorage.setItem('promptTester_leftSidebarOpen', 'false');

    const { rerender } = render(<TestIntegrationComponent />);

    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('persisted object');
    expect(screen.getByTestId('prompt-text-value')).toHaveTextContent('persisted text');
    expect(screen.getByTestId('selected-model')).toHaveTextContent('google/gemini-2.5-flash');
    expect(screen.getByTestId('left-sidebar')).toHaveTextContent('closed');

    // Re-render component
    rerender(<TestIntegrationComponent />);

    // State should persist
    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('persisted object');
    expect(screen.getByTestId('prompt-text-value')).toHaveTextContent('persisted text');
    expect(screen.getByTestId('selected-model')).toHaveTextContent('google/gemini-2.5-flash');
    expect(screen.getByTestId('left-sidebar')).toHaveTextContent('closed');
  });

  it('should reset prompt state and persist changes', async () => {
    render(<TestIntegrationComponent />);

    const promptObjectInput = screen.getByTestId('prompt-object-input');
    const promptTextInput = screen.getByTestId('prompt-text-input');
    const resetButton = screen.getByTestId('reset');

    // Set some values first
    fireEvent.change(promptObjectInput, { target: { value: 'initial object' } });
    fireEvent.change(promptTextInput, { target: { value: 'initial text' } });

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_promptObject')).toBe('initial object');
    });

    // Reset
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_promptObject')).toBe('');
      expect(localStorage.getItem('promptTester_promptText')).toBe('');
    });

    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('');
    expect(screen.getByTestId('prompt-text-value')).toHaveTextContent('');
  });

  it('should load prompt test data and persist to localStorage', async () => {
    render(<TestIntegrationComponent />);

    const loadTestButton = screen.getByTestId('load-test');

    fireEvent.click(loadTestButton);

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_promptObject')).toBe('loaded object');
      expect(localStorage.getItem('promptTester_promptText')).toBe('loaded text');
    });

    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('loaded object');
    expect(screen.getByTestId('prompt-text-value')).toHaveTextContent('loaded text');
  });

  it('should handle concurrent state updates correctly', async () => {
    render(<TestIntegrationComponent />);

    const promptObjectInput = screen.getByTestId('prompt-object-input');
    const toggleLeft = screen.getByTestId('toggle-left');
    const modelSelector = screen.getByTestId('model-selector');

    // Perform multiple state updates simultaneously
    fireEvent.change(promptObjectInput, { target: { value: 'concurrent object' } });
    fireEvent.click(toggleLeft);
    fireEvent.change(modelSelector, { target: { value: 'deepseek/deepseek-r1-0528' } });

    await waitFor(() => {
      expect(localStorage.getItem('promptTester_promptObject')).toBe('concurrent object');
      expect(localStorage.getItem('promptTester_leftSidebarOpen')).toBe('false');
      expect(localStorage.getItem('promptTester_selectedModel')).toBe('deepseek/deepseek-r1-0528');
    });

    expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('concurrent object');
    expect(screen.getByTestId('left-sidebar')).toHaveTextContent('closed');
    expect(screen.getByTestId('selected-model')).toHaveTextContent('deepseek/deepseek-r1-0528');
  });

  it('should handle localStorage errors gracefully during integration', async () => {
    const originalSetItem = localStorage.setItem;
    let shouldThrow = false;
    
    localStorage.setItem = jest.fn((key, value) => {
      if (shouldThrow) {
        throw new Error('Storage quota exceeded');
      }
      return originalSetItem.call(localStorage, key, value);
    });

    render(<TestIntegrationComponent />);

    const promptObjectInput = screen.getByTestId('prompt-object-input');
    
    // First update should work
    fireEvent.change(promptObjectInput, { target: { value: 'first value' } });
    
    await waitFor(() => {
      expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('first value');
    });

    // Enable error throwing
    shouldThrow = true;

    // Second update should still update UI even if localStorage fails
    fireEvent.change(promptObjectInput, { target: { value: 'second value' } });

    await waitFor(() => {
      expect(screen.getByTestId('prompt-object-value')).toHaveTextContent('second value');
    });

    localStorage.setItem = originalSetItem;
  });
});