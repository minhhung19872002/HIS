/**
 * navTrail — vết điều hướng trong phiên làm việc, để nút "Quay lại" ở màn báo lỗi
 * đưa người dùng về ĐÚNG trang đang thao tác thay vì rơi về trang chủ.
 *
 * Ghi ở `TerminalLayout` mỗi lần đổi route; đọc ở `HttpError`. Lưu `sessionStorage`
 * nên deep-link/hard-reload vẫn còn vết trong cùng tab trình duyệt (đóng tab là sạch —
 * cùng ngữ nghĩa "phiên làm việc" với `useSessionState`, nơi các trang giữ tab đang mở).
 */

const KEY = 'his.nav.trail';
const MAX = 10;

const read = (): string[] => {
  try {
    const raw = sessionStorage.getItem(KEY);
    const arr: unknown = raw ? JSON.parse(raw) : null;
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const write = (trail: string[]): void => {
  try { sessionStorage.setItem(KEY, JSON.stringify(trail)); } catch { /* private-mode/quota */ }
};

/** Ghi vị trí hiện tại (pathname + search) vào đầu vết; bỏ trùng liền kề. */
export function recordLocation(location: string): void {
  const trail = read();
  if (trail[0] === location) return;
  write([location, ...trail.filter((x) => x !== location)].slice(0, MAX));
}

/**
 * Vị trí để "Quay lại": mục gần nhất KHÁC vị trí hiện tại. Màn lỗi (404/403/500/
 * ErrorBoundary) luôn nằm tại vị trí hiện tại, nên mục này chính là trang người dùng
 * đang thao tác trước khi lỗi xảy ra. Không có vết → `null` để caller tự fallback.
 */
export function getBackTarget(currentLocation: string): string | null {
  return read().find((x) => x !== currentLocation) ?? null;
}
