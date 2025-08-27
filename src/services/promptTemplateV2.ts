/**
 * Prompt Template Engine V2 - 基于 Jinja2 模板的优雅实现
 * 
 * 使用 .j2 模板文件和配置文件的分离设计
 * 支持 Jinja2 语法、变量替换、条件语句和循环
 */

import { jinjaEngine } from './jinjaTemplateEngine';
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
  private jinjaEngine = jinjaEngine;

  /**
   * 生成完整的系统 prompt 文本
   */
  async generateSystemPromptAsync(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): Promise<string> {
    try {
      return await this.jinjaEngine.renderTemplate(context, language, variables);
    } catch (error) {
      throw new PromptConfigError(
        `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`,
        context,
        language
      );
    }
  }

  /**
   * 同步版本的 prompt 生成（使用内置模板）
   */
  generateSystemPrompt(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): string {
    try {
      const defaultVars = this.jinjaEngine.getTemplateVariables(context, language);
      const mergedVars = { ...defaultVars, ...variables };
      
      // 使用内置模板进行渲染
      const template = this.getInlineTemplate(context, language);
      return this.jinjaEngine.render(template, mergedVars);
    } catch (error) {
      throw new PromptConfigError(
        `Failed to generate prompt: ${error instanceof Error ? error.message : String(error)}`,
        context,
        language
      );
    }
  }

  /**
   * 获取内置模板（临时方案）
   */
  private getInlineTemplate(context: PromptContext, language: Language): string {
    if (context === 'nextStepChat' && language === 'zh') {
      return `{{ goal | default('我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。（当我发送一大段长文字时就是复制的长文章）') }}

每次交互，请严格执行以下3件事：

**1. {{ steps.focus.title | default('聚焦与展开') }}**
{{ steps.focus.description | default('先讲透内容的一个核心关键；再全面概览，让我了解全貌，语言风格清晰易懂。') }}

**2. {{ steps.deepen.title | default('原文深挖') }}**
{{ steps.deepen.description | default('推荐3个最有价值的原文精读选项。') }}
{% if steps.deepen.criteria %}
{{ steps.deepen.criteria.length }}个选项可以参考以下行动类型：
{% for criterion in steps.deepen.criteria %}
- {{ criterion }}
{% endfor %}
其他
{% endif %}
- 类型选择机制：这些类型不必每个都要出现，可以一个类型有多个选项，某些类型没有选项。最关键的是你根据当前情况非常聪明的评估，最合适我的三个选项是什么，来推荐！
- 选项的描述要足够吸引，能勾起我的兴趣
- 选项一定要围绕「原文」，原文指的是最近在讨论的书、文章、主题。比如我们当前在讨论的是某一本书，则精读选项一定也是围绕该书原文的，而不是脱离原文的主观讨论。
- 当讨论新书时，即精读对象变化了，不要老对比提及先前的精读对象。比如最初在精读一篇文章，后来在精读一本新书，则不要老对比之前文章的内容和新书的内容。只专注于当前的精读对象。注意，对象是整个原文，而不是我们当前讨论的原文的子话题（不要围绕子话题出所有精读选项，应该围绕原文出选项）。

**3. {{ steps.next.title | default('主题探索') }}**
{{ steps.next.description | default('推荐3本最值得阅读的相关书籍，挑选对我有价值、最不可错过的探索对象，要围绕当前主题，以这些维度做优先级的排序。选项的描述要足够吸引我，能勾起我的兴趣') }}

═══ 格式输出要求 ═══

第2和第3步的推荐选项，必须严格遵循 JSONL 格式输出。

**输出流程**：
1. 首先完成第1步的文本内容
2. 空一行
3. 输出完整的JSONL数据，每行一个JSON对象

**JSONL 输出规范**：
{% for template_item in format.template %}
{{ template_item | json }}
{% endfor %}

**JSON格式严格要求**：
- 字段名用双引号：{"type": "deepen"} ✅  {"type("deepen" ❌
- 冒号后有空格：{"type": "next"} ✅  {"type":"next"} ❌  
- 字符串值用双引号：{"content": "标题"} ✅  {"content": '标题'} ❌
- 每个JSON对象独立一行，不要换行
- 只允许这些type值：content_complete, deepen, next
- JSON格式：{"type": "xxx", "content": "xxx", "describe": "xxx"}
- 不要添加代码块标记或解释文字
- 检查括号配对：{ } 必须匹配

输出结构：文本内容 + 空行 + JSONL数据`;
    }

    if (context === 'nextStepChat' && language === 'en') {
      return `{{ goal | default('My goal is to "deep read" the current content (articles or books) being discussed, and continuously switch between subjects.') }}

For each interaction, please strictly execute the following 3 things:

**1. {{ steps.focus.title | default('Focus & Expand') }}**
{{ steps.focus.description | default('First thoroughly explain a core key point of the content; then provide a comprehensive overview, using clear and understandable language.') }}

**2. {{ steps.deepen.title | default('Deep Dive') }}**
{{ steps.deepen.description | default('Recommend 3 most valuable deep reading options.') }}
{% if steps.deepen.criteria %}
The {{ steps.deepen.criteria.length }} options can reference the following action types:
{% for criterion in steps.deepen.criteria %}
- {{ criterion }}
{% endfor %}
Others
{% endif %}
- Type selection mechanism: These types don't all need to appear, there can be multiple options of one type, and some types may have no options. The key is to intelligently evaluate based on the current situation and recommend the three most suitable options for me!
- Option descriptions should be engaging enough to spark my interest
- Options must focus on the "original text", which refers to the book, article, or topic recently being discussed.
- When discussing a new book, don't keep comparing and mentioning previous deep reading subjects. Focus only on the current deep reading subject.

**3. {{ steps.next.title | default('Topic Exploration') }}**
{{ steps.next.description | default('Recommend 3 most valuable related books to read') }}

═══ Format Output Requirements ═══

Steps 2 and 3 recommendations must strictly follow JSONL format output.

**Output Process**:
1. First complete the text content for step 1
2. Leave a blank line
3. Output complete JSONL data, one JSON object per line

**JSONL Output Standards**:
{% for template_item in format.template %}
{{ template_item | json }}
{% endfor %}

**JSON Format Strict Requirements**:
- Field names in double quotes: {"type": "deepen"} ✅  {"type("deepen" ❌
- Space after colon: {"type": "next"} ✅  {"type":"next"} ❌  
- String values in double quotes: {"content": "title"} ✅  {"content": 'title'} ❌
- Each JSON object on separate line, no line breaks
- Only allow type values: content_complete, deepen, next
- JSON format: {"type": "xxx", "content": "xxx", "describe": "xxx"}
- No code block markers or explanatory text
- Check bracket pairs: { } must match

Output structure: Text content + blank line + JSONL data`;
    }

    throw new PromptConfigError(`Template not found for context: ${context}, language: ${language}`, context, language);
  }

  /**
   * 获取系统 prompt 配置（为了兼容性）
   */
  getSystemPromptConfig(context: PromptContext, language: Language = 'zh') {
    const variables = this.jinjaEngine.getTemplateVariables(context, language);
    
    // 返回兼容格式
    return {
      goal: variables.goal || '',
      steps: variables.steps || [],
      format: variables.format || { type: 'jsonl', requirements: [], template: [] }
    };
  }

  /**
   * 获取可用的上下文列表
   */
  getAvailableContexts(): string[] {
    return ['nextStepChat'];
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(context: PromptContext): Language[] {
    return ['zh', 'en'];
  }

  /**
   * 验证 prompt 配置完整性
   */
  validateConfig(context: PromptContext, language: Language = 'zh'): boolean {
    try {
      const variables = this.jinjaEngine.getTemplateVariables(context, language);
      return Boolean(variables.goal && variables.steps && variables.format);
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
      const variables = this.jinjaEngine.getTemplateVariables(context, language);
      
      if (!variables.goal) {
        result.errors.push('Goal is missing');
      }
      
      if (!variables.steps) {
        result.errors.push('Steps configuration is missing');
      }
      
      if (!variables.format) {
        result.errors.push('Format configuration is missing');
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
      const variables = this.jinjaEngine.getTemplateVariables(context, language);
      const preview = variables.goal as string || '';
      
      if (preview.length <= maxLength) return preview;
      return preview.substring(0, maxLength - 3) + '...';
    } catch {
      return '';
    }
  }

  /**
   * 自定义变量渲染
   */
  renderWithCustomVariables(
    context: PromptContext,
    language: Language = 'zh',
    customVariables: PromptVariables = {}
  ): string {
    return this.generateSystemPrompt(context, language, customVariables);
  }

  /**
   * 获取模板变量
   */
  getTemplateVariables(context: PromptContext, language: Language = 'zh'): PromptVariables {
    return this.jinjaEngine.getTemplateVariables(context, language);
  }
}

// 导出单例实例
export const promptTemplateV2 = new PromptTemplateEngineV2();

// 导出便捷函数
export const generateSystemPrompt = (
  context: PromptContext,
  language: Language = 'zh',
  variables: PromptVariables = {}
): string => {
  return promptTemplateV2.generateSystemPrompt(context, language, variables);
};

export const getTemplateVariables = (
  context: PromptContext,
  language: Language = 'zh'
): PromptVariables => {
  return promptTemplateV2.getTemplateVariables(context, language);
};