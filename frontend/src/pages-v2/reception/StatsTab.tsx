import React, { useMemo } from 'react';
import type { RoomOverviewDto } from '../../api/reception';
import type { RawRow } from './shared';
import { treatmentLabel } from './shared';
export const StatsTab: React.FC<{ rows: RawRow[]; rooms: RoomOverviewDto[] }> = ({ rows, rooms }) => {
  const byHour = useMemo(() => {
    const m: Record<number, number> = {};
    for (let h = 7; h <= 18; h++) m[h] = 0;
    rows.forEach((r) => {
      const h = new Date(r.admissionDate).getHours();
      if (m[h] !== undefined) m[h] = (m[h] || 0) + 1;
    });
    return m;
  }, [rows]);
  const maxH = Math.max(...Object.values(byHour), 1);

  const byDept = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.departmentName || '—';
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [rows]);
  const maxD = Math.max(...byDept.map((d) => d.v), 1);

  const byPatientType = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = treatmentLabel(r);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [rows]);

  return (
    <div className="ab-stack" style={{ padding: '16px 14px', gap: 'var(--space-14)', overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-14)' }}>
        <ChartCard title="LƯỢT TIẾP ĐÓN THEO GIỜ">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 'var(--space-6)', height: 160, padding: '0 10px' }}>
            {Object.entries(byHour).map(([h, n]) => (
              <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{n}</span>
                <div style={{
                  width: '100%',
                  height: `${(n / maxH) * 120}px`,
                  background: 'linear-gradient(180deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: 2,
                }} />
                <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{h}h</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="THEO LOẠI BỆNH NHÂN">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', padding: '0 6px' }}>
            {byPatientType.length === 0 && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu</span>}
            {byPatientType.map((d) => {
              const pct = rows.length ? Math.round(d.v / rows.length * 100) : 0;
              return (
                <div key={d.k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 'var(--space-3)' }}>
                    <span>{d.k}</span>
                    <span className="mono"><b>{d.v}</b> · {pct}%</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--d-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--a-cy)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title={`THEO KHOA · ${byDept.length} KHOA`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 24px', padding: '0 6px' }}>
          {byDept.length === 0 && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Chưa có dữ liệu</span>}
          {byDept.map((d) => {
            const pct = (d.v / maxD) * 100;
            return (
              <div key={d.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: 'var(--space-3)' }}>
                  <span>{d.k}</span>
                  <span className="mono"><b>{d.v}</b></span>
                </div>
                <div style={{ height: 7, background: 'var(--d-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: 'linear-gradient(90deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      <ChartCard title="TỔNG QUAN PHÒNG KHÁM">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-12)' }}>
          <StatCell label="Tổng phòng" value={rooms.length} />
          <StatCell label="Tổng BN/ngày" value={rooms.reduce((s, r) => s + r.totalPatientsToday, 0)} />
          <StatCell label="Tổng đang chờ" value={rooms.reduce((s, r) => s + r.waitingCount, 0)} tone="warn" />
          <StatCell label="Tổng đã khám" value={rooms.reduce((s, r) => s + r.completedCount, 0)} tone="ok" />
        </div>
      </ChartCard>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; tone?: 'ok' | 'warn' }> = ({ label, value, tone }) => (
  <div style={{
    background: 'var(--d-1)', border: '1px solid var(--line-soft)',
    borderRadius: 'var(--r-2)', padding: '10px 12px',
  }}>
    <div style={{
      fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase',
      letterSpacing: 0.4, fontWeight: 600,
    }}>{label}</div>
    <div style={{
      fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: tone === 'warn' ? 'var(--s-warn)' : tone === 'ok' ? '#15803d' : 'var(--t-0)',
      lineHeight: 1.2, marginTop: 'var(--space-4)',
    }}>{value}</div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    background: 'var(--d-2)', border: '1px solid var(--line)',
    borderRadius: 'var(--r-3)', padding: '14px 16px',
  }}>
    <div style={{
      fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600,
      letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 'var(--space-14)',
    }}>{title}</div>
    {children}
  </div>
);

/* ────────────────────────────────────────────────────────────
   Visit detail drawer body
   ──────────────────────────────────────────────────────────── */

