export interface PromptTest {
  id: string;
  promptObject: string;
  promptText: string;
  promptResult: string;
  timestamp: number;
  modelName: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface OptionItem {
  type: 'deepen' | 'next';
  id: string;
  content: string;
  describe: string;
  firstSeenAt: number;
  lastSeenAt: number;
  lastMessageId: string;
  clickCount: number;
}

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  timestamp: number; // createdAt (legacy)
  // new optional fields for conversation management
  title?: string;
  updatedAt?: number;
  modelName?: string;
  options?: OptionItem[];
}

// Langfuse tracing interfaces
export interface UserSession {
  userId: string;
  sessionId: string;
  startTime: string;
}

export interface TracingContext {
  userId?: string;
  sessionId?: string;
  conversationId?: string;
} 