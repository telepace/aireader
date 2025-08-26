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
 * This function attempts to obtain the API key from the environment variables,
 * specifically looking for REACT_APP_OPENROUTER_API_KEY. If the key is not found
 * or is invalid (i.e., 'undefined' or 'null'), an error is thrown indicating
 * that the API key configuration needs to be checked.
 *
 * @param modelName - The name of the model for which the API key is being retrieved.
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
  
  // 3. 验证API密钥
  if (!apiKey || 
      apiKey === 'undefined' || 
      apiKey === 'null' || 
      apiKey === '__REACT_APP_OPENROUTER_API_KEY__') {
    
    console.error('API Key Debug Info:', {
      runtimeKey: (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY,
      buildTimeKey: process.env.REACT_APP_OPENROUTER_API_KEY,
      finalKey: apiKey
    });
    
    throw new Error('未找到API密钥。请检查:\n1. Railway环境变量REACT_APP_OPENROUTER_API_KEY是否已设置\n2. 是否需要重新部署以应用新的环境变量\n3. 本地开发时检查.env文件中的REACT_APP_OPENROUTER_API_KEY配置');
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

export const generateContent = async (
  promptObject: string,
  promptText: string,
  modelName: string
): Promise<string> => {
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
        max_tokens: 8192
      },
      {
        headers: {
          'Authorization': `Bearer ${getApiKey(modelName)}`,
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

export const generateContentStream = async (
  promptObject: string,
  promptText: string,
  modelName: string,
  onChunkReceived: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
  try {
    console.log('Initiating API request for streaming...');
    
    const apiUrl = `${BASE_API_URL}/chat/completions`;
    console.log('Streaming API URL:', apiUrl);
    
    const combinedText = `${promptText}\n\n${promptObject}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${getApiKey(modelName)}`,
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
        max_tokens: 8192,
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

export const generateChat = async (
  messages: ChatMessage[],
  modelName: string
): Promise<string> => {
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
          'Authorization': `Bearer ${getApiKey(modelName)}`,
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

export const generateChatStream = async (
  messages: ChatMessage[],
  modelName: string,
  onDelta: (delta: { content?: string; reasoning?: string }) => void,
  onError: (error: Error) => void,
  onComplete: () => void
): Promise<void> => {
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
        'Authorization': `Bearer ${getApiKey(modelName)}`,
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