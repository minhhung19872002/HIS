import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../api/auth';
import type { User, LoginRequest } from '../api/auth';
import apiClient from '../services/apiClient';
import { storage, STORAGE_KEYS } from '../services/storage.service';
import { loadPermissions, clearPermissions } from '../services/permission.service';
import { loadEnabledModules, clearEnabledModules } from '../services/modulePackaging.service';
import { REFRESH_COOKIE_MODE } from '../config/api.config';
import { Modal } from 'antd';
import { fmtDate } from '../utils/format';

interface OtpPending {
  userId: string;
  maskedEmail: string;
  expiresAt: string;
}

/**
 * `false` = máy chủ TỪ CHỐI thông tin đăng nhập (401). `'throttled'` = bị chặn vì thử quá nhiều
 * lần (429). `'unavailable'` = không hỏi được máy chủ (mất mạng, 5xx, thân trả về lạ).
 *
 * T4/#219 (2026-09-04): trước đây cả ba đều gộp thành `false`, nên `Login.tsx` báo "Tên đăng nhập
 * hoặc mật khẩu không đúng!" cho cả lượt bị chặn tần suất lẫn lượt máy chủ hỏng. Người dùng nghe
 * sai nguyên nhân, gõ lại mật khẩu, hỏng tiếp, và cuối cùng bị KHÓA tài khoản (ngưỡng 5 lần) vì
 * một sự cố không liên quan gì tới mật khẩu của họ.
 */
type LoginResult = 'success' | 'otp' | 'throttled' | 'unavailable' | false;

