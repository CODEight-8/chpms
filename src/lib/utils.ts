import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { normalizeSriLankaPhoneNumber } from "@/lib/validators"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Sri Lankan phone number for display
 * Converts +94771234567 or 0712345678 to +94 71 234 5678
 */
export function formatSriLankaPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  const normalized = normalizeSriLankaPhoneNumber(phone);
  if (!normalized) return phone;

  const digits = normalized.slice(3); // Remove +94
  if (digits.length === 9) {
    return `+94 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  }

  return phone;
}
