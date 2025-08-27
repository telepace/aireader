import { useState, useEffect } from 'react';
import {
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Box
} from '@mui/material';
import { usePromptTest } from './hooks/usePromptTest';
import { useUIState } from './hooks/useUIState';
import { useModelSelection } from './hooks/useModelSelection';
import { generateContent, createUserSession, logUserEvent, flushTraces } from './services/api-with-tracing';
import AppHeader from './components/Layout/AppHeader';
import TabPanel from './components/Layout/TabPanel';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import SavedTests from './components/SavedTests';
import NextStepChat from './components/NextStepChat';
import { UserSession } from './types/types';
import './utils/langfuse-test'; // Auto-validates Langfuse integration in development
import './App.css';

/**
 * Main application component that manages the user interface and state.
 *
 * This component utilizes various hooks to manage state, including the current tab, prompt object, and loading status. It initializes the user session, handles tab changes, content generation, and model selection, while providing a theme based on user preferences. The application is structured to ensure a seamless user experience with dynamic updates based on user interactions and logs user events for analytics.
 *
 * @returns A React element representing the application interface.
 */
const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [nextStepClearSignal, setNextStepClearSignal] = useState<number>(0);
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  const {
    promptObject,
    setPromptObject,
    promptText,
    setPromptText,
    promptResult,
    setPromptResult,
    isLoading,
    setIsLoading,
    loadPromptTest
  } = usePromptTest();

  const {
    leftSidebarOpen,
    rightSidebarOpen,
    toggleLeftSidebar,
    toggleRightSidebar
  } = useUIState();

  const { selectedModel, setSelectedModel, availableModels } = useModelSelection();

  // Initialize user session on app load
  useEffect(() => {
    const session = createUserSession();
    if (session) {
      setUserSession(session);
      logUserEvent('app-loaded', {
        sessionId: session.sessionId,
        timestamp: new Date().toISOString()
      }, session.userId);
    }
  }, []);

  // Flush traces before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (userSession) {
        logUserEvent('app-unload', {
          sessionId: userSession.sessionId,
          sessionDuration: Date.now() - new Date(userSession.startTime).getTime()
        }, userSession.userId);
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

  /**
   * Updates the current tab value on tab change.
   */
  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  /**
   * Handles the generation of content based on the provided prompt and model.
   * Now includes Langfuse tracing and user session tracking.
   *
   * The function checks for the presence of promptObject and promptText before proceeding. It sets a loading state and initializes the prompt result. It then calls the generateContent function with the promptObject, promptText, and selectedModel, along with user session information for tracing. Depending on the result, it updates the prompt result or handles errors, including specific messages for missing API keys. Finally, it resets the loading state.
   *
   * @returns {Promise<void>} A promise that resolves when the content generation process is complete.
   */
  const handleGenerate = async () => {
    if (!promptObject || !promptText) return;

    setIsLoading(true);
    setPromptResult('');

    // Log user event for analytics
    if (userSession) {
      logUserEvent('prompt-test-started', {
        sessionId: userSession.sessionId,
        model: selectedModel,
        promptLength: promptText.length,
        objectLength: promptObject.length
      }, userSession.userId);
    }

    try {
      const result = await generateContent(
        promptObject, 
        promptText, 
        selectedModel, 
        userSession?.userId
      );
      
      if (result) {
        setPromptResult(result);
        
        // Log successful generation
        if (userSession) {
          logUserEvent('prompt-test-completed', {
            sessionId: userSession.sessionId,
            model: selectedModel,
            success: true,
            responseLength: result.length
          }, userSession.userId);
        }
      } else {
        setPromptResult('API返回了空响应');
        
        // Log empty response
        if (userSession) {
          logUserEvent('prompt-test-failed', {
            sessionId: userSession.sessionId,
            model: selectedModel,
            error: 'empty_response'
          }, userSession.userId);
        }
      }
    } catch (error: any) {
      console.error('生成过程中发生错误:', error);
      
      // Log error
      if (userSession) {
        logUserEvent('prompt-test-failed', {
          sessionId: userSession.sessionId,
          model: selectedModel,
          error: error.message || String(error)
        }, userSession.userId);
      }
      
      if (error.message?.includes('未找到API密钥')) {
        setPromptResult(`❌ ${error.message}\n\n请在项目根目录创建.env文件并添加：\nREACT_APP_OPENROUTER_API_KEY=your_api_key_here\n\n💡 同时请配置Langfuse追踪（可选）：\nREACT_APP_LANGFUSE_SECRET_KEY=your_secret_key\nREACT_APP_LANGFUSE_PUBLIC_KEY=your_public_key\nREACT_APP_LANGFUSE_BASE_URL=https://cloud.langfuse.com`);
      } else {
        setPromptResult(`生成时出错: ${error instanceof Error ? error.message : String(error)}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the selection of a test by loading the prompt and setting the model and tab.
   */
  const handleSelectTest = (test: any) => {
    loadPromptTest(test);
    setSelectedModel(test.modelName);
    setCurrentTab(0);
  };

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
          currentTab={currentTab}
          onTabChange={handleTabChange}
          selectedModel={selectedModel}
          onModelChange={(e) => setSelectedModel(e.target.value)}
          leftSidebarOpen={leftSidebarOpen}
          rightSidebarOpen={rightSidebarOpen}
          onToggleLeftSidebar={toggleLeftSidebar}
          onToggleRightSidebar={toggleRightSidebar}
          onClearChat={() => setNextStepClearSignal(Date.now())}
          availableModels={availableModels}
        />
        
        <TabPanel value={currentTab} index={0} sx={{ p: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden', flexGrow: 1 }}>
          <Box sx={{ 
            width: { xs: '100%', md: '45%', lg: '40%' },
            px: { xs: 3, md: 4, lg: 6 }, 
            py: { xs: 3, md: 4, lg: 6 },
            display: 'flex', 
            flexDirection: 'column', 
            overflowY: 'auto',
            borderRight: { xs: 'none', md: '1px solid' },
            borderColor: { xs: 'transparent', md: 'divider' }
          }}>
            <InputPanel
              promptObject={promptObject}
              promptText={promptText}
              onPromptObjectChange={setPromptObject}
              onPromptTextChange={setPromptText}
              isLoading={isLoading}
              onGenerate={handleGenerate}
            />
          </Box>
          
          <Box sx={{ 
            width: { xs: '0%', md: '55%', lg: '60%' },
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            px: { md: 4, lg: 6 }, 
            py: { md: 4, lg: 6 },
            overflowY: 'auto'
          }}>
            <OutputPanel
              promptObject={promptObject}
              promptText={promptText}
              promptResult={promptResult}
              isLoading={isLoading}
              onGenerate={handleGenerate}
              selectedModel={selectedModel}
              onSave={(test) => {
                // Handle the saved test
              }}
            />
          </Box>
        </TabPanel>
        
        <TabPanel value={currentTab} index={1} sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
          <Box sx={{ 
            flexGrow: 1, 
            px: { xs: 3, md: 4, lg: 6 }, 
            py: { xs: 3, md: 4, lg: 6 },
            overflowY: 'auto',
            width: '100%'
          }}>
            <SavedTests onSelectTest={handleSelectTest} />
          </Box>
        </TabPanel>

        <TabPanel value={currentTab} index={2} sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
          <Box sx={{ 
            flexGrow: 1, 
            px: { xs: 3, md: 4, lg: 6 }, 
            py: { xs: 3, md: 4, lg: 6 },
            display: 'flex', 
            flexDirection: 'column',
            width: '100%'
          }}>
            <NextStepChat selectedModel={selectedModel} clearSignal={nextStepClearSignal} />
          </Box>
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
};

export default App;