/**
 * Tests for content splitter utility
 */

import { splitContentAndOptions } from '../contentSplitter';

describe('Content Splitter', () => {
  describe('splitContentAndOptions', () => {
    test('splits content with valid JSONL options', () => {
      const input = `这是一段分析内容，解释了核心概念。

接下来是一些选项：

{"type": "deepen", "content": "第一部分：基础概念", "describe": "深入了解基础概念的内容"}
{"type": "deepen", "content": "第二部分：实践应用", "describe": "学习如何在实践中应用这些概念"}
{"type": "next", "content": "《深度学习》", "describe": "Ian Goodfellow等著，深度学习领域的经典教材"}`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('这是一段分析内容，解释了核心概念。\n\n接下来是一些选项：');
      expect(result.options).toHaveLength(3);
      expect(result.options[0]).toEqual({
        type: 'deepen',
        content: '第一部分：基础概念',
        describe: '深入了解基础概念的内容'
      });
      expect(result.options[1]).toEqual({
        type: 'deepen',
        content: '第二部分：实践应用',
        describe: '学习如何在实践中应用这些概念'
      });
      expect(result.options[2]).toEqual({
        type: 'next',
        content: '《深度学习》',
        describe: 'Ian Goodfellow等著，深度学习领域的经典教材'
      });
    });

    test('handles content with no separator', () => {
      const input = '这是没有分隔符的纯文本内容。';
      
      const result = splitContentAndOptions(input);

      expect(result.main).toBe(input);
      expect(result.options).toEqual([]);
    });

    test('handles content without valid JSONL', () => {
      const input = `文本内容

这里没有有效的JSON格式`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('文本内容\n\n这里没有有效的JSON格式');
      expect(result.options).toEqual([]);
    });

    test('handles mixed valid and invalid JSONL lines', () => {
      const input = `主要内容

{"type": "deepen", "content": "有效选项", "describe": "这是有效的JSON"}
无效的JSON行
{"type": "next", "content": "另一个有效选项", "describe": "这也是有效的JSON"}
另一行无效内容`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('主要内容\n\n无效的JSON行\n另一行无效内容');
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toEqual({
        type: 'deepen',
        content: '有效选项',
        describe: '这是有效的JSON'
      });
      expect(result.options[1]).toEqual({
        type: 'next',
        content: '另一个有效选项',
        describe: '这也是有效的JSON'
      });
    });

    test('handles empty lines in JSONL section', () => {
      const input = `内容部分

{"type": "deepen", "content": "选项1", "describe": "描述1"}

{"type": "next", "content": "选项2", "describe": "描述2"}

`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('内容部分');
      expect(result.options).toHaveLength(2);
    });

    test('handles JSONL with extra whitespace', () => {
      const input = `内容

  {"type": "deepen", "content": "带前导空格", "describe": "描述"}  
{"type": "next", "content": "正常格式", "describe": "另一个描述"}   `;

      const result = splitContentAndOptions(input);

      expect(result.options).toHaveLength(2);
      expect(result.options[0].content).toBe('带前导空格');
      expect(result.options[1].content).toBe('正常格式');
    });

    test('handles JSONL with Chinese characters', () => {
      const input = `中文内容分析

{"type": "deepen", "content": "第一章：中文处理", "describe": "深入学习中文文本处理技术，包括分词、语法分析等"}
{"type": "next", "content": "《自然语言处理综论》", "describe": "Daniel Jurafsky著，NLP领域的权威教材，中文版翻译质量优秀"}`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('中文内容分析');
      expect(result.options).toHaveLength(2);
      expect(result.options[0].content).toBe('第一章：中文处理');
      expect(result.options[1].content).toBe('《自然语言处理综论》');
    });

    test('handles malformed JSON gracefully', () => {
      const input = `内容

{"type": "deepen", "content": "正常选项", "describe": "正常描述"}
{"type": "deepen", "content": "缺少引号, "describe": "错误的JSON"}
{"type": "next", "content": "另一个正常选项", "describe": "正常描述"}`;

      const result = splitContentAndOptions(input);

      expect(result.options).toHaveLength(2);
      expect(result.options[0].content).toBe('正常选项');
      expect(result.options[1].content).toBe('另一个正常选项');
    });

    test('handles options with special characters', () => {
      const input = `内容

{"type": "deepen", "content": "特殊字符: @#$%^&*()", "describe": "包含特殊字符的描述和符号"}
{"type": "next", "content": "URL: https://example.com/path?param=value", "describe": "包含URL的描述"}`;

      const result = splitContentAndOptions(input);

      expect(result.options).toHaveLength(2);
      expect(result.options[0].content).toBe('特殊字符: @#$%^&*()');
      expect(result.options[0].describe).toBe('包含特殊字符的描述和符号');
      expect(result.options[1].content).toBe('URL: https://example.com/path?param=value');
    });

    test('preserves order of options', () => {
      const input = `内容

{"type": "next", "content": "第一个", "describe": "描述1"}
{"type": "deepen", "content": "第二个", "describe": "描述2"}
{"type": "next", "content": "第三个", "describe": "描述3"}
{"type": "deepen", "content": "第四个", "describe": "描述4"}`;

      const result = splitContentAndOptions(input);

      expect(result.options).toHaveLength(4);
      expect(result.options[0].content).toBe('第一个');
      expect(result.options[1].content).toBe('第二个');
      expect(result.options[2].content).toBe('第三个');
      expect(result.options[3].content).toBe('第四个');

      expect(result.options[0].type).toBe('next');
      expect(result.options[1].type).toBe('deepen');
      expect(result.options[2].type).toBe('next');
      expect(result.options[3].type).toBe('deepen');
    });

    test('handles very long content and options', () => {
      const longContent = 'A'.repeat(10000);
      const longDescription = 'B'.repeat(5000);
      
      const input = `${longContent}

{"type": "deepen", "content": "长内容测试", "describe": "${longDescription}"}`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe(longContent);
      expect(result.options).toHaveLength(1);
      expect(result.options[0].describe).toBe(longDescription);
    });
  });

  describe('Edge cases', () => {
    test('handles empty string', () => {
      const result = splitContentAndOptions('');
      expect(result.main).toBe('');
      expect(result.options).toEqual([]);
    });

    test('handles only separator', () => {
      const result = splitContentAndOptions('---');
      expect(result.main).toBe('---');
      expect(result.options).toEqual([]);
    });

    test('handles multiple separators', () => {
      const input = `第一部分内容
---
{"type": "deepen", "content": "选项1", "describe": "描述1"}
---
这里的内容会被忽略，因为只处理第一个分隔符后的内容`;

      const result = splitContentAndOptions(input);

      expect(result.main).toBe('第一部分内容\n---\n---\n这里的内容会被忽略，因为只处理第一个分隔符后的内容');
      expect(result.options).toHaveLength(1);
    });

    test('handles separator with different spacing', () => {
      const variations = [
        '内容\n---\n选项',
        '内容\n\n---\n\n选项',
        '内容\r\n---\r\n选项',
        '内容\n   ---   \n选项'
      ];

      variations.forEach(input => {
        const result = splitContentAndOptions(input);
        expect(result.main).toBe(input); // Since no valid JSONL, all content preserved
      });
    });

    test('handles JSONL with missing required fields', () => {
      const input = `内容

{"type": "deepen", "content": "完整选项", "describe": "完整描述"}
{"type": "deepen", "describe": "缺少content字段"}
{"content": "缺少type字段", "describe": "描述"}
{"type": "next", "content": "缺少describe字段"}`;

      const result = splitContentAndOptions(input);

      // Only the complete option should be parsed
      expect(result.options).toHaveLength(1);
      expect(result.options[0]).toEqual({
        type: 'deepen',
        content: '完整选项',
        describe: '完整描述'
      });
    });
  });

  describe('Performance', () => {
    test('handles large input efficiently', () => {
      const largeContent = 'Content line.\n'.repeat(1000);
      const manyOptions = Array.from({ length: 100 }, (_, i) => 
        `{"type": "deepen", "content": "Option ${i}", "describe": "Description ${i}"}`
      ).join('\n');

      const input = `${largeContent}\n${manyOptions}`;

      const start = performance.now();
      const result = splitContentAndOptions(input);
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.options).toHaveLength(6); // Function limits options to 6
    });
  });
});