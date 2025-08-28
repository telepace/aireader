import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EnhancedOptionCard from '../EnhancedOptionCard';
import { OptionItem } from '../../types/types';
import { CardState } from '../../hooks/useCardState';

const mockOption: OptionItem = {
  id: 'test-option-1',
  type: 'deepen',
  content: '第一部分：核心概念解析',
  describe: '深入分析文章的核心概念，帮助理解主要思想和关键观点',
  firstSeenAt: Date.now(),
  lastSeenAt: Date.now(),
  lastMessageId: 'msg-123',
  clickCount: 0
};

describe('EnhancedOptionCard', () => {
  const defaultProps = {
    option: mockOption,
    onClick: jest.fn(),
    onCancel: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
    disabled: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders option content correctly', () => {
    render(<EnhancedOptionCard {...defaultProps} />);
    
    expect(screen.getByText('第一部分：核心概念解析')).toBeInTheDocument();
    expect(screen.getByText('深入分析文章的核心概念，帮助理解主要思想和关键观点')).toBeInTheDocument();
  });

  it('calls onClick when card is clicked', () => {
    const mockOnClick = jest.fn();
    render(<EnhancedOptionCard {...defaultProps} onClick={mockOnClick} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.click(card!);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('shows processing state correctly', () => {
    const processingState: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 65,
      message: '正在分析...',
      eta: 15000,
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={processingState} />);
    
    expect(screen.getByText('正在分析...')).toBeInTheDocument();
    expect(screen.getByText('65% 完成')).toBeInTheDocument();
    expect(screen.getByText('15秒')).toBeInTheDocument(); // ETA display
  });

  it('shows queued state with visual indicators', () => {
    const queuedState: CardState = {
      id: 'test-card',
      visual: 'queued',
      interactive: false,
      progress: 0,
      message: '已加入处理队列',
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={queuedState} />);
    
    expect(screen.getByText('已加入处理队列')).toBeInTheDocument();
  });

  it('shows completed state correctly', () => {
    const completedState: CardState = {
      id: 'test-card',
      visual: 'completed',
      interactive: true,
      progress: 100,
      message: '分析完成',
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={completedState} />);
    
    expect(screen.getByText('分析完成')).toBeInTheDocument();
  });

  it('shows error state with error message', () => {
    const errorState: CardState = {
      id: 'test-card',
      visual: 'error',
      interactive: true,
      progress: 0,
      message: '错误: 网络连接失败',
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={errorState} />);
    
    expect(screen.getByText('错误: 网络连接失败')).toBeInTheDocument();
  });

  it('shows control buttons when processing and hovered', async () => {
    const processingState: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 30,
      message: '正在处理...',
      clickCount: 1,
      taskId: 'task-123'
    };

    render(<EnhancedOptionCard {...defaultProps} state={processingState} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    
    // Hover over card
    fireEvent.mouseEnter(card!);
    
    await waitFor(() => {
      expect(screen.getByTitle('暂停')).toBeInTheDocument();
      expect(screen.getByTitle('取消')).toBeInTheDocument();
    });
  });

  it('calls onPause when pause button is clicked', async () => {
    const mockOnPause = jest.fn();
    const processingState: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 30,
      message: '正在处理...',
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={processingState} onPause={mockOnPause} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.mouseEnter(card!);
    
    await waitFor(() => {
      const pauseButton = screen.getByTitle('暂停');
      fireEvent.click(pauseButton);
    });
    
    expect(mockOnPause).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const mockOnCancel = jest.fn();
    const processingState: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 30,
      message: '正在处理...',
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={processingState} onCancel={mockOnCancel} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.mouseEnter(card!);
    
    await waitFor(() => {
      const cancelButton = screen.getByTitle('取消');
      fireEvent.click(cancelButton);
    });
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('shows resume button when paused', async () => {
    const pausedState: CardState = {
      id: 'test-card',
      visual: 'queued', // paused tasks show as queued
      interactive: false,
      progress: 50,
      message: '已暂停',
      clickCount: 1
    };

    const mockOnResume = jest.fn();

    render(<EnhancedOptionCard {...defaultProps} state={pausedState} onResume={mockOnResume} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.mouseEnter(card!);
    
    await waitFor(() => {
      const resumeButton = screen.getByTitle('开始');
      fireEvent.click(resumeButton);
    });
    
    expect(mockOnResume).toHaveBeenCalledTimes(1);
  });

  it('shows click count when greater than 1', () => {
    const stateWithMultipleClicks: CardState = {
      id: 'test-card',
      visual: 'idle',
      interactive: true,
      progress: 0,
      clickCount: 3
    };

    render(<EnhancedOptionCard {...defaultProps} state={stateWithMultipleClicks} />);
    
    expect(screen.getByText('3次')).toBeInTheDocument();
  });

  it('does not trigger click when disabled', () => {
    const mockOnClick = jest.fn();
    const disabledState: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 30,
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={disabledState} onClick={mockOnClick} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.click(card!);
    
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('formats ETA correctly', () => {
    const stateWithETA: CardState = {
      id: 'test-card',
      visual: 'processing',
      interactive: false,
      progress: 30,
      eta: 125000, // 2 minutes 5 seconds
      clickCount: 1
    };

    render(<EnhancedOptionCard {...defaultProps} state={stateWithETA} />);
    
    expect(screen.getByText('2分5秒')).toBeInTheDocument();
  });

  it('applies click animation class when clicked', async () => {
    const mockOnClick = jest.fn();
    
    render(<EnhancedOptionCard {...defaultProps} onClick={mockOnClick} />);
    
    const card = screen.getByText('第一部分：核心概念解析').closest('div');
    fireEvent.click(card!);
    
    // The animation class should be temporarily applied
    expect(card).toHaveClass('card-click-animation');
    
    // Animation class should be removed after timeout
    await waitFor(() => {
      expect(card).not.toHaveClass('card-click-animation');
    }, { timeout: 200 });
  });
});