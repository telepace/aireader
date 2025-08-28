import axios from 'axios';
import { ChatMessage } from '../types/types';
// We're not using these imports but just commenting them out
// import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerateContentStreamResult } from "@google/generative-ai";

// API 配置
const BASE_API_URL = 'https://openrouter.ai/api/v1';


// 从环境变量获取API密钥
/**
 * Retrieves the API key from various sources.
 *
 * This function attempts to obtain the API key by first checking runtime configurations, specifically looking for
 * REACT_APP_OPENROUTER_API_KEY in the window's ENV object. If not found, it falls back to the build-time environment
 * variable. The function validates the retrieved key and logs debug information if it is invalid or not set, allowing
 * the application to start normally while handling API call errors gracefully.
 *
 * @param modelName - The name of the model for which the API key is being retrieved.
 * @returns The retrieved API key as a string.
 */
const getApiKey = (modelName: string): string => {
  // 优先级：运行时配置 > 构建时环境变量
  let apiKey = '';
  
  // 1. 尝试从运行时配置获取 (Railway 部署时会替换占位符)
  const runtimeKey = (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY;
  if (runtimeKey && runtimeKey !== '__REACT_APP_OPENROUTER_API_KEY__') {
    apiKey = runtimeKey;
  }
  
  // 2. 如果运行时配置不可用，尝试构建时环境变量
  if (!apiKey) {
    apiKey = process.env.REACT_APP_OPENROUTER_API_KEY || '';
  }
  
  // 3. 验证API密钥 (非阻塞)
  if (!apiKey || 
      apiKey === 'undefined' || 
      apiKey === 'null' || 
      apiKey === '__REACT_APP_OPENROUTER_API_KEY__') {
    
    // ✅ 安全的调试信息 - 不暴露敏感数据
    console.warn('API Key Status:', {
      hasRuntimeKey: !!(window as any).ENV?.REACT_APP_OPENROUTER_API_KEY && 
                     (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY !== '__REACT_APP_OPENROUTER_API_KEY__',
      hasBuildTimeKey: !!process.env.REACT_APP_OPENROUTER_API_KEY,
      hasValidKey: !!apiKey && apiKey.length > 10,
      keySource: (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY && 
                 (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY !== '__REACT_APP_OPENROUTER_API_KEY__' 
                 ? 'runtime' : 'build-time',
      message: 'API密钥未配置，应用将正常启动但API调用将失败'
    });
    
    // Return empty string instead of throwing - let API calls handle the error
    return '';
  }
  
  return apiKey;
};

// 添加网站信息用于 OpenRouter 统计
const SITE_INFO = {
  referer: window.location.origin,
  title: 'Prompt Tester'
};

// Remove or comment out unused genAI initialization
// const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * Generate content based on a prompt using a specified model.
 *
 * This asynchronous function retrieves an API key based on the model name and constructs a request to the chat completions API using axios. It sends the prompt text and object as part of the request payload. The function processes the response to extract the generated content, throwing an error if the response structure is unexpected or if an error occurs during the API call.
 *
 * @param promptObject - A string representing the object to be included in the prompt.
 * @param promptText - A string containing the text of the prompt.
 * @param modelName - A string specifying the model to be used for content generation.
 * @returns A promise that resolves to the generated content as a string.
 * @throws Error If the API key is not found, the API response structure is unexpected, or if an error occurs during the API call.
 */
export const generateContent = async (
  promptObject: string,
  promptText: string,
  modelName: string
): Promise<string> => {
  const apiKey = getApiKey(modelName);
  if (!apiKey) {
    throw new Error('未找到API密钥。请检查:\n1. Railway环境变量REACT_APP_OPENROUTER_API_KEY是否已设置\n2. 是否需要重新部署以应用新的环境变量\n3. 本地开发时检查.env文件中的REACT_APP_OPENROUTER_API_KEY配置');
  }

  try {
    const apiUrl = `${BASE_API_URL}/chat/completions`;
    const response = await axios.post(
      apiUrl,
      {
        model: modelName,
        messages: [
          {
            role: "user",
            content: `${promptText}\n\n${promptObject}`
          }
        ],
        temperature: 0.7,
        max_tokens: 15000
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_INFO.referer,
          'X-Title': SITE_INFO.title,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
      return response.data.choices[0].message.content;
    } else {
      console.error('Unexpected API response structure:', response.data);
      throw new Error('Unexpected API response structure');
    }
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
};

/**
 * Generates a content stream by making an API request and processing the response in real-time.
 *
 * This function initiates a streaming API request using the provided promptObject and promptText. It retrieves the API key based on the modelName, constructs the request, and processes the response stream. Each chunk of content received is passed to the onChunkReceived callback, while errors trigger the onError callback. Upon successful completion of the stream, the onComplete callback is invoked.
 *
 * @param promptObject - The object containing the prompt details for the API request.
 * @param promptText - The text prompt to be sent to the API.
 * @param modelName - The name of the model to be used for the API request.
 * @param onChunkReceived - Callback function invoked for each chunk of content received from the stream.
 * @param onError - Callback function invoked when an error occurs during the streaming process.
 * @param onComplete - Callback function invoked when the streaming process is complete.
 * @returns A promise that resolves when the streaming process is complete.
 * @throws Error If the API request fails or if there is an issue with the response body.
 */
export const generateContentStream = async (
  promptObject: string,
  promptText: string,
  modelName: string,
  onChunkReceived: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
  const apiKey = getApiKey(modelName);
  if (!apiKey) {
    onError(new Error('未找到API密钥。请检查:\n1. Railway环境变量REACT_APP_OPENROUTER_API_KEY是否已设置\n2. 是否需要重新部署以应用新的环境变量\n3. 本地开发时检查.env文件中的REACT_APP_OPENROUTER_API_KEY配置'));
    return;
  }

  try {
    console.log('Initiating API request for streaming...');
    
    const apiUrl = `${BASE_API_URL}/chat/completions`;
    console.log('Streaming API URL:', apiUrl);
    
    const combinedText = `${promptText}\n\n${promptObject}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': SITE_INFO.referer,
        'X-Title': SITE_INFO.title,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "user",
            content: combinedText
          }
        ],
        temperature: 0.7,
        max_tokens: 15000,
        stream: true
      }),
    });

    console.log('API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response body:', errorText);
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    if (!response.body) {
        throw new Error('Response body is null');
    }
    
    console.log('Starting to read the stream...');
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = '';
    let chunkCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('Read complete, received chunks:', chunkCount);
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') {
            console.log('Stream complete signal received');
            continue;
          }
          
          try {
            const json = JSON.parse(data);
            
            if (json.choices && json.choices[0]?.delta?.content) {
              const content = json.choices[0].delta.content;
              chunkCount++;
              onChunkReceived(content);
            }
          } catch (e) {
            console.error('Error parsing SSE data chunk:', e);
          }
        }
      }
    }
    
    console.log('Stream processing complete, sending onComplete signal');
    onComplete();

  } catch (error) {
    console.error('Error in streaming process:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};

/**
 * Generate a chat response based on the provided messages and model name.
 *
 * This function retrieves the API key for the specified model, filters and formats the messages,
 * constructs a request payload, and sends a POST request to the chat completions API.
 * It handles various error scenarios, including API response structure validation and specific HTTP error codes.
 *
 * @param messages - An array of ChatMessage objects containing the chat messages.
 * @param modelName - The name of the model to be used for generating the chat response.
 * @returns A promise that resolves to the generated chat response as a string.
 * @throws Error If the API key is not found, the API response structure is unexpected,
 *               or specific HTTP error codes are encountered (e.g., rate limit exceeded, authentication failed).
 */
export const generateChat = async (
  messages: ChatMessage[],
  modelName: string
): Promise<string> => {
  const apiKey = getApiKey(modelName);
  if (!apiKey) {
    throw new Error('未找到API密钥。请检查:\n1. Railway环境变量REACT_APP_OPENROUTER_API_KEY是否已设置\n2. 是否需要重新部署以应用新的环境变量\n3. 本地开发时检查.env文件中的REACT_APP_OPENROUTER_API_KEY配置');
  }

  try {
    const apiMessages = messages
      .filter(msg => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role,
        content: msg.content
      }));
    
    const systemPrompt = messages.find(msg => msg.role === 'system');
    
    const requestPayload: any = { 
      model: modelName,
      messages: apiMessages
    };
    
    if (systemPrompt) {
      // OpenRouter 使用 OpenAI 标准，将 system 消息作为第一条加入消息列表
      requestPayload.messages.unshift({
        role: "system",
        content: systemPrompt.content
      });
    }

    const apiUrl = `${BASE_API_URL}/chat/completions`;
    const response = await axios.post(
      apiUrl, 
      requestPayload, 
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': SITE_INFO.referer,
          'X-Title': SITE_INFO.title,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices[0]?.message?.content) {
      return response.data.choices[0].message.content;
    } else {
      console.error('Unexpected API response structure:', response.data);
      throw new Error('Unexpected API response structure');
    }
  } catch (error: any) {
    console.error('Error in chat generation:', error);
    
    // Handle specific HTTP error codes
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message;
      
      if (status === 429) {
        throw new Error(`Rate limit exceeded: ${message}`);
      } else if (status === 401) {
        throw new Error(`Authentication failed: ${message}`);
      } else if (status === 404) {
        throw new Error(`Model not found: ${message}`);
      } else {
        throw new Error(`API Error: ${message}`);
      }
    }
    
    throw error;
  }
}; 

/**
 * Generates a chat stream by sending messages to a specified model and processing the response.
 *
 * The function retrieves the API key for the model, constructs a request payload with the messages,
 * and handles the streaming response from the API. It processes each chunk of data, extracting content
 * and reasoning, and invokes the appropriate callbacks for delta updates, errors, and completion.
 *
 * @param messages - An array of ChatMessage objects containing the messages to be sent.
 * @param modelName - The name of the model to be used for generating responses.
 * @param onDelta - A callback function that is called with the delta updates from the stream.
 * @param onError - A callback function that is called with an error if one occurs.
 * @param onComplete - A callback function that is called when the streaming is complete.
 * @returns A promise that resolves when the chat stream generation is complete.
 * @throws Error If the API key is not found, the API request fails, or the response body is null.
 */
export const generateChatStream = async (
  messages: ChatMessage[],
  modelName: string,
  onDelta: (delta: { content?: string; reasoning?: string }) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
  const apiKey = getApiKey(modelName);
  if (!apiKey) {
    onError(new Error('未找到API密钥。请检查:\n1. Railway环境变量REACT_APP_OPENROUTER_API_KEY是否已设置\n2. 是否需要重新部署以应用新的环境变量\n3. 本地开发时检查.env文件中的REACT_APP_OPENROUTER_API_KEY配置'));
    return;
  }

  try {
    const systemPrompt = messages.find(m => m.role === 'system');
    const apiMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));
    const requestPayload: any = {
      model: modelName,
      messages: apiMessages,
      stream: true,
    };
    if (systemPrompt) {
      requestPayload.messages.unshift({ role: 'system', content: systemPrompt.content });
    }

    const apiUrl = `${BASE_API_URL}/chat/completions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': SITE_INFO.referer,
        'X-Title': SITE_INFO.title,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      let lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        if (!line.startsWith('data: ')) continue;
        const data = line.substring(6);
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta || {};
          const content = delta.content;
          // support various vendor reasoning keys
          const reasoning = delta.reasoning || delta.reasoning_content || delta.thinking;
          if (content) onDelta({ content });
          if (reasoning) onDelta({ reasoning });
        } catch (e) {
          console.error('Error parsing SSE data chunk:', e);
        }
      }
    }

    onComplete();
  } catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}; 