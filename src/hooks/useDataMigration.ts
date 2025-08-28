import { useState, useEffect, useCallback } from 'react'
import { useUser, useIsAuthenticated, useAuthStore } from '../stores/authStore'
import DataService from '../services/dataService'

interface MigrationState {
  isChecking: boolean
  hasPendingMigration: boolean
  isMigrating: boolean
  migrationError: string | null
  migrationProgress: {
    tests: { total: number; completed: number }
    conversations: { total: number; completed: number }
  }
}

interface MigrationResult {
  success: boolean
  errors: string[]
  migrated: {
    tests: number
    conversations: number
  }
}

export const useDataMigration = () => {
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()
  const { checkUpgradePrompt } = useAuthStore()

  const [state, setState] = useState<MigrationState>({
    isChecking: false,
    hasPendingMigration: false,
    isMigrating: false,
    migrationError: null,
    migrationProgress: {
      tests: { total: 0, completed: 0 },
      conversations: { total: 0, completed: 0 }
    }
  })

  // ================================================
  // 检查是否有待迁移的数据
  // ================================================
  const checkPendingMigration = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isChecking: true, migrationError: null }))

    try {
      const hasLocalTests = !!localStorage.getItem('prompt_tests')
      const hasLocalConversations = !!localStorage.getItem('nextstep_conversations')
      const hasPending = hasLocalTests || hasLocalConversations

      // 计算待迁移数据量
      let testCount = 0
      let conversationCount = 0

      if (hasLocalTests) {
        try {
          const tests = JSON.parse(localStorage.getItem('prompt_tests') || '[]')
          testCount = Array.isArray(tests) ? tests.length : 0
        } catch {
          testCount = 0
        }
      }

      if (hasLocalConversations) {
        try {
          const conversations = JSON.parse(localStorage.getItem('nextstep_conversations') || '[]')
          conversationCount = Array.isArray(conversations) ? conversations.length : 0
        } catch {
          conversationCount = 0
        }
      }

      setState(prev => ({
        ...prev,
        hasPendingMigration: hasPending,
        migrationProgress: {
          tests: { total: testCount, completed: 0 },
          conversations: { total: conversationCount, completed: 0 }
        }
      }))

      return hasPending
    } catch (error) {
      console.error('检查待迁移数据失败:', error)
      setState(prev => ({ ...prev, migrationError: '检查数据失败' }))
      return false
    } finally {
      setState(prev => ({ ...prev, isChecking: false }))
    }
  }, [])

  // ================================================
  // 执行数据迁移
  // ================================================
  const executeMigration = useCallback(async (): Promise<MigrationResult> => {
    if (!user || !isAuthenticated) {
      throw new Error('用户未登录')
    }

    setState(prev => ({ ...prev, isMigrating: true, migrationError: null }))

    try {
      // 使用数据服务进行迁移
      const result = await DataService.migrateFromLocalStorage(user.id)
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          hasPendingMigration: false,
          migrationProgress: {
            tests: { total: prev.migrationProgress.tests.total, completed: prev.migrationProgress.tests.total },
            conversations: { total: prev.migrationProgress.conversations.total, completed: prev.migrationProgress.conversations.total }
          }
        }))

        // 迁移成功后重新检查升级提示状态
        await checkUpgradePrompt()

        return {
          success: true,
          errors: [],
          migrated: {
            tests: state.migrationProgress.tests.total,
            conversations: state.migrationProgress.conversations.total
          }
        }
      } else {
        setState(prev => ({ ...prev, migrationError: '数据迁移失败' }))
        return {
          success: false,
          errors: result.errors,
          migrated: { tests: 0, conversations: 0 }
        }
      }
    } catch (error) {
      console.error('数据迁移失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      setState(prev => ({ ...prev, migrationError: errorMessage }))
      return {
        success: false,
        errors: [errorMessage],
        migrated: { tests: 0, conversations: 0 }
      }
    } finally {
      setState(prev => ({ ...prev, isMigrating: false }))
    }
  }, [user, isAuthenticated, checkUpgradePrompt, state.migrationProgress])

  // ================================================
  // 自动检查迁移（当用户登录时）
  // ================================================
  useEffect(() => {
    if (isAuthenticated && user) {
      checkPendingMigration()
    }
  }, [isAuthenticated, user, checkPendingMigration])

  // ================================================
  // 自动迁移（可选功能）
  // ================================================
  const autoMigrate = useCallback(async () => {
    if (state.hasPendingMigration && isAuthenticated && !state.isMigrating) {
      return await executeMigration()
    }
    return null
  }, [state.hasPendingMigration, isAuthenticated, state.isMigrating, executeMigration])

  // ================================================
  // 清理本地数据（危险操作，需谨慎）
  // ================================================
  const clearLocalData = useCallback(() => {
    localStorage.removeItem('prompt_tests')
    localStorage.removeItem('nextstep_conversations')
    setState(prev => ({
      ...prev,
      hasPendingMigration: false,
      migrationProgress: {
        tests: { total: 0, completed: 0 },
        conversations: { total: 0, completed: 0 }
      }
    }))
  }, [])

  // ================================================
  // 获取迁移统计信息
  // ================================================
  const getMigrationStats = useCallback(() => {
    const { tests, conversations } = state.migrationProgress
    return {
      totalItems: tests.total + conversations.total,
      completedItems: tests.completed + conversations.completed,
      progress: tests.total + conversations.total > 0 
        ? ((tests.completed + conversations.completed) / (tests.total + conversations.total)) * 100
        : 0,
      details: {
        tests,
        conversations
      }
    }
  }, [state.migrationProgress])

  return {
    // 状态
    ...state,
    
    // 操作
    checkPendingMigration,
    executeMigration,
    autoMigrate,
    clearLocalData,
    
    // 工具函数
    getMigrationStats,
    
    // 便利属性
    canMigrate: isAuthenticated && state.hasPendingMigration && !state.isMigrating,
    isReady: !state.isChecking && !state.isMigrating
  }
}

export default useDataMigration