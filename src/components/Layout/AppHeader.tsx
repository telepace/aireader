import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';

interface AppHeaderProps {
  currentTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  selectedModel: string;
  onModelChange: (event: SelectChangeEvent<string>) => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onClearChat: () => void;
  availableModels: string[];
}

/**
 * Renders the application header component.
 *
 * The AppHeader component displays navigation elements including tab selection, model selection, and sidebar toggle buttons.
 * It utilizes various props to manage the current state of the application, such as the currently selected tab, model, and sidebar visibility.
 * The component also provides functionality to clear the chat, enhancing user interaction.
 *
 * @param {Object} props - The properties for the AppHeader component.
 * @param {string} props.currentTab - The currently selected tab.
 * @param {function} props.onTabChange - Callback function to handle tab changes.
 * @param {string} props.selectedModel - The currently selected model.
 * @param {function} props.onModelChange - Callback function to handle model changes.
 * @param {boolean} props.leftSidebarOpen - Indicates if the left sidebar is open.
 * @param {boolean} props.rightSidebarOpen - Indicates if the right sidebar is open.
 * @param {function} props.onToggleLeftSidebar - Callback function to toggle the left sidebar.
 * @param {function} props.onToggleRightSidebar - Callback function to toggle the right sidebar.
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
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onClearChat,
  availableModels
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        px: { xs: 4, md: 8, lg: 12 },
        py: { xs: 3, md: 4 },
        flexShrink: 0,
        backgroundColor: 'background.default',
        minHeight: '80px',
        backdropFilter: 'blur(20px)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 4, md: 6 } }}>
        <Typography 
          variant="h1" 
          component="h1"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: { xs: '1.375rem', md: '1.75rem' },
            letterSpacing: '-0.03em'
          }}
        >
          AI Reader
        </Typography>
        <Tabs 
          value={currentTab} 
          onChange={onTabChange} 
          sx={{ 
            '& .MuiTabs-indicator': {
              backgroundColor: 'text.primary',
              height: '3px',
              borderRadius: '3px'
            },
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: { xs: '0.95rem', md: '1rem' },
              color: 'text.secondary',
              px: { xs: 2, md: 3 },
              py: 2,
              minHeight: 48,
              '&.Mui-selected': {
                color: 'text.primary',
                fontWeight: 600
              },
              '&:hover': {
                color: 'text.primary',
                opacity: 0.8
              },
              transition: 'all 0.2s ease'
            }
          }}
        >
          <Tab label="智能分析" />
          <Tab label="历史记录" />
          <Tab label="深度对话" />
        </Tabs>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <FormControl sx={{ minWidth: { xs: 180, md: 220 } }} size="medium">
          <Select
            value={selectedModel}
            onChange={onModelChange}
            displayEmpty
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                fontSize: { xs: '0.875rem', md: '0.95rem' },
                '& fieldset': {
                  border: '1px solid rgba(0, 0, 0, 0.12)'
                },
                '&:hover fieldset': {
                  border: '1px solid rgba(0, 0, 0, 0.2)'
                },
                '&.Mui-focused fieldset': {
                  border: '1px solid rgba(0, 0, 0, 0.3)',
                  borderWidth: '2px'
                }
              }
            }}
          >
            {availableModels.map(model => (
              <MenuItem key={model} value={model}>{model}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};

export default AppHeader;