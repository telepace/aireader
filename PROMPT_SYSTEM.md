# Prompt 模板系统 - Jinja2 实现

一个基于 Jinja2 语法的优雅 prompt 模板管理系统，支持多语言、变量替换和动态模板生成。

## 🏗️ 架构设计

### 文件结构
```
src/
├── templates/                  # .j2 模板文件
│   ├── nextStepChat.system.zh.j2
│   └── nextStepChat.system.en.j2
├── config/
│   ├── prompts.json           # 原有结构化配置
│   └── promptVariables.json   # 模板变量配置
├── services/
│   ├── jinjaTemplateEngine.ts  # Jinja2 模板引擎
│   ├── promptTemplateV2.ts     # 主要 API 服务
│   └── promptTemplate.ts       # 原有服务（向下兼容）
└── types/
    └── prompt.ts              # TypeScript 类型定义
```

## 🚀 核心特性

### 1. Jinja2 语法支持
- **变量替换**: `{{ variable }}`
- **过滤器**: `{{ variable | filter }}`
- **条件语句**: `{% if condition %} ... {% endif %}`
- **循环语句**: `{% for item in list %} ... {% endfor %}`

### 2. 多语言支持
```typescript
// 中文 prompt
const zhPrompt = generateSystemPrompt('nextStepChat', 'zh');

// 英文 prompt  
const enPrompt = generateSystemPrompt('nextStepChat', 'en');
```

### 3. 动态变量替换
```typescript
const customPrompt = generateSystemPrompt('nextStepChat', 'zh', {
  goal: '自定义目标',
  steps: {
    focus: {
      title: '自定义聚焦',
      description: '自定义描述'
    }
  }
});
```

## 📝 模板示例

### 中文模板 (nextStepChat.system.zh.j2)
```jinja2
{{ goal | default('我的目标是「精读」当前讨论的内容') }}

每次交互，请严格执行以下3件事：

**1. {{ steps.focus.title | default('聚焦与展开') }}** 
{{ steps.focus.description | default('先讲透内容的一个核心关键') }}

**2. {{ steps.deepen.title | default('原文深挖') }} (type: deepen)** 
{{ steps.deepen.description | default('推荐3个最有价值的原文精读选项') }}

{% if steps.deepen.criteria %}
{{ steps.deepen.criteria.length }}个选项可以参考以下行动类型：
{% for criterion in steps.deepen.criteria %}
- {{ criterion }}
{% endfor %}
其他
{% endif %}

**格式要求** 第2和第3步的推荐项，必须严格遵循 {{ format.type | upper }} 格式。
```

## 🛠️ 使用方法

### 基础用法
```typescript
import { generateSystemPrompt, getTemplateVariables } from '../services/promptTemplateV2';

// 生成系统 prompt
const prompt = generateSystemPrompt('nextStepChat', 'zh');

// 获取模板变量
const variables = getTemplateVariables('nextStepChat', 'zh');

// 自定义变量生成
const customPrompt = generateSystemPrompt('nextStepChat', 'zh', {
  goal: '自定义目标内容'
});
```

### 在组件中使用
```typescript
// NextStepChat.tsx 中的集成
const getSystemPrompt = () => {
  try {
    return generateSystemPrompt('nextStepChat', 'zh');
  } catch (error) {
    console.error('Failed to generate system prompt:', error);
    // 降级到硬编码版本
    return fallbackPrompt;
  }
};
```

## 🎯 优势

### 1. 可维护性
- **分离关注点**: 模板和代码分离
- **版本控制**: 模板变更可追踪
- **团队协作**: 非技术人员可编辑模板

### 2. 可扩展性  
- **多语言**: 轻松添加新语言支持
- **自定义过滤器**: 扩展模板功能
- **动态配置**: 运行时变量替换

这个系统为 AIReader 项目提供了一个强大、灵活且可维护的 prompt 管理解决方案。