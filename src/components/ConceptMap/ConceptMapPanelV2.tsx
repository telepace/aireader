/**
 * 重构版概念图谱面板
 * 简化设计，提升性能和稳定性
 */

import React, { memo, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  LinearProgress,
  IconButton,
  Collapse,
  Alert,
  Stack,
  Divider,
  useTheme,
  alpha
} from '@mui/material';
import {
  Psychology as BrainIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckIcon,
  Circle as CircleIcon
} from '@mui/icons-material';
import { ConceptMap as ConceptMapType, ConceptNode } from '../../types/concept';

interface ConceptMapPanelV2Props {
  conceptMap: ConceptMapType | null;
  isLoading?: boolean;
}

interface ConceptStatsProps {
  conceptMap: ConceptMapType;
}

interface ConceptCategoryProps {
  title: string;
  icon: string;
  color: string;
  concepts: ConceptNode[];
  isExpanded: boolean;
  onToggle: () => void;
}

// 类别配置
const CATEGORIES = {
  core: { icon: '🎯', color: '#6366f1', label: '核心概念' },
  method: { icon: '🔧', color: '#10b981', label: '方法技能' },
  application: { icon: '⚡', color: '#f59e0b', label: '实际应用' },
  support: { icon: '📚', color: '#8b5cf6', label: '支撑知识' }
} as const;

// 概念统计组件
const ConceptStats = memo<ConceptStatsProps>(({ conceptMap }) => {
  const theme = useTheme();
  
  const stats = useMemo(() => {
    const concepts = Array.from(conceptMap.nodes.values());
    const total = concepts.length;
    const absorbed = concepts.filter(c => c.absorbed).length;
    const rate = total > 0 ? Math.round((absorbed / total) * 100) : 0;
    
    const byCategory = {
      core: concepts.filter(c => c.category === 'core').length,
      method: concepts.filter(c => c.category === 'method').length,
      application: concepts.filter(c => c.category === 'application').length,
      support: concepts.filter(c => c.category === 'support').length
    };
    
    return { total, absorbed, rate, byCategory };
  }, [conceptMap]);

  if (stats.total === 0) {
    return (
      <Alert
        severity="info"
        icon={<BrainIcon />}
        sx={{ 
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          color: 'primary.main',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
        }}
      >
        <Typography variant="body2">
          开始对话后将自动构建概念图谱
        </Typography>
      </Alert>
    );
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        bgcolor: alpha(theme.palette.primary.main, 0.02),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <BrainIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" fontWeight={600} color="primary.main">
          学习进度
        </Typography>
        <Chip 
          size="small" 
          label={`${stats.absorbed}/${stats.total}`}
          color="primary"
          variant="outlined"
        />
      </Box>

      <Box mb={2}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
          <Typography variant="caption" color="text.secondary">
            概念吸收率
          </Typography>
          <Typography variant="caption" color="primary.main" fontWeight={600}>
            {stats.rate}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={stats.rate}
          sx={{ 
            height: 6,
            borderRadius: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            '& .MuiLinearProgress-bar': {
              borderRadius: 3
            }
          }}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {Object.entries(stats.byCategory).map(([key, count]) => {
          const category = CATEGORIES[key as keyof typeof CATEGORIES];
          return count > 0 ? (
            <Chip
              key={key}
              size="small"
              label={`${category.icon} ${count}`}
              sx={{
                bgcolor: alpha(category.color, 0.1),
                color: category.color,
                border: `1px solid ${alpha(category.color, 0.2)}`,
                fontSize: '0.75rem'
              }}
            />
          ) : null;
        })}
      </Stack>
    </Paper>
  );
});

ConceptStats.displayName = 'ConceptStats';

