import React, { useState } from 'react';
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
    setSelectedPromptTest,
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
        main: '#000000',
      },
      secondary: {
        main: '#8FBC8F',
      },
      background: {
        default: darkMode ? '#121212' : '#ffffff',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
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

  const sidebarWidth = 300;
  const rightSidebarWidth = 500;
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
          overflow: 'auto',
          minHeight: 0
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
        
        <TabPanel value={currentTab} index={0} sx={{ p: 1, display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
          <Box
            sx={{
              width: leftSidebarOpen ? sidebarWidth : 0,
              minWidth: leftSidebarOpen ? sidebarWidth : 0,
              overflow: 'hidden',
              transition: `width ${transitionDuration}, min-width ${transitionDuration}`,
              borderRight: leftSidebarOpen ? `1px solid ${theme.palette.divider}` : 'none',
              display: 'flex', 
              flexDirection: 'column' 
            }}
          >
            <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <InputPanel
                promptObject={promptObject}
                promptText={promptText}
                onPromptObjectChange={setPromptObject}
                onPromptTextChange={setPromptText}
                darkMode={darkMode}
              />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, p: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <OutputPanel
              promptObject={promptObject}
              promptText={promptText}
              promptResult={promptResult}
              isLoading={isLoading}
              onGenerate={handleGenerate}
              selectedModel={selectedModel}
              onSave={(test) => {
                // Handle the saved test - could be used for notifications or updates
                console.log('Test saved:', test);
              }}
              darkMode={darkMode}
            />
          </Box>

          <Box
            sx={{
              width: rightSidebarOpen ? rightSidebarWidth : 0,
              minWidth: rightSidebarOpen ? rightSidebarWidth : 0,
              overflow: 'hidden',
              transition: `width ${transitionDuration}, min-width ${transitionDuration}`,
              borderLeft: rightSidebarOpen ? `1px solid ${theme.palette.divider}` : 'none',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <Box sx={{ p: 1, flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <ChatPanel
                promptTest={selectedPromptTest}
                selectedModel={selectedModel}
                darkMode={darkMode}
              />
            </Box>
          </Box>
        </TabPanel>
        
        <TabPanel value={currentTab} index={1} sx={{ p: 2 }}>
          <SavedTests onSelectTest={handleSelectTest} darkMode={darkMode} />
        </TabPanel>

        <TabPanel value={currentTab} index={2} sx={{ p: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <NextStepChat selectedModel={selectedModel} clearSignal={nextStepClearSignal} />
          </Box>
        </TabPanel>
      </Container>
    </ThemeProvider>
  );
};

export default App;