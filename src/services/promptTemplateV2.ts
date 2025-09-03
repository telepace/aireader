/**
 * Prompt Template Engine V2 - 基于 JavaScript 模板的高性能实现
 * 
 * 移除 Jinja2 依赖，使用原生 JavaScript 模板系统
 * 简化架构，提高性能和可靠性
 */

import { templateSystem } from './templateSystem';
import {
  Language,
  PromptContext,
  PromptVariables,
  IPromptTemplateEngine,
  PromptGenerationOptions,
  PromptValidationResult,
  PromptConfigError
} from '../types/prompt';

class PromptTemplateEngineV2 implements IPromptTemplateEngine {
  private templateSystem = templateSystem;

  /**
   * 生成完整的系统 prompt 文本（异步版本，使用新模板系统）
   */
  async generateSystemPromptAsync(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): Promise<string> {
    try {
      return await this.templateSystem.renderTemplate(context, language, variables);
    } catch (error) {
      throw new PromptConfigError(
        `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`,
        context,
        language
      );
    }
  }

  /**
   * 同步版本的 prompt 生成（使用异步加载，但返回 Promise）
   * @deprecated 建议使用 generateSystemPromptAsync
   */
  generateSystemPrompt(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): string {
    // 抛出错误引导用户使用异步版本
    throw new PromptConfigError(
      'Synchronous prompt generation is no longer supported. Please use generateSystemPromptAsync() instead.',
      context,
      language
    );
  }

  /**
   * 获取系统 prompt 配置（为了兼容性）
   */
  getSystemPromptConfig(context: PromptContext, language: Language = 'zh') {
    // 返回默认配置
    return {
      goal: '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。',
      steps: [
        { title: '聚焦与展开', description: '先讲透内容的一个核心关键；再全面概览，让我了解全貌，语言风格清晰易懂。' },
        { title: '原文深挖', type: 'deepen' as const, description: '推荐3个最有价值的原文精读选项。' },
        { title: '主题探索', type: 'next' as const, description: '推荐3本最值得阅读的相关书籍。' }
      ],
      format: { type: 'jsonl', requirements: [], template: [] }
    };
  }

  /**
   * 获取可用的上下文列表
   */
  getAvailableContexts(): string[] {
    return this.templateSystem.getAvailableContexts();
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(context: PromptContext): Language[] {
    return ['zh'];
  }

  /**
   * 验证 prompt 配置完整性
   */
  validateConfig(context: PromptContext, language: Language = 'zh'): boolean {
    return this.templateSystem.hasTemplate(context);
  }

  /**
   * 详细验证配置并返回验证结果
   */
  validateConfigDetailed(context: PromptContext, language: Language = 'zh'): PromptValidationResult {
    const result: PromptValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      const hasTemplate = this.templateSystem.hasTemplate(context);
      
      if (!hasTemplate) {
        result.isValid = false;
        result.errors.push(`Template not found for context: ${context}`);
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 使用选项生成 prompt（异步版本）
   */
  async generatePromptWithOptionsAsync(options: PromptGenerationOptions): Promise<string> {
    const { context, language = 'zh', variables = {}, validate = true } = options;

    if (validate) {
      const validation = this.validateConfigDetailed(context, language);
      if (!validation.isValid) {
        throw new PromptConfigError(
          `Invalid configuration: ${validation.errors.join(', ')}`,
          context,
          language
        );
      }
    }

    return this.generateSystemPromptAsync(context, language, variables);
  }

  /**
   * 使用选项生成 prompt（同步版本 - 已废弃）
   * @deprecated 使用 generatePromptWithOptionsAsync
   */
  generatePromptWithOptions(options: PromptGenerationOptions): string {
    throw new PromptConfigError(
      'Synchronous prompt generation is no longer supported. Please use generatePromptWithOptionsAsync() instead.',
      options.context,
      options.language || 'zh'
    );
  }

  /**
   * 获取 prompt 预览（截断长内容）
   */
  getPromptPreview(context: PromptContext, language: Language = 'zh', maxLength: number = 200): string {
    const goal = '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。';
    
    if (goal.length <= maxLength) return goal;
    return goal.substring(0, maxLength - 3) + '...';
  }

  /**
   * 自定义变量渲染（异步版本）
   */
  async renderWithCustomVariablesAsync(
    context: PromptContext,
    language: Language = 'zh',
    customVariables: PromptVariables = {}
  ): Promise<string> {
    return this.generateSystemPromptAsync(context, language, customVariables);
  }

  /**
   * 自定义变量渲染（同步版本 - 已废弃）
   * @deprecated 使用 renderWithCustomVariablesAsync
   */
  renderWithCustomVariables(
    context: PromptContext,
    language: Language = 'zh',
    customVariables: PromptVariables = {}
  ): string {
    throw new PromptConfigError(
      'Synchronous rendering is no longer supported. Please use renderWithCustomVariablesAsync() instead.',
      context,
      language
    );
  }

  /**
   * 获取模板变量（兼容性方法）
   */
  getTemplateVariables(context: PromptContext, language: Language = 'zh'): PromptVariables {
    // 返回默认变量用于兼容性
    return {
      goal: '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。',
      mode: 'full'
    };
  }
}

// 导出单例实例
export const promptTemplateV2 = new PromptTemplateEngineV2();

// 导出便捷函数（异步版本）
export const generateSystemPromptAsync = async (
  context: PromptContext,
  language: Language = 'zh',
  variables: PromptVariables = {}
): Promise<string> => {
  return promptTemplateV2.generateSystemPromptAsync(context, language, variables);
};

// 导出已废弃的同步版本（引导使用异步版本）
export const generateSystemPrompt = (
  context: PromptContext,
  language: Language = 'zh',
  variables: PromptVariables = {}
): string => {
  throw new Error('generateSystemPrompt is deprecated. Use generateSystemPromptAsync instead.');
};

export const getTemplateVariables = (
  context: PromptContext,
  language: Language = 'zh'
): PromptVariables => {
  return promptTemplateV2.getTemplateVariables(context, language);
};