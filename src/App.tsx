import { useState, useEffect } from 'react';
import {
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box
} from '@mui/material';
import { useUIState } from './hooks/useUIState';
import { useModelSelection } from './hooks/useModelSelection';
import { createUserSession, flushTraces } from './services/api-with-tracing';
import AppHeader from './components/Layout/AppHeader';
import NextStepChat from './components/NextStepChat';
import { UpgradePrompt, MigrationPrompt } from './components/Auth';
import { useAuthStore } from './stores/authStore';
import { UserSession } from './types/types';
import './utils/langfuse-test'; // Auto-validates Langfuse integration in development
import './App.css';

/**
 * Main application component that manages the user interface, state, and authentication.
 */
const App: React.FC = () => {
  const [nextStepClearSignal, setNextStepClearSignal] = useState<number>(0);
  const [toggleConvMenuSignal, setToggleConvMenuSignal] = useState<number>(0);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useUIState();

  const { selectedModel, setSelectedModel, availableModels } = useModelSelection();
  
  // 认证系统初始化
  const { initializeAuth, isInitialized } = useAuthStore();

  // Initialize authentication system
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initialize user session on app load (without logging app-loaded event)
  useEffect(() => {
    const session = createUserSession();
    if (session) {
      setUserSession(session);
      // Removed app-loaded event - too noisy for analytics
    }
  }, []);

  // Flush traces before page unload (without logging app-unload event)
  useEffect(() => {
    /**
     * Handles the before unload event to flush user session traces.
     */
    const handleBeforeUnload = () => {
      if (userSession) {
        // Removed app-unload event - too noisy for analytics
        flushTraces();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [userSession]);

  const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#000000',
        light: '#333333',
        dark: '#000000',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#6c757d',
        light: '#adb5bd',
        dark: '#495057',
        contrastText: '#ffffff'
      },
      background: {
        default: '#ffffff',
        paper: '#fafafa',
      },
      text: {
        primary: '#000000',
        secondary: '#6c757d',
      },
      divider: '#e9ecef',
      success: {
        main: '#28a745',
        light: '#34ce57',
        dark: '#1e7e34'
      },
      warning: {
        main: '#ffc107',
        light: '#ffcd39',
        dark: '#e0a800'
      },
      error: {
        main: '#dc3545',
        light: '#e15662',
        dark: '#c82333'
      },
      info: {
        main: '#17a2b8',
        light: '#3dd5f3',
        dark: '#117a8b'
      }
    },
    typography: {
      fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.1,
        letterSpacing: '-0.03em'
      },
      h2: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.025em'
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.3,
        letterSpacing: '-0.02em'
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.4,
        letterSpacing: '-0.015em'
      },
      h5: {
        fontWeight: 500,
        fontSize: '1rem',
        lineHeight: 1.4,
        letterSpacing: '-0.01em'
      },
      h6: {
        fontWeight: 500,
        fontSize: '0.875rem',
        lineHeight: 1.5,
        letterSpacing: '0em'
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: 0,
        fontWeight: 400
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        letterSpacing: 0,
        fontWeight: 400
      }
    },
    shape: {
      borderRadius: 8
    },
    shadows: [
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none',
      'none'
    ],
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 8,
            paddingX: 24,
            paddingY: 10,
            fontSize: '0.95rem',
            boxShadow: 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              transform: 'translateY(-1px)',
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          }
        }
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#cbd5e1'
                }
              },
              '&.Mui-focused': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderWidth: '2px',
                  borderColor: '#6366f1'
                }
              }
            }
          }
        }
      }
    }
  });


  // 这些变量在当前的布局中暂时未使用，但保留以备将来使用
  // const sidebarWidth = 320;
  // const rightSidebarWidth = 480;
  // const transitionDuration = '0.3s';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container 
        maxWidth={false} 
        sx={{ 
          height: '100vh',
          display: 'flex', 
          flexDirection: 'column',
          p: '0 !important',
          m: '0 !important',
          bgcolor: 'background.default',
          color: 'text.primary',
          overflow: 'hidden',
          minHeight: 0,
          position: 'relative'
        }}
      >
        <AppHeader
          selectedModel={selectedModel}
          onModelChange={(e) => setSelectedModel(e.target.value)}
          leftSidebarOpen={leftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          onToggleLeftSidebar={toggleLeftSidebar}
          onToggleRightSidebar={toggleRightSidebar}
          onClearChat={() => setNextStepClearSignal(Date.now())}
          availableModels={availableModels}
          onToggleConversationMenu={() => setToggleConvMenuSignal(Date.now())}
        />
        
        {/* 深度对话区域 - 直接显示，不需要tab切换 */}
        <Box sx={{ 
          flexGrow: 1, 
          px: 0, 
          py: 0,
          display: 'flex', 
          flexDirection: 'column',
          width: '100%',
          minHeight: 0
        }}>
          <NextStepChat selectedModel={selectedModel} clearSignal={nextStepClearSignal} externalToggleConversationMenuSignal={toggleConvMenuSignal} />
        </Box>
        
        {/* 认证相关弹窗 */}
        {isInitialized && (
          <>
            <UpgradePrompt />
            <MigrationPrompt />
          </>
        )}
      </Container>
    </ThemeProvider>
  );
};

export default App;