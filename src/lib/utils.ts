import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { normalizeSriLankaPhoneNumber } from "@/lib/validators"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Sri Lankan phone number for display
 * Converts +94771234567 or 0712345678 to +94771234567
 */
export function formatSriLankaPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";

  const normalized = normalizeSriLankaPhoneNumber(phone);
  return normalized ?? phone;
}
