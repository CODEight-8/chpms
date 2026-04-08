export const CLIENT_PAYMENT_TERMS = [
  "Cash on Delivery (COD)",
  "Bank Transfer",
  "Card Payment",
] as const;

export type ClientPaymentTerm = (typeof CLIENT_PAYMENT_TERMS)[number];

export function isClientPaymentTerm(
  value: string | null | undefined
): value is ClientPaymentTerm {
  return CLIENT_PAYMENT_TERMS.includes(value as ClientPaymentTerm);
}

export function getClientPaymentTermLabel(value: string | null | undefined) {
  if (!value) {
    return "\u2014";
  }

  return value;
}
