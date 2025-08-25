import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InputPanel from './InputPanel';

describe('InputPanel Component', () => {
  const defaultProps = {
    promptObject: 'Test object',
    promptText: 'Test prompt',
    onPromptObjectChange: jest.fn(),
    onPromptTextChange: jest.fn(),
    darkMode: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly with all props', () => {
    render(<InputPanel {...defaultProps} />);
    
    expect(screen.getByText('处理对象框')).toBeInTheDocument();
    expect(screen.getByText('Prompt框')).toBeInTheDocument();
  });

  test('displays current prompt object value', () => {
    render(<InputPanel {...defaultProps} />);
    
    const objectTextarea = screen.getAllByRole('textbox')[0];
    expect(objectTextarea).toHaveValue('Test object');
  });

  test('displays current prompt text value', () => {
    render(<InputPanel {...defaultProps} />);
    
    const textTextarea = screen.getAllByRole('textbox')[1];
    expect(textTextarea).toHaveValue('Test prompt');
  });

  test('calls onPromptObjectChange when object textarea changes', () => {
    render(<InputPanel {...defaultProps} />);
    
    const objectTextarea = screen.getAllByRole('textbox')[0];
    fireEvent.change(objectTextarea, { target: { value: 'New object' } });
    
    expect(defaultProps.onPromptObjectChange).toHaveBeenCalledWith('New object');
  });

  test('calls onPromptTextChange when text textarea changes', () => {
    render(<InputPanel {...defaultProps} />);
    
    const textTextarea = screen.getAllByRole('textbox')[1];
    fireEvent.change(textTextarea, { target: { value: 'New prompt text' } });
    
    expect(defaultProps.onPromptTextChange).toHaveBeenCalledWith('New prompt text');
  });

  test('handles empty values', () => {
    const emptyProps = {
      ...defaultProps,
      promptObject: '',
      promptText: ''
    };
    
    render(<InputPanel {...emptyProps} />);
    
    const textareas = screen.getAllByRole('textbox');
    expect(textareas[0]).toHaveValue('');
    expect(textareas[1]).toHaveValue('');
  });
});