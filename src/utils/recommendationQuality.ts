/**
 * 推荐内容质量控制工具
 * 用于检测和改进JSONL推荐选项的质量
 */

export interface RecommendationOption {
  type: 'deepen' | 'next';
  content: string;
  describe: string;
}

export interface QualityMetrics {
  uniquenessScore: number;    // 独特性评分 (0-1)
  attractivenessScore: number; // 吸引力评分 (0-1)
  repetitionScore: number;     // 重复度评分 (0-1, 越低越好)
  overallScore: number;        // 综合评分 (0-1)
  issues: string[];            // 发现的问题列表
  suggestions: string[];       // 改进建议
}

/**
 * 推荐质量分析器
 */
export class RecommendationQualityAnalyzer {
  
  // 需要避免的机械化标号模式
  private readonly MECHANICAL_PATTERNS = [
    /第[一二三四五六七八九十\d]+部分/,
    /第[一二三四五六七八九十\d]+章/,
    /第[一二三四五六七八九十\d]+节/,
    /部分[一二三四五六七八九十\d]+/,
    /章节[一二三四五六七八九十\d]+/
  ];

  // 优秀标题的动作词汇
  private readonly ACTION_WORDS = [
    '深挖', '探索', '解析', '剖析', '揭秘', '解构', '洞察', '发现',
    '理解', '掌握', '突破', '破解', '挖掘', '透视', '解读', '领悟'
  ];

  // 价值导向词汇
  private readonly VALUE_WORDS = [
    '核心', '关键', '精髓', '本质', '底层', '深层', '独特', '重要',
    '关键', '核心', '精华', '要害', '根本', '实质', '真谛'
  ];

  /**
   * 分析推荐选项质量
   */
  analyzeRecommendation(option: RecommendationOption, mainContent: string = ''): QualityMetrics {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    // 1. 检查机械化标号
    const mechanicalScore = this.checkMechanicalPatterns(option.content, issues, suggestions);
    
    // 2. 检查内容重复
    const repetitionScore = this.checkContentRepetition(option, mainContent, issues, suggestions);
    
    // 3. 检查标题吸引力
    const attractivenessScore = this.checkAttractiveness(option.content, issues, suggestions);
    
    // 4. 检查描述质量
    const descriptionScore = this.checkDescriptionQuality(option.describe, issues, suggestions);
    
    // 综合评分
    const uniquenessScore = (mechanicalScore + attractivenessScore) / 2;
    const overallScore = (uniquenessScore + (1 - repetitionScore) + descriptionScore) / 3;
    
    return {
      uniquenessScore,
      attractivenessScore,
      repetitionScore,
      overallScore,
      issues,
      suggestions
    };
  }

