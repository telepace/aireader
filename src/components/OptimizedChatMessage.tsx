/**
 * 优化的聊天消息组件
 * 使用React.memo、useMemo等优化渲染性能
 */

import React, { memo, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Person as PersonIcon,
  SmartToy as SmartToyIcon,
  Settings as SettingsIcon,
  Memory as MemoryIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { splitContentAndOptions } from '../utils/contentSplitter';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    tokens?: number;
    important?: boolean;
    hasOptions?: boolean;
    processingTime?: number;
  };
}

interface OptimizedChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
  showMetadata?: boolean;
  onMarkImportant?: (messageId: string) => void;
  className?: string;
}

/**
 * 获取角色对应的图标和颜色
 */
function getRoleConfig(role: string) {
  switch (role) {
    case 'user':
      return {
        icon: <PersonIcon />,
        color: '#1976d2',
        bgColor: '#e3f2fd',
        label: '用户'
      };
    case 'assistant':
      return {
        icon: <SmartToyIcon />,
        color: '#388e3c',
        bgColor: '#e8f5e8',
        label: '助手'
      };
    case 'system':
      return {
        icon: <SettingsIcon />,
        color: '#f57c00',
        bgColor: '#fff3e0',
        label: '系统'
      };
    default:
      return {
        icon: <SmartToyIcon />,
        color: '#757575',
        bgColor: '#f5f5f5',
        label: '未知'
      };
  }
}

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  
  if (diffMinutes < 1) return '刚刚';
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}小时前`;
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 优化的聊天消息组件
 * 使用React.memo避免不必要的重新渲染
 */
const OptimizedChatMessage = memo<OptimizedChatMessageProps>(({
  message,
  isStreaming = false,
  showMetadata = false,
  onMarkImportant,
  className
}) => {
  // 使用useMemo缓存角色配置，避免每次渲染都重新计算
  const roleConfig = useMemo(() => getRoleConfig(message.role), [message.role]);

  // 使用useMemo缓存内容解析结果
  const { main, options } = useMemo(() => {
    if (message.role === 'user') {
      return { main: message.content, options: [] };
    }
    return splitContentAndOptions(message.content);
  }, [message.content, message.role]);

  // 缓存格式化的时间戳
  const formattedTime = useMemo(() => formatTimestamp(message.timestamp), [message.timestamp]);

  // 缓存metadata计算
  const metadata = useMemo(() => {
    if (!showMetadata || !message.metadata) return null;

    const { tokens, important, hasOptions, processingTime } = message.metadata;
    return {
      tokens,
      important,
      hasOptions: hasOptions || options.length > 0,
      processingTime
    };
  }, [message.metadata, options.length, showMetadata]);

  return (
    <Paper
      elevation={1}
      className={className}
      sx={{
        p: 2,
        mb: 2,
        backgroundColor: roleConfig.bgColor,
        border: `1px solid ${roleConfig.color}20`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          elevation: 2,
          transform: 'translateY(-1px)'
        }
      }}
    >
      {/* 消息头部 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: roleConfig.color,
            width: 32,
            height: 32,
            mr: 2
          }}
        >
          {roleConfig.icon}
        </Avatar>
        
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" sx={{ color: roleConfig.color, fontWeight: 600 }}>
            {roleConfig.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formattedTime}
          </Typography>
        </Box>

        {/* 元数据标签 */}
        {metadata && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {metadata.important && (
              <Chip
                label="重要"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ height: 20 }}
              />
            )}
            {metadata.hasOptions && (
              <Chip
                label={`${options.length}个选项`}
                size="small"
                color="info"
                variant="outlined"
                sx={{ height: 20 }}
              />
            )}
            {metadata.tokens && (
              <Tooltip title={`Token数量: ${metadata.tokens}`}>
                <Chip
                  icon={<MemoryIcon sx={{ fontSize: 14 }} />}
                  label={metadata.tokens}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              </Tooltip>
            )}
            {metadata.processingTime && (
              <Tooltip title={`处理时间: ${metadata.processingTime}ms`}>
                <Chip
                  icon={<SpeedIcon sx={{ fontSize: 14 }} />}
                  label={`${metadata.processingTime}ms`}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20 }}
                />
              </Tooltip>
            )}
          </Box>
        )}

        {/* 操作按钮 */}
        {onMarkImportant && (
          <Tooltip title="标记为重要">
            <IconButton
              size="small"
              onClick={() => onMarkImportant(message.id)}
              sx={{ ml: 1 }}
            >
              <MemoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* 消息内容 */}
      <Box sx={{ ml: 5 }}>
        {message.role === 'user' ? (
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '0.95rem',
              lineHeight: 1.6
            }}
          >
            {message.content}
          </Typography>
        ) : (
          <Box>
            <ReactMarkdown
              components={{
                // 优化代码块渲染
                code: ({ node, inline, children, ...props }: any) => (
                  <Box
                    component={inline ? 'code' : 'pre'}
                    sx={{
                      backgroundColor: inline ? '#f5f5f5' : '#f8f9fa',
                      padding: inline ? '2px 4px' : '12px',
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                      overflow: 'auto',
                      ...(inline ? {} : { my: 1 })
                    }}
                  >
                    {children}
                  </Box>
                ),
                // 优化链接渲染
                a: ({ href, children }: any) => (
                  <Box
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {children}
                  </Box>
                )
              }}
            >
              {main}
            </ReactMarkdown>
            
            {/* 流式输入指示器 */}
            {isStreaming && (
              <Box sx={{ display: 'inline-flex', alignItems: 'center', ml: 1 }}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    backgroundColor: 'primary.main',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* CSS动画 - 移动到全局样式或使用MUI的样式方案 */}
    </Paper>
  );
});

OptimizedChatMessage.displayName = 'OptimizedChatMessage';

export default OptimizedChatMessage;

/**
 * 消息列表性能优化包装器
 */
interface MessageListProps {
  messages: ChatMessage[];
  showMetadata?: boolean;
  onMarkImportant?: (messageId: string) => void;
  isStreaming?: boolean;
  streamingMessageId?: string;
  maxHeight?: number;
  enableVirtualization?: boolean;
}

export const OptimizedMessageList = memo<MessageListProps>(({
  messages,
  showMetadata = false,
  onMarkImportant,
  isStreaming = false,
  streamingMessageId,
  maxHeight = 600,
  enableVirtualization = false
}) => {
  // 过滤系统消息（通常不需要显示给用户）
  const visibleMessages = useMemo(() => 
    messages.filter(m => m.role !== 'system'),
    [messages]
  );

  // TODO: 实现虚拟化渲染（当消息数量很大时）
  if (enableVirtualization && visibleMessages.length > 50) {
    // 这里可以使用react-window或react-virtualized
    // 目前先使用简单的滚动容器
  }

  return (
    <Box
      sx={{
        maxHeight,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: '#f1f1f1',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: '#c1c1c1',
          borderRadius: '3px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          backgroundColor: '#a8a8a8',
        },
      }}
    >
      {visibleMessages.map((message) => (
        <OptimizedChatMessage
          key={message.id}
          message={message}
          showMetadata={showMetadata}
          onMarkImportant={onMarkImportant}
          isStreaming={isStreaming && streamingMessageId === message.id}
        />
      ))}
    </Box>
  );
});

OptimizedMessageList.displayName = 'OptimizedMessageList';