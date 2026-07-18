import type { LazyExoticComponent, ComponentType } from 'react';

// ---------------------------------------------------------------------------
// RouteEntry — the data shape for every /v2/* route (behavior-preserving
// extraction of the inline <Route> tree that used to live in App.tsx).
// `meta.permission` is intentionally omitted for now — filled later in #378.
// Extracted from router/routeConfigs/index.ts (which now re-exports from here).
// ---------------------------------------------------------------------------
/** #375 re-scope (doc 08 §2): 4 không gian làm việc thương mại. */
export type WorkspaceId = 'frontoffice' | 'clinical' | 'pharmacy' | 'backoffice';

/** #375 re-scope (doc 08 §7): 10 module thương mại; 'extended' = ngoài gói (ẩn bởi EnabledModules #405). */
export type CommercialModuleId =
  | 'TIEPDON' | 'KHAMBENH' | 'LIS' | 'CDHA' | 'DUOCKHO'
  | 'THUNGAN' | 'BHYT' | 'NOITRU' | 'BAOCAO' | 'QUANTRI'
  | 'extended';

export interface RouteMeta {
  title: string;
  group: string;
  permission?: string;
  /** #375: workspace chứa trang (sidebar theo workspace / switcher #404 đọc). */
  workspace?: WorkspaceId;
  /** #375: module thương mại (cờ EnabledModules #405 đọc). */
  module?: CommercialModuleId;
  /** #431: page OVERRIDE sang layout đặc biệt (in→'blank', viewer→'fullscreen'). Mặc định = band-shell suy từ workspace. */
  layoutOverride?: 'blank' | 'fullscreen';
  /** #431: VARIANT/mode trong band (luồng nhiều bước / master-detail). */
  layoutVariant?: 'wizard' | 'split';
}

export interface RouteEntry {
  path: string;
  Component?: LazyExoticComponent<ComponentType<any>>;
  redirect?: string;
  index?: boolean;
  meta: RouteMeta;
}
