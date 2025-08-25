import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import OutputPanel from './OutputPanel';
import { savePromptTest } from '../utils/storage';

// Mock storage functions
jest.mock('../utils/storage', () => ({
  savePromptTest: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: () => 'test-id-123'
}));

// Mock JsonlRenderer component
jest.mock('./JsonlRenderer', () => ({
  JsonlRenderer: ({ content, enableHoverEffects, darkMode }: any) => (
    <div data-testid="jsonl-renderer">
      {content || 'No content'}
    </div>
  )
}));

describe('OutputPanel Component', () => {
  const defaultProps = {
    promptObject: 'Test object content',
    promptText: 'Test prompt text',
    promptResult: 'Test result content',
    isLoading: false,
    onGenerate: jest.fn(),
    selectedModel: 'openai/o4-mini',
    onSave: jest.fn(),
    darkMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.alert = jest.fn();
  });

  test('renders correctly with all props', () => {
    render(<OutputPanel {...defaultProps} />);
    
    expect(screen.getByText('处理结果')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /生成/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
  });

  test('disables generate button when loading', () => {
    render(<OutputPanel {...defaultProps} isLoading={true} />);
    
    const generateButton = screen.getByRole('button', { name: /生成中.../i });
    expect(generateButton).toBeDisabled();
  });

  test('disables generate button when promptObject or promptText is empty', () => {
    render(<OutputPanel {...defaultProps} promptObject="" />);
    
    const generateButton = screen.getByRole('button', { name: /生成/i });
    expect(generateButton).toBeDisabled();
  });

  test('disables save button when loading', () => {
    render(<OutputPanel {...defaultProps} isLoading={true} />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  test('disables save button when no promptResult', () => {
    render(<OutputPanel {...defaultProps} promptResult="" />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  test('calls onGenerate when generate button is clicked', () => {
    render(<OutputPanel {...defaultProps} />);
    
    const generateButton = screen.getByRole('button', { name: /生成/i });
    fireEvent.click(generateButton);
    
    expect(defaultProps.onGenerate).toHaveBeenCalledTimes(1);
  });

  test('calls savePromptTest and shows success message when save is clicked', () => {
    render(<OutputPanel {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    expect(savePromptTest).toHaveBeenCalledWith({
      id: 'test-id-123',
      promptObject: 'Test object content',
      promptText: 'Test prompt text',
      promptResult: 'Test result content',
      timestamp: expect.any(Number),
      modelName: 'openai/o4-mini'
    });
    expect(global.alert).toHaveBeenCalledWith('已保存测试结果！');
  });

  test('calls onSave callback when provided', () => {
    render(<OutputPanel {...defaultProps} />);
    
    const saveButton = screen.getByRole('button', { name: /保存/i });
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSave).toHaveBeenCalledWith({
      id: 'test-id-123',
      promptObject: 'Test object content',
      promptText: 'Test prompt text',
      promptResult: 'Test result content',
      timestamp: expect.any(Number),
      modelName: 'openai/o4-mini'
    });
  });

  test('renders loading indicator when isLoading is true', () => {
    render(<OutputPanel {...defaultProps} isLoading={true} />);
    
    expect(screen.getAllByText(/生成中/i).length).toBeGreaterThan(0);
  });

  test('renders JSONL content when format is detected', () => {
    const jsonlContent = '{"type":"p","content":"Test paragraph"}\n{"type":"h1","content":"Test header"}';
    render(<OutputPanel {...defaultProps} promptResult={jsonlContent} />);
    
    expect(screen.getByTestId('jsonl-renderer')).toBeInTheDocument();
  });

  test('renders markdown content when not JSONL format', () => {
    const markdownContent = '# Test Header\n\nThis is a test paragraph.';
    render(<OutputPanel {...defaultProps} promptResult={markdownContent} />);
    
    expect(screen.getByText(/Test Header/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a test paragraph/i)).toBeInTheDocument();
  });

  test('handles empty promptResult gracefully', () => {
    render(<OutputPanel {...defaultProps} promptResult="" />);
    
    expect(screen.getByText('暂无内容')).toBeInTheDocument();
  });
});