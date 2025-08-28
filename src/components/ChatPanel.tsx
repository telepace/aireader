import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Typography, 
  Paper, 
  CircularProgress,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, PromptTest } from '../types/types';
import { generateChat } from '../services/api';
import { useChatFormValidation } from '../hooks/useFormValidation';
import { validateMarkdownContent } from '../utils/validation';

// 自定义组件，确保正确处理自定义格式
const CustomParagraph = (props: any) => {
  return <p className="md-paragraph" style={{ marginBottom: '4px', whiteSpace: 'normal' }} {...props} />;
};

const CustomHeading = ({ level, children, ...props }: any) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={`md-heading md-heading-${level}`} style={{ marginTop: '1rem', marginBottom: '8px' }} {...props}>{children}</Tag>;
};

const CustomList = (props: any) => {
  return <ul className="md-list" style={{ marginBottom: '8px', paddingLeft: '2em' }} {...props} />;
};

const CustomListItem = (props: any) => {
  return <li className="md-list-item" style={{ marginBottom: '0' }} {...props} />;
};

// 新增：自定义加粗文本组件
const CustomStrong = (props: any) => {
  return <strong style={{ 
    fontWeight: 'bold', 
    color: '#6366f1',
    backgroundColor: 'rgba(237, 233, 254, 0.2)', 
    padding: '0.1em 0.2em',
    borderRadius: '3px'
  }} {...props} />;
};

// 添加自定义的代码块组件
const CustomCode = (props: any) => {
  return <code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '0.2em 0.4em', borderRadius: '3px', backgroundColor: 'rgba(27, 31, 35, 0.05)' }} {...props} />;
};

const CustomPre = (props: any) => {
  return <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '16px', borderRadius: '6px', backgroundColor: '#f6f8fa', marginBottom: '8px' }} {...props} />;
};

// 自定义换行处理
const CustomBreak = () => {
  return null; // 完全忽略BR标签
};

interface ChatPanelProps {
  promptTest: PromptTest | null;
  selectedModel: string;
}

/**
 * ChatPanel component for managing and displaying a chat interface.
 *
 * This component handles user input, sends messages to a chat model, and displays responses. It maintains the state of messages, loading status, and input message. The component also provides functionality to evaluate prompts, generate new prompts, and clear the chat history. It utilizes the generateChat function to interact with the chat model and updates the UI accordingly.
 *
 * @param {Object} props - The properties for the ChatPanel component.
 * @param {Object} props.promptTest - The prompt test object containing prompt details for evaluation.
 * @param {string} props.selectedModel - The model selected for generating chat responses.
 * @returns {JSX.Element} The rendered ChatPanel component.
 */
