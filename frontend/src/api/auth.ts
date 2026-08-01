import axios from 'axios';
import apiClient from '../services/apiClient';
import { API_URL, REFRESH_COOKIE_MODE } from '../config/api.config';
import type { ApiResponse } from './types';
import type { User } from '../types/user';
import type { LoginRequest, LoginResponse, TwoFactorStatus } from '../types/auth';

export type { ApiResponse } from './types';
export type { User } from '../types/user';
export type { LoginRequest, LoginResponse, TwoFactorStatus } from '../types/auth';

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data;
  },

  verifyOtp: async (userId: string, otpCode: string): Promise<ApiResponse<LoginResponse>> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/verify-otp', { userId, otpCode });
    return response.data;
  },

  resendOtp: async (userId: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/resend-otp', { userId });
    return response.data;
  },

  /**
   * AUTHZ-2 (#368): đổi refresh token lấy cặp token mới (rotation).
   * Dùng axios TRẦN — access token có thể đã hết hạn và KHÔNG được đi qua
   * interceptor apiClient (tránh đệ quy 401→refresh→401).
   * #422 cookie-mode: token nằm trong httpOnly cookie → gửi body rỗng + withCredentials.
   */
  refresh: async (refreshToken?: string): Promise<LoginResponse | null> => {
    try {
      const res = REFRESH_COOKIE_MODE
        ? await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
        : await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const body = res.data;
      const payload = body && typeof body === 'object' && 'data' in body ? body.data : body;
      return payload && payload.token ? (payload as LoginResponse) : null;
    } catch {
      return null;
    }
  },

  /**
   * AUTHZ-2 (#368): thu hồi refresh token của đúng thiết bị này (fire-and-forget).
   * Dùng axios trần + header chụp tại thời điểm gọi — an toàn khi caller xoá
   * localStorage ngay sau đó (interceptor apiClient đọc localStorage ở microtask).
   * #422 cookie-mode: refresh token trong cookie → gửi body rỗng + withCredentials để BE đọc + xoá cookie.
   */
  logout: (refreshToken?: string): void => {
    if (REFRESH_COOKIE_MODE) {
      // #437: cookie-mode gọi endpoint AllowAnonymous /logout-by-token — thu hồi bằng CHÍNH cookie,
      // chạy được cả khi access token đã hết hạn (idle-logout) hoặc localStorage đã bị xoá.
      // KHÔNG gửi Bearer ([Authorize] /logout sẽ 401 khi token hết hạn → cookie sống sót = resurrection).
      axios.post(`${API_URL}/auth/logout-by-token`, {}, { withCredentials: true })
        .catch(() => { /* logout best-effort */ });
      return;
    }
    const tk = localStorage.getItem('token');
    if (!tk || !refreshToken) return; // localStorage-mode: cần token để thu hồi
    axios.post(`${API_URL}/auth/logout`, { refreshToken },
      { headers: { Authorization: `Bearer ${tk}` } },
    ).catch(() => { /* logout best-effort — stamp/reuse-detection che phần còn lại */ });
  },

  /** Xác thực lại mật khẩu user hiện tại (dùng cho idle-lock / phê duyệt nhạy cảm). */
  verifyPassword: async (userId: string, password: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>('/auth/verify-password', { userId, password });
    return response.data === true;
  },

  getCurrentUser: async (): Promise<ApiResponse<User>> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  changePassword: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const response = await apiClient.post('/auth/change-password', data);
    return response.data;
  },

  /** #385 Break-glass: tạo phiên truy cập khẩn cấp hồ sơ BN (TTL 2h). */
  breakGlass: async (patientId: string, reason: string): Promise<{ sessionId: string; expireAt: string } | null> => {
    try {
      const response = await apiClient.post<{ sessionId: string; expireAt: string }>('/auth/break-glass', { patientId, reason });
      return response.data;
    } catch {
      return null;
    }
  },

  getTwoFactorStatus: async (): Promise<ApiResponse<TwoFactorStatus>> => {
    const response = await apiClient.get<ApiResponse<TwoFactorStatus>>('/auth/2fa-status');
    return response.data;
  },

  enableTwoFactor: async (password: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/enable-2fa', { password });
    return response.data;
  },

  disableTwoFactor: async (password: string): Promise<ApiResponse<boolean>> => {
    const response = await apiClient.post<ApiResponse<boolean>>('/auth/disable-2fa', { password });
    return response.data;
  },
};
