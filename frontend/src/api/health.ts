import axios from 'axios';

// Types
export interface ComponentHealth {
  status: 'Healthy' | 'Unhealthy' | 'Degraded';
  responseTime?: string;
  error?: string;
  port?: number;
  freeGb?: number;
  totalGb?: number;
  usedMb?: number;
  totalMb?: number;
  usagePercent?: number;
}

export interface HealthCheckResult {
  status: 'Healthy' | 'Unhealthy' | 'Degraded';
  timestamp: string;
  uptime: string;
  version: string;
  checks: {
    sqlServer: ComponentHealth;
    redis: ComponentHealth;
    orthancPacs: ComponentHealth;
    hl7Listener: ComponentHealth;
    diskSpace: ComponentHealth;
    memory: ComponentHealth;
  };
}

export interface MetricsSnapshot {
  timestamp: string;
  uptimeSeconds: number;
  totalRequests: number;
  activeRequests: number;
  errorCount: number;
  errorRate: number;
  averageResponseTimeMs: number;
  requestsPerMinute: number;
  topEndpoints: Record<string, number>;
  statusCodeDistribution: Record<number, number>;
}

// Helper: get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Public endpoints (no auth required) - uses /health proxy
export const getHealthStatus = () =>
  axios.get<{ status: string; timestamp: string; uptime: string; version: string }>('/health');

export const getHealthLive = () =>
  axios.get<{ status: string; timestamp: string }>('/health/live');

export const getHealthReady = () =>
  axios.get<{ status: string; timestamp: string }>('/health/ready');

// Authenticated endpoints - /health/details uses /health proxy, /api/metrics uses /api proxy
export const getHealthDetails = () =>
  axios.get<HealthCheckResult>('/health/details', { headers: getAuthHeaders() });

export const getMetrics = () =>
  axios.get<MetricsSnapshot>('/api/metrics', { headers: getAuthHeaders() });
