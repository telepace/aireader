/**
 * Markdown树结构思维导图组件
 * 使用简单的Markdown格式(- 标题)显示思维导图结构
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Collapse
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Timeline
} from '@mui/icons-material';
import { MindMapState, MindMapNode } from '../../types/mindMap';

interface MarkdownTreeMapProps {
  mindMapState: MindMapState;
  onNodeClick: (nodeId: string) => void;
  currentNodeId: string;
  showPath?: boolean;
  compact?: boolean;
  className?: string;
  onNodeExpand?: (nodeId: string, nodeTitle: string) => void; // 新增：节点展开回调
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
  className,
  onNodeExpand
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

  // Jobs-inspired节点样式系统
  const getNodeStyle = (node: MindMapNode, level: number) => {
    const isActive = node.id === currentNodeId;
    const isExplored = node.metadata.explored;
    const hasChildren = node.children.length > 0;

    // 语义化色彩系统 - 基于重要性而非类型
    const getSemanticColor = (level: number, type: string) => {
      // 根节点：深蓝色，权威感
      if (level === 0) return { primary: '#1a365d', bg: '#f7fafc', accent: '#2b77cb' };
      // 主要分支：翠绿色，成长感
      if (level === 1) return { primary: '#047857', bg: '#f0fdf4', accent: '#10b981' };
      // 子概念：琥珀色，学习感  
      if (level === 2) return { primary: '#92400e', bg: '#fffbeb', accent: '#f59e0b' };
      // 细节节点：石板色，稳重感
      return { primary: '#475569', bg: '#f8fafc', accent: '#64748b' };
    };

    const colors = getSemanticColor(level, node.type);
    
    // Jobs风格的视觉层次
    const visualHierarchy = {
      fontSize: level === 0 ? '1.25rem' : level === 1 ? '1.1rem' : level === 2 ? '1rem' : '0.9rem',
      fontWeight: level === 0 ? 700 : level === 1 ? 600 : level === 2 ? 500 : 400,
      lineHeight: level === 0 ? 1.4 : 1.3,
      opacity: isExplored ? 1 : 0.75, // 更优雅的未探索状态
    };

    // 优雅的间距系统
    const spacing = {
      padding: compact ? '8px 12px' : level === 0 ? '16px 20px' : level === 1 ? '12px 16px' : '10px 14px',
      marginBottom: compact ? 4 : level === 0 ? 12 : level === 1 ? 8 : 6,
      borderRadius: level === 0 ? 16 : level === 1 ? 12 : 8,
    };

    // 精致的交互状态
    const interactionStyles = {
      backgroundColor: isActive ? colors.accent + '15' : colors.bg,
      borderColor: isActive ? colors.accent : 'transparent',
      borderWidth: isActive ? 2 : 1,
      boxShadow: isActive 
        ? `0 4px 20px ${colors.accent}25`
        : hasChildren && level < 2 
          ? `0 2px 8px ${colors.primary}10` 
          : 'none',
    };

    // 类型图标映射（更精致的选择）
    const getTypeIcon = (type: string, level: number) => {
      const iconMap: Record<string, string> = {
        root: '🌟',
        person: '👤', 
        concept: '💡',
        method: '⚙️',
        case: '📋',
        topic: '💭',
        deepen: '🌿',
        next: '→',
        current: '📍'
      };
      return iconMap[type] || (level === 0 ? '◉' : level === 1 ? '○' : '·');
    };

    return {
      colors,
      ...visualHierarchy,
      ...spacing,
      ...interactionStyles,
      icon: getTypeIcon(node.type, level)
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

  // 渲染优雅的树节点
  const renderTreeItem = (item: TreeItem): React.ReactNode => {
    const { node, level, children } = item;
    const style = getNodeStyle(node, level);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes.has(node.id) || level < 2;
    
    // Jobs风格的缩进系统 - 基于16px网格
    const elegantIndent = level * 20; // 更宽松的缩进
    
    // 深度连接线（类似Xcode导航器）
    const depthIndicator = level > 0 ? (
      <Box
        sx={{
          position: 'absolute',
          left: elegantIndent - 10,
          top: 0,
          bottom: 0,
          width: 1,
          bgcolor: `${style.colors.primary}20`,
        }}
      />
    ) : null;

    return (
      <Box key={node.id} sx={{ position: 'relative' }}>
        {depthIndicator}
        
        {/* 优雅的节点容器 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            ml: `${elegantIndent}px`,
            mb: style.marginBottom / 8, // 转换为rem
            cursor: 'pointer',
            borderRadius: style.borderRadius / 8, // 转换为rem
            border: style.borderWidth,
            borderColor: style.borderColor,
            bgcolor: style.backgroundColor,
            p: style.padding,
            boxShadow: style.boxShadow,
            position: 'relative',
            overflow: 'hidden',
            
            // Jobs级别的微交互
            '&:hover': {
              transform: 'translateY(-1px) translateX(2px)',
              boxShadow: `0 8px 25px ${style.colors.primary}20`,
              bgcolor: `${style.colors.accent}08`,
              '&::before': {
                opacity: 1,
              }
            },
            
            // 精致的hover指示线
            '&::before': {
              content: '""',
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 3,
              bgcolor: style.colors.accent,
              opacity: node.id === currentNodeId ? 1 : 0,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            },
            
            // 丝滑过渡动画
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onClick={() => {
            onNodeClick(node.id);
            if (onNodeExpand && node.type !== 'root') {
              onNodeExpand(node.id, node.title);
            }
          }}
        >
          {/* 精致的展开/收起按钮 */}
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleNodeExpanded(node.id);
              }}
              sx={{ 
                mr: 1,
                p: 0.5,
                color: style.colors.primary,
                opacity: 0.7,
                '&:hover': {
                  opacity: 1,
                  bgcolor: `${style.colors.accent}10`,
                  transform: 'scale(1.1)',
                }
              }}
            >
              {isExpanded ? (
                <ExpandMore fontSize="small" />
              ) : (
                <ExpandLess fontSize="small" />
              )}
            </IconButton>
          )}

          {/* 移除技术性的markdown指示符，用视觉缩进代替 */}

          {/* 语义化的节点图标 */}
          <Box 
            sx={{ 
              mr: 1.5, 
              fontSize: level === 0 ? '1.4rem' : level === 1 ? '1.2rem' : '1rem',
              display: 'flex',
              alignItems: 'center',
              color: style.colors.primary,
              opacity: style.opacity
            }}
          >
            {style.icon}
          </Box>

          {/* 优雅的节点标题 */}
          <Typography
            sx={{
              flex: 1,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
              lineHeight: style.lineHeight,
              color: style.colors.primary,
              opacity: style.opacity,
              letterSpacing: level === 0 ? '0.5px' : '0.25px', // 增强可读性
            }}
          >
            {node.title}
          </Typography>

          {/* 优雅的状态指示器 - 渐进式披露 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
            
            {/* 子节点数量 - 更优雅的展示 */}
            {hasChildren && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: style.colors.primary,
                  opacity: 0.6,
                  fontSize: '0.8rem',
                  fontWeight: 500,
                }}
              >
                <span>{children.length}</span>
                <Box sx={{ fontSize: '0.7rem' }}>→</Box>
              </Box>
            )}

            {/* 探索状态 - 微妙的视觉提示 */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: node.metadata.explored 
                  ? style.colors.accent 
                  : `${style.colors.primary}30`,
                transition: 'all 0.3s ease',
              }}
            />

            {/* 交互统计 - 仅在有意义时显示 */}
            {node.interactions.clickCount > 2 && (
              <Box
                sx={{
                  fontSize: '0.7rem',
                  color: style.colors.primary,
                  opacity: 0.5,
                  fontWeight: 500,
                  px: 0.5,
                  py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: `${style.colors.accent}08`,
                }}
              >
                {node.interactions.clickCount}
              </Box>
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
      {/* 精致的头部设计 */}
      <Box
        sx={{
          p: 3,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.default',
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Box 
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              color: '#1a365d',
            }}
          >
            <Timeline sx={{ fontSize: '1.5rem' }} />
          </Box>
          
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 700, 
                color: '#1a365d',
                letterSpacing: '0.5px',
                mb: 0.5,
              }}
            >
              概念图谱
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: '#10b981',
                  color: 'white',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {mindMapState.stats.exploredNodes}/{mindMapState.stats.totalNodes} 已探索
              </Box>
              
              <Box
                sx={{
                  fontSize: '0.8rem',
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
              >
                完成度 {mindMapState.stats.totalNodes > 0 
                  ? Math.round((mindMapState.stats.exploredNodes / mindMapState.stats.totalNodes) * 100) 
                  : 0}%
              </Box>
            </Box>
          </Box>
        </Box>

        {/* 优雅的路径指示 - 去掉技术性的markdown格式 */}
        {showPath && mindMapState.explorationPath.length > 0 && (
          <Box 
            sx={{ 
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 255, 255, 0.7)',
              border: 1,
              borderColor: 'rgba(59, 130, 246, 0.2)',
            }}
          >
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#475569', 
                fontWeight: 600,
                mb: 1,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
              }}
            >
              <Box sx={{ fontSize: '1.1em' }}>🧭</Box>
              当前探索路径
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {mindMapState.explorationPath
                .map(id => mindMapState.nodes.get(id))
                .filter(Boolean)
                .map((node, index) => (
                <React.Fragment key={node!.id}>
                  <Box
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1.5,
                      bgcolor: index === mindMapState.explorationPath.length - 1 
                        ? '#1a365d' 
                        : 'rgba(71, 85, 105, 0.1)',
                      color: index === mindMapState.explorationPath.length - 1 
                        ? 'white' 
                        : '#475569',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                    }}
                  >
                    {node!.title}
                  </Box>
                  {index < mindMapState.explorationPath.length - 1 && (
                    <Box sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>→</Box>
                  )}
                </React.Fragment>
              ))}
            </Box>
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

      {/* 精致的底部统计 */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          bgcolor: 'rgba(248, 250, 252, 0.8)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <Box sx={{ fontSize: '1em' }}>📊</Box>
            <span>{mindMapState.stats.totalNodes} 个概念</span>
          </Box>
          
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              color: '#475569',
              fontSize: '0.8rem',
              fontWeight: 500,
            }}
          >
            <Box sx={{ fontSize: '1em' }}>🌳</Box>
            <span>{mindMapState.stats.maxDepth} 层深度</span>
          </Box>
        </Box>
        
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.5,
            borderRadius: 2,
            bgcolor: 'rgba(16, 185, 129, 0.1)',
            color: '#047857',
          }}
        >
          <Box 
            sx={{
              width: 32,
              height: 4,
              borderRadius: 2,
              bgcolor: 'rgba(16, 185, 129, 0.2)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${mindMapState.stats.totalNodes > 0 
                  ? (mindMapState.stats.exploredNodes / mindMapState.stats.totalNodes) * 100 
                  : 0}%`,
                bgcolor: '#10b981',
                borderRadius: 2,
                transition: 'width 0.5s ease',
              }}
            />
          </Box>
          
          <Box sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            {mindMapState.stats.totalNodes > 0 
              ? Math.round((mindMapState.stats.exploredNodes / mindMapState.stats.totalNodes) * 100) 
              : 0}%
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default MarkdownTreeMap;