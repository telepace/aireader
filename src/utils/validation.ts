/**
 * Input validation and XSS protection utilities
 * 
 * This module provides comprehensive input validation and sanitization
 * to prevent XSS attacks and ensure data integrity.
 */

import DOMPurify from 'dompurify';

// Configuration for different input types
export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowHtml?: boolean;
  allowMarkdown?: boolean;
  trimWhitespace?: boolean;
  requireNonEmpty?: boolean;
  customPattern?: RegExp;
  customErrorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
}

// Default validation options for different input types
export const DEFAULT_VALIDATION_OPTIONS: Record<string, ValidationOptions> = {
  prompt: {
    maxLength: 50000,
    minLength: 1,
    allowHtml: false,
    allowMarkdown: true,
    trimWhitespace: true,
    requireNonEmpty: true,
  },
  chat: {
    maxLength: 10000,
    minLength: 1,
    allowHtml: false,
    allowMarkdown: true,
    trimWhitespace: true,
    requireNonEmpty: true,
  },
  markdown: {
    maxLength: 100000,
    minLength: 0,
    allowHtml: true, // Controlled HTML through DOMPurify
    allowMarkdown: true,
    trimWhitespace: false,
    requireNonEmpty: false,
  },
  general: {
    maxLength: 1000,
    minLength: 0,
    allowHtml: false,
    allowMarkdown: false,
    trimWhitespace: true,
    requireNonEmpty: false,
  },
};

// Common XSS attack patterns
const XSS_PATTERNS = [
  // Script tags
  /<script[\s\S]*?<\/script>/gi,
  /<script.*?>/gi,
  
  // Event handlers
  /on\w+\s*=\s*["'][^"']*["']/gi,
  /on\w+\s*=\s*[^>\s]*/gi,
  
  // JavaScript URLs
  /javascript:/gi,
  /vbscript:/gi,
  /data:text\/html/gi,
  
  // Meta redirects
  /<meta[\s\S]*?http-equiv[\s\S]*?refresh/gi,
  
  // Iframe and embed tags
  /<iframe[\s\S]*?>/gi,
  /<embed[\s\S]*?>/gi,
  /<object[\s\S]*?>/gi,
  
  // SVG with scripts
  /<svg[\s\S]*?>/gi,
  
  // IMG with onerror
  /<img[\s\S]*?>/gi,
  
  // Style with expressions or javascript
  /style\s*=\s*["'][^"']*expression\s*\(/gi,
  /style[\s\S]*?javascript/gi,
  
  // Form tags
  /<form[\s\S]*?>/gi,
  
  // Input with formaction
  /formaction\s*=\s*["'].*?javascript/gi,
];

/**
 * Sanitizes HTML content using DOMPurify with strict settings
 */
export function sanitizeHtml(content: string, allowBasicFormatting: boolean = false): string {
  if (!content) return '';
  
  const config: DOMPurify.Config = {
    // Allow only safe tags
    ALLOWED_TAGS: allowBasicFormatting 
      ? ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      : [],
    
    // Allow only safe attributes
    ALLOWED_ATTR: allowBasicFormatting ? ['class'] : [],
    
    // Remove script-executing attributes
    FORBID_ATTR: ['style', 'onclick', 'onload', 'onerror', 'onmouseover'],
    
    // Remove script tags entirely
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select'],
    
    // Keep content of forbidden tags
    KEEP_CONTENT: true,
    
    // Return DOM nodes instead of HTML string
    RETURN_DOM: false,
    
    // Return trusted types
    RETURN_TRUSTED_TYPE: false,
  };
  
  return DOMPurify.sanitize(content, config);
}

/**
 * Checks if content contains potential XSS patterns
 */
export function detectXSSPatterns(content: string): string[] {
  if (!content) return [];
  
  const detectedPatterns: string[] = [];
  
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(content)) {
      detectedPatterns.push(`Potentially unsafe pattern detected: ${pattern.toString()}`);
    }
  }
  
  return detectedPatterns;
}

/**
 * Validates and sanitizes user input based on specified options
 */
