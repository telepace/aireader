import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the complex components to simplify testing
jest.mock('./components/InputPanel', () => () => <div data-testid="input-panel">Input Panel</div>);
jest.mock('./components/OutputPanel', () => () => <div data-testid="output-panel">Output Panel</div>);
jest.mock('./components/ChatPanel', () => () => <div data-testid="chat-panel">Chat Panel</div>);

test('renders app without crashing', () => {
  render(<App />);
  const appElement = screen.getByTestId('input-panel');
  expect(appElement).toBeInTheDocument();
});

test('renders main application title', () => {
  render(<App />);
  // Check for either Chinese or English title
  const title = screen.queryByText(/提示词测试工具|Prompt Tester/i);
  expect(title).toBeInTheDocument();
});
