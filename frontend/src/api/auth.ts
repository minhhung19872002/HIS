import apiClient from '../services/apiClient';
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
