/**
 * 概念图谱容器组件
 * 整合概念图谱面板和概念树，提供统一的UI界面
 */

import React, { memo, useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Fade,
  Typography,
  useTheme,
  alpha
} from '@mui/material';
import {
  Psychology as BrainIcon,
  AccountTree as TreeIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useConceptMap } from '../../hooks/useConceptMap';
import ConceptMapPanelV2 from './ConceptMapPanelV2';
import ConceptTreeV2 from './ConceptTreeV2';

interface ConceptMapContainerProps {
  conversationId: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = memo<TabPanelProps>(({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`concept-tabpanel-${index}`}
    aria-labelledby={`concept-tab-${index}`}
  >
    {value === index && (
      <Fade in={true} timeout={300}>
        <Box>{children}</Box>
      </Fade>
    )}
  </div>
));

TabPanel.displayName = 'TabPanel';

const ConceptMapContainer = memo<ConceptMapContainerProps>(({ conversationId }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  
  // 使用概念图谱Hook
  const {
    conceptMap,
    conceptTree,
    isLoading,
    error,
    clearConcepts
  } = useConceptMap(conversationId);

  // 计算整体状态
  const containerState = useMemo(() => {
    const hasConceptData = conceptMap && conceptMap.nodes.size > 0;
    const hasTreeData = conceptTree && conceptTree.children && conceptTree.children.length > 0;
    const isEmpty = !hasConceptData && !hasTreeData;
    
    return {
      hasConceptData,
      hasTreeData,
      isEmpty,
      showTabs: hasConceptData || hasTreeData
    };
  }, [conceptMap, conceptTree]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    // 可以触发重新加载逻辑
    console.log('刷新概念图谱数据');
  };

  const handleClearConcepts = () => {
    clearConcepts();
  };

  // 如果出错，显示错误状态
  if (error) {
    return (
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          textAlign: 'center',
          bgcolor: alpha(theme.palette.error.main, 0.05),
          border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`
        }}
      >
        <BrainIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
        <Typography color="error.main">概念图谱加载失败</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          {error}
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={0}
      sx={{ 
        bgcolor: theme.palette.background.paper,
        border: `1px solid ${theme.palette.divider}`,
        overflow: 'hidden'
      }}
    >
      {/* 头部标签栏 */}
      {containerState.showTabs && (
        <Box 
          sx={{ 
            bgcolor: alpha(theme.palette.background.default, 0.3),
            borderBottom: `1px solid ${theme.palette.divider}`
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                minHeight: 40,
                '& .MuiTab-root': {
                  minHeight: 40,
                  fontSize: '0.875rem',
                  textTransform: 'none'
                }
              }}
            >
              <Tab 
                icon={<BrainIcon fontSize="small" />} 
                label="概念图谱" 
                iconPosition="start"
                disabled={!containerState.hasConceptData}
              />
              <Tab 
                icon={<TreeIcon fontSize="small" />} 
                label="概念树" 
                iconPosition="start"
                disabled={!containerState.hasTreeData}
              />
            </Tabs>
            
            {/* 操作按钮 */}
            <Box display="flex" alignItems="center" pr={1}>
              <Tooltip title="刷新数据">
                <IconButton size="small" onClick={handleRefresh}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="清空概念">
                <IconButton size="small" onClick={handleClearConcepts}>
                  <SettingsIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      )}

      {/* 内容区域 */}
      <Box sx={{ p: 2 }}>
        {containerState.isEmpty ? (
          // 空状态 - 显示概念图谱面板的空状态
          <ConceptMapPanelV2 
            conceptMap={conceptMap}
            isLoading={isLoading}
          />
        ) : (
          // 有数据时显示标签页内容
          <>
            <TabPanel value={activeTab} index={0}>
              <ConceptMapPanelV2 
                conceptMap={conceptMap}
                isLoading={isLoading}
              />
            </TabPanel>
            
            <TabPanel value={activeTab} index={1}>
              <ConceptTreeV2 
                conceptTree={conceptTree}
                isLoading={isLoading}
                maxDepth={4}
              />
            </TabPanel>
          </>
        )}
      </Box>
    </Paper>
  );
});

ConceptMapContainer.displayName = 'ConceptMapContainer';

export default ConceptMapContainer;