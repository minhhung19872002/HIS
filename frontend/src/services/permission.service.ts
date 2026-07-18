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

/**
 * MASTER SWITCH lọc menu/route theo quyền ở FE. MẶC ĐỊNH TẮT — menu hiện ĐẦY ĐỦ như
 * trước (FE gating chỉ là UX; an ninh THẬT ở BE [RequirePermission] #367, không đổi khi tắt).
 * Bật lại bằng env VITE_ACCESS_GATING=true (không cần sửa code). Xem #378/#404/#405.
 */
export const ACCESS_GATING_ENABLED =
  (import.meta.env.VITE_ACCESS_GATING as string | undefined) === 'true';

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
  if (!ACCESS_GATING_ENABLED) return true; // gating tắt → hiện/cho phép tất cả (mặc định)
  if (permissionSet === null) return true;
  return permissionSet.has(permission);
}

/**
 * #431 Phase 2.5 — TRANG CHỦ theo quyền: actor sau đăng nhập vào route HỌ CÓ QUYỀN, tránh 403.
 * Trước đây mọi actor redirect cứng `/v2/dashboard` (permission Report.Read) → điều dưỡng/tiếp đón/
 * dược sĩ/KTV-XN KHÔNG có Report.Read nên khi gating ON bị 403 ngay màn đầu.
 *
 * Duyệt ứng viên HẸP→RỘNG theo actor, trả route đầu tiên `can()` cho phép. Gating OFF → `can()` luôn
 * true → trả ứng viên đầu (`/v2/dashboard`) = giữ nguyên hành vi cũ. Fallback `/v2` (ModuleIndex,
 * KHÔNG cần quyền) — luôn an toàn, không bao giờ 403.
 */
const HOME_CANDIDATES: ReadonlyArray<readonly [string, string]> = [
  ['System.Configure', '/v2/dashboard'], // Admin (có full → dashboard tổng quan)
  ['Reception.Read', '/v2/reception'],    // Tiếp đón
  ['Pharmacy.Read', '/v2/pharmacy'],      // Dược sĩ
  ['LabResult.Create', '/v2/lab'],        // KTV Xét nghiệm
  ['Radiology.Create', '/v2/radiology'],  // KTV Chẩn đoán hình ảnh
  ['MedicalRecord.Read', '/v2/opd'],      // Bác sĩ + Điều dưỡng → Khám bệnh
  ['Billing.Read', '/v2/finance'],        // Thu ngân
  ['Report.Read', '/v2/dashboard'],       // Actor còn lại có báo cáo
];

export function resolveHomeRoute(): string {
  for (const [perm, path] of HOME_CANDIDATES) {
    if (can(perm)) return path;
  }
  return '/v2'; // ModuleIndex — cover page không gác quyền, luôn vào được
}