export function validateInput(
  input: string | null | undefined,
  options: ValidationOptions = {}
): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    sanitizedValue: '',
    errors: [],
    warnings: [],
  };
  
  // Handle null/undefined input
  if (input === null || input === undefined) {
    input = '';
  }
  
  let value = String(input);
  
  // Trim whitespace if requested
  if (options.trimWhitespace !== false) {
    value = value.trim();
  }
  
  // Check if empty when required
  if (options.requireNonEmpty && !value) {
    result.errors.push('This field is required and cannot be empty');
    result.isValid = false;
    return result;
  }
  
  // Check length constraints
  if (options.minLength && value.length < options.minLength) {
    result.errors.push(`Input must be at least ${options.minLength} characters long`);
    result.isValid = false;
  }
  
  if (options.maxLength && value.length > options.maxLength) {
    result.errors.push(`Input must not exceed ${options.maxLength} characters`);
    result.isValid = false;
    // Truncate if too long
    value = value.substring(0, options.maxLength);
    result.warnings.push(`Input was truncated to ${options.maxLength} characters`);
  }
  
  // Check custom pattern
  if (options.customPattern && !options.customPattern.test(value)) {
    result.errors.push(options.customErrorMessage || 'Input does not match required format');
    result.isValid = false;
  }
  
  // Detect potential XSS patterns
  const xssPatterns = detectXSSPatterns(value);
  if (xssPatterns.length > 0) {
    result.warnings.push(...xssPatterns);
    // Don't mark as invalid, but sanitize
  }
  
  // Sanitize content based on options
  if (!options.allowHtml && !options.allowMarkdown) {
    // Plain text only - escape all HTML
    value = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  } else if (options.allowMarkdown && !options.allowHtml) {
    // Allow markdown but escape HTML
    value = sanitizeHtml(value, false);
  } else if (options.allowHtml) {
    // Allow controlled HTML through DOMPurify
    value = sanitizeHtml(value, true);
  }
  
  result.sanitizedValue = value;
  
  return result;
}

/**
 * Validates prompt input (for prompt testing)
 */
export function validatePromptInput(input: string): ValidationResult {
  return validateInput(input, DEFAULT_VALIDATION_OPTIONS.prompt);
}

/**
 * Validates chat message input
 */
export function validateChatInput(input: string): ValidationResult {
  return validateInput(input, DEFAULT_VALIDATION_OPTIONS.chat);
}

/**
 * Validates markdown content (for display)
 */
export function validateMarkdownContent(input: string): ValidationResult {
  return validateInput(input, DEFAULT_VALIDATION_OPTIONS.markdown);
}

/**
 * Rate limiting functionality
 */
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  
  constructor(windowMs: number = 60000, maxRequests: number = 30) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }
  
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);
    
    if (!entry || now - entry.windowStart > this.windowMs) {
      // New window or no previous entry
      this.limits.set(identifier, { count: 1, windowStart: now });
      return true;
    }
    
    if (entry.count >= this.maxRequests) {
      return false; // Rate limit exceeded
    }
    
    entry.count++;
    return true;
  }
  
  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return this.maxRequests;
    
    const now = Date.now();
    if (now - entry.windowStart > this.windowMs) {
      return this.maxRequests;
    }
    
    return Math.max(0, this.maxRequests - entry.count);
  }
  
  getTimeUntilReset(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return 0;
    
    const now = Date.now();
    const timeSinceStart = now - entry.windowStart;
    return Math.max(0, this.windowMs - timeSinceStart);
  }
}

// Global rate limiter instances
export const chatRateLimiter = new RateLimiter(60000, 30); // 30 requests per minute
export const promptRateLimiter = new RateLimiter(60000, 10); // 10 requests per minute

/**
 * Enhanced validation for API calls with rate limiting
 */
export function validateApiInput(
  input: string, 
  type: 'chat' | 'prompt',
  identifier: string = 'default'
): ValidationResult & { rateLimitExceeded: boolean; rateLimitInfo?: { remaining: number; resetTime: number } } {
  
  const limiter = type === 'chat' ? chatRateLimiter : promptRateLimiter;
  const rateLimitExceeded = !limiter.isAllowed(identifier);
  
  const validation = type === 'chat' ? validateChatInput(input) : validatePromptInput(input);
  
  return {
    ...validation,
    rateLimitExceeded,
    rateLimitInfo: {
      remaining: limiter.getRemainingRequests(identifier),
      resetTime: limiter.getTimeUntilReset(identifier),
    },
    isValid: validation.isValid && !rateLimitExceeded,
  };
}

/**
 * Utility to create user-friendly validation error messages
 */
export function formatValidationErrors(result: ValidationResult): string {
  if (result.isValid) return '';
  
  const messages: string[] = [];
  
  if (result.errors.length > 0) {
    messages.push('错误: ' + result.errors.join(', '));
  }
  
  if (result.warnings.length > 0) {
    messages.push('警告: ' + result.warnings.join(', '));
  }
  
  return messages.join('\n');
}

/**
 * React hook for input validation
 */
export function useInputValidation(options: ValidationOptions = {}) {
  const validateValue = (value: string) => {
    return validateInput(value, options);
  };
  
  return {
    validate: validateValue,
    validateWithRateLimit: (value: string, type: 'chat' | 'prompt', identifier?: string) => {
      return validateApiInput(value, type, identifier);
    },
  };
}