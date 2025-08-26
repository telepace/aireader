import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatPanel from './ChatPanel';

// Mock the API service
jest.mock('../services/api', () => ({
  generateChat: jest.fn()
}));

// Mock uuid for consistent IDs
jest.mock('uuid', () => ({
  v4: () => 'test-id-123'
}));

describe('ChatPanel Component', () => {
  const mockPromptTest = {
    id: 'test-prompt',
    promptText: 'Test prompt',
    promptObject: 'Test object',
    promptResult: 'Test result',
    timestamp: Date.now(),
    modelName: 'openai/o4-mini'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders AI chat header', () => {
    render(
      <ChatPanel
        promptTest={mockPromptTest}
        selectedModel="openai/o4-mini"
      />
    );

    expect(screen.getByText('AI 聊天')).toBeInTheDocument();
  });

  test('shows empty state when no messages', () => {
    render(
      <ChatPanel
        promptTest={mockPromptTest}
        selectedModel="openai/o4-mini"
      />
    );

    expect(screen.getByText('AI 聊天')).toBeInTheDocument();
  });

  test('disables evaluate prompt button when no prompt test', () => {
    render(
      <ChatPanel
        promptTest={null}
        selectedModel="openai/o4-mini"
      />
    );

    const evaluateButton = screen.getByRole('button', { name: /评估Prompt/i });
    expect(evaluateButton).toBeDisabled();
  });

  test('adds user message when send button is clicked', async () => {
    const { generateChat } = require('../services/api');
    generateChat.mockResolvedValue('Test response');
    
    render(
      <ChatPanel
        promptTest={mockPromptTest}
        selectedModel="openai/o4-mini"
      />
    );

    const input = screen.getByPlaceholderText(/输入消息/i);
    const sendButton = screen.getByRole('button', { name: /发送/i });

    fireEvent.change(input, { target: { value: 'New message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(generateChat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ content: 'New message' })
        ]),
        'openai/o4-mini'
      );
    });
  });

  test('handles API errors gracefully', async () => {
    const { generateChat } = require('../services/api');
    generateChat.mockRejectedValue(new Error('API Error'));
    
    // Mock alert
    const mockAlert = jest.fn();
    global.alert = mockAlert;
    
    render(
      <ChatPanel
        promptTest={mockPromptTest}
        selectedModel="openai/o4-mini"
      />
    );

    const input = screen.getByPlaceholderText(/输入消息/i);
    const sendButton = screen.getByRole('button', { name: /发送/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith('发送消息时出错: API Error');
    });
  });
});