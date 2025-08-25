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