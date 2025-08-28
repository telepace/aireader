/**
 * Prompt Template Engine V2 测试
 */

import { promptTemplateV2, generateSystemPrompt } from './promptTemplateV2';

describe('PromptTemplateEngineV2', () => {
  describe('generateSystemPrompt', () => {
    it('应该生成中文系统 prompt', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'zh');
      
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('每次交互，请严格执行以下3件事');
      expect(result).toContain('content_complete');
      expect(result).toContain('推荐选项已生成，点击探索');
    });

    it('应该生成英文系统 prompt', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'en');
      
      expect(result).toContain('My goal is to');
      expect(result).toContain('For each interaction');
      expect(result).toContain('content_complete');
      expect(result).toContain('Content analysis completed, generating recommendations...');
    });
  });

  describe('便捷函数', () => {
    it('generateSystemPrompt 便捷函数应该工作', () => {
      const result = generateSystemPrompt('nextStepChat', 'zh');
      expect(result).toContain('我的目标是「精读」');
    });
  });

  describe('Prompt 优化验证', () => {
    it('应该移除混淆性的 type 标记，避免JSON语法错误', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'zh');
      
      // 不应该包含混淆性的 (type: deepen) 和 (type: next) 标记
      expect(result).not.toContain('(type: deepen)');
      expect(result).not.toContain('(type: next)');
      
      // 应该包含清晰的格式分隔符
      expect(result).toContain('═══ 格式输出要求 ═══');
      
      // 应该包含严格的JSON约束
      expect(result).toContain('检查每行JSON的括号、引号、逗号是否正确匹配');
    });

    it('英文模板也应该移除混淆性标记', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'en');
      
      // 不应该包含混淆性的 type 标记
      expect(result).not.toContain('(type: deepen)');
      expect(result).not.toContain('(type: next)');
      
      // 应该包含清晰的格式分隔符
      expect(result).toContain('═══ Format Output Requirements ═══');
      
      // 应该包含严格的约束
      expect(result).toContain('Check that brackets, quotes, commas in each JSON line match correctly');
    });

    it('应该包含清晰的输出流程说明', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'zh');
      
      expect(result).toContain('**输出流程**：');
      expect(result).toContain('1. 首先完成第1步的文本内容');
      expect(result).toContain('2. 空一行');
      expect(result).toContain('3. 输出完整的JSONL数据，每行一个JSON对象');
    });

    it('应该包含严格的JSON语法要求来防止语法错误', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'zh');
      
      // 应该包含明确的正确和错误示例
      expect(result).toContain('{"type": "deepen"} ✅');
      expect(result).toContain('{"type("deepen" ❌');
      
      // 应该强调JSON格式要求
      expect(result).toContain('所有字段名必须用双引号包围');
      expect(result).toContain('检查每行JSON的括号、引号、逗号是否正确匹配');
    });

    it('英文模板应该包含相同的JSON语法约束', () => {
      const result = promptTemplateV2.generateSystemPrompt('nextStepChat', 'en');
      
      expect(result).toContain('{"type": "deepen"} ✅');
      expect(result).toContain('{"type("deepen" ❌');
      expect(result).toContain('All field names must be wrapped in double quotes');
    });
  });
});