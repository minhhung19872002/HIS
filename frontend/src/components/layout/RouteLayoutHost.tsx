import React from 'react';
import type { ReactNode } from 'react';
import type { RouteMeta } from '../../types/route';
import { resolveRouteLayout } from './layoutRegistry';
import { BlankLayout } from './BlankLayout';
import { FullscreenLayout } from './FullscreenLayout';

/**
 * RouteLayoutHost (#431 Phase 2) — chọn OVERRIDE layout cho 1 route.
 * - `layoutOverride='blank'`  → BlankLayout (in/embed)
 * - `layoutOverride='fullscreen'` → FullscreenLayout (viewer/kiosk)
 * - không override → trả thẳng children (render trong band-shell = TerminalLayout ở tầng router).
 *
 * Router (Phase 3) bọc mỗi route bằng host này; hiện KHÔNG route nào tag override → behavior giữ nguyên.
 * Layout do route (module/workspace) quyết định — KHÔNG theo actor (spec §4).
 */
export const RouteLayoutHost: React.FC<{
  meta?: Pick<RouteMeta, 'workspace' | 'layoutOverride'>;
  children: ReactNode;
}> = ({ meta, children }) => {
  const layout = resolveRouteLayout(meta ?? {});
  if (layout === 'blank') return <BlankLayout>{children}</BlankLayout>;
  if (layout === 'fullscreen') return <FullscreenLayout>{children}</FullscreenLayout>;
  return <>{children}</>;
};

export default RouteLayoutHost;
