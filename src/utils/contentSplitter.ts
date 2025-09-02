// Extracted and refactored content splitting logic for better testability
import { analyzeRecommendationQuality, type RecommendationOption, type QualityMetrics } from './recommendationQuality';

export interface NextStepOption {
  type: 'deepen' | 'next';
  content: string;
  describe: string;
  qualityScore?: number;
  qualityIssues?: string[];
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
 * Extract JSON objects using bracket counting (handles deep nesting)
 */
function extractJsonByBrackets(text: string): string[] {
  const results: string[] = [];
  let depth = 0;
  let start = -1;
  
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (text[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        results.push(text.substring(start, i + 1));
        start = -1;
      }
    }
  }
  
  return results;
}

/**
 * Enhanced version that also removes processed JSON blocks from the text
 */
function extractNestedJSONOptionsWithCleanup(text: string): { 
  options: NextStepOption[]; 
  processedText: string; 
} {
  const collected: NextStepOption[] = [];
  let processedText = text;
  
  try {
    // Look for JSON blocks in the text
    const jsonBlockRegex = /```json\s*\n?([\s\S]*?)\n?```/g;
    let match;
    
    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent);
        const extracted = extractOptionsFromParsedJSON(parsed);
        if (extracted.length > 0) {
          collected.push(...extracted);
          // Remove the processed JSON block, preserving structure
          processedText = processedText.replace(match[0], '');
        }
      } catch (parseError) {
        console.warn('Failed to parse JSON block:', parseError);
      }
    }
    
    // If no JSON blocks found, try to extract JSON from text
    if (collected.length === 0) {
      // Use bracket counting to find complete JSON objects (handles deep nesting)
      const jsonObjects = extractJsonByBrackets(text);
      
      const processedJsons = new Set(); // Track processed JSON to avoid duplicates
      
      for (const jsonContent of jsonObjects) {
        try {
          // Skip if already processed
          if (processedJsons.has(jsonContent)) continue;
          
          const parsed = JSON.parse(jsonContent);
          
          // Only process if it's a multi-line structure or has specific patterns
          const isNestedStructure = jsonContent.includes('\n') || 
                                   (parsed.recommendations && Array.isArray(parsed.recommendations)) ||
                                   (parsed.type && parsed.options && Array.isArray(parsed.options)) ||
                                   (parsed.type && parsed.recommendations && Array.isArray(parsed.recommendations));
          
          if (isNestedStructure) {
            const extracted = extractOptionsFromParsedJSON(parsed);
            if (extracted.length > 0) {
              collected.push(...extracted);
              
              // Remove the processed JSON object from text
              processedText = processedText.replace(jsonContent, '').replace(/\n\s*\n\s*\n/g, '\n\n');
              processedJsons.add(jsonContent);
            }
          }
        } catch (parseError) {
          // Skip invalid JSON objects
          console.debug('Failed to parse JSON object:', parseError instanceof Error ? parseError.message : String(parseError));
        }
      }
    }
  } catch (error) {
    console.warn('Error extracting nested JSON options:', error);
  }
  
  return { options: collected, processedText };
}

/**
 * Extract options from a parsed JSON object, handling multiple format variations
 */
function extractOptionsFromParsedJSON(parsed: any): NextStepOption[] {
  const collected: NextStepOption[] = [];
  
  // Format 1: {"recommendations": [...]} - Legacy nested format
  if (parsed.recommendations && Array.isArray(parsed.recommendations) && !parsed.type) {
    for (const item of parsed.recommendations) {
      // Handle nested structure: {type: "deepen", options: [...]}
      if (item.type && item.options && Array.isArray(item.options)) {
        if (item.type === 'deepen' || item.type === 'next') {
          for (const optionItem of item.options) {
            const option = convertToNextStepOption(optionItem, item.type);
            if (option) collected.push(option);
          }
        }
      } else {
        // Handle flat structure: direct recommendation objects
        const option = convertToNextStepOption(item);
        if (option) collected.push(option);
      }
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
  // Format 4: Single object with type and recommendations array (new LLM format)
  else if (parsed.type && parsed.recommendations && Array.isArray(parsed.recommendations)) {
    if (parsed.type === 'deepen' || parsed.type === 'next') {
      for (const item of parsed.recommendations) {
        const option = convertToNextStepOption(item, parsed.type);
        if (option) collected.push(option);
      }
    }
  }
  // Format 5: Direct single object
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
  qualityAnalysis?: {
    averageScore: number;
    majorIssues: string[];
    totalIssueCount: number;
  };
} {
  if (!raw) return { main: '', options: [] };
  
  const collected: NextStepOption[] = [];
  const jsonLineIndices: number[] = [];
  let isContentComplete = false;
  let completionMessage = '';
  
  // First try to extract options from nested JSON structures
  const { options: nestedOptions, processedText } = extractNestedJSONOptionsWithCleanup(raw);
  let workingText = processedText || raw;
  if (nestedOptions.length > 0) {
    collected.push(...nestedOptions);
  }
  
  // Use processed text for further JSONL scanning
  const workingLines = workingText.split('\n');
  
  // Scan all lines to identify valid JSONL lines and completion signals
  for (let i = 0; i < workingLines.length; i++) {
    const line = workingLines[i].trim();
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
  const mainLines = workingLines.filter((_, index) => !jsonLineIndices.includes(index));
  let main = mainLines.join('\n');
  
  // Only trim trailing whitespace to preserve internal formatting
  main = main.replace(/\s+$/, '');
  
  // Quality analysis for collected options
  let qualityAnalysis;
  if (collected.length > 0) {
    const recommendationOptions: RecommendationOption[] = collected.map(option => ({
      type: option.type,
      content: option.content,
      describe: option.describe
    }));
    
    // Perform batch quality analysis
    const qualityResults = analyzeRecommendationQuality(recommendationOptions[0], main);
    const allQualityResults = recommendationOptions.map(option => 
      analyzeRecommendationQuality(option, main)
    );
    
    // Add quality scores to options
    collected.forEach((option, index) => {
      if (allQualityResults[index]) {
        option.qualityScore = Math.round(allQualityResults[index].overallScore * 100) / 100;
        option.qualityIssues = allQualityResults[index].issues;
      }
    });
    
    // Calculate overall quality metrics
    const avgScore = allQualityResults.reduce((sum, result) => sum + result.overallScore, 0) / allQualityResults.length;
    const allIssues = allQualityResults.flatMap(result => result.issues);
    const uniqueIssues = Array.from(new Set(allIssues));
    const majorIssues = uniqueIssues
      .map(issue => ({ issue, count: allIssues.filter(i => i === issue).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.issue);
    
    qualityAnalysis = {
      averageScore: Math.round(avgScore * 100) / 100,
      majorIssues,
      totalIssueCount: allIssues.length
    };
    
    // Log quality issues for debugging
    if (qualityAnalysis.totalIssueCount > 0) {
      console.warn(`发现 ${qualityAnalysis.totalIssueCount} 个推荐质量问题:`, majorIssues);
    }
  }
  
  return { 
    main, 
    options: collected.slice(0, 6),
    isContentComplete,
    completionMessage,
    qualityAnalysis
  };
}