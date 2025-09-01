/**
 * 统一模板系统 - JavaScript 原生实现
 * 
 * 完全移除 Jinja2 依赖，使用原生 JavaScript 模板字面量
 * 简化架构，提高性能和可靠性
 */

import { Language, PromptContext, PromptVariables } from '../types/prompt';
import { ConceptRecommendationContext } from '../types/concept';

// 模板类型定义
export interface TemplateData {
  mode?: 'full' | 'content' | 'recommendations';
  goal?: string;
  steps?: {
    focus?: { title?: string; description?: string };
    deepen?: { title?: string; description?: string; criteria?: string[] };
    next?: { title?: string; description?: string };
  };
  concept_context?: ConceptRecommendationContext;
}

/**
 * 模板渲染引擎
 */
class TemplateSystem {
  /**
   * 渲染智能推荐模板
   */
  renderSmartRecommendation(data: TemplateData = {}): string {
    const {
      mode = 'full',
      steps = {},
      concept_context
    } = data;

    let template = '';

    // 基础目标声明
    template += '你是一个智能推荐引擎，根据模式参数执行不同的推荐任务。\n\n';
    template += '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。（当我发送一大段长文字时就是复制的长文章）\n\n';

    if (mode === 'full') {
      // 完整推荐模式
      template += '## 📋 操作模式\n\n';
      template += '每次交互，请严格执行以下3件事：\n\n';

      // 步骤1：聚焦与展开
      const focusTitle = steps.focus?.title || '聚焦与展开';
      const focusDesc = steps.focus?.description || '先讲透内容的一个核心关键；再全面概览，让我了解全貌，语言风格清晰易懂。';
      template += `**1. ${focusTitle}**\n${focusDesc}\n\n`;

      // 步骤2：原文深挖
      const deepenTitle = steps.deepen?.title || '原文深挖';
      const deepenDesc = steps.deepen?.description || '推荐3个最有价值的原文精读选项。';
      template += `**2. ${deepenTitle} (type: deepen)**\n${deepenDesc}\n\n`;

      // 步骤3：主题探索
      const nextTitle = steps.next?.title || '主题探索';
      const nextDesc = steps.next?.description || '推荐3本最值得阅读的相关书籍，挑选对我有价值、最不可错过的探索对象。';
      template += `**3. ${nextTitle} (type: next)**\n${nextDesc}\n\n`;

      // 输出格式说明
      template += '**🎯 输出格式：**\n';
      template += '- 先输出聚焦与展开的文本内容\n';
      template += '- 然后**留出空白行**\n';
      template += '- 最后输出6行JSONL数据：3行deepen类型 + 3行next类型\n\n';

    } else if (mode === 'content') {
      // 纯内容分析模式
      template += '你的任务是对当前讨论的内容进行**聚焦与展开**：\n\n';
      
      const focusDesc = steps.focus?.description || '先讲透内容的一个核心关键；全面并深度地展开讲全文内容，目标是看了你的内容，我就吸收了一本书绝大多数的精华内容，感觉只看你的内容就够了，不用再亲自看这本书了。全文能讲的越具体详实越好，但不要废话。';
      template += `**聚焦与展开**\n${focusDesc}\n\n`;

      template += '**输出要求：**\n';
      template += '- 专注于内容的核心要点分析和全面展开\n';
      template += '- 语言风格清晰易懂，具体详实\n';
      template += '- 不需要提供选项推荐或结构化格式输出\n';
      template += '- 目标是让读者通过你的分析就能深度理解原文精华\n\n';

      template += '**风格要求：**\n';
      template += '- 避免过于严肃，保持清楚易懂\n';
      template += '- 重点突出，逻辑清晰\n';
      template += '- 内容充实，有深度有广度\n\n';

    } else if (mode === 'recommendations') {
      // 仅推荐选项模式
      template += '根据提供的内容分析，生成两类推荐选项：\n';
      template += '1. **原文深挖** (type: deepen) - 推荐3个最有价值的原文精读选项\n';
      template += '2. **主题探索** (type: next) - 推荐3本最值得阅读的相关书籍\n\n';
    }

    // 推荐质量标准和智能去重机制仅在需要推荐的模式下添加
    if (mode === 'content') {
      // 在 content 模式下，添加使用说明后返回
      template += '## 💡 使用说明\n\n';
      template += `**当前模式**: ${mode}\n\n`;
      template += '仅执行内容分析，不生成推荐选项';
      return template;
    }

    // 智能去重机制
    if (concept_context && concept_context.avoidanceList.length > 0) {
      template += '## 🧠 智能去重机制\n\n';
      template += '**⚠️ 概念避免列表** - 以下概念已被用户充分掌握，请避免推荐类似内容：\n';
      for (const concept of concept_context.avoidanceList) {
        template += `- ${concept}\n`;
      }
      template += '\n';

      template += '**智能去重策略**：\n';
      template += '- 检查推荐内容是否与避免列表中的概念高度重叠\n';
      template += '- 优先推荐新颖、未探索的概念和角度\n';
      template += '- 如果某个重要概念在避免列表中，可以从更深层或不同角度切入\n';
      template += '- 确保推荐的多样性和互补性\n\n';
    }

    if (concept_context && concept_context.recentConcepts.length > 0) {
      template += '**📋 最近讨论的概念** - 这些是近期接触的概念，尽量避免重复：\n';
      for (const concept of concept_context.recentConcepts) {
        template += `- ${concept}\n`;
      }
      template += '\n';
    }

    if (concept_context && concept_context.preferredCategories.length > 0) {
      template += '**🎯 推荐重点** - 当前用户更需要这些类型的知识：\n';
      for (const category of concept_context.preferredCategories) {
        if (category === 'core') {
          template += '- 核心理论和基础原理\n';
        } else if (category === 'method') {
          template += '- 实用方法和技术工具\n';
        } else if (category === 'application') {
          template += '- 具体应用和实践案例\n';
        } else if (category === 'support') {
          template += '- 背景知识和支撑概念\n';
        }
      }
      template += '\n';
    }

    // 推荐质量标准
    template += '## 📝 推荐质量标准\n\n';
    
    template += '### 原文深挖要求\n';
    template += '- 选项一定要围绕「原文」，原文指的是最近在讨论的书、文章、主题\n';
    template += '- 按逻辑或情节划分，推荐第一、第二、第n部分等\n';
    template += '- 选项标题开头应该是"第一部分:...","第n部分:...", "重点:..."\n';
    template += '- 偏向客观的呈现内容，而不是过于主观的讨论\n';
    template += '- 选项的描述要足够吸引，能勾起用户的兴趣\n';
    if (concept_context && concept_context.avoidanceList.length > 0) {
      template += '- 避免重复已掌握的核心概念\n';
      template += '- 从新的维度或更深层次探讨熟悉话题\n';
    }
    template += '\n';

    template += '### 主题探索要求\n';
    template += '- 选择与当前主题相关但角度不同的优质书籍\n';
    if (concept_context && concept_context.avoidanceList.length > 0) {
      template += '- 避免推荐概念重叠度高的书籍\n';
      template += '- 优先推荐填补知识盲区的内容\n';
    }
    template += '- 确保推荐具有递进性和互补性\n';
    template += '- 挑选对用户有价值、最不可错过的探索对象\n\n';

    // 输出格式约束（content 模式已提前返回，这里只处理 full 和 recommendations）
    if (mode === 'full' || mode === 'recommendations') {
      template += '## 🔧 输出格式约束\n\n';
      template += '**🚨 关键格式约束（必须严格遵守）：**\n\n';
      template += '**✅ 正确格式示例：**\n';
      template += '```\n';
      template += '{"type": "deepen", "content": "第一部分：核心概念解析", "describe": "深入分析作者的主要观点和理论基础。"}\n';
      template += '{"type": "next", "content": "《相关推荐书籍》", "describe": "这本书将为你提供更深入的见解。"}\n';
      template += '```\n\n';

      template += '**必须遵循的规则：**\n';
      template += '- 输出必须是纯净的JSONL格式 - 每行一个独立的JSON对象\n';
      template += '- 字段名必须使用 "content" 和 "describe"\n';
      template += '- 不要添加任何包装对象、数组或代码块标记\n';
      template += '- 不要在JSON外添加引号、注释或解释文字\n';
      template += '- 每一行必须是完整有效的JSON对象\n';
      template += '- **🔥 字符串值必须正确转义特殊字符：中文引号""和\'\'必须替换为英文引号\\"或\\\'**\n';
      template += '- **⚠️ JSON字符串中如果包含引号，必须使用反斜杠转义：\\" 或 \\\'**\n\n';

      template += '**JSONL 模板:**\n';
      template += '{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n';
      template += '{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n';
      template += '{"type": "deepen", "content": "深挖原文的选项标题", "describe": "对该选项的详细、吸引人的描述。"}\n';
      template += '{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n';
      template += '{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n';
      template += '{"type": "next", "content": "推荐书籍的标题", "describe": "对这本书的详细、吸引人的描述。"}\n\n';
    }

    // 使用说明（content 模式已提前返回）
    template += '## 💡 使用说明\n\n';
    template += `**当前模式**: ${mode}\n\n`;
    
    if (mode === 'full') {
      template += '执行完整推荐流程：内容分析 + 推荐选项生成';
    } else if (mode === 'recommendations') {
      template += '仅生成推荐选项，不进行内容分析';
    } else {
      template += '默认执行完整推荐流程';
    }

    return template;
  }

