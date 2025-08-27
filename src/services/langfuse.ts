import { Langfuse } from 'langfuse';
import { ChatMessage } from '../types/types';

// Langfuse configuration interface
interface LangfuseConfig {
  secretKey?: string;
  publicKey?: string;
  baseUrl?: string;
}

// Langfuse service wrapper for LLM observability and tracing
class LangfuseService {
  private static instance: LangfuseService;
  private langfuse: Langfuse | null = null;
  private isEnabled: boolean = false;
  private config: LangfuseConfig = {};

  private constructor() {
    this.initializeLangfuse();
  }

  static getInstance(): LangfuseService {
    if (!LangfuseService.instance) {
      LangfuseService.instance = new LangfuseService();
    }
    return LangfuseService.instance;
  }

  /**
   * Initialize Langfuse with configuration from environment variables
   */
  private initializeLangfuse(): void {
    try {
      // Get configuration from runtime environment or build-time variables
      this.config = this.getLangfuseConfig();
      
      // Only initialize if all required config is present
      if (this.config.secretKey && this.config.publicKey && this.config.baseUrl) {
        this.langfuse = new Langfuse({
          secretKey: this.config.secretKey,
          publicKey: this.config.publicKey,
          baseUrl: this.config.baseUrl,
        });
        
        this.isEnabled = true;
        console.log('🔍 Langfuse initialized successfully');
      } else {
        console.warn('⚠️ Langfuse configuration incomplete - tracing disabled');
        this.isEnabled = false;
      }
    } catch (error) {
      console.error('❌ Failed to initialize Langfuse:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Get Langfuse configuration from environment variables
   */
  private getLangfuseConfig(): LangfuseConfig {
    // Priority: Runtime config > Build-time environment variables
    let secretKey = '';
    let publicKey = '';
    let baseUrl = '';

    // Try runtime configuration first (Railway deployment)
    const runtimeEnv = (window as any).ENV;
    if (runtimeEnv) {
      secretKey = runtimeEnv.REACT_APP_LANGFUSE_SECRET_KEY;
      publicKey = runtimeEnv.REACT_APP_LANGFUSE_PUBLIC_KEY;
      baseUrl = runtimeEnv.REACT_APP_LANGFUSE_BASE_URL;
    }

    // Fallback to build-time environment variables
    if (!secretKey || secretKey === '__REACT_APP_LANGFUSE_SECRET_KEY__') {
      secretKey = process.env.REACT_APP_LANGFUSE_SECRET_KEY || '';
    }
    if (!publicKey || publicKey === '__REACT_APP_LANGFUSE_PUBLIC_KEY__') {
      publicKey = process.env.REACT_APP_LANGFUSE_PUBLIC_KEY || '';
    }
    if (!baseUrl || baseUrl === '__REACT_APP_LANGFUSE_BASE_URL__') {
      baseUrl = process.env.REACT_APP_LANGFUSE_BASE_URL || '';
    }

    return { secretKey, publicKey, baseUrl };
  }

  /**
   * Check if Langfuse is enabled and properly configured
   */
  isLangfuseEnabled(): boolean {
    return this.isEnabled && this.langfuse !== null;
  }

  // Removed createPromptTestTrace - was creating too many empty traces
  // Only chat conversations need traces for meaningful observability

  /**
   * Create a new trace for chat conversation
   */
  createChatTrace(
    messages: ChatMessage[],
    modelName: string,
    conversationId?: string,
    userId?: string
  ) {
    if (!this.isLangfuseEnabled()) return null;

    try {
      const trace = this.langfuse!.trace({
        name: 'chat-conversation',
        input: {
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          messageCount: messages.length
        },
        metadata: {
          model: modelName,
          conversationId,
          userId,
          type: 'chat',
          timestamp: new Date().toISOString()
        }
      });

      return trace;
    } catch (error) {
      console.error('Failed to create chat trace:', error);
      return null;
    }
  }

  /**
   * Add a generation to an existing trace
   */
  addGeneration(
    trace: any,
    input: any,
    output: string,
    modelName: string,
    metadata: any = {}
  ) {
    if (!this.isLangfuseEnabled() || !trace) return null;

    try {
      const generation = trace.generation({
        name: 'llm-generation',
        model: modelName,
        input,
        output,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

      return generation;
    } catch (error) {
      console.error('Failed to add generation to trace:', error);
      return null;
    }
  }

  /**
   * Add a span to an existing trace for additional context
   */
  addSpan(
    trace: any,
    name: string,
    input?: any,
    output?: any,
    metadata: any = {}
  ) {
    if (!this.isLangfuseEnabled() || !trace) return null;

    try {
      const span = trace.span({
        name,
        input,
        output,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

      return span;
    } catch (error) {
      console.error('Failed to add span to trace:', error);
      return null;
    }
  }

  /**
   * Update a trace with additional metadata or output
   */
  updateTrace(trace: any, updates: { output?: any; metadata?: any }) {
    if (!this.isLangfuseEnabled() || !trace) return;

    try {
      if (updates.output) {
        trace.update({ output: updates.output });
      }
      if (updates.metadata) {
        trace.update({ metadata: updates.metadata });
      }
    } catch (error) {
      console.error('Failed to update trace:', error);
    }
  }

  /**
   * Flush pending traces (useful before page unload)
   */
  async flush(): Promise<void> {
    if (!this.isLangfuseEnabled()) return;

    try {
      await this.langfuse!.flushAsync();
      console.log('🔍 Langfuse traces flushed successfully');
    } catch (error) {
      console.error('Failed to flush Langfuse traces:', error);
    }
  }

  /**
   * Create a user session for tracking user interactions
   */
  createUserSession(userId: string, sessionId?: string) {
    if (!this.isLangfuseEnabled()) return null;

    try {
      // Use provided sessionId or generate one
      const sessionIdToUse = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        userId,
        sessionId: sessionIdToUse,
        startTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to create user session:', error);
      return null;
    }
  }

  /**
   * Log a custom event (useful for user interactions)
   */
  logEvent(
    name: string,
    input?: any,
    output?: any,
    metadata: any = {}
  ) {
    if (!this.isLangfuseEnabled()) return null;

    try {
      const event = this.langfuse!.event({
        name,
        input,
        output,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      });

      return event;
    } catch (error) {
      console.error('Failed to log event:', error);
      return null;
    }
  }
}

// Export singleton instance
export const langfuseService = LangfuseService.getInstance();
export default langfuseService;