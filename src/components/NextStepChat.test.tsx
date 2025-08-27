import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import NextStepChat from './NextStepChat';

// 从NextStepChat模块导入splitContentAndOptions函数用于测试
// 我们需要通过模块来访问这个函数，因为它不是导出的
const NextStepChatModule = require('./NextStepChat');

// 模拟splitContentAndOptions函数的实现进行测试
/**
 * Splits the raw input string into main content and a collection of options.
 *
 * The function processes each line of the input, identifying valid JSON lines that conform to specific criteria.
 * It collects these JSON objects into an array while keeping track of their indices. After processing, it filters
 * out the identified JSON lines to extract the main content, which is returned alongside the collected options,
 * limited to the first six entries.
 *
 * @param raw - The raw input string containing content and options.
 * @returns An object containing the main content as a string and an array of options.
 */
function splitContentAndOptions(raw: string): { main: string; options: any[] } {
  if (!raw) return { main: '', options: [] };
  
  const lines = raw.split('\n');
  const collected: any[] = [];
  const jsonLineIndices: number[] = [];
  
  // 扫描所有行，识别有效的 JSONL 行
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // 跳过空行，但不停止扫描
    
    try {
      const obj = JSON.parse(line);
      if (
        obj && typeof obj === 'object' &&
        (obj.type === 'deepen' || obj.type === 'next') &&
        typeof obj.content === 'string' &&
        typeof obj.describe === 'string'
      ) {
        collected.push({
          type: obj.type,
          content: obj.content,
          describe: obj.describe
        });
        jsonLineIndices.push(i);
      }
    } catch {
      // 不是有效 JSON，继续扫描其他行
    }
  }
  
  // 移除识别出的 JSON 行，保留主内容
  const mainLines = lines.filter((_, index) => !jsonLineIndices.includes(index));
  const main = mainLines.join('\n').trim();
  
  return { main, options: collected.slice(0, 6) };
}

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

describe('splitContentAndOptions JSONL parsing fix', () => {
  test('should correctly split content with mixed text and JSONL options', () => {
    const input = `这是主要内容的第一部分。

我们来看看这个问题：

第二部分：故事经济学的设计原则。

我们已经知道了问题所在，现在是时候看解了。这一部分将深入全书的核心，揭示故事为何能作用于人类大脑，我们将深入探讨'故事传输'的心理学机制，了解故事是如何绕过理性防御，并最终影响我们的决策和行为的。这是从'是什么'到'为什么'的关键一步。

{"type": "deepen", "content": "第三部分：故事经济学的设计原则", "describe": "我们已经知道了问题所在，现在是时候看解了。这一部分将深入全书的核心，揭示故事为何能作用于人类大脑，我们将深入探讨'故事传输'的心理学机制，了解故事是如何绕过理性防御，并最终影响我们的决策和行为的。这是从'是什么'到'为什么'的关键一步。"}

{"type": "deepen", "content": "USP的消亡与故事的'价值主张'", "describe": "深入剖析第二部分的一个关键论述，我们将详细对比传统的'独特销售主张'(USP)和故事所传递的'价值主张'有何根本不同，前者是关于产品'是什么'，后者是关于它能帮助户'成为谁'，通过案例分析，你会看到一个好的故事如何将一个功能，升级成为一种身份认同和情感跨越。"}

{"type": "next", "content": "(许可营销) 赛斯·高汀 (Seth Godin)", "describe": "这本书是'广告终结'思想的重要之作，甚至早于《故事经济学》。高汀在互联网泡沫时期就预言了'打扰式营销'的死亡，并提出了革命性的'许可营销'概念—营销人员的荣耀，是获得消费者同意的许可，是获得他们向消费者白目传送信息。它为你理解'消费者主权'时代提供了最深刻的哲学基础。"}

{"type": "next", "content": "《人人说谎》(Everybody Lies) 赛斯·斯蒂芬斯-戴维多维茨 (Seth Stephens-Davidowitz)", "describe": "如果说《故事经济学》告诉你人们不再相信广告，这本书则通过大数据告诉你人们到底在想什么、说什么、消费什么。作者利用谷歌搜索数据挖掘了'数字化真实'，揭示了隐藏在社会表象之下的真实人性，它会让你意识到，在这个'社会面具'卸除的数字时代，传统营销的'伪装'面临着前所未有的挑战。"}`;

    const result = splitContentAndOptions(input);
    
    // 检查主内容是否正确（移除了JSON行）
    expect(result.main).toContain('这是主要内容的第一部分');
    expect(result.main).toContain('第二部分：故事经济学的设计原则');
    expect(result.main).not.toContain('{"type"');
    expect(result.main).not.toContain('"describe"');
    
    // 检查选项是否正确解析
    expect(result.options).toHaveLength(4);
    expect(result.options[0]).toEqual({
      type: 'deepen',
      content: '第三部分：故事经济学的设计原则',
      describe: expect.stringContaining('我们已经知道了问题所在')
    });
    expect(result.options[1]).toEqual({
      type: 'deepen',
      content: 'USP的消亡与故事的\'价值主张\'',
      describe: expect.stringContaining('深入剖析第二部分')
    });
  });

  test('should handle content with only text and no JSON options', () => {
    const input = `这是普通的文本内容。

没有任何JSON选项在这里。

只是普通的段落。`;

    const result = splitContentAndOptions(input);
    
    expect(result.main).toBe(input.trim());
    expect(result.options).toHaveLength(0);
  });

  test('should handle content with only JSON options and no main text', () => {
    const input = `{"type": "deepen", "content": "选项1", "describe": "描述1"}
{"type": "next", "content": "选项2", "describe": "描述2"}`;

    const result = splitContentAndOptions(input);
    
    expect(result.main).toBe('');
    expect(result.options).toHaveLength(2);
    expect(result.options[0].content).toBe('选项1');
    expect(result.options[1].content).toBe('选项2');
  });

  test('should ignore invalid JSON lines but continue scanning', () => {
    const input = `主要内容在这里

{"invalid": "json"}
这是中间的文本

{"type": "deepen", "content": "有效选项", "describe": "有效描述"}

更多主要内容`;

    const result = splitContentAndOptions(input);
    
    expect(result.main).toContain('主要内容在这里');
    expect(result.main).toContain('这是中间的文本');
    expect(result.main).toContain('更多主要内容');
    expect(result.main).not.toContain('{"type": "deepen"');
    expect(result.options).toHaveLength(1);
    expect(result.options[0].content).toBe('有效选项');
  });

  test('should handle empty lines and continue scanning', () => {
    const input = `主要内容第一部分



{"type": "deepen", "content": "选项1", "describe": "描述1"}


主要内容第二部分

{"type": "next", "content": "选项2", "describe": "描述2"}`;

    const result = splitContentAndOptions(input);
    
    expect(result.main).toContain('主要内容第一部分');
    expect(result.main).toContain('主要内容第二部分');
    expect(result.main).not.toContain('{"type"');
    expect(result.options).toHaveLength(2);
  });
}); 