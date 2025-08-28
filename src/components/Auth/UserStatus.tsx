import React, { useState } from 'react'
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  ListItemIcon,
  ListItemText,
  Divider,
  Button
} from '@mui/material'
import {
  PersonOutline,
  AccountCircle,
  Logout,
  Cloud,
  CloudOff,
  GitHub,
  Google,
  Settings
} from '@mui/icons-material'
import { useUser, useIsAuthenticated, useIsAnonymous, useAuthStore } from '../../stores/authStore'

/**
 * Renders the user status component, displaying authentication state and user options.
 *
 * The component utilizes hooks to determine the user's authentication status and displays appropriate UI elements based on whether the user is authenticated, anonymous, or offline. It includes functionality for signing in with different providers and signing out, as well as a menu for user settings and preferences.
 *
 * @returns A JSX element representing the user status, including user information and action buttons.
 */
const UserStatus: React.FC = () => {
  const user = useUser()
  const isAuthenticated = useIsAuthenticated()
  const isAnonymous = useIsAnonymous()
  const { signOut, signInWithProvider, isLoading } = useAuthStore()
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  /**
   * Sets the anchor element based on the mouse event.
   */
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  /**
   * Closes the anchor element by setting it to null.
   */
  const handleClose = () => {
    setAnchorEl(null)
  }

  /**
   * Handles the sign-out process by signing out the user and closing the session.
   */
  const handleSignOut = async () => {
    await signOut()
    handleClose()
  }

  /**
   * Handles user sign-in with the specified provider.
   */
  const handleSignIn = async (provider: 'github' | 'google') => {
    await signInWithProvider(provider)
    handleClose()
  }

  if (!user) {
    return (
      <Chip
        icon={<CloudOff />}
        label="离线模式"
        size="small"
        variant="outlined"
        sx={{ opacity: 0.7 }}
      />
    )
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* 用户状态指示器 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isAnonymous && (
          <Chip
            icon={<PersonOutline />}
            label="临时用户"
            size="small"
            variant="outlined"
            sx={{ 
              fontSize: '0.75rem',
              height: 24,
              opacity: 0.8
            }}
          />
        )}
        
        {isAuthenticated && (
          <Chip
            icon={<Cloud />}
            label="已同步"
            size="small"
            color="success"
            variant="outlined"
            sx={{ 
              fontSize: '0.75rem',
              height: 24
            }}
          />
        )}
      </Box>

      {/* 用户头像/按钮 */}
      <IconButton
        onClick={handleClick}
        size="small"
        sx={{
          p: 0.5,
          border: isAuthenticated ? '2px solid' : '1px solid',
          borderColor: isAuthenticated ? 'success.main' : 'divider'
        }}
        disabled={isLoading}
      >
        {isAuthenticated && user && !user.is_anonymous ? (
          <Avatar
            src={(user as any).avatar_url}
            sx={{ width: 28, height: 28 }}
          >
            {((user as any).display_name || (user as any).email || 'U')[0].toUpperCase()}
          </Avatar>
        ) : (
          <PersonOutline sx={{ fontSize: 20 }} />
        )}
      </IconButton>

      {/* 用户菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        PaperProps={{
          elevation: 8,
          sx: {
            minWidth: 240,
            mt: 1,
            '& .MuiMenuItem-root': {
              py: 1
            }
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* 用户信息 */}
        {isAuthenticated && user && !user.is_anonymous && (
          <>
            <MenuItem>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {(user as any).display_name || '用户'}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  {(user as any).email}
                </Typography>
                <Box sx={{ mt: 1 }}>
                  <Chip
                    icon={user.provider === 'github' ? <GitHub /> : <Google />}
                    label={user.provider === 'github' ? 'GitHub' : 'Google'}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
              </Box>
            </MenuItem>
            <Divider />
          </>
        )}

        {/* 匿名用户状态 */}
        {isAnonymous && (
          <>
            <MenuItem>
              <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  临时用户
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, mb: 1 }}>
                  登录以保存数据到云端
                </Typography>
                
                {/* 快速登录按钮 */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<GitHub />}
                    onClick={() => handleSignIn('github')}
                    sx={{ 
                      flex: 1,
                      py: 0.5,
                      fontSize: '0.75rem',
                      textTransform: 'none'
                    }}
                  >
                    GitHub
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Google />}
                    onClick={() => handleSignIn('google')}
                    sx={{ 
                      flex: 1,
                      py: 0.5,
                      fontSize: '0.75rem',
                      textTransform: 'none'
                    }}
                  >
                    Google
                  </Button>
                </Box>
              </Box>
            </MenuItem>
            <Divider />
          </>
        )}

        {/* 菜单项 */}
        <MenuItem>
          <ListItemIcon>
            <AccountCircle fontSize="small" />
          </ListItemIcon>
          <ListItemText>用户设置</ListItemText>
        </MenuItem>

        <MenuItem>
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          <ListItemText>偏好设置</ListItemText>
        </MenuItem>

        {isAuthenticated && (
          <>
            <Divider />
            <MenuItem onClick={handleSignOut}>
              <ListItemIcon>
                <Logout fontSize="small" />
              </ListItemIcon>
              <ListItemText>注销</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  )
}

export default UserStatus