import React from 'react';
import {
  Box,
  Typography,
  SelectChangeEvent,
  Button
} from '@mui/material';
import ConversationButton from './ConversationButton';
import { ChatConversation } from '../../types/types';

interface AppHeaderProps {
  selectedModel: string;
  onModelChange: (event: SelectChangeEvent<string>) => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
  onClearChat: () => void;
  availableModels: string[];
  onToggleConversationMenu?: (event: React.MouseEvent<HTMLElement>) => void;
  showConcurrentTest?: boolean;
  onToggleConcurrentTest?: () => void;
  // 新增会话管理相关属性
  currentConversation?: ChatConversation;
  conversations?: ChatConversation[];
  conversationMenuOpen?: boolean;
  conversationMenuAnchorEl?: HTMLElement | null;
  onConversationMenuClose?: () => void;
  onNewConversation?: () => void;
  onSelectConversation?: (conversation: ChatConversation) => void;
  onDeleteConversation?: (id: string) => void;
}

/**
 * Renders the application header component with navigation elements.
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
 * @param {function} props.onToggleConversationMenu - Callback function to toggle the conversation menu.
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
  onToggleConversationMenu,
  showConcurrentTest,
  onToggleConcurrentTest,
  currentConversation,
  conversations = [],
  conversationMenuOpen = false,
  conversationMenuAnchorEl,
  onConversationMenuClose,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation
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
            DopaRead
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {onToggleConversationMenu && onConversationMenuClose && onNewConversation && onSelectConversation && onDeleteConversation && (
            <ConversationButton
              currentConversation={currentConversation}
              conversations={conversations}
              menuOpen={conversationMenuOpen}
              anchorEl={conversationMenuAnchorEl}
              onMenuOpen={onToggleConversationMenu}
              onMenuClose={onConversationMenuClose}
              onNewConversation={onNewConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={onDeleteConversation}
            />
          )}
          {onToggleConcurrentTest && (
            <Button 
              variant="outlined" 
              size="small" 
              onClick={onToggleConcurrentTest}
              sx={{ 
                borderColor: 'divider', 
                color: showConcurrentTest ? 'primary.main' : 'text.secondary', 
                '&:hover': { borderColor: 'divider' },
                fontSize: '0.75rem',
                px: 1.5,
                opacity: 0.7
              }}
            >
              并发测试
            </Button>
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