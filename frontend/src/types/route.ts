import type { LazyExoticComponent, ComponentType } from 'react';

// ---------------------------------------------------------------------------
// RouteEntry — the data shape for every /v2/* route (behavior-preserving
// extraction of the inline <Route> tree that used to live in App.tsx).
// `meta.permission` is intentionally omitted for now — filled later in #378.
// Extracted from router/routeConfigs/index.ts (which now re-exports from here).
// ---------------------------------------------------------------------------
export interface RouteMeta {
  title: string;
  group: string;
  permission?: string;
}

export interface RouteEntry {
  path: string;
  Component?: LazyExoticComponent<ComponentType<any>>;
  redirect?: string;
  index?: boolean;
  meta: RouteMeta;
}
