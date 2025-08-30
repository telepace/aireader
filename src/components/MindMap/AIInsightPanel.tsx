/**
 * AI洞察面板组件
 * 显示基于思维图分析的智能建议和洞察
 */

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Badge,
  Tooltip,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  ExpandMore,
  Lightbulb,
  TrendingUp,
  Warning,
  CheckCircle,
  Psychology,
  Timeline,
  AutoFixHigh,
  Insights,
  QuestionMark,
  NavigateNext
} from '@mui/icons-material';

import { MindMapState, MindMapNode } from '../../types/mindMap';

interface AIInsightPanelProps {
  mindMapState: MindMapState;
  currentNodeId: string;
  onNodeClick: (nodeId: string) => void;
  onInsightApply: (insight: AIInsight) => void;
  className?: string;
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'gap' | 'pattern' | 'optimization';
  title: string;
  description: string;
  confidence: number; // 0-1
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
  metadata?: {
    relatedNodes?: string[];
    estimatedTime?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
  };
}

const AIInsightPanel: React.FC<AIInsightPanelProps> = ({
  mindMapState,
  currentNodeId,
  onNodeClick,
  onInsightApply,
  className
}) => {
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(
    new Set(['suggestions', 'gaps'])
  );

  // 分析思维图并生成AI洞察
  const aiInsights = useMemo(() => {
    return analyzeMapForInsights(mindMapState, currentNodeId);
  }, [mindMapState, currentNodeId]);

  // 按类型分组洞察
  const groupedInsights = useMemo(() => {
    const grouped: Record<string, AIInsight[]> = {
      suggestions: [],
      gaps: [],
      patterns: [],
      optimizations: []
    };
    
    aiInsights.forEach(insight => {
      if (!grouped[insight.type]) {
        grouped[insight.type] = [];
      }
      grouped[insight.type].push(insight);
    });
    
    return grouped;
  }, [aiInsights]);

  // 处理面板展开/收起
  const handlePanelToggle = (panel: string) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(panel)) {
      newExpanded.delete(panel);
    } else {
      newExpanded.add(panel);
    }
    setExpandedPanels(newExpanded);
  };

  // 获取洞察类型的图标和颜色
  const getInsightTypeStyle = (type: AIInsight['type']) => {
    const styles = {
      suggestion: { icon: <Lightbulb />, color: '#10b981', bgColor: '#ecfdf5' },
      gap: { icon: <Warning />, color: '#f59e0b', bgColor: '#fffbeb' },
      pattern: { icon: <Psychology />, color: '#8b5cf6', bgColor: '#f3e8ff' },
      optimization: { icon: <AutoFixHigh />, color: '#06b6d4', bgColor: '#f0f9ff' }
    };
    return styles[type] || styles.suggestion;
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: AIInsight['priority']): 'error' | 'warning' | 'info' => {
    const colorMap = {
      high: 'error' as const,
      medium: 'warning' as const,
      low: 'info' as const
    };
    return colorMap[priority];
  };

  // 渲染单个洞察项
  const renderInsightItem = (insight: AIInsight) => {
    const typeStyle = getInsightTypeStyle(insight.type);
    
    return (
      <Card
        key={insight.id}
        variant="outlined"
        sx={{
          mb: 1,
          bgcolor: typeStyle.bgColor,
          border: `1px solid ${typeStyle.color}30`,
          '&:hover': {
            boxShadow: 2,
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease'
          }
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ color: typeStyle.color, mt: 0.5 }}>
              {typeStyle.icon}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {insight.title}
                </Typography>
                
                <Chip
                  label={insight.priority}
                  size="small"
                  color={getPriorityColor(insight.priority)}
                  sx={{ minWidth: 60, fontSize: '0.7rem' }}
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                  <Typography variant="caption" color="text.secondary">
                    置信度
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={insight.confidence * 100}
                    sx={{
                      width: 40,
                      height: 4,
                      borderRadius: 2,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: insight.confidence > 0.7 ? 'success.main' : 
                                insight.confidence > 0.4 ? 'warning.main' : 'error.main'
                      }
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {Math.round(insight.confidence * 100)}%
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {insight.description}
              </Typography>
              
              {/* 元数据信息 */}
              {insight.metadata && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {insight.metadata.estimatedTime && (
                    <Chip
                      label={`${insight.metadata.estimatedTime}分钟`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                  
                  {insight.metadata.difficulty && (
                    <Chip
                      label={insight.metadata.difficulty}
                      size="small"
                      variant="outlined"
                      color={
                        insight.metadata.difficulty === 'easy' ? 'success' :
                        insight.metadata.difficulty === 'medium' ? 'warning' : 'error'
                      }
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                  
                  {insight.metadata.relatedNodes && insight.metadata.relatedNodes.length > 0 && (
                    <Chip
                      label={`${insight.metadata.relatedNodes.length} 相关节点`}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem' }}
                    />
                  )}
                </Box>
              )}
              
              {/* 操作按钮 */}
              <Box sx={{ display: 'flex', gap: 1 }}>
                {insight.actionable && (
                  <Button
                    size="small"
                    variant="contained"
                    sx={{
                      bgcolor: typeStyle.color,
                      color: 'white',
                      '&:hover': { bgcolor: `${typeStyle.color}dd` }
                    }}
                    onClick={() => onInsightApply(insight)}
                  >
                    应用建议
                  </Button>
                )}
                
                {insight.metadata?.relatedNodes && insight.metadata.relatedNodes.length > 0 && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<NavigateNext />}
                    onClick={() => {
                      const firstRelated = insight.metadata!.relatedNodes![0];
                      onNodeClick(firstRelated);
                    }}
                  >
                    查看相关
                  </Button>
                )}
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

  // 渲染洞察分组
  const renderInsightGroup = (type: string, insights: AIInsight[], title: string, description: string) => {
    if (insights.length === 0) return null;
    
    const typeStyle = getInsightTypeStyle(type as AIInsight['type']);
    
    return (
      <Accordion
        key={type}
        expanded={expandedPanels.has(type)}
        onChange={() => handlePanelToggle(type)}
        sx={{
          mb: 1,
          '&:before': { display: 'none' },
          boxShadow: 'none',
          border: 1,
          borderColor: 'divider'
        }}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{ color: typeStyle.color }}>
              {typeStyle.icon}
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
            <Badge
              badgeContent={insights.length}
              color={
                insights.some(i => i.priority === 'high') ? 'error' :
                insights.some(i => i.priority === 'medium') ? 'warning' : 'primary'
              }
              sx={{ ml: 'auto' }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
          {insights.map(renderInsightItem)}
        </AccordionDetails>
      </Accordion>
    );
  };

  // 计算总体统计
  const overallStats = useMemo(() => {
    const total = aiInsights.length;
    const highPriority = aiInsights.filter(i => i.priority === 'high').length;
    const actionable = aiInsights.filter(i => i.actionable).length;
    const avgConfidence = total > 0 ? 
      aiInsights.reduce((sum, i) => sum + i.confidence, 0) / total : 0;
    
    return { total, highPriority, actionable, avgConfidence };
  }, [aiInsights]);

  return (
    <Box className={className} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 头部 */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Insights color="primary" />
          AI 洞察分析
        </Typography>
        
        {/* 统计概览 */}
        <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            label={`${overallStats.total} 条洞察`}
            size="small"
            color="primary"
            variant="outlined"
          />
          {overallStats.highPriority > 0 && (
            <Chip
              label={`${overallStats.highPriority} 高优先级`}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
          {overallStats.actionable > 0 && (
            <Chip
              label={`${overallStats.actionable} 可执行`}
              size="small"
              color="success"
              variant="outlined"
            />
          )}
        </Box>
        
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            平均置信度
          </Typography>
          <LinearProgress
            variant="determinate"
            value={overallStats.avgConfidence * 100}
            sx={{ width: 60, height: 4, borderRadius: 2 }}
          />
          <Typography variant="caption" color="text.secondary">
            {Math.round(overallStats.avgConfidence * 100)}%
          </Typography>
        </Box>
      </Box>

      {/* 洞察内容 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {aiInsights.length === 0 ? (
          <Alert severity="info" icon={<QuestionMark />}>
            <Typography variant="body2">
              暂无AI洞察。继续探索更多内容以获得智能建议。
            </Typography>
          </Alert>
        ) : (
          <>
            {renderInsightGroup(
              'suggestions',
              groupedInsights.suggestions,
              '智能建议',
              '基于当前探索状态的推荐行动'
            )}
            
            {renderInsightGroup(
              'gaps',
              groupedInsights.gaps,
              '知识空白',
              '发现的探索空白区域和待解决问题'
            )}
            
            {renderInsightGroup(
              'patterns',
              groupedInsights.patterns,
              '模式识别',
              '识别出的学习模式和思维结构'
            )}
            
            {renderInsightGroup(
              'optimizations',
              groupedInsights.optimizations,
              '优化建议',
              '提升探索效率和学习效果的建议'
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

// AI分析函数 - 基于思维图状态生成洞察
function analyzeMapForInsights(mindMapState: MindMapState, currentNodeId: string): AIInsight[] {
  const insights: AIInsight[] = [];
  const nodes = Array.from(mindMapState.nodes.values());
  const currentNode = mindMapState.nodes.get(currentNodeId);
  
  // 分析探索空白
  const unexploredNodes = nodes.filter(n => !n.metadata.explored && n.level > 0);
  if (unexploredNodes.length > 0) {
    insights.push({
      id: 'gaps-unexplored',
      type: 'gap',
      title: '未探索节点',
      description: `发现 ${unexploredNodes.length} 个未探索的知识点，建议逐步深入了解。`,
      confidence: 0.9,
      priority: unexploredNodes.length > 5 ? 'high' : 'medium',
      actionable: true,
      metadata: {
        relatedNodes: unexploredNodes.slice(0, 3).map(n => n.id),
        estimatedTime: unexploredNodes.length * 5,
        difficulty: 'medium'
      }
    });
  }
  
  // 分析探索深度
  const maxDepth = mindMapState.stats.maxDepth;
  if (maxDepth < 3 && nodes.length > 5) {
    insights.push({
      id: 'suggestions-depth',
      type: 'suggestion',
      title: '增加探索深度',
      description: '当前探索相对较浅，建议深入探索感兴趣的主题以获得更深层的理解。',
      confidence: 0.8,
      priority: 'medium',
      actionable: true,
      metadata: {
        estimatedTime: 15,
        difficulty: 'easy'
      }
    });
  }
  
  // 分析当前节点的子节点情况
  if (currentNode && currentNode.children.length === 0 && currentNode.level < 3) {
    insights.push({
      id: 'suggestions-expand-current',
      type: 'suggestion',
      title: '拓展当前主题',
      description: `"${currentNode.title}" 还可以进一步展开，建议探索相关的子主题。`,
      confidence: 0.85,
      priority: 'high',
      actionable: true,
      metadata: {
        relatedNodes: [currentNode.id],
        estimatedTime: 10,
        difficulty: 'easy'
      }
    });
  }
  
  // 分析探索模式
  const deepenNodes = nodes.filter(n => n.type === 'deepen').length;
  const nextNodes = nodes.filter(n => n.type === 'next').length;
  
  if (deepenNodes > nextNodes * 2) {
    insights.push({
      id: 'patterns-too-deep',
      type: 'pattern',
      title: '探索模式偏向深度',
      description: '当前更多进行深度探索，建议适当拓展相关主题以获得更全面的视角。',
      confidence: 0.7,
      priority: 'low',
      actionable: true,
      metadata: {
        estimatedTime: 20,
        difficulty: 'medium'
      }
    });
  } else if (nextNodes > deepenNodes * 2) {
    insights.push({
      id: 'patterns-too-broad',
      type: 'pattern',
      title: '探索模式偏向广度',
      description: '当前更多进行广度探索，建议深入某些感兴趣的主题以获得深度理解。',
      confidence: 0.7,
      priority: 'low',
      actionable: true,
      metadata: {
        estimatedTime: 25,
        difficulty: 'medium'
      }
    });
  }
  
  // 分析节点连接度
  const isolatedNodes = nodes.filter(n => n.children.length === 0 && n.level > 0 && n.metadata.explored);
  if (isolatedNodes.length > 3) {
    insights.push({
      id: 'optimizations-connect',
      type: 'optimization',
      title: '建立知识连接',
      description: '发现一些独立的知识点，建议寻找它们之间的联系以形成知识网络。',
      confidence: 0.6,
      priority: 'medium',
      actionable: false,
      metadata: {
        relatedNodes: isolatedNodes.slice(0, 3).map(n => n.id),
        difficulty: 'hard'
      }
    });
  }
  
  return insights.sort((a, b) => {
    // 按优先级和置信度排序
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    const scoreA = priorityWeight[a.priority] * a.confidence;
    const scoreB = priorityWeight[b.priority] * b.confidence;
    return scoreB - scoreA;
  });
}

export default AIInsightPanel;