  /**
   * 批量分析推荐选项
   */
  batchAnalyzeRecommendations(
    options: RecommendationOption[], 
    mainContent: string = ''
  ): { metrics: QualityMetrics[]; summary: { averageScore: number; majorIssues: string[] } } {
    const metrics = options.map(option => this.analyzeRecommendation(option, mainContent));
    
    const averageScore = metrics.reduce((sum, m) => sum + m.overallScore, 0) / metrics.length;
    
    // 收集主要问题
    const allIssues = metrics.flatMap(m => m.issues);
    const uniqueIssues = Array.from(new Set(allIssues));
    const majorIssues = uniqueIssues
      .map(issue => ({ issue, count: allIssues.filter(i => i === issue).length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.issue);
    
    return {
      metrics,
      summary: {
        averageScore,
        majorIssues
      }
    };
  }

  /**
   * 检查机械化标号模式
   */
  private checkMechanicalPatterns(content: string, issues: string[], suggestions: string[]): number {
    let score = 1.0;
    
    for (const pattern of this.MECHANICAL_PATTERNS) {
      if (pattern.test(content)) {
        score -= 0.5;
        issues.push(`标题使用了机械化的编号格式: "${content}"`);
        suggestions.push('使用更有吸引力的动作导向标题，如"深挖核心逻辑"、"解析关键案例"');
        break;
      }
    }
    
    return Math.max(0, score);
  }

  /**
   * 检查与主内容的重复程度
   */
  private checkContentRepetition(option: RecommendationOption, mainContent: string, issues: string[], suggestions: string[]): number {
    if (!mainContent) return 0;
    
    // 简单的文本相似度检测
    const optionText = option.content.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
    const mainText = mainContent.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
    
    // 检查是否直接包含
    if (mainText.includes(optionText) && optionText.length > 4) {
      issues.push(`推荐选项标题与正文内容重复: "${option.content}"`);
      suggestions.push('创造性地重新表述，突出独特的学习价值和视角');
      return 0.8;
    }
    
    // 检查关键词重复率
    const optionWords = optionText.split('').filter(c => c.match(/\w|\u4e00-\u9fff/));
    const mainWords = mainText.split('').filter(c => c.match(/\w|\u4e00-\u9fff/));
    
    if (optionWords.length === 0) return 0;
    
    const commonWords = optionWords.filter(word => mainWords.includes(word));
    const repetitionRate = commonWords.length / optionWords.length;
    
    if (repetitionRate > 0.6) {
      issues.push(`推荐选项与正文内容相似度过高 (${Math.round(repetitionRate * 100)}%)`);
      suggestions.push('使用不同的表达方式，强调新的角度和价值');
      return repetitionRate;
    }
    
    return repetitionRate;
  }

  /**
   * 检查标题吸引力
   */
  private checkAttractiveness(content: string, issues: string[], suggestions: string[]): number {
    let score = 0.5; // 基础分
    
    // 检查动作词汇
    const hasActionWord = this.ACTION_WORDS.some(word => content.includes(word));
    if (hasActionWord) score += 0.25;
    
    // 检查价值词汇
    const hasValueWord = this.VALUE_WORDS.some(word => content.includes(word));
    if (hasValueWord) score += 0.25;
    
    // 长度检查
    if (content.length < 4) {
      issues.push('标题过短，缺乏描述性');
      suggestions.push('增加描述性词汇，让标题更具体和吸引人');
      score -= 0.2;
    } else if (content.length > 20) {
      issues.push('标题过长，可能影响可读性');
      suggestions.push('精简标题，保持核心要点');
      score -= 0.1;
    }
    
    // 通用性检查
    const genericPhrases = ['详细介绍', '深入了解', '进一步探讨', '更多内容'];
    if (genericPhrases.some(phrase => content.includes(phrase))) {
      issues.push('标题过于通用，缺乏特色');
      suggestions.push('使用更具体和独特的表述');
      score -= 0.2;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * 检查描述质量
   */
  private checkDescriptionQuality(description: string, issues: string[], suggestions: string[]): number {
    let score = 0.5;
    
    // 长度检查
    if (description.length < 20) {
      issues.push('描述过短，缺乏足够的吸引力');
      suggestions.push('增加更多具体的价值描述和学习收获');
      score -= 0.2;
    } else if (description.length > 200) {
      issues.push('描述过长，可能影响用户阅读体验');
      suggestions.push('精简描述，突出核心价值点');
      score -= 0.1;
    } else {
      score += 0.3;
    }
    
    // 价值导向检查
    const valueIndicators = ['价值', '收获', '理解', '掌握', '提升', '突破', '洞察', '启发'];
    if (valueIndicators.some(indicator => description.includes(indicator))) {
      score += 0.2;
    }
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * 生成改进建议的标题
   */
  generateImprovedTitle(originalTitle: string, type: 'deepen' | 'next'): string[] {
    const suggestions: string[] = [];
    
    if (type === 'deepen') {
      // 去除机械化标号，生成动作导向标题
      const cleanTitle = originalTitle.replace(/第[一二三四五六七八九十\d]+部分[：:]?/g, '');
      const actionWords = ['深挖', '解析', '探索', '剖析'];
      const valueWords = ['核心', '关键', '精髓', '本质'];
      
      actionWords.forEach(action => {
        valueWords.forEach(value => {
          suggestions.push(`${action}${value}${cleanTitle ? '：' + cleanTitle : ''}`);
        });
      });
    }
    
    return suggestions.slice(0, 3); // 返回前3个建议
  }
}

// 导出单例实例
export const qualityAnalyzer = new RecommendationQualityAnalyzer();

// 便捷函数
export const analyzeRecommendationQuality = (
  option: RecommendationOption, 
  mainContent: string = ''
): QualityMetrics => {
  return qualityAnalyzer.analyzeRecommendation(option, mainContent);
};

export const batchAnalyzeQuality = (
  options: RecommendationOption[], 
  mainContent: string = ''
) => {
  return qualityAnalyzer.batchAnalyzeRecommendations(options, mainContent);
};