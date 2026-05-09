"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { validateFormFields } from "./form-validation";

export function useFieldErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((form: HTMLFormElement): boolean => {
    const fieldErrors = validateFormFields(form);
    setErrors(fieldErrors);

    const keys = Object.keys(fieldErrors);
    if (keys.length === 0) return true;

    toast.error(fieldErrors[keys[0]]);

    const firstInvalid = form.elements.namedItem(keys[0]);
    if (firstInvalid && "focus" in firstInvalid) {
      (firstInvalid as HTMLElement).focus();
    }

    return false;
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setErrors({});
  }, []);

  return { errors, validate, clearError, clearAll };
}
