/**
 * 优雅简洁的概念树组件V3
 * 基于参考设计实现清爽的层级概念展示
 */

import React, { memo, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Collapse,
  IconButton,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
  AccountTree as TreeIcon
} from '@mui/icons-material';
import { ConceptTree } from '../../types/concept';

interface ConceptTreeV3Props {
  conceptTree: ConceptTree | null;
  isLoading?: boolean;
  maxDepth?: number;
  onConceptClick?: (conceptName: string) => void;
}

interface TreeNodeProps {
  node: any;
  level: number;
  searchTerm: string;
  expandedNodes: Set<string>;
  onToggle: (nodeId: string) => void;
  maxDepth: number;
  onConceptClick?: (conceptName: string) => void;
}

// 搜索组件
const TreeSearch = memo<{ searchTerm: string; onSearch: (term: string) => void }>(({ searchTerm, onSearch }) => {
  return (
    <TextField
      fullWidth
      size="small"
      placeholder="搜索概念..."
      value={searchTerm}
      onChange={(e) => onSearch(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon sx={{ color: 'action.disabled', fontSize: '1.25rem' }} />
          </InputAdornment>
        ),
      }}
      sx={{
        '& .MuiOutlinedInput-root': {
          borderRadius: 2,
          bgcolor: 'background.paper',
          '& fieldset': {
            borderColor: 'divider',
          },
          '&:hover fieldset': {
            borderColor: 'text.secondary',
          },
          '&.Mui-focused fieldset': {
            borderColor: 'primary.main',
          },
        },
        '& .MuiInputBase-input': {
          fontSize: '0.875rem',
          py: 1.5,
        },
      }}
    />
  );
});

TreeSearch.displayName = 'TreeSearch';

// 树节点组件
const TreeNode = memo<TreeNodeProps>(({ node, level, searchTerm, expandedNodes, onToggle, maxDepth, onConceptClick }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const shouldShow = !searchTerm || node.name.toLowerCase().includes(searchTerm.toLowerCase());
  
  if (!shouldShow || level > maxDepth) return null;
  
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    return text.replace(regex, '<mark style="background-color: #ffeb3b; padding: 0;">$1</mark>');
  };
  
  return (
    <>
      <ListItem
        disablePadding
        sx={{
          pl: level * 2,
        }}
      >
        <ListItemButton
          onClick={(e) => {
            console.log('🖱️ 概念树节点被点击:', {
              name: node.name,
              level: level,
              hasChildren: hasChildren,
              onConceptClick: !!onConceptClick
            });
            
            if (hasChildren) {
              console.log('📂 展开/收起子节点:', node.id);
              onToggle(node.id);
            } else if (onConceptClick) {
              // 叶子节点（包括根节点），点击发送解释消息
              console.log('🌳 触发概念点击事件:', node.name);
              onConceptClick(node.name);
            } else {
              console.warn('⚠️ 无可执行操作:', { hasChildren, onConceptClick: !!onConceptClick });
            }
          }}
          sx={{
            minHeight: 40,
            py: 0.5,
            px: 1.5,
            borderRadius: 1,
            mx: 0.5,
            '&:hover': {
              bgcolor: alpha('#000', hasChildren || onConceptClick ? 0.04 : 0.02),
            },
            cursor: hasChildren || onConceptClick ? 'pointer' : 'default',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                flex: 1,
                minWidth: 0,
              }}
            >
              {hasChildren && (
                <IconButton
                  size="small"
                  sx={{
                    p: 0,
                    minWidth: 16,
                    minHeight: 16,
                    color: 'text.secondary',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(node.id);
                  }}
                >
                  {isExpanded ? (
                    <ArrowDownIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <ArrowRightIcon sx={{ fontSize: 16 }} />
                  )}
                </IconButton>
              )}
              
              <ListItemText
                primary={
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: level === 0 ? '0.9rem' : '0.875rem',
                      fontWeight: level === 0 ? 500 : 400,
                      color: 'text.primary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    dangerouslySetInnerHTML={{ __html: highlightText(node.name) }}
                  />
                }
                sx={{ my: 0 }}
              />
            </Box>
            
            {hasChildren && (
              <Typography
                variant="caption"
                sx={{
                  color: 'text.secondary',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  minWidth: 'fit-content',
                  ml: 1,
                }}
              >
                {node.children.length}
              </Typography>
            )}
          </Box>
        </ListItemButton>
      </ListItem>
      
      {hasChildren && (
        <Collapse in={isExpanded} timeout={200}>
          {node.children.map((child: any) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              searchTerm={searchTerm}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              maxDepth={maxDepth}
              onConceptClick={onConceptClick}
            />
          ))}
        </Collapse>
      )}
    </>
  );
});

TreeNode.displayName = 'TreeNode';

// 主组件
const ConceptTreeV3 = memo<ConceptTreeV3Props>(({ conceptTree, isLoading = false, maxDepth = 4, onConceptClick }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  const totalNodes = useMemo(() => {
    if (!conceptTree) return 0;
    
    const countNodes = (node: any): number => {
      let count = 1;
      if (node.children && Array.isArray(node.children)) {
        count += node.children.reduce((sum: number, child: any) => sum + countNodes(child), 0);
      }
      return count;
    };
    
    return countNodes(conceptTree);
  }, [conceptTree]);
  
  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <TreeIcon sx={{ fontSize: 32, color: 'action.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          正在构建概念树...
        </Typography>
      </Box>
    );
  }

  if (!conceptTree) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <TreeIcon sx={{ fontSize: 32, color: 'action.disabled', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          📝 话题按钮生成中...
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          🤖 AI正在分析对话内容
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
          💡 完成后点击话题概念可深入探讨
        </Typography>
        
        <Typography variant="caption" color="warning.main" sx={{ 
          display: 'block', 
          fontWeight: 500,
          bgcolor: 'warning.light',
          p: 1,
          borderRadius: 1,
          opacity: 0.8
        }}>
          ⚠️ 如果长时间无话题出现，请检查API配置
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: 'background.paper', minHeight: '100%' }}>
      {/* 头部标题 */}
      <Box sx={{ p: 2, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <TreeIcon sx={{ fontSize: 20, color: 'text.primary' }} />
          <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 600 }}>
            概念树
          </Typography>
        </Box>
        
        {/* 搜索框 */}
        <TreeSearch searchTerm={searchTerm} onSearch={setSearchTerm} />
      </Box>
      
      {/* 概念树列表 */}
      <List sx={{ px: 1, py: 0 }}>
        <TreeNode
          node={conceptTree}
          level={0}
          searchTerm={searchTerm}
          expandedNodes={expandedNodes}
          onToggle={toggleNode}
          maxDepth={maxDepth}
          onConceptClick={onConceptClick}
        />
      </List>
      
      {/* 底部统计 */}
      <Box
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha('#000', 0.01),
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
            textAlign: 'center',
            display: 'block',
          }}
        >
          共 {totalNodes} 个概念
        </Typography>
      </Box>
    </Box>
  );
});

ConceptTreeV3.displayName = 'ConceptTreeV3';

export default ConceptTreeV3;