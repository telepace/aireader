import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Button
} from '@mui/material';
import { UserStatus } from '../Auth';

interface AppHeaderProps {
  selectedModel: string;
  onModelChange: (event: SelectChangeEvent<string>) => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onClearChat: () => void;
  availableModels: string[];
  onToggleConversationMenu?: () => void;
}

/**
 * Renders the application header component.
 *
 * The AppHeader component displays navigation elements including the title and model selection.
 * It utilizes various props to manage the current state of the application, such as the currently selected model.
 * The component also provides functionality to clear the chat, enhancing user interaction.
 *
 * @param {Object} props - The properties for the AppHeader component.
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
  selectedModel,
  onModelChange,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  onClearChat,
  availableModels,
  onToggleConversationMenu
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        px: { xs: 4, md: 4, lg: 8 },
        py: 0,
        flexShrink: 0,
        backgroundColor: 'background.default',
        minHeight: '64px',
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

      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        {onToggleConversationMenu && (
          <Button variant="outlined" size="small" onClick={onToggleConversationMenu}>会话</Button>
        )}
        <FormControl sx={{ minWidth: { xs: 180, md: 220 } }} size="small">
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
        
        {/* 用户状态组件 */}
        <UserStatus />
      </Box>
    </Box>
  );
};

export default AppHeader;