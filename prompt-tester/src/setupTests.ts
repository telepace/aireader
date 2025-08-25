// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

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
