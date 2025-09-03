/**
 * 智能思维地图面板 - 主容器组件
 * 包含面包屑导航、可视化思维图和AI洞察面板
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Fade,
  Collapse,
  Alert
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  CenterFocusStrong,
  Settings,
  Lightbulb,
  Timeline,
  FullscreenExit,
  Fullscreen
} from '@mui/icons-material';

import { MindMapState, MindMapEvent, MindMapConfig } from '../../types/mindMap';
import BreadcrumbNavigation from './BreadcrumbNavigation';
import InteractiveMindMap from './InteractiveMindMap';
import AIInsightPanel from './AIInsightPanel';
import MindMapControls from './MindMapControls';

interface MindMapPanelProps {
  mindMapState: MindMapState;
  config: MindMapConfig;
  isOpen: boolean;
  onToggle: () => void;
  onNodeClick: (nodeId: string) => void;
  onConfigChange: (config: Partial<MindMapConfig>) => void;
  onLayoutUpdate: (algorithm?: MindMapConfig['layout']['algorithm']) => void;
  className?: string;
  style?: React.CSSProperties;
}

const MindMapPanel: React.FC<MindMapPanelProps> = ({
  mindMapState,
  config,
  isOpen,
  onToggle,
  onNodeClick,
  onConfigChange,
  onLayoutUpdate,
  className,
  style
}) => {
  const [showAIInsights, setShowAIInsights] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const mindMapRef = useRef<HTMLDivElement>(null);

  // 处理缩放
  const handleZoom = useCallback((delta: number) => {
    const newZoom = Math.max(
      config.interaction.zoomRange[0],
      Math.min(config.interaction.zoomRange[1], zoomLevel + delta)
    );
    setZoomLevel(newZoom);
  }, [zoomLevel, config.interaction.zoomRange]);

  // 处理全屏切换
  const handleFullscreenToggle = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 居中视图
  const handleCenterView = useCallback(() => {
    setZoomLevel(1);
    // TODO: 重置视图到中心位置
  }, []);

  // 处理思维图事件
  const handleMindMapEvent = useCallback((event: MindMapEvent) => {
    switch (event.type) {
      case 'node_click':
        if (event.nodeId) {
          onNodeClick(event.nodeId);
        }
        break;
      case 'zoom':
        if (event.scale) {
          setZoomLevel(event.scale);
        }
        break;
      // 其他事件处理...
    }
  }, [onNodeClick]);

  // 错误处理
  const handleError = useCallback((error: Error) => {
    console.error('MindMap error:', error);
    setError(error.message);
    setTimeout(() => setError(null), 5000);
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
              '&:hover': { bgcolor: 'primary.dark' }
            }}
          >
            <Timeline />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      className={className}
      sx={{
        height: isFullscreen ? '100vh' : '60vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 9999 : 'auto',
        bgcolor: 'background.paper',
        borderRadius: isFullscreen ? 0 : 2,
        border: isFullscreen ? 'none' : 1,
        borderColor: 'divider',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* 错误提示 */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* 头部控制栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            探索地图
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
            {mindMapState.stats.exploredNodes}/{mindMapState.stats.totalNodes} 已探索
          </Typography>
        </Box>

        {/* 控制按钮组 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="AI洞察">
            <IconButton
              size="small"
              onClick={() => setShowAIInsights(!showAIInsights)}
              color={showAIInsights ? 'primary' : 'default'}
            >
              <Lightbulb />
            </IconButton>
          </Tooltip>

          <Tooltip title="缩小">
            <IconButton
              size="small"
              onClick={() => handleZoom(-0.2)}
              disabled={zoomLevel <= config.interaction.zoomRange[0]}
            >
              <ZoomOut />
            </IconButton>
          </Tooltip>

          <Typography variant="caption" sx={{ minWidth: 40, textAlign: 'center' }}>
            {Math.round(zoomLevel * 100)}%
          </Typography>

          <Tooltip title="放大">
            <IconButton
              size="small"
              onClick={() => handleZoom(0.2)}
              disabled={zoomLevel >= config.interaction.zoomRange[1]}
            >
              <ZoomIn />
            </IconButton>
          </Tooltip>

          <Tooltip title="居中">
            <IconButton size="small" onClick={handleCenterView}>
              <CenterFocusStrong />
            </IconButton>
          </Tooltip>

          <Tooltip title="设置">
            <IconButton
              size="small"
              onClick={() => setShowSettings(!showSettings)}
              color={showSettings ? 'primary' : 'default'}
            >
              <Settings />
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? "退出全屏" : "全屏"}>
            <IconButton size="small" onClick={handleFullscreenToggle}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>

          <Tooltip title="收起">
            <IconButton size="small" onClick={onToggle}>
              <Timeline />
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>

      {/* 设置面板 */}
      <Collapse in={showSettings}>
        <MindMapControls
          config={config}
          onConfigChange={onConfigChange}
          onLayoutUpdate={onLayoutUpdate}
        />
      </Collapse>

      {/* 面包屑导航 */}
      <BreadcrumbNavigation
        currentPath={mindMapState.explorationPath}
        nodes={mindMapState.nodes}
        onPathClick={onNodeClick}
      />

      {/* 主内容区域 */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 思维导图可视化区域 */}
        <Box
          ref={mindMapRef}
          sx={{
            flex: showAIInsights ? '1 1 70%' : '1 1 100%',
            position: 'relative',
            overflow: 'hidden',
            bgcolor: config.appearance.theme === 'dark' ? '#1a1a1a' : '#fafafa'
          }}
        >
          <InteractiveMindMap
            mindMapState={mindMapState}
            config={config}
            zoomLevel={zoomLevel}
            onEvent={handleMindMapEvent}
            onError={handleError}
          />
        </Box>

        {/* AI洞察面板 */}
        <Fade in={showAIInsights}>
          <Box sx={{ flex: '0 0 30%', borderLeft: 1, borderColor: 'divider' }}>
            <AIInsightPanel
              mindMapState={mindMapState}
              currentNodeId={mindMapState.currentNodeId}
              onNodeClick={onNodeClick}
              onInsightApply={(insight) => {
                // TODO: 应用AI洞察
                console.log('Apply insight:', insight);
              }}
            />
          </Box>
        </Fade>
      </Box>

      {/* 状态栏 */}
      <Paper
        elevation={0}
        sx={{
          p: 1,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'text.secondary'
        }}
      >
        <Box>
          最大深度: {mindMapState.stats.maxDepth} | 
          会话时间: {Math.round((Date.now() - mindMapState.stats.sessionStartTime) / 60000)}分钟
        </Box>
        <Box>
          {config.layout.algorithm} 布局 | {config.appearance.theme} 主题
        </Box>
      </Paper>
    </Box>
  );
};

export default MindMapPanel;