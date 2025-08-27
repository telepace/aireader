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
      expect(result).toContain('正文解析完成，生成推荐选项中...');
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
});