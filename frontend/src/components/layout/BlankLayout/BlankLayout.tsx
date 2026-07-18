import React from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * BlankLayout (#431) — override: đã đăng nhập nhưng KHÔNG chrome (in ấn / embed / PDF preview).
 * Page override sang layout này khi cần hiển thị trần (Print → Blank).
 */
export const BlankLayout: React.FC<{ children?: ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: 'var(--d-0)', color: 'var(--t-0)' }}>
    {children ?? <Outlet />}
  </div>
);

export default BlankLayout;