// 概念类别组件
const ConceptCategory = memo<ConceptCategoryProps>(({ 
  title, 
  icon, 
  color, 
  concepts, 
  isExpanded, 
  onToggle 
}) => {
  const theme = useTheme();
  
  if (concepts.length === 0) return null;

  const absorbed = concepts.filter(c => c.absorbed).length;
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        border: `1px solid ${alpha(color, 0.2)}`,
        overflow: 'hidden'
      }}
    >
      <Box
        onClick={onToggle}
        sx={{
          p: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          bgcolor: alpha(color, 0.03),
          '&:hover': {
            bgcolor: alpha(color, 0.08)
          }
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography fontSize="1.1rem">{icon}</Typography>
          <Typography variant="body2" fontWeight={500} color="text.primary">
            {title}
          </Typography>
          <Chip 
            size="small" 
            label={`${absorbed}/${concepts.length}`}
            sx={{
              height: 20,
              fontSize: '0.7rem',
              bgcolor: alpha(color, 0.1),
              color: color,
              '& .MuiChip-label': { px: 0.8 }
            }}
          />
        </Box>
        <IconButton size="small" sx={{ color: color }}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={isExpanded} timeout={200}>
        <Box sx={{ p: 1, bgcolor: alpha(theme.palette.background.default, 0.3) }}>
          {concepts.slice(0, 10).map((concept) => (
            <Box
              key={concept.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                px: 1,
                borderRadius: 1,
                '&:hover': {
                  bgcolor: alpha(color, 0.05)
                }
              }}
            >
              {concept.absorbed ? (
                <CheckIcon sx={{ fontSize: 16, color }} />
              ) : (
                <CircleIcon sx={{ fontSize: 16, color: 'action.disabled' }} />
              )}
              <Typography 
                variant="caption" 
                sx={{ 
                  flex: 1,
                  color: concept.absorbed ? 'text.primary' : 'text.secondary',
                  fontWeight: concept.absorbed ? 500 : 400
                }}
              >
                {concept.name}
              </Typography>
              {concept.importance > 0.8 && (
                <Typography fontSize="0.7rem">⭐</Typography>
              )}
            </Box>
          ))}
          {concepts.length > 10 && (
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ pl: 1, pt: 0.5, display: 'block' }}
            >
              还有 {concepts.length - 10} 个概念...
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});

ConceptCategory.displayName = 'ConceptCategory';

// 主组件
const ConceptMapPanelV2 = memo<ConceptMapPanelV2Props>(({ conceptMap, isLoading = false }) => {
  const theme = useTheme();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['core']));
  
  const conceptsByCategory = useMemo(() => {
    if (!conceptMap) return {};
    
    const concepts = Array.from(conceptMap.nodes.values());
    return {
      core: concepts.filter(c => c.category === 'core'),
      method: concepts.filter(c => c.category === 'method'),
      application: concepts.filter(c => c.category === 'application'),
      support: concepts.filter(c => c.category === 'support')
    };
  }, [conceptMap]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <BrainIcon 
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
          正在分析概念结构...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 头部统计 */}
      {conceptMap ? (
        <ConceptStats conceptMap={conceptMap} />
      ) : (
        <Alert
          severity="info"
          icon={<BrainIcon />}
          sx={{ 
            bgcolor: alpha(theme.palette.primary.main, 0.05),
            color: 'primary.main',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
          }}
        >
          <Typography variant="body2">
            开始对话后将自动构建概念图谱
          </Typography>
        </Alert>
      )}
      
      {conceptMap && conceptMap.nodes.size > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          
          {/* 概念分类 */}
          <Stack spacing={1}>
            {Object.entries(CATEGORIES).map(([key, config]) => (
              <ConceptCategory
                key={key}
                title={config.label}
                icon={config.icon}
                color={config.color}
                concepts={conceptsByCategory[key as keyof typeof conceptsByCategory] || []}
                isExpanded={expandedCategories.has(key)}
                onToggle={() => toggleCategory(key)}
              />
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
});

ConceptMapPanelV2.displayName = 'ConceptMapPanelV2';

export default ConceptMapPanelV2;