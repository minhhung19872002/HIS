import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginRequest } from '../api/auth';

interface OtpPending {
  userId: string;
  maskedEmail: string;
  expiresAt: string;
}

type LoginResult = 'success' | 'otp' | false;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  otpPending: OtpPending | null;
  login: (data: LoginRequest) => Promise<LoginResult>;
  verifyOtp: (otpCode: string) => Promise<boolean>;
  resendOtp: () => Promise<boolean>;
  cancelOtp: () => void;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otpPending, setOtpPending] = useState<OtpPending | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Optionally validate token with server
          const response = await authApi.getCurrentUser();
          if (response.success && response.data) {
            setUser(response.data);
            localStorage.setItem('user', JSON.stringify(response.data));
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest): Promise<LoginResult> => {
    try {
      const response = await authApi.login(data);
      if (response.success && response.data) {
        // Check if OTP is required
        if (response.data.requiresOtp && response.data.otpUserId) {
          setOtpPending({
            userId: response.data.otpUserId,
            maskedEmail: response.data.maskedEmail || '***@***',
            expiresAt: response.data.otpExpiresAt || new Date(Date.now() + 5 * 60000).toISOString(),
          });
          return 'otp';
        }

        // Normal login (no 2FA)
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        return 'success';
      }
      return false;
    } catch {
      return false;
    }
  };

  const verifyOtp = async (otpCode: string): Promise<boolean> => {
    if (!otpPending) return false;
    try {
      const response = await authApi.verifyOtp(otpPending.userId, otpCode);
      if (response.success && response.data && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setUser(response.data.user);
        setOtpPending(null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (!otpPending) return false;
    try {
      const response = await authApi.resendOtp(otpPending.userId);
      return response.success;
    } catch {
      return false;
    }
  };

  const cancelOtp = () => {
    setOtpPending(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setOtpPending(null);
  };

  const hasPermission = (permission: string): boolean => {
    return user?.permissions?.includes(permission) ?? false;
  };

  const hasRole = (role: string): boolean => {
    return user?.roles?.includes(role) ?? false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        otpPending,
        login,
        verifyOtp,
        resendOtp,
        cancelOtp,
        logout,
        hasPermission,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
