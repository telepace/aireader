import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Typography, Paper, CircularProgress } from '@mui/material';
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

// 检测是否为JSONL格式的函数
const isJsonlFormat = (content: string): boolean => {
  if (!content || content.trim().length === 0) {
    return false;
  }
  
  const lines = content.split('\n').filter(line => line.trim().length > 0);
  
  // 如果只有一行，可能不是JSONL
  if (lines.length < 2) {
    return false;
  }
  
  // 检查前几行是否都是有效的JSON对象
  let validJsonCount = 0;
  const linesToCheck = Math.min(lines.length, 5); // 检查前5行
  
  for (let i = 0; i < linesToCheck; i++) {
    try {
      const parsed = JSON.parse(lines[i].trim());
      // 检查是否包含type/t和content/c字段
      if (typeof parsed === 'object' && parsed !== null) {
        const hasType = 'type' in parsed || 't' in parsed;
        const hasContent = 'content' in parsed || 'c' in parsed;
        if (hasType && hasContent) {
          validJsonCount++;
        }
      }
    } catch {
      // 如果解析失败，跳过这行
      continue;
    }
  }
  
  // 如果超过一半的行都是有效的结构化JSON，认为是JSONL格式
  return validJsonCount >= Math.ceil(linesToCheck / 2);
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
    <Paper 
      elevation={3} 
      sx={{ 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        flexGrow: 1,
        bgcolor: darkMode ? 'background.paper' : '#fff',
        color: darkMode ? 'text.primary' : 'inherit'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexShrink: 0 }}>
        <Typography variant="h6">处理结果</Typography>
        <Box>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={onGenerate}
            disabled={isLoading || !promptObject || !promptText}
            sx={{ mr: 1 }}
          >
            {isLoading ? '生成中...' : '生成'}
          </Button>
          <Button 
            variant="outlined" 
            color="secondary" 
            onClick={handleSave}
            disabled={isLoading || !promptResult}
          >
            保存
          </Button>
        </Box>
      </Box>
      
      <Box 
        ref={resultBoxRef}
        sx={{ 
          flexGrow: 1,
          overflow: 'auto', 
          bgcolor: darkMode ? 'background.default' : 'transparent', 
          p: 2, 
          borderRadius: 1,
          position: 'relative',
          whiteSpace: 'pre-wrap'
        }}
      >
        <Box sx={{ color: darkMode ? 'text.primary' : 'inherit' }}>
          {isJsonlFormat(promptResult) ? (
            // 使用JSONL渲染器
            <JsonlRenderer 
              content={promptResult}
              enableHoverEffects={true}
              darkMode={darkMode}
            />
          ) : (
            // 使用原来的Markdown渲染器
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
          )}
        </Box>
        
        {/* Show loading indicator as a small overlay at bottom right when streaming */}
        {isLoading && (
          <Box sx={{
            position: 'sticky',
            bottom: 8,
            right: 8,
            display: 'flex',
            justifyContent: 'flex-end',
            padding: 1,
            backgroundColor: darkMode ? 'rgba(50, 50, 50, 0.7)' : 'rgba(255, 255, 255, 0.7)',
            borderRadius: 1,
            boxShadow: 1,
            width: 'fit-content',
            marginLeft: 'auto',
          }}>
            <CircularProgress size={20} sx={{ mr: 1 }} />
            <Typography variant="caption" sx={{ lineHeight: '20px' }}>
              生成中...
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default OutputPanel; 