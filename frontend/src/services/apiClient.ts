/**
 * apiClient service — home THẬT của axios instance dùng chung (relocate từ api/client.ts,
 * #services-consolidation).
 *
 * Interceptor: gắn Bearer token (request) + auto-unwrap envelope {success,data} +
 * AUTHZ-2 (#368) auto-refresh single-flight khi 401 (retry 1 lần) — hết đường cứu mới
 * xoá phiên & redirect /login. Caller nhận thẳng payload đã unwrap.
 */

import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { API_URL, REFRESH_COOKIE_MODE } from '../config/api.config';

// ─── AUTHZ-2 (#368): auto-refresh single-flight ───
// Nhiều request 401 cùng lúc → chỉ MỘT call /auth/refresh; các request khác đợi chung
// promise rồi replay. Server đã tolerate benign-race 60s nhưng single-flight đỡ 429 + gọn UX.
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async (): Promise<string | null> => {
      // #422 cookie-mode: refresh token nằm trong httpOnly cookie (JS không đọc được) → gửi body rỗng
      // + withCredentials để cookie tự đính kèm. localStorage-mode (#368 mặc định): đọc token từ localStorage.
      const rt = REFRESH_COOKIE_MODE ? null : localStorage.getItem('refreshToken');
      if (!REFRESH_COOKIE_MODE && !rt) return null;
      try {
        // axios TRẦN — không qua apiClient để tránh đệ quy interceptor
        const res = REFRESH_COOKIE_MODE
          ? await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
          : await axios.post(`${API_URL}/auth/refresh`, { refreshToken: rt });
        const body = res.data;
        const payload = body && typeof body === 'object' && 'data' in body ? body.data : body;
        if (payload?.token) {
          localStorage.setItem('token', payload.token);
          // rotation: server cấp refresh token MỚI mỗi lần — phải lưu lại, token cũ đã bị revoke.
          // Cookie-mode: BE xoá refreshToken khỏi body (cookie mới đã set qua Set-Cookie) → skip.
          if (payload.refreshToken) localStorage.setItem('refreshToken', payload.refreshToken);
          return payload.token as string;
        }
        return null;
      } catch {
        return null;
      }
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // #422: chỉ gửi cookie khi cookie-mode bật (CORS đã AllowCredentials + origins cụ thể).
  // Mặc định false → byte-equivalent hành vi cũ (không đính kèm credentials).
  withCredentials: REFRESH_COOKIE_MODE,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-unwrap ApiResponse envelope
apiClient.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      response.data = body.data;
    }
    return response;
  },
  async (error) => {
    // 401 = lỗi XÁC THỰC (token thiếu / hết hạn / không hợp lệ). Backend trả 403 cho lỗi
    // PHÂN QUYỀN. AUTHZ-2 (#368): gặp 401 → thử auto-refresh (single-flight) + replay
    // request 1 lần; chỉ khi hết đường cứu mới xoá phiên + đưa về /login.
    if (error.response?.status === 401) {
      // /inspector-portal là cổng standalone (login riêng của giám định viên BHXH);
      // không redirect về /login chính kể cả khi call nền (notification poll) bị 401.
      const onInspectorPortal = window.location.pathname.startsWith('/inspector-portal');
      if (!onInspectorPortal) {
        // #384: phiên bị chấm dứt (đăng nhập nơi khác last-wins / đổi mật khẩu / admin đá) —
        // refresh token cũng đã bị thu hồi → bỏ qua refresh, lưu lý do cho trang /login hiển thị.
        const bodyCode = (error.response?.data as { code?: string } | undefined)?.code;
        if (bodyCode === 'SESSION_INVALIDATED') {
          try { sessionStorage.setItem('logout_reason', 'SESSION_INVALIDATED'); } catch { /* private-mode */ }
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('refreshToken');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
        const original = error.config as RetriableConfig | undefined;
        const url = String(original?.url || '');
        // Không refresh cho chính các endpoint auth (login sai mật khẩu, OTP sai…)
        const isAuthFlow = url.includes('/auth/login') || url.includes('/auth/verify-otp')
          || url.includes('/auth/resend-otp') || url.includes('/auth/refresh');
        if (original && !original._retried && !isAuthFlow) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            original._retried = true;
            original.headers = original.headers ?? {};
            original.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(original); // replay — envelope unwrap chạy lại như thường
          }
        }
        // Hết đường cứu (không có/refresh fail/đã retry) → behavior cũ: xoá phiên + /login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    // 503 = bảo trì → signal để layout hiện banner (TODO: implement MaintenanceBanner listener in TerminalLayout)
    if (error.response?.status === 503) {
      window.dispatchEvent(new CustomEvent('his:maintenance', { detail: { retry: error.config?.url } }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;

/**
 * httpErrorMessage — chuỗi tiếng Việt mô tả lỗi HTTP cho toast/thông báo.
 * Import tại điểm hiển thị lỗi để hiện message thay vì status code trần.
 */
export { httpErrorMessage } from '../components/shared/HttpError';
