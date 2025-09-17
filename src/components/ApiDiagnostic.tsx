/**
 * API配置诊断组件
 * 帮助用户识别和解决话题按钮无反应的问题
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
} from '@mui/material';
import {
  ErrorOutline as ErrorIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { logDiagnosticInfo } from '../utils/apiKeyDiagnostic';

interface ApiDiagnosticProps {
  onClose?: () => void;
  onLoadTestData?: () => void;
}

const ApiDiagnostic: React.FC<ApiDiagnosticProps> = ({ onClose, onLoadTestData }) => {
  const [expanded, setExpanded] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const runDiagnostic = useCallback(() => {
    const result = logDiagnosticInfo();
    setDiagnosticResult(result);
    setExpanded(true);
  }, []);

  return (
    <Paper elevation={2} sx={{ p: 3, m: 2, border: '1px solid', borderColor: 'warning.main' }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon color="warning" />
          <Typography variant="h6" fontWeight={600}>
            话题按钮诊断
          </Typography>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose}>
            ×
          </IconButton>
        )}
      </Box>

      <Alert severity="info" sx={{ mb: 2 }}>
        如果话题按钮不显示或点击无反应，可能是以下原因导致：
      </Alert>

      <List dense>
        <ListItem>
          <ListItemIcon>
            <ErrorIcon color="error" fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="API密钥未配置" 
            secondary="OpenRouter API密钥是AI功能的基础"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <WarningIcon color="warning" fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="网络连接问题" 
            secondary="AI服务需要稳定的网络连接"
          />
        </ListItem>
        <ListItem>
          <ListItemIcon>
            <SettingsIcon color="action" fontSize="small" />
          </ListItemIcon>
          <ListItemText 
            primary="对话内容不足" 
            secondary="需要先进行一轮对话来生成话题概念"
          />
        </ListItem>
      </List>

      <Box mt={2} display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <Button 
          variant="contained" 
          onClick={runDiagnostic}
          size="small"
          startIcon={<SettingsIcon />}
        >
          运行诊断
        </Button>
        
        {onLoadTestData && (
          <Button 
            variant="outlined" 
            onClick={onLoadTestData}
            size="small"
            color="primary"
          >
            加载测试数据
          </Button>
        )}
        
        {diagnosticResult && (
          <Chip
            icon={diagnosticResult.isValid ? <SuccessIcon /> : <ErrorIcon />}
            label={diagnosticResult.isValid ? "配置正常" : "配置异常"}
            color={diagnosticResult.isValid ? "success" : "error"}
            size="small"
          />
        )}
        
        {diagnosticResult && (
          <IconButton 
            size="small" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded && !!diagnosticResult}>
        {diagnosticResult && (
          <Box mt={2} p={2} bgcolor="background.default" borderRadius={1}>
            <Typography variant="subtitle2" gutterBottom>
              诊断结果:
            </Typography>
            
            <Alert 
              severity={diagnosticResult.isValid ? "success" : "error"} 
              sx={{ mb: 2 }}
            >
              {diagnosticResult.message}
            </Alert>

            {!diagnosticResult.isValid && diagnosticResult.suggestions?.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight={500} gutterBottom>
                  解决步骤:
                </Typography>
                <List dense>
                  {diagnosticResult.suggestions.map((suggestion: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Typography variant="body2" color="primary">
                          {index + 1}.
                        </Typography>
                      </ListItemIcon>
                      <ListItemText 
                        primary={suggestion}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                💡 提示：完成API配置后，刷新页面并重新开始对话，话题按钮将正常显示
              </Typography>
              <Typography variant="caption" color="primary.main" display="block">
                🧪 测试方式：点击"加载测试数据"按钮可立即体验话题按钮功能（无需API配置）
              </Typography>
            </Box>
          </Box>
        )}
      </Collapse>
    </Paper>
  );
};

export default ApiDiagnostic;