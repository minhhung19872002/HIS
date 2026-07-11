import React from 'react';
import type { RouteMeta } from '../types/route';
import { usePermission } from '../hooks/usePermission';
import Forbidden403 from './Forbidden403';

/**
 * RequirePermission (#377) — route guard theo `meta.permission`.
 * GIAI ĐOẠN NÀY: registry chưa điền permission (undefined) → mọi route pass
 * (không ai bị chặn). Khi #378 điền mã quyền + AUTHZ #367 nối `can()` thật,
 * guard tự có hiệu lực mà KHÔNG cần sửa lại nơi wire.
 */
export const RequirePermission: React.FC<{ meta?: RouteMeta; children: React.ReactNode }> = ({ meta, children }) => {
  const { can } = usePermission();
  const permOk = !meta?.permission || can(meta.permission);
  if (!permOk) return <Forbidden403 resource={meta?.title} />;
  return <>{children}</>;
};

export default RequirePermission;
