import React from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * FullscreenLayout (#431) — override: viewer DICOM / kiosk tự phục vụ / màn hình hàng chờ.
 * Edge-to-edge, nền tối, chrome ẩn. Page override sang đây khi cần toàn màn hình.
 */
export const FullscreenLayout: React.FC<{ children?: ReactNode }> = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, background: '#000', color: '#fff', overflow: 'hidden' }}>
    {children ?? <Outlet />}
  </div>
);

export default FullscreenLayout;
