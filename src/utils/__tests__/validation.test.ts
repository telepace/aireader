/**
 * Comprehensive tests for input validation and XSS protection utilities
 */

import {
  validateInput,
  validatePromptInput,
  validateChatInput,
  validateMarkdownContent,
  validateApiInput,
  sanitizeHtml,
  detectXSSPatterns,
  formatValidationErrors,
  chatRateLimiter,
  promptRateLimiter,
  DEFAULT_VALIDATION_OPTIONS,
} from '../validation';

describe('Input Validation', () => {
  beforeEach(() => {
    // Reset rate limiters
    chatRateLimiter['limits'].clear();
    promptRateLimiter['limits'].clear();
  });

  describe('validateInput', () => {
    test('validates required fields correctly', () => {
      const result = validateInput('', { requireNonEmpty: true });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('This field is required and cannot be empty');
    });

    test('validates length constraints', () => {
      const longText = 'a'.repeat(1001);
      const result = validateInput(longText, { maxLength: 1000 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input must not exceed 1000 characters');
      expect(result.sanitizedValue.length).toBe(1000);
    });

    test('validates minimum length', () => {
      const result = validateInput('ab', { minLength: 5 });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Input must be at least 5 characters long');
    });

    test('trims whitespace when enabled', () => {
      const result = validateInput('  hello world  ', { trimWhitespace: true });
      
      expect(result.sanitizedValue).toBe('hello world');
    });

    test('validates custom patterns', () => {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const result = validateInput('invalid-email', {
        customPattern: emailPattern,
        customErrorMessage: 'Please enter a valid email address'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Please enter a valid email address');
    });
  });

  describe('XSS Protection', () => {
    test('detects script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const patterns = detectXSSPatterns(maliciousInput);
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toContain('script');
    });

    test('detects event handlers', () => {
      const maliciousInput = '<div onclick="alert(\'xss\')">Click me</div>';
      const patterns = detectXSSPatterns(maliciousInput);
      
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('detects javascript: URLs', () => {
      const maliciousInput = '<a href="javascript:alert(\'xss\')">Link</a>';
      const patterns = detectXSSPatterns(maliciousInput);
      
      expect(patterns.length).toBeGreaterThan(0);
    });

    test('sanitizes HTML correctly', () => {
      const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(maliciousInput, true);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Safe content');
    });

    test('allows safe HTML when enabled', () => {
      const safeInput = '<p><strong>Bold text</strong></p>';
      const sanitized = sanitizeHtml(safeInput, true);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>');
    });

    test('escapes HTML when not allowed', () => {
      const htmlInput = '<p>Paragraph</p>';
      const result = validateInput(htmlInput, { allowHtml: false, allowMarkdown: false });
      
      expect(result.sanitizedValue).toContain('&lt;p&gt;');
      // Forward slash is encoded as &#x2F; not &lt;/p&gt;
      expect(result.sanitizedValue).toContain('&#x2F;');
      expect(result.sanitizedValue).toContain('Paragraph');
    });
  });

  describe('Specialized Validators', () => {
    test('validates prompt input with correct options', () => {
      const longPrompt = 'a'.repeat(60000);
      const result = validatePromptInput(longPrompt);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('50000');
    });

    test('validates chat input with correct options', () => {
      const longChat = 'a'.repeat(15000);
      const result = validateChatInput(longChat);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('10000');
    });

    test('validates markdown content', () => {
      const markdownInput = '# Heading\n\n<script>alert("xss")</script>\n\n**Bold text**';
      const result = validateMarkdownContent(markdownInput);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toContain('Heading');
      expect(result.sanitizedValue).toContain('Bold text');
      expect(result.sanitizedValue).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    test('allows requests within rate limit', () => {
      const identifier = 'test-user';
      
      for (let i = 0; i < 29; i++) {
        const result = validateApiInput('test message', 'chat', identifier);
        expect(result.rateLimitExceeded).toBe(false);
      }
    });

    test('blocks requests exceeding rate limit', () => {
      const identifier = 'test-user-2';
      
      // Exhaust the rate limit
      for (let i = 0; i < 30; i++) {
        validateApiInput('test message', 'chat', identifier);
      }
      
      // Next request should be blocked
      const result = validateApiInput('test message', 'chat', identifier);
      expect(result.rateLimitExceeded).toBe(true);
      expect(result.isValid).toBe(false);
    });

    test('provides rate limit info', () => {
      const identifier = 'test-user-3';
      const result = validateApiInput('test message', 'chat', identifier);
      
      expect(result.rateLimitInfo).toBeDefined();
      expect(result.rateLimitInfo?.remaining).toBe(29);
      expect(typeof result.rateLimitInfo?.resetTime).toBe('number');
    });

    test('has different limits for chat and prompt', () => {
      const chatIdentifier = 'test-user-chat';
      const promptIdentifier = 'test-user-prompt';
      
      // Chat has 30 requests/minute limit
      for (let i = 0; i < 31; i++) {
        const result = validateApiInput('test', 'chat', chatIdentifier);
        if (i < 30) {
          expect(result.rateLimitExceeded).toBe(false);
        } else {
          expect(result.rateLimitExceeded).toBe(true);
        }
      }
      
      // Prompt has 10 requests/minute limit (different identifier to avoid interference)
      for (let i = 0; i < 11; i++) {
        const result = validateApiInput('test', 'prompt', promptIdentifier);
        if (i < 10) {
          expect(result.rateLimitExceeded).toBe(false);
        } else {
          expect(result.rateLimitExceeded).toBe(true);
        }
      }
    });
  });

  describe('Error Formatting', () => {
    test('formats validation errors correctly', () => {
      const result = {
        isValid: false,
        sanitizedValue: '',
        errors: ['Field is required', 'Too long'],
        warnings: ['Contains suspicious content'],
      };
      
      const formatted = formatValidationErrors(result);
      
      expect(formatted).toContain('错误: Field is required, Too long');
      expect(formatted).toContain('警告: Contains suspicious content');
    });

    test('returns empty string for valid input', () => {
      const result = {
        isValid: true,
        sanitizedValue: 'valid input',
        errors: [],
        warnings: [],
      };
      
      const formatted = formatValidationErrors(result);
      expect(formatted).toBe('');
    });
  });

  describe('Edge Cases', () => {
    test('handles null and undefined input', () => {
      const nullResult = validateInput(null);
      const undefinedResult = validateInput(undefined);
      
      expect(nullResult.sanitizedValue).toBe('');
      expect(undefinedResult.sanitizedValue).toBe('');
    });

    test('handles empty options', () => {
      const result = validateInput('test input');
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedValue).toBe('test input');
    });

    test('preserves whitespace when trimming is disabled', () => {
      const result = validateInput('  spaced text  ', { trimWhitespace: false });
      
      expect(result.sanitizedValue).toBe('  spaced text  ');
    });
  });

  describe('Complex XSS Scenarios', () => {
    const xssPayloads = [
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<form><input type="submit" formaction="javascript:alert(1)"></form>',
      '<style>body{background:url("javascript:alert(1)")}</style>',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
    ];

    test('detects various XSS attack vectors', () => {
      xssPayloads.forEach(payload => {
        const patterns = detectXSSPatterns(payload);
        expect(patterns.length).toBeGreaterThan(0);
      });
    });

    test('sanitizes complex XSS attempts', () => {
      xssPayloads.forEach(payload => {
        const result = validateInput(payload, { allowHtml: true });
        
        // Should not contain dangerous elements
        expect(result.sanitizedValue).not.toContain('<script>');
        expect(result.sanitizedValue).not.toContain('<iframe>');
        expect(result.sanitizedValue).not.toContain('javascript:');
        expect(result.sanitizedValue).not.toContain('onerror');
        expect(result.sanitizedValue).not.toContain('onload');
      });
    });
  });

  describe('Performance', () => {
    test('handles large input efficiently', () => {
      const largeInput = 'a'.repeat(100000);
      const start = performance.now();
      
      validateInput(largeInput, DEFAULT_VALIDATION_OPTIONS.general);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    test('XSS detection is efficient', () => {
      const mixedContent = 'Normal text '.repeat(1000) + '<script>alert("xss")</script>';
      const start = performance.now();
      
      detectXSSPatterns(mixedContent);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
    });
  });
});