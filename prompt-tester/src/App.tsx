import React, { useState, useEffect } from 'react';
import { Box, Container, Tab, Tabs, CssBaseline, ThemeProvider, createTheme, Select, MenuItem, FormControl, InputLabel, SelectChangeEvent, Typography, IconButton, Switch, FormControlLabel } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import InputPanel from './components/InputPanel';
import OutputPanel from './components/OutputPanel';
import ChatPanel from './components/ChatPanel';
import SavedTests from './components/SavedTests';
import { PromptTest } from './types/types';
import './App.css';
import NextStepChat from './components/NextStepChat';
import DeleteIcon from '@mui/icons-material/Delete';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
  sx?: object;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, sx, ...other } = props;

  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      sx={{
        flexGrow: 1,
        ...(sx || {}),
        display: value === index ? 'flex' : 'none',
        ...(value !== index ? { height: 0, minHeight: 0, p: 0, m: 0, overflow: 'hidden' } : {}),
      }}
      {...other}
    >
      {value === index ? children : null}
    </Box>
  );
}

const AVAILABLE_MODELS = [
  'openai/o4-mini',
  'openai/o3',
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.0-flash-001',
  'deepseek/deepseek-chat-v3-0324',
  'deepseek/deepseek-r1-0528'
];

const LOCAL_STORAGE_KEYS = {
  PROMPT_OBJECT: 'promptTester_promptObject',
  PROMPT_TEXT: 'promptTester_promptText',
  SELECTED_MODEL: 'promptTester_selectedModel',
  LEFT_SIDEBAR_OPEN: 'promptTester_leftSidebarOpen',
  RIGHT_SIDEBAR_OPEN: 'promptTester_rightSidebarOpen',
  DARK_MODE: 'promptTester_darkMode'
};

function App() {
  const [promptObject, setPromptObject] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_KEYS.PROMPT_OBJECT) || '');
  const [promptText, setPromptText] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_KEYS.PROMPT_TEXT) || '');
  const [promptResult, setPromptResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState(0);
  const [selectedPromptTest, setSelectedPromptTest] = useState<PromptTest | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(() => localStorage.getItem(LOCAL_STORAGE_KEYS.SELECTED_MODEL) || AVAILABLE_MODELS[0]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN) !== 'false'
  );
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN) !== 'false'
  );
  const [darkMode, setDarkMode] = useState<boolean>(() => 
    localStorage.getItem(LOCAL_STORAGE_KEYS.DARK_MODE) === 'true'
  );
  const [nextStepClearSignal, setNextStepClearSignal] = useState<number>(0);

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

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROMPT_OBJECT, promptObject);
  }, [promptObject]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROMPT_TEXT, promptText);
  }, [promptText]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SELECTED_MODEL, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEFT_SIDEBAR_OPEN, String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.RIGHT_SIDEBAR_OPEN, String(rightSidebarOpen));
  }, [rightSidebarOpen]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DARK_MODE, String(darkMode));
    // 为body添加data-theme属性以支持全局CSS的深色模式样式
    document.body.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleModelChange = (event: SelectChangeEvent<string>) => {
    setSelectedModel(event.target.value);
  };

  const toggleLeftSidebar = () => setLeftSidebarOpen(!leftSidebarOpen);
  const toggleRightSidebar = () => setRightSidebarOpen(!rightSidebarOpen);
  const toggleDarkMode = () => setDarkMode(!darkMode);

  const handleGenerate = async () => {
    if (!promptObject || !promptText) return;
    
    setIsLoading(true);
    setPromptResult(''); // Clear previous result
    setSelectedPromptTest(null);
    
    // 用于跟踪累积文本的引用
    const accumulatedTextRef = { current: '' };
    
    try {
      // 使用 API 服务的函数，而不是直接调用 API
      import('./services/api').then(async (api) => {
        try {
          // 使用非流式生成，然后分批更新UI
          const result = await api.generateContent(promptObject, promptText, selectedModel);
          
          if (result) {
            // 分批更新UI，模拟流式效果
            const lines = result.split('\n');
            let currentText = '';
            
            for (let i = 0; i < lines.length; i++) {
              currentText += lines[i] + '\n';
              
              // 每处理几行更新一次UI
              if (i % 3 === 0 || i === lines.length - 1) {
                accumulatedTextRef.current = currentText;
                
                // 使用延迟模拟渐进效果
                await new Promise(resolve => {
                  setTimeout(() => {
                    setPromptResult(accumulatedTextRef.current);
                    resolve(null);
                  }, 10);
                });
              }
            }
          } else {
            setPromptResult('API返回了空响应');
          }
        } catch (error: any) {
          console.error('生成过程中发生错误:', error);
          if (error.message && error.message.includes('未找到API密钥')) {
            setPromptResult(`❌ ${error.message}\n\n请在项目根目录创建.env文件并添加：\nREACT_APP_OPENROUTER_API_KEY=your_api_key_here`);
          } else {
            setPromptResult(`生成时出错: ${error instanceof Error ? error.message : String(error)}`);
          }
        } finally {
          setIsLoading(false);
        }
      });
    } catch (error: any) {
      console.error('加载API模块时出错:', error);
      setPromptResult(`加载API模块时出错: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };

  const handleSelectTest = (test: PromptTest) => {
    setPromptObject(test.promptObject);
    setPromptText(test.promptText);
    setPromptResult(test.promptResult);
    setSelectedPromptTest(test);
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
          overflow: 'auto', // enable scrolling inside main container
          minHeight: 0
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderBottom: 1, 
            borderColor: 'divider', 
            px: 2,
            py: 1,
            flexShrink: 0
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={toggleLeftSidebar} size="small" sx={{ mr: 1 }}>
              {leftSidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
            </IconButton>
            <Typography variant="h5" component="h1">Prompt Tester</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={toggleDarkMode} size="small" sx={{ mr: 2 }} title={darkMode ? "切换到亮色模式" : "切换到深色模式"}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
            <IconButton onClick={() => setNextStepClearSignal(Date.now())} size="small" sx={{ mr: 2 }} title="清空探索聊天">
              <DeleteIcon />
            </IconButton>
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ mr: 2 }}>
              <Tab label="提示测试" />
              <Tab label="已保存测试" />
              <Tab label="探索聊天" />
            </Tabs>
            <FormControl sx={{ minWidth: 250, mr: 1 }} size="small">
              <InputLabel id="model-select-label">选择模型</InputLabel>
              <Select
                labelId="model-select-label"
                id="model-select"
                value={selectedModel}
                label="选择模型"
                onChange={handleModelChange}
              >
                {AVAILABLE_MODELS.map(model => (
                  <MenuItem key={model} value={model}>{model}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={toggleRightSidebar} size="small">
              {rightSidebarOpen ? <ChevronRightIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Box>
        
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
              onSave={(test) => setSelectedPromptTest(test)}
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
}

export default App;
