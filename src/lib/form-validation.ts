"use client";

import { toast } from "sonner";

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function getFieldLabel(field: FormField, form: HTMLFormElement) {
  if (!field.id) return field.name || "This field";

  const label = form.querySelector<HTMLLabelElement>(`label[for="${field.id}"]`);
  return label?.textContent?.replace(/\*/g, "").trim() || field.name || "This field";
}

function getValidationMessage(field: FormField, form: HTMLFormElement) {
  const label = getFieldLabel(field, form);

  if (field.validity.valueMissing) {
    return `${label} is required.`;
  }

  if (field.validity.typeMismatch) {
    return `${label} has an invalid format.`;
  }

  if (field.validity.patternMismatch && field.title) {
    return field.title;
  }

  return field.validationMessage || `${label} is invalid.`;
}

export function validateFormFields(form: HTMLFormElement): Record<string, string> {
  const fields = Array.from(form.elements).filter(
    (element): element is FormField =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
  );

  const errors: Record<string, string> = {};
  for (const field of fields) {
    if (!field.disabled && !field.checkValidity()) {
      const key = field.name || field.id;
      if (key) {
        errors[key] = getValidationMessage(field, form);
      }
    }
  }
  return errors;
}

export function validateFormWithToast(form: HTMLFormElement) {
  const errors = validateFormFields(form);
  const keys = Object.keys(errors);

  if (keys.length === 0) {
    return true;
  }

  toast.error(errors[keys[0]]);

  const firstInvalid = form.elements.namedItem(keys[0]);
  if (firstInvalid && "focus" in firstInvalid) {
    (firstInvalid as HTMLElement).focus();
  }

  return false;
}
