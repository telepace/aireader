/**
 * 模板系统测试
 * 验证新的 JavaScript 模板系统功能
 */

import { templateSystem, renderTemplate } from './templateSystem';

describe('TemplateSystem', () => {
  describe('smartRecommendation template', () => {
    it('should render basic smart recommendation template', async () => {
      const result = await templateSystem.renderTemplate('smartRecommendation', 'zh');
      
      expect(result).toContain('智能推荐引擎');
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('操作模式');
    });

    it('should render content mode template', async () => {
      const result = await templateSystem.renderTemplate('smartRecommendation', 'zh', {
        mode: 'content'
      });
      
      expect(result).toContain('聚焦与展开');
      expect(result).toContain('不需要提供选项推荐');
      expect(result).not.toContain('JSONL格式');
    });

    it('should render recommendations mode template', async () => {
      const result = await templateSystem.renderTemplate('smartRecommendation', 'zh', {
        mode: 'recommendations'
      });
      
      expect(result).toContain('根据提供的内容分析');
      expect(result).toContain('原文深挖');
      expect(result).toContain('主题探索');
    });

    it('should include concept avoidance when provided', async () => {
      const conceptContext = {
        avoidanceList: ['概念A', '概念B'],
        recentConcepts: ['概念C'],
        preferredCategories: ['core', 'method']
      };
      
      const result = await templateSystem.renderTemplate('smartRecommendation', 'zh', {
        mode: 'full',
        concept_context: conceptContext
      });
      
      expect(result).toContain('智能去重机制');
      expect(result).toContain('概念A');
      expect(result).toContain('概念B');
      expect(result).toContain('最近讨论的概念');
      expect(result).toContain('核心理论和基础原理');
      expect(result).toContain('实用方法和技术工具');
    });
  });

  describe('knowledgeGraph template', () => {
    it('should render knowledge graph template', async () => {
      const result = await templateSystem.renderTemplate('knowledgeGraph', 'zh');
      
      expect(result).toContain('简化思维导图');
      expect(result).toContain('previous_map');
      expect(result).toContain('book_title');
      expect(result).toContain('latest_reply');
      expect(result).toContain('数据结构');
    });

    it('should include detailed rules and example', async () => {
      const result = await templateSystem.renderTemplate('knowledgeGraph', 'zh');
      
      // 检查规则部分
      expect(result).toContain('如果 previous_map 为空');
      expect(result).toContain('唯一一个核心抽象概念');
      expect(result).toContain('语言的界限 = 思维的界限');
      
      // 检查示例部分
      expect(result).toContain('🌰 示例');
      expect(result).toContain('维特根斯坦');
      expect(result).toContain('语言的界限 = 思维与世界的界限');
      
      // 检查输出要求
      expect(result).toContain('仅输出最终 JSON');
    });
  });

  describe('contentGeneration template', () => {
    it('should render content generation template', async () => {
      const result = await templateSystem.renderTemplate('contentGeneration', 'zh');
      
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('聚焦与展开');
      expect(result).toContain('输出要求');
      expect(result).toContain('风格要求');
    });
  });

  describe('template management', () => {
    it('should list available contexts', () => {
      const contexts = templateSystem.getAvailableContexts();
      
      expect(contexts).toContain('smartRecommendation');
      expect(contexts).toContain('knowledgeGraph');
      expect(contexts).toContain('contentGeneration');
    });

    it('should validate template existence', () => {
      expect(templateSystem.hasTemplate('smartRecommendation')).toBe(true);
      expect(templateSystem.hasTemplate('knowledgeGraph')).toBe(true);
      expect(templateSystem.hasTemplate('contentGeneration')).toBe(true);
      expect(templateSystem.hasTemplate('nonExistentTemplate' as any)).toBe(false);
    });

    it('should throw error for invalid template', async () => {
      await expect(
        templateSystem.renderTemplate('invalidTemplate' as any, 'zh')
      ).rejects.toThrow('Unsupported template context: invalidTemplate');
    });
  });

  describe('convenience functions', () => {
    it('should work with renderTemplate function', async () => {
      const result = await renderTemplate('contentGeneration', 'zh');
      
      expect(result).toContain('我的目标是「精读」');
      expect(result).toContain('聚焦与展开');
    });
  });
});