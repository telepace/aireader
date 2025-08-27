/**
 * Prompt Template Engine - 优雅的模板管理系统
 * 
 * 基于现有的 prompts.json 配置，提供动态 prompt 生成能力
 * 支持多语言、模板变量替换和结构化配置管理
 */

import promptsConfig from '../config/prompts.json';
import {
  Language,
  PromptContext,
  PromptVariables,
  SystemPromptConfig,
  IPromptTemplateEngine,
  PromptGenerationOptions,
  PromptValidationResult,
  PromptConfigError,
  PromptsConfig
} from '../types/prompt';

class PromptTemplateEngine implements IPromptTemplateEngine {
  private config: PromptsConfig = promptsConfig as PromptsConfig;

  /**
   * 获取系统 prompt 配置
   */
  getSystemPromptConfig(context: PromptContext, language: Language = 'zh'): SystemPromptConfig | null {
    const contextConfig = this.config[context as keyof typeof this.config];
    if (!contextConfig?.systemPrompt?.[language]) {
      return null;
    }
    return contextConfig.systemPrompt[language];
  }

  /**
   * 生成完整的系统 prompt 文本
   */
  generateSystemPrompt(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): string {
    const config = this.getSystemPromptConfig(context, language);
    if (!config) {
      throw new PromptConfigError(
        `Prompt configuration not found for context: ${context}, language: ${language}`,
        context,
        language
      );
    }

    let prompt = config.goal + '\n\n';

    // 构建步骤说明
    prompt += '每次交互，请严格执行以下3件事：\n';
    
    config.steps.forEach((step, index) => {
      const stepNumber = index + 1;
      let stepTitle = `**${stepNumber}. ${step.title}**`;
      
      if (step.type) {
        stepTitle += ` (type: ${step.type})`;
      }
      
      prompt += stepTitle + ' ' + step.description;
      
      if (step.criteria && step.criteria.length > 0) {
        prompt += '\n';
        if (step.type === 'deepen') {
          prompt += `${step.criteria.length}个选项可以参考以下行动类型：\n`;
          step.criteria.forEach(criteria => {
            prompt += `- ${criteria}\n`;
          });
          prompt += '其他\n';
          prompt += '- 类型选择机制：这些类型不必每个都要出现，可以一个类型有多个选项，某些类型没有选项。最关键的是你根据当前情况非常聪明的评估，最合适我的三个选项是什么，来推荐！\n';
          step.criteria.slice(1).forEach(criteria => {
            prompt += `- ${criteria}\n`;
          });
        } else {
          step.criteria.forEach(criteria => {
            prompt += `- ${criteria}\n`;
          });
        }
      }
      
      if (step.notes && step.notes.length > 0) {
        step.notes.forEach(note => {
          prompt += `- ${note}\n`;
        });
      }
      
      prompt += '\n';
    });

    // 构建格式要求
    if (config.format) {
      prompt += `**格式要求** 第2和第3步的推荐项，必须严格遵循 ${config.format.type.toUpperCase()} 格式`;
      if (config.format.requirements && config.format.requirements.length > 0) {
        prompt += '，' + config.format.requirements.join('，') + '。\n';
      } else {
        prompt += '。\n';
      }
      
      prompt += '\n\n**JSONL 模板:**\n\n---\n';
      
      if (config.format.template && config.format.template.length > 0) {
        config.format.template.forEach(templateItem => {
          prompt += JSON.stringify(templateItem) + '\n';
        });
      }
      
      prompt += '\n\n**约束条件**：不要向用户解释此格式。\n';
      prompt += '输出结构：只需输出聚焦与展开对应的文本。之后一定要**留出空白行符号**，再输出所有JSONL。';
    }

    // 应用变量替换
    return this.applyVariables(prompt, variables);
  }

  /**
   * 应用模板变量替换
   */
  private applyVariables(template: string, variables: PromptVariables): string {
    let result = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, String(value));
    });
    
    return result;
  }

  /**
   * 获取可用的上下文列表
   */
  getAvailableContexts(): string[] {
    return Object.keys(this.config);
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(context: PromptContext): Language[] {
    const contextConfig = this.config[context as keyof typeof this.config];
    if (!contextConfig?.systemPrompt) {
      return [];
    }
    
    return Object.keys(contextConfig.systemPrompt) as Language[];
  }

  /**
   * 验证 prompt 配置完整性
   */
  validateConfig(context: PromptContext, language: Language = 'zh'): boolean {
    try {
      const config = this.getSystemPromptConfig(context, language);
      if (!config) return false;
      
      return !!(
        config.goal &&
        config.steps &&
        Array.isArray(config.steps) &&
        config.steps.length > 0 &&
        config.format
      );
    } catch {
      return false;
    }
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
      const config = this.getSystemPromptConfig(context, language);
      
      if (!config) {
        result.isValid = false;
        result.errors.push(`Configuration not found for context: ${context}, language: ${language}`);
        return result;
      }

      // 验证 goal
      if (!config.goal || config.goal.trim().length === 0) {
        result.isValid = false;
        result.errors.push('Goal is required and cannot be empty');
      }

      // 验证 steps
      if (!config.steps || !Array.isArray(config.steps)) {
        result.isValid = false;
        result.errors.push('Steps must be an array');
      } else if (config.steps.length === 0) {
        result.isValid = false;
        result.errors.push('At least one step is required');
      } else {
        config.steps.forEach((step, index) => {
          if (!step.title) {
            result.errors.push(`Step ${index + 1} is missing title`);
          }
          if (!step.description) {
            result.errors.push(`Step ${index + 1} is missing description`);
          }
        });
      }

      // 验证 format
      if (!config.format) {
        result.isValid = false;
        result.errors.push('Format configuration is required');
      } else {
        if (!config.format.type) {
          result.errors.push('Format type is required');
        }
        if (!config.format.requirements || !Array.isArray(config.format.requirements)) {
          result.warnings.push('Format requirements should be an array');
        }
        if (!config.format.template || !Array.isArray(config.format.template)) {
          result.warnings.push('Format template should be an array');
        }
      }

      if (result.errors.length > 0) {
        result.isValid = false;
      }

    } catch (error) {
      result.isValid = false;
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  /**
   * 使用选项生成 prompt
   */
  generatePromptWithOptions(options: PromptGenerationOptions): string {
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

    return this.generateSystemPrompt(context, language, variables);
  }

  /**
   * 获取 prompt 预览（截断长内容）
   */
  getPromptPreview(context: PromptContext, language: Language = 'zh', maxLength: number = 200): string {
    try {
      const config = this.getSystemPromptConfig(context, language);
      if (!config) return '';
      
      const preview = config.goal;
      if (preview.length <= maxLength) return preview;
      
      return preview.substring(0, maxLength - 3) + '...';
    } catch {
      return '';
    }
  }
}

// 导出单例实例
export const promptTemplate = new PromptTemplateEngine();

// 导出便捷函数
export const generateSystemPrompt = (
  context: PromptContext,
  language: Language = 'zh',
  variables: PromptVariables = {}
): string => {
  return promptTemplate.generateSystemPrompt(context, language, variables);
};

export const getSystemPromptConfig = (
  context: PromptContext,
  language: Language = 'zh'
): SystemPromptConfig | null => {
  return promptTemplate.getSystemPromptConfig(context, language);
};