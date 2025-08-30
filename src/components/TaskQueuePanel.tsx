import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  LinearProgress,
  Button,
  Fade,
  Collapse,
  Chip,
  Tooltip,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Queue as QueueIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { Task, QueueStats } from '../hooks/useTaskManager';

interface TaskQueuePanelProps {
  tasks: Task[];
  stats: QueueStats;
  visible: boolean;
  onClose: () => void;
  onTaskCancel: (taskId: string) => void;
  onTaskPause: (taskId: string) => void;
  onTaskResume: (taskId: string) => void;
  onClearCompleted: () => void;
  onToggleExpand?: () => void;
}

// 格式化时间
const formatETA = (eta?: number): string => {
  if (!eta || eta <= 0) return '';
  
  const seconds = Math.ceil(eta / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
};

// 获取状态颜色
const getStatusColor = (status: Task['status']) => {
  switch (status) {
    case 'processing':
      return '#2196f3';
    case 'completed':
      return '#4caf50';
    case 'failed':
      return '#f44336';
    case 'cancelled':
      return '#9e9e9e';
    case 'paused':
      return '#ff9800';
    default:
      return '#757575';
  }
};

// 获取状态图标
const getStatusIcon = (status: Task['status']) => {
  switch (status) {
    case 'processing':
      return <PlayArrowIcon fontSize="small" />;
    case 'completed':
      return <CheckCircleIcon fontSize="small" />;
    case 'failed':
      return <ErrorIcon fontSize="small" />;
    case 'cancelled':
      return <StopIcon fontSize="small" />;
    case 'paused':
      return <PauseIcon fontSize="small" />;
    default:
      return <ScheduleIcon fontSize="small" />;
  }
};

// 任务项组件
interface TaskItemProps {
  task: Task;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onCancel, onPause, onResume }) => {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  const duration = task.completedAt && task.startedAt ? 
    task.completedAt - task.startedAt : 
    (task.startedAt ? Date.now() - task.startedAt : 0);

  return (
    <Box
      sx={{
        p: 1.5,
        borderBottom: '1px solid rgba(0,0,0,0.05)',
        '&:last-child': { borderBottom: 'none' },
        '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {/* 状态图标 */}
        <Box
          sx={{
            color: getStatusColor(task.status),
            display: 'flex',
            alignItems: 'center',
            mt: 0.25
          }}
        >
          {getStatusIcon(task.status)}
        </Box>

        {/* 任务信息 */}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Chip
              label={task.type === 'deepen' ? '深度阅读' : '推荐书籍'}
              size="small"
              variant="outlined"
              sx={{
                fontSize: '0.7rem',
                height: 20,
                borderColor: task.type === 'deepen' ? '#1976d2' : '#388e3c',
                color: task.type === 'deepen' ? '#1976d2' : '#388e3c'
              }}
            />
            
            {task.estimatedDuration && (
              <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem' }}>
                {formatETA(task.estimatedDuration)}
              </Typography>
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              fontSize: '0.8rem',
              color: '#2d3748',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              cursor: 'pointer'
            }}
            onClick={() => setExpanded(!expanded)}
          >
            {task.content}
          </Typography>

          {/* 进度条 */}
          {task.status === 'processing' && task.progress > 0 && (
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={task.progress}
                sx={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: 'rgba(0,0,0,0.1)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 2,
                    backgroundColor: '#2196f3'
                  }
                }}
              />
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#666', mt: 0.5, display: 'block' }}>
                {Math.round(task.progress)}%
              </Typography>
            </Box>
          )}

          {/* 错误信息 */}
          {task.status === 'failed' && task.error && (
            <Typography variant="caption" sx={{ color: '#f44336', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
              错误: {task.error}
            </Typography>
          )}

          {/* 执行时间 */}
          {duration > 0 && (
            <Typography variant="caption" sx={{ color: '#666', fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
              {task.status === 'processing' ? '运行中' : '耗时'}: {formatETA(duration)}
            </Typography>
          )}
        </Box>

        {/* 操作按钮 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {task.status === 'processing' && (
            <Tooltip title="暂停">
              <IconButton size="small" onClick={onPause} sx={{ p: 0.5 }}>
                <PauseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {task.status === 'paused' && (
            <Tooltip title="恢复">
              <IconButton size="small" onClick={onResume} sx={{ p: 0.5 }}>
                <PlayArrowIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          {(task.status === 'processing' || task.status === 'pending' || task.status === 'paused') && (
            <Tooltip title="取消">
              <IconButton size="small" onClick={onCancel} sx={{ p: 0.5 }}>
                <StopIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <IconButton 
            size="small" 
            onClick={(e) => setMenuAnchor(e.currentTarget)}
            sx={{ p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>

          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={() => setMenuAnchor(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => { setExpanded(!expanded); setMenuAnchor(null); }}>
              {expanded ? '收起详情' : '展开详情'}
            </MenuItem>
            {task.status !== 'processing' && (
              <MenuItem onClick={() => { onCancel(); setMenuAnchor(null); }}>
                删除任务
              </MenuItem>
            )}
          </Menu>
        </Box>
      </Box>
    </Box>
  );
};

// 队列统计头部
interface QueueHeaderProps {
  stats: QueueStats;
  expanded: boolean;
  onToggleExpand: () => void;
  onClose: () => void;
  onClearCompleted: () => void;
}

const QueueHeader: React.FC<QueueHeaderProps> = ({ 
  stats, 
  expanded, 
  onToggleExpand, 
  onClose, 
  onClearCompleted 
}) => {
  return (
    <Box sx={{ 
      p: 2, 
      pb: 1,
      borderBottom: '1px solid rgba(0,0,0,0.1)', 
      bgcolor: '#fafafa' 
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <QueueIcon fontSize="small" sx={{ color: '#666' }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#2d3748' }}>
            任务队列
          </Typography>
          <Chip 
            label={stats.total} 
            size="small" 
            sx={{ 
              height: 20, 
              fontSize: '0.7rem',
              bgcolor: stats.processing > 0 ? '#e3f2fd' : '#f5f5f5',
              color: stats.processing > 0 ? '#1976d2' : '#666'
            }} 
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {stats.completed > 0 && (
            <Tooltip title="清除已完成">
              <IconButton size="small" onClick={onClearCompleted} sx={{ p: 0.5 }}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <IconButton size="small" onClick={onToggleExpand} sx={{ p: 0.5 }}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
          
          <IconButton size="small" onClick={onClose} sx={{ p: 0.5 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 统计信息 */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {stats.processing > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2196f3' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              处理中 {stats.processing}
            </Typography>
          </Box>
        )}
        
        {stats.pending > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#757575' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              等待中 {stats.pending}
            </Typography>
          </Box>
        )}
        
        {stats.completed > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              已完成 {stats.completed}
            </Typography>
          </Box>
        )}
        
        {stats.failed > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f44336' }} />
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              失败 {stats.failed}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// 主组件
const TaskQueuePanel: React.FC<TaskQueuePanelProps> = ({
  tasks,
  stats,
  visible,
  onClose,
  onTaskCancel,
  onTaskPause,
  onTaskResume,
  onClearCompleted,
  onToggleExpand
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleToggleExpand = () => {
    setExpanded(!expanded);
    onToggleExpand?.();
  };

  // 按状态分组任务
  const processingTasks = tasks.filter(t => t.status === 'processing');
  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'paused');
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const failedTasks = tasks.filter(t => t.status === 'failed');

  const orderedTasks = [...processingTasks, ...pendingTasks, ...failedTasks, ...completedTasks];

  if (!visible) return null;

  return (
    <Fade in={visible} timeout={300}>
      <Paper
        elevation={8}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 380,
          maxHeight: 500,
          borderRadius: 3,
          overflow: 'hidden',
          zIndex: 1300,
          boxShadow: '0 12px 24px rgba(0,0,0,0.15)'
        }}
      >
        <QueueHeader
          stats={stats}
          expanded={expanded}
          onToggleExpand={handleToggleExpand}
          onClose={onClose}
          onClearCompleted={onClearCompleted}
        />
        
        <Collapse in={expanded} timeout={300}>
          <Box
            sx={{
              maxHeight: 350,
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          >
            {orderedTasks.length === 0 ? (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: '#666' }}>
                  暂无任务
                </Typography>
              </Box>
            ) : (
              orderedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onCancel={() => onTaskCancel(task.id)}
                  onPause={() => onTaskPause(task.id)}
                  onResume={() => onTaskResume(task.id)}
                />
              ))
            )}
          </Box>
        </Collapse>

        {/* 快捷操作栏 */}
        {stats.total > 0 && (
          <Box sx={{ p: 1, borderTop: '1px solid rgba(0,0,0,0.1)', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={onClearCompleted}
                disabled={stats.completed === 0}
                sx={{ fontSize: '0.75rem', minWidth: 'auto', px: 1 }}
              >
                清除已完成
              </Button>
              
              <Typography variant="caption" sx={{ color: '#666', alignSelf: 'center' }}>
                {stats.processing > 0 ? `正在处理 ${stats.processing} 个任务` : '队列空闲'}
              </Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Fade>
  );
};

export default TaskQueuePanel;