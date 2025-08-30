import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the complex components to simplify testing
jest.mock('./components/NextStepChat', () => () => <div data-testid="next-step-chat">Next Step Chat</div>);
jest.mock('./components/ConcurrentTestPanel', () => () => <div data-testid="concurrent-test-panel">Concurrent Test Panel</div>);
jest.mock('./components/Layout/AppHeader', () => () => <div data-testid="app-header">App Header</div>);

// Mock auth store
jest.mock('./stores/authStore', () => ({
  useAuthStore: () => ({
    initializeAuth: jest.fn(),
    isInitialized: true
  })
}));

// Mock API functions
jest.mock('./services/api-with-tracing', () => ({
  createUserSession: jest.fn(() => ({ userId: 'test-user' })),
  flushTraces: jest.fn()
}));

test('renders app without crashing', () => {
  render(<App />);
  const chatElement = screen.getByTestId('next-step-chat');
  expect(chatElement).toBeInTheDocument();
});

test('renders app header', () => {
  render(<App />);
  const headerElement = screen.getByTestId('app-header');
  expect(headerElement).toBeInTheDocument();
});
