/**
 * Markdown树结构思维导图组件
 * 使用简单的Markdown格式(- 标题)显示思维导图结构
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Badge
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Circle,
  CheckCircle,
  RadioButtonUnchecked,
  Timeline,
  Home
} from '@mui/icons-material';
import { MindMapState, MindMapNode } from '../../types/mindMap';

interface MarkdownTreeMapProps {
  mindMapState: MindMapState;
  onNodeClick: (nodeId: string) => void;
  currentNodeId: string;
  showPath?: boolean;
  compact?: boolean;
  className?: string;
}

interface TreeItem {
  node: MindMapNode;
  level: number;
  children: TreeItem[];
  isExpanded: boolean;
}

const MarkdownTreeMap: React.FC<MarkdownTreeMapProps> = ({
  mindMapState,
  onNodeClick,
  currentNodeId,
  showPath = true,
  compact = false,
  className
}) => {
  const [expandedNodes, setExpandedNodes] = React.useState<Set<string>>(new Set());

  // 构建树结构
  const treeStructure = useMemo(() => {
    const nodeMap = mindMapState.nodes;
    if (nodeMap.size === 0) return null;

    // 找根节点
    const rootNode = Array.from(nodeMap.values()).find(n => n.type === 'root');
    if (!rootNode) return null;

    // 递归构建树
    const buildTree = (node: MindMapNode, level: number = 0): TreeItem => {
      const children = node.children
        .map(childId => nodeMap.get(childId))
        .filter(Boolean)
        .map(childNode => buildTree(childNode!, level + 1));

      return {
        node,
        level,
        children,
        isExpanded: expandedNodes.has(node.id) || level < 2 // 默认展开前两层
      };
    };

    return buildTree(rootNode);
  }, [mindMapState.nodes, expandedNodes]);

  // 获取节点样式
  const getNodeStyle = (node: MindMapNode, level: number) => {
    const isActive = node.id === currentNodeId;
    const isExplored = node.metadata.explored;
    const hasChildren = node.children.length > 0;

    // 根据类型和状态设置样式（支持推荐型图谱的新类型）
    const typeStyles = {
      // 原有类型
      root: { color: '#6366f1', icon: '📚', bgColor: '#f0f9ff' },
      topic: { color: '#8b5cf6', icon: '💭', bgColor: '#f3e8ff' },
      deepen: { color: '#10b981', icon: '🌿', bgColor: '#ecfdf5' },
      next: { color: '#f59e0b', icon: '🔗', bgColor: '#fffbeb' },
      current: { color: '#ef4444', icon: '🎯', bgColor: '#fef2f2' },
      
      // 推荐型图谱新增类型
      person: { color: '#ec4899', icon: '👤', bgColor: '#fdf2f8' },
      concept: { color: '#06b6d4', icon: '💡', bgColor: '#f0fdfa' },
      method: { color: '#84cc16', icon: '🔧', bgColor: '#f7fee7' },
      case: { color: '#f97316', icon: '📝', bgColor: '#fff7ed' }
    };

    const baseStyle = typeStyles[node.type as keyof typeof typeStyles] || typeStyles.topic;
    
    return {
      ...baseStyle,
      opacity: isExplored ? 1 : 0.6,
      fontWeight: isActive ? 600 : level === 0 ? 600 : 400,
      fontSize: level === 0 ? '1.1rem' : level === 1 ? '1rem' : '0.9rem',
      padding: compact ? '4px 8px' : '8px 12px',
      borderColor: isActive ? baseStyle.color : 'transparent',
      borderWidth: isActive ? 2 : 1
    };
  };

  // 切换节点展开状态
  const toggleNodeExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 渲染树节点
  const renderTreeItem = (item: TreeItem): React.ReactNode => {
    const { node, level, children } = item;
    const style = getNodeStyle(node, level);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || level < 2;
    const indent = level * (compact ? 16 : 24);

    return (
      <Box key={node.id}>
        {/* 节点本身 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            ml: `${indent}px`,
            mb: compact ? 0.5 : 1,
            cursor: 'pointer',
            borderRadius: 1,
            border: 1,
            borderColor: style.borderColor,
            bgcolor: style.bgColor,
            p: style.padding,
            '&:hover': {
              bgcolor: `${style.color}20`,
              transform: 'translateX(2px)',
              transition: 'all 0.2s ease'
            },
            transition: 'all 0.2s ease'
          }}
          onClick={() => onNodeClick(node.id)}
        >
          {/* 展开/收起按钮 */}
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpanded(node.id);
              }}
              sx={{ mr: 0.5, p: 0.25 }}
            >
              {isExpanded ? (
                <ExpandMore fontSize="small" />
              ) : (
                <ExpandLess fontSize="small" />
              )}
            </IconButton>
          )}

          {/* Markdown风格的层级指示符 */}
          <Typography
            variant="body2"
            sx={{ 
              color: style.color,
              mr: 0.5,
              fontWeight: 'bold',
              fontSize: '0.8rem'
            }}
          >
            {'- '.repeat(Math.min(level + 1, 3))}
          </Typography>

          {/* 节点图标 */}
          <Box sx={{ mr: 1, fontSize: '1.2rem' }}>
            {style.icon}
          </Box>

          {/* 节点标题 */}
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              color: style.color,
              opacity: style.opacity
            }}
          >
            {node.title}
          </Typography>

          {/* 状态指示器 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 1 }}>
            {/* 探索状态 */}
            {node.metadata.explored ? (
              <Tooltip title="已探索">
                <CheckCircle sx={{ fontSize: '1rem', color: 'success.main' }} />
              </Tooltip>
            ) : (
              <Tooltip title="未探索">
                <RadioButtonUnchecked sx={{ fontSize: '1rem', color: 'grey.400' }} />
              </Tooltip>
            )}

            {/* 子节点数量 */}
            {hasChildren && (
              <Badge
                badgeContent={children.length}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.6rem',
                    minWidth: 16,
                    height: 16
                  }
                }}
              >
                <Circle sx={{ fontSize: '0.5rem', color: style.color }} />
              </Badge>
            )}

            {/* 点击次数（如果大于0） */}
            {node.interactions.clickCount > 0 && (
              <Chip
                label={`${node.interactions.clickCount}次`}
                size="small"
                variant="outlined"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  '& .MuiChip-label': { px: 0.5 }
                }}
              />
            )}
          </Box>
        </Box>

        {/* 子节点 */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box>
              {children.map(renderTreeItem)}
            </Box>
          </Collapse>
        )}
      </Box>
    );
  };

  // 生成当前路径的Markdown表示
  const getMarkdownPath = () => {
    const pathNodes = mindMapState.explorationPath
      .map(id => mindMapState.nodes.get(id))
      .filter(Boolean) as MindMapNode[];

    return pathNodes.map((node, index) => {
      const prefix = '  '.repeat(index); // 每级两个空格缩进
      return `${prefix}- ${node.title}`;
    }).join('\n');
  };

  if (!treeStructure) {
    return (
      <Paper
        className={className}
        sx={{
          p: 2,
          textAlign: 'center',
          color: 'text.secondary',
          bgcolor: 'background.default'
        }}
      >
        <Timeline sx={{ fontSize: '2rem', mb: 1, color: 'grey.400' }} />
        <Typography variant="body2">
          暂无思维导图数据
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      className={className}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 头部 */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Timeline color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            思维导图
          </Typography>
          <Chip
            label={`${mindMapState.stats.exploredNodes}/${mindMapState.stats.totalNodes}`}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* 当前路径显示 */}
        {showPath && mindMapState.explorationPath.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
              📍 当前路径:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                bgcolor: 'grey.50',
                p: 1,
                borderRadius: 1,
                border: 1,
                borderColor: 'grey.200',
                fontSize: '0.8rem',
                whiteSpace: 'pre-line'
              }}
            >
              {getMarkdownPath()}
            </Typography>
          </Box>
        )}
      </Box>

      {/* 树结构内容 */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          bgcolor: 'background.paper'
        }}
      >
        {renderTreeItem(treeStructure)}
      </Box>

      {/* 底部统计 */}
      <Box
        sx={{
          p: 1,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'text.secondary'
        }}
      >
        <Box>
          深度: {mindMapState.stats.maxDepth} | 
          节点: {mindMapState.stats.totalNodes}
        </Box>
        <Box>
          探索率: {mindMapState.stats.totalNodes > 0 
            ? Math.round((mindMapState.stats.exploredNodes / mindMapState.stats.totalNodes) * 100) 
            : 0}%
        </Box>
      </Box>
    </Paper>
  );
};

export default MarkdownTreeMap;