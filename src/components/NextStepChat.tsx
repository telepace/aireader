import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Paper, TextField, Typography, Tabs, Tab, keyframes, Menu, MenuItem, Collapse, Fade } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatConversation, OptionItem, UserSession } from '../types/types';
import { generateChatStream, logUserEvent, createUserSession } from '../services/api-with-tracing';
import { splitContentAndOptions, NextStepOption } from '../utils/contentSplitter';
import { generateSystemPrompt } from '../services/promptTemplateV2';
import { useConversation } from '../hooks/useConversation';

// Markdown renderers (aligned with existing style)

interface NextStepChatProps {
  selectedModel: string;
  clearSignal?: number;
  externalToggleConversationMenuSignal?: number;
  conversationMenuAnchorEl?: HTMLElement | null;
}

// NextStepOption interface moved to utils/contentSplitter.ts

// OptionItem now comes from types.ts

// 使用新的模板系统生成 SYSTEM_PROMPT
/**
 * Generates a system prompt for the next step in a chat.
 */
const getSystemPrompt = () => {
  try {
    return generateSystemPrompt('nextStepChat', 'zh');
  } catch (error) {
    console.error('Failed to generate system prompt:', error);
    // 降级到原始硬编码版本 - 简化模板避免 syntax issues
    return '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。（当我发送一大段长文字时就是复制的长文章）\n\n每次交互，请严格执行以下3件事：\n**1. 聚焦与展开** 先讲透内容的一个核心关键；全面并深度地展开讲全文内容，目标是看了你的内容，我就吸收了一本书绝大多数的精华内容，感觉只看你的内容就够了，不用再亲自看这本书了。全文能讲的越具体详实越好，但不要废话。\n\n**2. 原文深挖 (type: deepen)** 推荐3个最有价值的原文精读选项。按顺序推荐原文的某个具体部分，深度展开（按情节划分、按逻辑划分，第一、第二、第n部分）按顺序推荐第一、二..第n部分。（偏向客观的呈现内容，而不是过于主观的讨论）\n - 选项一定要围绕「原文」，原文指的是最近在讨论的书、文章、主题。比如我们当前在讨论的是某一本书，则精读选项一定也是围绕该书原文的，而不是脱离原文的主观讨论。\n - 注意，对象是整个原文，而不是我们当前讨论的原文的子话题（不要围绕子话题出所有精读选项，应该围绕原文出选项）。\n- 当讨论新书时，即精读对象变化了，不要老对比提及先前的精读对象。比如最初在精读一篇文章，后来在精读一本新书，则不要老对比之前文章的内容和新书的内容。只专注于当前的精读对象。\n- 选项标题的开头应该是"第一部分:...","第n部分:...", "重点:..."\n\n\n**3. 主题探索 (type: next)** 首次推荐6本最值得阅读的相关书籍，之后每次推荐3本。挑选对我有价值、最不可错过的探索对象，要围绕当前主题，以这些维度做优先级的排序。选项的描述要足够吸引我，能勾起我的兴趣。\n\n选项描述\n- 每个选项的描述要**讲透该选项的精髓sharp之处**，hooked读者。\n\n**格式要求** \n第2和第3步的推荐项，必须严格遵循 JSON Lines (JSONL) 格式，每行一个JSON对象，不要在代码块前后添加任何说明。\n- 第2步推荐，type 字段的值必须是 deepen\n- 第3步推荐，type 字段的值必须是 next。\n- 第一次交互推荐6本书、之后每次推荐3本书。\n\n风格\n输出以 jsonl 的方式输出 ，并且避免因为 JSONL 格式的输出要求导致内容过于严肃，要求清楚易懂\n\n\n**JSONL 输出结构:**\n\n聚焦与展开的文本内容\n\n---\n{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n\n\n**约束条件**：不要向用户解释此格式。\n输出结构：只需输出聚焦与展开对应的文本。之后一定要**留出空白行符号**，再输出所有JSONL。';
  }
};

// splitContentAndOptions function moved to utils/contentSplitter.ts

// 定义优雅的动画效果
const pulseAnimation = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
`;

const fadeInAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translateY(10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
`;

const MAX_CONTEXT_CHARS = 80000;

