/**
 * 模板注册表 - 兼容层
 * 
 * 为了向后兼容而保留，实际使用新的 templateSystem
 * @deprecated 请直接使用 templateSystem
 */

import { templateSystem } from './templateSystem';

/**
 * 获取模板内容（异步）
 * @deprecated 使用 templateSystem.renderTemplate 代替
 */
export const getTemplateContent = async (fileName: string): Promise<string> => {
  console.warn('getTemplateContent is deprecated. Use templateSystem.renderTemplate instead.');
  
  // 简单的文件名到上下文的映射
  let context: string;
  if (fileName.includes('smartRecommendation')) {
    context = 'smartRecommendation';
  } else if (fileName.includes('knowledgeGraph')) {
    context = 'knowledgeGraph';
  } else if (fileName.includes('contentGeneration')) {
    context = 'contentGeneration';
  } else {
    throw new Error(`Unsupported template file: ${fileName}`);
  }

  return await templateSystem.renderTemplate(context as any, 'zh', {});
};

/**
 * 同步获取模板内容
 * @deprecated 使用异步版本
 */
export const getTemplateContentSync = (fileName: string): string => {
  throw new Error('Synchronous template loading is no longer supported. Use getTemplateContent() instead.');
};

/**
 * 获取可用模板列表
 */
export const getAvailableTemplates = (): string[] => {
  return [
    '_shared.j2',
    'smartRecommendation.system.zh.j2',
    'knowledgeGraph.system.zh.j2',
    'contentGeneration.system.zh.j2'
  ];
};

/**
 * 检查模板是否存在
 */
export const hasTemplate = (fileName: string): boolean => {
  return getAvailableTemplates().includes(fileName);
};

/**
 * 预加载模板（空实现，新系统不需要预加载）
 */
export const preloadTemplates = async (): Promise<void> => {
  console.log('📄 Template preloading skipped (using new template system)');
};

/**
 * 清空缓存（空实现，新系统不需要缓存）
 */
export const clearTemplateCache = (): void => {
  console.log('🔄 Template cache clearing skipped (using new template system)');
};

// 兼容性导出
export const TEMPLATE_REGISTRY: Record<string, string> = {};