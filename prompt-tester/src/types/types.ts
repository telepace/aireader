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

export interface ChatConversation {
  id: string;
  messages: ChatMessage[];
  timestamp: number;
} 