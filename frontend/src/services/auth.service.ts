/**
 * Auth service — thin functional facade cho auth. #services-consolidation
 *
 * RE-EXPORT các call API auth thuần (`api/auth.ts`) + token helpers nhỏ ủy quyền
 * cho storage.service. State React auth VẪN ở `contexts/AuthContext` — KHÔNG chuyển.
 */

import { authApi } from '../api/auth';
import { storage, STORAGE_KEYS } from './storage.service';

export { authApi };
export type { LoginRequest, LoginResponse, User, TwoFactorStatus } from '../api/auth';

/** Đọc JWT thô từ localStorage (chuỗi thô, không JSON). */
export function getToken(): string | null {
  return storage.getRaw(STORAGE_KEYS.token);
}

/** Ghi JWT (chuỗi thô). */
export function setToken(token: string): void {
  storage.set(STORAGE_KEYS.token, token);
}

/** Xoá JWT khỏi localStorage. */
export function clearToken(): void {
  storage.remove(STORAGE_KEYS.token);
}