// Helper log auth error với HTTP status + message (debug only — không expose lên UI;
// Login.tsx vẫn render generic message khi return false giữ contract).
// Per project convention: dùng console.warn cho expected failures (xem CLAUDE.md).
function logAuthError(operation: string, err: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const status = e?.response?.status;
  const message = e?.response?.data?.message || e?.message || 'Unknown error';
  if (!status && !e?.response) {
    console.warn(`[Auth/${operation}] Network error:`, message);
  } else {
    console.warn(`[Auth/${operation}] HTTP ${status ?? '?'}:`, message);
  }
}

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
      const token = storage.getRaw(STORAGE_KEYS.token);

      // Chỉ setUser SAU khi getCurrentUser() validate xong với server, tránh race
      // render protected page với user cache cũ rồi mới phát hiện token expired
      // → flicker UX. ProtectedRoute đã handle isLoading=true (App.tsx:292).
      if (token) {
        try {
          const raw = await authApi.getCurrentUser() as any;
          // Tolerant: interceptor unwrap → raw đã là User; fallback raw.data nếu chưa unwrap.
          const me = (raw && ('id' in raw || 'username' in raw)) ? raw : raw?.data;
          if (me && (me.id || me.username)) {
            await Promise.all([loadPermissions(), loadEnabledModules()]); // #378+#405: nạp TRƯỚC setUser → render đầu gate đúng
            setUser(me);
            storage.set(STORAGE_KEYS.user, me);
          } else {
            storage.remove(STORAGE_KEYS.token);
            storage.remove(STORAGE_KEYS.user);
          }
        } catch {
          storage.remove(STORAGE_KEYS.token);
          storage.remove(STORAGE_KEYS.user);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const checkExpiryAlertsOnLogin = () => {
    apiClient.get('/pharmacy/expiry-alerts/on-login').then(res => {
      const body = res.data;
      const alerts = body?.alerts || [];
      if (alerts.length > 0) {
        const content = alerts.map((a: { medicineName: string; batchNumber: string; expiryDate: string; alertLevelName: string }) =>
          `• ${a.medicineName} (lô ${a.batchNumber}) — hạn ${fmtDate(a.expiryDate)} [${a.alertLevelName}]`
        ).join('\n');
        Modal.warning({
          title: `⚠️ Cảnh báo thuốc sắp hết hạn (${alerts.length})`,
          content,
          width: 600,
          okText: 'Đã hiểu',
        });
      }
    }).catch(() => {});
  };

  const login = async (data: LoginRequest): Promise<LoginResult> => {
    try {
      const raw = await authApi.login(data) as any;
      // Tolerant cả 2 shape: apiClient interceptor (client.ts) auto-unwrap envelope
      // {success,data} → raw đã là payload bên trong. Nếu vì lý do nào đó chưa unwrap,
      // fallback raw.data. (Trước đây check response.success → luôn undefined → login vỡ.)
      const payload = (raw && ('token' in raw || 'requiresOtp' in raw)) ? raw : raw?.data;
      if (payload) {
        // Check if OTP is required
        if (payload.requiresOtp && payload.otpUserId) {
          setOtpPending({
            userId: payload.otpUserId,
            maskedEmail: payload.maskedEmail || '***@***',
            expiresAt: payload.otpExpiresAt || new Date(Date.now() + 5 * 60000).toISOString(),
          });
          return 'otp';
        }

        // Normal login (no 2FA)
        if (payload.token) {
          storage.set(STORAGE_KEYS.token, payload.token);
          // AUTHZ-2 (#368): lưu refresh token thật — interceptor apiClient auto-refresh khi 401
          if (payload.refreshToken) storage.set(STORAGE_KEYS.refreshToken, payload.refreshToken);
          storage.set(STORAGE_KEYS.user, payload.user);
          await Promise.all([loadPermissions(), loadEnabledModules()]); // #378+#405
          setUser(payload.user);
          checkExpiryAlertsOnLogin();
          return 'success';
        }
      }
      // 2xx nhưng thân trả về không có token lẫn cờ OTP — không phải "sai mật khẩu",
      // mà là không hiểu được câu trả lời.
      return 'unavailable';
    } catch (err) {
      logAuthError('login', err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = (err as any)?.response?.status as number | undefined;
      if (status === 429) return 'throttled';
      // Chỉ 401 mới thật sự là "thông tin đăng nhập không đúng". Máy chủ CỐ Ý cũng trả 401 cho
      // tài khoản đang bị khóa (tránh lộ việc tài khoản có tồn tại / đang bị khóa) — nên câu chữ
      // ở màn hình đăng nhập giữ nguyên chung chung là đúng, không sửa.
      if (status === 401) return false;
      return 'unavailable';
    }
  };

  const verifyOtp = async (otpCode: string): Promise<boolean> => {
    if (!otpPending) return false;
    try {
      const raw = await authApi.verifyOtp(otpPending.userId, otpCode) as any;
      // Tolerant cả 2 shape (xem ghi chú ở login): payload đã unwrap hoặc raw.data.
      const payload = (raw && 'token' in raw) ? raw : raw?.data;
      if (payload && payload.token) {
        storage.set(STORAGE_KEYS.token, payload.token);
        // AUTHZ-2 (#368): luồng OTP cũng nhận refresh token thật
        if (payload.refreshToken) storage.set(STORAGE_KEYS.refreshToken, payload.refreshToken);
        storage.set(STORAGE_KEYS.user, payload.user);
        await Promise.all([loadPermissions(), loadEnabledModules()]); // #378+#405
        setUser(payload.user);
        setOtpPending(null);
        checkExpiryAlertsOnLogin();
        return true;
      }
      return false;
    } catch (err) {
      logAuthError('verifyOtp', err);
      return false;
    }
  };

  const resendOtp = async (): Promise<boolean> => {
    if (!otpPending) return false;
    try {
      const raw = await authApi.resendOtp(otpPending.userId) as any;
      // Tolerant: interceptor unwrap → raw là boolean; fallback raw.success nếu chưa unwrap.
      return typeof raw === 'boolean' ? raw : !!raw?.success;
    } catch (err) {
      logAuthError('resendOtp', err);
      return false;
    }
  };

  const cancelOtp = () => {
    setOtpPending(null);
  };

  const logout = () => {
    // AUTHZ-2 (#368): thu hồi refresh token đúng thiết bị này (fire-and-forget,
    // header chụp trước khi clear — không đá thiết bị khác cùng user)
    // #422 cookie-mode: refresh token ở httpOnly cookie (không đọc được từ JS) → luôn gọi API
    // để BE đọc cookie + thu hồi + xoá cookie. localStorage-mode: chỉ gọi khi có rt như cũ.
    const rt = storage.getRaw(STORAGE_KEYS.refreshToken);
    if (REFRESH_COOKIE_MODE) authApi.logout();
    else if (rt) authApi.logout(rt);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.refreshToken);
    storage.remove(STORAGE_KEYS.user);
    clearPermissions(); // #378
    clearEnabledModules(); // #405
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
