import React, { useRef, useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  LinearProgress, 
  Fade, 
  Collapse,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { OptionItem } from '../types/types';
import { CardState } from '../hooks/useCardState';

interface EnhancedOptionCardProps {
  option: OptionItem;
  state?: CardState;
  onClick: () => void;
  onCancel?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  disabled?: boolean;
}

// 状态图标映射
const getStatusIcon = (visual: CardState['visual']) => {
  switch (visual) {
    case 'processing':
      return <PlayArrowIcon fontSize="small" sx={{ color: '#2196f3' }} />;
    case 'completed':
      return <CheckCircleIcon fontSize="small" sx={{ color: '#4caf50' }} />;
    case 'error':
      return <ErrorIcon fontSize="small" sx={{ color: '#f44336' }} />;
    case 'queued':
      return <ScheduleIcon fontSize="small" sx={{ color: '#ff9800' }} />;
    default:
      return null;
  }
};

// 格式化时间
const formatETA = (eta?: number): string => {
  if (!eta || eta <= 0) return '';
  
  const seconds = Math.ceil(eta / 1000);
  if (seconds < 60) {
    return `${seconds}秒`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}分${remainingSeconds}秒` : `${minutes}分钟`;
};

const EnhancedOptionCard: React.FC<EnhancedOptionCardProps> = ({
  option,
  state,
  onClick,
  onCancel,
  onPause,
  onResume,
  disabled = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [clickAnimation, setClickAnimation] = useState(false);

  // 点击动画效果
  const handleClick = () => {
    if (disabled || !state?.interactive) return;
    
    setClickAnimation(true);
    setTimeout(() => setClickAnimation(false), 150);
    onClick();
  };

  // 获取卡片样式
  const getCardStyles = () => {
    if (!state) return { opacity: 1 };
    
    const baseStyles = {
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: state.interactive && !disabled ? 'pointer' : 'default',
      position: 'relative' as const,
    };

    switch (state.visual) {
      case 'clicked':
        return {
          ...baseStyles,
          transform: 'scale(0.98)',
          opacity: 0.9,
        };
      
      case 'queued':
        return {
          ...baseStyles,
          borderColor: '#ff9800',
          backgroundColor: '#fff8e1',
          boxShadow: '0 0 0 2px rgba(255, 152, 0, 0.2)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            backgroundColor: '#ff9800',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }
        };
      
      case 'processing':
        return {
          ...baseStyles,
          borderColor: '#2196f3',
          backgroundColor: '#e3f2fd',
          '&::after': {
            content: '""',
            position: 'absolute',
            top: -2,
            left: -2,
            right: -2,
            bottom: -2,
            border: '2px solid #2196f3',
            borderRadius: 'inherit',
            animation: 'processing-glow 2s ease-in-out infinite alternate'
          }
        };
      
      case 'completed':
        return {
          ...baseStyles,
          borderColor: '#4caf50',
          backgroundColor: '#e8f5e8',
          opacity: 0.9,
          transform: 'scale(0.98)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            right: 8,
            width: 12,
            height: 12,
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            opacity: 0.8
          }
        };
      
      case 'error':
        return {
          ...baseStyles,
          borderColor: '#f44336',
          backgroundColor: '#ffebee',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            backgroundColor: '#f44336',
            borderRadius: '50%'
          }
        };
      
      case 'cancelled':
        return {
          ...baseStyles,
          borderColor: '#9e9e9e',
          backgroundColor: '#f5f5f5',
          opacity: 0.7,
          textDecoration: 'line-through'
        };
      
      default:
        return {
          ...baseStyles,
          '&:hover': isHovered && state.interactive ? {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            borderColor: '#a0aec0'
          } : {}
        };
    }
  };

  // 添加CSS关键帧动画
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes processing-glow {
        0% { opacity: 0.5; }
        100% { opacity: 1; }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.1); }
      }
      
      .card-click-animation {
        animation: card-click 0.15s ease-out;
      }
      
      @keyframes card-click {
        0% { transform: scale(1); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const showControls = state && (state.visual === 'processing' || state.visual === 'queued');
  const showProgress = state && state.visual === 'processing' && state.progress > 0;

  return (
    <Fade in={true} timeout={300}>
      <Box
        ref={cardRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clickAnimation ? 'card-click-animation' : ''}
        sx={{
          ...getCardStyles(),
          bgcolor: '#ffffff',
          borderRadius: 2,
          p: 2.5,
          mb: 2,
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          maxWidth: '100%',
          overflow: 'hidden',
          userSelect: 'none'
        }}
      >
        {/* 主要内容区域 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: showProgress ? 1 : 0
        }}>
          <Box sx={{ flexGrow: 1, mr: 2 }}>
            {/* 标题区域 */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              mb: 1 
            }}>
              {getStatusIcon(state?.visual || 'idle')}
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600, 
                  fontSize: '0.875rem', 
                  color: '#2d3748',
                  lineHeight: 1.3
                }}
              >
                {option.content}
              </Typography>
            </Box>
            
            {/* 描述文本 */}
            <Typography 
              variant="body2" 
              sx={{ 
                fontSize: '0.8rem', 
                color: '#718096', 
                lineHeight: 1.4,
                mb: state?.message ? 0.5 : 0
              }}
            >
              {option.describe}
            </Typography>
            
            {/* 状态消息 */}
            {state?.message && (
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.75rem',
                  color: state.visual === 'error' ? '#f44336' : '#666',
                  fontStyle: 'italic',
                  display: 'block'
                }}
              >
                {state.message}
              </Typography>
            )}
          </Box>
          
          {/* 右侧信息区域 */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end',
            gap: 0.5,
            minWidth: 'fit-content'
          }}>
            {/* ETA显示 */}
            {state?.eta && state.eta > 0 && (
              <Tooltip title="预计完成时间">
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: '#666',
                    bgcolor: 'rgba(0,0,0,0.05)',
                    px: 1,
                    py: 0.25,
                    borderRadius: 1,
                    whiteSpace: 'nowrap'
                  }}
                >
                  {formatETA(state.eta)}
                </Typography>
              </Tooltip>
            )}
            
            {/* 点击次数显示 */}
            {state && state.clickCount > 1 && (
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  color: '#999',
                  whiteSpace: 'nowrap'
                }}
              >
                {state.clickCount}次
              </Typography>
            )}
            
            {/* 操作按钮组 */}
            <Collapse in={showControls && isHovered} timeout={200}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {state?.visual === 'processing' && onPause && (
                  <Tooltip title="暂停">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPause();
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <PauseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {state?.visual === 'queued' && onResume && (
                  <Tooltip title="开始">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResume();
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                {(state?.visual === 'processing' || state?.visual === 'queued') && onCancel && (
                  <Tooltip title="取消">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel();
                      }}
                      sx={{ p: 0.5 }}
                    >
                      <StopIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>
        
        {/* 进度条 */}
        {showProgress && (
          <Box sx={{ mt: 1.5 }}>
            <LinearProgress
              variant="determinate"
              value={state.progress}
              sx={{
                height: 4,
                borderRadius: 2,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                  backgroundColor: '#2196f3'
                }
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                color: '#666',
                mt: 0.5,
                display: 'block'
              }}
            >
              {Math.round(state.progress)}% 完成
            </Typography>
          </Box>
        )}
        
        {/* 悬停效果下划线 */}
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 2,
            backgroundColor: '#2196f3',
            transform: isHovered && state?.interactive ? 'scaleX(1)' : 'scaleX(0)',
            transformOrigin: 'left',
            transition: 'transform 300ms ease'
          }}
        />
      </Box>
    </Fade>
  );
};

export default EnhancedOptionCard;