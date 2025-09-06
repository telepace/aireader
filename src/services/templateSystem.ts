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

    // 已读内容避免机制
    if (concept_context) {
      template += '## 🧠 已读内容避免机制\n\n';
      
      // 思维导图已读节点
      if (concept_context.mindMapConcepts && concept_context.mindMapConcepts.length > 0) {
        template += '**🗺️ 思维导图已读节点** - 用户已在思维导图中探索过这些主题，请避免推荐相关内容：\n';
        for (const concept of concept_context.mindMapConcepts) {
          template += `- ${concept}\n`;
        }
        template += '\n';
      }

      // 已掌握概念列表
      if (concept_context.avoidanceList && concept_context.avoidanceList.length > 0) {
        template += '**⚠️ 已掌握概念** - 用户已充分掌握这些概念，请避免重复：\n';
        for (const concept of concept_context.avoidanceList) {
          template += `- ${concept}\n`;
        }
        template += '\n';
      }

      template += '**🎯 推荐策略**：\n';
      template += '- 优先推荐全新的、未被探索的概念和角度\n';
      template += '- 避免与已读节点主题重叠\n';
      template += '- 确保推荐的6个选项都是新鲜内容\n\n';
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
    template += '- 为每个推荐选项设计独特且吸引人的标题，突出核心价值和学习收获\n';
    template += '- 避免使用机械化的"第一部分"、"第二部分"等编号格式\n';
    template += '- 避免直接复制或重述正文中已出现的章节标题和小标题\n';
    template += '- 使用动作导向和价值导向的标题，如"深挖核心原理"、"探索关键案例"、"解析实战方法"\n';
    template += '- 偏向客观的呈现内容，而不是过于主观的讨论\n';
    template += '- 选项的描述要足够吸引，能勾起用户的兴趣，强调独特见解和深度价值\n';
    if (concept_context && concept_context.mindMapConcepts.length > 0) {
      template += '- **避免推荐思维导图已读节点相关的主题**\n';
    }
    template += '\n';

    template += '### 主题探索要求\n';
    template += '- 选择与当前主题相关但角度不同的优质书籍\n';
    if (concept_context && concept_context.mindMapConcepts.length > 0) {
      template += '- **避免推荐与思维导图已读节点主题重叠的书籍**\n';
    }
    template += '- 确保推荐具有递进性和互补性\n';
    template += '- 挑选对用户有价值、最不可错过的探索对象\n\n';

    // 输出格式约束（content 模式已提前返回，这里只处理 full 和 recommendations）
    if (mode === 'full' || mode === 'recommendations') {
      template += '## 🔧 输出格式约束\n\n';
      template += '**🚨 关键格式约束（必须严格遵守）：**\n\n';
      template += '**✅ 正确格式示例：**\n';
      template += '```\n';
      template += '{"type": "deepen", "content": "深挖核心逻辑", "describe": "剖析作者思维框架的底层逻辑，揭示概念背后的深层原理。"}\n';
      template += '{"type": "deepen", "content": "解构关键案例", "describe": "通过具体案例分析，理解理论在实践中的具体应用。"}\n';
      template += '{"type": "next", "content": "《思考，快与慢》丹尼尔·卡尼曼", "describe": "诺贝尔经济学奖得主的经典之作，带你深入理解决策背后的心理机制。"}\n';
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
      template += '{"type": "deepen", "content": "动作导向的深挖标题", "describe": "突出独特价值和深度见解的吸引人描述。"}\n';
      template += '{"type": "deepen", "content": "价值导向的探索标题", "describe": "强调学习收获和核心价值的具体描述。"}\n';
      template += '{"type": "deepen", "content": "洞察导向的分析标题", "describe": "展现深层思考和关键洞察的精彩描述。"}\n';
      template += '{"type": "next", "content": "《具体书名》作者", "describe": "突出这本书独特价值和与当前话题关联性的推荐理由。"}\n';
      template += '{"type": "next", "content": "《具体书名》作者", "describe": "解释为什么这本书值得阅读，它将带来什么独特收获。"}\n';
      template += '{"type": "next", "content": "《具体书名》作者", "describe": "说明这本书如何补充和深化当前主题的理解。"}\n\n';
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
   * 渲染推荐型知识图谱模板
   */
  renderKnowledgeGraph(variables: PromptVariables = {}): string {
    return `你是一个负责维护"推荐型思维导图"的智能助手，专门生成具有推荐功能的层级概念结构。

你将接收三个输入：
- previous_map：之前的思维导图 JSON（如果是第一次提问，若无则为 null 或空字符串）
- book_title：书名（字符串）
- latest_reply：用户点击问题后，LLM 的最新回复（字符串）

## 🎯 核心任务

基于 previous_map 和 latest_reply，生成智能推荐型思维导图结构。图谱 = 过去（explored）+ 现在（current）+ 未来（recommended），每个节点都有明确的状态和推荐信息。

## ⚠️ 增量更新原则（重要）

**如果 previous_map 不为空**：
- **保持原有结构**：完整保留 previous_map 中的所有已存在节点
- **只添加新内容**：基于 latest_reply 添加新的概念节点，不要删除或完全替换原有节点
- **状态更新**：可以更新节点的 status（如 recommended → current → explored）和 exploration_depth
- **补充推荐**：为新的 explored 节点添加推荐，现有推荐保持不变
- **渐进式建构**：每次对话都在现有概念地图基础上进行增量补充，形成渐进式知识建构

**如果 previous_map 为空**：
- 按照标准流程创建全新的概念地图

## 📋 推荐型数据结构（必须严格遵守）

\`\`\`json
{
  "id": "string",                    // 唯一标识（UUID或递增ID）
  "name": "string",                  // 精准名词化概念名（2-6个字，如"流水线"、"现实扭曲场"）
  "type": "concept|person|method|case", // 节点类型
  
  // === 状态系统 ===
  "status": "explored|current|recommended|potential", // 节点状态
  "exploration_depth": 0.0-1.0,     // 探索深度（0=未触及，1=深度讨论）
  "last_visited": "timestamp",       // 最后访问时间戳
  
  // === 推荐引擎数据 ===
  "relevance_score": 0.0-1.0,       // 与当前话题相关度
  "importance_weight": 0.0-1.0,     // 在整体知识图谱中的重要性
  "user_interest": 0.0-1.0,         // 基于用户行为的兴趣预测
  
  // === 语义关联 ===
  "semantic_tags": ["系统思维", "创新", "领导力"], // 语义标签
  "dependencies": ["node_id_1", "node_id_2"],      // 理解此节点需要先理解的节点
  "related_nodes": [                 // 跨层级的语义关联
    {
      "node_id": "string",
      "relation_type": "contrast|supplement|example|application",
      "strength": 0.0-1.0
    }
  ],
  
  // === 推荐系统 ===
  "recommendations": [               // 基于此节点生成的推荐
    {
      "id": "rec_node_id",
      "name": "推荐节点名",
      "reason": "因为您对X感兴趣，推荐了解Y",
      "confidence": 0.0-1.0,         // 推荐置信度
      "trigger_condition": "当探索深度>0.6时显示"
    }
  ],
  
  // === 传统递归结构（保持兼容） ===
  "children": [...]                  // 子概念数组（递归结构）
}
\`\`\`

## 🎨 智能生成规则

### 节点命名规则（Google地图式精准定位）
- **长度**: 2-6个字的名词或名词短语
- **精准性**: 像地标一样，听到名字就知道具体指什么
- **可点击性**: 让人产生"想了解更多"的冲动
- **命名模式**:
  - 人物类: "福特" "乔布斯" "马斯克"
  - 概念类: "流水线" "现实扭曲场" "第一性原理"
  - 方法类: "垂直整合" "系统思维" "闭环生态"
  - 案例类: "T型车" "iPhone" "特斯拉工厂"

### 状态流转逻辑
- **potential → recommended**: 相关节点被探索且exploration_depth > 0.3
- **recommended → current**: 用户点击节点，系统开始生成该节点内容
- **current → explored**: 节点内容生成完成，exploration_depth基于内容计算

### 推荐算法规则
1. **基础相关度** (40%): 与当前节点的语义相似度
2. **用户兴趣预测** (30%): 基于用户行为模式预测
3. **探索时机** (20%): 是否是探索此节点的好时机
4. **知识图谱重要性** (10%): 节点在整体图谱中的重要性

### 推荐生成策略
- 每个explored节点自动生成2-3个recommended节点
- 推荐节点应体现不同角度和层次：对比、补充、应用、案例
- 推荐置信度>0.7的节点优先显示
- 避免推荐已经explored的相似概念

## 📝 输出要求

- **仅输出JSON对象，无额外文字**
- **确保JSON格式正确**
- **每个节点必须包含完整的推荐型字段**
- **status必须准确反映节点的探索状态**
- **recommendations数组在explored节点中不能为空**
- **🔥 重要：保持增量更新原则 - 不要颠覆原有概念地图结构，只进行补充和状态更新**

## 🌰 推荐型示例

**示例1 - 初次创建：**

输入：
- previous_map = null
- book_title = "新会话"  
- latest_reply = "好的，我们立刻从具体的人物切入，将之前讨论的框架用鲜活的血肉填满。我们将聚焦于三位横跨不同时代、但精神内核高度一致的变革者：**亨利·福特**、**史蒂夫·乔布斯**和**埃隆·马斯克**..."

输出：
\`\`\`json
{
  "id": "root",
  "name": "变革者",
  "type": "concept",
  "status": "current",
  "exploration_depth": 0.8,
  "last_visited": "2024-01-15T10:30:00Z",
  "relevance_score": 1.0,
  "importance_weight": 0.9,
  "user_interest": 0.8,
  "semantic_tags": ["领导力", "创新", "系统思维"],
  "dependencies": [],
  "related_nodes": [],
  "recommendations": [
    {
      "id": "rec_chinese_innovators", 
      "name": "中国变革者",
      "reason": "对比东西方变革模式的差异",
      "confidence": 0.8,
      "trigger_condition": "当探索深度>0.7时显示"
    }
  ],
  "children": [
    {
      "id": "ford",
      "name": "福特",
      "type": "person",
      "status": "explored",
      "exploration_depth": 0.9,
      "last_visited": "2024-01-15T10:25:00Z",
      "relevance_score": 0.85,
      "importance_weight": 0.8,
      "user_interest": 0.7,
      "semantic_tags": ["效率", "大规模生产", "系统化"],
      "dependencies": [],
      "related_nodes": [
        {"node_id": "jobs", "relation_type": "contrast", "strength": 0.6}
      ],
      "recommendations": [
        {
          "id": "rec_toyota",
          "name": "丰田生产方式",
          "reason": "福特流水线的现代进化",
          "confidence": 0.8,
          "trigger_condition": "已探索福特"
        }
      ],
      "children": [
        {
          "id": "assembly_line",
          "name": "流水线",
          "type": "method",
          "status": "explored",
          "exploration_depth": 0.8,
          "semantic_tags": ["效率", "标准化"],
          "recommendations": [],
          "children": []
        },
        {
          "id": "five_dollar_wage",
          "name": "5美元日薪",
          "type": "case",
          "status": "explored", 
          "exploration_depth": 0.7,
          "semantic_tags": ["商业策略", "闭环生态"],
          "recommendations": [],
          "children": []
        }
      ]
    },
    {
      "id": "jobs",
      "name": "乔布斯",
      "type": "person",
      "status": "explored",
      "exploration_depth": 0.9,
      "semantic_tags": ["美学", "用户体验", "完美主义"],
      "recommendations": [
        {
          "id": "rec_bauhaus",
          "name": "包豪斯设计",
          "reason": "乔布斯设计理念的源头",
          "confidence": 0.7,
          "trigger_condition": "已探索乔布斯"
        }
      ],
      "children": []
    },
    {
      "id": "musk",
      "name": "马斯克",
      "type": "person",
      "status": "current",
      "exploration_depth": 0.6,
      "semantic_tags": ["第一性原理", "物理极限", "使命驱动"],
      "recommendations": [
        {
          "id": "rec_bezos",
          "name": "贝佐斯",
          "reason": "同时代的系统变革者",
          "confidence": 0.75,
          "trigger_condition": "探索马斯克后"
        }
      ],
      "children": []
    }
  ]
}
\`\`\`

**示例2 - 增量更新：**

输入：
- previous_map = [上面示例1的完整JSON]
- book_title = "新会话"
- latest_reply = "让我们深入探讨一下马斯克的'第一性原理'思维方式，这是他在特斯拉和SpaceX中反复运用的核心方法论..."

输出（只展示变化部分）：
\`\`\`json
{
  "id": "root",
  "name": "变革者",
  "type": "concept",
  "status": "current",
  "exploration_depth": 0.8,
  // ...保持原有所有字段...
  "children": [
    {
      "id": "ford",
      // ...保持福特节点的所有原有内容不变...
    },
    {
      "id": "jobs", 
      // ...保持乔布斯节点的所有原有内容不变...
    },
    {
      "id": "musk",
      "name": "马斯克",
      "type": "person",
      "status": "explored",        // 状态更新：current → explored
      "exploration_depth": 0.9,    // 深度更新：0.6 → 0.9
      "semantic_tags": ["第一性原理", "物理极限", "使命驱动"],
      "recommendations": [
        {
          "id": "rec_bezos",
          // ...保持原有推荐不变...
        }
      ],
      "children": [
        // 新增子节点 - 基于latest_reply内容
        {
          "id": "first_principles",
          "name": "第一性原理",
          "type": "method",
          "status": "current",
          "exploration_depth": 0.8,
          "semantic_tags": ["逻辑思维", "本质分析"],
          "recommendations": [
            {
              "id": "rec_aristotle",
              "name": "亚里士多德",
              "reason": "第一性原理的哲学源头",
              "confidence": 0.8,
              "trigger_condition": "探索第一性原理后"
            }
          ],
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
        return this.renderKnowledgeGraph(variables);
      
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