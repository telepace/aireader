// Extracted and refactored content splitting logic for better testability
export interface NextStepOption {
  type: 'deepen' | 'next';
  content: string;
  describe: string;
}

// 完成标志接口
export interface ContentCompleteSignal {
  type: 'content_complete';
  message?: string;
}

/**
 * Splits raw text content into main content, completion signals, and JSONL options
 * 
 * Enhanced Implementation:
 * - Scans all lines to identify valid JSONL options and completion signals
 * - Removes JSONL lines from main content
 * - Handles mixed content, empty lines, and invalid JSON gracefully
 * - Supports elegant completion signaling for better UX
 * 
 * @param raw - Raw text content potentially containing JSONL options and completion signals
 * @returns Object with separated main content, completion status, and parsed options
 */
export function splitContentAndOptions(raw: string): { 
  main: string; 
  options: NextStepOption[]; 
  isContentComplete?: boolean;
  completionMessage?: string;
} {
  if (!raw) return { main: '', options: [] };
  
  const lines = raw.split('\n');
  const collected: NextStepOption[] = [];
  const jsonLineIndices: number[] = [];
  let isContentComplete = false;
  let completionMessage = '';
  
  // Scan all lines to identify valid JSONL lines and completion signals
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines but continue scanning
    
    try {
      const obj = JSON.parse(line);
      if (
        obj && typeof obj === 'object'
      ) {
        // 检查完成标志
        if (obj.type === 'content_complete') {
          isContentComplete = true;
          completionMessage = typeof obj.message === 'string' ? obj.message : '';
          jsonLineIndices.push(i);
        }
        // 检查推荐选项
        else if (
          (obj.type === 'deepen' || obj.type === 'next') &&
          typeof obj.content === 'string' &&
          typeof obj.describe === 'string'
        ) {
          collected.push({
            type: obj.type,
            content: obj.content,
            describe: obj.describe
          });
          jsonLineIndices.push(i);
        }
      }
    } catch {
      // Not valid JSON, continue scanning other lines
    }
  }
  
  // Remove identified JSON lines, keep main content
  const mainLines = lines.filter((_, index) => !jsonLineIndices.includes(index));
  let main = mainLines.join('\n');
  
  // Only trim trailing whitespace to preserve internal formatting
  main = main.replace(/\s+$/, '');
  
  return { 
    main, 
    options: collected.slice(0, 6),
    isContentComplete,
    completionMessage
  };
}