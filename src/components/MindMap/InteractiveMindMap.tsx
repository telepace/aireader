/**
 * 交互式思维导图可视化组件
 * 使用SVG实现节点和连线的绘制，支持缩放、拖拽、点击等交互
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Tooltip } from '@mui/material';
import { MindMapState, MindMapNode, MindMapEvent, MindMapConfig } from '../../types/mindMap';

interface InteractiveMindMapProps {
  mindMapState: MindMapState;
  config: MindMapConfig;
  zoomLevel: number;
  onEvent: (event: MindMapEvent) => void;
  onError: (error: Error) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

const InteractiveMindMap: React.FC<InteractiveMindMapProps> = ({
  mindMapState,
  config,
  zoomLevel,
  onEvent,
  onError
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    nodeId?: string;
    startPos: NodePosition;
    offset: NodePosition;
  }>({
    isDragging: false,
    startPos: { x: 0, y: 0 },
    offset: { x: 0, y: 0 }
  });
  const [hoverNodeId, setHoverNodeId] = useState<string | null>(null);
  const [tooltipContent, setTooltipContent] = useState<string>('');

  // 获取节点样式
  const getNodeStyle = useCallback((node: MindMapNode) => {
    const baseStyle = config.appearance.nodeStyles[node.type];
    const isActive = node.id === mindMapState.currentNodeId;
    const isHovered = node.id === hoverNodeId;
    
    return {
      fill: node.style.color,
      stroke: isActive ? '#000' : isHovered ? node.style.color : '#ddd',
      strokeWidth: isActive ? 3 : isHovered ? 2 : 1,
      opacity: node.style.opacity,
      radius: getNodeRadius(node),
      fontSize: getNodeFontSize(node),
      ...baseStyle
    };
  }, [config.appearance.nodeStyles, mindMapState.currentNodeId, hoverNodeId]);

  // 获取节点半径
  const getNodeRadius = useCallback((node: MindMapNode) => {
    const baseRadius = config.appearance.nodeStyles[node.type].size;
    return node.style.size === 'large' ? baseRadius * 1.2 : 
           node.style.size === 'small' ? baseRadius * 0.8 : baseRadius;
  }, [config.appearance.nodeStyles]);

  // 获取节点字体大小
  const getNodeFontSize = useCallback((node: MindMapNode) => {
    return node.level === 0 ? 16 : node.level === 1 ? 14 : 12;
  }, []);

  // 处理节点点击
  const handleNodeClick = useCallback((node: MindMapNode, event: React.MouseEvent) => {
    event.stopPropagation();
    
    try {
      onEvent({
        type: 'node_click',
        nodeId: node.id,
        position: { x: event.clientX, y: event.clientY },
        timestamp: Date.now()
      });
    } catch (error) {
      onError(error as Error);
    }
  }, [onEvent, onError]);

  // 处理节点悬停
  const handleNodeHover = useCallback((node: MindMapNode, isEntering: boolean) => {
    if (isEntering) {
      setHoverNodeId(node.id);
      setTooltipContent(`${node.title}\n${node.metadata.summary}\n点击次数: ${node.interactions.clickCount}`);
    } else {
      setHoverNodeId(null);
      setTooltipContent('');
    }
  }, []);

  // 处理节点拖拽开始
  const handleMouseDown = useCallback((node: MindMapNode, event: React.MouseEvent) => {
    if (event.button !== 0) return; // 只处理左键
    
    event.preventDefault();
    setDragState({
      isDragging: true,
      nodeId: node.id,
      startPos: { x: event.clientX, y: event.clientY },
      offset: { x: 0, y: 0 }
    });
  }, []);

  // 处理鼠标移动（拖拽）
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging || !dragState.nodeId) return;
    
    const deltaX = event.clientX - dragState.startPos.x;
    const deltaY = event.clientY - dragState.startPos.y;
    
    setDragState(prev => ({
      ...prev,
      offset: { x: deltaX, y: deltaY }
    }));
  }, [dragState]);

  // 处理鼠标释放（拖拽结束）
  const handleMouseUp = useCallback(() => {
    if (dragState.isDragging && dragState.nodeId) {
      // TODO: 更新节点位置到状态中
      setDragState({
        isDragging: false,
        startPos: { x: 0, y: 0 },
        offset: { x: 0, y: 0 }
      });
    }
  }, [dragState]);

  // 绑定全局鼠标事件
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseMove, handleMouseUp]);

  // 渲染连接线
  const renderConnection = useCallback((parentNode: MindMapNode, childNode: MindMapNode) => {
    const parentPos = parentNode.position;
    const childPos = childNode.position;
    const parentRadius = getNodeRadius(parentNode);
    const childRadius = getNodeRadius(childNode);
    
    // 计算连接点（避免与节点重叠）
    const dx = childPos.x - parentPos.x;
    const dy = childPos.y - parentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const startX = parentPos.x + (dx / distance) * parentRadius;
    const startY = parentPos.y + (dy / distance) * parentRadius;
    const endX = childPos.x - (dx / distance) * childRadius;
    const endY = childPos.y - (dy / distance) * childRadius;

    if (config.appearance.connectionStyles.curved) {
      // 贝塞尔曲线连接
      const controlPointOffset = distance * 0.3;
      const controlX = startX + controlPointOffset;
      const controlY = startY;
      
      return (
        <path
          key={`${parentNode.id}-${childNode.id}`}
          d={`M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`}
          stroke={config.appearance.connectionStyles.strokeColor}
          strokeWidth={config.appearance.connectionStyles.strokeWidth}
          fill="none"
          opacity={0.7}
        />
      );
    } else {
      // 直线连接
      return (
        <line
          key={`${parentNode.id}-${childNode.id}`}
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={config.appearance.connectionStyles.strokeColor}
          strokeWidth={config.appearance.connectionStyles.strokeWidth}
          opacity={0.7}
        />
      );
    }
  }, [config.appearance.connectionStyles, getNodeRadius]);

  // 渲染节点
  const renderNode = useCallback((node: MindMapNode) => {
    const style = getNodeStyle(node);
    const radius = getNodeRadius(node);
    const fontSize = getNodeFontSize(node);
    
    // 如果正在拖拽此节点，应用偏移量
    const position = node.id === dragState.nodeId ? {
      x: node.position.x + dragState.offset.x / zoomLevel,
      y: node.position.y + dragState.offset.y / zoomLevel
    } : node.position;

    return (
      <g key={node.id} className="mind-map-node">
        {/* 节点背景 */}
        <circle
          cx={position.x}
          cy={position.y}
          r={radius}
          fill={style.fill}
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          opacity={style.opacity}
          style={{
            cursor: 'pointer',
            transition: config.preferences.animationEnabled ? 'all 0.3s ease' : 'none'
          }}
          onClick={(e) => handleNodeClick(node, e)}
          onMouseDown={(e) => handleMouseDown(node, e)}
          onMouseEnter={() => handleNodeHover(node, true)}
          onMouseLeave={() => handleNodeHover(node, false)}
        />
        
        {/* 节点图标 */}
        <text
          x={position.x}
          y={position.y - radius * 0.3}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={fontSize * 0.8}
          fill="white"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {node.style.icon}
        </text>
        
        {/* 节点标题 */}
        {config.preferences.showLabels && (
          <text
            x={position.x}
            y={position.y + radius + 16}
            textAnchor="middle"
            fontSize={fontSize}
            fill={config.appearance.theme === 'dark' ? 'white' : 'black'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {node.title.length > 15 ? `${node.title.slice(0, 15)}...` : node.title}
          </text>
        )}
        
        {/* 探索状态指示器 */}
        {node.metadata.explored && (
          <circle
            cx={position.x + radius * 0.7}
            cy={position.y - radius * 0.7}
            r={4}
            fill="#10b981"
            stroke="white"
            strokeWidth={1}
          />
        )}
        
        {/* 子节点数量指示器 */}
        {node.children.length > 0 && (
          <circle
            cx={position.x - radius * 0.7}
            cy={position.y - radius * 0.7}
            r={6}
            fill="#6366f1"
            stroke="white"
            strokeWidth={1}
          >
            <title>{`${node.children.length} 个子节点`}</title>
          </circle>
        )}
      </g>
    );
  }, [
    getNodeStyle,
    getNodeRadius,
    getNodeFontSize,
    dragState,
    zoomLevel,
    config.preferences,
    config.appearance.theme,
    handleNodeClick,
    handleMouseDown,
    handleNodeHover
  ]);

  // 计算SVG视图盒
  const getViewBox = useCallback(() => {
    const nodes = Array.from(mindMapState.nodes.values());
    if (nodes.length === 0) return { x: 0, y: 0, width: 800, height: 600 };
    
    const positions = nodes.map(n => n.position);
    const minX = Math.min(...positions.map(p => p.x)) - 100;
    const maxX = Math.max(...positions.map(p => p.x)) + 100;
    const minY = Math.min(...positions.map(p => p.y)) - 100;
    const maxY = Math.max(...positions.map(p => p.y)) + 100;
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }, [mindMapState.nodes]);

  const viewBox = getViewBox();
  const nodes = Array.from(mindMapState.nodes.values());

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        cursor: dragState.isDragging ? 'grabbing' : 'grab'
      }}
    >
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoomLevel} ${viewBox.height / zoomLevel}`}
        style={{
          display: 'block',
          backgroundColor: 'transparent'
        }}
      >
        {/* 定义箭头标记 */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill={config.appearance.connectionStyles.strokeColor}
            />
          </marker>
        </defs>

        {/* 渲染连接线 */}
        <g className="connections">
          {nodes.map(node => 
            node.children.map(childId => {
              const childNode = mindMapState.nodes.get(childId);
              return childNode ? renderConnection(node, childNode) : null;
            })
          )}
        </g>

        {/* 渲染节点 */}
        <g className="nodes">
          {nodes.map(renderNode)}
        </g>
      </svg>

      {/* 悬停提示 */}
      {hoverNodeId && tooltipContent && (
        <Tooltip
          title={tooltipContent}
          open={true}
          placement="top"
          arrow
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none'
            }}
          />
        </Tooltip>
      )}

      {/* 调试信息（开发模式） */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            bgcolor: 'rgba(0,0,0,0.7)',
            color: 'white',
            p: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace'
          }}
        >
          Zoom: {Math.round(zoomLevel * 100)}% | 
          Nodes: {nodes.length} | 
          Dragging: {dragState.isDragging ? 'Yes' : 'No'}
        </Box>
      )}
    </Box>
  );
};

export default InteractiveMindMap;