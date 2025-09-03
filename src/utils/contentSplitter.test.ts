import { splitContentAndOptions } from './contentSplitter';

// Helper function to create expected options with quality analysis
const expectedOption = (type: 'deepen' | 'next', content: string, describe: string) => ({
  type,
  content,
  describe,
  qualityScore: expect.any(Number),
  qualityIssues: expect.any(Array)
});

describe('splitContentAndOptions - TDD Implementation', () => {
  
  describe('LLM Format Compatibility and Spelling Error Fixes', () => {
    test('should handle "deeping" spelling error and nested JSON format', () => {
      const input = `Content analysis complete.

\`\`\`json
{
  "recommendations": [
    {
      "type": "deeping",
      "title": "第一部分: 核心概念解析",
      "description": "深入解析核心概念的精髓和要点。"
    },
    {
      "type": "deeping", 
      "title": "第二部分: 实践应用指南",
      "description": "将理论转化为实际可操作的方法。"
    },
    {
      "type": "next",
      "title": "《相关书籍推荐》",
      "description": "进一步深入学习的优质资源。"
    }
  ]
}
\`\`\``;

      const result = splitContentAndOptions(input);
      
      expect(result.options).toHaveLength(3);
      expect(result.options[0].type).toBe('deepen'); // Fixed from 'deeping'
      expect(result.options[1].type).toBe('deepen'); // Fixed from 'deeping'
      expect(result.options[2].type).toBe('next');
      expect(result.options[0]).toEqual(expectedOption('deepen', '第一部分: 核心概念解析', '深入解析核心概念的精髓和要点。'));
    });

    test('should handle multiple spelling variations in JSONL format', () => {
      const input = `Main content here.

{"type": "deeping", "content": "Option 1", "describe": "Description 1"}
{"type": "deepening", "content": "Option 2", "describe": "Description 2"}  
{"type": "nextstep", "content": "Option 3", "describe": "Description 3"}
{"type": "next", "content": "Option 4", "describe": "Description 4"}`;

      const result = splitContentAndOptions(input);
      
      expect(result.options).toHaveLength(4);
      expect(result.options[0].type).toBe('deepen'); // Fixed from 'deeping'
      expect(result.options[1].type).toBe('deepen'); // Fixed from 'deepening'
      expect(result.options[2].type).toBe('next');   // Fixed from 'nextstep'
      expect(result.options[3].type).toBe('next');
    });

    test('should handle title/description field mapping', () => {
      const input = `\`\`\`json
{
  "recommendations": [
    {
      "type": "deepen",
      "title": "Using title field",
      "description": "Using description field"
    },
    {
      "type": "next", 
      "content": "Using content field",
      "describe": "Using describe field"
    }
  ]
}
\`\`\``;

      const result = splitContentAndOptions(input);
      
      expect(result.options).toHaveLength(2);
      expect(result.options[0].content).toBe('Using title field');    // Mapped from title
      expect(result.options[0].describe).toBe('Using description field'); // Mapped from description
      expect(result.options[1].content).toBe('Using content field');
      expect(result.options[1].describe).toBe('Using describe field');
    });
  });
  describe('Basic functionality', () => {
    test('should return empty result for empty input', () => {
      const result = splitContentAndOptions('');
      expect(result).toEqual({ main: '', options: [] });
    });

    test('should return empty result for null/undefined input', () => {
      const result = splitContentAndOptions(null as any);
      expect(result).toEqual({ main: '', options: [] });
    });

    test('should handle plain text without any JSON', () => {
      const input = `This is plain text content.
      
No JSON here.
Just regular paragraphs.`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toBe(input.trim());
      expect(result.options).toHaveLength(0);
    });

    test('should handle content with only valid JSONL options', () => {
      const input = `{"type": "deepen", "content": "Option 1", "describe": "Description 1"}
{"type": "next", "content": "Option 2", "describe": "Description 2"}`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toBe('');
      expect(result.options).toHaveLength(2);
      expect(result.options[0]).toEqual(expectedOption('deepen', 'Option 1', 'Description 1'));
      expect(result.options[1]).toEqual(expectedOption('next', 'Option 2', 'Description 2'));
    });
  });

  describe('Mixed content scenarios', () => {
    test('should correctly separate mixed text and JSONL options', () => {
      const input = `Main content first part.

We are discussing this topic:

Second part: Story Economics Design Principles.

Now we know the problem exists, it's time to look at the solution.

{"type": "deepen", "content": "Part 3: Story Economics Design Principles", "describe": "Deep dive into the core of the book, revealing why stories work on the human brain."}

{"type": "deepen", "content": "USP Death & Story Value Proposition", "describe": "Detailed analysis comparing traditional USP vs story value propositions."}

{"type": "next", "content": "Permission Marketing by Seth Godin", "describe": "Revolutionary book about permission-based marketing concepts."}

Final thoughts and conclusions.`;

      const result = splitContentAndOptions(input);
      
      // Check main content is clean (no JSON)
      expect(result.main).toContain('Main content first part');
      expect(result.main).toContain('Second part: Story Economics');
      expect(result.main).toContain('Final thoughts and conclusions');
      expect(result.main).not.toContain('{"type"');
      expect(result.main).not.toContain('"describe"');
      
      // Check options are parsed correctly
      expect(result.options).toHaveLength(3);
      expect(result.options[0].type).toBe('deepen');
      expect(result.options[1].type).toBe('deepen');
      expect(result.options[2].type).toBe('next');
    });

    test('should handle invalid JSON mixed with valid content', () => {
      const input = `Main content here.

{"invalid": "json"}
Middle text content.

{"type": "deepen", "content": "Valid option", "describe": "Valid description"}

More main content.`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toContain('Main content here');
      expect(result.main).toContain('Middle text content');
      expect(result.main).toContain('More main content');
      expect(result.main).toContain('{"invalid": "json"}'); // Invalid JSON stays in main content
      expect(result.main).not.toContain('{"type": "deepen"');
      expect(result.options).toHaveLength(1);
      expect(result.options[0].content).toBe('Valid option');
    });

    test('should handle empty lines and continue scanning', () => {
      const input = `First part of main content.



{"type": "deepen", "content": "Option 1", "describe": "Description 1"}


Second part of main content.

{"type": "next", "content": "Option 2", "describe": "Description 2"}`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toContain('First part of main content');
      expect(result.main).toContain('Second part of main content');
      expect(result.main).not.toContain('{"type"');
      expect(result.options).toHaveLength(2);
    });
  });

  describe('Edge cases and error handling', () => {
    test('should handle malformed JSON gracefully', () => {
      const input = `Main content.

{"type": "deepen", "content": "Valid", "describe": "Valid"}
{malformed json}
{"type": incomplete
{"type": "next", "content": "Another valid", "describe": "Another valid"}

More content.`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toContain('Main content');
      expect(result.main).toContain('More content');
      expect(result.main).toContain('{malformed json}');
      expect(result.main).toContain('{"type": incomplete');
      expect(result.options).toHaveLength(2);
    });

    test('should validate JSONL structure strictly', () => {
      const input = `{"type": "invalid_type", "content": "Test", "describe": "Test"}
{"type": "deepen", "content": 123, "describe": "Test"}
{"type": "next", "content": "Test", "describe": null}
{"type": "deepen", "content": "Valid", "describe": "Valid"}
{"missing_type": true, "content": "Test", "describe": "Test"}`;

      const result = splitContentAndOptions(input);
      
      expect(result.options).toHaveLength(1);
      expect(result.options[0]).toEqual(expectedOption('deepen', 'Valid', 'Valid'));
    });

    test('should limit options to maximum of 6', () => {
      const input = Array.from({ length: 8 }, (_, i) => 
        `{"type": "${i % 2 === 0 ? 'deepen' : 'next'}", "content": "Option ${i + 1}", "describe": "Description ${i + 1}"}`
      ).join('\n');

      const result = splitContentAndOptions(input);
      
      expect(result.options).toHaveLength(6);
      expect(result.options[0].content).toBe('Option 1');
      expect(result.options[5].content).toBe('Option 6');
    });

    test('should preserve content formatting and whitespace', () => {
      const input = `    Indented content.

  Another indented line.

{"type": "deepen", "content": "Option", "describe": "Description"}

    Final indented content.`;

      const result = splitContentAndOptions(input);
      
      expect(result.main).toContain('    Indented content');
      expect(result.main).toContain('  Another indented line');
      expect(result.main).toContain('    Final indented content');
      expect(result.options).toHaveLength(1);
    });
  });

  describe('Real-world scenarios', () => {
    test('should handle the original bug scenario', () => {
      const input = `第二部分：故事经济学的设计原则。

我们已经知道了问题所在，现在是时候看解了。这一部分将深入全书的核心，揭示故事为何能作用于人类大脑，我们将深入探讨"故事传输"的心理学机制，了解故事是如何绕过理性防御，并最终影响我们的决策和行为的。这是从"是什么"到"为什么"的关键一步。

{"type": "deepen", "content": "第三部分：故事经济学的设计原则", "describe": "我们已经知道了问题所在，现在是时候看解了。这一部分将深入全书的核心，揭示故事为何能作用于人类大脑，我们将深入探讨'故事传输'的心理学机制，了解故事是如何绕过理性防御，并最终影响我们的决策和行为的。这是从'是什么'到'为什么'的关键一步。"}

{"type": "deepen", "content": "USP的消亡与故事的'价值主张'", "describe": "深入剖析第二部分的一个关键论述，我们将详细对比传统的'独特销售主张'(USP)和故事所传递的'价值主张'有何根本不同，前者是关于产品'是什么'，后者是关于它能帮助用户'成为谁'，通过案例分析，你会看到一个好的故事如何将一个功能，升级成为一种身份认同和情感跨越。"}

{"type": "next", "content": "《许可营销》赛斯·高汀 (Seth Godin)", "describe": "这本书是'广告终结'思想的重要之作，甚至早于《故事经济学》。高汀在互联网泡沫时期就预言了'打扰式营销'的死亡，并提出了革命性的'许可营销'概念—营销人员的荣耀，是获得消费者同意的许可，是获得他们向消费者自愿传送信息。它为你理解'消费者主权'时代提供了最深刻的哲学基础。"}

{"type": "next", "content": "《人人说谎》(Everybody Lies) 赛斯·斯蒂芬斯-戴维多维茨 (Seth Stephens-Davidowitz)", "describe": "如果说《故事经济学》告诉你人们不再相信广告，这本书则通过大数据告诉你人们到底在想什么、说什么、消费什么。作者利用谷歌搜索数据挖掘了'数字化真实'，揭示了隐藏在社会表象之下的真实人性，它会让你意识到，在这个'社会面具'卸除的数字时代，传统营销的'伪装'面临着前所未有的挑战。"}`;

      const result = splitContentAndOptions(input);
      
      // Main content should be clean Chinese text without JSON
      expect(result.main).toContain('第二部分：故事经济学的设计原则');
      expect(result.main).toContain('我们已经知道了问题所在');
      expect(result.main).not.toContain('{"type"');
      expect(result.main).not.toContain('"describe"');
      
      // Should extract 4 options
      expect(result.options).toHaveLength(4);
      expect(result.options.filter(o => o.type === 'deepen')).toHaveLength(2);
      expect(result.options.filter(o => o.type === 'next')).toHaveLength(2);
    });

    test('should handle streaming response completion scenario', () => {
      // Simulate what happens during streaming - content builds up gradually
      const streamingContent = `解答你的问题：

关于这个话题，我可以从以下几个角度来分析：

1. 首先是基础概念...
2. 然后是实际应用...

{"type": "deepen", "content": "深入分析第一个角度", "describe": "详细探讨基础概念的各个方面"}
{"type": "deepen", "content": "深入分析第二个角度", "describe": "实际应用的具体案例和方法"}
{"type": "next", "content": "相关推荐书籍1", "describe": "进一步学习的优质资源"}`;

      const result = splitContentAndOptions(streamingContent);
      
      expect(result.main).toContain('解答你的问题');
      expect(result.main).toContain('1. 首先是基础概念');
      expect(result.main).toContain('2. 然后是实际应用');
      expect(result.main).not.toContain('{"type"');
      expect(result.options).toHaveLength(3);
    });
  });
});