import React from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * AuthLayout (#431) — container CHUẨN cho màn CHƯA đăng nhập (login / OTP / portal login).
 * Nền auth (gradient thương hiệu) + căn giữa; caller đặt Card/Form của mình vào children.
 * Dùng bởi `pages/Login` + các cổng ngoài — gom style căn-giữa auth về một nơi (không lặp).
 */
export const AuthLayout: React.FC<{ children?: ReactNode }> = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 24,
    }}
  >
    {children ?? <Outlet />}
  </div>
);

export default AuthLayout;
