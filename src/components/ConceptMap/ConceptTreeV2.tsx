/**
 * 重构版概念树渲染器
 * 简化结构，优化性能，避免过度渲染
 */

import React, { memo, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountTree as TreeIcon,
  Circle as NodeIcon
} from '@mui/icons-material';
import { ConceptTree, ConceptTreeNode } from '../../types/concept';

interface ConceptTreeV2Props {
  conceptTree: ConceptTree | null;
  isLoading?: boolean;
  maxDepth?: number;
}

interface TreeNodeV2Props {
  node: ConceptTreeNode;
  depth: number;
  maxDepth: number;
  isLast?: boolean;
}

// 深度颜色配置 - 简化版
const getNodeColor = (depth: number): string => {
  const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  return colors[Math.min(depth, colors.length - 1)];
};

// 单个树节点组件 - 简化版
const TreeNodeV2 = memo<TreeNodeV2Props>(({ node, depth, maxDepth, isLast = false }) => {
  const [expanded, setExpanded] = useState(depth < 2); // 默认只展开前两层
  const hasChildren = node.children && node.children.length > 0;
  const nodeColor = getNodeColor(depth);

  if (depth > maxDepth) return null;

  return (
    <Box>
      {/* 当前节点 */}
      <Paper
        elevation={0}
        sx={{
          mb: 0.5,
          p: 1.5,
          borderLeft: `3px solid ${nodeColor}`,
          bgcolor: alpha(nodeColor, 0.03),
          '&:hover': {
            bgcolor: alpha(nodeColor, 0.08)
          }
        }}
      >
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5} flex={1}>
            {/* 节点指示器 */}
            <NodeIcon 
              sx={{ 
                fontSize: 8, 
                color: nodeColor,
                ml: depth * 1.5 
              }} 
            />
            
            {/* 节点内容 */}
            <Box>
              <Typography 
                variant="body2" 
                fontWeight={depth === 0 ? 600 : 500}
                color={depth === 0 ? 'primary.main' : 'text.primary'}
                sx={{ fontSize: Math.max(0.875 - depth * 0.05, 0.75) + 'rem' }}
              >
                {node.name}
              </Typography>
              
              {/* 节点信息 */}
              <Box display="flex" alignItems="center" gap={0.5} mt={0.3}>
                <Chip
                  size="small"
                  label={`L${depth}`}
                  sx={{
                    height: 16,
                    fontSize: '0.65rem',
                    bgcolor: alpha(nodeColor, 0.15),
                    color: nodeColor,
                    '& .MuiChip-label': { px: 0.5 }
                  }}
                />
                {hasChildren && (
                  <Chip
                    size="small"
                    label={`${node.children.length}子`}
                    variant="outlined"
                    sx={{
                      height: 16,
                      fontSize: '0.65rem',
                      borderColor: alpha(nodeColor, 0.3),
                      color: 'text.secondary',
                      '& .MuiChip-label': { px: 0.5 }
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* 展开按钮 */}
          {hasChildren && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              sx={{ 
                color: nodeColor,
                '&:hover': { bgcolor: alpha(nodeColor, 0.1) }
              }}
            >
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          )}
        </Box>
      </Paper>

      {/* 子节点 */}
      {hasChildren && (
        <Collapse in={expanded} timeout={150} unmountOnExit>
          <Box sx={{ ml: 2, position: 'relative' }}>
            {/* 连接线 */}
            <Box
              sx={{
                position: 'absolute',
                left: depth * 1.5 + 0.5,
                top: 0,
                bottom: 8,
                width: 1,
                bgcolor: alpha(nodeColor, 0.2)
              }}
            />
            
            {node.children.map((child, index) => (
              <TreeNodeV2
                key={`${child.id}-${index}`} // 简化key
                node={child}
                depth={depth + 1}
                maxDepth={maxDepth}
                isLast={index === node.children.length - 1}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
});

TreeNodeV2.displayName = 'TreeNodeV2';

// 主组件 - 简化版
const ConceptTreeV2 = memo<ConceptTreeV2Props>(({ 
  conceptTree, 
  isLoading = false,
  maxDepth = 4 
}) => {
  const theme = useTheme();

  // 树状统计信息 - 简化版
  const treeStats = useMemo(() => {
    if (!conceptTree) return { totalNodes: 0, maxDepth: 0 };

    const countNodes = (node: ConceptTreeNode, depth = 0): { total: number; maxDepth: number } => {
      let total = 1;
      let currentMaxDepth = depth;

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const childStats = countNodes(child, depth + 1);
          total += childStats.total;
          currentMaxDepth = Math.max(currentMaxDepth, childStats.maxDepth);
        }
      }

      return { total, maxDepth: currentMaxDepth };
    };

    const stats = countNodes({
      id: conceptTree.id,
      name: conceptTree.name,
      children: conceptTree.children
    });

    return { totalNodes: stats.total, maxDepth: stats.maxDepth };
  }, [conceptTree]);

  if (isLoading) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <TreeIcon 
          sx={{ 
            fontSize: 40, 
            color: 'primary.main',
            animation: 'pulse 1.5s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.5 }
            }
          }} 
        />
        <Typography variant="body2" color="text.secondary" mt={1}>
          正在构建概念树...
        </Typography>
      </Box>
    );
  }

  if (!conceptTree) {
    return (
      <Alert
        severity="info"
        icon={<TreeIcon />}
        sx={{ 
          bgcolor: alpha(theme.palette.info.main, 0.05),
          color: 'info.main',
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
        }}
      >
        <Typography variant="body2">
          暂无概念树数据
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
          开始对话后将自动构建层级概念结构
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* 头部信息 - 简化版 */}
      <Paper 
        elevation={0}
        sx={{ 
          mb: 2, 
          p: 2, 
          bgcolor: alpha(theme.palette.primary.main, 0.03),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
        }}
      >
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <TreeIcon color="primary" fontSize="small" />
          <Typography variant="subtitle2" fontWeight={600} color="primary.main">
            概念树结构
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Chip 
            size="small" 
            label={`${treeStats.totalNodes}个概念`}
            color="primary"
            variant="outlined"
          />
          <Chip 
            size="small" 
            label={`${treeStats.maxDepth + 1}层深度`}
            color="secondary"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* 树状结构 */}
      <TreeNodeV2
        node={{
          id: conceptTree.id,
          name: conceptTree.name,
          children: conceptTree.children
        }}
        depth={0}
        maxDepth={maxDepth}
      />
    </Box>
  );
});

ConceptTreeV2.displayName = 'ConceptTreeV2';

export default ConceptTreeV2;