/**
 * Permission service — thin, non-React role/permission helpers. #services-consolidation
 *
 * #378: `can()` THẬT — đối chiếu permission set nạp từ `GET /api/me/permissions`
 * (catalog AUTHZ-1 #367, mã `Resource.Action` PascalCase). UX-only: an ninh thật
 * nằm ở BE [RequirePermission]. Fail-open khi CHƯA NẠP được set (mạng lỗi /
 * backend cũ) — không khoá nhầm user vì sự cố kỹ thuật.
 */

import apiClient from './apiClient';
import { storage, STORAGE_KEYS } from './storage.service';
import type { User } from '../api/auth';

function getUser(): User | null {
  return storage.get<User>(STORAGE_KEYS.user);
}

/** Danh sách role của user đang đăng nhập (rỗng nếu chưa login / không có). */
export function getRoles(): string[] {
  return getUser()?.roles ?? [];
}

/** User có role này không. */
export function hasRole(role: string): boolean {
  return getRoles().includes(role);
}

/** User có ÍT NHẤT một trong các role này không. */
export function hasAnyRole(roles: string[]): boolean {
  const mine = getRoles();
  return roles.some((r) => mine.includes(r));
}

// #378: permission set của user hiện tại. null = CHƯA nạp (fail-open).
let permissionSet: Set<string> | null = null;

/**
 * Nạp permission set từ BE — AuthContext await SAU khi lưu token, TRƯỚC setUser
 * → mọi render sau đăng nhập đã có set, không cần cơ chế subscription riêng.
 */
export async function loadPermissions(): Promise<void> {
  try {
    const res = await apiClient.get<string[]>('/me/permissions');
    const list = Array.isArray(res.data) ? res.data : null;
    permissionSet = list ? new Set(list) : null;
  } catch {
    permissionSet = null; // fetch fail → fail-open (UX-only; BE vẫn 403 chỗ nhạy cảm)
  }
}

/** Xoá set khi logout. */
export function clearPermissions(): void {
  permissionSet = null;
}

/**
 * Kiểm tra 1 permission (mã catalog `Resource.Action`, vd `Billing.Read`).
 * Set chưa nạp → true (fail-open); đã nạp → membership check.
 */
export function can(permission: string): boolean {
  if (permissionSet === null) return true;
  return permissionSet.has(permission);
}
