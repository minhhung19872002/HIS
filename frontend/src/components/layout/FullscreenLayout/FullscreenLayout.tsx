import React from 'react';
import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

/**
 * FullscreenLayout (#431) — override: viewer DICOM / kiosk tự phục vụ / màn hình hàng chờ.
 * Edge-to-edge, chrome ẩn, CÓ scroll. Page override sang đây khi cần toàn màn hình.
 *
 * KHÔNG ép màu (bg/text): trang con tự quyết theme của mình. Trước đây ép nền đen + chữ trắng
 * làm DICOM Viewer (Antd nền sáng) lỗi tương phản sáng/tối (#431 fix). Nền mặc định = surface
 * sáng của app (Antd Layout) để trang sáng render đúng; trang muốn nền tối tự set bên trong.
 */
export const FullscreenLayout: React.FC<{ children?: ReactNode }> = ({ children }) => (
  <div style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#f0f2f5' }}>
    {children ?? <Outlet />}
  </div>
);

export default FullscreenLayout;
