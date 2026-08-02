import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../../api/system';

/* ==========================================================================
   #352 parity v1 Dashboard: trạng thái dịch vụ + biểu đồ hoạt động + doanh thu
   theo khoa / loại BN. Native bars + conic-donut theo design pack (không recharts
   để giữ cockpit nhẹ + đồng bộ thẩm mỹ terminal).
   ========================================================================== */

const fmtMil = (n: number) => n >= 1_000_000 ? `${Math.round(n / 1_000_000)}tr` : n.toLocaleString('vi-VN');

// ── 1. Trạng thái dịch vụ hôm nay (done/pending per service) ─────────────────

const SERVICES: { label: string; done: keyof HospitalDashboardDto; pending: keyof HospitalDashboardDto; color: string }[] = [
  { label: 'Khám bệnh',  done: 'serviceOpdDone',          pending: 'serviceOpdPending',          color: 'var(--a-cy)' },
  { label: 'CĐHA',       done: 'serviceRadiologyDone',    pending: 'serviceRadiologyPending',    color: 'var(--a-vi, #7c3aed)' },
  { label: 'Xét nghiệm', done: 'serviceLabDone',          pending: 'serviceLabPending',          color: 'var(--a-bl, #2563eb)' },
  { label: 'Phẫu thuật', done: 'serviceSurgeryDone',      pending: 'serviceSurgeryPending',      color: 'var(--s-crit)' },
  { label: 'Thủ thuật',  done: 'serviceProcedureDone',    pending: 'serviceProcedurePending',    color: 'var(--a-am, #d97706)' },
  { label: 'Kê đơn',     done: 'servicePrescriptionDone', pending: 'servicePrescriptionPending', color: 'var(--a-gr, #16a34a)' },
];

