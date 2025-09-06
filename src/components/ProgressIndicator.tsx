import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';

interface OverallProgressBarProps {
  totalResponses: number;
  maxResponses: number;
  progressPercentage: number;
  showCounter?: boolean;
  compact?: boolean;
}

const OverallProgressBar: React.FC<OverallProgressBarProps> = ({
  totalResponses,
  maxResponses,
  progressPercentage,
  showCounter = true,
  compact = false
}) => {
  // 根据进度确定颜色主题
  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return '#10b981'; // 绿色 - 开始阶段
    if (percentage < 60) return '#f59e0b'; // 橙色 - 进行中
    if (percentage < 90) return '#ef4444'; // 红色 - 接近满格
    return '#8b5cf6'; // 紫色 - 满格
  };

  const progressColor = getProgressColor(progressPercentage);
  const isFullProgress = progressPercentage >= 100;

  if (compact) {
    return (
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%'
      }}>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            bgcolor: 'rgba(0, 0, 0, 0.06)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              bgcolor: progressColor,
              transition: 'background-color 0.3s ease'
            }
          }}
        />
        {showCounter && (
          <Typography variant="caption" sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            minWidth: 'auto',
            fontWeight: 500
          }}>
            {totalResponses}/{maxResponses}
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%',
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'divider',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    }}>
      {/* 标题区域 */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 1.5
      }}>
        <Typography variant="body2" sx={{
          fontWeight: 600,
          color: 'text.primary'
        }}>
          阅读进度
        </Typography>
        
        {showCounter && (
          <Typography variant="body2" sx={{
            color: isFullProgress ? progressColor : 'text.secondary',
            fontWeight: isFullProgress ? 600 : 400,
            fontSize: '0.875rem'
          }}>
            {totalResponses} / {maxResponses} {isFullProgress && '🎉'}
          </Typography>
        )}
      </Box>

      {/* 进度条 */}
      <Box sx={{ mb: 1 }}>
        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 8,
            borderRadius: 4,
            bgcolor: 'rgba(0, 0, 0, 0.08)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
              bgcolor: progressColor,
              transition: 'all 0.3s ease',
              ...(isFullProgress && {
                background: `linear-gradient(45deg, ${progressColor} 30%, #ffffff 30%, #ffffff 50%, ${progressColor} 50%, ${progressColor} 80%, #ffffff 80%)`,
                backgroundSize: '20px 20px',
                animation: 'progress-stripes 1s linear infinite'
              })
            }
          }}
        />
      </Box>

      {/* 进度描述 */}
      <Typography variant="caption" sx={{
        color: 'text.secondary',
        fontSize: '0.75rem',
        display: 'block'
      }}>
        {isFullProgress 
          ? '恭喜！您已完成深度阅读探索' 
          : `每次AI回复都会增加阅读经验值 • ${Math.round(progressPercentage)}% 完成`
        }
      </Typography>

      {/* CSS动画定义 */}
      <style>
        {`
          @keyframes progress-stripes {
            0% { background-position: 0 0; }
            100% { background-position: 20px 0; }
          }
        `}
      </style>
    </Box>
  );
};

export default OverallProgressBar;