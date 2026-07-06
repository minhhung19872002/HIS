const DEFAULT_LOCAL_API_URL = 'http://localhost:5106/api';
const DEFAULT_LOCAL_REALTIME_URL = 'http://localhost:5106';

function normalizeUrl(value: string): string {
  return value ? value.replace(/\/+$/, '') : '';
}

export const API_URL = normalizeUrl(
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? DEFAULT_LOCAL_API_URL : '/api')
);

export const API_ORIGIN = API_URL.replace(/\/api$/, '');

export const REALTIME_ORIGIN = normalizeUrl(
  import.meta.env.VITE_REALTIME_URL || API_ORIGIN || (import.meta.env.DEV ? DEFAULT_LOCAL_REALTIME_URL : '')
);

export function buildApiUrl(path: string): string {
  return `${API_URL}/${path.replace(/^\/+/, '')}`;
}
