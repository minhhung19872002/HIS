/**
 * Workspace service (#404) — tầng 4 không gian làm việc trên 1 shell (doc 08 §2).
 * Workspace = DATA trong registry (`route.meta.workspace`, điền ở #375) — KHÔNG phải
 * 4 layout vật lý. Sidebar lọc item theo workspace hiện hành; topbar hiện switcher
 * khi user thấy được ≥2 workspace (suy từ permission, không gán tay per-user).
 */

import type { WorkspaceId } from '../types/route';
import { isPathAllowed, workspaceForPath, ALL_ITEMS } from './menu.service';
import { storage } from './storage.service';

export interface WorkspaceDef {
  id: WorkspaceId;
  label: string;
  short: string;
  icon: string;
  order: number;
}

export const WORKSPACES: WorkspaceDef[] = [
  { id: 'frontoffice', label: 'Tiếp đón & Thu phí',  short: 'TIẾP ĐÓN',  icon: 'user-plus',   order: 1 },
  { id: 'clinical',    label: 'Chuyên môn',          short: 'CHUYÊN MÔN', icon: 'stethoscope', order: 2 },
  { id: 'pharmacy',    label: 'Dược & Kho',          short: 'DƯỢC',      icon: 'pill',        order: 3 },
  { id: 'backoffice',  label: 'Quản trị & Báo cáo',  short: 'QUẢN TRỊ',  icon: 'chart',       order: 4 },
];

export const workspaceDef = (id: WorkspaceId): WorkspaceDef =>
  WORKSPACES.find((w) => w.id === id) ?? WORKSPACES[1];

/**
 * Workspace user được thấy = union workspace của các MENU ITEM user có quyền
 * (fail-open khi permission set chưa nạp → đủ 4 — an toàn, chỉ là UX).
 */
export function availableWorkspaces(): WorkspaceId[] {
  const seen = new Set<WorkspaceId>();
  ALL_ITEMS.forEach((it) => {
    const ws = workspaceForPath(it.path);
    if (ws && isPathAllowed(it.path)) seen.add(ws);
  });
  return WORKSPACES.filter((w) => seen.has(w.id)).map((w) => w.id);
}

// v2: bump key để BỎ QUA giá trị auto-lưu của bản #404 lỗi (đã đá user vào 1 workspace
// khiến "menu mất hết"). Bản mới opt-in — chỉ lưu khi user chủ động chọn trên switcher.
const STORE_KEY = 'his.workspace.v2';

/** Workspace đã lưu; null = chưa chọn hoặc chọn tường minh 'all' (Tất cả) → không lọc. */
export function getStoredWorkspace(): WorkspaceId | null {
  const v = storage.getRaw(STORE_KEY);
  return WORKSPACES.some((w) => w.id === v) ? (v as WorkspaceId) : null;
}

/** Lưu workspace đang chọn; truyền 'all' để ghi nhớ lựa chọn "Tất cả" (#404 hotfix). */
export function setStoredWorkspace(ws: WorkspaceId | 'all'): void {
  storage.set(STORE_KEY, ws);
}
