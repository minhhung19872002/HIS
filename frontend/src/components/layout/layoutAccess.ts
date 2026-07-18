/**
 * layoutAccess — ma trận ACTOR × LAYOUT (#431 Phase 1). Đây là TEST-ORACLE (bản định-nghĩa của user):
 * KHÔNG gác layout trực tiếp theo actor lúc runtime — cổng thật là permission→module (RBAC).
 * Ma trận này để KIỂM THỬ: sau khi gán permission→module + module→layout, tập layout mỗi actor chạm
 * được phải KHỚP bảng dưới. Spec §3: docs/architecture/layout-architecture/10-actor-layout-taxonomy.md.
 * primary(✅) · secondary(⚠️) · blocked(❌).
 */
import type { AccessKey, ActorId, Access } from './types';

const P: Access = 'primary';
const S: Access = 'secondary';
const X: Access = 'blocked';

/** auth/blank/error = primary cho mọi actor (xuyên suốt). */
const UNIVERSAL = { auth: P, blank: P, error: P } as const;

export const LAYOUT_ACCESS: Record<ActorId, Record<AccessKey, Access>> = {
  system_admin: { ...UNIVERSAL, admin: P, clinical: X, workstation: X, dashboard: S, wizard: S },
  director:     { ...UNIVERSAL, admin: X, clinical: X, workstation: X, dashboard: P, wizard: X },
  dept_head:    { ...UNIVERSAL, admin: X, clinical: S, workstation: S, dashboard: P, wizard: S },
  doctor:       { ...UNIVERSAL, admin: X, clinical: P, workstation: S, dashboard: S, wizard: P },
  nurse:        { ...UNIVERSAL, admin: X, clinical: P, workstation: P, dashboard: S, wizard: P },
  reception:    { ...UNIVERSAL, admin: X, clinical: X, workstation: P, dashboard: S, wizard: P },
  cashier:      { ...UNIVERSAL, admin: X, clinical: X, workstation: P, dashboard: S, wizard: P },
  pharmacist:   { ...UNIVERSAL, admin: X, clinical: X, workstation: P, dashboard: S, wizard: P },
  lab_tech:     { ...UNIVERSAL, admin: X, clinical: S, workstation: P, dashboard: S, wizard: P },
  imaging_tech: { ...UNIVERSAL, admin: X, clinical: S, workstation: P, dashboard: S, wizard: P },
  store:        { ...UNIVERSAL, admin: X, clinical: X, workstation: P, dashboard: S, wizard: P },
};

/** Band landing mặc định mỗi actor (§3 — vai chính; multi-role suy từ union quyền ở runtime). */
export const DEFAULT_BAND: Record<ActorId, AccessKey> = {
  system_admin: 'admin',
  director: 'dashboard',
  dept_head: 'dashboard',
  doctor: 'clinical',
  nurse: 'clinical',
  reception: 'workstation',
  cashier: 'workstation',
  pharmacist: 'workstation',
  lab_tech: 'workstation',
  imaging_tech: 'workstation',
  store: 'workstation',
};

/** actor có được chạm layout (không bị block)? — dùng cho kiểm thử oracle, không phải guard runtime. */
export function canAccessLayout(actor: ActorId, key: AccessKey): boolean {
  return LAYOUT_ACCESS[actor]?.[key] !== 'blocked';
}

export function accessLevel(actor: ActorId, key: AccessKey): Access {
  return LAYOUT_ACCESS[actor]?.[key] ?? 'blocked';
}

export function defaultBand(actor: ActorId): AccessKey {
  return DEFAULT_BAND[actor] ?? 'workstation';
}
