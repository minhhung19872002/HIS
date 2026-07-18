/**
 * layoutRegistry — suy LAYOUT cho 1 route (#431). Layout do ROUTE (workspace/module) quyết định, KHÔNG theo
 * actor; page override khi cần. Spec §4/§5: docs/architecture/layout-architecture/10-actor-layout-taxonomy.md.
 *
 * Reconcile #404 (§5): band suy TỪ `meta.workspace` (KHÔNG re-cut phá WorkspaceId) — frontoffice + pharmacy
 * = quầy nghiệp vụ → workstation · clinical → clinical · backoffice → admin.
 */
import type { LayoutId } from './types';
import type { WorkspaceId } from '../../types/route';

export function bandForWorkspace(ws?: WorkspaceId): LayoutId {
  switch (ws) {
    case 'clinical': return 'clinical';
    case 'backoffice': return 'admin';
    case 'frontoffice':
    case 'pharmacy':
    default: return 'workstation';
  }
}

/**
 * Layout để render 1 route (§4): override ('blank'/'fullscreen') ưu tiên; nếu không → band suy từ workspace.
 * Router dùng qua RouteLayoutHost; band-shell = TerminalLayout (band-aware, lọc theo workspace #404).
 */
export function resolveRouteLayout(meta?: { workspace?: WorkspaceId; layoutOverride?: 'blank' | 'fullscreen' }): LayoutId {
  if (meta?.layoutOverride) return meta.layoutOverride;
  return bandForWorkspace(meta?.workspace);
}
