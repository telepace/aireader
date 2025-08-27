import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { v4 as uuidv4 } from 'uuid';
import { PromptTest } from '../types/types';
import { savePromptTest } from '../utils/storage';
import { JsonlRenderer } from './JsonlRenderer';

// 自定义组件，确保正确处理自定义格式
const CustomParagraph = (props: any) => {
  return <p className="md-paragraph" style={{ marginBottom: '4px', whiteSpace: 'normal' }} {...props} />;
};

const CustomHeading = ({ level, children, ...props }: any) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag className={`md-heading md-heading-${level}`} style={{ marginTop: '2rem', marginBottom: '8px' }} {...props}>{children}</Tag>;
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


// 改进的JSONL内容检测函数
/**
 * Detects if the provided content is in JSONL format.
 *
 * The function analyzes each line of the input content, attempting to parse it as JSON. It keeps track of valid JSONL lines and counts consecutive valid lines. If there are at least two consecutive JSONL lines or a sufficient total number of JSONL lines, it determines the content as JSONL. It also handles mixed content by separating valid JSONL from plain text.
 *
 * @param content - The string content to be analyzed for JSONL format.
 * @returns An object indicating whether the content is JSONL, and optionally providing the JSONL content or mixed content.
 */
const detectJsonlContent = (content: string): { isJsonl: boolean; jsonlContent?: string; mixedContent?: { text: string; jsonl: string } } => {
  if (!content?.trim()) {
    return { isJsonl: false };
  }
  
  const lines = content.split('\n');
  const jsonlLines: string[] = [];
  const textLines: string[] = [];
  let consecutiveJsonlCount = 0;
  let maxConsecutiveJsonl = 0;
  
  // 分析每一行
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) {
      // 保留空行到文本内容中
      if (jsonlLines.length === 0) {
        textLines.push(line);
      }
      return;
    }
    
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const hasStructure = ('type' in parsed || 't' in parsed) && 
                            ('content' in parsed || 'c' in parsed);
        if (hasStructure) {
          jsonlLines.push(trimmed);
          consecutiveJsonlCount++;
          maxConsecutiveJsonl = Math.max(maxConsecutiveJsonl, consecutiveJsonlCount);
          return;
        }
      }
    } catch {
      // JSON解析失败，作为普通文本处理
    }
    
    // 不是有效JSONL行，重置连续计数
    textLines.push(line);
    consecutiveJsonlCount = 0;
  });
  
  // 判断逻辑：有连续的JSONL行（>=2行）或总JSONL行数足够多
  const hasSignificantJsonl = maxConsecutiveJsonl >= 2 || jsonlLines.length >= 3;
  
  if (!hasSignificantJsonl) {
    return { isJsonl: false };
  }
  
  // 如果全部都是JSONL（除了可能的空行）
  const nonEmptyTextLines = textLines.filter(line => line.trim());
  if (nonEmptyTextLines.length === 0) {
    return { isJsonl: true, jsonlContent: jsonlLines.join('\n') };
  }
  
  // 混合内容
  return {
    isJsonl: true,
    mixedContent: {
      text: textLines.join('\n').trim(),
      jsonl: jsonlLines.join('\n')
    }
  };
};

// 向后兼容的函数 (保留以防其他地方使用)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * Checks if the given content is in JSONL format.
 */
const isJsonlFormat = (content: string): boolean => {
  return detectJsonlContent(content).isJsonl;
};

interface OutputPanelProps {
  promptObject: string;
  promptText: string;
  promptResult: string;
  isLoading: boolean;
  onGenerate: () => void;
  selectedModel: string;
  onSave?: (test: PromptTest) => void;
  darkMode?: boolean;
}

/**
 * Renders the output panel for displaying AI processing results.
 *
 * This component manages the display of the prompt result, handles auto-scrolling when the result updates, and provides functionality to save the prompt test. It utilizes effects to track loading states and previous result lengths, and conditionally renders content based on the type of prompt result (Markdown or JSONL). The component also includes buttons for generating new results and saving the current result.
 *
 * @param props - The properties for the OutputPanel component.
 * @param props.promptObject - The object representing the prompt.
 * @param props.promptText - The text of the prompt.
 * @param props.promptResult - The result generated from the prompt.
 * @param props.isLoading - A boolean indicating if the result is currently loading.
 * @param props.onGenerate - A callback function to generate a new result.
 * @param props.selectedModel - The model selected for generating results.
 * @param props.onSave - A callback function to save the prompt test.
 * @param [props.darkMode=false] - A boolean indicating if dark mode is enabled.
 * @returns A React element representing the output panel.
 */
