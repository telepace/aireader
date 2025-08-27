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
jest.mock('../services/api-with-tracing', () => ({
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
