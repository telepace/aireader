import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SavedTests from './SavedTests';
import { PromptTest } from '../types/types';
import { getSavedPromptTests, deletePromptTest } from '../utils/storage';

// Mock storage functions
jest.mock('../utils/storage', () => ({
  getSavedPromptTests: jest.fn(),
  savePromptTest: jest.fn(),
  deletePromptTest: jest.fn()
}));

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn()
  }
});

const mockSavedTests: PromptTest[] = [
  {
    id: 'test-1',
    promptObject: 'React is a JavaScript library',
    promptText: 'What is React?',
    promptResult: 'React is a JavaScript library for building user interfaces',
    timestamp: new Date('2024-01-01').getTime(),
    modelName: 'openai/o4-mini'
  },
  {
    id: 'test-2',
    promptObject: 'TypeScript concepts',
    promptText: 'Explain TypeScript',
    promptResult: 'TypeScript is a typed superset of JavaScript',
    timestamp: new Date('2024-01-02').getTime(),
    modelName: 'anthropic/claude-3.5-sonnet'
  }
];

describe('SavedTests Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getSavedPromptTests as jest.Mock).mockReturnValue(mockSavedTests);
    window.confirm = jest.fn();
    window.alert = jest.fn();
  });

  test('renders saved tests correctly', () => {
    render(<SavedTests onSelectTest={jest.fn()} />);
    
    expect(screen.getByText('已保存的测试')).toBeInTheDocument();
    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('Explain TypeScript')).toBeInTheDocument();
  });

  test('handles empty saved tests list', () => {
    (getSavedPromptTests as jest.Mock).mockReturnValue([]);
    render(<SavedTests onSelectTest={jest.fn()} />);

    expect(screen.getByText(/暂无保存的测试/i)).toBeInTheDocument();
  });

  test('displays test information correctly', () => {
    render(<SavedTests onSelectTest={jest.fn()} />);

    expect(screen.getByText('What is React?')).toBeInTheDocument();
    expect(screen.getByText('Explain TypeScript')).toBeInTheDocument();
  });
});