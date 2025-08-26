import { ChatMessage } from '../types/types';
import { langfuseService } from './langfuse';
import * as originalApi from './api';

/**
 * Enhanced API service with Langfuse tracing
 * Wraps original API functions to add observability while maintaining backward compatibility
 */

/**
 * Generate content with Langfuse tracing
 */
export const generateContent = async (
  promptObject: string,
  promptText: string,
  modelName: string,
  userId?: string
): Promise<string> => {
  // Create trace if Langfuse is enabled
  const trace = langfuseService.createPromptTestTrace(
    promptObject,
    promptText,
    modelName,
    userId
  );

  try {
    // Add preprocessing span
    const preprocessSpan = langfuseService.addSpan(
      trace,
      'input-preprocessing',
      { promptObject, promptText },
      { combinedInput: `${promptText}\n\n${promptObject}` },
      { step: 'preprocessing' }
    );

    // Call original API
    const startTime = Date.now();
    const result = await originalApi.generateContent(promptObject, promptText, modelName);
    const endTime = Date.now();

    // Add generation to trace
    langfuseService.addGeneration(
      trace,
      {
        promptObject,
        promptText,
        combinedInput: `${promptText}\n\n${promptObject}`
      },
      result,
      modelName,
      {
        responseTime: endTime - startTime,
        outputLength: result.length,
        success: true
      }
    );

    // Update trace with final output
    langfuseService.updateTrace(trace, {
      output: { result, responseTime: endTime - startTime },
      metadata: { success: true, outputLength: result.length }
    });

    return result;
  } catch (error) {
    // Log error to trace
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      }
    });

    // Re-throw the error to maintain original behavior
    throw error;
  }
};

/**
 * Generate content stream with Langfuse tracing
 */
export const generateContentStream = async (
  promptObject: string,
  promptText: string,
  modelName: string,
  onChunkReceived: (chunk: string) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
  userId?: string
): Promise<void> => {
  // Create trace for streaming
  const trace = langfuseService.createPromptTestTrace(
    promptObject,
    promptText,
    modelName,
    userId
  );

  let fullResponse = '';
  let chunkCount = 0;
  const startTime = Date.now();

  // Wrap callbacks to collect metrics
  const wrappedOnChunkReceived = (chunk: string) => {
    fullResponse += chunk;
    chunkCount++;
    onChunkReceived(chunk);
  };

  const wrappedOnError = (error: Error) => {
    const endTime = Date.now();
    
    // Update trace with error
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error.message,
        responseTime: endTime - startTime,
        chunksReceived: chunkCount,
        partialResponse: fullResponse.substring(0, 500) // First 500 chars
      }
    });

    onError(error);
  };

  const wrappedOnComplete = () => {
    const endTime = Date.now();
    
    // Add generation to trace
    langfuseService.addGeneration(
      trace,
      {
        promptObject,
        promptText,
        combinedInput: `${promptText}\n\n${promptObject}`
      },
      fullResponse,
      modelName,
      {
        responseTime: endTime - startTime,
        chunksReceived: chunkCount,
        outputLength: fullResponse.length,
        isStreaming: true,
        success: true
      }
    );

    // Update trace with final output
    langfuseService.updateTrace(trace, {
      output: { 
        result: fullResponse, 
        responseTime: endTime - startTime,
        chunksReceived: chunkCount
      },
      metadata: { 
        success: true, 
        outputLength: fullResponse.length,
        isStreaming: true
      }
    });

    onComplete();
  };

  try {
    // Add preprocessing span
    langfuseService.addSpan(
      trace,
      'streaming-preprocessing',
      { promptObject, promptText },
      { combinedInput: `${promptText}\n\n${promptObject}` },
      { step: 'preprocessing', isStreaming: true }
    );

    // Call original streaming API with wrapped callbacks
    await originalApi.generateContentStream(
      promptObject,
      promptText,
      modelName,
      wrappedOnChunkReceived,
      wrappedOnError,
      wrappedOnComplete
    );
  } catch (error) {
    const endTime = Date.now();
    
    // Update trace with error
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        responseTime: endTime - startTime
      }
    });

    throw error;
  }
};

/**
 * Generate chat response with Langfuse tracing
 */
