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
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        bgcolor: darkMode ? 'background.paper' : '#fff',
        color: darkMode ? 'text.primary' : 'inherit'
      }}
    >
      <Typography variant="h6" gutterBottom>
        处理对象框
      </Typography>
      <TextField
        multiline
        rows={10}
        fullWidth
        variant="outlined"
        value={promptObject}
        onChange={(e) => onPromptObjectChange(e.target.value)}
        placeholder="请在此输入要处理的文本内容..."
        sx={{ mb: 2, flexShrink: 0 }}
      />
      
      <Typography variant="h6" gutterBottom>
        Prompt框
      </Typography>
      <TextField
        multiline
        fullWidth
        variant="outlined"
        value={promptText}
        onChange={(e) => onPromptTextChange(e.target.value)}
        placeholder="请在此输入给AI的指令..."
        sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', '& .MuiInputBase-root': { flexGrow: 1 }, '& .MuiInputBase-inputMultiline': { height: '100% !important', overflow: 'auto !important' } }}
      />
    </Paper>
  );
};

export default InputPanel; 