export const ServiceStatusStrip: React.FC<{ d: HospitalDashboardDto | null }> = ({ d }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Trạng thái <b>dịch vụ</b></span>
      <span className="sub">· hôm nay · xong / chờ</span>
    </div>
    <div className="panel-body pad">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {SERVICES.map((s) => {
          const done = Number(d?.[s.done] ?? 0);
          const pending = Number(d?.[s.pending] ?? 0);
          return (
            <div key={s.label} style={{
              border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)', padding: '6px 8px',
              borderLeft: `3px solid ${s.color}`,
            }}>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{s.label}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <b className="mono" style={{ color: 'var(--s-ok)', fontSize: 'var(--fs-md)' }}>{done}</b>
                <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: pending > 0 ? 'var(--s-warn)' : 'var(--t-3)' }}>
                  {pending > 0 ? `+${pending} chờ` : '0 chờ'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);

// ── 2. Biểu đồ hoạt động (trend 7 ngày / theo khoa / phân bố) ────────────────

type ChartView = 'trend' | 'dept' | 'dist';

const donutStyle = (segs: { value: number; color: string }[]): React.CSSProperties => {
  const total = Math.max(1, segs.reduce((s, x) => s + x.value, 0));
  let acc = 0;
  const stops = segs.map((s) => {
    const from = (acc / total) * 360; acc += s.value;
    const to = (acc / total) * 360;
    return `${s.color} ${from}deg ${to}deg`;
  });
  return {
    width: 120, height: 120, borderRadius: '50%',
    background: `conic-gradient(${stops.join(', ')})`,
    // lỗ donut
    WebkitMask: 'radial-gradient(circle at center, transparent 38px, #000 39px)',
    mask: 'radial-gradient(circle at center, transparent 38px, #000 39px)',
  };
};

export const ActivityChartCard: React.FC<{
  history: (HospitalDashboardDto | null)[];
  byDept: { departmentId: string; departmentName: string; count: number }[];
}> = ({ history, byDept }) => {
  const [view, setView] = useState<ChartView>('trend');

  const days = useMemo(() => history.filter(Boolean).map((d) => ({
    date: dayjs(String(d?.reportDate ?? d?.date ?? '')).format('DD/MM'),
    out: Number(d?.todayOutpatients ?? d?.outpatientCount ?? 0),
    adm: Number(d?.todayAdmissions ?? d?.admissionCount ?? 0),
  })), [history]);
  const maxDay = Math.max(1, ...days.map((x) => Math.max(x.out, x.adm)));

  const topDepts = useMemo(() => [...byDept].sort((a, b) => b.count - a.count).slice(0, 8), [byDept]);
  const maxDept = Math.max(1, ...topDepts.map((d) => d.count));

  const latest = history[history.length - 1] ?? null;
  const dist = [
    { name: 'Ngoại trú', value: Number(latest?.todayOutpatients ?? 0), color: 'var(--a-cy)' },
    { name: 'Cấp cứu',   value: Number(latest?.todayEmergencies ?? 0), color: '#ff4d4f' },
    { name: 'Nội trú',   value: Number(latest?.currentInpatients ?? 0), color: '#faad14' },
  ].filter((x) => x.value > 0);

  const seg = (v: ChartView, l: string) => (
    <button type="button" className={`btn sm${view === v ? ' primary' : ''}`} onClick={() => setView(v)}>{l}</button>
  );

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Biểu đồ <b>hoạt động</b></span>
        <div className="actions" style={{ display: 'flex', gap: 4 }}>
          {seg('trend', '7 ngày')}{seg('dept', 'Theo khoa')}{seg('dist', 'Phân bố')}
        </div>
      </div>
      <div className="panel-body pad">
        {view === 'trend' && (
          days.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Chưa có dữ liệu 7 ngày</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
                {days.map((x, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 96, width: '100%', justifyContent: 'center' }}>
                      <div title={`Ngoại trú: ${x.out}`} style={{ width: 10, height: `${(x.out / maxDay) * 100}%`, minHeight: x.out > 0 ? 3 : 0, background: 'var(--a-cy)', borderRadius: 2 }} />
                      <div title={`Nhập viện: ${x.adm}`} style={{ width: 10, height: `${(x.adm / maxDay) * 100}%`, minHeight: x.adm > 0 ? 3 : 0, background: '#faad14', borderRadius: 2 }} />
                    </div>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--t-3)' }}>{x.date}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: 'var(--a-cy)', borderRadius: 2, marginRight: 4 }} />Ngoại trú</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#faad14', borderRadius: 2, marginRight: 4 }} />Nhập viện</span>
              </div>
            </>
          )
        )}
        {view === 'dept' && (
          topDepts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Chưa có dữ liệu khoa phòng</div>
          ) : (
            <div className="opd-depts">
              {topDepts.map((d) => (
                <div key={d.departmentId} className="dept-row">
                  <span className="dept-n" title={d.departmentName}>{d.departmentName}</span>
                  <div className="dept-bar"><div className="dept-bar-fill" style={{ width: `${(d.count / maxDept) * 100}%`, background: 'var(--a-cy)' }} /></div>
                  <span className="dept-v">{d.count}</span>
                </div>
              ))}
            </div>
          )
        )}
        {view === 'dist' && (
          dist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Chưa có dữ liệu phân bố</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, justifyContent: 'center', padding: '6px 0' }}>
              <div style={donutStyle(dist)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dist.map((x) => (
                  <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-sm)' }}>
                    <span style={{ width: 9, height: 9, background: x.color, borderRadius: 2 }} />
                    <span style={{ color: 'var(--t-2)' }}>{x.name}</span>
                    <b className="mono">{x.value}</b>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

// ── 3. Doanh thu theo khoa + theo loại BN ────────────────────────────────────

export const RevenueBreakdownCard: React.FC<{
  latest: HospitalDashboardDto | null;
  deptStats: DepartmentStatisticsDto[];
}> = ({ latest, deptStats }) => {
  const deptRev = useMemo(() => {
    const fromStats = deptStats
      .map((d) => ({ id: d.departmentId, name: d.departmentName, revenue: d.totalRevenue ?? 0 }))
      .filter((d) => d.revenue > 0);
    const rows = fromStats.length > 0
      ? fromStats
      : (latest?.revenueByDepartment ?? []).map((d) => ({ id: d.departmentId, name: d.departmentName, revenue: d.revenue }));
    return rows.sort((a, b) => b.revenue - a.revenue).slice(0, 6);
  }, [deptStats, latest]);
  const maxRev = Math.max(1, ...deptRev.map((d) => d.revenue));

  const total = Number(latest?.todayRevenue ?? latest?.totalRevenue ?? 0);
  const hasSplit = (latest?.revenueBHYT ?? 0) + (latest?.revenueSelfPay ?? 0) + (latest?.revenueOther ?? 0) > 0;
  // BE chưa trả split → ước lượng như v1 (60/35/5) để pie không trống khi có doanh thu
  const byType = (hasSplit ? [
    { name: 'BHYT',       value: Number(latest?.revenueBHYT ?? 0),    color: 'var(--a-cy)' },
    { name: 'Tự chi trả', value: Number(latest?.revenueSelfPay ?? 0), color: '#52c41a' },
    { name: 'Khác',       value: Number(latest?.revenueOther ?? 0),   color: '#faad14' },
  ] : [
    { name: 'BHYT (ước)',       value: Math.round(total * 0.6),  color: 'var(--a-cy)' },
    { name: 'Tự chi trả (ước)', value: Math.round(total * 0.35), color: '#52c41a' },
    { name: 'Khác (ước)',       value: Math.round(total * 0.05), color: '#faad14' },
  ]).filter((x) => x.value > 0);

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Doanh thu <b>theo khoa</b></span>
        <span className="sub">· hôm nay</span>
      </div>
      <div className="panel-body pad">
        {deptRev.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Chưa có doanh thu theo khoa</div>
        ) : (
          <div className="opd-depts">
            {deptRev.map((d) => (
              <div key={d.id} className="dept-row">
                <span className="dept-n" title={d.name}>{d.name}</span>
                <div className="dept-bar"><div className="dept-bar-fill" style={{ width: `${(d.revenue / maxRev) * 100}%`, background: '#52c41a' }} /></div>
                <span className="dept-v mono">{fmtMil(d.revenue)}</span>
              </div>
            ))}
          </div>
        )}
        {byType.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)' }}>
            <div style={{ ...donutStyle(byType), width: 76, height: 76, WebkitMask: 'radial-gradient(circle at center, transparent 24px, #000 25px)', mask: 'radial-gradient(circle at center, transparent 24px, #000 25px)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {byType.map((x) => (
                <div key={x.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--fs-xs)' }}>
                  <span style={{ width: 8, height: 8, background: x.color, borderRadius: 2 }} />
                  <span style={{ color: 'var(--t-2)' }}>{x.name}</span>
                  <b className="mono">{fmtMil(x.value)}</b>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
