import React from 'react';
import { TextField, Typography, Paper } from '@mui/material';

interface InputPanelProps {
  promptObject: string;
  promptText: string;
  onPromptObjectChange: (value: string) => void;
  onPromptTextChange: (value: string) => void;
  darkMode?: boolean;
}

const InputPanel: React.FC<InputPanelProps> = ({
  promptObject,
  promptText,
  onPromptObjectChange,
  onPromptTextChange,
  darkMode = false
}) => {
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderColor: 'primary.light'
        }
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
        📄 处理对象
      </Typography>
      <TextField
        multiline
        rows={8}
        fullWidth
        variant="outlined"
        value={promptObject}
        onChange={(e) => onPromptObjectChange(e.target.value)}
        placeholder="在此输入要处理的文本内容..."
        sx={{ 
          mb: 3, 
          flexShrink: 0,
          '& .MuiOutlinedInput-root': {
            borderRadius: 2,
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.5)',
          }
        }}
      />
      
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'text.primary', mb: 2 }}>
        🤖 AI 指令
      </Typography>
      <TextField
        multiline
        fullWidth
        variant="outlined"
        value={promptText}
        onChange={(e) => onPromptTextChange(e.target.value)}
        placeholder="在此输入给 AI 的指令..."
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column',
          '& .MuiInputBase-root': { 
            flexGrow: 1,
            borderRadius: 2,
            backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.5)' : 'rgba(248, 250, 252, 0.5)',
          }, 
          '& .MuiInputBase-inputMultiline': { 
            height: '100% !important', 
            overflow: 'auto !important' 
          } 
        }}
      />
    </Paper>
  );
};

export default InputPanel; 