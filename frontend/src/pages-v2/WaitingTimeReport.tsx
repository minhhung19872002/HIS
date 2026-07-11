/**
 * F9.4 — Phân tích thời gian chờ theo từng khâu
 * Đăng ký → Khám → CLS → Kết quả → Kê đơn
 * Break-down theo đối tượng (BHYT/viện phí/dịch vụ) và theo khoa.
 *
 * Wiring spec (cho điều phối viên):
 *   Route:      /v2/reports/waiting-time
 *   Label menu: "Thời gian chờ"  (dưới nhóm "Báo cáo")
 *   Import:     lazy(() => import('./WaitingTimeReport'))
 */
import React, { useCallback, useEffect, useState } from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getWaitingPhaseAnalysis,
  type WaitingPhaseAnalysisDto,
  type DepartmentWaitingDto,
} from '../modules/reception/api/reception';
import {
  KpiStrip, TopTabs, DataTable, StatusBadge, Btn, ti,
  type ColumnDef,
} from './_v2kit';

const { RangePicker } = DatePicker;

type Tab = 'overview' | 'byDepartment';

const PHASE_LABELS: { key: keyof WaitingPhaseAnalysisDto; label: string }[] = [
  { key: 'registrationToExamMinutes',      label: 'Đăng ký → Khám' },
  { key: 'examDurationMinutes',            label: 'Thời gian khám' },
  { key: 'examToClsRequestMinutes',        label: 'Khám → Chỉ định CLS' },
  { key: 'clsRequestToResultMinutes',      label: 'CLS → Kết quả' },
  { key: 'clsResultToPrescriptionMinutes', label: 'KQ CLS → Kê đơn' },
  { key: 'overallMinutes',                 label: 'Tổng (đăng ký → xong)' },
];

const OBJECT_COLORS = {
  insurance: '#1890ff',
  fee: '#52c41a',
  service: '#fa8c16',
};

