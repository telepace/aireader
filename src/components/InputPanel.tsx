import React, { useEffect } from 'react';
import { TextField, Typography, Box, Button } from '@mui/material';
import { usePromptFormValidation } from '../hooks/useFormValidation';

interface InputPanelProps {
  promptObject: string;
  promptText: string;
  onPromptObjectChange: (value: string) => void;
  onPromptTextChange: (value: string) => void;
  isLoading?: boolean;
  onGenerate?: () => void;
}

/**
 * Renders an input panel for processing objects and AI instructions.
 *
 * This component consists of two main text input areas for the user to provide content and analysis instructions,
 * along with a button to initiate the analysis. It manages the layout and styling based on the dark mode setting
 * and loading state, ensuring a responsive design. The component also handles changes to the input fields
 * through provided callback functions.
 *
 * @param promptObject - The text content to be analyzed.
 * @param promptText - The instructions for how to analyze the content.
 * @param onPromptObjectChange - Callback function to handle changes to the promptObject.
 * @param onPromptTextChange - Callback function to handle changes to the promptText.
 * @param darkMode - Optional flag to enable dark mode styling (default is false).
 * @param isLoading - Optional flag to indicate if the analysis is in progress (default is false).
 * @param onGenerate - Callback function to initiate the analysis when the button is clicked.
 * @returns A React element representing the input panel.
 */
const InputPanel: React.FC<InputPanelProps> = ({
  promptObject,
  promptText,
  onPromptObjectChange,
  onPromptTextChange,
  isLoading = false,
  onGenerate
}) => {
  const {
    getFieldProps,
    validateForm,
    fields,
    hasErrors,
  } = usePromptFormValidation();

  // Sync external values with form validation
  useEffect(() => {
    if (fields.promptObject.value !== promptObject) {
      getFieldProps('promptObject').onChange({ target: { value: promptObject } } as any);
    }
  }, [promptObject, fields.promptObject.value, getFieldProps]);

  useEffect(() => {
    if (fields.promptText.value !== promptText) {
      getFieldProps('promptText').onChange({ target: { value: promptText } } as any);
    }
  }, [promptText, fields.promptText.value, getFieldProps]);

  // Handle field changes with validation
  const handlePromptObjectChange = (value: string) => {
    getFieldProps('promptObject').onChange({ target: { value } } as any);
    onPromptObjectChange(fields.promptObject.sanitizedValue || value);
  };

  const handlePromptTextChange = (value: string) => {
    getFieldProps('promptText').onChange({ target: { value } } as any);
    onPromptTextChange(fields.promptText.sanitizedValue || value);
  };

  // Enhanced generate handler with validation
  const handleGenerate = () => {
    if (validateForm() && onGenerate && !hasErrors) {
      onGenerate();
    }
  };
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
          onChange={(e) => handlePromptObjectChange(e.target.value)}
          onBlur={getFieldProps('promptObject').onBlur}
          error={getFieldProps('promptObject').error}
          helperText={getFieldProps('promptObject').helperText}
          placeholder="粘贴或输入您想要分析的文本内容..."
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              height: '100%',
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              fontSize: { xs: '0.95rem', md: '1rem' },
              lineHeight: 1.6,
              fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: '1px'
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.2)'
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.3)',
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
          🎯 分析指令
        </Typography>
        <TextField
          multiline
          fullWidth
          variant="outlined"
          value={promptText}
          onChange={(e) => handlePromptTextChange(e.target.value)}
          onBlur={getFieldProps('promptText').onBlur}
          error={getFieldProps('promptText').error}
          helperText={getFieldProps('promptText').helperText}
          placeholder="输入您希望AI如何分析这些内容的指令..."
          rows={4}
          sx={{ 
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              backgroundColor: 'rgba(0, 0, 0, 0.02)',
              fontSize: { xs: '0.95rem', md: '1rem' },
              lineHeight: 1.6,
              fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
                borderWidth: '1px'
              },
              '&:hover fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.2)'
              },
              '&.Mui-focused fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.3)',
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
      
      {/* 生成按钮 */}
      <Box sx={{ flexShrink: 0 }}>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={isLoading || !promptObject.trim() || !promptText.trim() || hasErrors}
          fullWidth
          size="large"
          sx={{
            height: 56,
            borderRadius: '16px',
            fontSize: { xs: '1rem', md: '1.125rem' },
            fontWeight: 600,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              boxShadow: '0 12px 40px rgba(102, 126, 234, 0.4)',
              transform: 'translateY(-2px)'
            },
            '&:disabled': {
              background: '#e0e0e0',
              color: '#9e9e9e',
              boxShadow: 'none',
              transform: 'none'
            },
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isLoading ? '生成中...' : '🚀 开始分析'}
        </Button>
      </Box>
    </Box>
  );
};

export default InputPanel; 