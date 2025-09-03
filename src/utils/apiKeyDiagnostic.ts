/**
 * API密钥诊断工具
 * 用于检测和诊断Railway部署环境中的API密钥配置问题
 */

interface DiagnosticResult {
  isValid: boolean;
  source: 'runtime' | 'buildtime' | 'none';
  message: string;
  suggestions: string[];
}

export const diagnoseApiKey = (): DiagnosticResult => {
  const suggestions: string[] = [];
  let source: 'runtime' | 'buildtime' | 'none' = 'none';
  let isValid = false;
  let message = '';

  // 1. 检查运行时配置 (Railway 部署)
  const runtimeKey = (window as any).ENV?.REACT_APP_OPENROUTER_API_KEY;
  console.log('🔍 Railway运行时API密钥检查:', {
    exists: !!runtimeKey,
    isPlaceholder: runtimeKey === '__REACT_APP_OPENROUTER_API_KEY__',
    value: runtimeKey ? `${runtimeKey.slice(0, 10)}...` : '无'
  });

  if (runtimeKey && runtimeKey !== '__REACT_APP_OPENROUTER_API_KEY__') {
    source = 'runtime';
    isValid = true;
    message = 'API密钥配置正常 (Railway运行时)';
  } else if (runtimeKey === '__REACT_APP_OPENROUTER_API_KEY__') {
    message = 'Railway环境变量未正确替换 - 仍为占位符';
    suggestions.push('在Railway Dashboard中设置REACT_APP_OPENROUTER_API_KEY环境变量');
    suggestions.push('重新部署应用以应用环境变量');
  }

  // 2. 检查构建时环境变量 (本地开发)
  const buildtimeKey = process.env.REACT_APP_OPENROUTER_API_KEY;
  console.log('🔍 构建时API密钥检查:', {
    exists: !!buildtimeKey,
    value: buildtimeKey ? `${buildtimeKey.slice(0, 10)}...` : '无'
  });

  if (!isValid && buildtimeKey && 
      buildtimeKey !== 'undefined' && 
      buildtimeKey !== '__REACT_APP_OPENROUTER_API_KEY__' &&
      buildtimeKey.startsWith('sk-or-v1-')) {
    source = 'buildtime';
    isValid = true;
    message = 'API密钥配置正常 (构建时)';
  }

  // 3. 如果都没有有效密钥
  if (!isValid) {
    if (!message) {
      message = 'API密钥未配置或无效';
    }
    
    suggestions.push('确认Railway环境变量REACT_APP_OPENROUTER_API_KEY已设置');
    suggestions.push('密钥格式应为: sk-or-v1-xxxxxxxx');
    suggestions.push('在Railway Dashboard中检查Variables标签页');
    suggestions.push('设置后需要重新部署应用');
  }

  return {
    isValid,
    source,
    message,
    suggestions
  };
};

export const logDiagnosticInfo = () => {
  const result = diagnoseApiKey();
  
  console.group('🔧 API密钥诊断报告');
  console.log('状态:', result.isValid ? '✅ 正常' : '❌ 异常');
  console.log('来源:', result.source);
  console.log('信息:', result.message);
  
  if (result.suggestions.length > 0) {
    console.log('建议:');
    result.suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. ${suggestion}`);
    });
  }
  
  console.groupEnd();
  
  return result;
};