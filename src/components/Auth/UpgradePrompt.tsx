import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Stack,
  IconButton
} from '@mui/material'
import {
  Cloud,
  GitHub,
  Google,
  Close,
  DataObject,
  Chat,
  Star
} from '@mui/icons-material'
import { useUpgradePrompt, useAuthStore } from '../../stores/authStore'

/**
 * Renders an upgrade prompt dialog for users to save their data to the cloud.
 *
 * This component checks if the upgrade prompt should be displayed based on the
 * `shouldShow` state from `useUpgradePrompt`. If shown, it presents the user
 * with their data statistics and options to log in using either GitHub or Google.
 * The `handleUpgrade` function is called to upgrade the user when a login option
 * is selected, utilizing the `upgradeAnonymousUser` function from `useAuthStore`.
 */
const UpgradePrompt: React.FC = () => {
  const { shouldShow, stats, dismiss } = useUpgradePrompt()
  const { upgradeAnonymousUser, isLoading } = useAuthStore()

  /**
   * Upgrades an anonymous user using the specified provider.
   */
  const handleUpgrade = async (provider: 'github' | 'google') => {
    await upgradeAnonymousUser(provider)
  }

  if (!shouldShow) return null

  return (
    <Dialog 
      open={shouldShow} 
      onClose={dismiss}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
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
          <Cloud sx={{ color: 'white' }} />
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
            保存到云端，永不丢失！
          </Typography>
        </Box>
        <IconButton 
          onClick={dismiss} 
          sx={{ color: 'rgba(255,255,255,0.7)' }}
          size="small"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0 }}>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.95, lineHeight: 1.6 }}>
          您已经积累了不少有价值的数据，一键登录即可将所有内容安全保存到云端，随时随地访问！
        </Typography>

        {/* 数据统计展示 */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.8 }}>
            您的数据概况
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {stats.testCount > 0 && (
              <Chip
                icon={<DataObject sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                label={`${stats.testCount} 个提示测试`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)' }
                }}
              />
            )}
            {stats.conversationCount > 0 && (
              <Chip
                icon={<Chat sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                label={`${stats.conversationCount} 个对话`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white'
                }}
              />
            )}
            {stats.messageCount > 0 && (
              <Chip
                icon={<Star sx={{ color: 'rgba(255,255,255,0.8)' }} />}
                label={`${stats.messageCount} 条消息`}
                variant="outlined"
                sx={{
                  borderColor: 'rgba(255,255,255,0.3)',
                  color: 'white'
                }}
              />
            )}
          </Stack>
        </Box>

        {/* 登录选项 */}
        <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.8 }}>
          选择登录方式
        </Typography>
        
        <Stack spacing={2}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<GitHub />}
            onClick={() => handleUpgrade('github')}
            disabled={isLoading}
            sx={{
              bgcolor: 'rgba(0,0,0,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(0,0,0,0.3)',
                borderColor: 'rgba(255,255,255,0.3)'
              },
              py: 1.5,
              fontWeight: 600
            }}
          >
            使用 GitHub 登录
          </Button>

          <Button
            variant="contained"
            size="large"
            fullWidth
            startIcon={<Google />}
            onClick={() => handleUpgrade('google')}
            disabled={isLoading}
            sx={{
              bgcolor: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                borderColor: 'rgba(255,255,255,0.3)'
              },
              py: 1.5,
              fontWeight: 600
            }}
          >
            使用 Google 登录
          </Button>
        </Stack>

        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 3, 
            textAlign: 'center', 
            opacity: 0.7,
            lineHeight: 1.4
          }}
        >
          ✨ 登录后所有数据将自动同步，无需重新输入<br/>
          🔒 我们重视您的隐私，仅用于数据同步
        </Typography>
      </DialogContent>

      <DialogActions sx={{ pt: 0, px: 3, pb: 3 }}>
        <Button 
          onClick={dismiss}
          sx={{ 
            color: 'rgba(255,255,255,0.7)',
            textTransform: 'none'
          }}
        >
          稍后再说
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default UpgradePrompt