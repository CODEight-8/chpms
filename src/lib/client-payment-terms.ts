export const CLIENT_PAYMENT_METHODS = [
  "Cash on Delivery (COD)",
  "Bank Transfer",
  "Card Payment",
] as const;

export type ClientPaymentMethod = (typeof CLIENT_PAYMENT_METHODS)[number];

export function isClientPaymentMethod(
  value: string | null | undefined
): value is ClientPaymentMethod {
  return CLIENT_PAYMENT_METHODS.includes(value as ClientPaymentMethod);
}

export const CLIENT_PAYMENT_TERMS = [
  "Due on Receipt",
  "Net 15",
  "Net 30",
] as const;

export type ClientPaymentTerm = (typeof CLIENT_PAYMENT_TERMS)[number];

export function isClientPaymentTerm(
  value: string | null | undefined
): value is ClientPaymentTerm {
  return CLIENT_PAYMENT_TERMS.includes(value as ClientPaymentTerm);
}
