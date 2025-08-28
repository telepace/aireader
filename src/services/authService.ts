import { supabase, isSupabaseAvailable } from './supabase'
import { AuthUser, AnonymousUser } from '../types/types'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as DatabaseUser } from '../types/database'

export class AuthService {
  // ================================================
  // 匿名用户管理
  // ================================================
  
  /**
   * 创建匿名用户 - 零摩擦准入的核心
   */
  static async createAnonymousUser(): Promise<AnonymousUser> {
    try {
      // Check if Supabase is available
      if (!isSupabaseAvailable()) {
        console.warn('⚠️ Supabase not available - using local anonymous user');
        // Return a local anonymous user without database persistence
        const anonymousToken = crypto.randomUUID();
        return {
          id: `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          anonymous_token: anonymousToken,
          is_anonymous: true
        } as AnonymousUser;
      }

      // 生成匿名令牌
      const anonymousToken = crypto.randomUUID()
      
      // 在数据库中创建匿名用户记录
      const { data, error } = await supabase
        .from('users')
        .insert({
          is_anonymous: true,
          anonymous_token: anonymousToken,
          provider: 'anonymous'
        })
        .select()
        .single()

      if (error) throw error

      const anonymousUser: AnonymousUser = {
        id: data.id,
        anonymous_token: anonymousToken,
        is_anonymous: true
      }

      // 在本地存储中保存匿名标识
      localStorage.setItem('anonymous_token', anonymousToken)
      localStorage.setItem('anonymous_user_id', data.id)

      return anonymousUser
    } catch (error) {
      console.error('创建匿名用户失败:', error)
      throw new Error('无法创建匿名用户')
    }
  }

  /**
   * 获取当前匿名用户
   */
  static async getCurrentAnonymousUser(): Promise<AnonymousUser | null> {
    const anonymousToken = localStorage.getItem('anonymous_token')
    const anonymousUserId = localStorage.getItem('anonymous_user_id')

    if (!anonymousToken || !anonymousUserId) {
      return null
    }

    try {
      // 验证匿名用户是否存在
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('anonymous_token', anonymousToken)
        .eq('is_anonymous', true)
        .single()

      if (error || !data) return null

      return {
        id: data.id,
        anonymous_token: anonymousToken,
        is_anonymous: true
      }
    } catch {
      return null
    }
  }

  // ================================================
  // 社交登录
  // ================================================

  /**
   * GitHub 登录
   */
  static async signInWithGitHub(): Promise<{ user: SupabaseUser | null, error: any }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    })

    return { user: null, error }
  }

  /**
   * Google 登录
   */
  static async signInWithGoogle(): Promise<{ user: SupabaseUser | null, error: any }> {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    })

    return { user: null, error }
  }

  // ================================================
  // 用户升级（匿名 → 正式用户）
  // ================================================

  /**
   * 升级匿名用户为正式用户
   * 这是零摩擦体验的关键：无缝数据迁移
   */
  static async upgradeAnonymousUser(provider: 'github' | 'google'): Promise<{ user: AuthUser | null, error: any }> {
    try {
      // 获取当前匿名用户
      const anonymousUser = await this.getCurrentAnonymousUser()
      if (!anonymousUser) {
        throw new Error('未找到匿名用户')
      }

      // 执行社交登录
      let loginResult
      if (provider === 'github') {
        loginResult = await this.signInWithGitHub()
      } else {
        loginResult = await this.signInWithGoogle()
      }

      if (loginResult.error || !loginResult.user) {
        return { user: null, error: loginResult.error || new Error('登录失败') }
      }

      // 这里需要在登录回调中处理数据迁移
      // 暂时存储匿名用户ID用于后续迁移
      sessionStorage.setItem('upgrade_anonymous_id', anonymousUser.id)
      
      return { user: null, error: null } // 实际用户将在回调中创建
    } catch (error) {
      console.error('升级用户失败:', error)
      return { user: null, error }
    }
  }

  /**
   * 处理登录回调后的用户升级
   */
  static async handleAuthCallback(supabaseUser: SupabaseUser): Promise<AuthUser> {
    const upgradeAnonymousId = sessionStorage.getItem('upgrade_anonymous_id')
    
    try {
      let user: DatabaseUser

      if (upgradeAnonymousId) {
        // 升级匿名用户
        await this.migrateAnonymousUserData(upgradeAnonymousId, supabaseUser)
        
        // 更新用户信息
        const { data, error } = await supabase
          .from('users')
          .update({
            email: supabaseUser.email,
            display_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
            avatar_url: supabaseUser.user_metadata?.avatar_url,
            provider: supabaseUser.app_metadata?.provider,
            provider_id: supabaseUser.id,
            is_anonymous: false,
            anonymous_token: null
          })
          .eq('id', upgradeAnonymousId)
          .select()
          .single()

        if (error) throw error
        user = data

        // 清理临时数据
        sessionStorage.removeItem('upgrade_anonymous_id')
        localStorage.removeItem('anonymous_token')
        localStorage.removeItem('anonymous_user_id')
      } else {
        // 创建新用户
        const { data, error } = await supabase
          .from('users')
          .upsert({
            id: supabaseUser.id,
            email: supabaseUser.email,
            display_name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name,
            avatar_url: supabaseUser.user_metadata?.avatar_url,
            provider: supabaseUser.app_metadata?.provider,
            provider_id: supabaseUser.id,
            is_anonymous: false
          })
          .select()
          .single()

        if (error) throw error
        user = data
      }

      return {
        id: user.id,
        email: user.email || undefined,
        display_name: user.display_name || undefined,
        avatar_url: user.avatar_url || undefined,
        provider: user.provider as 'github' | 'google',
        is_anonymous: false
      }
    } catch (error) {
      console.error('处理认证回调失败:', error)
      throw error
    }
  }

  /**
   * 迁移匿名用户数据到正式账户
   */
  private static async migrateAnonymousUserData(anonymousUserId: string, newUser: SupabaseUser): Promise<void> {
    try {
      // 更新所有相关数据的 user_id
      const updates = [
        supabase.from('prompt_tests').update({ user_id: newUser.id }).eq('user_id', anonymousUserId),
        supabase.from('conversations').update({ user_id: newUser.id }).eq('user_id', anonymousUserId)
      ]

      await Promise.all(updates)
      
      console.log('匿名用户数据迁移完成:', { anonymousUserId, newUserId: newUser.id })
    } catch (error) {
      console.error('数据迁移失败:', error)
      throw error
    }
  }

  // ================================================
  // 用户状态管理
  // ================================================

  /**
   * 获取当前用户（认证用户或匿名用户）
   */
  static async getCurrentUser(): Promise<AuthUser | AnonymousUser | null> {
    // 首先检查是否有认证用户
    const { data: { user: supabaseUser } } = await supabase.auth.getUser()
    
    if (supabaseUser) {
      // 从数据库获取完整用户信息
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single()

      if (!error && data) {
        return {
          id: data.id,
          email: data.email || undefined,
          display_name: data.display_name || undefined,
          avatar_url: data.avatar_url || undefined,
          provider: data.provider as 'github' | 'google',
          is_anonymous: false
        }
      }
    }

    // 如果没有认证用户，检查匿名用户
    return await this.getCurrentAnonymousUser()
  }

  /**
   * 注销用户
   */
  static async signOut(): Promise<void> {
    try {
      // 注销 Supabase 用户
      await supabase.auth.signOut()
      
      // 清理本地存储
      localStorage.removeItem('anonymous_token')
      localStorage.removeItem('anonymous_user_id')
      sessionStorage.removeItem('upgrade_anonymous_id')
      
      // 创建新的匿名用户以保持无缝体验
      await this.createAnonymousUser()
    } catch (error) {
      console.error('注销失败:', error)
      throw error
    }
  }

  // ================================================
  // 用户价值检测（智能提示逻辑）
  // ================================================

  /**
   * 检测是否应该提示用户升级
   */
  static async shouldPromptUpgrade(userId: string): Promise<boolean> {
    try {
      const [testsResult, conversationsResult] = await Promise.all([
        supabase.from('prompt_tests').select('id').eq('user_id', userId),
        supabase.from('conversations').select('id, message_count').eq('user_id', userId)
      ])

      const testCount = testsResult.data?.length || 0
      const totalMessages = conversationsResult.data?.reduce((sum, conv) => sum + conv.message_count, 0) || 0

      // 触发条件：3个测试 OR 10轮对话
      return testCount >= 3 || totalMessages >= 10
    } catch {
      return false
    }
  }

  /**
   * 获取用户价值统计（用于提示界面）
   */
  static async getUserValueStats(userId: string): Promise<{
    testCount: number
    messageCount: number
    conversationCount: number
  }> {
    try {
      const [testsResult, conversationsResult] = await Promise.all([
        supabase.from('prompt_tests').select('id').eq('user_id', userId),
        supabase.from('conversations').select('id, message_count').eq('user_id', userId)
      ])

      const testCount = testsResult.data?.length || 0
      const conversations = conversationsResult.data || []
      const conversationCount = conversations.length
      const messageCount = conversations.reduce((sum, conv) => sum + conv.message_count, 0)

      return { testCount, messageCount, conversationCount }
    } catch {
      return { testCount: 0, messageCount: 0, conversationCount: 0 }
    }
  }
}

export default AuthService