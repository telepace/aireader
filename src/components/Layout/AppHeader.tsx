import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MenuIcon from '@mui/icons-material/Menu';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import DeleteIcon from '@mui/icons-material/Delete';

interface AppHeaderProps {
  currentTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  selectedModel: string;
  onModelChange: (event: SelectChangeEvent<string>) => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  darkMode: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onToggleDarkMode: () => void;
  onClearChat: () => void;
  availableModels: string[];
}

/**
 * Renders the application header component.
 *
 * The AppHeader component displays navigation elements including tab selection, model selection, and sidebar toggle buttons.
 * It utilizes various props to manage the current state of the application, such as the currently selected tab, model, and sidebar visibility.
 * The component also provides functionality to toggle dark mode and clear the chat, enhancing user interaction.
 *
 * @param {Object} props - The properties for the AppHeader component.
 * @param {string} props.currentTab - The currently selected tab.
 * @param {function} props.onTabChange - Callback function to handle tab changes.
 * @param {string} props.selectedModel - The currently selected model.
 * @param {function} props.onModelChange - Callback function to handle model changes.
 * @param {boolean} props.leftSidebarOpen - Indicates if the left sidebar is open.
 * @param {boolean} props.rightSidebarOpen - Indicates if the right sidebar is open.
 * @param {boolean} props.darkMode - Indicates if dark mode is enabled.
 * @param {function} props.onToggleLeftSidebar - Callback function to toggle the left sidebar.
 * @param {function} props.onToggleRightSidebar - Callback function to toggle the right sidebar.
 * @param {function} props.onToggleDarkMode - Callback function to toggle dark mode.
 * @param {function} props.onClearChat - Callback function to clear the chat.
 * @param {Array<string>} props.availableModels - List of available models for selection.
 */
const AppHeader: React.FC<AppHeaderProps> = ({
  currentTab,
  onTabChange,
  selectedModel,
  onModelChange,
  leftSidebarOpen,
  rightSidebarOpen,
  darkMode,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onToggleDarkMode,
  onClearChat,
  availableModels
}) => {
  return (
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
        <IconButton onClick={onToggleLeftSidebar} size="small" sx={{ mr: 1 }}>
          {leftSidebarOpen ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
        <Typography variant="h5" component="h1">Prompt Tester</Typography>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <IconButton onClick={onToggleDarkMode} size="small" sx={{ mr: 2 }} title={darkMode ? "切换到亮色模式" : "切换到深色模式"}>
          {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
        <IconButton onClick={onClearChat} size="small" sx={{ mr: 2 }} title="清空探索聊天">
          <DeleteIcon />
        </IconButton>
        <Tabs value={currentTab} onChange={onTabChange} sx={{ mr: 2 }}>
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
            onChange={onModelChange}
          >
            {availableModels.map(model => (
              <MenuItem key={model} value={model}>{model}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <IconButton onClick={onToggleRightSidebar} size="small">
          {rightSidebarOpen ? <ChevronRightIcon /> : <MenuIcon />}
        </IconButton>
      </Box>
    </Box>
  );
};

export default AppHeader;