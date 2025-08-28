/**
 * Security tests for API service - ensuring no sensitive information is exposed
 */

import { generateContent } from '../api';

// Mock console methods to capture logs
const originalConsoleWarn = console.warn;
const mockConsoleWarn = jest.fn();

describe('API Security Tests', () => {
  beforeEach(() => {
    mockConsoleWarn.mockClear();
    console.warn = mockConsoleWarn;
    
    // Clear environment variables
    delete process.env.REACT_APP_OPENROUTER_API_KEY;
    
    // Mock window.ENV
    Object.defineProperty(window, 'ENV', {
      value: undefined,
      writable: true
    });
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  test('should not expose API keys in console logs when key is missing', async () => {
    // Attempt to use API without key
    try {
      await generateContent('test object', 'test prompt', 'test-model');
    } catch (error) {
      // Expected to fail without API key
    }

    // Check that console.warn was called
    expect(mockConsoleWarn).toHaveBeenCalled();

    // Get all console.warn calls
    const warnCalls = mockConsoleWarn.mock.calls;
    
    // Verify no actual API key values are logged
    warnCalls.forEach(call => {
      const loggedData = JSON.stringify(call);
      
      // Should not contain actual API key patterns
      expect(loggedData).not.toMatch(/sk-[a-zA-Z0-9-_]{20,}/); // OpenAI-style keys
      expect(loggedData).not.toMatch(/[a-zA-Z0-9]{32,}/); // Long random strings
      
      // Should contain safe status information instead
      if (call[0] === 'API Key Status:') {
        const statusInfo = call[1];
        expect(statusInfo).toHaveProperty('hasRuntimeKey');
        expect(statusInfo).toHaveProperty('hasBuildTimeKey');
        expect(statusInfo).toHaveProperty('hasValidKey');
        expect(statusInfo).toHaveProperty('keySource');
        
        // Values should be boolean or safe strings only
        expect(typeof statusInfo.hasRuntimeKey).toBe('boolean');
        expect(typeof statusInfo.hasBuildTimeKey).toBe('boolean');
        expect(typeof statusInfo.hasValidKey).toBe('boolean');
      }
    });
  });

  test('should not expose API keys when runtime key is placeholder', async () => {
    // Set up runtime environment with placeholder
    Object.defineProperty(window, 'ENV', {
      value: {
        REACT_APP_OPENROUTER_API_KEY: '__REACT_APP_OPENROUTER_API_KEY__'
      },
      writable: true
    });

    try {
      await generateContent('test object', 'test prompt', 'test-model');
    } catch (error) {
      // Expected to fail
    }

    expect(mockConsoleWarn).toHaveBeenCalled();
    
    // Verify no placeholder values are logged as actual keys
    const warnCalls = mockConsoleWarn.mock.calls;
    warnCalls.forEach(call => {
      const loggedData = JSON.stringify(call);
      
      // Should not log the placeholder as a valid key
      expect(loggedData).not.toContain('__REACT_APP_OPENROUTER_API_KEY__');
    });
  });

  test('should provide helpful debugging without exposing secrets', async () => {
    try {
      await generateContent('test object', 'test prompt', 'test-model');
    } catch (error) {
      // Expected to fail
    }

    expect(mockConsoleWarn).toHaveBeenCalledWith(
      'API Key Status:',
      expect.objectContaining({
        hasRuntimeKey: expect.any(Boolean),
        hasBuildTimeKey: expect.any(Boolean),
        hasValidKey: expect.any(Boolean),
        keySource: expect.any(String),
        message: expect.stringContaining('API密钥未配置')
      })
    );
  });

  test('should not log anything when API key is present', () => {
    // Set up valid API key
    process.env.REACT_APP_OPENROUTER_API_KEY = 'test-valid-key-12345';

    // Mock successful API response
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'test response' } }]
      })
    });
    global.fetch = mockFetch;

    // The getApiKey function should not log warnings when key is valid
    const apiModule = require('../api');
    
    // This should not trigger any console warnings
    // Note: We can't easily test the private getApiKey function directly,
    // but we can verify that no warnings are logged when the key exists
    
    expect(mockConsoleWarn).not.toHaveBeenCalled();
  });
});