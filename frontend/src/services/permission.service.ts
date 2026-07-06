/**
 * Permission service — thin, non-React role/permission helpers. #services-consolidation
 *
 * Đọc user từ storage.service để suy ra roles. `can()` hiện là stub trả true —
 * chừa chỗ cho epic AUTHZ (catalog phân quyền thật). KHÔNG đụng call-site role-check
 * hiện có (additive).
 */

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

/**
 * Kiểm tra 1 permission cụ thể.
 * TODO #367/#378: wire real permission catalog (AUTHZ epic) — hiện trả true.
 */
export function can(_permission: string): boolean {
  return true;
}
