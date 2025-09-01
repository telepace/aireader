import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Paper, TextField, Typography, Tabs, Tab, keyframes, Menu, MenuItem, Collapse } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatConversation, OptionItem, UserSession } from '../types/types';
import { generateChatStream, generateChat, logUserEvent, createUserSession } from '../services/api-with-tracing';
import { splitContentAndOptions, NextStepOption } from '../utils/contentSplitter';
import { generateSystemPromptAsync } from '../services/promptTemplateV2';
import { useConversation } from '../hooks/useConversation';
import SimpleOptionCard from './SimpleOptionCard';
import { useMindMap } from '../hooks/useMindMap';
import { useConceptMap } from '../hooks/useConceptMap';
import { ConceptRecommendationContext, ConceptTree, ConceptTreeNode } from '../types/concept';
import ConceptMapPanel from './ConceptMap/ConceptMapPanel';
import ConceptTreeRenderer from './ConceptMap/ConceptTreeRenderer';

// Markdown renderers (aligned with existing style)

interface NextStepChatProps {
  selectedModel: string;
  clearSignal?: number;
  externalToggleConversationMenuSignal?: number;
  conversationMenuAnchorEl?: HTMLElement | null;
}

// NextStepOption interface moved to utils/contentSplitter.ts

// OptionItem now comes from types.ts

// 使用新的模板系统生成不同阶段的 SYSTEM_PROMPT
/**
 * Generates a system prompt for content generation (first stage).
 */
const getContentGenerationPrompt = async () => {
  try {
    return await generateSystemPromptAsync('smartRecommendation', 'zh', { mode: 'content' });
  } catch (error) {
    console.error('Failed to generate content generation prompt:', error);
    // 简单的降级版本
    return '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。\n\n你的任务是对当前讨论的内容进行**聚焦与展开**：\n\n先讲透内容的一个核心关键；全面并深度地展开讲全文内容，目标是看了你的内容，我就吸收了一本书绝大多数的精华内容。';
  }
};

/**
 * Generates a system prompt for next step JSONL generation (second stage).
 */
