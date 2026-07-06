// Auth request/response DTO shapes for the /auth/* endpoints.
// Extracted from api/auth.ts (which now re-exports from here).

import type { User } from './user';

export interface LoginRequest {
  username: string;
  password: string;
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

export interface TwoFactorStatus {
  isEnabled: boolean;
  maskedEmail?: string;
}
