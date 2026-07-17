import React from 'react';
import type { RouteMeta } from '../../types/route';
import { usePermission } from '../../hooks/usePermission';
import { isModuleEnabled } from '../../services/modulePackaging.service';
import Forbidden403 from './Forbidden403';
import ModuleNotEnabled from './ModuleNotEnabled';

/**
 * RequirePermission (#377) — route guard theo `meta.permission` (#378 điền mã + can()
 * thật) và `meta.module` (#405 packaging: module tắt → trang "chưa kích hoạt" — KHÁC
 * 403 thiếu quyền, kèm hướng dẫn nâng cấp gói).
 */
export const RequirePermission: React.FC<{ meta?: RouteMeta; children: React.ReactNode }> = ({ meta, children }) => {
  const { can } = usePermission();
  // #405: packaging check TRƯỚC — module tắt thì có quyền cũng không vào
  if (meta?.module && !isModuleEnabled(meta.module)) return <ModuleNotEnabled resource={meta?.title} />;
  const permOk = !meta?.permission || can(meta.permission);
  if (!permOk) return <Forbidden403 resource={meta?.title} />;
  return <>{children}</>;
};

export default RequirePermission;
