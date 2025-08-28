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
        alignItems: 'stretch',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        px: 0,
        py: 0,
        flexShrink: 0,
        backgroundColor: 'background.paper',
        minHeight: '64px'
      }}
    >
      {/* 左列：AI Reader + 操作按钮 */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 3, pl: { xs: 4, md: 4, lg: 8 } }}>
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
          {/* 模型选择暂时隐藏 */}
        </Box>
      </Box>

      {/* 右列：与右侧内容栏对齐的 Next Step 标题 */}
      <Box sx={{ width: '30%', minWidth: 360, maxWidth: 480, display: 'flex', alignItems: 'center', borderLeft: 1, borderColor: 'divider', pl: 5 }}>
        <Typography 
          variant="h1"
          component="h2"
          sx={{
            fontWeight: 700,
            color: 'text.primary',
            fontSize: { xs: '1.375rem', md: '1.75rem' },
            letterSpacing: '-0.03em'
          }}
        >
          Next Step
        </Typography>
      </Box>
    </Box>
  );
};

export default AppHeader;