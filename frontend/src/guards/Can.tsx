import React from 'react';
import { usePermission } from '../hooks/usePermission';

/**
 * Can (#377) — ẩn/hiện phần tử UI (button, menu-item…) theo quyền.
 * `<Can permission="ADMIN.USERS">…</Can>`. Chưa điền mã quyền (#378) + `can()`
 * còn stub=true → hiện mọi thứ; sẽ tự lọc khi catalog quyền thật lên.
 */
export const Can: React.FC<{ permission: string; fallback?: React.ReactNode; children: React.ReactNode }> = ({
  permission,
  fallback = null,
  children,
}) => {
  const { can } = usePermission();
  return <>{can(permission) ? children : fallback}</>;
};

export default Can;
