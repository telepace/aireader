import { supabase } from './supabase'
import { PromptTest, ChatConversation, ChatMessage, OptionItem } from '../types/types'
import { 
  PromptTest as DatabasePromptTest, 
  Conversation as DatabaseConversation,
  Message as DatabaseMessage,
  ConversationOption as DatabaseConversationOption,
  PromptTestInsert,
  ConversationInsert,
  MessageInsert,
  ConversationOptionInsert
} from '../types/database'

export class DataService {
  // ================================================
  // 提示测试数据管理
  // ================================================

  /**
   * 获取用户的所有提示测试
   */
  static async getPromptTests(userId: string): Promise<PromptTest[]> {
    try {
      const { data, error } = await supabase
        .from('prompt_tests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // 转换数据库格式到应用格式
      return (data || []).map(this.convertDbPromptTestToApp)
    } catch (error) {
      console.error('获取提示测试失败:', error)
      return []
    }
  }

  /**
   * 保存提示测试
   */
  static async savePromptTest(userId: string, test: Omit<PromptTest, 'id' | 'timestamp'>): Promise<PromptTest | null> {
    try {
      const testInsert: PromptTestInsert = {
        user_id: userId,
        prompt_object: test.promptObject,
        prompt_text: test.promptText,
        prompt_result: test.promptResult,
        model_name: test.modelName,
        response_time_ms: null,
        token_count: null,
        cost_estimate: null,
        tags: [],
        is_favorite: false
      }

      const { data, error } = await supabase
        .from('prompt_tests')
        .insert(testInsert)
        .select()
        .single()

      if (error) throw error

      return this.convertDbPromptTestToApp(data)
    } catch (error) {
      console.error('保存提示测试失败:', error)
      return null
    }
  }

  /**
   * 删除提示测试
   */
  static async deletePromptTest(testId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('prompt_tests')
        .delete()
        .eq('id', testId)

      return !error
    } catch (error) {
      console.error('删除提示测试失败:', error)
      return false
    }
  }

  /**
   * 更新测试为收藏
   */
  static async toggleTestFavorite(testId: string): Promise<boolean> {
    try {
      // 先获取当前状态
      const { data: current } = await supabase
        .from('prompt_tests')
        .select('is_favorite')
        .eq('id', testId)
        .single()

      if (!current) return false

      // 切换收藏状态
      const { error } = await supabase
        .from('prompt_tests')
        .update({ is_favorite: !current.is_favorite })
        .eq('id', testId)

      return !error
    } catch (error) {
      console.error('切换收藏失败:', error)
      return false
    }
  }

  // ================================================
  // 对话数据管理
  // ================================================

