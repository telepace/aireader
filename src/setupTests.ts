// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock langfuse (ESM) to avoid ESM issues in Jest env
jest.mock('langfuse', () => {
  const mockTrace = {
    generation: jest.fn(() => ({})),
    span: jest.fn(() => ({})),
    update: jest.fn(),
  };
  const MockLangfuse = function(this: any) {
    return {
      trace: jest.fn(() => mockTrace),
      event: jest.fn(() => ({})),
      flushAsync: jest.fn(async () => undefined),
    } as any;
  } as unknown as { new(...args: any[]): any };
  return { __esModule: true, Langfuse: MockLangfuse };
});

// Mock api-with-tracing with a minimal implementation for tests
jest.mock('./services/api-with-tracing', () => ({
  __esModule: true,
  generateChatStream: async (
    messages: any,
    modelName: string,
    onDelta: (d: { content?: string; reasoning?: string }) => void,
    onError: (e: Error) => void,
    onComplete: () => void
  ) => {
    try {
      onDelta({ reasoning: '推理片段' });
      onDelta({ content: '助手回复' });
      onComplete();
    } catch (e) {
      onError(e as Error);
    }
  },
  generateChat: async (messages: any, modelName: string, conversationId?: string, userId?: string) => {
    // 检查是否是概念图谱相关的调用
    const isConceptMapCall = messages.some((msg: any) => 
      msg.content && typeof msg.content === 'string' && 
      (msg.content.includes('思维导图') || msg.content.includes('概念图谱') || msg.content.includes('递归思维导图'))
    );
    
    if (isConceptMapCall) {
      // 返回树状结构格式
      const mockTreeResponse = JSON.stringify({
        id: "test-tree-root",
        name: "测试概念图谱",
        children: [
          {
            id: "test-node-1",
            name: "层叠文本概念：过去与现在的融合",
            children: [
              {
                id: "test-node-1-1", 
                name: "历史层次：古老传统的积淀",
                children: []
              },
              {
                id: "test-node-1-2",
                name: "现代层次：全球化的冲击与融合", 
                children: []
              }
            ]
          },
          {
            id: "test-node-2",
            name: "文化交织：多元身份的复合表达",
            children: []
          }
        ]
      });
      return mockTreeResponse;
    } else {
      // 返回原有的扁平格式（向后兼容）
      const mockResponse = JSON.stringify({
        nodes: [
          {
            id: 'concept-1',
            text: '测试概念',
            category: 'core',
            description: '这是一个测试概念'
          }
        ],
        relationships: [],
        metadata: {
          totalConcepts: 1,
          processingTime: 100
        }
      });
      return mockResponse;
    }
  },
  logUserEvent: jest.fn(),
  createUserSession: jest.fn(() => ({ userId: 'test-user', sessionId: 'test-session', startTime: new Date().toISOString() })),
  flushTraces: jest.fn(async () => undefined),
}));

// Mock react-markdown to a simple passthrough to avoid ESM transform issues in CRA jest env
jest.mock('react-markdown', () => ({ __esModule: true, default: ({ children, ...props }: any) => {
  const React = require('react');
  // Filter out plugin props to prevent DOM warnings
  const { rehypePlugins, remarkPlugins, components, ...cleanProps } = props;
  return React.createElement('div', cleanProps, children);
}}));

// Provide a default mock for rehype/remark plugins
jest.mock('rehype-raw', () => ({}));
jest.mock('remark-gfm', () => ({}));
jest.mock('remark-breaks', () => ({}));

// Mock axios (ESM) with a minimal CJS-compatible stub
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(async () => ({ data: { choices: [{ message: { content: 'mocked content' } }] } })),
  },
}));

// Mock scrollIntoView for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock TextEncoder for JSDOM
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
  global.TextDecoder = require('util').TextDecoder;
}

// Mock alert for tests
global.alert = jest.fn();

// Mock deprecated .j2 file imports for Jest (no longer used)
// These mocks are kept for backward compatibility during migration