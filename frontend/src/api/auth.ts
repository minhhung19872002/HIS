import apiClient from './client';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  employeeCode?: string;
  title?: string;
  departmentName?: string;
  roles: string[];
  permissions: string[];
  isTwoFactorEnabled?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  user: User;
  requiresOtp?: boolean;
  otpUserId?: string;
  maskedEmail?: string;
  otpExpiresAt?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: string[];
}

export interface TwoFactorStatus {
  isEnabled: boolean;
  maskedEmail?: string;
}

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
