/**
 * 简化版思维导图面板
 * 使用Markdown树结构显示，易于实现和理解
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Fade,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Timeline,
  Refresh,
  ExpandLess
} from '@mui/icons-material';

import { MindMapState } from '../../types/mindMap';
import MarkdownTreeMap from './MarkdownTreeMap';
import BreadcrumbNavigation from './BreadcrumbNavigation';

interface SimpleMindMapPanelProps {
  mindMapState: MindMapState;
  isOpen: boolean;
  onToggle: () => void;
  onNodeClick: (nodeId: string) => void;
  onRefresh?: () => void;
  className?: string;
}

const SimpleMindMapPanel: React.FC<SimpleMindMapPanelProps> = ({
  mindMapState,
  isOpen,
  onToggle,
  onNodeClick,
  onRefresh,
  className
}) => {
  const [showPath, setShowPath] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // 如果未打开，显示浮动按钮
  if (!isOpen) {
    return (
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 1000
        }}
      >
        <Tooltip title="打开思维导图">
          <IconButton
            onClick={onToggle}
            sx={{
              bgcolor: 'primary.main',
              color: 'white',
              width: 56,
              height: 56,
              boxShadow: 4,
              '&:hover': { 
                bgcolor: 'primary.dark',
                transform: 'scale(1.1)',
                transition: 'all 0.2s ease'
              }
            }}
          >
            <Timeline />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Fade in={isOpen}>
      <Box
        className={className}
        sx={{
          height: '60vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: 2
        }}
      >
        {/* 头部控制栏 */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            bgcolor: 'background.default'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Timeline color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              思维导图
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mindMapState.stats.exploredNodes}/{mindMapState.stats.totalNodes} 已探索
            </Typography>
          </Box>

          {/* 控制按钮组 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showPath}
                  onChange={(e) => setShowPath(e.target.checked)}
                  size="small"
                />
              }
              label="显示路径"
              sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  size="small"
                />
              }
              label="紧凑"
              sx={{ mr: 1, '& .MuiFormControlLabel-label': { fontSize: '0.8rem' } }}
            />

            {onRefresh && (
              <Tooltip title="刷新布局">
                <IconButton size="small" onClick={onRefresh}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            )}

            <Tooltip title="收起">
              <IconButton size="small" onClick={onToggle}>
                <ExpandLess />
              </IconButton>
            </Tooltip>
          </Box>
        </Paper>

        {/* 面包屑导航 */}
        {showPath && (
          <BreadcrumbNavigation
            currentPath={mindMapState.explorationPath}
            nodes={mindMapState.nodes}
            onPathClick={onNodeClick}
            showMetrics={false}
          />
        )}

        {/* Markdown树结构思维导图 */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <MarkdownTreeMap
            mindMapState={mindMapState}
            onNodeClick={onNodeClick}
            currentNodeId={mindMapState.currentNodeId}
            showPath={false} // 已在顶部显示
            compact={compactMode}
          />
        </Box>
      </Box>
    </Fade>
  );
};

export default SimpleMindMapPanel;