export const generateChat = async (
  messages: ChatMessage[],
  modelName: string,
  conversationId?: string,
  userId?: string
): Promise<string> => {
  // Create trace for chat
  const trace = langfuseService.createChatTrace(
    messages,
    modelName,
    conversationId,
    userId
  );

  try {
    // Add preprocessing span
    const preprocessSpan = langfuseService.addSpan(
      trace,
      'chat-preprocessing',
      { messages: messages.map(m => ({ role: m.role, content: m.content })) },
      { messageCount: messages.length },
      { step: 'preprocessing', conversationId }
    );

    // Call original API
    const startTime = Date.now();
    const result = await originalApi.generateChat(messages, modelName);
    const endTime = Date.now();

    // Add generation to trace
    langfuseService.addGeneration(
      trace,
      messages.map(m => ({ role: m.role, content: m.content })),
      result,
      modelName,
      {
        responseTime: endTime - startTime,
        outputLength: result.length,
        inputMessages: messages.length,
        conversationId,
        success: true
      }
    );

    // Update trace with final output
    langfuseService.updateTrace(trace, {
      output: { 
        result, 
        responseTime: endTime - startTime,
        conversationId 
      },
      metadata: { 
        success: true, 
        outputLength: result.length,
        inputMessages: messages.length
      }
    });

    return result;
  } catch (error) {
    // Log error to trace
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        conversationId 
      }
    });

    throw error;
  }
};

/**
 * Generate chat stream with Langfuse tracing
 */
export const generateChatStream = async (
  messages: ChatMessage[],
  modelName: string,
  onDelta: (delta: { content?: string; reasoning?: string }) => void,
  onError: (error: Error) => void,
  onComplete: () => void,
  conversationId?: string,
  userId?: string
): Promise<void> => {
  // Create trace for streaming chat
  const trace = langfuseService.createChatTrace(
    messages,
    modelName,
    conversationId,
    userId
  );

  let fullContent = '';
  let fullReasoning = '';
  let deltaCount = 0;
  const startTime = Date.now();

  // Wrap callbacks to collect metrics
  const wrappedOnDelta = (delta: { content?: string; reasoning?: string }) => {
    if (delta.content) {
      fullContent += delta.content;
    }
    if (delta.reasoning) {
      fullReasoning += delta.reasoning;
    }
    deltaCount++;
    onDelta(delta);
  };

  const wrappedOnError = (error: Error) => {
    const endTime = Date.now();
    
    // Update trace with error
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error.message,
        responseTime: endTime - startTime,
        deltasReceived: deltaCount,
        partialContent: fullContent.substring(0, 500),
        partialReasoning: fullReasoning.substring(0, 200),
        conversationId
      }
    });

    onError(error);
  };

  const wrappedOnComplete = () => {
    const endTime = Date.now();
    
    // Add generation to trace
    langfuseService.addGeneration(
      trace,
      messages.map(m => ({ role: m.role, content: m.content })),
      fullContent + (fullReasoning ? `\n\nReasoning: ${fullReasoning}` : ''),
      modelName,
      {
        responseTime: endTime - startTime,
        deltasReceived: deltaCount,
        outputLength: fullContent.length,
        reasoningLength: fullReasoning.length,
        inputMessages: messages.length,
        conversationId,
        isStreaming: true,
        success: true
      }
    );

    // Update trace with final output
    langfuseService.updateTrace(trace, {
      output: { 
        content: fullContent,
        reasoning: fullReasoning,
        responseTime: endTime - startTime,
        deltasReceived: deltaCount,
        conversationId
      },
      metadata: { 
        success: true, 
        outputLength: fullContent.length,
        reasoningLength: fullReasoning.length,
        inputMessages: messages.length,
        isStreaming: true
      }
    });

    onComplete();
  };

  try {
    // Add preprocessing span
    langfuseService.addSpan(
      trace,
      'chat-streaming-preprocessing',
      { messages: messages.map(m => ({ role: m.role, content: m.content })) },
      { messageCount: messages.length, conversationId },
      { step: 'preprocessing', isStreaming: true }
    );

    // Call original streaming API with wrapped callbacks
    await originalApi.generateChatStream(
      messages,
      modelName,
      wrappedOnDelta,
      wrappedOnError,
      wrappedOnComplete
    );
  } catch (error) {
    const endTime = Date.now();
    
    // Update trace with error
    langfuseService.updateTrace(trace, {
      metadata: { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        responseTime: endTime - startTime,
        conversationId
      }
    });

    throw error;
  }
};

/**
 * Log a custom event for user interactions
 */
export const logUserEvent = (
  eventName: string,
  data: any = {},
  userId?: string
) => {
  langfuseService.logEvent(
    eventName,
    data,
    undefined,
    {
      userId,
      timestamp: new Date().toISOString(),
      source: 'user-interaction'
    }
  );
};

/**
 * Create a user session for tracking
 */
export const createUserSession = (userId?: string) => {
  const sessionUserId = userId || `anonymous_${Date.now()}`;
  return langfuseService.createUserSession(sessionUserId);
};

/**
 * Flush pending traces (call before page unload)
 */
export const flushTraces = () => {
  return langfuseService.flush();
};