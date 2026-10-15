import { useState, useCallback } from 'react';
import type { ZodSchema } from 'zod';

export function useFormErrors() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');

  const validate = useCallback((schema: ZodSchema, data: unknown): boolean => {
    const result = schema.safeParse(data);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFieldErrors({});
    setFormError('');
  }, []);

  return {
    fieldErrors,
    formError,
    setFormError,
    validate,
    clearFieldError,
    clearAll,
  };
}
