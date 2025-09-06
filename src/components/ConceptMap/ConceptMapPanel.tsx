/**
 * 概念图可视化组件
 * 显示用户学习进度和概念关系图
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Tooltip,
  Badge,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as SparkleIcon,
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon,
  TrendingUp as TrendingUpIcon,
  Category as CategoryIcon,
  Info as InfoIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { ConceptMap as ConceptMapType, ConceptNode } from '../../types/concept';

interface ConceptMapPanelProps {
  conceptMap: ConceptMapType | null;
  isLoading: boolean;
  onConceptAbsorptionToggle: (conceptId: string, absorbed: boolean) => void;
  onClearConcepts: () => void;
}

const categoryIcons = {
  core: { icon: '🎯', color: '#6366f1', label: '核心理论' },
  method: { icon: '🔧', color: '#10b981', label: '方法技术' },
  application: { icon: '🚀', color: '#f59e0b', label: '应用实例' },
  support: { icon: '📚', color: '#8b5cf6', label: '支撑概念' }
};

const ConceptMapPanel = React.memo(function ConceptMapPanel({
  conceptMap,
  isLoading,
  onConceptAbsorptionToggle,
  onClearConcepts
}: ConceptMapPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ConceptNode['category'] | null>(null);

  // 调试日志 - 追踪渲染
  console.log('🎨 ConceptMapPanel render:', {
    hasConceptMap: !!conceptMap,
    nodeCount: conceptMap?.nodes?.size || 0,
    isLoading,
    timestamp: Date.now()
  });

  // 计算统计数据
  const stats = useMemo(() => {
    if (!conceptMap || conceptMap.nodes.size === 0) {
      return {
        total: 0,
        absorbed: 0,
        absorptionRate: 0,
        byCategory: { core: 0, method: 0, application: 0, support: 0 },
        avoidanceCount: 0
      };
    }

    const concepts = Array.from(conceptMap.nodes.values());
    const absorbed = concepts.filter(c => c.absorbed).length;
    
    const byCategory = {
      core: concepts.filter(c => c.category === 'core').length,
      method: concepts.filter(c => c.category === 'method').length,
      application: concepts.filter(c => c.category === 'application').length,
      support: concepts.filter(c => c.category === 'support').length
    };

    return {
      total: concepts.length,
      absorbed,
      absorptionRate: concepts.length > 0 ? absorbed / concepts.length : 0,
      byCategory,
      avoidanceCount: conceptMap.avoidanceList.length
    };
  }, [conceptMap]);

  // 按类别分组的概念
  const conceptsByCategory = useMemo(() => {
    if (!conceptMap) return { core: [], method: [], application: [], support: [] };

    const concepts = Array.from(conceptMap.nodes.values());
    return {
      core: concepts.filter(c => c.category === 'core').sort((a, b) => b.importance - a.importance),
      method: concepts.filter(c => c.category === 'method').sort((a, b) => b.importance - a.importance),
      application: concepts.filter(c => c.category === 'application').sort((a, b) => b.importance - a.importance),
      support: concepts.filter(c => c.category === 'support').sort((a, b) => b.importance - a.importance)
    };
  }, [conceptMap]);

  const handleToggleExpanded = useCallback(() => {
    setExpanded(prev => !prev);
  }, []);

  const handleCategoryClick = useCallback((category: ConceptNode['category']) => {
    setSelectedCategory(category);
    setDetailDialogOpen(true);
  }, []);

  const handleConceptToggle = useCallback((concept: ConceptNode) => {
    onConceptAbsorptionToggle(concept.id, !concept.absorbed);
  }, [onConceptAbsorptionToggle]);

  const handleCloseDialog = useCallback(() => {
    setDetailDialogOpen(false);
    setSelectedCategory(null);
  }, []);

  if (!conceptMap && !isLoading) {
    return (
      <Box sx={{ py: 2 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <PsychologyIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" color="text.secondary">
            概念图谱
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
          开始对话后将自动构建概念图谱
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box>
        {/* 头部 */}
        <Box
          className="concept-header"
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          sx={{ 
            cursor: 'pointer',
            py: 1,
            px: 0.5,
            borderRadius: 1,
            transition: 'all 0.2s ease'
          }}
          onClick={handleToggleExpanded}
        >
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={stats.total} color="primary" max={99} showZero={false}>
              <PsychologyIcon color="primary" fontSize="small" />
            </Badge>
            <Typography variant="subtitle2" fontWeight={600}>
              概念图谱
            </Typography>
            {stats.avoidanceCount > 0 && (
              <Tooltip title={`${stats.avoidanceCount} 个概念被标记为已掌握`}>
                <Chip 
                  size="small" 
                  label={stats.avoidanceCount}
                  color="success"
                  variant="outlined"
                  sx={{ 
                    height: 20,
                    fontSize: '0.7rem',
                    '& .MuiChip-label': { px: 0.75 }
                  }}
                />
              </Tooltip>
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {isLoading && (
              <SparkleIcon 
                color="action" 
                fontSize="small"
                sx={{ 
                  animation: 'pulse 1.5s ease-in-out infinite',
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1, transform: 'scale(1)' },
                    '50%': { opacity: 0.5, transform: 'scale(1.1)' }
                  }
                }} 
              />
            )}
            <IconButton size="small" sx={{ p: 0.5 }}>
              {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
        </Box>

        <Collapse in={expanded} timeout={300}>
          <Box py={1.5}>
            {/* 进度总览 */}
            <Box mb={1.5}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="caption" color="text.secondary">
                  学习进度
                </Typography>
                <Typography variant="caption" fontWeight="medium">
                  {stats.absorbed} / {stats.total} ({Math.round(stats.absorptionRate * 100)}%)
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={stats.absorptionRate * 100}
                sx={{ height: 4, borderRadius: 2 }}
              />
            </Box>

            {/* 类别统计 */}
            <Box display="flex" flexWrap="wrap" gap={0.5} mb={1.5}>
              {(Object.entries(categoryIcons) as Array<[ConceptNode['category'], any]>).map(([category, config]) => {
                const count = stats.byCategory[category];
                const concepts = conceptsByCategory[category];
                const absorbedCount = concepts.filter(c => c.absorbed).length;
                
                return (
                  <Tooltip 
                    key={category}
                    title={`${config.label}: ${absorbedCount}/${count} 已掌握`}
                  >
                    <Chip
                      icon={<span style={{ fontSize: '10px' }}>{config.icon}</span>}
                      label={`${count}`}
                      size="small"
                      variant={count > 0 ? "filled" : "outlined"}
                      sx={{ 
                        height: 24,
                        fontSize: '0.7rem',
                        bgcolor: count > 0 ? config.color + '15' : 'transparent',
                        borderColor: config.color,
                        '&:hover': { bgcolor: config.color + '25' },
                        '& .MuiChip-label': { px: 0.75 }
                      }}
                      onClick={() => count > 0 && handleCategoryClick(category)}
                      clickable={count > 0}
                    />
                  </Tooltip>
                );
              })}
            </Box>

            {/* 最近概念预览 */}
            {stats.total > 0 && (
              <Box mb={1.5}>
                <Typography variant="caption" color="text.secondary" mb={0.5} display="block">
                  最近概念
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.3}>
                  {Array.from(conceptMap!.nodes.values())
                    .sort((a, b) => b.lastReviewed - a.lastReviewed)
                    .slice(0, 5)
                    .map((concept) => (
                      <Chip
                        key={concept.id}
                        label={concept.name}
                        size="small"
                        variant="outlined"
                        icon={concept.absorbed ? <CheckIcon sx={{ fontSize: 12 }} /> : <UncheckedIcon sx={{ fontSize: 12 }} />}
                        onClick={() => handleConceptToggle(concept)}
                        sx={{ 
                          fontSize: '0.65rem',
                          height: 20,
                          '& .MuiChip-icon': { marginLeft: 0.5, marginRight: -0.5 },
                          '& .MuiChip-label': { px: 0.5 },
                          bgcolor: concept.absorbed ? 'success.light' : 'transparent',
                          borderColor: categoryIcons[concept.category].color,
                          '&:hover': { bgcolor: categoryIcons[concept.category].color + '20' }
                        }}
                      />
                    ))}
                </Box>
              </Box>
            )}

            {/* 操作按钮 */}
            {stats.total > 0 && (
              <Box display="flex" gap={0.5}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TrendingUpIcon fontSize="small" />}
                  onClick={() => setDetailDialogOpen(true)}
                  sx={{ 
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1,
                    minWidth: 'auto'
                  }}
                >
                  详情
                </Button>
                <Button
                  size="small"
                  variant="text"
                  color="error"
                  startIcon={<ClearIcon fontSize="small" />}
                  onClick={onClearConcepts}
                  sx={{ 
                    fontSize: '0.7rem',
                    py: 0.5,
                    px: 1,
                    minWidth: 'auto'
                  }}
                >
                  清空
                </Button>
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>

      {/* 详细信息对话框 */}
      <Dialog 
        open={detailDialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { maxHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            {selectedCategory ? (
              <>
                <span style={{ fontSize: '20px' }}>
                  {categoryIcons[selectedCategory].icon}
                </span>
                <Typography variant="h6">
                  {categoryIcons[selectedCategory].label}
                </Typography>
                <Chip size="small" label={conceptsByCategory[selectedCategory].length} />
              </>
            ) : (
              <>
                <CategoryIcon />
                <Typography variant="h6">概念图谱详情</Typography>
              </>
            )}
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          {selectedCategory ? (
            <List dense>
              {conceptsByCategory[selectedCategory].map((concept, index) => (
                <React.Fragment key={concept.id}>
                  <ListItem
                    component="div"
                    onClick={() => handleConceptToggle(concept)}
                    sx={{ 
                      borderRadius: 1,
                      mb: 0.5,
                      bgcolor: concept.absorbed ? 'success.light' : 'transparent',
                      '&:hover': { bgcolor: concept.absorbed ? 'success.main' : 'action.hover' },
                      cursor: 'pointer'
                    }}
                  >
                    <ListItemIcon>
                      {concept.absorbed ? 
                        <CheckIcon color="success" /> : 
                        <UncheckedIcon color="action" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary={concept.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {concept.description}
                          </Typography>
                          <Box display="flex" gap={0.5} mt={0.5}>
                            <Chip 
                              label={`重要性: ${Math.round(concept.importance * 100)}%`}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '10px', height: 20 }}
                            />
                            {concept.keywords.slice(0, 3).map(keyword => (
                              <Chip 
                                key={keyword}
                                label={keyword}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '10px', height: 20 }}
                              />
                            ))}
                          </Box>
                        </Box>
                      }
                    />
                    <Tooltip title={concept.absorbed ? '点击标记为未掌握' : '点击标记为已掌握'}>
                      <IconButton edge="end">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </ListItem>
                  {index < conceptsByCategory[selectedCategory].length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box>
              <Typography variant="body1" gutterBottom>
                概念学习进度统计
              </Typography>
              {/* 这里可以添加更详细的统计信息 */}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleCloseDialog}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}, (prevProps, nextProps) => {
  // 调试日志 - 追踪比较逻辑
  const shouldSkipRender = (() => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      console.log('🔄 ConceptMapPanel: isLoading changed', prevProps.isLoading, '->', nextProps.isLoading);
      return false;
    }
    if (prevProps.onConceptAbsorptionToggle !== nextProps.onConceptAbsorptionToggle) {
      console.log('🔄 ConceptMapPanel: onConceptAbsorptionToggle function changed');
      return false;
    }
    if (prevProps.onClearConcepts !== nextProps.onClearConcepts) {
      console.log('🔄 ConceptMapPanel: onClearConcepts function changed');
      return false;
    }
    
    // 深度比较conceptMap
    if (!prevProps.conceptMap && !nextProps.conceptMap) {
      console.log('✅ ConceptMapPanel: Both conceptMaps are null, skipping render');
      return true;
    }
    if (!prevProps.conceptMap || !nextProps.conceptMap) {
      console.log('🔄 ConceptMapPanel: conceptMap null state changed', 
        !!prevProps.conceptMap, '->', !!nextProps.conceptMap);
      return false;
    }
    
    // 比较概念映射的关键属性
    if (prevProps.conceptMap.nodes.size !== nextProps.conceptMap.nodes.size) {
      console.log('🔄 ConceptMapPanel: nodes.size changed', 
        prevProps.conceptMap.nodes.size, '->', nextProps.conceptMap.nodes.size);
      return false;
    }
    if (prevProps.conceptMap.avoidanceList.length !== nextProps.conceptMap.avoidanceList.length) {
      console.log('🔄 ConceptMapPanel: avoidanceList.length changed', 
        prevProps.conceptMap.avoidanceList.length, '->', nextProps.conceptMap.avoidanceList.length);
      return false;
    }
    
    // 如果节点数量相同，比较最后更新时间
    if (prevProps.conceptMap.stats.lastUpdated !== nextProps.conceptMap.stats.lastUpdated) {
      console.log('🔄 ConceptMapPanel: stats.lastUpdated changed', 
        prevProps.conceptMap.stats.lastUpdated, '->', nextProps.conceptMap.stats.lastUpdated);
      return false;
    }
    
    console.log('✅ ConceptMapPanel: No changes detected, skipping render');
    return true;
  })();
  
  return shouldSkipRender;
});

export default ConceptMapPanel;