import axios from 'axios';
import { generateChat, generateContentStream, generateChatStream } from './api';
import { ChatMessage } from '../types/types';

// Mock environment variables
process.env.REACT_APP_OPENROUTER_API_KEY = 'test-api-key';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock fetch for streaming tests
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock ReadableStream for streaming tests
class MockReadableStream {
  private chunks: string[];
  private index: number = 0;

  constructor(chunks: string[]) {
    this.chunks = chunks;
  }

  getReader() {
    return {
      read: async () => {
        if (this.index >= this.chunks.length) {
          return { done: true, value: undefined };
        }
        const chunk = new TextEncoder().encode(this.chunks[this.index++]);
        return { done: false, value: chunk };
      }
    };
  }
}

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('generateChat', () => {
    it('should send chat request successfully', async () => {
      const mockResponse = {
        data: {
          choices: [
            { message: { content: 'Test response' } }
          ]
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const messages = [
        { id: 'test-1', role: 'user' as const, content: 'Hello', timestamp: Date.now() }
      ];
      const model = 'openai/gpt-4';

      const result = await generateChat(messages, model);

      expect(result).toBe('Test response');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          model,
          messages: [{ role: 'user', content: 'Hello' }]
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should handle API errors', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const messages = [{ id: 'test-2', role: 'user' as const, content: 'Hello', timestamp: Date.now() }];
      const model = 'openai/gpt-4';

      await expect(generateChat(messages, model)).rejects.toThrow('Network error');
    });
  });

  describe('generateContentStream', () => {
    it('should handle streaming response successfully', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: new MockReadableStream(chunks)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const onChunkReceived = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateContentStream(
        'test object',
        'test prompt',
        'openai/gpt-4',
        onChunkReceived,
        onError,
        onComplete
      );

      expect(onChunkReceived).toHaveBeenCalledTimes(2);
      expect(onChunkReceived).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onChunkReceived).toHaveBeenNthCalledWith(2, ' world');
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle API errors in streaming', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error'
      });

      const onChunkReceived = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await expect(generateContentStream(
        'test object',
        'test prompt',
        'openai/gpt-4',
        onChunkReceived,
        onError,
        onComplete
      )).rejects.toThrow('API request failed with status 500');

      expect(onChunkReceived).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should handle null response body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        body: null
      });

      const onChunkReceived = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await expect(generateContentStream(
        'test object',
        'test prompt',
        'openai/gpt-4',
        onChunkReceived,
        onError,
        onComplete
      )).rejects.toThrow('Response body is null');
    });

    it('should handle malformed JSON in stream', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {invalid json}\n\n',
        'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: new MockReadableStream(chunks)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const onChunkReceived = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      // Should not throw, but should handle gracefully
      await generateContentStream(
        'test object',
        'test prompt',
        'openai/gpt-4',
        onChunkReceived,
        onError,
        onComplete
      );

      expect(onChunkReceived).toHaveBeenCalledTimes(2);
      expect(onChunkReceived).toHaveBeenNthCalledWith(1, 'Hello');
      expect(onChunkReceived).toHaveBeenNthCalledWith(2, ' world');
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateChatStream', () => {
    it('should handle chat streaming response successfully', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
        'data: {"choices":[{"delta":{"content":" there"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: new MockReadableStream(chunks)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Hello', timestamp: Date.now() }
      ];

      const onDelta = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateChatStream(
        messages,
        'openai/gpt-4',
        onDelta,
        onError,
        onComplete
      );

      expect(onDelta).toHaveBeenCalledTimes(2);
      expect(onDelta).toHaveBeenNthCalledWith(1, { content: 'Hello' });
      expect(onDelta).toHaveBeenNthCalledWith(2, { content: ' there' });
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle reasoning content in streaming', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"reasoning":"Thinking..."}}]}\n\n',
        'data: {"choices":[{"delta":{"content":"Answer"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: new MockReadableStream(chunks)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Question', timestamp: Date.now() }
      ];

      const onDelta = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateChatStream(
        messages,
        'deepseek/deepseek-r1',
        onDelta,
        onError,
        onComplete
      );

      expect(onDelta).toHaveBeenCalledTimes(2);
      expect(onDelta).toHaveBeenNthCalledWith(1, { reasoning: 'Thinking...' });
      expect(onDelta).toHaveBeenNthCalledWith(2, { content: 'Answer' });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle system messages correctly', async () => {
      const chunks = [
        'data: {"choices":[{"delta":{"content":"Response"}}]}\n\n',
        'data: [DONE]\n\n'
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        body: new MockReadableStream(chunks)
      };

      mockFetch.mockResolvedValue(mockResponse);

      const messages: ChatMessage[] = [
        { id: 'system-1', role: 'system', content: 'You are helpful', timestamp: Date.now() },
        { id: 'user-1', role: 'user', content: 'Hello', timestamp: Date.now() }
      ];

      const onDelta = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateChatStream(
        messages,
        'openai/gpt-4',
        onDelta,
        onError,
        onComplete
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          body: expect.stringContaining('"messages":[{"role":"system","content":"You are helpful"},{"role":"user","content":"Hello"}]')
        })
      );

      expect(onDelta).toHaveBeenCalledWith({ content: 'Response' });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle streaming errors with onError callback', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Hello', timestamp: Date.now() }
      ];

      const onDelta = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateChatStream(
        messages,
        'openai/gpt-4',
        onDelta,
        onError,
        onComplete
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('API request failed with status 401')
        })
      );
      expect(onDelta).not.toHaveBeenCalled();
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('should handle fetch network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const messages: ChatMessage[] = [
        { id: 'test-1', role: 'user', content: 'Hello', timestamp: Date.now() }
      ];

      const onDelta = jest.fn();
      const onError = jest.fn();
      const onComplete = jest.fn();

      await generateChatStream(
        messages,
        'openai/gpt-4',
        onDelta,
        onError,
        onComplete
      );

      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Network error'
        })
      );
    });
  });
});