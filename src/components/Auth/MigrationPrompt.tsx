import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  Alert,
  Chip,
  Stack,
  IconButton
} from '@mui/material'
import {
  CloudSync,
  DataObject,
  Chat,
  CheckCircle,
  Error as ErrorIcon,
  Close
} from '@mui/icons-material'
import { useDataMigration } from '../../hooks/useDataMigration'
import { useIsAuthenticated } from '../../stores/authStore'

const MigrationPrompt: React.FC = () => {
  const isAuthenticated = useIsAuthenticated()
  const {
    hasPendingMigration,
    isMigrating,
    migrationError,
    executeMigration,
    getMigrationStats,
    clearLocalData
  } = useDataMigration()

  const [showPrompt, setShowPrompt] = useState(false)
  const [migrationCompleted, setMigrationCompleted] = useState(false)
  const [migrationResult, setMigrationResult] = useState<{ success: boolean; migrated: { tests: number; conversations: number } } | null>(null)

  const stats = getMigrationStats()

  // 当用户登录且有待迁移数据时显示提示
  useEffect(() => {
    if (isAuthenticated && hasPendingMigration && !migrationCompleted) {
      setShowPrompt(true)
    }
  }, [isAuthenticated, hasPendingMigration, migrationCompleted])

  const handleMigrate = async () => {
    try {
      const result = await executeMigration()
      setMigrationResult(result)
      setMigrationCompleted(true)
      
      if (result.success) {
        // 成功后 2 秒关闭对话框
        setTimeout(() => {
          setShowPrompt(false)
        }, 2000)
      }
    } catch (error) {
      console.error('迁移失败:', error)
    }
  }

  const handleSkip = () => {
    setShowPrompt(false)
    // 可以设置一个标记，避免此会话中再次提示
    sessionStorage.setItem('migration_prompt_skipped', Date.now().toString())
  }

  const handleDismiss = () => {
    setShowPrompt(false)
  }

  if (!showPrompt || !isAuthenticated) return null

  return (
    <Dialog 
      open={showPrompt} 
      onClose={handleDismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudSync color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            数据同步
          </Typography>
        </Box>
        <IconButton 
          onClick={handleDismiss} 
          size="small"
          disabled={isMigrating}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* 迁移完成状态 */}
        {migrationCompleted && migrationResult && (
          <Box sx={{ mb: 3 }}>
            {migrationResult.success ? (
              <Alert severity="success" icon={<CheckCircle />}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  数据同步成功！
                </Typography>
                <Typography variant="body2">
                  已成功同步 {migrationResult.migrated.tests} 个测试和 {migrationResult.migrated.conversations} 个对话到云端
                </Typography>
              </Alert>
            ) : (
              <Alert severity="error" icon={<ErrorIcon />}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  同步失败
                </Typography>
                <Typography variant="body2">
                  部分数据可能未能同步，请稍后重试或联系支持
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* 迁移错误 */}
        {migrationError && !migrationCompleted && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {migrationError}
          </Alert>
        )}

        {/* 正常状态 */}
        {!migrationCompleted && (
          <>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
              检测到您在本地存储了一些数据，是否要将它们同步到云端以便随时访问？
            </Typography>

            {/* 数据统计 */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                待同步的数据
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {stats.details.tests.total > 0 && (
                  <Chip
                    icon={<DataObject />}
                    label={`${stats.details.tests.total} 个提示测试`}
                    variant="outlined"
                    color="primary"
                  />
                )}
                {stats.details.conversations.total > 0 && (
                  <Chip
                    icon={<Chat />}
                    label={`${stats.details.conversations.total} 个对话`}
                    variant="outlined"
                    color="primary"
                  />
                )}
              </Stack>
            </Box>

            {/* 迁移进度 */}
            {isMigrating && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  正在同步... ({Math.round(stats.progress)}%)
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.progress} 
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  已完成 {stats.completedItems} / {stats.totalItems} 项
                </Typography>
              </Box>
            )}

            <Typography 
              variant="caption" 
              sx={{ 
                display: 'block',
                color: 'text.secondary',
                lineHeight: 1.4
              }}
            >
              ✨ 同步完成后，您可以在任何设备上访问这些数据<br/>
              🔒 我们使用加密传输确保数据安全
            </Typography>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!migrationCompleted && !isMigrating && (
          <>
            <Button 
              onClick={handleSkip}
              color="inherit"
            >
              跳过
            </Button>
            <Button
              variant="contained"
              onClick={handleMigrate}
              startIcon={<CloudSync />}
            >
              开始同步
            </Button>
          </>
        )}

        {isMigrating && (
          <Button disabled>
            同步中...
          </Button>
        )}

        {migrationCompleted && (
          <Button 
            variant="contained" 
            onClick={handleDismiss}
            color={migrationResult?.success ? "success" : "error"}
          >
            {migrationResult?.success ? "完成" : "关闭"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}

export default MigrationPrompt