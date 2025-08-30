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
 * Attempts to extract various JSON structures and convert them to individual options
 * Supports multiple formats:
 * 1. {"recommendations": [...]} - nested recommendations array
 * 2. [{"type": "...", "content": "..."}] - direct array format  
 * 3. {"type": "deepen", "options": [...]} - type with options array (new format)
 */
function extractNestedJSONOptions(text: string): NextStepOption[] {
  const collected: NextStepOption[] = [];
  
  try {
    // Look for JSON blocks in the text
    const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent);
        const extracted = extractOptionsFromParsedJSON(parsed);
        collected.push(...extracted);
      } catch (parseError) {
        console.warn('Failed to parse JSON block:', parseError);
      }
    }
    
    // If no JSON blocks found, try to extract JSON from text
    if (collected.length === 0) {
      // Look for JSON objects in the text (not wrapped in code blocks)
      // Try to find potential JSON objects more accurately
      const potentialJsonMatches = [
        // Match complete JSON objects that might span multiple lines
        text.match(/\{[\s\S]*"recommendations"[\s\S]*\}/),
        text.match(/\{[\s\S]*"type"[\s\S]*"options"[\s\S]*\}/),
        // Fallback: any complete JSON object
        text.match(/\{[\s\S]*\}/)
      ];
      
      for (const jsonMatch of potentialJsonMatches) {
        if (jsonMatch && jsonMatch[0]) {
          try {
            const jsonContent = jsonMatch[0].trim();
            const parsed = JSON.parse(jsonContent);
            const extracted = extractOptionsFromParsedJSON(parsed);
            if (extracted.length > 0) {
              collected.push(...extracted);
              console.log(`✅ Extracted ${extracted.length} options from JSON object`);
              break; // Found valid options, stop searching
            }
          } catch (parseError) {
            // This JSON object couldn't be parsed or didn't contain valid options
            console.debug('Failed to parse JSON object:', parseError);
          }
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting nested JSON options:', error);
  }
  
  return collected;
}

/**
 * Extract options from a parsed JSON object, handling multiple format variations
 */
function extractOptionsFromParsedJSON(parsed: any): NextStepOption[] {
  const collected: NextStepOption[] = [];
  
  // Format 1: {"recommendations": [...]}
  if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
    for (const item of parsed.recommendations) {
      const option = convertToNextStepOption(item);
      if (option) collected.push(option);
    }
  }
  // Format 2: Direct array [...]
  else if (Array.isArray(parsed)) {
    for (const item of parsed) {
      const option = convertToNextStepOption(item);
      if (option) collected.push(option);
    }
  }
  // Format 3: Single object with type and options array
  else if (parsed.type && parsed.options && Array.isArray(parsed.options)) {
    if (parsed.type === 'deepen' || parsed.type === 'next') {
      for (const item of parsed.options) {
        const option = convertToNextStepOption(item, parsed.type);
        if (option) collected.push(option);
      }
    }
  }
  // Format 4: Direct single object
  else if (parsed.type && (parsed.type === 'deepen' || parsed.type === 'next')) {
    const option = convertToNextStepOption(parsed);
    if (option) collected.push(option);
  }
  
  return collected;
}

/**
 * Convert various object formats to NextStepOption format
 * Handles field name mapping, type inheritance, and common spelling errors
 */
function convertToNextStepOption(item: any, inheritedType?: string): NextStepOption | null {
  if (!item || typeof item !== 'object') return null;
  
  // Determine type - use inherited type if item doesn't have one
  let type = item.type || inheritedType;
  
  // Handle common spelling errors
  if (type === 'deeping') type = 'deepen';  // Fix common typo
  if (type === 'deepening') type = 'deepen'; // Another variant
  if (type === 'nextstep') type = 'next';    // Handle combined words
  
  if (!type || (type !== 'deepen' && type !== 'next')) return null;
  
  // Map different field names to expected format
  const content = item.content || item.title || item.name || '';
  const describe = item.describe || item.description || item.desc || '';
  
  if (!content || !describe) return null;
  
  return {
    type: type as 'deepen' | 'next',
    content: String(content),
    describe: String(describe)
  };
}

/**
 * Splits raw text content into main content, completion signals, and JSONL options
 * 
 * Enhanced Implementation:
 * - Scans all lines to identify valid JSONL options and completion signals  
 * - Handles both JSONL format and nested JSON structures
 * - Removes JSONL lines from main content
 * - Handles mixed content, empty lines, and invalid JSON gracefully
 * - Supports elegant completion signaling for better UX
 * - Auto-repairs common JSON formatting errors from LLM output
 * - Supports multiple field name mappings (title→content, description→describe)
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
  
  // First try to extract options from nested JSON structures
  const nestedOptions = extractNestedJSONOptions(raw);
  if (nestedOptions.length > 0) {
    collected.push(...nestedOptions);
    console.log(`Extracted ${nestedOptions.length} options from nested JSON structure`);
  }
  
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
      // 检查推荐选项 - support multiple formats and common spelling errors
      else if (obj.type === 'deepen' || obj.type === 'next' || obj.type === 'deeping' || obj.type === 'deepening' || obj.type === 'nextstep') {
        jsonLineIndices.push(i);
        
        // Fix common spelling errors
        let fixedType = obj.type;
        if (fixedType === 'deeping' || fixedType === 'deepening') fixedType = 'deepen';
        if (fixedType === 'nextstep') fixedType = 'next';
        
        // Format 1: Standard JSONL format with direct content/describe fields
        const directContent = obj.content || obj.title || obj.name || '';
        const directDescribe = obj.describe || obj.description || obj.desc || '';
        
        if (typeof directContent === 'string' && typeof directDescribe === 'string' && directContent && directDescribe) {
          const exists = collected.some(existing => 
            existing.type === fixedType && 
            existing.content === directContent && 
            existing.describe === directDescribe
          );
          
          if (!exists) {
            collected.push({
              type: fixedType as 'deepen' | 'next',
              content: directContent,
              describe: directDescribe
            });
          }
        }
        
        // Format 2: JSONL format with options array (new LLM format)
        if (obj.options && Array.isArray(obj.options)) {
          for (const optionItem of obj.options) {
            if (optionItem && typeof optionItem === 'object') {
              const content = optionItem.content || optionItem.title || optionItem.name || '';
              const describe = optionItem.describe || optionItem.description || optionItem.desc || '';
              
              if (typeof content === 'string' && typeof describe === 'string' && content && describe) {
                const exists = collected.some(existing => 
                  existing.type === fixedType && 
                  existing.content === content && 
                  existing.describe === describe
                );
                
                if (!exists) {
                  collected.push({
                    type: fixedType as 'deepen' | 'next',
                    content: content,
                    describe: describe
                  });
                }
              }
            }
          }
        }
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