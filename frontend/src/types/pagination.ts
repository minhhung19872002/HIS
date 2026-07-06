// Shared pagination shapes.
//
// PagedResultDto<T> — canonical home for the paged-list envelope that was
// duplicated (byte-identical) across 12 api/*.ts modules. Those modules now
// re-export from here for back-compat.
// PageMeta — the `meta` block on the standard ApiResponse envelope.

export interface PagedResultDto<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
