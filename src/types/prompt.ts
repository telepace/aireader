/**
 * Prompt 系统类型定义
 * 
 * 为 prompt 模板引擎提供完整的 TypeScript 类型支持
 */

// 基础类型定义
export type Language = 'zh' | 'en';
export type PromptContext = 'nextStepChat' | 'contentGeneration' | 'nextStepJsonl';
export type StepType = 'deepen' | 'next';

// 变量类型定义
export interface PromptVariables {
  [key: string]: any;
}

// Prompt 步骤接口定义
export interface PromptStep {
  title: string;
  description: string;
  type?: StepType;
  criteria?: string[];
  notes?: string[];
}

// 格式模板接口定义
export interface FormatTemplate {
  type: string;
  requirements: string[];
  template: TemplateItem[];
}

// 模板项接口定义
export interface TemplateItem {
  type: StepType;
  content: string;
  describe: string;
}

// 系统 Prompt 配置接口定义
export interface SystemPromptConfig {
  goal: string;
  steps: PromptStep[];
  format: FormatTemplate;
}

// 多语言 Prompt 配置接口定义
export interface MultiLanguagePromptConfig {
  [key: string]: SystemPromptConfig; // key 为 Language 类型
}

// Prompt 上下文配置接口定义
export interface PromptContextConfig {
  systemPrompt: MultiLanguagePromptConfig;
}

// 完整的 Prompts 配置接口定义
export interface PromptsConfig {
  [key: string]: PromptContextConfig; // key 为 PromptContext 类型
}

// Prompt 引擎接口定义
export interface IPromptTemplateEngine {
  getSystemPromptConfig(context: PromptContext, language?: Language): SystemPromptConfig | null;
  generateSystemPrompt(context: PromptContext, language?: Language, variables?: PromptVariables): string;
  getAvailableContexts(): string[];
  getSupportedLanguages(context: PromptContext): Language[];
  validateConfig(context: PromptContext, language?: Language): boolean;
}

// Prompt 生成选项接口定义
export interface PromptGenerationOptions {
  context: PromptContext;
  language?: Language;
  variables?: PromptVariables;
  validate?: boolean;
}

// Prompt 验证结果接口定义
export interface PromptValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// 错误类型定义
export class PromptConfigError extends Error {
  constructor(
    message: string,
    public context: PromptContext,
    public language: Language
  ) {
    super(message);
    this.name = 'PromptConfigError';
  }
}

export class PromptValidationError extends Error {
  constructor(
    message: string,
    public errors: string[]
  ) {
    super(message);
    this.name = 'PromptValidationError';
  }
}