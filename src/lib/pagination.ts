export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

interface ParseOptions {
  paramPrefix?: string;
  defaultPerPage?: number;
}

export interface Pagination {
  page: number;
  perPage: number;
  skip: number;
  take: number;
  pageParam: string;
  perPageParam: string;
}

/**
 * Parse `?<prefix>Page=` and `?<prefix>PerPage=` (or `?page=` / `?perPage=`
 * with no prefix). Coerces to safe positive integers and clamps perPage to
 * MAX_PAGE_SIZE so an attacker can't request 1M-row dumps via URL.
 */
export function parsePagination(
  searchParams: Record<string, string | string[] | undefined>,
  options: ParseOptions = {}
): Pagination {
  const prefix = options.paramPrefix ?? "";
  const pageParam = prefix ? `${prefix}Page` : "page";
  const perPageParam = prefix ? `${prefix}PerPage` : "perPage";
  const defaultPerPage = options.defaultPerPage ?? DEFAULT_PAGE_SIZE;

  const rawPage = pickString(searchParams[pageParam]);
  const rawPerPage = pickString(searchParams[perPageParam]);

  const parsedPage = Number.parseInt(rawPage ?? "", 10);
  const parsedPerPage = Number.parseInt(rawPerPage ?? "", 10);

  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const perPage =
    Number.isFinite(parsedPerPage) && parsedPerPage > 0
      ? Math.min(parsedPerPage, MAX_PAGE_SIZE)
      : defaultPerPage;

  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
    take: perPage,
    pageParam,
    perPageParam,
  };
}

function pickString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
