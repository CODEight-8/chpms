export function calculateBatchAging(harvestDate: Date): number {
  return Math.floor(
    (Date.now() - new Date(harvestDate).getTime()) / 86_400_000
  );
}

export function getAgingLabel(days: number): {
  label: string;
  color: string;
  textClass: string;
  bgClass: string;
} {
  if (days <= 14)
    return {
      label: "Fresh",
      color: "green",
      textClass: "text-green-700",
      bgClass: "bg-green-100",
    };
  if (days <= 30)
    return {
      label: "Moderate",
      color: "yellow",
      textClass: "text-yellow-700",
      bgClass: "bg-yellow-100",
    };
  if (days <= 60)
    return {
      label: "Aged",
      color: "orange",
      textClass: "text-orange-700",
      bgClass: "bg-orange-100",
    };
  return {
    label: "Over-aged",
    color: "red",
    textClass: "text-red-700",
    bgClass: "bg-red-100",
  };
}
