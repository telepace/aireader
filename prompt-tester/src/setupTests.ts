// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock react-markdown to a simple passthrough to avoid ESM transform issues in CRA jest env
jest.mock('react-markdown', () => ({ __esModule: true, default: (props: any) => {
  const React = require('react');
  return React.createElement('div', props, props.children);
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
