import React from 'react';
import { TextField, Typography, Box, Button } from '@mui/material';

interface InputPanelProps {
  promptObject: string;
  promptText: string;
  onPromptObjectChange: (value: string) => void;
  onPromptTextChange: (value: string) => void;
  darkMode?: boolean;
  isLoading?: boolean;
  onGenerate?: () => void;
}

const InputPanel: React.FC<InputPanelProps> = ({
  promptObject,
  promptText,
  onPromptObjectChange,
  onPromptTextChange,
  darkMode = false,
  isLoading = false,
  onGenerate
}) => {
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        gap: { xs: 4, md: 5 },
        bgcolor: 'transparent'
      }}
    >
      {/* 阅读材料区域 */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary', 
            mb: 3,
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            letterSpacing: '-0.015em'
          }}
        >
          📖 阅读材料
        </Typography>
        <TextField
          multiline
          fullWidth
          variant="outlined"
          value={promptObject}
          onChange={(e) => onPromptObjectChange(e.target.value)}
          placeholder="粘贴或输入您想要分析的文本内容..."
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: '12px',
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              fontSize: { xs: '0.95rem', md: '1rem' },
              lineHeight: 1.6,
              fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '& fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: '1px'
              },
              '&:hover fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
              },
              '&.Mui-focused fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                borderWidth: '2px'
              }
            },
            '& .MuiInputBase-input': {
              height: '100% !important',
              padding: '16px !important',
              '&::placeholder': {
                opacity: 0.5,
                fontSize: { xs: '0.95rem', md: '1rem' },
                fontStyle: 'italic'
              }
            }
          }}
        />
      </Box>
      
      {/* 分析指令区域 */}
      <Box sx={{ flexShrink: 0 }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary', 
            mb: 3,
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            letterSpacing: '-0.015em'
          }}
        >
          🤖 分析指令
        </Typography>
        <TextField
          multiline
          minRows={4}
          fullWidth
          variant="outlined"
          value={promptText}
          onChange={(e) => onPromptTextChange(e.target.value)}
          placeholder="告诉我您希望如何分析这段内容..."
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
              fontSize: { xs: '0.95rem', md: '1rem' },
              lineHeight: 1.6,
              fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '& fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: '1px'
              },
              '&:hover fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
              },
              '&.Mui-focused fieldset': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                borderWidth: '2px'
              }
            },
            '& .MuiInputBase-input': {
              padding: '16px !important',
              '&::placeholder': {
                opacity: 0.5,
                fontSize: { xs: '0.95rem', md: '1rem' },
                fontStyle: 'italic'
              }
            }
          }}
        />
      </Box>

      {/* 操作按钮区域 */}
      <Box sx={{ 
        display: 'flex', 
        gap: 2,
        pt: 2
      }}>
        <Button 
          variant="contained" 
          fullWidth
          onClick={onGenerate}
          disabled={isLoading || !promptObject || !promptText}
          sx={{ 
            height: 48,
            fontWeight: 500,
            textTransform: 'none',
            borderRadius: '12px',
            fontSize: { xs: '1rem', md: '1.125rem' },
            bgcolor: darkMode ? '#ffffff' : '#000000',
            color: darkMode ? '#000000' : '#ffffff',
            '&:hover': {
              bgcolor: darkMode ? '#f0f0f0' : '#333333',
              transform: 'translateY(-1px)',
            },
            '&:disabled': {
              bgcolor: darkMode ? '#444444' : '#e5e5e5',
              color: darkMode ? '#888888' : '#999999',
            },
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isLoading ? '分析中...' : '开始分析'}
        </Button>
      </Box>
    </Box>
  );
};

export default InputPanel; 