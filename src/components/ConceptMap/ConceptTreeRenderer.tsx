/**
 * 递归概念树渲染组件
 * 优雅展示层级概念结构
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Paper,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountTree as TreeIcon,
  Psychology as ConceptIcon
} from '@mui/icons-material';
import { ConceptTree, ConceptTreeNode } from '../../types/concept';

interface ConceptTreeRendererProps {
  conceptTree: ConceptTree | null;
  isLoading?: boolean;
  maxDepth?: number;
  onNodeClick?: (node: ConceptTreeNode) => void;
}

interface TreeNodeProps {
  node: ConceptTreeNode;
  depth: number;
  maxDepth: number;
  isLast?: boolean;
  parentCollapsed?: boolean;
  onNodeClick?: (node: ConceptTreeNode) => void;
}

// 深度对应的颜色主题
const depthColors = [
  '#6366f1', // 紫色 - 根节点
  '#10b981', // 绿色 - 第一层
  '#f59e0b', // 橙色 - 第二层  
  '#ef4444', // 红色 - 第三层
  '#8b5cf6', // 紫色 - 第四层
  '#06b6d4', // 青色 - 第五层+
];

// 单个树节点组件
function TreeNode({ 
  node, 
  depth, 
  maxDepth, 
  isLast = false, 
  parentCollapsed = false,
  onNodeClick 
}: TreeNodeProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(depth < 2); // 默认展开前两层
  const hasChildren = node.children && node.children.length > 0;
  
  const handleToggleExpanded = useCallback(() => {
    if (hasChildren) {
      setExpanded(prev => !prev);
    }
  }, [hasChildren]);

  const handleNodeClick = useCallback(() => {
    onNodeClick?.(node);
  }, [node, onNodeClick]);

  // 根据深度获取颜色
  const nodeColor = useMemo(() => {
    const colorIndex = Math.min(depth, depthColors.length - 1);
    return depthColors[colorIndex];
  }, [depth]);

  // 计算节点样式
  const nodeStyle = useMemo(() => ({
    borderLeft: `3px solid ${nodeColor}`,
    backgroundColor: alpha(nodeColor, 0.05),
    '&:hover': {
      backgroundColor: alpha(nodeColor, 0.1),
    }
  }), [nodeColor]);

  if (parentCollapsed) return null;

  return (
    <>
      {/* 当前节点 */}
      <Paper
        elevation={0}
        sx={{
          mb: 0.5,
          borderRadius: 1,
          transition: 'all 0.2s ease',
          cursor: onNodeClick ? 'pointer' : 'default',
          ...nodeStyle
        }}
        onClick={handleNodeClick}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ 
            p: 1.5,
            pl: 2 + depth * 1.5, // 根据深度增加左边距
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5} flex={1}>
            {/* 连接线指示器 */}
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: nodeColor,
                flexShrink: 0
              }}
            />
            
            {/* 节点内容 */}
            <Box flex={1}>
              <Typography 
                variant="body2" 
                fontWeight={depth === 0 ? 600 : 500}
                color={depth === 0 ? 'primary.main' : 'text.primary'}
                sx={{ 
                  fontSize: Math.max(0.85 - depth * 0.05, 0.75) + 'rem',
                  lineHeight: 1.4
                }}
              >
                {node.name}
              </Typography>
              
              {/* 节点元信息 */}
              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <Chip
                  size="small"
                  label={`L${depth}`}
                  sx={{
                    height: 18,
                    fontSize: '0.6rem',
                    bgcolor: alpha(nodeColor, 0.15),
                    color: nodeColor,
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
                {hasChildren && (
                  <Chip
                    size="small"
                    label={`${node.children.length} 子概念`}
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      borderColor: alpha(nodeColor, 0.3),
                      color: alpha(theme.palette.text.primary, 0.7),
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* 展开/收起按钮 */}
          {hasChildren && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpanded();
              }}
              sx={{ 
                ml: 1,
                color: nodeColor,
                '&:hover': { backgroundColor: alpha(nodeColor, 0.1) }
              }}
            >
              {expanded ? 
                <ExpandLessIcon fontSize="small" /> : 
                <ExpandMoreIcon fontSize="small" />
              }
            </IconButton>
          )}
        </Box>
      </Paper>

      {/* 子节点 */}
      {hasChildren && (
        <Collapse in={expanded} timeout={300}>
          <Box sx={{ position: 'relative' }}>
            {/* 垂直连接线 */}
            <Box
              sx={{
                position: 'absolute',
                left: 2 + depth * 1.5 + 0.75, // 对齐父节点圆点
                top: 0,
                bottom: 8,
                width: 2,
                backgroundColor: alpha(nodeColor, 0.2),
                borderRadius: 1
              }}
            />
            
            {node.children.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                maxDepth={maxDepth}
                isLast={index === node.children.length - 1}
                parentCollapsed={!expanded}
                onNodeClick={onNodeClick}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </>
  );
}

export default function ConceptTreeRenderer({ 
  conceptTree, 
  isLoading = false,
  maxDepth = 5,
  onNodeClick 
}: ConceptTreeRendererProps) {
  const theme = useTheme();

  // 统计信息
  const treeStats = useMemo(() => {
    if (!conceptTree) return { totalNodes: 0, maxDepth: 0, leafNodes: 0 };

    const countNodes = (node: ConceptTreeNode, depth = 0): {
      total: number;
      maxDepth: number;
      leafCount: number;
    } => {
      let total = 1;
      let currentMaxDepth = depth;
      let leafCount = 0;

      if (!node.children || node.children.length === 0) {
        leafCount = 1;
      } else {
        node.children.forEach(child => {
          const childStats = countNodes(child, depth + 1);
          total += childStats.total;
          currentMaxDepth = Math.max(currentMaxDepth, childStats.maxDepth);
          leafCount += childStats.leafCount;
        });
      }

      return { total, maxDepth: currentMaxDepth, leafCount };
    };

    const rootStats = countNodes({ 
      id: conceptTree.id, 
      name: conceptTree.name, 
      children: conceptTree.children 
    });

    return {
      totalNodes: rootStats.total,
      maxDepth: rootStats.maxDepth,
      leafNodes: rootStats.leafCount
    };
  }, [conceptTree]);

  if (isLoading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <ConceptIcon 
          sx={{ 
            fontSize: 40, 
            color: 'primary.main',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1, transform: 'scale(1)' },
              '50%': { opacity: 0.5, transform: 'scale(1.1)' }
            }
          }} 
        />
        <Typography variant="body2" color="text.secondary" mt={1}>
          正在生成概念图谱...
        </Typography>
      </Box>
    );
  }

  if (!conceptTree) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <TreeIcon sx={{ fontSize: 40, color: 'action.disabled' }} />
        <Typography variant="body2" color="text.secondary" mt={1}>
          暂无概念图谱数据
        </Typography>
        <Typography variant="caption" color="text.secondary">
          开始对话后将自动构建层级概念结构
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      {/* 头部信息 */}
      <Box sx={{ mb: 2, p: 2, bgcolor: alpha(theme.palette.primary.main, 0.05), borderRadius: 1 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <TreeIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
            概念图谱结构
          </Typography>
        </Box>
        
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip 
            size="small" 
            label={`${treeStats.totalNodes} 个概念`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={`${treeStats.maxDepth + 1} 层深度`}
            color="secondary"
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={`${treeStats.leafNodes} 个叶节点`}
            color="default"
            variant="outlined"
          />
        </Box>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {/* 树状结构 */}
      <Box sx={{ position: 'relative' }}>
        <TreeNode
          node={{
            id: conceptTree.id,
            name: conceptTree.name,
            children: conceptTree.children
          }}
          depth={0}
          maxDepth={maxDepth}
          onNodeClick={onNodeClick}
        />
      </Box>
      
      {/* 图例 */}
      <Box sx={{ mt: 3, p: 1.5, bgcolor: alpha(theme.palette.text.primary, 0.02), borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary" mb={1} display="block">
          深度图例
        </Typography>
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {depthColors.slice(0, Math.min(treeStats.maxDepth + 1, depthColors.length)).map((color, index) => (
            <Box key={index} display="flex" alignItems="center" gap={0.5}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: color
                }}
              />
              <Typography variant="caption" color="text.secondary">
                L{index}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}