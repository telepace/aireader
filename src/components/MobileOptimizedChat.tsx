import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
  Drawer,
  IconButton,
  Fab,
  Badge,
  Slide,
  SwipeableDrawer
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChatIcon from '@mui/icons-material/Chat';
import RecommendIcon from '@mui/icons-material/Lightbulb';
import { ChatMessage, OptionItem } from '../types/types';

interface MobileOptimizedChatProps {
  messages: ChatMessage[];
  options: OptionItem[];
  inputMessage: string;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
  onOptionClick: (option: OptionItem) => void;
  selectedTab: 'deepen' | 'next';
  onTabChange: (tab: 'deepen' | 'next') => void;
}

/**
 * 移动端优化的聊天组件
 * 
 * 主要特性：
 * 1. 自适应单栏布局 - 小屏设备显示单栏，大屏设备保持双栏
 * 2. 底部抽屉导航 - 推荐选项通过底部抽屉显示
 * 3. 触控友好 - 增加触控目标大小和间距
 * 4. 流畅动画 - 使用Material-UI动画组件
 * 5. 手势支持 - 支持上滑显示推荐选项
 */
const MobileOptimizedChat: React.FC<MobileOptimizedChatProps> = ({
  messages,
  options,
  inputMessage,
  isLoading,
  onInputChange,
  onSendMessage,
  onOptionClick,
  selectedTab,
  onTabChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // 768px以下视为移动设备
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm')); // 600px以下视为小屏手机
  
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [showFab, setShowFab] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 滚动时隐藏/显示浮动按钮
  useEffect(() => {
    const handleScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return;

      const currentScrollY = container.scrollTop;
      const isScrollingDown = currentScrollY > lastScrollY;
      
      // 滚动时隐藏FAB，停止滚动时显示
      setShowFab(!isScrollingDown || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [lastScrollY]);

  // 获取当前标签页的选项数量
  const currentOptions = options.filter(opt => opt.type === selectedTab);
  const optionCount = currentOptions.length;

  // 移动端布局 - 单栏 + 底部抽屉
  if (isMobile) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        bgcolor: 'background.default',
        position: 'relative'
      }}>
        {/* 消息列表区域 */}
        <Box sx={{ 
          flexGrow: 1, 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <Box 
            ref={messagesContainerRef}
            sx={{ 
              flexGrow: 1, 
              overflowY: 'auto',
              px: isSmallMobile ? 2 : 3,
              py: 3,
              // 优化移动端滚动体验
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              '&::-webkit-scrollbar': {
                display: 'none' // 隐藏滚动条
              }
            }}
          >
            {messages.filter(m => m.role !== 'system').map((message) => {
              const isUser = message.role === 'user';
              return (
                <Box 
                  key={message.id} 
                  sx={{ 
                    mb: 3, // 增加消息间距
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Paper 
                    elevation={1}
                    sx={{ 
                      px: isSmallMobile ? 2.5 : 3, // 增加触控友好的内边距
                      py: isSmallMobile ? 2 : 2.5,
                      maxWidth: '85%', // 限制最大宽度，避免消息过宽
                      minWidth: isSmallMobile ? 120 : 160,
                      bgcolor: isUser ? '#e3f2fd' : '#fff',
                      borderRadius: isSmallMobile ? 2 : 2.5,
                      // 添加触控友好的阴影
                      boxShadow: isUser 
                        ? '0 2px 8px rgba(25, 118, 210, 0.15)'
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      // 移动端优化的字体大小
                      fontSize: isSmallMobile ? '0.9rem' : '1rem',
                      lineHeight: 1.6
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word', // 防止长单词溢出
                        fontSize: 'inherit',
                        lineHeight: 'inherit'
                      }}
                    >
                      {message.content}
                    </Typography>
                  </Paper>
                </Box>
              );
            })}
            
            {/* 加载指示器 */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  AI 正在思考中...
                </Typography>
              </Box>
            )}
            
            {/* 底部安全区域 */}
            <Box sx={{ height: 120 }} />
          </Box>
        </Box>

        {/* 输入区域 - 固定在底部 */}
        <Paper 
          elevation={8}
          sx={{ 
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: isSmallMobile ? 2 : 2.5,
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            zIndex: 1000,
            // iOS安全区域支持
            paddingBottom: `calc(${isSmallMobile ? 16 : 20}px + env(safe-area-inset-bottom))`
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            gap: 1.5,
            alignItems: 'flex-end',
            maxWidth: 'md',
            mx: 'auto' // 居中对齐
          }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={isSmallMobile ? "输入消息..." : "输入一本书或想研究的话题..."}
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSendMessage();
                }
              }}
              multiline
              maxRows={isSmallMobile ? 3 : 4}
              size={isSmallMobile ? "small" : "medium"}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: isSmallMobile ? 2 : 2.5,
                  fontSize: isSmallMobile ? '0.9rem' : '1rem',
                  // 触控友好的最小高度
                  minHeight: isSmallMobile ? 44 : 48,
                  bgcolor: 'background.paper'
                },
                '& .MuiInputBase-input': {
                  // 移动端优化的行高
                  lineHeight: 1.5,
                  // 防止iOS缩放
                  fontSize: isSmallMobile ? '16px' : '1rem'
                }
              }}
            />
            <Button
              variant="contained"
              onClick={onSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              sx={{
                minWidth: isSmallMobile ? 56 : 64,
                height: isSmallMobile ? 44 : 48,
                borderRadius: isSmallMobile ? 2 : 2.5,
                fontWeight: 600,
                px: isSmallMobile ? 2 : 3
              }}
            >
              {isSmallMobile ? '发送' : '发送'}
            </Button>
          </Box>
        </Paper>

        {/* 浮动按钮 - 显示推荐选项 */}
        <Slide direction="up" in={showFab && !drawerOpen} mountOnEnter unmountOnExit>
          <Fab
            color="primary"
            sx={{
              position: 'fixed',
              bottom: isSmallMobile ? 90 : 100,
              right: isSmallMobile ? 16 : 20,
              zIndex: 999,
              // 添加环境感知的底部偏移
              marginBottom: 'env(safe-area-inset-bottom)'
            }}
            onClick={() => setDrawerOpen(true)}
          >
            <Badge badgeContent={optionCount} color="error" max={99}>
              <RecommendIcon />
            </Badge>
          </Fab>
        </Slide>

        {/* 底部抽屉 - 推荐选项 */}
        <SwipeableDrawer
          anchor="bottom"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpen={() => setDrawerOpen(true)}
          disableSwipeToOpen={false}
          swipeAreaWidth={56}
          disableDiscovery
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '70vh',
              // iOS安全区域支持
              paddingBottom: 'env(safe-area-inset-bottom)'
            }
          }}
        >
          <Box sx={{ width: '100%', minHeight: 200 }}>
            {/* 抽屉把手 */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider'
            }}>
              <Box sx={{ 
                width: 32, 
                height: 4, 
                bgcolor: 'grey.300', 
                borderRadius: 2 
              }} />
            </Box>

            {/* 标签页 */}
            <Box sx={{ px: 2, pt: 1 }}>
              <Tabs
                value={selectedTab}
                onChange={(_, value) => onTabChange(value)}
                variant="fullWidth"
                sx={{
                  minHeight: 48,
                  '& .MuiTab-root': {
                    minHeight: 48,
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    textTransform: 'none'
                  }
                }}
              >
                <Tab value="deepen" label="精读当前内容" />
                <Tab value="next" label="推荐相关好书" />
              </Tabs>
            </Box>

            {/* 选项列表 */}
            <Box sx={{ 
              px: 2, 
              py: 2,
              overflowY: 'auto',
              maxHeight: 'calc(70vh - 120px)'
            }}>
              {currentOptions.length > 0 ? (
                currentOptions.map((option) => (
                  <Paper
                    key={option.id}
                    elevation={1}
                    sx={{
                      p: 2.5,
                      mb: 2,
                      cursor: 'pointer',
                      borderRadius: 2,
                      transition: 'all 0.2s ease-in-out',
                      '&:hover': {
                        bgcolor: 'action.hover',
                        transform: 'translateY(-1px)',
                        boxShadow: 2
                      },
                      '&:active': {
                        transform: 'translateY(0)',
                        boxShadow: 1
                      }
                    }}
                    onClick={() => {
                      onOptionClick(option);
                      setDrawerOpen(false);
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ 
                      fontWeight: 600, 
                      mb: 0.5,
                      fontSize: '1rem',
                      lineHeight: 1.4
                    }}>
                      {option.content}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{
                      lineHeight: 1.5,
                      fontSize: '0.875rem'
                    }}>
                      {option.describe}
                    </Typography>
                  </Paper>
                ))
              ) : (
                <Box sx={{ 
                  textAlign: 'center', 
                  py: 6,
                  color: 'text.secondary' 
                }}>
                  <Typography variant="body2">
                    暂无推荐选项，请先开始对话
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </SwipeableDrawer>
      </Box>
    );
  }

  // 桌面端布局 - 保持原有双栏设计
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100%',
      bgcolor: 'background.default'
    }}>
      {/* 左侧消息区域 */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: 'background.paper'
      }}>
        <Box 
          ref={messagesContainerRef}
          sx={{ 
            flexGrow: 1, 
            overflowY: 'auto',
            px: 4,
            py: 3
          }}
        >
          {/* 桌面端消息渲染逻辑 */}
          {messages.filter(m => m.role !== 'system').map((message) => (
            <Box key={message.id} sx={{ mb: 2 }}>
              <Paper sx={{ p: 2 }}>
                <Typography>{message.content}</Typography>
              </Paper>
            </Box>
          ))}
        </Box>

        {/* 桌面端输入区域 */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          p: 2, 
          borderTop: 1, 
          borderColor: 'divider'
        }}>
          <TextField
            fullWidth
            value={inputMessage}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="输入消息..."
          />
          <Button 
            variant="contained" 
            onClick={onSendMessage}
            disabled={isLoading}
          >
            发送
          </Button>
        </Box>
      </Box>

      {/* 右侧推荐区域 - 桌面端保持原有设计 */}
      <Box sx={{ 
        width: '30%', 
        minWidth: 360,
        borderLeft: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}>
        {/* 桌面端推荐选项渲染逻辑 */}
      </Box>
    </Box>
  );
};

export default MobileOptimizedChat;