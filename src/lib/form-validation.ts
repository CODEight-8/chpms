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

export function validateFormWithToast(form: HTMLFormElement) {
  const fields = Array.from(form.elements).filter(
    (element): element is FormField =>
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement
  );

  const invalidField = fields.find(
    (field) => !field.disabled && !field.checkValidity()
  );

  if (!invalidField) {
    return true;
  }

  toast.error(getValidationMessage(invalidField, form));
  invalidField.focus();
  return false;
}