const getNextStepJsonlPrompt = async (conceptContext?: ConceptRecommendationContext) => {
  try {
    return await generateSystemPromptAsync('smartRecommendation', 'zh', { 
      mode: 'recommendations',
      concept_context: conceptContext 
    });
  } catch (error) {
    console.error('Failed to generate next step JSONL prompt:', error);
    // 简单的降级版本
    let fallbackPrompt = '你是一个智能推荐助手，专门负责根据内容分析结果生成精准的推荐选项。\n\n生成两类推荐选项：\n1. 原文深挖 (type: deepen) - 推荐3个最有价值的原文精读选项\n2. 主题探索 (type: next) - 推荐3本最值得阅读的相关书籍\n\n输出格式：JSONL格式，每行一个JSON对象，使用"content"和"describe"字段。';
    
    // 如果有概念上下文，添加去重提示
    if (conceptContext && conceptContext.avoidanceList.length > 0) {
      fallbackPrompt += `\n\n⚠️ 避免推荐以下已掌握的概念：${conceptContext.avoidanceList.join(', ')}\n请确保推荐内容的新颖性和多样性。`;
    }
    
    return fallbackPrompt;
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
  const [, setStreamingAssistantIds] = useState<Set<string>>(new Set());
  const [userSession, setUserSession] = useState<UserSession | null>(null);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const [processingOptions, setProcessingOptions] = useState<Set<string>>(new Set());

  // 思维导图相关状态 (保留状态变量以维持功能)
  
  // 概念管理
  const conceptMap = useConceptMap(conversationId);
  
  
  const {
    mindMapState,
    initializeMindMap,
    addNode,
    navigateToNode
  } = useMindMap(conversationId);

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
        // 在测试环境中 JSDOM 可能不支持 scrollTo 方法
        if (el.scrollTo && typeof el.scrollTo === 'function') {
          el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
        } else if (el.scrollTop !== undefined) {
          // 降级处理：直接设置 scrollTop
          el.scrollTop = el.scrollHeight;
        }
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
  
  // 概念树状态
  const [conceptTree, setConceptTree] = useState<ConceptTree | null>(null);
  const [conceptTreeLoading, setConceptTreeLoading] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  /**
   * 使用 LLM 更新思维导图（带监控追踪）
   */
  const updateMindMapWithLLM = async (
    content: string, 
    model: string, 
    conversationId: string, 
    userId?: string
  ) => {
    console.log('🚀 开始思维导图LLM更新流程');
    setConceptTreeLoading(true);
    
    try {
      const currentNodes = Array.from(mindMapState.nodes.values());
      const currentFocusNode = mindMapState.nodes.get(mindMapState.currentNodeId || '');
      
      console.log('📝 当前节点数量:', currentNodes.length);
      console.log('🎯 当前焦点节点:', currentFocusNode?.title || '无');
      
      // 构建简化的 previous_map 结构
      const rootNode = currentNodes.find(node => node.type === 'root');
      const previous_map = currentNodes.length > 0 ? {
        id: rootNode?.id || 'root',
        name: rootNode?.title || conversations.find(c => c.id === conversationId)?.title || 'root',
        children: currentNodes
          .filter(node => node.type !== 'root')
          .map(node => ({
            id: node.id,
            name: node.title,
            children: []
          }))
      } : null;
      
      // 获取书名
      const book_title = conversations.find(c => c.id === conversationId)?.title || '';
      
      console.log('⏳ 生成思维导图prompt...');
      const mindMapPrompt = await generateSystemPromptAsync('knowledgeGraph', 'zh');
      
      if (!mindMapPrompt) {
        throw new Error('思维导图prompt生成失败');
      }
      
      console.log('📄 思维导图prompt生成成功，长度:', mindMapPrompt.length);
      
      // 构建结构化的用户消息
      const structuredInput = JSON.stringify({
        previous_map,
        book_title,
        latest_reply: content
      }, null, 2);
      
      const mindMapMessages = [
        { id: `system-${Date.now()}`, role: 'system' as const, content: mindMapPrompt, timestamp: Date.now() },
        { id: `user-${Date.now()}`, role: 'user' as const, content: structuredInput, timestamp: Date.now() }
      ];
      
      console.log('🤖 调用带监控的 LLM API 进行思维导图更新...');
      
      // 使用带 tracing 的 API，这样会在 LLM 监控中显示
      const response = await generateChat(
        mindMapMessages, 
        model,
        conversationId,
        userId
      );
      
      console.log('🧠 思维导图 LLM 响应长度:', response?.length || 0);
      
      if (!response) {
        console.warn('⚠️ 思维导图 LLM 响应为空，跳过更新');
        return;
      }
      
      // 尝试解析JSON响应并更新思维导图
      try {
        const cleanResponse = response.replace(/```json\n?|\n?```/g, '').trim();
        const mindMapUpdate = JSON.parse(cleanResponse);
        console.log('📊 解析的思维导图更新:', mindMapUpdate);
        
        // 检查是否是预期的树状结构
        if (mindMapUpdate && typeof mindMapUpdate === 'object' && 
            mindMapUpdate.id && mindMapUpdate.name && Array.isArray(mindMapUpdate.children)) {
          
          // 计算节点总数的递归函数
          const countNodes = (node: any): number => {
            let count = 1;
            if (node.children && Array.isArray(node.children)) {
              count += node.children.reduce((sum: number, child: any) => sum + countNodes(child), 0);
            }
            return count;
          };
          
          // 更新概念树状态
          const newConceptTree: ConceptTree = {
            id: mindMapUpdate.id,
            name: mindMapUpdate.name,
            children: mindMapUpdate.children,
            metadata: {
              conversationId,
              totalNodes: countNodes(mindMapUpdate),
              createdAt: Date.now(),
              updatedAt: Date.now()
            }
          };
          
          setConceptTree(newConceptTree);
          console.log('🌳 概念树已更新:', newConceptTree);
          
          // 记录成功事件
          if (userSession) {
            logUserEvent('concept-tree-updated', {
              sessionId: userSession.sessionId,
              conversationId,
              model: model,
              success: true,
              totalNodes: newConceptTree.metadata?.totalNodes || 0,
              rootName: newConceptTree.name
            }, userId);
          }
        } else {
          console.warn('⚠️ 响应格式不符合概念树结构:', mindMapUpdate);
        }
        
        // 保持向后兼容 - 记录传统的mind-map事件
        if (userSession) {
          logUserEvent('mind-map-updated', {
            sessionId: userSession.sessionId,
            conversationId,
            model: model,
            success: true,
            nodeCount: mindMapUpdate.children?.length || 0,
            bookTitle: book_title
          }, userId);
        }
        
      } catch (parseError) {
        console.warn('📝 思维导图更新解析失败:', parseError);
        
        // 记录解析失败事件
        if (userSession) {
          logUserEvent('mind-map-parse-failed', {
            sessionId: userSession.sessionId,
            conversationId,
            model: model,
            error: parseError instanceof Error ? parseError.message : String(parseError),
            response: response.substring(0, 500) // 截断响应避免过长
          }, userId);
        }
      }
      
    } catch (error) {
      console.error('💭 思维导图更新异常:', error);
      
      // 记录失败事件
      if (userSession) {
        logUserEvent('mind-map-failed', {
          sessionId: userSession.sessionId,
          conversationId,
          model: model,
          error: error instanceof Error ? error.message : String(error)
        }, userId);
      }
      
      throw error; // 重新抛出，让调用者处理
    } finally {
      setConceptTreeLoading(false);
    }
  };

  // 初始化思维导图（当第一条用户消息发送时）
  useEffect(() => {
    if (messages.length > 0 && mindMapState.stats.totalNodes === 0) {
      // 找到第一条用户消息作为根主题
      const firstUserMessage = messages.find(m => m.role === 'user');
      if (firstUserMessage) {
        const rootTitle = firstUserMessage.content.length > 50 
          ? firstUserMessage.content.slice(0, 50) + '...'
          : firstUserMessage.content;
        initializeMindMap(rootTitle, '探索的起始话题');
      }
    }
  }, [messages, mindMapState.stats.totalNodes, initializeMindMap]);

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

  const ensureSystemPrompt = async (current: ChatMessage[], promptType: 'content' | 'jsonl' = 'content'): Promise<ChatMessage[]> => {
    const hasSystem = current.some(m => m.role === 'system');
    if (hasSystem) return current;
    const prompt = promptType === 'content' ? await getContentGenerationPrompt() : await getNextStepJsonlPrompt();
    return [{ id: uuidv4(), role: 'system', content: prompt, timestamp: Date.now() }, ...current];
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
   * @param isFromOption - Whether this message is triggered by clicking an option (for concurrent handling)
   */
  const sendMessageInternal = async (userText: string, isFromOption: boolean = false) => {
    const userMessage: ChatMessage = { id: uuidv4(), role: 'user', content: userText, timestamp: Date.now() };
    const withoutSystem = [...messages, userMessage];
    // 不再这里设置系统prompt，在两个阶段分别设置
    
    // 只在手动输入时才清空输入框和设置全局loading状态
    if (!isFromOption) {
      setInputMessage('');
      setIsLoading(true);
    }
    
    setMessages(prev => [...prev, userMessage]);
    
    // 对于选项触发的消息，使用独立的推理状态
    if (!isFromOption) {
      setReasoningText('');
      setReasoningOpen(true);
    }

    // Removed chat-message-started event - chat traces provide better insights

    try {
      // 第一阶段：内容生成
      const contentSystemMessages = await ensureSystemPrompt(withoutSystem, 'content');
      const contentAssistantId = uuidv4();
      setMessages((prev: ChatMessage[]) => [...prev, { id: contentAssistantId, role: 'assistant', content: '', timestamp: Date.now() }]);
      let contentAssembled = '';
      
      // 跟踪当前正在流式处理的消息
      if (isFromOption) {
        setStreamingAssistantIds(prev => {
          const next = new Set(prev);
          next.add(contentAssistantId);
          return next;
        });
      }

      // 第一阶段API调用 - 内容生成
      await generateChatStream(
        contentSystemMessages,
        selectedModel,
        ({ content, reasoning }: { content?: string; reasoning?: string }) => {
          if (content) {
            contentAssembled += content;
            setMessages((prev: ChatMessage[]) => prev.map((m: ChatMessage) => m.id === contentAssistantId ? { ...m, content: contentAssembled } : m));
          }
          if (reasoning && !isFromOption) {
            // 只有手动输入的消息才显示推理过程
            setReasoningText((prev: string) => prev + reasoning);
          }
        },
        (err: Error) => {
          // Log error event
          if (userSession) {
            logUserEvent('chat-content-failed', {
              sessionId: userSession.sessionId,
              conversationId,
              model: selectedModel,
              stage: 'content',
              error: err.message
            }, userSession.userId);
          }
          alert(`内容生成出错: ${err.message}`);
        },
        async () => {
          try {
            // 第一阶段完成：内容生成完毕，设置中间状态
            setContentCompleteStates(prev => {
              const newMap = new Map(prev);
              newMap.set(contentAssistantId, {
                isComplete: true,
                completionMessage: '内容分析完成，正在生成推荐选项...',
                timestamp: Date.now()
              });
              return newMap;
            });

            // 只有手动输入的消息才自动折叠推理窗口
            if (!isFromOption) {
              setTimeout(() => {
                setReasoningOpen(false);
              }, 600);
            }

            // 第二阶段前：概念图谱自动更新
            console.log('🧠 开始概念图谱自动更新...');
            try {
              await updateMindMapWithLLM(contentAssembled, selectedModel, conversationId, userSession?.userId);
            } catch (mindMapError) {
              console.warn('概念图谱更新失败，不影响主流程:', mindMapError);
            }
            
            // 第二阶段：Next Step JSONL 生成（使用概念上下文）
            console.log('开始第二阶段：生成推荐选项');
            
            // 获取概念推荐上下文
            const conceptContext = conceptMap.getRecommendationContext();
            console.log('概念去重上下文:', {
              避免概念: conceptContext.avoidanceList.slice(0, 5),
              最近概念: conceptContext.recentConcepts.slice(0, 5),
              偏好类型: conceptContext.preferredCategories
            });
            
            // 构建第二阶段的消息历史（带概念上下文的系统prompt）
            const jsonlUserMessage: ChatMessage = { 
              id: uuidv4(), 
              role: 'user', 
              content: `请根据以下内容分析结果生成推荐选项：\n\n${contentAssembled}`, 
              timestamp: Date.now() 
            };
            
            // 使用带概念上下文的系统prompt
            const conceptAwareSystemPrompt = await getNextStepJsonlPrompt(conceptContext);
            const jsonlMessages: ChatMessage[] = [
              { id: uuidv4(), role: 'system', content: conceptAwareSystemPrompt, timestamp: Date.now() },
              jsonlUserMessage
            ];
            
            let jsonlAssembled = '';
            // 使用2.5 flash模型进行第二阶段JSONL生成
            const jsonlModel = 'google/gemini-2.5-flash';
            
            // 第二阶段API调用 - JSONL选项生成
            await generateChatStream(
              jsonlMessages,
              jsonlModel,
              ({ content }: { content?: string; reasoning?: string }) => {
                if (content) {
                  jsonlAssembled += content;
                  console.log('第二阶段内容累积:', jsonlAssembled.length, '字符');
                }
              },
              (err: Error) => {
                console.error(`第二阶段JSONL生成出错: ${err.message}`);
                if (userSession) {
                  logUserEvent('chat-jsonl-failed', {
                    sessionId: userSession.sessionId,
                    conversationId,
                    model: jsonlModel,
                    stage: 'jsonl',
                    error: err.message
                  }, userSession.userId);
                }
                // 即使JSONL失败，内容分析仍然可用
              },
              () => {
                try {
                  console.log('第二阶段完成，开始解析JSONL:', jsonlAssembled);
                  
                  // 解析JSONL选项
                  const { options: incoming } = splitContentAndOptions(jsonlAssembled);
                  console.log('解析出的选项数量:', incoming.length);
                  
                  if (incoming.length > 0) {
                    // 更新完成状态消息
                    setContentCompleteStates(prev => {
                      const newMap = new Map(prev);
                      newMap.set(contentAssistantId, {
                        isComplete: true,
                        completionMessage: '推荐选项已生成，点击探索',
                        timestamp: Date.now()
                      });
                      return newMap;
                    });

                    // 延迟显示推荐以实现优雅过渡
                    setTimeout(() => {
                      mergeOptions(incoming, contentAssistantId);
                      console.log('选项已合并到UI');
                    }, 800);
                  } else {
                    console.warn('没有解析出有效的选项');
                  }

                  // Log successful completion
                  if (userSession) {
                    logUserEvent('chat-message-completed', {
                      sessionId: userSession.sessionId,
                      conversationId,
                      model: selectedModel,
                      jsonlModel: jsonlModel,
                      success: true,
                      contentLength: contentAssembled.length,
                      optionsGenerated: incoming.length,
                      twoStageProcess: true
                    }, userSession.userId);
                  }
                  
                } catch (parseError) {
                  console.warn('无法解析JSONL选项内容:', parseError);
                  if (userSession) {
                    logUserEvent('chat-jsonl-parse-failed', {
                      sessionId: userSession.sessionId,
                      conversationId,
                      model: jsonlModel,
                      error: parseError instanceof Error ? parseError.message : String(parseError),
                      jsonlContent: jsonlAssembled
                    }, userSession.userId);
                  }
                }
              }
            );

          } catch (secondStageError) {
            console.error('第二阶段处理失败:', secondStageError);
            if (userSession) {
              logUserEvent('chat-second-stage-failed', {
                sessionId: userSession.sessionId,
                conversationId,
                model: selectedModel,
                error: secondStageError instanceof Error ? secondStageError.message : String(secondStageError)
              }, userSession.userId);
            }
            // 即使第二阶段失败，内容分析仍然可用
          } finally {
            // Clean up streaming state for option-triggered messages
            if (isFromOption) {
              setStreamingAssistantIds(prev => {
                const next = new Set(prev);
                next.delete(contentAssistantId);
                return next;
              });
            } else {
              setIsLoading(false);
            }
          }
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
      
      // 清理状态
      if (isFromOption) {
        setStreamingAssistantIds(prev => {
          const assistantId = Array.from(prev)[Array.from(prev).length - 1]; // 获取最后一个
          if (assistantId) {
            const next = new Set(prev);
            next.delete(assistantId);
            return next;
          }
          return prev;
        });
      } else {
        setIsLoading(false);
      }
    }
  };

  const handleSend = async () => { if (!inputMessage.trim() || isLoading) return; await sendMessageInternal(inputMessage.trim(), false); };
  
  /**
   * 支持并发执行的选项点击处理函数
   */
  const handleOptionClick = async (opt: OptionItem) => {
    console.log('🎯 handleOptionClick 被调用，选项:', opt.content);
    
    // 检查该选项是否正在处理中
    if (processingOptions.has(opt.id)) return;
    
    // 标记该选项正在处理中
    setProcessingOptions(prev => {
      const next = new Set(prev);
      next.add(opt.id);
      return next;
    });
    
    // 如果是第一次点击选项，丝滑滚动到底部
    if (isFirstOptionClick && messagesContainerRef.current) {
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          if (container.scrollTo && typeof container.scrollTo === 'function') {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'smooth'
            });
          } else if (container.scrollTop !== undefined) {
            // 降级处理：直接设置 scrollTop
            container.scrollTop = container.scrollHeight;
          }
        }
      }, 200);
      setIsFirstOptionClick(false);
    }
    
    try {
      // 添加节点到思维导图
      if (mindMapState.currentNodeId) {
        const nodeId = addNode(
          opt.content,
          opt.type === 'deepen' ? 'deepen' : 'next',
          mindMapState.currentNodeId,
          {
            summary: opt.describe,
            keywords: [],
            explored: false
          }
        );
        // 立即导航到新节点
        if (nodeId) {
          navigateToNode(nodeId);
        }
      }

      // 注意：思维导图更新现在在主 LLM 生成完成后自动执行，这里不再重复调用
      console.log('💭 思维导图更新已在主流程中完成，跳过重复调用');

      // 更新选项点击计数
      setOptions(prev => prev.map(o => 
        o.id === opt.id ? { ...o, clickCount: (o.clickCount || 0) + 1 } : o
      ));
      
      // 记录用户事件（简化）
      if (userSession) {
        logUserEvent('option-clicked', {
          sessionId: userSession.sessionId,
          conversationId,
          optionType: opt.type,
          optionContent: opt.content,
          clickCount: (opt.clickCount || 0) + 1
        }, userSession.userId);
      }

      // 并发发送消息，使用独立的流
      await sendMessageInternal(opt.content, true);
      
      // 短暂延迟后移除选项
      setTimeout(() => {
        setExitingIds(prev => {
          const next = new Set(prev);
          next.add(opt.id);
          return next;
        });
      }, 1000);
      
    } catch (error) {
      console.error('Failed to handle option click:', error);
      alert('处理请求时出现错误，请稍后重试');
    } finally {
      // 清理处理状态
      setProcessingOptions(prev => {
        const next = new Set(prev);
        next.delete(opt.id);
        return next;
      });
    }
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
            px: { xs: 2, sm: 4 }
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
            <TextField 
              variant="outlined" 
              placeholder="输入一本你一直想读的书、或一个你想研究的话题" 
              value={inputMessage} 
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputMessage(e.target.value)} 
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { 
                if(e.key==='Enter'&&!e.shiftKey){ 
                  e.preventDefault(); 
                  handleSend(); 
                } 
              }} 
              size="small" 
              multiline 
              maxRows={4} 
              sx={{ mr: 1, flex: 1 }} 
              disabled={isLoading}
            />
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
                      {current.map((opt: OptionItem) => {
                        return (
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
                            <SimpleOptionCard
                              option={opt}
                              onClick={() => handleOptionClick(opt)}
                              disabled={processingOptions.has(opt.id)}
                              isProcessing={processingOptions.has(opt.id)}
                            />
                          </Collapse>
                        );
                      })}
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
                          {historical.map((opt: OptionItem) => {
                            return (
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
                                <Box sx={{ mb: 1 }}>
                                  <SimpleOptionCard
                                    option={opt}
                                    onClick={() => handleOptionClick(opt)}
                                    disabled={processingOptions.has(opt.id)}
                                    isProcessing={processingOptions.has(opt.id)}
                                  />
                                </Box>
                              </Collapse>
                            );
                          })}
                          
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

            {/* 概念图谱嵌入式面板 - 紧贴在选项区域下方 */}
            <Box sx={{ 
              mt: 3,
              borderTop: 1, 
              borderColor: 'divider',
              pt: 2,
              opacity: conceptMap.conceptMap ? 1 : 0.7,
              transition: 'opacity 0.3s ease-in-out',
              '&:hover': {
                '& .concept-header': {
                  bgcolor: 'rgba(0, 0, 0, 0.025)'
                }
              }
            }}>
              <ConceptMapPanel
                conceptMap={conceptMap.conceptMap}
                isLoading={conceptMap.isLoading}
                onConceptAbsorptionToggle={conceptMap.updateConceptAbsorption}
                onClearConcepts={conceptMap.clearConcepts}
              />
              
              {/* 递归概念树渲染组件 */}
              <Box sx={{
                mt: 2,
                borderTop: 1,
                borderColor: 'divider',
                pt: 2,
                opacity: conceptTree ? 1 : 0.7,
                transition: 'opacity 0.3s ease-in-out'
              }}>
                <ConceptTreeRenderer
                  conceptTree={conceptTree}
                  isLoading={conceptTreeLoading}
                  maxDepth={5}
                  onNodeClick={(node) => {
                    console.log('🎯 点击概念节点:', node);
                    // 这里可以添加节点点击的处理逻辑
                    // 例如：展开详情、添加到对话、设置焦点等
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

    </Box>
  );
};

export default NextStepChat; 