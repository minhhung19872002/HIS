/**
 * Module packaging service (#405) — cờ EnabledModules (Gói PK / Gói BV, doc 08 §7).
 * Nạp 1 lần/phiên sau login (AuthContext, cùng nhịp loadPermissions). KHÔNG phải
 * security boundary — chỉ ẩn/hiện packaging; BE permission (#367) lo an ninh.
 * Fail-open: chưa nạp được (backend cũ / lỗi mạng) → coi như bật hết (hành vi cũ).
 */

import apiClient from './apiClient';
import type { CommercialModuleId } from '../types/route';
import { ACCESS_GATING_ENABLED } from './permission.service';

let enabledSet: Set<string> | null = null;

export async function loadEnabledModules(): Promise<void> {
  try {
    const res = await apiClient.get<string[]>('/system/enabled-modules');
    const list = Array.isArray(res.data) ? res.data : null;
    enabledSet = list ? new Set(list) : null;
  } catch {
    enabledSet = null; // fail-open
  }
}

export function clearEnabledModules(): void {
  enabledSet = null;
}

/** Module này có đang bật không. Route không gán module → luôn true. */
export function isModuleEnabled(module?: CommercialModuleId): boolean {
  if (!ACCESS_GATING_ENABLED) return true; // gating tắt → không ẩn theo gói module (mặc định)
  if (!module) return true;
  if (enabledSet === null) return true; // fail-open — hành vi cũ
  return enabledSet.has(module);
}
