import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import axios from 'axios';

/**
 * Đăng nhập nhân viên — đi qua BFF chứ không gọi thẳng HIS.
 *
 * `POST /api/v1/staff/auth/login` chuyển tiếp sang HIS rồi trả token về. Nhờ vậy web quản trị này
 * **không cần biết HIS nằm ở đâu**: mang sang bệnh viện dùng HIS của hãng khác thì chỉ đổi cấu hình
 * của BFF, không phải build lại web.
 */

const API_BASE: string =
  (import.meta.env.VITE_PATIENT_APP_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';

export interface StaffSession {
  token: string;
  fullName: string;
  roles: string[];
}

const STORAGE_KEY = 'patientapp_admin_session';

interface AuthValue {
  session: StaffSession | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthValue>({
  session: null,
  login: async () => {},
  logout: () => {},
});

export const useAuth = (): AuthValue => useContext(AuthCtx);

function readStored(): StaffSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StaffSession) : null;
  } catch {
    // localStorage bị chặn (chế độ ẩn danh, cấu hình trình duyệt) — coi như chưa đăng nhập.
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<StaffSession | null>(readStored);

  const login = useCallback(async (username: string, password: string) => {
    const response = await axios.post(`${API_BASE}/api/v1/staff/auth/login`, { username, password });

    const body = response.data;
    const data = (body && typeof body === 'object' && 'data' in body ? body.data : body) as StaffSession;

    if (!data?.token) throw new Error('Máy chủ không trả về token đăng nhập.');

    // Cùng khoá `token` mà `api/patientApp.ts` đọc — dùng lại nguyên bộ gọi API của HIS frontend
    // mà không phải sửa gì trong đó.
    try {
      localStorage.setItem('token', data.token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* không lưu được thì phiên chỉ sống trong tab này */
    }
    setSession(data);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* bỏ qua */
    }
    setSession(null);
  }, []);

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};
