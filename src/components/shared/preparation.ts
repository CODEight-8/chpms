// Server-safe types and constants for the Preparation enum. Lives outside
// the client component file so server components can import without crossing
// the RSC boundary (which forbids dotting into client-module exports).

export type Preparation = "RAW" | "DRY" | "WASHED";

export const PREPARATION_LABEL: Record<Preparation, string> = {
  RAW: "Raw",
  DRY: "Dry",
  WASHED: "Washed",
};

export const PREPARATION_BADGE: Record<Preparation, string> = {
  RAW: "bg-stone-100 text-stone-700 border-stone-200",
  DRY: "bg-amber-50 text-amber-800 border-amber-200",
  WASHED: "bg-sky-50 text-sky-700 border-sky-200",
};