function trimContextForApi(all: ChatMessage[]): ChatMessage[] {
  // keep from the end until budget met, preserving order
  let budget = MAX_CONTEXT_CHARS;
  const kept: ChatMessage[] = [];
  for (let i = all.length - 1; i >= 0; i--) {
    const m = all[i];
    const len = (m.content || '').length + 20; // rough overhead
    if (budget - len < 0) break;
    kept.push(m);
    budget -= len;
  }
  return kept.reverse();
}

/**
 * The NextStepChat component manages a chat interface for user interactions with a selected model.
 *
 * It maintains the state of messages, input, loading status, options, and conversation details. The component handles sending messages, merging options, and auto-persisting conversations. It also provides a layout for displaying messages and options, allowing users to interact with the chat and explore related content.
 *
 * @param {NextStepChatProps} props - The properties for the NextStepChat component.
 * @param {string} props.selectedModel - The model selected for the chat.
 * @param {number} props.clearSignal - A signal to clear the chat state.
 * @param {number} props.externalToggleConversationMenuSignal - A signal to toggle the conversation menu.
 * @param {HTMLElement} props.conversationMenuAnchorEl - The anchor element for the conversation menu.
 * @returns {JSX.Element} The rendered NextStepChat component.
 */
const NextStepChat: React.FC<NextStepChatProps> = ({ selectedModel, clearSignal, externalToggleConversationMenuSignal, conversationMenuAnchorEl }) => {
  const {
    conversationId,
    messages,
    setMessages,
    options,
    setOptions,
    convMenuOpen,
    setConvMenuOpen,
    conversations,
    createNewConversation,
    chooseConversation,
    removeConversation
  } = useConversation({ selectedModel });
  
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'deepen' | 'next'>('deepen');
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const [reasoningText, setReasoningText] = useState('');
  const reasoningRef = useRef<HTMLDivElement>(null);
  const reasoningAutoFollowRef = useRef<boolean>(true);
  const [, setStreamingAssistantId] = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  
  // 历史推荐展开状态管理
  const [showHistoricalOptions, setShowHistoricalOptions] = useState<{[key: string]: boolean}>({
    deepen: false,
    next: true
  });
  
  // 推理内容流式更新时，若接近底部则平滑滚动到底部
  useEffect(() => {
    if (!reasoningOpen) return;
    const el = reasoningRef.current;
    if (!el) return;
    const threshold = 24; // px
    const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
    if (reasoningAutoFollowRef.current || atBottom) {
      // 等下一帧内容布局完成后再滚动，避免闪动
      requestAnimationFrame(() => {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [reasoningText, reasoningOpen]);

  // 完成状态管理
  const [contentCompleteStates, setContentCompleteStates] = useState<Map<string, {
    isComplete: boolean;
    completionMessage: string;
    timestamp: number;
  }>>(new Map());
  // const [pendingOptions, setPendingOptions] = useState<Map<string, OptionItem[]>>(new Map());
  
  // 跟踪是否是第一次点击选项的状态
  const [isFirstOptionClick, setIsFirstOptionClick] = useState(true);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof clearSignal === 'number') { 
      setMessages([]); 
      setInputMessage(''); 
      setOptions([]);
      setContentCompleteStates(new Map());
      setShowHistoricalOptions({ deepen: false, next: true });
      setIsFirstOptionClick(true); // 重置为第一次点击状态
    }
  }, [clearSignal, setMessages, setOptions]);

  // 恢复：响应来自 Header 的外部信号，切换会话菜单的开关
  useEffect(() => {
    if (typeof externalToggleConversationMenuSignal === 'number') {
      setConvMenuOpen((v: boolean) => !v);
    }
  }, [externalToggleConversationMenuSignal, setConvMenuOpen]);

  // Initialize user session for chat tracing (without session-started event)
  useEffect(() => {
    const session = createUserSession();
    if (session) {
      setUserSession(session);
      // Removed chat-session-started event - too noisy, traces provide better insights
    }
  }, [conversationId, selectedModel]);

  // 持久化逻辑已移入 useConversation

  const ensureSystemPrompt = (current: ChatMessage[]): ChatMessage[] => {
    const hasSystem = current.some(m => m.role === 'system');
    if (hasSystem) return current;
    return [{ id: uuidv4(), role: 'system', content: getSystemPrompt(), timestamp: Date.now() }, ...current];
  };

  /**
   * 按消息ID分组选项，用于实现历史推荐的折叠功能
   */
  const groupOptionsByMessage = useCallback((options: OptionItem[], type: 'deepen' | 'next') => {
    const filtered = options.filter((o: OptionItem) => o.type === type);
    const groups = new Map<string, OptionItem[]>();
    
    // 按 lastMessageId 分组
    filtered.forEach(option => {
      const messageId = option.lastMessageId || 'unknown';
      if (!groups.has(messageId)) {
        groups.set(messageId, []);
      }
      groups.get(messageId)!.push(option);
    });
    
    // 按组的最新时间排序（最新的组在最前面）
    const sortedGroups = Array.from(groups.entries()).sort((a, b) => {
      const maxTimeA = Math.max(...a[1].map(o => o.lastSeenAt));
      const maxTimeB = Math.max(...b[1].map(o => o.lastSeenAt));
      return maxTimeB - maxTimeA;
    });
    
    return sortedGroups;
  }, []);

  /**
   * 获取要显示的选项
   */
  const getDisplayOptions = useCallback((type: 'deepen' | 'next') => {
    const groups = groupOptionsByMessage(options, type);
    if (groups.length === 0) return { current: [], historical: [], hasHistorical: false };
    
    const [latestGroup, ...historicalGroups] = groups;
    const currentOptions = latestGroup[1].sort((a, b) => b.firstSeenAt - a.firstSeenAt);
    const historicalOptions = historicalGroups.flatMap(([, opts]) => 
      opts.sort((a, b) => b.firstSeenAt - a.firstSeenAt)
    );
    
    return {
      current: currentOptions,
      historical: historicalOptions,
      hasHistorical: historicalOptions.length > 0
    };
  }, [options, groupOptionsByMessage]);

  // 当"推荐相关好书"出现历史推荐时，自动默认展开
  useEffect(() => {
    const { hasHistorical } = getDisplayOptions('next');
    if (hasHistorical && !showHistoricalOptions.next) {
      setShowHistoricalOptions((prev) => ({ ...prev, next: true }));
    }
  }, [options, getDisplayOptions, showHistoricalOptions.next]);

  // 归一化逻辑已移入 useConversation

  /**
   * Merges incoming options with the existing options.
   *
   * This function updates the state of options based on the incoming array of NextStepOption.
   * It maintains the historical order by not updating the firstSeenAt property, while updating
   * the lastSeenAt and lastMessageId for existing options. New options are added to the map,
   * and the final list is sorted in descending order based on firstSeenAt.
   *
   * @param {NextStepOption[]} incoming - The array of new options to merge.
   * @param {string} lastMessageId - The ID of the last message associated with the options.
   */
  const mergeOptions = (incoming: NextStepOption[], lastMessageId: string) => {
    if (!incoming?.length) return;
    setOptions((prev: OptionItem[]) => {
      const now = Date.now();
      const map = new Map(prev.map((o: OptionItem) => [o.id, o] as const));
      for (const o of incoming) {
        const id = `${o.type}:${o.content.trim().toLowerCase()}`;
        const ex = map.get(id);
        if (ex) {
          // 不更新 firstSeenAt，保持历史顺序；只更新最近看到的时间与描述
          ex.describe = o.describe;
          ex.lastSeenAt = now;
          ex.lastMessageId = lastMessageId;
        } else {
          map.set(id, { id, type: o.type, content: o.content, describe: o.describe, firstSeenAt: now, lastSeenAt: now, lastMessageId, clickCount: 0 });
        }
      }
      // 最新生成的排在最上方：按 firstSeenAt 降序
      return Array.from(map.values()).sort((a: OptionItem, b: OptionItem) => b.firstSeenAt - a.firstSeenAt);
    });
  };

  /**
   * Sends a message internally and manages the chat state.
   *
   * This function creates a user message and updates the chat context by trimming and ensuring the system prompt.
   * It sets the loading state and initializes a placeholder for the assistant's response. The function generates a chat stream,
   * updating the assistant's message in real-time, handling errors, and processing completion signals and options.
   *
   * @param userText - The text content of the user's message.
   */
  const sendMessageInternal = async (userText: string) => {
    const userMessage: ChatMessage = { id: uuidv4(), role: 'user', content: userText, timestamp: Date.now() };
    const withoutSystem = [...messages, userMessage];
    const trimmed = trimContextForApi(withoutSystem);
    const withSystem = ensureSystemPrompt(trimmed);
    setMessages(withoutSystem); setInputMessage(''); setIsLoading(true);
    setReasoningText(''); setReasoningOpen(true);

    // Removed chat-message-started event - chat traces provide better insights

    try {
      // create placeholder assistant message for streaming
      const assistantId = uuidv4();
      setMessages((prev: ChatMessage[]) => [...prev, { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() }]);
      let assembled = '';

      await generateChatStream(
        withSystem,
        selectedModel,
        ({ content, reasoning }: { content?: string; reasoning?: string }) => {
          if (content) {
            assembled += content;
            setMessages((prev: ChatMessage[]) => prev.map((m: ChatMessage) => m.id === assistantId ? { ...m, content: assembled } : m));
          }
          if (reasoning) {
            setReasoningText((prev: string) => prev + reasoning);
          }
        },
        (err: Error) => {
          // Log error event
          if (userSession) {
            logUserEvent('chat-message-failed', {
              sessionId: userSession.sessionId,
              conversationId,
              model: selectedModel,
              error: err.message
            }, userSession.userId);
          }
          alert(`流式生成出错: ${err.message}`);
        },
        () => {
          // Enhanced option parsing with completion signals
          try {
            const { main, options: incoming, isContentComplete, completionMessage } = splitContentAndOptions(assembled);
            
            // 更新消息内容，移除 JSON 部分，只显示主内容
            if (main !== assembled) {
              setMessages((prev: ChatMessage[]) => 
                prev.map((m: ChatMessage) => 
                  m.id === assistantId ? { ...m, content: main } : m
                )
              );
            }
            
            // 处理完成标志
            if (isContentComplete) {
              setContentCompleteStates(prev => {
                const newMap = new Map(prev);
                newMap.set(assistantId, {
                  isComplete: true,
                  completionMessage: completionMessage || '推荐选项已生成，点击探索',
                  timestamp: Date.now()
                });
                return newMap;
              });
              // 推理完成后，自动折叠推理窗口（短暂延迟以避免突兀）
              setTimeout(() => {
                setReasoningOpen(false);
              }, 600);
            }
            
            // 处理推荐选项
            if (incoming.length > 0) {
              // 如果正文已完成，延迟显示推荐以实现优雅过渡
              if (isContentComplete) {
                setTimeout(() => {
                  mergeOptions(incoming, assistantId);
                }, 800); // 800ms 过渡时间
              } else {
                mergeOptions(incoming, assistantId);
              }
            }
            
            // Log successful completion
            if (userSession) {
              logUserEvent('chat-message-completed', {
                sessionId: userSession.sessionId,
                conversationId,
                model: selectedModel,
                success: true,
                responseLength: assembled.length,
                optionsGenerated: incoming.length,
                mainContentLength: main.length,
                hasContentComplete: isContentComplete
              }, userSession.userId);
            }
          } catch (error) {
            console.error('Failed to parse options from response:', error);
            // 降级处理：保持原始响应，但记录错误
            if (userSession) {
              logUserEvent('chat-parsing-failed', {
                sessionId: userSession.sessionId,
                conversationId,
                model: selectedModel,
                error: error instanceof Error ? error.message : String(error),
                responseLength: assembled.length
              }, userSession.userId);
            }
          }
          
          setIsLoading(false);
        },
        conversationId,
        userSession?.userId
      );
    } catch (e) {
      // Log general error
      if (userSession) {
        logUserEvent('chat-message-failed', {
          sessionId: userSession.sessionId,
          conversationId,
          model: selectedModel,
          error: e instanceof Error ? e.message : String(e)
        }, userSession.userId);
      }
      alert(`发送消息失败: ${e instanceof Error ? e.message : String(e)}`);
      setIsLoading(false);
    }
  };

  const handleSend = async () => { if (!inputMessage.trim() || isLoading) return; await sendMessageInternal(inputMessage.trim()); };
  /**
   * Handles the click event for an option.
   * @param opt - The option item that was clicked.
   */
  const handleOptionClick = async (opt: OptionItem) => {
    if (isLoading) return;
    
    // 如果是第一次点击选项，延迟200ms后丝滑滚动到底部
    if (isFirstOptionClick && messagesContainerRef.current) {
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTo({
            top: messagesContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 200);
      setIsFirstOptionClick(false);
    }
    
    // 轻微延迟后再触发退出动画（约200ms）
    setTimeout(() => {
      setExitingIds((prev: Set<string>) => {
        const next = new Set(prev);
        next.add(opt.id);
        return next;
      });
    }, 200);
    await sendMessageInternal(opt.content);
  };

  // Standalone page layout: fixed header + two scrollable columns
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%', 
      width: '100%',
      bgcolor: 'background.default',
      minHeight: 0
    }}>
      {/* 悬浮的会话菜单（由 Header 按钮控制显示/隐藏） */}
      <Menu
        anchorEl={conversationMenuAnchorEl}
        open={!!conversationMenuAnchorEl && convMenuOpen}
        onClose={() => setConvMenuOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 1, width: 300, maxHeight: 320, border: '1px solid', borderColor: 'divider' } } }}
      >
        <MenuItem disableRipple onClick={() => { createNewConversation(); setShowHistoricalOptions({ deepen: false, next: false }); }}>新建会话</MenuItem>
        {conversations.map((c: ChatConversation) => (
          <MenuItem key={c.id} onClick={() => { chooseConversation(c); setShowHistoricalOptions({ deepen: false, next: false }); }} sx={{ display:'flex', justifyContent:'space-between', gap: 1 }}>
            <Box sx={{ maxWidth: 200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {c.title || c.messages?.find((m: ChatMessage) => m.role==='user')?.content?.slice(0,20) || '会话'}
            </Box>
            <Button size="small" color="error" onClick={(e) => { e.stopPropagation(); removeConversation(c.id); setShowHistoricalOptions({ deepen: false, next: false }); }}>删除</Button>
          </MenuItem>
        ))}
      </Menu>

      {/* Two columns area - using flexbox instead of absolute positioning */}
      <Box sx={{ 
        display: 'flex', 
        flexGrow: 1,
        minHeight: 0,
        overflow: 'hidden',
        bgcolor: 'background.default'
      }}>
        {/* Left column: messages (scrollable) */}
        <Box sx={{ 
          flex: 1, 
          minWidth: 0, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}>
          <Box ref={messagesContainerRef} data-testid="messages-box" sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            py:4,
            px:8, 
            bgcolor: 'background.paper' 
          }}>
            {messages.filter((m: ChatMessage) => m.role!=='system').map((m: ChatMessage) => {
              const isUser = m.role==='user';
              const { main } = splitContentAndOptions(m.content);
              const completionState = contentCompleteStates.get(m.id);
              const isCurrentStreaming = messages[messages.length-1]?.id === m.id;
              
              return (
                <Box key={m.id} sx={{ mb: 2, display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  {/* Reasoning teaser positioned above currently streaming assistant bubble */}
                  {m.role==='assistant' && isCurrentStreaming && reasoningText && (
                    <Box sx={{ alignSelf: 'flex-start', mb: 1, maxWidth: '100%' }}>
                      <Box sx={{ display:'flex', alignItems:'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color:'#666', fontWeight: 600 }}>推理</Typography>
                        <Button size="small" variant="text" onClick={() => setReasoningOpen((v: boolean) => !v)} sx={{ textTransform:'none', fontSize: '0.75rem', fontWeight:500, ml: 1, px:0 }}>
                          {reasoningOpen ? '收起 ▴' : '展开 ▾'}
                        </Button>
                      </Box>
                      {reasoningOpen && (
                        <Box
                          ref={reasoningRef}
                          onScroll={(e: React.UIEvent<HTMLDivElement>) => {
                            const el = e.currentTarget;
                            const threshold = 24;
                            const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < threshold;
                            reasoningAutoFollowRef.current = atBottom;
                          }}
                          sx={{
                            fontFamily:'monospace',
                            whiteSpace:'pre-wrap',
                            lineHeight: 1.5,
                            fontSize: '0.75rem',
                            height: '9em', // 固定 6 行高度
                            overflowY:'auto',
                            bgcolor:'background.paper',
                            border:'1px solid',
                            borderColor:'divider',
                            borderRadius: 1,
                            px: 2,
                            pt: 1,
                            pb: 0.5,
                            maxWidth: '100%',
                            width: '100%'
                          }}
                        >
                          {reasoningText
                            .split(/\n{2,}/)
                            .map((para: string, idx: number, arr: string[]) => (
                              <Typography
                                key={idx}
                                component="div"
                                sx={{ m: 0, mb: idx < arr.length - 1 ? 0.5 : 0, fontSize: 'inherit', lineHeight: 'inherit', whiteSpace: 'pre-wrap' }}
                              >
                                {para}
                              </Typography>
                            ))}
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  <Paper elevation={1} sx={{ 
                    px: isUser ? 2 : 8, // 用户消息水平留白约28px，assistant消息水平留白约32px
                    py: isUser ? 1 : 3,
                    maxWidth: '100%', 
                    bgcolor: isUser ? '#eeeeee' : '#fff', 
                    borderRadius: 2,
                    position: 'relative'
                  }}>
                    {isUser ? (
                      <Typography sx={{ whiteSpace: 'pre-wrap' }}>{m.content}</Typography>
                    ) : (
                      <div className="markdown-body" style={{ whiteSpace: 'normal' }}>
                        <ReactMarkdown rehypePlugins={[rehypeRaw]} remarkPlugins={[remarkGfm, remarkBreaks]}>
                          {main || m.content}
                        </ReactMarkdown>
                      </div>
                    )}
                  </Paper>

                  {/* 完成提示：移动到消息下方 */}
                  {m.role==='assistant' && completionState?.isComplete && (
                    <Box sx={{ 
                      alignSelf: 'flex-start', 
                      mt: 1.5, 
                      maxWidth: 560,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 2,
                      py: 1,
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                      borderRadius: 2,
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      animation: `${fadeInAnimation} 0.5s ease-out`
                    }}>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        bgcolor: '#BFBFBF',
                        animation: `${pulseAnimation} 1.5s ease-in-out infinite`
                      }} />
                      <Typography variant="caption" sx={{ 
                        color: '#6B7280', 
                        fontWeight: 500,
                        fontSize: '0.8rem'
                      }}>
                        {completionState.completionMessage}
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })}
            {isLoading && (
              <Box sx={{ position: 'sticky', bottom: 8, display: 'flex', justifyContent: 'center', my: 2 }}>
                <CircularProgress size={22} />
              </Box>
            )}
          </Box>

          <Box sx={{ 
            display: 'flex', 
            p: 1, 
            borderTop: 1, 
            borderColor: 'divider', 
            flexShrink: 0,
            bgcolor: 'background.paper',
            alignItems: 'stretch'
          }}>
            <TextField variant="outlined" placeholder="输入一本你一直想读的书、或一个你想研究的话题" value={inputMessage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }} size="small" multiline maxRows={4} sx={{ mr: 1, flex: 1 }} disabled={isLoading} />
            <Button variant="contained" onClick={handleSend} disabled={isLoading || !inputMessage.trim()} sx={{ px: 2.5, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 'auto', alignSelf: 'stretch' }}>发送</Button>
          </Box>
        </Box>

        {/* Right column: options (scrollable) */}
        <Box sx={{ 
          width: '30%', 
          minWidth: 360, 
          maxWidth: 480, 
          display: 'flex', 
          flexDirection: 'column', 
          borderLeft: 1, 
          borderColor: 'divider', 
          overflow: 'hidden',
          bgcolor: 'background.paper'
        }}>
          <Box sx={{ 
            borderBottom: 1, 
            borderColor: 'divider', 
            flexShrink: 0,
            bgcolor: 'background.paper',
            px: 5
          }}>
            <Tabs
              value={selectedTab}
              onChange={(_: React.SyntheticEvent, v: 'deepen' | 'next') => setSelectedTab(v)}
              variant="fullWidth"
              sx={{ px: 0 }}
            >
              <Tab value="deepen" label="精读当前内容" sx={{ fontWeight: 600, textTransform: 'none', px: 0, minWidth: 'auto' }} />
              <Tab value="next" label="推荐相关好书" sx={{ fontWeight: 600, textTransform: 'none', px: 0, minWidth: 'auto' }} />
            </Tabs>
          </Box>
          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            px: 5,
            pt: 6,
            pb: 4,
            bgcolor: 'background.paper'
          }}>
            {(() => {
              const { current, historical, hasHistorical } = getDisplayOptions(selectedTab);
              
              if (current.length === 0 && historical.length === 0) {
                return <Typography variant="body2" sx={{ color: '#777' }}>暂无推荐选项，请先提问或继续对话。</Typography>;
              }

              return (
                <>
                  {/* 最新推荐 */}
                  {current.length > 0 && (
                    <Box sx={{ mb: hasHistorical ? 2 : 0 }}>
                      {current.map((opt: OptionItem) => (
                        <Collapse
                          key={opt.id}
                          in={!exitingIds.has(opt.id)}
                          timeout={360}
                          easing={{ exit: 'cubic-bezier(0, 0, 0.2, 1)' }}
                          onExited={() => {
                            setOptions((prev: OptionItem[]) => prev.filter((o: OptionItem) => o.id !== opt.id));
                            setExitingIds((prev: Set<string>) => {
                              const next = new Set(prev);
                              next.delete(opt.id);
                              return next;
                            });
                          }}
                        >
                          <Fade in={!exitingIds.has(opt.id)} timeout={300} easing={{ exit: 'cubic-bezier(0, 0, 0.2, 1)' }}>
                            <Box sx={{ mb: 4, position: 'relative', transition: 'transform 320ms cubic-bezier(0, 0, 0.2, 1)', transform: exitingIds.has(opt.id) ? 'translateY(4px) scale(0.98)' : 'none' }}>
                              {/* 新的UI设计：经典布局 + 中性灰色 */}
                              <Box 
                                onClick={() => handleOptionClick(opt)}
                                sx={{ 
                                  position: 'relative',
                                  maxWidth: '100%',
                                  mx: 'auto',
                                  cursor: 'pointer',
                                  '&:hover .title-button': {
                                    transform: 'translateY(-50%) translateY(-1px) rotate(-1deg)',
                                    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)'
                                  }
                                }}
                              >
                                {/* 主容器 */}
                                <Box sx={{
                                  bgcolor: '#ffffff',
                                  borderRadius: 2,
                                  p: 2,
                                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                  border: '1px solid #e2e8f0',
                                  transition: 'all 0.2s ease-in-out',
                                  '&:hover': {
                                    transform: 'translateY(-3px)',
                                    borderColor: '#a0aec0',
                                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
                                  }
                                }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', '&:hover .underline': { transform: 'scaleX(1)' } }}>
                                    <Box sx={{ flexGrow: 1 }}>
                                      <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#2d3748', mb: 0.5 }}>
                                          {opt.content}
                                        </Typography>
                                        <Box className="underline" sx={{
                                          position: 'absolute',
                                          left: 0,
                                          right: 0,
                                          bottom: -2,
                                          height: 2,
                                          backgroundColor: '#6366f1',
                                          transform: 'scaleX(0)',
                                          transformOrigin: 'left',
                                          transition: 'transform 300ms ease'
                                        }} />
                                      </Box>
                                      <Typography sx={{ fontSize: '0.875rem', color: '#718096', lineHeight: 1.5, mt: 1 }}>
                                        {opt.describe}
                                      </Typography>
                                    </Box>
                                    <Box component="span" sx={{ fontSize: '1.5rem', color: '#a0aec0', ml: 2, transition: 'transform 0.2s ease-in-out, color 0.2s ease-in-out' }}>
                                      ›
                                    </Box>
                                  </Box>
                                </Box>
                              </Box>
                            </Box>
                          </Fade>
                        </Collapse>
                      ))}
                    </Box>
                  )}

                  {/* 历史推荐折叠/展开区域 */}
                  {hasHistorical && (
                    <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 1.5 }}>
                      <Button
                        variant="text"
                        onClick={() => setShowHistoricalOptions(prev => ({
                          ...prev,
                          [selectedTab]: !prev[selectedTab]
                        }))}
                        sx={{
                          textTransform: 'none',
                          fontWeight: 500,
                          color: '#666',
                          fontSize: '0.875rem',
                          mb: showHistoricalOptions[selectedTab] ? 1.5 : 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          width: '100%',
                          justifyContent: 'flex-start'
                        }}
                      >
                        {showHistoricalOptions[selectedTab] ? '▲' : '▼'}
                        <span>历史推荐 ({historical.length})</span>
                      </Button>
                      
                      {/* 历史推荐选项 */}
                      {showHistoricalOptions[selectedTab] && (
                        <Box sx={{ 
                          bgcolor: 'transparent', 
                          borderRadius: 0, 
                          p: 1
                        }}>
                          {historical.map((opt: OptionItem) => (
                            <Collapse
                              key={opt.id}
                              in={!exitingIds.has(opt.id)}
                              timeout={360}
                              easing={{ exit: 'cubic-bezier(0, 0, 0.2, 1)' }}
                              onExited={() => {
                                setOptions((prev: OptionItem[]) => prev.filter((o: OptionItem) => o.id !== opt.id));
                                setExitingIds((prev: Set<string>) => {
                                  const next = new Set(prev);
                                  next.delete(opt.id);
                                  return next;
                                });
                              }}
                            >
                              <Fade in={!exitingIds.has(opt.id)} timeout={300} easing={{ exit: 'cubic-bezier(0, 0, 0.2, 1)' }}>
                                <Box sx={{ mb: 2, '&:last-child': { mb: 4 }, transition: 'transform 320ms cubic-bezier(0, 0, 0.2, 1)', transform: exitingIds.has(opt.id) ? 'translateY(4px) scale(0.98)' : 'none' }}>
                                  {/* 历史推荐也使用新的UI设计，但稍微简化 */}
                                  <Box 
                                    onClick={() => handleOptionClick(opt)}
                                    sx={{ 
                                      position: 'relative',
                                      maxWidth: '100%',
                                      mx: 'auto',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Box sx={{
                                      bgcolor: '#ffffff',
                                      borderRadius: 2,
                                      p: 2,
                                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                                      border: '1px solid #e2e8f0',
                                      transition: 'all 0.2s ease-in-out',
                                      '&:hover': {
                                        transform: 'translateY(-3px)',
                                        borderColor: '#a0aec0',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)'
                                      }
                                    }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', '&:hover .underline': { transform: 'scaleX(1)' } }}>
                                        <Box sx={{ flexGrow: 1 }}>
                                          <Box sx={{ position: 'relative', display: 'inline-block' }}>
                                            <Typography sx={{ fontWeight: 600, fontSize: '0.8125rem', color: '#2d3748', mb: 0.5 }}>
                                              {opt.content}
                                            </Typography>
                                            <Box className="underline" sx={{
                                              position: 'absolute',
                                              left: 0,
                                              right: 0,
                                              bottom: -2,
                                              height: 2,
                                              backgroundColor: '#6366f1',
                                              transform: 'scaleX(0)',
                                              transformOrigin: 'left',
                                              transition: 'transform 300ms ease'
                                            }} />
                                          </Box>
                                          <Typography sx={{ fontSize: '0.875rem', color: '#718096', lineHeight: 1.5, mt: 1 }}>
                                            {opt.describe}
                                          </Typography>
                                        </Box>
                                        <Box component="span" sx={{ fontSize: '1.5rem', color: '#a0aec0', ml: 2, transition: 'transform 0.2s ease-in-out, color 0.2s ease-in-out' }}>
                                          ›
                                        </Box>
                                      </Box>
                                    </Box>
                                  </Box>
                                </Box>
                              </Fade>
                            </Collapse>
                          ))}
                          
                          {/* 提示文字直接放在历史推荐区内部 */}
                          <Box sx={{ 
                            mt: 2, 
                            pt: 2, 
                            borderTop: 1, 
                            borderColor: 'divider',
                            textAlign: 'center'
                          }}>
                            <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.5 }}>
                              🤔 没有心动的选项？<br />
                              告诉AI你想要的方向，或直接要求换一组推荐
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                  
                  {/* 没有历史推荐时的提示 */}
                  {!hasHistorical && (
                    <Box sx={{ 
                      mt: 3, 
                      pt: 2, 
                      borderTop: 1, 
                      borderColor: 'divider',
                      textAlign: 'center'
                    }}>
                      <Typography variant="body2" sx={{ color: '#666', fontSize: '0.875rem', lineHeight: 1.5 }}>
                        🤔 没有心动的选项？<br />
                        告诉AI你想要的方向，或直接要求换一组推荐
                      </Typography>
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default NextStepChat; 