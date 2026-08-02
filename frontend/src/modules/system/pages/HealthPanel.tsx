// Panel giám sát hệ thống — port v1 pages/system-admin/HealthTab.tsx sang v2.
// Behavior-preserve: interval 30s, pause khi tab inactive (`active` prop), cleanup trên unmount.
// API tại api/health.ts (KHÔNG được relocate — giữ nguyên import path).

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { API_ORIGIN } from '../../../config/api.config';
import {
  getHealthDetails, getMetrics,
  type HealthCheckResult, type MetricsSnapshot, type ComponentHealth,
} from '../../../api/health';
import {
  KpiStrip, DataTable, StatusBadge, Btn, type ColumnDef,
} from '@/_v2kit';

const COMPONENT_LABELS: Record<string, string> = {
  sqlServer: 'SQL Server',
  redis: 'Redis Cache',
  orthancPacs: 'Orthanc PACS',
  hl7Listener: 'HL7 Listener',
  diskSpace: 'Ổ đĩa',
  memory: 'Bộ nhớ',
};

type StatusCodeRow = { code: string; count: number };
type EndpointRow = { path: string; count: number };

const statusCodeColumns: ColumnDef<StatusCodeRow>[] = [
  {
    key: 'code', label: 'HTTP', mono: true, width: 110,
    render: (r) => {
      const n = parseInt(r.code);
      const tone = n < 300 ? 'ok' : n < 400 ? 'info' : n < 500 ? 'warn' : 'crit';
      return <StatusBadge tone={tone}>{r.code}</StatusBadge>;
    },
  },
  { key: 'count', label: 'Số lượt', mono: true, render: (r) => r.count },
];

const endpointColumns: ColumnDef<EndpointRow>[] = [
  { key: 'path', label: 'Endpoint', mono: true, render: (r) => r.path },
  { key: 'count', label: 'Lượt', mono: true, width: 100, render: (r) => r.count },
];

const HealthPanel: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealthData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([getHealthDetails(), getMetrics()]);
      if (
        healthRes.status === 'fulfilled' &&
        healthRes.value.data &&
        typeof healthRes.value.data === 'object' &&
        (healthRes.value.data as HealthCheckResult).status
      ) {
        setHealthData(healthRes.value.data as HealthCheckResult);
      }
      if (metricsRes.status === 'fulfilled' && metricsRes.value.data) {
        setMetricsData(metricsRes.value.data as MetricsSnapshot);
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('Health fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Pause interval khi tab inactive — Antd Tabs giữ component mounted nên PHẢI dùng prop `active`.
  useEffect(() => {
    if (!active) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    fetchHealthData();
    intervalRef.current = setInterval(fetchHealthData, 30000);
    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    };
  }, [active, fetchHealthData]);

  const healthTone = healthData?.status === 'Healthy' ? 'ok' : healthData?.status === 'Degraded' ? 'warn' : healthData ? 'crit' : undefined;
  const statusCodeRows: StatusCodeRow[] = metricsData
    ? Object.entries(metricsData.statusCodeDistribution).map(([code, count]) => ({ code, count }))
    : [];
  const endpointRows: EndpointRow[] = metricsData
    ? Object.entries(metricsData.topEndpoints).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count)
    : [];

  return (
    <>
      <div className="ab-tools">
        {healthData && (
          <StatusBadge tone={healthTone} dot>
            {healthData.status === 'Healthy' ? 'Hệ thống bình thường' :
             healthData.status === 'Degraded' ? 'Hoạt động hạn chế' : 'Gặp sự cố'}
          </StatusBadge>
        )}
        {lastUpdated && (
          <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
            Cập nhật: {dayjs(lastUpdated).format('HH:mm:ss')}
          </span>
        )}
        <span className="spacer" />
        <Btn variant="ghost" onClick={fetchHealthData}>{loading ? 'Đang tải…' : 'Làm mới (30s)'}</Btn>
      </div>

      {!healthData && !loading && (
        <div style={{ padding: 'var(--space-16)', color: 'var(--t-2)', textAlign: 'center' }}>
          Không thể kết nối đến backend — kiểm tra API đang chạy tại {(API_ORIGIN as string | undefined) || window.location.origin}
        </div>
      )}

      {(healthData || metricsData) && (
        <KpiStrip items={[
          { lbl: 'Phiên bản', val: healthData?.version || '—' },
          { lbl: 'Uptime', val: healthData?.uptime || '—' },
          { lbl: 'Tổng requests', val: metricsData?.totalRequests ?? 0 },
          { lbl: 'Req/phút', val: metricsData ? Number(metricsData.requestsPerMinute.toFixed(1)) : 0 },
          { lbl: 'Phản hồi TB', val: metricsData ? Number(metricsData.averageResponseTimeMs.toFixed(1)) : 0, unit: 'ms' },
          { lbl: 'Lỗi', val: metricsData?.errorCount ?? 0, tone: (metricsData?.errorCount ?? 0) > 0 ? 'crit' : 'ok' },
        ]} />
      )}

      {healthData?.checks && Object.keys(healthData.checks).length > 0 && (
        <>
          <div style={{ fontWeight: 600, margin: 'var(--space-12) 0 var(--space-8)' }}>Trạng thái thành phần</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
            {(Object.entries(healthData.checks) as [string, ComponentHealth][]).map(([key, check]) => {
              const tone = check.status === 'Healthy' ? 'ok' : check.status === 'Degraded' ? 'warn' : 'crit';
              return (
                <div key={key} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-10)', background: 'var(--d-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                    <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{COMPONENT_LABELS[key] || key}</span>
                    <StatusBadge tone={tone} dot>{check.status}</StatusBadge>
                  </div>
                  {check.responseTime && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Phản hồi: {check.responseTime}</div>
                  )}
                  {check.error && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--s-crit)', marginTop: 'var(--space-4)' }}>{check.error}</div>
                  )}
                  {key === 'diskSpace' && check.freeGb !== undefined && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
                      Trống: {check.freeGb} GB / {check.totalGb} GB ({check.usagePercent || 0}%)
                    </div>
                  )}
                  {key === 'memory' && check.usedMb !== undefined && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
                      Sử dụng: {check.usedMb} MB / {check.totalMb} MB ({check.usagePercent || 0}%)
                    </div>
                  )}
                  {key === 'hl7Listener' && check.port && (
                    <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Port: {check.port}</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {statusCodeRows.length > 0 && (
        <>
          <div style={{ fontWeight: 600, marginBottom: 'var(--space-8)' }}>Phân bố mã HTTP</div>
          <DataTable<StatusCodeRow>
            columns={statusCodeColumns}
            data={statusCodeRows}
            rowKey={(r) => r.code}
            empty="Chưa có dữ liệu" />
        </>
      )}

      {endpointRows.length > 0 && (
        <>
          <div style={{ fontWeight: 600, margin: 'var(--space-12) 0 var(--space-8)' }}>Endpoint phổ biến</div>
          <DataTable<EndpointRow>
            columns={endpointColumns}
            data={endpointRows}
            rowKey={(r) => r.path}
            empty="Chưa có dữ liệu" />
        </>
      )}
    </>
  );
};

export default HealthPanel;
