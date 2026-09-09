// Authenticated user shape returned by /auth/* endpoints.
// Extracted from api/auth.ts (which now re-exports from here);
// AuthContext, permission.service + auth types consume this.

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  employeeCode?: string;
  title?: string;
  departmentName?: string;
  roles: string[];
  permissions: string[];
  isTwoFactorEnabled?: boolean;
  /** #216 TC-PERM-015: đang bị buộc đổi mật khẩu → RouteGuard đưa tới /change-password; server chặn độc lập. */
  mustChangePassword?: boolean;
  /** 'first_login' (tài khoản mới / admin reset) | 'expired' (mật khẩu quá hạn). */
  mustChangePasswordReason?: string;
}
