import React, { useState } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Copy } from 'lucide-react';

interface JsonlRendererProps {
  /** raw JSONL string, each line is a JSON object */
  content: string | null | undefined;
  /** additional class names for the outer container */
  className?: string;
  /** whether to enable hover effects for each block */
  enableHoverEffects?: boolean;
  /** dark mode support */
  darkMode?: boolean;
}

/**
 * Renders JSON-Lines with optional Notion-style hover effects.
 *
 * The function processes the provided content, splitting it into lines and parsing each line as a JSON object.
 * It handles hover effects for each block, allowing users to copy block content to the clipboard with a toast notification for feedback.
 * The rendering adapts based on the block type, supporting various formats such as headings, quotes, lists, insights, and actions.
 *
 * @param content - The JSON-Lines content to be rendered.
 * @param className - Optional additional class names for styling.
 * @param enableHoverEffects - Flag to enable or disable hover effects (default is true).
 * @param darkMode - Flag to enable dark mode styling (default is false).
 * @returns A JSX element representing the rendered JSON-Lines.
 */
export function JsonlRenderer({ 
  content, 
  className, 
  enableHoverEffects = true,
  darkMode = false
}: JsonlRendererProps) {
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');

  // 简单的toast通知
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 2000);
  };

  if (!content) {
    return (
      <Box
        data-testid="jsonl-renderer"
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      />
    );
  }

  // Split into lines & parse
  const blocks = (content || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        // If parsing fails, wrap line as a paragraph block so we still show it
        return { type: "p", content: line } as Record<string, unknown>;
      }
    });

  const handleCopyBlock = async (blockContent: string, blockType: string) => {
    try {
      await navigator.clipboard.writeText(blockContent);
      showToast(`已复制${getBlockTypeLabel(blockType)}内容`);
    } catch (error) {
      showToast("复制失败");
    }
  };

  const getBlockTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      h1: "标题",
      h2: "副标题", 
      h3: "小标题",
      p: "段落",
      quote: "引用",
      list: "列表",
      insight: "洞察",
      concept: "概念",
      qa: "问答",
      action: "行动"
    };
    return labels[type] || "内容";
  };

  const BlockWrapper: React.FC<{
    children: React.ReactNode;
    blockIndex: number;
    blockType: string;
    blockContent: string;
  }> = ({ children, blockIndex, blockType, blockContent }) => {
    if (!enableHoverEffects) {
      return <>{children}</>;
    }

    const isHovered = hoveredBlock === blockIndex;

    return (
      <Box
        sx={{
          position: 'relative',
          p: 1.5,
          m: -1.5,
          userSelect: 'text'
        }}
        onMouseEnter={() => setHoveredBlock(blockIndex)}
        onMouseLeave={() => setHoveredBlock(null)}
      >
        {/* 主要内容 */}
        <Box sx={{ position: 'relative', userSelect: 'text' }}>
          {children}
        </Box>

        {/* 悬停时显示的操作按钮 */}
        <Box 
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleCopyBlock(blockContent, blockType);
            }}
            sx={{
              p: 0.75,
              bgcolor: darkMode ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(4px)',
              border: '1px solid',
              borderColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              boxShadow: 1,
              color: darkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
              '&:hover': {
                color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)',
                bgcolor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              }
            }}
            title={`复制${getBlockTypeLabel(blockType)}`}
          >
            <Copy size={12} />
          </IconButton>
        </Box>
      </Box>
    );
  };

  const renderBlock = (block: Record<string, unknown>, idx: number) => {
    const type = (block["type"] || block["t"]) as string | undefined;
    const c = block["content"] ?? block["c"];
    const blockContent = typeof c === "string" ? c : JSON.stringify(c);

    const blockElement = (() => {
      switch (type) {
        case "h1":
          return (
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 'bold', 
                mb: 2, 
                mt: 1,
                userSelect: 'text',
                fontSize: { xs: '1.5rem', md: '2rem' }
              }}
            >
              {c as React.ReactNode}
            </Typography>
          );
        case "h2":
          return (
            <Typography 
              variant="h4" 
              component="h2" 
              sx={{ 
                fontWeight: 'semibold', 
                mb: 1.5, 
                mt: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                pb: 0.75,
                userSelect: 'text'
              }}
            >
              {c as React.ReactNode}
            </Typography>
          );
        case "h3":
          return (
            <Typography 
              variant="h5" 
              component="h3" 
              sx={{ 
                fontWeight: 'medium', 
                mb: 1, 
                mt: 1,
                userSelect: 'text'
              }}
            >
              {c as React.ReactNode}
            </Typography>
          );
        case "quote":
          {
            const ref = block["ref"] as string | undefined;
            return (
              <Box 
                component="blockquote" 
                sx={{ 
                  fontStyle: 'italic', 
                  borderLeft: '2px solid',
                  borderColor: 'divider',
                  pl: 2, 
                  my: 2,
                  userSelect: 'text'
                }}
              >
                <Typography sx={{ mb: ref ? 1 : 0, userSelect: 'text' }}>
                  {c as React.ReactNode}
                </Typography>
                {ref && (
                  <Typography 
                    component="cite" 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary',
                      fontStyle: 'normal',
                      userSelect: 'text'
                    }}
                  >
                    — {ref}
                  </Typography>
                )}
              </Box>
            );
          }
        case "list": {
          // Content can be array or string (comma separated)
          const items: string[] = Array.isArray(c)
            ? (c as string[])
            : typeof c === "string"
              ? (c as string).split(/[\n,；;]/).map((s) => s.trim()).filter(Boolean)
              : [];
          return (
            <Box 
              component="ul" 
              sx={{ 
                listStyle: 'disc', 
                ml: 2, 
                my: 2,
                userSelect: 'text',
                '& li': {
                  mb: 0.5
                }
              }}
            >
              {items.map((item, i) => (
                <Typography component="li" key={i} sx={{ userSelect: 'text' }}>
                  {item}
                </Typography>
              ))}
            </Box>
          );
        }
        case "insight": {
          const priority = (block["priority"] as string) || "normal";
          const borderColor = priority === "high" ? "error.main" : "info.main";
          const bgColor = priority === "high" 
            ? (darkMode ? 'rgba(211, 47, 47, 0.1)' : 'rgba(255, 235, 238, 1)')
            : (darkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(227, 242, 253, 1)');
          
          return (
            <Box
              sx={{
                my: 2,
                borderRadius: 1,
                borderLeft: '4px solid',
                borderColor,
                bgcolor: bgColor,
                p: 1.5,
                userSelect: 'text'
              }}
            >
              <Typography sx={{ userSelect: 'text' }}>
                {c as React.ReactNode}
              </Typography>
            </Box>
          );
        }
        case "concept": {
          return (
            <Box
              sx={{
                my: 2,
                borderRadius: 1,
                borderLeft: '4px solid',
                borderColor: 'secondary.main',
                bgcolor: darkMode ? 'rgba(156, 39, 176, 0.1)' : 'rgba(248, 245, 255, 1)',
                p: 1.5,
                userSelect: 'text'
              }}
            >
              <Typography sx={{ userSelect: 'text' }}>
                <Typography component="strong" sx={{ mr: 1, fontWeight: 'bold' }}>
                </Typography>
                {c as React.ReactNode}
              </Typography>
            </Box>
          );
        }
        case "qa": {
          // Expect c to be {q: string, a: string}
          if (typeof c === "object" && c !== null) {
            const q = (c as any)["q"] || (c as any)["question"];
            const a = (c as any)["a"] || (c as any)["answer"];
            return (
              <Box sx={{ my: 2, userSelect: 'text' }}>
                <Typography sx={{ fontWeight: 'bold', mb: 0.5, userSelect: 'text' }}>
                  Q: {q}
                </Typography>
                <Typography sx={{ userSelect: 'text' }}>
                  A: {a}
                </Typography>
              </Box>
            );
          }
          return (
            <Typography sx={{ my: 1, userSelect: 'text' }}>
              {c as React.ReactNode}
            </Typography>
          );
        }
        case "action":
          return (
            <Box
              sx={{
                my: 2,
                borderRadius: 1,
                borderLeft: '4px solid',
                borderColor: 'success.main',
                bgcolor: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(232, 245, 233, 1)',
                p: 1.5,
                userSelect: 'text'
              }}
            >
              <Typography sx={{ userSelect: 'text' }}>
                <Typography component="strong" sx={{ mr: 1, fontWeight: 'bold' }}>
                  行动:
                </Typography>
                {c as React.ReactNode}
              </Typography>
            </Box>
          );
        default:
          // Default paragraph
          return (
            <Typography sx={{ lineHeight: 1.6, my: 1, userSelect: 'text' }}>
              {c as React.ReactNode}
            </Typography>
          );
      }
    })();

    return (
      <BlockWrapper
        key={idx}
        blockIndex={idx}
        blockType={type || "p"}
        blockContent={blockContent}
      >
        {blockElement}
      </BlockWrapper>
    );
  };

  return (
    <Box
      data-testid="jsonl-renderer"
      sx={{
        maxWidth: 'none',
        userSelect: 'text',
        position: 'relative',
        '& *': {
          userSelect: 'text'
        }
      }}
    >
      {blocks.map(renderBlock)}
      
      {/* Toast通知 */}
      {toastMessage && (
        <Box
          sx={{
            position: 'fixed',
            top: 16,
            right: 16,
            bgcolor: darkMode ? 'rgba(50, 50, 50, 0.9)' : 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 1,
            zIndex: 9999,
            boxShadow: 2,
            animation: 'fadeIn 0.3s ease-in'
          }}
        >
          <Typography variant="body2">
            {toastMessage}
          </Typography>
        </Box>
      )}
    </Box>
  );
} 