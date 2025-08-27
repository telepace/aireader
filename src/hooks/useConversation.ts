import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatConversation, ChatMessage, OptionItem } from '../types/types';
import { listConversations, upsertConversation, deleteConversation } from '../utils/storage';

export interface UseConversationOptions {
  selectedModel: string;
}

export interface UseConversationResult {
  conversationId: string;
  setConversationId: (id: string) => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  options: OptionItem[];
  setOptions: React.Dispatch<React.SetStateAction<OptionItem[]>>;
  convMenuOpen: boolean;
  setConvMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  conversations: ChatConversation[];
  createNewConversation: () => void;
  chooseConversation: (c: ChatConversation) => void;
  removeConversation: (id: string) => void;
  normalizeStoredOptions: (stored: any[] | undefined | null) => OptionItem[];
}

export function useConversation({ selectedModel }: UseConversationOptions): UseConversationResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [convMenuOpen, setConvMenuOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() => {
    const existing = listConversations()[0];
    return existing ? existing.id : uuidv4();
  });
  const [hydrated, setHydrated] = useState(false);
  const allowEmptyPersist = useRef(false);

  const conversations = useMemo(() => listConversations(), [conversationId, messages, options, selectedModel]);

  // 初次挂载时，根据当前 conversationId 进行状态水合，避免把空状态覆盖已有会话
  useEffect(() => {
    if (hydrated) return;
    const current = listConversations().find(c => c.id === conversationId);
    if (current) {
      setMessages(current.messages || []);
      setOptions((() => {
        const now = Date.now();
        const stored = (current.options as any[]) || [];
        return stored.map((o: any) => {
          const type: 'deepen' | 'next' = o?.type === 'next' ? 'next' : 'deepen';
          const content = typeof o?.content === 'string' ? o.content : '';
          const idBase = typeof o?.id === 'string' && o.id.includes(':') ? o.id.split(':').slice(1).join(':') : (o?.id || content.trim().toLowerCase());
          const id = `${type}:${idBase}`;
          return {
            id,
            type,
            content,
            describe: typeof o?.describe === 'string' ? o.describe : '',
            firstSeenAt: typeof o?.firstSeenAt === 'number' ? o.firstSeenAt : now,
            lastSeenAt: typeof o?.lastSeenAt === 'number' ? o.lastSeenAt : now,
            lastMessageId: typeof o?.lastMessageId === 'string' ? o.lastMessageId : '',
            clickCount: typeof o?.clickCount === 'number' ? o.clickCount : 0,
          } as OptionItem;
        });
      })());
    }
    setHydrated(true);
  }, [conversationId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const existing = listConversations().find(c => c.id === conversationId);
    const isEmptyState = (messages?.length ?? 0) === 0 && (options?.length ?? 0) === 0;
    const existingHasContent = !!existing && ((existing.messages?.length ?? 0) > 0 || (existing.options?.length ?? 0) > 0);
    if (isEmptyState && existingHasContent && !allowEmptyPersist.current) {
      // 避免将已有内容的会话被空状态覆盖
      return;
    }
    const conv: ChatConversation = {
      id: conversationId,
      messages,
      timestamp: existing?.timestamp ?? Date.now(),
      updatedAt: Date.now(),
      modelName: selectedModel,
      options,
      title: messages.find((m: ChatMessage) => m.role === 'user')?.content?.slice(0, 20) || existing?.title || '新会话'
    };
    upsertConversation(conv);
    allowEmptyPersist.current = false; // 重置
  }, [messages, options, conversationId, selectedModel, hydrated]);

  const normalizeStoredOptions = useCallback((stored: any[] | undefined | null): OptionItem[] => {
    const now = Date.now();
    return (stored || []).map((o: any) => {
      const type: 'deepen' | 'next' = o?.type === 'next' ? 'next' : 'deepen';
      const content = typeof o?.content === 'string' ? o.content : '';
      const idBase = typeof o?.id === 'string' && o.id.includes(':') ? o.id.split(':').slice(1).join(':') : (o?.id || content.trim().toLowerCase());
      const id = `${type}:${idBase}`;
      return {
        id,
        type,
        content,
        describe: typeof o?.describe === 'string' ? o.describe : '',
        firstSeenAt: typeof o?.firstSeenAt === 'number' ? o.firstSeenAt : now,
        lastSeenAt: typeof o?.lastSeenAt === 'number' ? o.lastSeenAt : now,
        lastMessageId: typeof o?.lastMessageId === 'string' ? o.lastMessageId : '',
        clickCount: typeof o?.clickCount === 'number' ? o.clickCount : 0,
      } as OptionItem;
    });
  }, []);

  const createNewConversation = useCallback(() => {
    setConversationId(uuidv4());
    setMessages([]);
    setOptions([]);
    setConvMenuOpen(false);
    setHydrated(true);
    allowEmptyPersist.current = true; // 允许保存空会话作为新建
  }, []);

  const chooseConversation = useCallback((c: ChatConversation) => {
    setConversationId(c.id);
    setMessages(c.messages || []);
    setOptions(normalizeStoredOptions(c.options as any));
    setHydrated(true);
    allowEmptyPersist.current = false;
  }, [normalizeStoredOptions]);

  const removeConversation = useCallback((id: string) => {
    deleteConversation(id);
    if (id === conversationId) {
      const left = listConversations()[0];
      if (left) {
        setConversationId(left.id);
        setMessages(left.messages || []);
        setOptions(normalizeStoredOptions(left.options as any));
      } else {
        setConversationId(uuidv4());
        setMessages([]);
        setOptions([]);
      }
    } else {
      // 删除非当前会话，不影响水合
    }
  }, [conversationId, normalizeStoredOptions]);

  return {
    conversationId,
    setConversationId,
    messages,
    setMessages,
    options,
    setOptions,
    convMenuOpen,
    setConvMenuOpen,
    conversations,
    createNewConversation,
    chooseConversation,
    removeConversation,
    normalizeStoredOptions
  };
}


