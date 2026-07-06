import { useAuth } from './useAuth';
import { getRoles, hasRole, hasAnyRole, can } from '../services/permission.service';

/**
 * usePermission — hook kiểm tra role/permission trong component. #hooks-consolidation
 *
 * Bọc `permission.service` (non-React) + subscribe `useAuth` để re-render khi
 * login/logout. `can()` hiện là stub — sẽ nối catalog phân quyền thật ở AUTHZ #367/#378.
 */
export function usePermission() {
  const { user } = useAuth(); // subscribe -> re-render khi trạng thái auth đổi
  return {
    user,
    roles: getRoles(),
    hasRole,
    hasAnyRole,
    can,
  };
}
