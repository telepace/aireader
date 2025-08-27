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
 * 尝试修复常见的 JSON 格式错误
 * 
 * @param jsonLine - 可能有格式错误的 JSON 字符串
 * @returns 修复后的 JSON 字符串，如果无法修复则返回原字符串
 */
function repairJsonLine(jsonLine: string): string {
  let repaired = jsonLine.trim();
  
  // 修复常见的格式错误
  const repairs = [
    // 修复 {"type("next" 为 {"type":"next"
    { pattern: /\{"([^"]+)\("\s*([^"]+)"/g, replacement: '{"$1":"$2"' },
    
    // 修复中文逗号为英文逗号
    { pattern: /，/g, replacement: ',' },
    
    // 修复 {"type":"next"，"content": 缺少逗号的情况  
    { pattern: /("type"\s*:\s*"[^"]+")(\s*)("content"\s*:)/g, replacement: '$1,$2$3' },
    
    // 修复缺少逗号的相邻字段
    { pattern: /(":\s*"[^"]*")(\s*)("[\w]+"\s*:)/g, replacement: '$1,$2$3' },
    
    // 修复单引号为双引号
    { pattern: /'([^']*)'(?=\s*[,}])/g, replacement: '"$1"' },
    
    // 确保字段名有双引号
    { pattern: /([{,]\s*)([a-zA-Z_]\w*)(\s*:)/g, replacement: '$1"$2"$3' },
    
    // 修复冒号前后的空格问题
    { pattern: /("\w+")(\s*)(:)(\s*)/g, replacement: '$1: ' },
    
    // 修复缺少引号的字符串值（简单情况）
    { pattern: /(:\s*)([^",{}[\]]+)(\s*[,}])/g, replacement: '$1"$2"$3' },
    
    // 修复相邻字段间缺少逗号的情况
    { pattern: /"}(\s*)"/g, replacement: '"},$1"' },
  ];
  
  for (const repair of repairs) {
    repaired = repaired.replace(repair.pattern, repair.replacement);
  }
  
  return repaired;
}

/**
 * Splits raw text content into main content, completion signals, and JSONL options
 * 
 * Enhanced Implementation:
 * - Scans all lines to identify valid JSONL options and completion signals  
 * - Removes JSONL lines from main content
 * - Handles mixed content, empty lines, and invalid JSON gracefully
 * - Supports elegant completion signaling for better UX
 * - Auto-repairs common JSON formatting errors from LLM output
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
    
    let obj: any;
    
    // First try parsing the original line
    try {
      obj = JSON.parse(line);
    } catch {
      // Try repairing and parsing again
      try {
        const repairedLine = repairJsonLine(line);
        obj = JSON.parse(repairedLine);
        console.log(`JSON repaired: "${line}" → "${repairedLine}"`);
      } catch {
        // Still can't parse, skip this line
        continue;
      }
    }
    
    if (obj && typeof obj === 'object') {
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