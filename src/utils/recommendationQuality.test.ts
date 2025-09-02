import { 
  RecommendationQualityAnalyzer, 
  analyzeRecommendationQuality, 
  type RecommendationOption 
} from './recommendationQuality';

describe('RecommendationQualityAnalyzer', () => {
  const analyzer = new RecommendationQualityAnalyzer();

  describe('机械化标号检测', () => {
    it('应该检测出"第X部分"格式的标号', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '第一部分：核心概念解析',
        describe: '深入分析作者的主要观点和理论基础，帮助理解核心思想。'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.issues).toContain('标题使用了机械化的编号格式: "第一部分：核心概念解析"');
      expect(result.suggestions).toContain('使用更有吸引力的动作导向标题，如"深挖核心逻辑"、"解析关键案例"');
    });

    it('优秀的动作导向标题应该获得高分', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '深挖核心逻辑',
        describe: '剖析作者思维框架的底层逻辑，揭示概念背后的深层原理和实践价值。'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.overallScore).toBeGreaterThan(0.7);
      expect(result.attractivenessScore).toBeGreaterThan(0.7);
    });
  });

  describe('内容重复检测', () => {
    it('应该检测推荐选项与正文内容的重复', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '第二部分：故事经济学',
        describe: '详细分析故事经济学的核心原理。'
      };
      
      const mainContent = '第二部分：故事经济学的设计原则。我们已经知道了问题所在...';

      const result = analyzer.analyzeRecommendation(option, mainContent);
      expect(result.issues.some(issue => issue.includes('推荐选项标题与正文内容重复'))).toBe(true);
      expect(result.repetitionScore).toBeGreaterThan(0.5);
    });

    it('独特的推荐选项应该获得低重复分数', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '解构关键案例',
        describe: '通过具体案例分析，理解理论在实践中的具体应用和价值。'
      };
      
      const mainContent = '第二部分：故事经济学的设计原则。我们已经知道了问题所在...';

      const result = analyzer.analyzeRecommendation(option, mainContent);
      expect(result.repetitionScore).toBeLessThan(0.3);
    });
  });

  describe('标题吸引力检测', () => {
    it('应该奖励使用动作词汇的标题', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '深挖核心原理',
        describe: '系统性地分析和解构核心概念的底层逻辑框架。'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.attractivenessScore).toBeGreaterThan(0.6);
    });

    it('应该检测过短的标题', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '核心',
        describe: '分析核心概念'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.issues).toContain('标题过短，缺乏描述性');
    });

    it('应该检测通用性标题', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '详细介绍相关内容',
        describe: '进一步深入了解相关概念和理论基础。'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.issues).toContain('标题过于通用，缺乏特色');
    });
  });

  describe('描述质量检测', () => {
    it('应该检测过短的描述', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '深挖核心逻辑',
        describe: '分析概念'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.issues).toContain('描述过短，缺乏足够的吸引力');
    });

    it('优质描述应该获得高分', () => {
      const option: RecommendationOption = {
        type: 'deepen',
        content: '解构关键案例',
        describe: '通过具体案例深度分析，帮助你理解理论在实践中的具体应用，掌握从抽象概念到具体操作的转化方法。'
      };

      const result = analyzer.analyzeRecommendation(option);
      expect(result.overallScore).toBeGreaterThan(0.7);
    });
  });

  describe('批量分析功能', () => {
    it('应该正确计算批量推荐的质量指标', () => {
      const options: RecommendationOption[] = [
        {
          type: 'deepen',
          content: '第一部分：基础概念',
          describe: '简单描述'
        },
        {
          type: 'deepen', 
          content: '深挖核心原理',
          describe: '系统性地分析和解构核心概念的底层逻辑，帮助理解复杂理论的本质和实践价值。'
        }
      ];

      const result = analyzer.batchAnalyzeRecommendations(options);
      expect(result.metrics).toHaveLength(2);
      expect(result.summary.averageScore).toBeGreaterThan(0);
      expect(result.summary.majorIssues.length).toBeGreaterThan(0);
    });
  });

  describe('便捷函数', () => {
    it('analyzeRecommendationQuality应该正常工作', () => {
      const option: RecommendationOption = {
        type: 'next',
        content: '《思考，快与慢》丹尼尔·卡尼曼',
        describe: '诺贝尔经济学奖得主的经典之作，带你深入理解决策背后的心理机制。'
      };

      const result = analyzeRecommendationQuality(option);
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result).toHaveProperty('attractivenessScore');
      expect(result).toHaveProperty('uniquenessScore');
      expect(result).toHaveProperty('repetitionScore');
    });
  });
});