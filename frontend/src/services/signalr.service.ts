/**
 * SignalR service — single home cho @microsoft/signalr HubConnection. #services-consolidation
 *
 * Gom pattern build-connection dùng chung (baseURL REALTIME_ORIGIN + access-token
 * factory + automatic reconnect + tắt log) vào 1 factory. Mỗi call-site vẫn tự
 * gắn `.on(...)` / `.start()` riêng — chỉ phần DỰNG connection được rút gọn.
 *
 * Các delay reconnect mặc định [0,2000,5000,10000,30000] khớp đúng pattern đang
 * dùng ở NotificationContext / risChat; SigningContext truyền mảng ngắn hơn của
 * riêng nó qua `reconnectDelays` để giữ byte-equivalent.
 */

import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import type { HubConnection } from '@microsoft/signalr';
import { REALTIME_ORIGIN } from '../config/api.config';
import { refreshAccessToken } from './apiClient';

export interface CreateHubConnectionOptions {
  /** Token provider passed to withUrl. Mặc định: {@link getFreshAccessToken}. */
  accessTokenFactory?: () => string | Promise<string>;
  /** Mảng delay (ms) cho withAutomaticReconnect. Mặc định [0,2000,5000,10000,30000]. */
  reconnectDelays?: number[];
  /** Mức log. Mặc định LogLevel.None. */
  logLevel?: LogLevel;
}

const DEFAULT_RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

function tokenExpiresSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() + 30_000;
  } catch {
    return false;
  }
}

/**
 * QA-R10: đọc token MỚI NHẤT mỗi lần (re)connect — access token chỉ sống 30 phút và được
 * apiClient xoay vào localStorage; trước đây call-site chụp token lúc mount nên reconnect sau
 * 30 phút luôn 401 (realtime chết tới khi đăng nhập lại). Token sắp/đã hết hạn → refresh trước
 * (server đóng kết nối khi token hết hạn: CloseOnAuthenticationExpiration).
 */
export async function getFreshAccessToken(): Promise<string> {
  const token = localStorage.getItem('token') || '';
  if (token && tokenExpiresSoon(token)) {
    return (await refreshAccessToken()) || token;
  }
  return token;
}

/**
 * Dựng một HubConnection tới `${REALTIME_ORIGIN}${relativeUrl}` với cấu hình chung.
 * `relativeUrl` phải bắt đầu bằng '/', vd '/hubs/notifications'.
 */
export function createHubConnection(
  relativeUrl: string,
  opts: CreateHubConnectionOptions = {},
): HubConnection {
  const {
    accessTokenFactory = getFreshAccessToken,
    reconnectDelays = DEFAULT_RECONNECT_DELAYS,
    logLevel = LogLevel.None,
  } = opts;

  return new HubConnectionBuilder()
    .withUrl(`${REALTIME_ORIGIN}${relativeUrl}`, { accessTokenFactory })
    .withAutomaticReconnect(reconnectDelays)
    .configureLogging(logLevel)
    .build();
}