  /**
   * 获取用户的所有对话
   */
  static async getConversations(userId: string): Promise<ChatConversation[]> {
    try {
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (*),
          conversation_options (*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })

      if (convError) throw convError

      // 转换数据格式
      return (conversationsData || []).map(conv => {
        const messages: ChatMessage[] = (conv.messages || [])
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at).getTime()
          }))

        const options: OptionItem[] = (conv.conversation_options || []).map((opt: any) => ({
          type: opt.type as 'deepen' | 'next',
          id: opt.id,
          content: opt.content,
          describe: opt.description || '',
          firstSeenAt: new Date(opt.created_at).getTime(),
          lastSeenAt: new Date(opt.created_at).getTime(),
          lastMessageId: opt.last_message_id || '',
          clickCount: opt.click_count
        }))

        return {
          id: conv.id,
          messages,
          timestamp: new Date(conv.created_at).getTime(),
          title: conv.title || undefined,
          updatedAt: new Date(conv.updated_at).getTime(),
          modelName: conv.model_name || undefined,
          options
        }
      })
    } catch (error) {
      console.error('获取对话列表失败:', error)
      return []
    }
  }

  /**
   * 获取单个对话
   */
  static async getConversation(conversationId: string): Promise<ChatConversation | null> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (*),
          conversation_options (*)
        `)
        .eq('id', conversationId)
        .single()

      if (error) throw error

      const messages: ChatMessage[] = (data.messages || [])
        .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at).getTime()
        }))

      const options: OptionItem[] = (data.conversation_options || []).map((opt: any) => ({
        type: opt.type as 'deepen' | 'next',
        id: opt.id,
        content: opt.content,
        describe: opt.description || '',
        firstSeenAt: new Date(opt.created_at).getTime(),
        lastSeenAt: new Date(opt.created_at).getTime(),
        lastMessageId: opt.last_message_id || '',
        clickCount: opt.click_count
      }))

      return {
        id: data.id,
        messages,
        timestamp: new Date(data.created_at).getTime(),
        title: data.title || undefined,
        updatedAt: new Date(data.updated_at).getTime(),
        modelName: data.model_name || undefined,
        options
      }
    } catch (error) {
      console.error('获取对话失败:', error)
      return null
    }
  }

  /**
   * 保存或更新对话
   */
  static async upsertConversation(userId: string, conversation: ChatConversation): Promise<ChatConversation | null> {
    try {
      // 准备对话数据
      const conversationData: ConversationInsert = {
        id: conversation.id,
        user_id: userId,
        title: conversation.title || null,
        model_name: conversation.modelName || null,
        message_count: conversation.messages.length,
        total_tokens: 0 // 可以后续计算
      }

      // 保存或更新对话
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .upsert(conversationData, { onConflict: 'id' })
        .select()
        .single()

      if (convError) throw convError

      // 删除旧消息（如果是更新）
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversation.id)

      // 保存消息
      if (conversation.messages.length > 0) {
        const messagesData: MessageInsert[] = conversation.messages.map(msg => ({
          id: msg.id,
          conversation_id: conversation.id,
          role: msg.role,
          content: msg.content,
          token_count: null,
          created_at: new Date(msg.timestamp).toISOString()
        }))

        await supabase
          .from('messages')
          .insert(messagesData)
      }

      // 保存选项
      if (conversation.options && conversation.options.length > 0) {
        // 删除旧选项
        await supabase
          .from('conversation_options')
          .delete()
          .eq('conversation_id', conversation.id)

        const optionsData: ConversationOptionInsert[] = conversation.options.map(opt => ({
          id: opt.id,
          conversation_id: conversation.id,
          type: opt.type,
          content: opt.content,
          description: opt.describe || null,
          click_count: opt.clickCount,
          last_message_id: opt.lastMessageId || null,
          created_at: new Date(opt.firstSeenAt).toISOString()
        }))

        await supabase
          .from('conversation_options')
          .insert(optionsData)
      }

      return conversation
    } catch (error) {
      console.error('保存对话失败:', error)
      return null
    }
  }

  /**
   * 删除对话
   */
  static async deleteConversation(conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)

      return !error
    } catch (error) {
      console.error('删除对话失败:', error)
      return false
    }
  }

  // ================================================
  // 数据导入导出
  // ================================================

  /**
   * 导出用户数据（JSONL 格式）
   */
  static async exportUserData(userId: string): Promise<string> {
    try {
      const [tests, conversations] = await Promise.all([
        this.getPromptTests(userId),
        this.getConversations(userId)
      ])

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        prompt_tests: tests,
        conversations: conversations
      }

      return JSON.stringify(exportData, null, 2)
    } catch (error) {
      console.error('导出数据失败:', error)
      return '{}'
    }
  }

  /**
   * 从本地存储迁移数据到云端
   */
  static async migrateFromLocalStorage(userId: string): Promise<{ success: boolean, errors: string[] }> {
    const errors: string[] = []
    
    try {
      // 迁移提示测试
      const localTests = localStorage.getItem('prompt_tests')
      if (localTests) {
        try {
          const tests: PromptTest[] = JSON.parse(localTests)
          for (const test of tests) {
            const success = await this.savePromptTest(userId, {
              promptObject: test.promptObject,
              promptText: test.promptText,
              promptResult: test.promptResult,
              modelName: test.modelName
            })
            if (!success) {
              errors.push(`Failed to migrate test: ${test.id}`)
            }
          }
        } catch (e) {
          errors.push('Failed to parse local prompt tests')
        }
      }

      // 迁移对话
      const localConversations = localStorage.getItem('nextstep_conversations')
      if (localConversations) {
        try {
          const conversations: ChatConversation[] = JSON.parse(localConversations)
          for (const conversation of conversations) {
            const success = await this.upsertConversation(userId, conversation)
            if (!success) {
              errors.push(`Failed to migrate conversation: ${conversation.id}`)
            }
          }
        } catch (e) {
          errors.push('Failed to parse local conversations')
        }
      }

      // 如果迁移成功，清理本地数据
      if (errors.length === 0) {
        localStorage.removeItem('prompt_tests')
        localStorage.removeItem('nextstep_conversations')
      }

      return { success: errors.length === 0, errors }
    } catch (error) {
      console.error('数据迁移失败:', error)
      return { success: false, errors: ['Migration failed with unknown error'] }
    }
  }

  // ================================================
  // 工具函数
  // ================================================

  /**
   * 转换数据库格式到应用格式
   */
  private static convertDbPromptTestToApp(dbTest: DatabasePromptTest): PromptTest {
    return {
      id: dbTest.id,
      promptObject: dbTest.prompt_object,
      promptText: dbTest.prompt_text,
      promptResult: dbTest.prompt_result || '',
      timestamp: new Date(dbTest.created_at).getTime(),
      modelName: dbTest.model_name
    }
  }

  /**
   * 测试数据库连接
   */
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .select('id')
        .limit(1)

      return !error
    } catch {
      return false
    }
  }
}

export default DataService