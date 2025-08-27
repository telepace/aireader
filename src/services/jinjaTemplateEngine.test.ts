/**
 * Jinja2 模板引擎测试
 */

import { JinjaTemplateEngine } from './jinjaTemplateEngine';

describe('JinjaTemplateEngine', () => {
  let engine: JinjaTemplateEngine;

  beforeEach(() => {
    engine = new JinjaTemplateEngine();
  });

  describe('变量替换', () => {
    it('应该替换简单变量', () => {
      const template = '{{ name }}';
      const result = engine.render(template, { name: 'Test' });
      expect(result).toBe('Test');
    });

    it('应该替换嵌套变量', () => {
      const template = '{{ user.name }}';
      const result = engine.render(template, { 
        user: { name: 'John' } 
      } as any);
      expect(result).toBe('John');
    });
  });

  describe('过滤器', () => {
    it('应该应用 default 过滤器', () => {
      const template = '{{ name | default("Unknown") }}';
      const result = engine.render(template, {});
      expect(result).toBe('Unknown');
    });

    it('应该应用 upper 过滤器', () => {
      const template = '{{ name | upper }}';
      const result = engine.render(template, { name: 'test' });
      expect(result).toBe('TEST');
    });
  });

  describe('条件语句', () => {
    it('应该处理 if 语句', () => {
      const template = '{% if condition %}Yes{% endif %}';
      const result = engine.render(template, { condition: true });
      expect(result).toBe('Yes');
    });
  });

  describe('循环语句', () => {
    it('应该处理 for 循环', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const result = engine.render(template, { 
        items: ['a', 'b', 'c'] 
      } as any);
      expect(result).toBe('abc');
    });
  });
});