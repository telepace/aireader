/**
 * Jinja2 模板引擎 - JavaScript 实现
 * 
 * 支持 Jinja2 语法的子集：
 * - 变量替换: {{ variable }}
 * - 过滤器: {{ variable | filter }}
 * - 条件语句: {% if condition %} ... {% endif %}
 * - 循环语句: {% for item in list %} ... {% endfor %}
 * - 默认值: {{ variable | default('default_value') }}
 */

import { Language, PromptContext, PromptVariables } from '../types/prompt';
import promptVariables from '../config/promptVariables.json';

export interface TemplateFilter {
  (value: any, ...args: any[]): any;
}

export interface TemplateFilters {
  [name: string]: TemplateFilter;
}

export class JinjaTemplateEngine {
  private filters: TemplateFilters;
  private variablesConfig = promptVariables;

  constructor() {
    this.filters = this.createDefaultFilters();
  }

  /**
   * 创建默认过滤器
   */
  private createDefaultFilters(): TemplateFilters {
    return {
      default: (value: any, defaultValue: any) => {
        return value !== undefined && value !== null && value !== '' ? value : defaultValue;
      },
      upper: (value: string) => String(value).toUpperCase(),
      lower: (value: string) => String(value).toLowerCase(),
      length: (value: any[]) => Array.isArray(value) ? value.length : 0,
      join: (value: any[], separator: string = ', ') => {
        return Array.isArray(value) ? value.join(separator) : String(value);
      },
      json: (value: any) => JSON.stringify(value),
      trim: (value: string) => String(value).trim()
    };
  }

  /**
   * 渲染模板
   */
  render(template: string, variables: PromptVariables = {}): string {
    let result = template;

    // 先处理控制语句（if/for）
    result = this.processControlStatements(result, variables);

    // 再处理变量替换
    result = this.processVariables(result, variables);

    return result;
  }

  /**
   * 处理控制语句（if/for）
   */
  private processControlStatements(template: string, variables: PromptVariables): string {
    let result = template;

    // 处理 {% if %} 语句
    result = this.processIfStatements(result, variables);

    // 处理 {% for %} 语句
    result = this.processForStatements(result, variables);

    return result;
  }

  /**
   * 处理 if 语句
   */
  private processIfStatements(template: string, variables: PromptVariables): string {
    const ifRegex = /{% if ([^%]+) %}([\s\S]*?){% endif %}/g;
    
    return template.replace(ifRegex, (match, condition, content) => {
      const shouldRender = this.evaluateCondition(condition.trim(), variables);
      return shouldRender ? content : '';
    });
  }

  /**
   * 处理 for 语句
   */
  private processForStatements(template: string, variables: PromptVariables): string {
    const forRegex = /{% for (\w+) in ([^%]+) %}([\s\S]*?){% endfor %}/g;
    
    return template.replace(forRegex, (match, itemVar, listVar, content) => {
      const list = this.getNestedValue(variables, listVar.trim());
      
      if (!Array.isArray(list)) {
        return '';
      }

      return list.map((item, index) => {
        const loopVars = {
          ...variables,
          [itemVar]: item,
          'loop': {
            index: index,
            index0: index,
            first: index === 0,
            last: index === list.length - 1,
            length: list.length
          }
        };
        
        return this.processVariables(content, loopVars);
      }).join('');
    });
  }

  /**
   * 处理变量替换
   */
  private processVariables(template: string, variables: PromptVariables): string {
    const varRegex = /{{ ([^}]+) }}/g;
    
    return template.replace(varRegex, (match, expression) => {
      try {
        return this.evaluateExpression(expression.trim(), variables);
      } catch (error) {
        console.warn(`Template variable evaluation failed: ${expression}`, error);
        return ''; // 返回空字符串而不是原始内容
      }
    });
  }

  /**
   * 评估表达式（支持过滤器）
   */
  private evaluateExpression(expression: string, variables: PromptVariables): string {
    // 检查是否有过滤器
    const parts = expression.split('|').map(part => part.trim());
    const variablePart = parts[0];
    const filterParts = parts.slice(1);

    // 获取变量值
    let value = this.getNestedValue(variables, variablePart);

    // 应用过滤器
    for (const filterPart of filterParts) {
      const [filterName] = filterPart.split('(')[0].split(' ');
      const filter = this.filters[filterName];

      if (filter) {
        // 处理过滤器参数
        const filterArgs = this.parseFilterArgs(filterPart);
        value = filter(value, ...filterArgs);
      }
    }

    return String(value !== undefined && value !== null ? value : '');
  }

  /**
   * 解析过滤器参数
   */
  private parseFilterArgs(filterPart: string): any[] {
    const argsMatch = filterPart.match(/\((.*)\)/);
    if (!argsMatch) {
      // 检查是否有空格分隔的参数
      const parts = filterPart.split(' ').slice(1);
      return parts.length > 0 ? parts.map(arg => this.parseValue(arg)) : [];
    }

    const argsString = argsMatch[1];
    if (!argsString.trim()) return [];
    
    const args = argsString.split(',').map(arg => this.parseValue(arg.trim()));
    return args;
  }

  /**
   * 解析值（字符串、数字、布尔值）
   */
  private parseValue(value: string): any {
    // 字符串（单引号或双引号）
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // 数字
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return parseFloat(value);
    }

    // 布尔值
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;
    if (value === 'undefined') return undefined;

    return value;
  }

  /**
   * 评估条件
   */
  private evaluateCondition(condition: string, variables: PromptVariables): boolean {
    // 简单的条件评估
    const value = this.getNestedValue(variables, condition);
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    return Boolean(value);
  }

  /**
   * 获取嵌套属性值
   */
  private getNestedValue(obj: any, path: string): any {
    if (!path) return undefined;
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  /**
   * 加载模板变量配置
   */
  getTemplateVariables(context: PromptContext, language: Language = 'zh'): PromptVariables {
    const contextConfig = this.variablesConfig[context as keyof typeof this.variablesConfig];
    if (!contextConfig) return {};
    
    const languageConfig = contextConfig[language as keyof typeof contextConfig];
    if (!languageConfig) return {};
    
    return languageConfig as PromptVariables;
  }

  /**
   * 渲染模板文件（模拟异步加载）
   */
  async renderTemplate(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): Promise<string> {
    // 在实际实现中，这里应该动态加载 .j2 文件
    // 为了简化，我们直接返回内置模板
    const template = this.getInlineTemplate(context, language);
    const defaultVars = this.getTemplateVariables(context, language);
    const mergedVars = { ...defaultVars, ...variables };
    
    return this.render(template, mergedVars);
  }

  /**
   * 获取内置模板（临时方案，实际应该从文件加载）
   */
  private getInlineTemplate(context: PromptContext, language: Language): string {
    // 这里应该从实际的 .j2 文件加载模板
    // 目前使用内联模板，与 promptTemplateV2.ts 保持一致
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
    
    return '';
  }

  /**
   * 添加自定义过滤器
   */
  addFilter(name: string, filter: TemplateFilter): void {
    this.filters[name] = filter;
  }

  /**
   * 获取可用过滤器列表
   */
  getAvailableFilters(): string[] {
    return Object.keys(this.filters);
  }
}

// 导出单例实例
export const jinjaEngine = new JinjaTemplateEngine();