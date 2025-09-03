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
        existingConcepts: ['概念D'],
        avoidanceList: ['概念A', '概念B'],
        recentConcepts: ['概念C'],
        mindMapConcepts: ['概念E'],
        preferredCategories: ['core', 'method'],
        diversityWeight: 0.5
      };
      
      const result = await templateSystem.renderTemplate('smartRecommendation', 'zh', {
        mode: 'full',
        concept_context: conceptContext
      });
      
      expect(result).toContain('已读内容避免机制');
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
      
      expect(result).toContain('推荐型思维导图');
      expect(result).toContain('previous_map');
      expect(result).toContain('book_title');
      expect(result).toContain('latest_reply');
      expect(result).toContain('数据结构');
    });

    it('should include detailed rules and example', async () => {
      const result = await templateSystem.renderTemplate('knowledgeGraph', 'zh');
      
      // 检查增量更新规则部分
      expect(result).toContain('增量更新原则');
      expect(result).toContain('保持原有结构');
      expect(result).toContain('渐进式建构');
      
      // 检查示例部分
      expect(result).toContain('🌰 推荐型示例');
      expect(result).toContain('变革者');
      expect(result).toContain('示例2 - 增量更新');
      
      // 检查输出要求
      expect(result).toContain('仅输出JSON对象');
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