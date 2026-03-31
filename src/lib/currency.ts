import { Decimal } from "@prisma/client/runtime/library";

const formatter = new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatLKR(value: number | string | Decimal): string {
  const num = typeof value === "number" ? value : Number(value);
  return formatter.format(num);
}

export function formatNumber(value: number | string | Decimal): string {
  const num = typeof value === "number" ? value : Number(value);
  return new Intl.NumberFormat("en-LK").format(num);
}
