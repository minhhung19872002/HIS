import React from 'react';
import { usePermission } from '../../../hooks';

export interface PermissionGuardProps {
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ action, children, fallback = null }: PermissionGuardProps): React.ReactElement {
  const { can } = usePermission();
  return can(action) ? <>{children}</> : <>{fallback}</>;
}
