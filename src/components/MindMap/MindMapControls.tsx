/**
 * 思维图控制面板组件
 * 提供布局、主题、交互等设置选项
 */

import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Slider,
  Typography,
  Divider,
  Button,
  ButtonGroup,
  Tooltip
} from '@mui/material';
import {
  AccountTree,
  Brightness4,
  Animation,
  Visibility,
  Speed,
  RestartAlt
} from '@mui/icons-material';

import { MindMapConfig } from '../../types/mindMap';

interface MindMapControlsProps {
  config: MindMapConfig;
  onConfigChange: (config: Partial<MindMapConfig>) => void;
  onLayoutUpdate: (algorithm?: MindMapConfig['layout']['algorithm']) => void;
}

const MindMapControls: React.FC<MindMapControlsProps> = ({
  config,
  onConfigChange,
  onLayoutUpdate
}) => {
  // 处理布局算法变更
  const handleLayoutChange = (algorithm: MindMapConfig['layout']['algorithm']) => {
    onConfigChange({
      layout: {
        ...config.layout,
        algorithm
      }
    });
    onLayoutUpdate(algorithm);
  };

  // 处理主题变更
  const handleThemeChange = (theme: 'light' | 'dark' | 'auto') => {
    onConfigChange({
      appearance: {
        ...config.appearance,
        theme
      }
    });
  };

  // 处理间距调整
  const handleSpacingChange = (direction: 'horizontal' | 'vertical', value: number) => {
    onConfigChange({
      layout: {
        ...config.layout,
        spacing: {
          ...config.layout.spacing,
          [direction]: value
        }
      }
    });
  };

  // 处理偏好设置
  const handlePreferenceChange = (key: keyof MindMapConfig['preferences'], value: boolean) => {
    onConfigChange({
      preferences: {
        ...config.preferences,
        [key]: value
      }
    });
  };

  // 处理动画设置
  const handleAnimationDurationChange = (duration: number) => {
    onConfigChange({
      layout: {
        ...config.layout,
        animation: {
          ...config.layout.animation,
          duration
        }
      }
    });
  };

  return (
    <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AccountTree fontSize="small" />
        思维图设置
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* 布局设置 */}
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            布局算法
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={config.layout.algorithm}
              onChange={(e) => handleLayoutChange(e.target.value as MindMapConfig['layout']['algorithm'])}
              displayEmpty
            >
              <MenuItem value="tree">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccountTree fontSize="small" />
                  树状布局
                </Box>
              </MenuItem>
              <MenuItem value="radial">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>⭕</span>
                  径向布局
                </Box>
              </MenuItem>
              <MenuItem value="force">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>🌐</span>
                  力导向布局
                </Box>
              </MenuItem>
              <MenuItem value="hierarchical">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>📊</span>
                  层次布局
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          {/* 布局按钮组 */}
          <Box sx={{ mt: 1 }}>
            <ButtonGroup size="small" variant="outlined" fullWidth>
              <Tooltip title="重新布局">
                <Button onClick={() => onLayoutUpdate()}>
                  <RestartAlt fontSize="small" />
                </Button>
              </Tooltip>
              <Button onClick={() => onLayoutUpdate('tree')}>树状</Button>
              <Button onClick={() => onLayoutUpdate('radial')}>径向</Button>
            </ButtonGroup>
          </Box>
        </Box>

        {/* 外观设置 */}
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            外观主题
          </Typography>
          <FormControl size="small" fullWidth>
            <Select
              value={config.appearance.theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark' | 'auto')}
            >
              <MenuItem value="light">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>☀️</span>
                  浅色主题
                </Box>
              </MenuItem>
              <MenuItem value="dark">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Brightness4 fontSize="small" />
                  深色主题
                </Box>
              </MenuItem>
              <MenuItem value="auto">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>🔄</span>
                  自动切换
                </Box>
              </MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* 间距设置 */}
        <Box sx={{ minWidth: 220 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            节点间距
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>水平间距</span>
              <span>{config.layout.spacing.horizontal}px</span>
            </Typography>
            <Slider
              value={config.layout.spacing.horizontal}
              onChange={(_, value) => handleSpacingChange('horizontal', value as number)}
              min={80}
              max={200}
              step={10}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>垂直间距</span>
              <span>{config.layout.spacing.vertical}px</span>
            </Typography>
            <Slider
              value={config.layout.spacing.vertical}
              onChange={(_, value) => handleSpacingChange('vertical', value as number)}
              min={60}
              max={150}
              step={10}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* 显示选项 */}
        <Box sx={{ minWidth: 160 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            显示选项
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.preferences.showLabels}
                  onChange={(e) => handlePreferenceChange('showLabels', e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                  <Visibility fontSize="inherit" />
                  显示标签
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.preferences.autoLayout}
                  onChange={(e) => handlePreferenceChange('autoLayout', e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                  <RestartAlt fontSize="inherit" />
                  自动布局
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={config.preferences.compactMode}
                  onChange={(e) => handlePreferenceChange('compactMode', e.target.checked)}
                  size="small"
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>📦</span>
                  紧凑模式
                </Box>
              }
            />
          </Box>
        </Box>

        {/* 动画设置 */}
        <Box sx={{ minWidth: 180 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            动画效果
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={config.preferences.animationEnabled}
                onChange={(e) => handlePreferenceChange('animationEnabled', e.target.checked)}
                size="small"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem' }}>
                <Animation fontSize="inherit" />
                启用动画
              </Box>
            }
            sx={{ mb: 1 }}
          />

          {config.preferences.animationEnabled && (
            <Box>
              <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>动画速度</span>
                <span>{config.layout.animation.duration}ms</span>
              </Typography>
              <Slider
                value={config.layout.animation.duration}
                onChange={(_, value) => handleAnimationDurationChange(value as number)}
                min={100}
                max={1000}
                step={50}
                size="small"
                sx={{ mt: 0.5 }}
                marks={[
                  { value: 100, label: '快' },
                  { value: 500, label: '中' },
                  { value: 1000, label: '慢' }
                ]}
              />
            </Box>
          )}
        </Box>

        {/* 交互设置 */}
        <Box sx={{ minWidth: 200 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
            交互行为
          </Typography>
          
          <FormControl size="small" fullWidth sx={{ mb: 2 }}>
            <InputLabel>双击行为</InputLabel>
            <Select
              value={config.interaction.doubleClickAction}
              label="双击行为"
              onChange={(e) => onConfigChange({
                interaction: {
                  ...config.interaction,
                  doubleClickAction: e.target.value as 'zoom' | 'explore' | 'edit'
                }
              })}
            >
              <MenuItem value="zoom">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>🔍</span>
                  缩放到节点
                </Box>
              </MenuItem>
              <MenuItem value="explore">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>🚀</span>
                  探索节点
                </Box>
              </MenuItem>
              <MenuItem value="edit">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span style={{ fontSize: '1rem' }}>✏️</span>
                  编辑节点
                </Box>
              </MenuItem>
            </Select>
          </FormControl>

          <Box>
            <Typography variant="caption" sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>悬停延迟</span>
              <span>{config.interaction.hoverDelay}ms</span>
            </Typography>
            <Slider
              value={config.interaction.hoverDelay}
              onChange={(_, value) => onConfigChange({
                interaction: {
                  ...config.interaction,
                  hoverDelay: value as number
                }
              })}
              min={0}
              max={1000}
              step={100}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
        </Box>
      </Box>

      {/* 快速预设 */}
      <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
          快速预设
        </Typography>
        <ButtonGroup size="small" variant="outlined">
          <Button
            onClick={() => {
              // 性能优先预设
              onConfigChange({
                preferences: {
                  ...config.preferences,
                  animationEnabled: false,
                  compactMode: true
                },
                layout: {
                  ...config.layout,
                  algorithm: 'tree',
                  spacing: { horizontal: 80, vertical: 60 }
                }
              });
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Speed fontSize="small" />
              性能优先
            </Box>
          </Button>
          
          <Button
            onClick={() => {
              // 视觉优先预设
              onConfigChange({
                preferences: {
                  ...config.preferences,
                  animationEnabled: true,
                  compactMode: false,
                  showLabels: true
                },
                layout: {
                  ...config.layout,
                  algorithm: 'radial',
                  spacing: { horizontal: 120, vertical: 80 },
                  animation: { duration: 300, easing: 'ease-in-out' }
                }
              });
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span style={{ fontSize: '1rem' }}>🎨</span>
              视觉优先
            </Box>
          </Button>
          
          <Button
            onClick={() => {
              // 默认预设
              onConfigChange({
                layout: {
                  algorithm: 'tree',
                  spacing: { horizontal: 120, vertical: 80 },
                  animation: { duration: 300, easing: 'ease-in-out' }
                },
                appearance: {
                  ...config.appearance,
                  theme: 'light'
                },
                preferences: {
                  autoLayout: true,
                  showLabels: true,
                  animationEnabled: true,
                  compactMode: false
                }
              });
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <RestartAlt fontSize="small" />
              恢复默认
            </Box>
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
};

export default MindMapControls;