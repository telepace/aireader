import { useState } from 'react';
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
import { generateContent } from './services/api';
import AppHeader from './components/Layout/AppHeader';
import TabPanel from './components/Layout/TabPanel';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ChatPanel from './components/ChatPanel';
import SavedTests from './components/SavedTests';
import NextStepChat from './components/NextStepChat';
import './App.css';

/**
 * Main application component that manages the user interface and state.
 *
 * This component utilizes various hooks to manage state, including the current tab, prompt object, and loading status. It renders a responsive layout with sidebars and different panels for input, output, and saved tests. The component also handles tab changes, content generation, and model selection, while providing a theme based on user preferences. The application is structured to ensure a seamless user experience with dynamic updates based on user interactions.
 *
 * @returns A React element representing the application interface.
 */
const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [nextStepClearSignal, setNextStepClearSignal] = useState<number>(0);

  const {
    promptObject,
    setPromptObject,
    promptText,
    setPromptText,
    promptResult,
    setPromptResult,
    isLoading,
    setIsLoading,
    selectedPromptTest,
    loadPromptTest
  } = usePromptTest();

  const {
    leftSidebarOpen,
    rightSidebarOpen,
    darkMode,
    toggleLeftSidebar,
    toggleRightSidebar,
    toggleDarkMode
  } = useUIState();

  const { selectedModel, setSelectedModel, availableModels } = useModelSelection();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff'
      },
      secondary: {
        main: '#06b6d4',
        light: '#67e8f9',
        dark: '#0891b2',
        contrastText: '#ffffff'
      },
      background: {
        default: darkMode ? '#0f172a' : '#fafafa',
        paper: darkMode ? '#1e293b' : '#ffffff',
      },
      text: {
        primary: darkMode ? '#f1f5f9' : '#1e293b',
        secondary: darkMode ? '#94a3b8' : '#64748b',
      },
      divider: darkMode ? '#334155' : '#e2e8f0',
      success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669'
      },
      warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706'
      },
      error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626'
      },
      info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb'
      }
    },
    typography: {
      fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      h1: {
        fontWeight: 800,
        fontSize: '2.5rem',
        lineHeight: 1.2,
        letterSpacing: '-0.025em'
      },
      h2: {
        fontWeight: 700,
        fontSize: '2rem',
        lineHeight: 1.3,
        letterSpacing: '-0.025em'
      },
      h3: {
        fontWeight: 600,
        fontSize: '1.75rem',
        lineHeight: 1.3,
        letterSpacing: '-0.02em'
      },
      h4: {
        fontWeight: 600,
        fontSize: '1.5rem',
        lineHeight: 1.4,
        letterSpacing: '-0.015em'
      },
      h5: {
        fontWeight: 600,
        fontSize: '1.25rem',
        lineHeight: 1.4,
        letterSpacing: '-0.01em'
      },
      h6: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.5,
        letterSpacing: '-0.005em'
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
        letterSpacing: 0
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.6,
        letterSpacing: 0
      }
    },
    shape: {
      borderRadius: 12
    },
    shadows: [
      'none',
      '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
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
                  borderColor: darkMode ? '#475569' : '#cbd5e1'
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
   *
   * The function checks for the presence of promptObject and promptText before proceeding. It sets a loading state and initializes the prompt result. It then calls the generateContent function with the promptObject, promptText, and selectedModel. Depending on the result, it updates the prompt result or handles errors, including specific messages for missing API keys. Finally, it resets the loading state.
   *
   * @returns {Promise<void>} A promise that resolves when the content generation process is complete.
   */
  const handleGenerate = async () => {
    if (!promptObject || !promptText) return;

    setIsLoading(true);
    setPromptResult('');

    try {
      const result = await generateContent(promptObject, promptText, selectedModel);
      if (result) {
        setPromptResult(result);
      } else {
        setPromptResult('API返回了空响应');
      }
    } catch (error: any) {
      console.error('生成过程中发生错误:', error);
      if (error.message?.includes('未找到API密钥')) {
        setPromptResult(`❌ ${error.message}\n\n请在项目根目录创建.env文件并添加：\nREACT_APP_OPENROUTER_API_KEY=your_api_key_here`);
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

  const sidebarWidth = 320;
  const rightSidebarWidth = 480;
  const transitionDuration = '0.3s';

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
          darkMode={darkMode}
          onToggleLeftSidebar={toggleLeftSidebar}
          onToggleRightSidebar={toggleRightSidebar}
          onToggleDarkMode={toggleDarkMode}
          onClearChat={() => setNextStepClearSignal(Date.now())}
          availableModels={availableModels}
        />
        
        <TabPanel value={currentTab} index={0} sx={{ p: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden', flexGrow: 1, gap: 0 }}>
          <Box
            sx={{
              width: leftSidebarOpen ? sidebarWidth : 0,
              minWidth: leftSidebarOpen ? sidebarWidth : 0,
              overflow: 'hidden',
              transition: `width ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1), min-width ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
              borderRight: leftSidebarOpen ? `1px solid ${theme.palette.divider}` : 'none',
              display: 'flex', 
              flexDirection: 'column',
              bgcolor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 2 }}>
              <InputPanel
                promptObject={promptObject}
                promptText={promptText}
                onPromptObjectChange={setPromptObject}
                onPromptTextChange={setPromptText}
                darkMode={darkMode}
              />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, p: 3, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 2 }}>
            <OutputPanel
              promptObject={promptObject}
              promptText={promptText}
              promptResult={promptResult}
              isLoading={isLoading}
              onGenerate={handleGenerate}
              selectedModel={selectedModel}
              onSave={(test) => {
                // Handle the saved test - could be used for notifications or updates
              }}
              darkMode={darkMode}
            />
          </Box>

          <Box
            sx={{
              width: rightSidebarOpen ? rightSidebarWidth : 0,
              minWidth: rightSidebarOpen ? rightSidebarWidth : 0,
              overflow: 'hidden',
              transition: `width ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1), min-width ${transitionDuration} cubic-bezier(0.4, 0, 0.2, 1)`,
              borderLeft: rightSidebarOpen ? `1px solid ${theme.palette.divider}` : 'none',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(248, 250, 252, 0.8)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', gap: 2 }}>
              <ChatPanel
                promptTest={selectedPromptTest}
                selectedModel={selectedModel}
                darkMode={darkMode}
              />
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel value={currentTab} index={1} sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
          <SavedTests onSelectTest={handleSelectTest} darkMode={darkMode} />
        </TabPanel>

        <TabPanel value={currentTab} index={2} sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', flexGrow: 1 }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <NextStepChat selectedModel={selectedModel} clearSignal={nextStepClearSignal} />
          </Box>
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
};

export default App;