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
      const renderResult = engine.render(template, { name: 'Test' });
      expect(renderResult).toBe('Test');
    });

    it('应该替换嵌套变量', () => {
      const template = '{{ user.name }}';
      const renderResult = engine.render(template, { 
        user: { name: 'John' } 
      } as any);
      expect(renderResult).toBe('John');
    });
  });

  describe('过滤器', () => {
    it('应该应用 default 过滤器', () => {
      const template = '{{ name | default("Unknown") }}';
      const renderResult = engine.render(template, {});
      expect(renderResult).toBe('Unknown');
    });

    it('应该应用 upper 过滤器', () => {
      const template = '{{ name | upper }}';
      const renderResult = engine.render(template, { name: 'test' });
      expect(renderResult).toBe('TEST');
    });
  });

  describe('条件语句', () => {
    it('应该处理 if 语句', () => {
      const template = '{% if condition %}Yes{% endif %}';
      const renderResult = engine.render(template, { condition: true });
      expect(renderResult).toBe('Yes');
    });
  });

  describe('循环语句', () => {
    it('应该处理 for 循环', () => {
      const template = '{% for item in items %}{{ item }}{% endfor %}';
      const renderResult = engine.render(template, { 
        items: ['a', 'b', 'c'] 
      } as any);
      expect(renderResult).toBe('abc');
    });
  });
});