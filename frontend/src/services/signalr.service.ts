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

export interface CreateHubConnectionOptions {
  /** Token provider passed to withUrl. Mặc định đọc 'token' từ localStorage mỗi lần gọi. */
  accessTokenFactory?: () => string;
  /** Mảng delay (ms) cho withAutomaticReconnect. Mặc định [0,2000,5000,10000,30000]. */
  reconnectDelays?: number[];
  /** Mức log. Mặc định LogLevel.None. */
  logLevel?: LogLevel;
}

const DEFAULT_RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

/**
 * Dựng một HubConnection tới `${REALTIME_ORIGIN}${relativeUrl}` với cấu hình chung.
 * `relativeUrl` phải bắt đầu bằng '/', vd '/hubs/notifications'.
 */
export function createHubConnection(
  relativeUrl: string,
  opts: CreateHubConnectionOptions = {},
): HubConnection {
  const {
    accessTokenFactory = () => localStorage.getItem('token') || '',
    reconnectDelays = DEFAULT_RECONNECT_DELAYS,
    logLevel = LogLevel.None,
  } = opts;

  return new HubConnectionBuilder()
    .withUrl(`${REALTIME_ORIGIN}${relativeUrl}`, { accessTokenFactory })
    .withAutomaticReconnect(reconnectDelays)
    .configureLogging(logLevel)
    .build();
}
