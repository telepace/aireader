import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { PromptTest } from '../types/types';
import { getSavedPromptTests, deletePromptTest } from '../utils/storage';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

interface SavedTestsProps {
  onSelectTest: (test: PromptTest) => void;
}

const SavedTests: React.FC<SavedTestsProps> = ({ onSelectTest }) => {
  const [savedTests, setSavedTests] = useState<PromptTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<PromptTest | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    loadSavedTests();
  }, []);

  const loadSavedTests = () => {
    const tests = getSavedPromptTests();
    setSavedTests(tests.sort((a, b) => b.timestamp - a.timestamp));
  };

  const handleDelete = (id: string) => {
    deletePromptTest(id);
    loadSavedTests();
    if (selectedTest?.id === id) {
      setSelectedTest(null);
      setDialogOpen(false);
    }
  };

  const handleViewDetails = (test: PromptTest) => {
    setSelectedTest(test);
    setDialogOpen(true);
  };

  const handleSelectAndClose = (test: PromptTest) => {
    onSelectTest(test);
    setDialogOpen(false);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleCopyJson = (test: PromptTest | null) => {
    if (!test) return;
    const jsonObject = {
      id: test.id,
      timestamp: test.timestamp,
      modelName: test.modelName,
      promptObject: test.promptObject,
      promptText: test.promptText,
      promptResult: test.promptResult,
    };
    const jsonString = JSON.stringify(jsonObject, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => {
        alert('JSON 已复制到剪贴板！');
      })
      .catch(err => {
        console.error('无法复制 JSON: ', err);
        alert('复制失败！');
      });
  };

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        bgcolor: '#fff',
        color: 'inherit'
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
        已保存的测试
      </Typography>
      
      {savedTests.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexGrow: 1 }}>
          <Typography color="text.secondary">暂无保存的测试</Typography>
        </Box>
      ) : (
        <List sx={{ overflow: 'auto', flexGrow: 1 }}>
          {savedTests.map((test) => (
            <ListItem 
              key={test.id}
              secondaryAction={
                <IconButton edge="end" onClick={(e) => {e.stopPropagation(); handleDelete(test.id);}}>
                  <DeleteIcon />
                </IconButton>
              }
              onClick={() => handleViewDetails(test)}
              sx={{ 
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' },
                borderBottom: '1px solid #eee'
              }}
            >
              <ListItemText 
                primary={test.promptText.slice(0, 50) + (test.promptText.length > 50 ? '...' : '')}
                secondary={`时间: ${formatDate(test.timestamp)} | 模型: ${test.modelName}`}
              />
            </ListItem>
          ))}
        </List>
      )}
      
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#fff',
            color: 'inherit'
          }
        }}
      >
        {selectedTest && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              测试详情 - {formatDate(selectedTest.timestamp)}
              <Chip label={selectedTest.modelName} size="small" /> 
            </DialogTitle>
            <DialogContent dividers>
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1, 
                maxHeight: '50vh', 
                overflowY: 'auto' 
              }}>
                <pre style={{ 
                  margin: 0, 
                  whiteSpace: 'pre-wrap', 
                  wordBreak: 'break-all',
                  color: 'inherit'
                }}>
                  <code>
                    {JSON.stringify(
                      {
                        id: selectedTest.id,
                        timestamp: selectedTest.timestamp,
                        modelName: selectedTest.modelName,
                        promptObject: selectedTest.promptObject,
                        promptText: selectedTest.promptText,
                        promptResult: selectedTest.promptResult,
                      },
                      null,
                      2
                    )}
                  </code>
                </pre>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button
                onClick={() => handleCopyJson(selectedTest)}
                startIcon={<ContentCopyIcon />}
              >
                复制 JSON
              </Button>
              <Button onClick={() => handleSelectAndClose(selectedTest)}>
                使用此测试
              </Button>
              <Button onClick={() => setDialogOpen(false)}>
                关闭
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Paper>
  );
};

export default SavedTests; 