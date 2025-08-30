/**
 * 面包屑导航组件
 * 显示当前探索路径，支持快速跳转到历史节点
 */

import React, { useMemo } from 'react';
import {
  Box,
  Breadcrumbs,
  Chip,
  Typography,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Home,
  ChevronRight,
  Schedule,
  Visibility,
  TrendingUp
} from '@mui/icons-material';
import { MindMapNode } from '../../types/mindMap';

interface BreadcrumbNavigationProps {
  currentPath: string[];
  nodes: Map<string, MindMapNode>;
  onPathClick: (nodeId: string) => void;
  maxItems?: number;
  showMetrics?: boolean;
  className?: string;
}

const BreadcrumbNavigation: React.FC<BreadcrumbNavigationProps> = ({
  currentPath,
  nodes,
  onPathClick,
  maxItems = 5,
  showMetrics = true,
  className
}) => {
  // 处理路径节点数据
  const pathNodes = useMemo(() => {
    return currentPath
      .map(nodeId => nodes.get(nodeId))
      .filter(Boolean) as MindMapNode[];
  }, [currentPath, nodes]);

  // 获取节点图标和颜色
  const getNodeStyle = (node: MindMapNode) => {
    const typeStyles = {
      root: { icon: '📚', color: '#6366f1' },
      topic: { icon: '💭', color: '#8b5cf6' },
      deepen: { icon: '🌿', color: '#10b981' },
      next: { icon: '🔗', color: '#f59e0b' },
      current: { icon: '🎯', color: '#ef4444' }
    };
    
    return typeStyles[node.type] || { icon: '📄', color: '#6b7280' };
  };

  // 计算路径统计
  const pathStats = useMemo(() => {
    if (!showMetrics) return null;
    
    const totalDepth = pathNodes.length - 1;
    const exploredNodes = pathNodes.filter(n => n.metadata.explored).length;
    const totalTime = pathNodes.reduce((sum, node, index) => {
      if (index === 0) return sum;
      const prevNode = pathNodes[index - 1];
      return sum + (node.metadata.timestamp - prevNode.metadata.timestamp);
    }, 0);
    
    return {
      totalDepth,
      exploredNodes,
      explorationRate: pathNodes.length > 0 ? exploredNodes / pathNodes.length : 0,
      avgTimePerNode: pathNodes.length > 1 ? totalTime / (pathNodes.length - 1) : 0
    };
  }, [pathNodes, showMetrics]);

  // 处理路径过长的情况
  const displayPath = useMemo(() => {
    if (pathNodes.length <= maxItems) {
      return pathNodes;
    }
    
    // 保留开头、结尾和当前重要节点
    const start = pathNodes.slice(0, 2);
    const end = pathNodes.slice(-2);
    const middle = pathNodes.length > 4 ? pathNodes.slice(2, -2) : [];
    
    return [
      ...start,
      ...(middle.length > 0 ? [null] : []), // null表示省略号
      ...end
    ];
  }, [pathNodes, maxItems]);

  // 渲染单个面包屑项
  const renderBreadcrumbItem = (node: MindMapNode | null, index: number, isLast: boolean) => {
    if (!node) {
      return (
        <Typography key="ellipsis" color="text.secondary" sx={{ mx: 1 }}>
          ...
        </Typography>
      );
    }
    
    const style = getNodeStyle(node);
    const isActive = isLast;
    
    return (
      <Tooltip
        key={node.id}
        title={
          <Box>
            <Typography variant="subtitle2">{node.title}</Typography>
            <Typography variant="caption" color="inherit">
              {node.metadata.summary || '点击访问此节点'}
            </Typography>
            <Box sx={{ mt: 0.5, fontSize: '0.7rem' }}>
              <Box>类型: {node.type}</Box>
              <Box>深度: {node.level}</Box>
              <Box>点击: {node.interactions.clickCount}次</Box>
              {node.metadata.explored && <Box>✅ 已探索</Box>}
            </Box>
          </Box>
        }
        arrow
        enterDelay={500}
      >
        <Chip
          icon={<span style={{ fontSize: '0.9rem' }}>{style.icon}</span>}
          label={node.title.length > 20 ? `${node.title.slice(0, 20)}...` : node.title}
          onClick={() => !isActive && onPathClick(node.id)}
          variant={isActive ? "filled" : "outlined"}
          size="small"
          sx={{
            bgcolor: isActive ? style.color : 'transparent',
            color: isActive ? 'white' : style.color,
            borderColor: style.color,
            cursor: isActive ? 'default' : 'pointer',
            maxWidth: 180,
            '& .MuiChip-label': {
              px: 1
            },
            '&:hover': {
              bgcolor: !isActive ? `${style.color}20` : undefined,
              transform: !isActive ? 'translateY(-1px)' : undefined
            },
            transition: 'all 0.2s ease'
          }}
        />
      </Tooltip>
    );
  };

  if (pathNodes.length === 0) {
    return (
      <Box
        className={className}
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          暂无探索路径
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      className={className}
      sx={{
        p: 2,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      {/* 主导航路径 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: showMetrics ? 1 : 0 }}>
        <IconButton
          size="small"
          onClick={() => pathNodes[0] && onPathClick(pathNodes[0].id)}
          sx={{ mr: 1, color: 'text.secondary' }}
        >
          <Home fontSize="small" />
        </IconButton>
        
        <Breadcrumbs
          separator={<ChevronRight fontSize="small" />}
          maxItems={maxItems + 1}
          sx={{ flex: 1 }}
        >
          {displayPath.map((node, index) => 
            renderBreadcrumbItem(node, index, index === displayPath.length - 1)
          )}
        </Breadcrumbs>
      </Box>

      {/* 路径统计信息 */}
      {showMetrics && pathStats && (
        <Fade in={true}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              fontSize: '0.75rem',
              color: 'text.secondary'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TrendingUp fontSize="inherit" />
              <span>深度 {pathStats.totalDepth}</span>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Visibility fontSize="inherit" />
              <span>{pathStats.exploredNodes}/{pathNodes.length} 已探索</span>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Schedule fontSize="inherit" />
              <span>
                平均 {Math.round(pathStats.avgTimePerNode / 1000 / 60)}分钟/节点
              </span>
            </Box>
            
            {/* 探索率指示器 */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption">探索率</Typography>
              <Box
                sx={{
                  width: 60,
                  height: 4,
                  bgcolor: 'grey.300',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <Box
                  sx={{
                    width: `${pathStats.explorationRate * 100}%`,
                    height: '100%',
                    bgcolor: pathStats.explorationRate > 0.7 ? 'success.main' : 
                             pathStats.explorationRate > 0.4 ? 'warning.main' : 'error.main',
                    transition: 'width 0.3s ease'
                  }}
                />
              </Box>
              <Typography variant="caption">
                {Math.round(pathStats.explorationRate * 100)}%
              </Typography>
            </Box>
          </Box>
        </Fade>
      )}
    </Box>
  );
};

export default BreadcrumbNavigation;