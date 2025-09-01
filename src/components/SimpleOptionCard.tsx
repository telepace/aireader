import React from 'react';
import { Typography, Paper, CircularProgress, Box } from '@mui/material';
import { OptionItem } from '../types/types';

interface SimpleOptionCardProps {
  option: OptionItem;
  onClick: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

const SimpleOptionCard: React.FC<SimpleOptionCardProps> = ({
  option,
  onClick,
  disabled = false,
  isProcessing = false
}) => {
  return (
    <Paper
      elevation={1}
      onClick={!disabled ? onClick : undefined}
      sx={{
        p: 2.5,
        mb: 2,
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: 2,
        border: isProcessing ? '1px solid #3b82f6' : '1px solid #e2e8f0',
        borderLeft: isProcessing ? '3px solid #3b82f6' : '3px solid transparent',
        bgcolor: isProcessing ? '#f0f9ff' : '#ffffff',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        position: 'relative',
        '&:hover': disabled ? {} : {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          borderColor: isProcessing ? '#3b82f6' : '#cbd5e1',
          borderLeft: isProcessing ? '4px solid #3b82f6' : '4px solid #6366f1'
        }
      }}
    >
      {/* 处理中状态指示器 */}
      {isProcessing && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <CircularProgress size={14} sx={{ color: '#3b82f6' }} />
          <Typography variant="caption" sx={{ color: '#3b82f6', fontSize: '0.7rem' }}>
            处理中
          </Typography>
        </Box>
      )}
      
      {/* 标题 */}
      <Typography 
        variant="subtitle2" 
        sx={{ 
          fontWeight: 600, 
          fontSize: '0.875rem', 
          color: isProcessing ? '#1e40af' : '#2d3748',
          mb: 1,
          lineHeight: 1.3,
          pr: isProcessing ? 6 : 0 // 为处理中指示器让出空间
        }}
      >
        {option.content}
      </Typography>
      
      {/* 描述 */}
      <Typography 
        variant="body2" 
        sx={{ 
          fontSize: '0.8rem', 
          color: isProcessing ? '#3730a3' : '#718096', 
          lineHeight: 1.4
        }}
      >
        {option.describe}
      </Typography>
    </Paper>
  );
};

export default SimpleOptionCard;