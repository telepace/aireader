/**
 * React hook for form validation and sanitization
 * 
 * Provides real-time validation and sanitization for form inputs
 * with XSS protection and rate limiting.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  validateInput,
  validateApiInput,
  ValidationOptions,
  ValidationResult,
  DEFAULT_VALIDATION_OPTIONS,
  formatValidationErrors,
} from '../utils/validation';

export interface FormField {
  value: string;
  sanitizedValue: string;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

export interface FormValidationConfig {
  [fieldName: string]: ValidationOptions;
}

export interface UseFormValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  sanitizeOnChange?: boolean;
  enableRateLimit?: boolean;
  rateLimitIdentifier?: string;
}

export interface UseFormValidationReturn {
  fields: Record<string, FormField>;
  errors: Record<string, string>;
  isFormValid: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  validateField: (fieldName: string, value: string) => ValidationResult;
  validateForm: () => boolean;
  updateField: (fieldName: string, value: string) => void;
  touchField: (fieldName: string) => void;
  resetField: (fieldName: string) => void;
  resetForm: () => void;
  getFieldProps: (fieldName: string) => {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    onBlur: () => void;
    error: boolean;
    helperText: string;
  };
}

const createInitialField = (): FormField => ({
  value: '',
  sanitizedValue: '',
  errors: [],
  warnings: [],
  isValid: true,
  isDirty: false,
  isTouched: false,
});

export function useFormValidation(
  config: FormValidationConfig,
  options: UseFormValidationOptions = {}
): UseFormValidationReturn {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    sanitizeOnChange = true,
    enableRateLimit = false,
    rateLimitIdentifier = 'default',
  } = options;

  // Initialize fields based on config
  const initialFields = useMemo(() => {
    const fields: Record<string, FormField> = {};
    Object.keys(config).forEach(fieldName => {
      fields[fieldName] = createInitialField();
    });
    return fields;
  }, [config]);

  const [fields, setFields] = useState<Record<string, FormField>>(initialFields);

  // Validate a single field
  const validateField = useCallback((fieldName: string, value: string): ValidationResult => {
    const fieldConfig = config[fieldName] || DEFAULT_VALIDATION_OPTIONS.general;
    
    if (enableRateLimit && (fieldName === 'chat' || fieldName === 'prompt')) {
      return validateApiInput(value, fieldName as 'chat' | 'prompt', rateLimitIdentifier);
    }
    
    return validateInput(value, fieldConfig);
  }, [config, enableRateLimit, rateLimitIdentifier]);

  // Update a field value
  const updateField = useCallback((fieldName: string, value: string) => {
    setFields(prevFields => {
      const currentField = prevFields[fieldName] || createInitialField();
      let validation: ValidationResult;
      
      if (validateOnChange || sanitizeOnChange) {
        validation = validateField(fieldName, value);
      } else {
        validation = {
          isValid: true,
          sanitizedValue: value,
          errors: [],
          warnings: [],
        };
      }

      const updatedField: FormField = {
        value,
        sanitizedValue: sanitizeOnChange ? validation.sanitizedValue : value,
        errors: validateOnChange ? validation.errors : [],
        warnings: validateOnChange ? validation.warnings : [],
        isValid: validateOnChange ? validation.isValid : true,
        isDirty: true,
        isTouched: currentField.isTouched,
      };

      return {
        ...prevFields,
        [fieldName]: updatedField,
      };
    });
  }, [validateField, validateOnChange, sanitizeOnChange]);

  // Mark a field as touched
  const touchField = useCallback((fieldName: string) => {
    setFields(prevFields => {
      const currentField = prevFields[fieldName] || createInitialField();
      
      if (!currentField.isTouched && validateOnBlur) {
        const validation = validateField(fieldName, currentField.value);
        return {
          ...prevFields,
          [fieldName]: {
            ...currentField,
            isTouched: true,
            errors: validation.errors,
            warnings: validation.warnings,
            isValid: validation.isValid,
          },
        };
      }

      return {
        ...prevFields,
        [fieldName]: {
          ...currentField,
          isTouched: true,
        },
      };
    });
  }, [validateField, validateOnBlur]);

  // Reset a single field
  const resetField = useCallback((fieldName: string) => {
    setFields(prevFields => ({
      ...prevFields,
      [fieldName]: createInitialField(),
    }));
  }, []);

  // Reset the entire form
  const resetForm = useCallback(() => {
    setFields(initialFields);
  }, [initialFields]);

  // Validate the entire form
  const validateForm = useCallback((): boolean => {
    let isFormValid = true;
    
    // Use functional update to access current fields and validate them
    setFields(prevFields => {
      const updatedFields: Record<string, FormField> = {};
      
      // Validate all fields and check overall validity
      Object.keys(prevFields).forEach(fieldName => {
        const field = prevFields[fieldName];
        const validation = validateField(fieldName, field.value);
        
        updatedFields[fieldName] = {
          ...field,
          errors: validation.errors,
          warnings: validation.warnings,
          isValid: validation.isValid,
          sanitizedValue: validation.sanitizedValue,
          isTouched: true,
        };
        
        // Check overall form validity
        if (!validation.isValid) {
          isFormValid = false;
        }
      });
      
      return updatedFields;
    });
    
    return isFormValid;
  }, [validateField]);

  // Computed values
  const errors = useMemo(() => {
    const formErrors: Record<string, string> = {};
    Object.keys(fields).forEach(fieldName => {
      const field = fields[fieldName];
      if (field.errors.length > 0) {
        formErrors[fieldName] = formatValidationErrors({
          isValid: field.isValid,
          sanitizedValue: field.sanitizedValue,
          errors: field.errors,
          warnings: field.warnings,
        });
      }
    });
    return formErrors;
  }, [fields]);

  const isFormValid = useMemo(() => {
    return Object.values(fields).every(field => field.isValid);
  }, [fields]);

  const hasErrors = useMemo(() => {
    return Object.values(fields).some(field => field.errors.length > 0);
  }, [fields]);

  const hasWarnings = useMemo(() => {
    return Object.values(fields).some(field => field.warnings.length > 0);
  }, [fields]);

  // Helper function to get props for Material-UI TextField components
  const getFieldProps = useCallback((fieldName: string) => {
    const field = fields[fieldName] || createInitialField();
    const error = field.isTouched && field.errors.length > 0;
    
    return {
      value: field.value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        updateField(fieldName, e.target.value);
      },
      onBlur: () => {
        touchField(fieldName);
      },
      error,
      helperText: error ? errors[fieldName] : '',
    };
  }, [fields, errors, updateField, touchField]);

  return {
    fields,
    errors,
    isFormValid,
    hasErrors,
    hasWarnings,
    validateField,
    validateForm,
    updateField,
    touchField,
    resetField,
    resetForm,
    getFieldProps,
  };
}

// Predefined configurations for common use cases
export const FORM_CONFIGS = {
  promptTest: {
    promptObject: DEFAULT_VALIDATION_OPTIONS.prompt,
    promptText: DEFAULT_VALIDATION_OPTIONS.prompt,
  },
  chat: {
    message: DEFAULT_VALIDATION_OPTIONS.chat,
  },
  general: {
    input: DEFAULT_VALIDATION_OPTIONS.general,
  },
} as const;

/**
 * Specialized hook for prompt testing form
 */
export function usePromptFormValidation() {
  return useFormValidation(FORM_CONFIGS.promptTest, {
    validateOnChange: true,
    validateOnBlur: true,
    sanitizeOnChange: true,
    enableRateLimit: true,
  });
}

/**
 * Specialized hook for chat form
 */
export function useChatFormValidation() {
  return useFormValidation(FORM_CONFIGS.chat, {
    validateOnChange: false, // Don't validate while typing
    validateOnBlur: true,
    sanitizeOnChange: true,
    enableRateLimit: true,
  });
}