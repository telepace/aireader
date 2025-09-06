import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthUser, AnonymousUser } from '../types/types'
import AuthService from '../services/authService'
import { supabase } from '../services/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

// 用户状态类型
export type UserState = AuthUser | AnonymousUser | null

// Store 状态接口
interface AuthState {
  // 状态
  user: UserState
  isLoading: boolean
  isInitialized: boolean
  shouldShowUpgradePrompt: boolean
  upgradeStats: {
    testCount: number
    messageCount: number
    conversationCount: number
  }
  
  // 内部状态 - 防止重复初始化
  authListener: any

  // 操作
  initializeAuth: () => Promise<void>
  createAnonymousUser: () => Promise<void>
  signInWithProvider: (provider: 'github' | 'google') => Promise<void>
  upgradeAnonymousUser: (provider: 'github' | 'google') => Promise<void>
  signOut: () => Promise<void>
  checkUpgradePrompt: () => Promise<void>
  dismissUpgradePrompt: () => void
  refreshUserStats: () => Promise<void>
  
  // 内部方法
  handleAuthCallback: (user: SupabaseUser) => Promise<void>
  handleSignOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      isLoading: false,
      isInitialized: false,
      shouldShowUpgradePrompt: false,
      upgradeStats: {
        testCount: 0,
        messageCount: 0,
        conversationCount: 0
      },
      authListener: null,

      // ================================================
      // 认证初始化
      // ================================================
      initializeAuth: async () => {
        const state = get();
        
        // 防止重复初始化 - React严格模式保护
        if (state.isInitialized || state.isLoading) {
          console.log('🔒 Auth already initialized or initializing, skipping...');
          return;
        }

        console.log('🚀 Initializing authentication system...');
        set({ isLoading: true })

        try {
          // 清理现有的认证监听器
          if (state.authListener) {
            console.log('🧹 Cleaning up existing auth listener');
            state.authListener.data.subscription.unsubscribe();
          }

          // 监听认证状态变化
          const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id)

            if (event === 'SIGNED_IN' && session?.user) {
              await get().handleAuthCallback(session.user)
            } else if (event === 'SIGNED_OUT') {
              await get().handleSignOut()
            }
          });

          // 保存监听器引用
          set({ authListener });

          // 获取当前用户
          const currentUser = await AuthService.getCurrentUser()
          
          if (currentUser) {
            set({ user: currentUser })
            
            // 如果是匿名用户，检查是否需要提示升级
            if (currentUser.is_anonymous) {
              await get().checkUpgradePrompt()
            }
          } else {
            // 没有用户，创建匿名用户
            await get().createAnonymousUser()
          }

          set({ isInitialized: true })
          console.log('✅ Authentication system initialized successfully');
        } catch (error) {
          console.error('初始化认证失败:', error)
          // 降级到创建匿名用户
          await get().createAnonymousUser()
          set({ isInitialized: true })
        } finally {
          set({ isLoading: false })
        }
      },

      // ================================================
      // 匿名用户管理
      // ================================================
      createAnonymousUser: async () => {
        try {
          set({ isLoading: true })
          const anonymousUser = await AuthService.createAnonymousUser()
          set({ user: anonymousUser })
          console.log('匿名用户创建成功:', anonymousUser.id)
        } catch (error) {
          console.error('创建匿名用户失败:', error)
          set({ user: null })
        } finally {
          set({ isLoading: false })
        }
      },

      // ================================================
      // 社交登录
      // ================================================
      signInWithProvider: async (provider: 'github' | 'google') => {
        try {
          set({ isLoading: true })
          
          if (provider === 'github') {
            await AuthService.signInWithGitHub()
          } else {
            await AuthService.signInWithGoogle()
          }
          
          // 登录成功后会通过 onAuthStateChange 回调处理
        } catch (error) {
          console.error('社交登录失败:', error)
          set({ isLoading: false })
        }
      },

      // ================================================
      // 用户升级
      // ================================================
      upgradeAnonymousUser: async (provider: 'github' | 'google') => {
        const currentUser = get().user
        if (!currentUser || !currentUser.is_anonymous) return

        try {
          set({ isLoading: true })
          await AuthService.upgradeAnonymousUser(provider)
          // 升级成功后会通过 onAuthStateChange 回调处理
        } catch (error) {
          console.error('升级用户失败:', error)
          set({ isLoading: false })
        }
      },

      // ================================================
      // 认证回调处理
      // ================================================
      handleAuthCallback: async (supabaseUser: SupabaseUser) => {
        try {
          const authUser = await AuthService.handleAuthCallback(supabaseUser)
          set({ 
            user: authUser, 
            isLoading: false,
            shouldShowUpgradePrompt: false 
          })
          
          console.log('用户认证成功:', authUser.id)
          
          // 刷新用户统计
          await get().refreshUserStats()
        } catch (error) {
          console.error('处理认证回调失败:', error)
          set({ isLoading: false })
        }
      },

      // ================================================
      // 注销
      // ================================================
      signOut: async () => {
        try {
          set({ isLoading: true })
          await AuthService.signOut()
        } catch (error) {
          console.error('注销失败:', error)
        } finally {
          set({ isLoading: false })
        }
      },

      handleSignOut: async () => {
        // 创建新的匿名用户
        await get().createAnonymousUser()
        set({ 
          shouldShowUpgradePrompt: false,
          upgradeStats: { testCount: 0, messageCount: 0, conversationCount: 0 }
        })
      },

      // ================================================
      // 升级提示逻辑
      // ================================================
      checkUpgradePrompt: async () => {
        const user = get().user
        if (!user || !user.is_anonymous) return

        try {
          const shouldPrompt = await AuthService.shouldPromptUpgrade(user.id)
          
          if (shouldPrompt) {
            const stats = await AuthService.getUserValueStats(user.id)
            set({ 
              shouldShowUpgradePrompt: true,
              upgradeStats: stats 
            })
          }
        } catch (error) {
          console.error('检查升级提示失败:', error)
        }
      },

      dismissUpgradePrompt: () => {
        set({ shouldShowUpgradePrompt: false })
        // 设置一个标志，避免短时间内再次提示
        localStorage.setItem('upgrade_prompt_dismissed', Date.now().toString())
      },

      refreshUserStats: async () => {
        const user = get().user
        if (!user) return

        try {
          const stats = await AuthService.getUserValueStats(user.id)
          set({ upgradeStats: stats })
        } catch (error) {
          console.error('刷新用户统计失败:', error)
        }
      }
    }),
    {
      name: 'auth-store',
      // 只持久化必要的状态
      partialize: (state) => ({
        user: state.user,
        shouldShowUpgradePrompt: state.shouldShowUpgradePrompt
      })
    }
  )
)

// 便利 hooks
export const useUser = () => useAuthStore((state) => state.user)
export const useIsAuthenticated = () => {
  const user = useAuthStore((state) => state.user)
  return user && !user.is_anonymous
}
export const useIsAnonymous = () => {
  const user = useAuthStore((state) => state.user)
  return user && user.is_anonymous
}
export const useAuthLoading = () => useAuthStore((state) => state.isLoading)
export const useUpgradePrompt = () => ({
  shouldShow: useAuthStore((state) => state.shouldShowUpgradePrompt),
  stats: useAuthStore((state) => state.upgradeStats),
  dismiss: useAuthStore((state) => state.dismissUpgradePrompt)
})

// 导出默认实例
export default useAuthStore