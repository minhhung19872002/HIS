const DEFAULT_LOCAL_API_URL = 'http://localhost:5106/api';
const DEFAULT_LOCAL_REALTIME_URL = 'http://localhost:5106';

function normalizeUrl(value: string): string {
  return value ? value.replace(/\/+$/, '') : '';
}

export const API_URL = normalizeUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEFAULT_LOCAL_API_URL : '/api')
);

export const API_ORIGIN = API_URL.replace(/\/api$/, '');

/**
 * #422 [AUTHZ-2b]: dùng httpOnly cookie cho refresh token thay localStorage (chống XSS-read).
 * MẶC ĐỊNH OFF → apiClient giữ hành vi localStorage-mode (#368) byte-equivalent, KHÔNG gửi credentials.
 * BẬT (VITE_REFRESH_COOKIE=true) → withCredentials + refresh/logout gửi body rỗng (cookie mang token).
 * ⚠️ Chỉ bật khi FE+API cùng site/parent-domain — cross-site vercel.app↔run.app bị Safari/Firefox
 * chặn 3rd-party cookie. Bật ĐỒNG THỜI với BE Auth:RefreshCookieEnabled=true.
 */
export const REFRESH_COOKIE_MODE = import.meta.env.VITE_REFRESH_COOKIE === 'true';

export const REALTIME_ORIGIN = normalizeUrl(
  import.meta.env.VITE_REALTIME_URL || API_ORIGIN || (import.meta.env.DEV ? DEFAULT_LOCAL_REALTIME_URL : '')
);

export function buildApiUrl(path: string): string {
  return `${API_URL}/${path.replace(/^\/+/, '')}`;
}