const WaitingTimeReport: React.FC = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day').startOf('day'),
    dayjs().endOf('day'),
  ]);
  const [data, setData] = useState<WaitingPhaseAnalysisDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getWaitingPhaseAnalysis(
        range[0].format('YYYY-MM-DD'),
        range[1].format('YYYY-MM-DD'),
      );
      setData(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      setError(msg);
      ti('Không tải được báo cáo thời gian chờ');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // Dữ liệu biểu đồ so sánh 3 đối tượng theo từng phase
  const phaseChartData = data ? [
    {
      phase: 'Đăng ký→Khám',
      BHYT: data.insurancePatients.registrationToExamMinutes,
      'Viện phí': data.feePatients.registrationToExamMinutes,
      'Dịch vụ': data.servicePatients.registrationToExamMinutes,
    },
    {
      phase: 'Thời gian khám',
      BHYT: data.insurancePatients.examDurationMinutes,
      'Viện phí': data.feePatients.examDurationMinutes,
      'Dịch vụ': data.servicePatients.examDurationMinutes,
    },
    {
      phase: 'Tổng',
      BHYT: data.insurancePatients.overallMinutes,
      'Viện phí': data.feePatients.overallMinutes,
      'Dịch vụ': data.servicePatients.overallMinutes,
    },
  ] : [];

  const deptCols: ColumnDef<DepartmentWaitingDto>[] = [
    { key: 'dept',     label: 'Khoa',               render: (r) => <b>{r.departmentName}</b> },
    { key: 'visits',   label: 'Lượt khám',  mono: true, render: (r) => <StatusBadge tone="info">{r.visitCount}</StatusBadge> },
    {
      key: 'regToExam', label: 'ĐK → Khám (phút)', mono: true,
      render: (r) => (
        <StatusBadge tone={r.registrationToExamMinutes > 30 ? 'crit' : r.registrationToExamMinutes > 15 ? 'warn' : 'ok'}>
          {r.registrationToExamMinutes.toFixed(1)}
        </StatusBadge>
      ),
    },
    {
      key: 'overall', label: 'Tổng (phút)', mono: true,
      render: (r) => (
        <StatusBadge tone={r.overallMinutes > 60 ? 'crit' : r.overallMinutes > 30 ? 'warn' : 'ok'}>
          {r.overallMinutes.toFixed(1)}
        </StatusBadge>
      ),
    },
  ];

  const TABS = [
    { v: 'overview' as Tab,      l: 'Tổng quan',      ic: 'activity' },
    { v: 'byDepartment' as Tab,  l: `Theo khoa (${data?.byDepartment.length ?? 0})`, ic: 'settings' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng lượt', val: data?.totalVisits ?? 0, sub: 'ngoại trú', tone: 'info' },
        { lbl: 'ĐK → Khám TB', val: data ? `${data.registrationToExamMinutes.toFixed(1)} ph` : '—', tone: data && data.registrationToExamMinutes > 30 ? 'crit' : 'ok' },
        { lbl: 'CLS → KQ TB', val: data && data.clsRequestToResultMinutes > 0 ? `${data.clsRequestToResultMinutes.toFixed(1)} ph` : '—', tone: 'warn' },
        { lbl: 'Tổng thời gian TB', val: data ? `${data.overallMinutes.toFixed(1)} ph` : '—', tone: data && data.overallMinutes > 60 ? 'crit' : 'ok' },
      ]} />

      <TopTabs<Tab>
        tab={tab}
        setTab={setTab}
        tabs={TABS}
        actions={
          <>
            <Btn variant="ghost" icon="refresh" onClick={load} disabled={loading}>Làm mới</Btn>
          </>
        }
      />

      {/* Bộ lọc ngày */}
      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <RangePicker
          value={range}
          onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          format="DD/MM/YYYY"
          allowClear={false}
        />
        <Btn
          variant="ghost"
          icon="x"
          onClick={() => setRange([dayjs().subtract(30, 'day').startOf('day'), dayjs().endOf('day')])}
        >
          Reset
        </Btn>
      </div>

      {/* Loading / Error */}
      {loading && <div className="ab-empty">Đang tải dữ liệu…</div>}
      {!loading && error && (
        <div className="ab-empty" style={{ color: 'var(--c-crit)' }}>
          Lỗi: {error}
        </div>
      )}

      {!loading && !error && tab === 'overview' && (
        <>
          {/* Bảng từng khâu */}
          {data ? (
            <div style={{ padding: '0 16px 16px' }}>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-8)', color: 'var(--c-label)' }}>
                Thời gian chờ trung bình từng khâu (phút)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-md)' }}>
                <thead>
                  <tr style={{ background: 'var(--c-row-alt)' }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', border: '1px solid var(--c-border)' }}>Khâu</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid var(--c-border)' }}>Tổng TB</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid var(--c-border)' }}>BHYT</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid var(--c-border)' }}>Viện phí</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', border: '1px solid var(--c-border)' }}>Dịch vụ</th>
                  </tr>
                </thead>
                <tbody>
                  {PHASE_LABELS.map(({ key, label }) => {
                    const overall = data[key] as number;
                    const ins = key === 'overallMinutes' ? data.insurancePatients.overallMinutes
                              : key === 'examDurationMinutes' ? data.insurancePatients.examDurationMinutes
                              : key === 'registrationToExamMinutes' ? data.insurancePatients.registrationToExamMinutes
                              : null;
                    const fee = key === 'overallMinutes' ? data.feePatients.overallMinutes
                              : key === 'examDurationMinutes' ? data.feePatients.examDurationMinutes
                              : key === 'registrationToExamMinutes' ? data.feePatients.registrationToExamMinutes
                              : null;
                    const svc = key === 'overallMinutes' ? data.servicePatients.overallMinutes
                              : key === 'examDurationMinutes' ? data.servicePatients.examDurationMinutes
                              : key === 'registrationToExamMinutes' ? data.servicePatients.registrationToExamMinutes
                              : null;
                    const fmt = (v: number | null) => v != null && v > 0 ? v.toFixed(1) : '—';
                    return (
                      <tr key={key}>
                        <td style={{ padding: '5px 12px', border: '1px solid var(--c-border)' }}>{label}</td>
                        <td style={{ padding: '5px 12px', border: '1px solid var(--c-border)', textAlign: 'right', fontWeight: 600 }}>
                          {overall > 0 ? overall.toFixed(1) : '—'}
                        </td>
                        <td style={{ padding: '5px 12px', border: '1px solid var(--c-border)', textAlign: 'right', color: OBJECT_COLORS.insurance }}>{fmt(ins)}</td>
                        <td style={{ padding: '5px 12px', border: '1px solid var(--c-border)', textAlign: 'right', color: OBJECT_COLORS.fee }}>{fmt(fee)}</td>
                        <td style={{ padding: '5px 12px', border: '1px solid var(--c-border)', textAlign: 'right', color: OBJECT_COLORS.service }}>{fmt(svc)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Biểu đồ so sánh 3 đối tượng */}
              <div style={{ fontWeight: 600, margin: '20px 0 8px', color: 'var(--c-label)' }}>
                So sánh theo đối tượng (phút)
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={phaseChartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                  <XAxis dataKey="phase" style={{ fontSize: 'var(--fs-xs)' }} />
                  <YAxis style={{ fontSize: 'var(--fs-xs)' }} unit=" ph" />
                  <RechartsTooltip formatter={(v) => [`${Number(v ?? 0).toFixed(1)} phút`]} />
                  <Legend />
                  <Bar dataKey="BHYT"      fill={OBJECT_COLORS.insurance} />
                  <Bar dataKey="Viện phí"  fill={OBJECT_COLORS.fee} />
                  <Bar dataKey="Dịch vụ"   fill={OBJECT_COLORS.service} />
                </BarChart>
              </ResponsiveContainer>

              {/* Ghi chú giả định */}
              <div style={{ marginTop: 'var(--space-12)', fontSize: 'var(--fs-xs)', color: 'var(--c-muted)', lineHeight: 1.6 }}>
                * Mốc &quot;Có kết quả CLS&quot; sử dụng UpdatedAt của ServiceRequest khi Status=3.
                Nếu bản ghi được cập nhật vì lý do khác (sửa giá, hủy...) số liệu có thể lệch.
                Để chính xác hơn, cần thêm cột CompletedAt vào ServiceRequest.
              </div>
            </div>
          ) : (
            <div className="ab-empty">Không có dữ liệu trong khoảng thời gian đã chọn</div>
          )}
        </>
      )}

      {!loading && !error && tab === 'byDepartment' && (
        <DataTable<DepartmentWaitingDto>
          columns={deptCols}
          data={data?.byDepartment ?? []}
          rowKey={(r) => r.departmentId}
          empty={data ? 'Không có dữ liệu theo khoa' : 'Chưa tải dữ liệu'}
        />
      )}
    </div>
  );
};

export default WaitingTimeReport;
