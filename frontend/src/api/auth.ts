import axios from 'axios';
import apiClient from '../services/apiClient';
import { API_URL } from '../config/api.config';
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
   */
  refresh: async (refreshToken: string): Promise<LoginResponse | null> => {
    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
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
   */
  logout: (refreshToken: string): void => {
    const tk = localStorage.getItem('token');
    if (!tk || !refreshToken) return;
    axios.post(`${API_URL}/auth/logout`, { refreshToken }, {
      headers: { Authorization: `Bearer ${tk}` },
    }).catch(() => { /* logout best-effort — stamp/reuse-detection che phần còn lại */ });
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
