import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Menu, 
  MenuItem, 
  Fade,
  IconButton,
  Tooltip
} from '@mui/material';
import { KeyboardArrowDown, Book, Chat } from '@mui/icons-material';
import { ChatConversation, ChatMessage } from '../../types/types';

interface ConversationButtonProps {
  /** 当前会话 */
  currentConversation?: ChatConversation;
  /** 所有会话列表 */
  conversations: ChatConversation[];
  /** 菜单是否打开 */
  menuOpen: boolean;
  /** 菜单锚点元素 */
  anchorEl: HTMLElement | null | undefined;
  /** 打开菜单回调 */
  onMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  /** 关闭菜单回调 */
  onMenuClose: () => void;
  /** 创建新会话回调 */
  onNewConversation: () => void;
  /** 选择会话回调 */
  onSelectConversation: (conversation: ChatConversation) => void;
  /** 删除会话回调 */
  onDeleteConversation: (id: string) => void;
}

/**
 * 获取会话的显示标题
 */
const getConversationTitle = (conversation: ChatConversation): string => {
  if (conversation.title && conversation.title !== '新会话') {
    return conversation.title;
  }
  
  // 从第一个用户消息中提取书名或主题
  const firstUserMessage = conversation.messages?.find((m: ChatMessage) => m.role === 'user');
  if (firstUserMessage?.content) {
    const content = firstUserMessage.content.trim();
    // 简单的书名提取逻辑
    const bookMatch = content.match(/《(.+?)》|"(.+?)"|【(.+?)】/);
    if (bookMatch) {
      return bookMatch[1] || bookMatch[2] || bookMatch[3];
    }
    // 如果没有找到明显的书名标记，返回前15个字符
    return content.length > 15 ? content.slice(0, 15) + '...' : content;
  }
  
  return '新会话';
};

/**
 * 获取会话的副标题（更多上下文信息）
 */
const getConversationSubtitle = (conversation: ChatConversation): string => {
  const messageCount = conversation.messages?.filter(m => m.role === 'user').length || 0;
  if (messageCount === 0) return '尚未开始';
  if (messageCount === 1) return '刚刚开始';
  return `${messageCount} 个话题`;
};

/**
 * 优雅的会话按钮组件
 * 集成了当前阅读书籍显示和会话管理功能
 */
const ConversationButton: React.FC<ConversationButtonProps> = ({
  currentConversation,
  conversations,
  menuOpen,
  anchorEl,
  onMenuOpen,
  onMenuClose,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const currentTitle = currentConversation ? getConversationTitle(currentConversation) : '选择会话';
  const currentSubtitle = currentConversation ? getConversationSubtitle(currentConversation) : '';
  
  // 按钮内容是否过长，需要tooltip
  const [needsTooltip, setNeedsTooltip] = useState(false);
  
  useEffect(() => {
    // 检查文本是否被截断，如果是则显示tooltip
    if (buttonRef.current) {
      const button = buttonRef.current;
      const titleElement = button.querySelector('[data-title]') as HTMLElement;
      if (titleElement) {
        setNeedsTooltip(titleElement.scrollWidth > titleElement.clientWidth);
      }
    }
  }, [currentTitle]);

  const buttonContent = (
    <Button
      ref={buttonRef}
      variant="outlined"
      onClick={onMenuOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      endIcon={
        <KeyboardArrowDown 
          sx={{ 
            transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            ml: 0.5
          }}
        />
      }
      sx={{
        minWidth: 160,
        maxWidth: 240,
        height: 44,
        borderColor: 'divider',
        color: 'text.primary',
        backgroundColor: menuOpen ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
        borderRadius: 2,
        px: 2,
        py: 1,
        textTransform: 'none',
        justifyContent: 'space-between',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          borderColor: isHovered ? 'primary.main' : 'divider',
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
        },
        '&:active': {
          transform: 'translateY(0px)'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'flex-start',
        minWidth: 0,
        flex: 1
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          width: '100%',
          minWidth: 0
        }}>
          <Book sx={{ 
            fontSize: 16, 
            mr: 1, 
            color: currentConversation ? 'primary.main' : 'text.secondary',
            opacity: currentConversation ? 1 : 0.7
          }} />
          <Typography
            data-title
            variant="body2"
            sx={{
              fontWeight: 600,
              fontSize: '0.875rem',
              lineHeight: 1.2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left'
            }}
          >
            {currentTitle}
          </Typography>
        </Box>
        {currentSubtitle && (
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.75rem',
              color: 'text.secondary',
              lineHeight: 1,
              mt: 0.25,
              ml: 3,
              opacity: 0.8
            }}
          >
            {currentSubtitle}
          </Typography>
        )}
      </Box>
    </Button>
  );

  return (
    <>
      {needsTooltip ? (
        <Tooltip 
          title={currentTitle}
          placement="bottom"
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 200 }}
        >
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}

      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={onMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 200 }}
        slotProps={{ 
          paper: { 
            sx: { 
              mt: 1, 
              width: 320, 
              maxHeight: 400, 
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              overflow: 'hidden'
            } 
          } 
        }}
      >
        {/* 新建会话按钮 */}
        <MenuItem 
          onClick={() => {
            onNewConversation();
            onMenuClose();
          }}
          sx={{ 
            py: 1.5,
            px: 2,
            backgroundColor: 'rgba(25, 118, 210, 0.08)',
            '&:hover': {
              backgroundColor: 'rgba(25, 118, 210, 0.12)'
            }
          }}
        >
          <Chat sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
            新建会话
          </Typography>
        </MenuItem>

        {/* 分隔线 */}
        <Box sx={{ height: 1, backgroundColor: 'divider', my: 0.5 }} />

        {/* 会话列表 */}
        <Box sx={{ maxHeight: 280, overflowY: 'auto' }}>
          {conversations.map((conversation) => {
            const isActive = currentConversation?.id === conversation.id;
            const title = getConversationTitle(conversation);
            const subtitle = getConversationSubtitle(conversation);
            
            return (
              <MenuItem
                key={conversation.id}
                onClick={() => {
                  onSelectConversation(conversation);
                  onMenuClose();
                }}
                sx={{
                  py: 1.5,
                  px: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  backgroundColor: isActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  borderLeft: isActive ? '3px solid' : '3px solid transparent',
                  borderLeftColor: isActive ? 'primary.main' : 'transparent',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <Book sx={{ 
                  fontSize: 18, 
                  color: isActive ? 'primary.main' : 'text.secondary',
                  mt: 0.25,
                  flexShrink: 0
                }} />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.875rem',
                      lineHeight: 1.3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: isActive ? 'primary.main' : 'text.primary'
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: 'text.secondary',
                      fontSize: '0.75rem',
                      lineHeight: 1.2,
                      mt: 0.25,
                      display: 'block'
                    }}
                  >
                    {subtitle}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                  sx={{
                    opacity: 0.6,
                    '&:hover': {
                      opacity: 1,
                      color: 'error.main'
                    }
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
                    删除
                  </Typography>
                </IconButton>
              </MenuItem>
            );
          })}
        </Box>

        {conversations.length === 0 && (
          <Box sx={{ py: 3, px: 2, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              还没有会话记录
            </Typography>
          </Box>
        )}
      </Menu>
    </>
  );
};

export default ConversationButton;