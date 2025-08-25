import axios from 'axios';
import { generateChat } from './api';

// Mock environment variables
process.env.REACT_APP_OPENROUTER_API_KEY = 'test-api-key';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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