const OutputPanel: React.FC<OutputPanelProps> = (props) => {
  const {
    promptObject,
    promptText,
    promptResult,
    isLoading,
    onGenerate,
    selectedModel,
    onSave,
    darkMode = false
  } = props;
  
  // Add ref for auto-scrolling to bottom
  const resultBoxRef = useRef<HTMLDivElement>(null);
  
  // Track the result length to know when it's updating
  const [prevResultLength, setPrevResultLength] = useState(0);
  
  // Add effect to auto-scroll when promptResult changes
  useEffect(() => {
    // Only scroll if the result has changed and is growing
    if (resultBoxRef.current && promptResult && promptResult.length > prevResultLength) {
      resultBoxRef.current.scrollTop = resultBoxRef.current.scrollHeight;
      setPrevResultLength(promptResult.length);
      console.log("Auto-scrolled, result length:", promptResult.length);
    }
  }, [promptResult, prevResultLength]);
  
  // Reset the previous length when loading starts
  useEffect(() => {
    if (isLoading) {
      setPrevResultLength(0);
    }
  }, [isLoading]);
  
  const handleSave = () => {
    const promptTest: PromptTest = {
      id: uuidv4(),
      promptObject,
      promptText,
      promptResult,
      timestamp: Date.now(),
      modelName: selectedModel,
    };
    savePromptTest(promptTest);
    
    // 如果提供了onSave回调，则调用它
    if (onSave) {
      onSave(promptTest);
    }
    
    alert('已保存测试结果！');
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        bgcolor: 'transparent'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 4,
        flexShrink: 0
      }}>
        <Typography 
          variant="h3" 
          sx={{ 
            fontWeight: 600, 
            color: 'text.primary', 
            fontSize: { xs: '1.125rem', md: '1.25rem' },
            letterSpacing: '-0.015em'
          }}
        >
          📊 分析结果
        </Typography>
        {promptResult && (
          <Button 
            variant="outlined" 
            onClick={handleSave}
            disabled={isLoading}
            size="small"
            sx={{ 
              fontWeight: 400,
              textTransform: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
              color: 'text.secondary',
              '&:hover': {
                borderColor: darkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                color: 'text.primary',
                bgcolor: 'transparent'
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            保存
          </Button>
        )}
      </Box>
      
      <Box 
        ref={resultBoxRef}
        sx={{ 
          flexGrow: 1,
          overflow: 'auto', 
          bgcolor: darkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          position: 'relative',
          whiteSpace: 'pre-wrap',
          height: '100%',
          px: { xs: 3, md: 4 },
          py: { xs: 3, md: 4 },
          borderRadius: '12px',
          border: darkMode 
            ? '1px solid rgba(255, 255, 255, 0.08)' 
            : '1px solid rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease',
          '&:empty::before': {
            content: '"等待分析内容..."',
            color: 'text.secondary',
            opacity: 0.6,
            fontSize: '0.95rem',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%'
          }
        }}
      >
        <Box sx={{ color: darkMode ? 'text.primary' : 'inherit' }}>
          {(() => {
            const { isJsonl, jsonlContent, mixedContent } = detectJsonlContent(promptResult);
            
            if (!isJsonl) {
              // 使用原来的Markdown渲染器
              return (
                <Box sx={{ fontFamily: 'monospace' }}>
                  <div className="markdown-body" style={{ color: darkMode ? 'text.primary' : 'inherit' }}>
                    <ReactMarkdown 
                      key={`md-${promptResult.length}`}
                      rehypePlugins={[rehypeRaw]}
                      remarkPlugins={[remarkGfm, remarkBreaks]}
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
                        strong: CustomStrong
                      }}
                    >
                      {promptResult || '暂无内容'}
                    </ReactMarkdown>
                  </div>
                </Box>
              );
            } else if (mixedContent) {
              // 混合内容渲染：文本 + JSONL
              return (
                <>
                  {mixedContent.text && (
                    <Box sx={{ mb: 3, fontFamily: 'monospace' }}>
                      <div className="markdown-body" style={{ color: darkMode ? 'text.primary' : 'inherit' }}>
                        <ReactMarkdown 
                          rehypePlugins={[rehypeRaw]}
                          remarkPlugins={[remarkGfm, remarkBreaks]}
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
                            strong: CustomStrong
                          }}
                        >
                          {mixedContent.text}
                        </ReactMarkdown>
                      </div>
                    </Box>
                  )}
                  <JsonlRenderer 
                    content={mixedContent.jsonl}
                    enableHoverEffects={true}
                    darkMode={darkMode}
                  />
                </>
              );
            } else {
              // 纯JSONL内容
              return (
                <JsonlRenderer 
                  content={jsonlContent}
                  enableHoverEffects={true}
                  darkMode={darkMode}
                />
              );
            }
          })()}
        </Box>
        
        {/* Show loading indicator as a centered minimal indicator */}
        {isLoading && !promptResult && (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            py: 8
          }}>
            <CircularProgress 
              size={20} 
              sx={{ 
                color: darkMode ? '#ffffff' : '#000000',
                opacity: 0.6
              }} 
            />
          </Box>
        )}
        
        {/* Show streaming indicator */}
        {isLoading && promptResult && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pt: 2
          }}>
            <Box sx={{ 
              width: 4, 
              height: 4, 
              borderRadius: '50%', 
              bgcolor: darkMode ? '#ffffff' : '#000000',
              opacity: 0.4,
              animation: 'pulse 1.5s ease-in-out infinite' 
            }} />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default OutputPanel; 