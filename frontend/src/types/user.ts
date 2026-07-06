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
}
