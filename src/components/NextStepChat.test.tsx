import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NextStepChat from './NextStepChat';

// Mock uuid to deterministic ids
jest.mock('uuid', () => {
  let mockCounter = 0;
  return {
    v4: () => `id-${++mockCounter}`,
  };
});

// Mock streaming API: append one delta then complete
jest.mock('../services/api', () => ({
  generateChatStream: async (
    messages: any,
    modelName: string,
    onDelta: (d: { content?: string; reasoning?: string }) => void,
    onError: (e: Error) => void,
    onComplete: () => void
  ) => {
    // simulate small stream
    onDelta({ reasoning: '推理片段' });
    onDelta({ content: '助手回复' });
    onComplete();
  },
}));

describe('NextStepChat conversation persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saves conversation with messages to LocalStorage after sending', async () => {
    render(<NextStepChat selectedModel="openai/o4-mini" />);

    const input = screen.getByPlaceholderText('输入你的问题，获取答案与下一步探索方向...');
    fireEvent.change(input, { target: { value: '你好' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await screen.findByText('助手回复');

    const raw = localStorage.getItem('nextstep_conversations');
    expect(raw).toBeTruthy();
    const list = JSON.parse(String(raw));
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const first = list[0];
    expect(first.messages.length).toBeGreaterThanOrEqual(2); // user + assistant
    expect(first.messages[0].role).toBe('user');
    expect(first.messages[first.messages.length - 1].role).toBe('assistant');
    expect(first.messages[first.messages.length - 1].content).toContain('助手回复');
  });

  test('creates new conversation and lists multiple sessions in menu', async () => {
    render(<NextStepChat selectedModel="openai/o4-mini" />);

    const input = screen.getByPlaceholderText('输入你的问题，获取答案与下一步探索方向...');
    fireEvent.change(input, { target: { value: '第一轮问题' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    await screen.findByText('助手回复');

    // open menu and create new conversation
    const menuBtn = screen.getByRole('button', { name: '会话' });
    fireEvent.click(menuBtn);
    const newBtn = await screen.findByRole('button', { name: '新建会话' });
    fireEvent.click(newBtn);

    // send in new conversation
    const input2 = screen.getByPlaceholderText('输入你的问题，获取答案与下一步探索方向...');
    fireEvent.change(input2, { target: { value: '第二轮问题' } });
    fireEvent.keyDown(input2, { key: 'Enter', code: 'Enter' });
    await screen.findAllByText('助手回复');

    // reopen menu and assert two sessions are present by their titles/snippets
    fireEvent.click(menuBtn);
    const menuContainer = await screen.findByTestId('conv-menu');
    expect(within(menuContainer).getByRole('button', { name: /第一轮问题/i })).toBeInTheDocument();
    expect(within(menuContainer).getByRole('button', { name: /第二轮问题/i })).toBeInTheDocument();
  });
}); 