  /**
   * 渲染知识图谱模板
   */
  renderKnowledgeGraph(): string {
    return `你是一个负责维护"递归思维导图"的助手，专门生成优雅的层级概念结构。

你将接收三个输入：
- previous_map：之前的思维导图 JSON（如果是第一次提问，若无则为 null 或空字符串）
- book_title：书名（字符串）
- latest_reply：用户点击问题后，LLM 的最新回复（字符串）

## 🎯 核心任务

基于 previous_map 和 latest_reply，生成完整的递归思维导图结构。每次可以添加多个相关的概念节点，形成富有层次的知识树。

## 📋 数据结构（必须严格遵守）

\`\`\`json
{
  "id": "string",        // 唯一标识（UUID或递增ID）
  "name": "string",      // 概念名称（清晰、具体、有吸引力）
  "children": [          // 子概念数组（递归结构）
    {
      "id": "string",
      "name": "string", 
      "children": [ ... ]
    }
  ]
}
\`\`\`

## 🎨 生成规则

1. **根节点创建**：如果 previous_map 为空，创建根节点（id = UUID，name = 从latest_reply提取的主题）
2. **概念提取**：从 latest_reply 中识别2-4个核心概念，按重要性和逻辑层次组织
3. **层级结构**：相关概念可以嵌套为子节点，形成自然的层级关系
4. **节点命名**：使用具体、生动的描述而非抽象名词（如"层叠文本：过去与现在的冲突融合"而非"历史"）
5. **去重合并**：如果概念相似，智能合并而非重复创建
6. **保持一致**：保留 previous_map 中的所有现有节点
7. **平衡发展**：优先扩展重要概念，避免单一分支过度发展

## 📝 输出要求

- **仅输出JSON对象，无额外文字**
- **确保JSON格式正确**
- **每个节点必须有id、name、children字段**
- **children可以为空数组**

## 🌰 示例

**示例1 - 初次创建：**

输入：
- previous_map = null
- book_title = "加德满都"  
- latest_reply = "加德满都这座城市就像一个层叠文本(Palimpsest)，过去与现在以冲突、融合和遮蔽的方式纠缠共存..."

输出：
\`\`\`json
{
  "id": "d588a12a-a29e-4fe5-8d60-d4e3e3012c7e",
  "name": "《加德满都》",
  "children": [
    {
      "id": "root-1", 
      "name": "层叠文本 (Palimpsest)：过去与现在以冲突、融合和遮蔽的方式纠缠共存",
      "children": []
    }
  ]
}
\`\`\`

**示例2 - 递归扩展：**

输入：
- previous_map = 上述结果
- latest_reply = "在这座城市中，古老的寺庙与现代建筑并存，传统文化与全球化潮流交织..."

输出：
\`\`\`json
{
  "id": "d588a12a-a29e-4fe5-8d60-d4e3e3012c7e",
  "name": "《加德满都》", 
  "children": [
    {
      "id": "root-1",
      "name": "层叠文本 (Palimpsest)：过去与现在以冲突、融合和遮蔽的方式纠缠共存",
      "children": [
        {
          "id": "root-1-1",
          "name": "空间层叠：古老寺庙与现代建筑的并存对话", 
          "children": []
        },
        {
          "id": "root-1-2", 
          "name": "文化层叠：传统文化与全球化潮流的交织博弈",
          "children": []
        }
      ]
    }
  ]
}
\`\`\``;
  }

