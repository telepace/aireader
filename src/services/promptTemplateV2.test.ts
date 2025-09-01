/**
 * Prompt Template Engine V2 测试
 */

import { promptTemplateV2, generateSystemPromptAsync } from './promptTemplateV2';

describe('PromptTemplateEngineV2', () => {
  describe('generateSystemPromptAsync', () => {
    it('应该生成中文系统 prompt', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh');
      
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('每次交互，请严格执行以下3件事');
      expect(result).toContain('聚焦与展开');
      expect(result).toContain('原文深挖');
      expect(result).toContain('主题探索');
    });

    it('应该生成英文系统 prompt', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'en');
      
      expect(result).toContain('My goal is to');
      expect(result).toContain('Focus & Expand');
      expect(result).toContain('Deep Dive');
      expect(result).toContain('Topic Exploration');
    });

    it('应该生成内容生成 prompt', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh', { mode: 'content' });
      
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('聚焦与展开');
      expect(result).toContain('不需要提供选项推荐或JSONL格式输出');
    });

    it('应该生成 JSONL 推荐 prompt', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh', { mode: 'recommendations' });
      
      expect(result).toContain('智能推荐引擎');
      expect(result).toContain('原文深挖');
      expect(result).toContain('主题探索');
      expect(result).toContain('直接输出纯净的JSONL数据');
    });
  });

  describe('便捷函数', () => {
    it('generateSystemPromptAsync 便捷函数应该工作', async () => {
      const result = await generateSystemPromptAsync('smartRecommendation', 'zh');
      expect(result).toContain('我的目标是「精读」');
    });

    it('同步函数应该抛出错误引导使用异步版本', () => {
      expect(() => {
        promptTemplateV2.generateSystemPrompt('smartRecommendation', 'zh');
      }).toThrow('Synchronous prompt generation is no longer supported');
    });
  });

  describe('模板变量', () => {
    it('应该返回正确的模板变量', () => {
      const variables = promptTemplateV2.getTemplateVariables('smartRecommendation', 'zh');
      
      expect(variables.goal).toContain('我的目标是「精读」');
      expect(variables.steps).toHaveProperty('focus');
      expect(variables.steps).toHaveProperty('deepen');
      expect(variables.steps).toHaveProperty('next');
      expect(variables.format).toHaveProperty('type', 'jsonl');
    });

    it('应该支持英文模板变量', () => {
      const variables = promptTemplateV2.getTemplateVariables('smartRecommendation', 'en');
      
      expect(variables.goal).toContain('My goal is to');
      expect(variables.steps.focus.title).toBe('Focus & Expand');
      expect(variables.steps.deepen.title).toBe('Deep Dive');
      expect(variables.steps.next.title).toBe('Topic Exploration');
    });
  });

  describe('配置验证', () => {
    it('应该验证有效的配置', () => {
      expect(promptTemplateV2.validateConfig('smartRecommendation', 'zh')).toBe(true);
      expect(promptTemplateV2.validateConfig('knowledgeGraph', 'zh')).toBe(true);
    });

    it('应该返回详细的验证结果', () => {
      const result = promptTemplateV2.validateConfigDetailed('smartRecommendation', 'zh');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Prompt 质量验证', () => {
    it('smartRecommendation full 模式应该包含正确的 JSON 约束', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh');
      
      expect(result).toContain('JSONL 模板');
    });

    it('smartRecommendation recommendations 模式应该包含更严格的格式约束', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh', { mode: 'recommendations' });
      
      expect(result).toContain('🚨 关键格式约束');
      expect(result).toContain('必须严格遵守');
      expect(result).toContain('直接输出纯净的JSONL数据');
    });

    it('smartRecommendation content 模式不应该包含 JSONL 格式要求', async () => {
      const result = await promptTemplateV2.generateSystemPromptAsync('smartRecommendation', 'zh', { mode: 'content' });
      
      expect(result).not.toContain('JSONL');
      expect(result).not.toContain('JSON');
      expect(result).toContain('不需要提供选项推荐或JSONL格式输出');
    });
  });
});