const ChatPanel: React.FC<ChatPanelProps> = ({ promptTest, selectedModel }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    getFieldProps,
    validateForm,
    hasErrors,
    fields,
  } = useChatFormValidation();

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const inputMessage = fields.message?.value || '';
    if (!inputMessage.trim() || !validateForm() || hasErrors) return;

    // Use sanitized value for the message
    const sanitizedMessage = fields.message?.sanitizedValue || inputMessage;
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: sanitizedMessage,
      timestamp: Date.now(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    
    // Reset the input field
    getFieldProps('message').onChange({ target: { value: '' } } as any);
    setIsLoading(true);

    try {
      const response = await generateChat(currentMessages, selectedModel);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert(`发送消息时出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleEvaluatePrompt = async () => {
    if (!promptTest) return;
    
    setIsLoading(true);
    
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      role: 'system',
      content: '我修改llm prompt，做prompt engineering，帮我分析评估llm prompt的写法。我将传递给你当前的prompt内容、prompt处理对象、prompt处理结果，帮我分析评估和对其打分。',
      timestamp: Date.now(),
    };
    
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: `
使用模型: ${selectedModel}

prompt内容：
${promptTest.promptText}

处理对象：
${promptTest.promptObject}

处理结果：
${promptTest.promptResult}
      `,
      timestamp: Date.now(),
    };
    
    const initialMessages = [systemMessage, userMessage];
    setMessages(initialMessages);
    
    try {
      const response = await generateChat(initialMessages, selectedModel);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error evaluating prompt:', error);
      alert(`评估prompt时出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateNewPrompt = async () => {
    if (messages.length < 2) return;
    
    setIsLoading(true);
    
    const systemMessage: ChatMessage = {
      id: uuidv4(),
      role: 'system',
      content: '修改llm prompt，做prompt engineering。先前已经分析评估了prompt的质量，帮我基于评估的分析，生成新的一版prompt',
      timestamp: Date.now(),
    };
    
    const historyForGeneration = [
      ...messages, 
      systemMessage,
    ];

    const userMessageContent = historyForGeneration.map(msg => `${msg.role}: ${msg.content}`).join('\n\n') + "\n\n请根据以上对话和评估，生成新的prompt内容。";
    const userMessage: ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: userMessageContent,
        timestamp: Date.now(),
    };

    const messagesForApi = [...messages, systemMessage, userMessage];
    setMessages(messagesForApi);
    
    try {
      const response = await generateChat(messagesForApi, selectedModel);
      
      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating new prompt:', error);
      alert(`生成新prompt时出错: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Box sx={{ 
      p: 0, 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      bgcolor: '#fff',
      color: 'inherit'
    }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 1, 
        borderBottom: 1, 
        borderColor: 'divider', 
        flexShrink: 0 
      }}>
        <Typography variant="h6">AI 聊天</Typography>
        <Box>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleEvaluatePrompt}
            disabled={isLoading || !promptTest}
            sx={{ mr: 1 }}
          >
            评估Prompt
          </Button>
          <Button 
            variant="contained" 
            size="small"
            onClick={handleGenerateNewPrompt}
            disabled={isLoading || messages.length < 2}
            sx={{ mr: 1 }}
          >
            生成新Prompt
          </Button>
          <IconButton 
            onClick={handleClearChat}
            size="small"
            disabled={isLoading || messages.length === 0}
            title="清空聊天记录"
          >
            <DeleteIcon />
          </IconButton>
        </Box>
      </Box>
      
      <Box 
        sx={{ 
          flexGrow: 1,
          overflowY: 'auto', 
          bgcolor: '#f5f5f5', 
          p: 2, 
        }}
      >
        {messages.map((message) => (
          message.role !== 'system' && (
            <Box 
              key={message.id}
              sx={{ 
                mb: 2, 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                p: '0rem'
              }}
            >
              <Paper 
                elevation={1}
                sx={{ 
                  p: 3,
                  maxWidth: '100%',
                  bgcolor: message.role === 'user' ? '#eeeeee' : '#fff',
                  borderRadius: 2,
                  color: 'inherit'
                }}
              >
                <div className="markdown-body" style={{ 
                  whiteSpace: 'normal',
                  color: 'inherit'
                }}>
                  <ReactMarkdown 
                    rehypePlugins={[rehypeRaw]} 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      p: CustomParagraph,
                      h1: (props) => <CustomHeading level={1} {...props} />,
                      h2: (props) => <CustomHeading level={2} {...props} />,
                      h3: (props) => <CustomHeading level={3} {...props} />,
                      h4: (props) => <CustomHeading level={4} {...props} />,
                      h5: (props) => <CustomHeading level={5} {...props} />,
                      h6: (props) => <CustomHeading level={6} {...props} />,
                      ul: CustomList,
                      li: CustomListItem,
                      strong: CustomStrong,
                      code: CustomCode,
                      pre: CustomPre,
                      br: CustomBreak
                    }}
                  >
                    {validateMarkdownContent(message.content).sanitizedValue}
                  </ReactMarkdown>
                </div>
              </Paper>
            </Box>
          )
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </Box>
      
      <Box sx={{ display: 'flex', p: 1, borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="输入消息..."
          {...getFieldProps('message')}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
          disabled={isLoading}
          size="small"
          sx={{ mr: 1 }}
          multiline
          maxRows={4}
        />
        <Button 
          variant="contained"
          onClick={handleSendMessage}
          disabled={isLoading || !fields.message?.value?.trim() || hasErrors}
        >
          发送
        </Button>
      </Box>
    </Box>
  );
};

export default ChatPanel; 