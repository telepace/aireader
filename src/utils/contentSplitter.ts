// Extracted and refactored content splitting logic for better testability
export interface NextStepOption {
  type: 'deepen' | 'next';
  content: string;
  describe: string;
}

/**
 * Splits raw text content into main content and JSONL options
 * 
 * TDD Implementation:
 * - Scans all lines to identify valid JSONL options
 * - Removes JSONL lines from main content
 * - Handles mixed content, empty lines, and invalid JSON gracefully
 * 
 * @param raw - Raw text content potentially containing JSONL options
 * @returns Object with separated main content and parsed options
 */
export function splitContentAndOptions(raw: string): { main: string; options: NextStepOption[] } {
  if (!raw) return { main: '', options: [] };
  
  const lines = raw.split('\n');
  const collected: NextStepOption[] = [];
  const jsonLineIndices: number[] = [];
  
  // Scan all lines to identify valid JSONL lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines but continue scanning
    
    try {
      const obj = JSON.parse(line);
      if (
        obj && typeof obj === 'object' &&
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
    } catch {
      // Not valid JSON, continue scanning other lines
    }
  }
  
  // Remove identified JSON lines, keep main content
  const mainLines = lines.filter((_, index) => !jsonLineIndices.includes(index));
  let main = mainLines.join('\n');
  
  // Only trim trailing whitespace to preserve internal formatting
  main = main.replace(/\s+$/, '');
  
  return { main, options: collected.slice(0, 6) };
}