  /**
   * 渲染内容生成模板
   */
  renderContentGeneration(): string {
    const goal = '我的目标是「精读」当前讨论的内容（文章或书籍），并不断切换对象。（当我发送一大段长文字时就是复制的长文章）';
    
    return `${goal}

你的任务是对当前讨论的内容进行**聚焦与展开**：

**聚焦与展开**
先讲透内容的一个核心关键；全面并深度地展开讲全文内容，目标是看了你的内容，我就吸收了一本书绝大多数的精华内容，感觉只看你的内容就够了，不用再亲自看这本书了。全文能讲的越具体详实越好，但不要废话。

**输出要求：**
- 专注于内容的核心要点分析和全面展开
- 语言风格清晰易懂，具体详实
- 不需要提供选项推荐或JSONL格式输出
- 目标是让读者通过你的分析就能深度理解原文精华

**风格要求：**
- 避免过于严肃，保持清楚易懂
- 重点突出，逻辑清晰
- 内容充实，有深度有广度`;
  }

  /**
   * 主要入口：根据上下文渲染模板
   */
  async renderTemplate(
    context: PromptContext,
    language: Language = 'zh',
    variables: PromptVariables = {}
  ): Promise<string> {
    console.log(`📄 Rendering template: ${context}.system.${language}`, variables);

    switch (context) {
      case 'smartRecommendation':
        return this.renderSmartRecommendation(variables as TemplateData);
      
      case 'knowledgeGraph':
        return this.renderKnowledgeGraph();
      
      case 'contentGeneration':
        return this.renderContentGeneration();
      
      default:
        throw new Error(`Unsupported template context: ${context}`);
    }
  }

  /**
   * 获取可用的上下文列表
   */
  getAvailableContexts(): PromptContext[] {
    return ['smartRecommendation', 'knowledgeGraph', 'contentGeneration'];
  }

  /**
   * 验证模板上下文是否存在
   */
  hasTemplate(context: PromptContext): boolean {
    return this.getAvailableContexts().includes(context);
  }
}

// 导出单例实例
export const templateSystem = new TemplateSystem();

// 便捷函数
export const renderTemplate = async (
  context: PromptContext,
  language: Language = 'zh',
  variables: PromptVariables = {}
): Promise<string> => {
  return templateSystem.renderTemplate(context, language, variables);
};

export const hasTemplate = (context: PromptContext): boolean => {
  return templateSystem.hasTemplate(context);
};

export const getAvailableTemplates = (): PromptContext[] => {
  return templateSystem.getAvailableContexts();
};