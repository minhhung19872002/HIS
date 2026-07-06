import type { RouteEntry, RouteMeta } from '../../types/route';

export type { RouteEntry, RouteMeta };

import { commonV2Routes } from './common.routes';
import { clinicalV2Routes } from './clinical.routes';
import { diagnosticV2Routes } from './diagnostic.routes';
import { financialV2Routes } from './financial.routes';
import { administrationV2Routes } from './administration.routes';
import { systemV2Routes } from './system.routes';

// Aggregated, order-preserving list of every /v2/* route consumed by AppRoutes.
// NOTE: auth.routes.ts is NOT aggregated here — its standalone portals live
// outside /v2 with special/absent guards and are rendered inline by AppRoutes.
export const v2Routes: RouteEntry[] = [
  ...commonV2Routes,
  ...clinicalV2Routes,
  ...diagnosticV2Routes,
  ...financialV2Routes,
  ...administrationV2Routes,
  ...systemV2Routes,
];

if (import.meta.env.DEV) {
  const p = v2Routes.map((r) => r.path);
  const d = p.filter((x, i) => p.indexOf(x) !== i);
  if (d.length) console.error('[routeConfigs] duplicate v2 paths:', d);
}
