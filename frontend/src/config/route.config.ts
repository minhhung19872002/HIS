/**
 * Route path constants — nguồn duy nhất cho mọi đường dẫn cố định trong app.
 * Import từ đây thay vì hard-code string '/login', '/v2/dashboard'... rải khắp nơi.
 */

export const ROUTES = {
  LOGIN:     '/login',
  HOME:      '/v2',
  DASHBOARD: '/v2/dashboard',
  /** Error page: ROUTES.ERROR(404) → '/v2/error/404' */
  ERROR: (code: number | string) => `/v2/error/${code}`,
  // Portal routes (public / no auth required)
  PATIENT_PORTAL:   '/v2/patient-portal',
  INSPECTOR_PORTAL: '/v2/inspector',
} as const;

/** Redirect sau khi đăng nhập thành công. */
export const POST_LOGIN_REDIRECT = ROUTES.DASHBOARD;

/** Các route public không cần xác thực (dùng cho guard bypass). */
export const PUBLIC_ROUTES: string[] = [
  ROUTES.LOGIN,
  ROUTES.PATIENT_PORTAL,
  ROUTES.INSPECTOR_PORTAL,
];
