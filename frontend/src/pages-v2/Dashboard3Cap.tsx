import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts';
import {
  getMultiFacilityDashboard, getBranchTree, getConsolidatedReport, getBranchDutyRoster,
} from '../api/multiFacility';
import type {
  MultiFacilityDashboardDto, BranchTreeDto,
  ConsolidatedReportDto, BranchDutyRosterDto,
} from '../api/multiFacility';
import {
  KpiStrip, TopTabs, Filter, DataTable, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

type Tab = 'dashboard' | 'consolidated' | 'duty';
const TABS = [
  { v: 'dashboard' as Tab,    l: 'Tổng quan',     ic: 'activity' },
  { v: 'consolidated' as Tab, l: 'Báo cáo hợp nhất', ic: 'archive' },
  { v: 'duty' as Tab,         l: 'Lịch trực',     ic: 'calendar' },
];

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'];

const fmtCurr = (v: number) => {
  if (!v) return '0';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
};

const flattenBranches = (nodes: BranchTreeDto[], level = 0): { v: string; l: string }[] => {
  const result: { v: string; l: string }[] = [];
  for (const node of nodes) {
    const prefix = '— '.repeat(level);
    const icon = node.branchLevel === 'Tỉnh/Thành phố' ? '🏥'
      : node.branchLevel === 'Huyện/Quận' ? '🏢' : '🏨';
    result.push({ v: node.id, l: `${prefix}${icon} ${node.branchCode} · ${node.branchName}` });
    if (node.children?.length) result.push(...flattenBranches(node.children, level + 1));
  }
  return result;
};

const Dashboard3CapV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<MultiFacilityDashboardDto | null>(null);
  const [tree, setTree] = useState<BranchTreeDto[]>([]);
  const [report, setReport] = useState<ConsolidatedReportDto | null>(null);
  const [duty, setDuty] = useState<BranchDutyRosterDto | null>(null);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [selBranch, setSelBranch] = useState<BranchTreeDto | null>(null);

  const loadTree = async () => {
    try {
      const r = await getBranchTree();
      const list = (Array.isArray(r) ? r : []) as BranchTreeDto[];
      setTree(list);
    } catch { /* ignore */ }
  };

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const r = await getMultiFacilityDashboard(branchId || undefined);
      setDashboard(r);
    } catch { ti('Không tải được dashboard'); }
    finally { setLoading(false); }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const r = await getConsolidatedReport(
        branchId || undefined,
        'monthly',
        dayjs().startOf('month').format('YYYY-MM-DD'),
        dayjs().endOf('month').format('YYYY-MM-DD'),
      );
      setReport(r);
    } catch { ti('Không tải được báo cáo'); }
    finally { setLoading(false); }
  };

  const loadDuty = async () => {
    setLoading(true);
    try {
      const r = await getBranchDutyRoster(
        branchId || undefined,
        dayjs().year(),
        dayjs().month() + 1,
      );
      setDuty(r);
    } catch { ti('Không tải được lịch trực'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTree(); }, []);
  useEffect(() => {
    if (tab === 'dashboard') loadDashboard();
    else if (tab === 'consolidated') loadReport();
    else loadDuty();
    /* eslint-disable-next-line */
  }, [tab, branchId]);

  const branchOpts = useMemo(() => flattenBranches(tree), [tree]);

  const trends = dashboard?.weeklyTrends?.map((t) => ({
    date: dayjs(t.date).format('DD/MM'),
    'Ngoại trú': t.outpatients,
    'Nội trú': t.inpatients,
    'Doanh thu': Math.round((t.revenue || 0) / 1_000_000),
  })) || [];

  const deptData = (dashboard?.departmentStats || []).slice(0, 8).map((d) => ({
    name: d.departmentName.length > 12 ? d.departmentName.slice(0, 12) + '…' : d.departmentName,
    Khám: d.outpatientCount,
    Nhập: d.admissionCount,
  }));

  const patientPie = dashboard ? [
    { name: 'BHYT', value: dashboard.patientTypes.insurance },
    { name: 'Dịch vụ', value: dashboard.patientTypes.general },
    { name: 'Cấp cứu', value: dashboard.patientTypes.emergency },
    { name: 'Miễn phí', value: dashboard.patientTypes.free },
    { name: 'Khác', value: dashboard.patientTypes.other },
  ].filter((p) => p.value > 0) : [];

  const subCols: ColumnDef<typeof dashboard extends infer T ? T extends MultiFacilityDashboardDto ? T['subBranches'][number] : never : never>[] = [
    { key: 'code', label: 'Mã CN', code: true, render: (r) => r.branchCode },
    { key: 'name', label: 'Tên', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.branchName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.branchLevel}</div>
      </div>
    ) },
    { key: 'out', label: 'Ngoại trú', mono: true, render: (r) => r.outpatients },
    { key: 'in', label: 'Nội trú', mono: true, render: (r) => r.inpatients },
    { key: 'rev', label: 'Doanh thu', mono: true, render: (r) => fmtCurr(r.revenue) },
    { key: 'sub', label: 'CN con', mono: true, render: (r) => r.subBranchCount },
  ];

  return (
    <div className="ab">
      {tab === 'dashboard' && dashboard && (
        <KpiStrip items={[
          { lbl: 'Ngoại trú hôm nay', val: dashboard.todayOutpatients.toLocaleString('vi-VN'), sub: dashboard.branchName || 'Toàn hệ thống' },
          { lbl: 'Nội trú hiện tại', val: dashboard.currentInpatients.toLocaleString('vi-VN'), sub: `${dashboard.availableBeds} giường trống`, tone: 'info' },
          { lbl: 'Cấp cứu', val: dashboard.todayEmergency, sub: 'lượt hôm nay', tone: dashboard.todayEmergency > 10 ? 'crit' : 'warn' },
          { lbl: 'Doanh thu', val: fmtCurr(dashboard.todayRevenue), unit: '₫', sub: `${dashboard.surgeries} ca PT`, tone: 'ok' },
        ]} />
      )}

      {tab === 'consolidated' && report && (
        <KpiStrip items={[
          { lbl: 'Tổng BN', val: report.totalPatients.toLocaleString('vi-VN'), sub: `${dayjs(report.fromDate).format('DD/MM')} – ${dayjs(report.toDate).format('DD/MM')}` },
          { lbl: 'Tổng lượt khám', val: report.totalVisits.toLocaleString('vi-VN'), sub: 'kỳ này', tone: 'info' },
          { lbl: 'Tổng nhập viện', val: report.totalAdmissions.toLocaleString('vi-VN'), sub: 'kỳ này', tone: 'warn' },
          { lbl: 'Tổng doanh thu', val: fmtCurr(report.totalRevenue), unit: '₫', sub: `${report.branchItems.length} chi nhánh`, tone: 'ok' },
        ]} />
      )}

      {tab === 'duty' && duty && (
        <KpiStrip items={[
          { lbl: 'Tổng ca trực', val: duty.totalShifts.toLocaleString('vi-VN'), sub: `Tháng ${duty.month}/${duty.year}` },
          { lbl: 'Số NV trực', val: duty.staffCount, sub: 'tham gia', tone: 'info' },
          { lbl: 'Ca sáng', val: duty.staffSummary.reduce((s, x) => s + x.morningShifts, 0), sub: 'tổng', tone: 'ok' },
          { lbl: 'Ca đêm', val: duty.staffSummary.reduce((s, x) => s + x.nightShifts, 0), sub: 'tổng', tone: 'warn' },
        ]} />
      )}

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={() => {
            if (tab === 'dashboard') loadDashboard();
            else if (tab === 'consolidated') loadReport();
            else loadDuty();
          }}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={() => tk('Đã xuất báo cáo')}>
            <Ico name="download" size={12} /> Xuất Excel
          </button>
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <Filter value={branchId} onChange={setBranchId} options={branchOpts} placeholder="▾ Toàn hệ thống" />
        <button className="ab-btn ghost" type="button" onClick={() => setBranchId('')}>
          <Ico name="x" size={12} /> Xem tất cả
        </button>
        <span className="spacer" />
        <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
          {dayjs().format('dddd · DD/MM/YYYY')}
        </span>
      </div>

      {loading && (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải dữ liệu…</div>
      )}

      {!loading && tab === 'dashboard' && dashboard && (
        <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Xu hướng 7 ngày</span>
            </div>
            <div style={{ padding: 14, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="date" style={{ fontSize: 11 }} />
                  <YAxis style={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Area type="monotone" dataKey="Ngoại trú" stroke={CHART_COLORS[0]} fill={CHART_COLORS[0]} fillOpacity={0.3} />
                  <Area type="monotone" dataKey="Nội trú" stroke={CHART_COLORS[1]} fill={CHART_COLORS[1]} fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Phân loại bệnh nhân</span>
            </div>
            <div style={{ padding: 14, height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={patientPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2} dataKey="value" label={(d) => d.name}>
                    {patientPie.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="panel" style={{ padding: 0, gridColumn: 'span 2' }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Theo khoa</span>
            </div>
            <div style={{ padding: 14, height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                  <XAxis dataKey="name" style={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis style={{ fontSize: 11 }} />
                  <RechartsTooltip />
                  <Bar dataKey="Khám" fill={CHART_COLORS[0]} />
                  <Bar dataKey="Nhập" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {!loading && tab === 'dashboard' && dashboard && dashboard.subBranches.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Chi nhánh con ({dashboard.subBranches.length})</span>
            </div>
            <DataTable
              columns={subCols} data={dashboard.subBranches} rowKey={(r) => r.branchId}
              actions={(r) => (
                <div className="ab-actions">
                  <ActBtn ic="eye" title="Xem CN" onClick={() => { setBranchId(r.branchId); }} />
                </div>
              )}
            />
          </div>
        </div>
      )}

      {!loading && tab === 'consolidated' && report && (
        <div style={{ padding: 16 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Báo cáo theo chi nhánh</span>
            </div>
            <DataTable
              columns={[
                { key: 'code', label: 'Mã', code: true, render: (r) => r.branchCode },
                { key: 'name', label: 'Chi nhánh', render: (r) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.branchName}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.branchLevel}</div>
                  </div>
                ) },
                { key: 'pat', label: 'BN', mono: true, render: (r) => r.patientCount.toLocaleString('vi-VN') },
                { key: 'visit', label: 'Lượt khám', mono: true, render: (r) => r.visitCount.toLocaleString('vi-VN') },
                { key: 'adm', label: 'Nhập viện', mono: true, render: (r) => r.admissionCount.toLocaleString('vi-VN') },
                { key: 'rev', label: 'Doanh thu', mono: true, render: (r) => fmtCurr(r.revenue) },
                { key: 'pct', label: 'Tỷ lệ', mono: true, render: (r) => `${r.revenuePercentage.toFixed(1)}%` },
              ]}
              data={report.branchItems} rowKey={(r) => r.branchId}
            />
          </div>
        </div>
      )}

      {!loading && tab === 'duty' && duty && (
        <div style={{ padding: 16 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>Tổng hợp ca trực — {duty.staffCount} NV</span>
            </div>
            <DataTable
              columns={[
                { key: 'name', label: 'Nhân viên', render: (r) => (
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.staffName}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.title || '—'} · {r.departmentName}</div>
                  </div>
                ) },
                { key: 'morn', label: 'Sáng', mono: true, render: (r) => r.morningShifts },
                { key: 'aft', label: 'Chiều', mono: true, render: (r) => r.afternoonShifts },
                { key: 'night', label: 'Đêm', mono: true, render: (r) => r.nightShifts },
                { key: 'total', label: 'Tổng', mono: true, render: (r) => <b>{r.totalShifts}</b> },
              ]}
              data={duty.staffSummary} rowKey={(r) => r.staffId}
            />
          </div>
        </div>
      )}

      <DrawerShell
        open={!!selBranch}
        onClose={() => setSelBranch(null)}
        size="md"
        title={selBranch?.branchName || ''}
        sub={selBranch?.branchCode || ''}
      >
        {selBranch && <>
          <DrSec title="Chi nhánh">
            <DrField lbl="Mã"><span style={{ fontFamily: 'var(--font-mono)' }}>{selBranch.branchCode}</span></DrField>
            <DrField lbl="Tên">{selBranch.branchName}</DrField>
            <DrField lbl="Cấp độ">
              <StatusBadge tone={selBranch.branchLevel === 'Tỉnh/Thành phố' ? 'crit' : selBranch.branchLevel === 'Huyện/Quận' ? 'warn' : 'info'}>
                {selBranch.branchLevel}
              </StatusBadge>
            </DrField>
            <DrField lbl="Địa chỉ">{selBranch.address || '—'}</DrField>
            <DrField lbl="Điện thoại">{selBranch.phoneNumber || '—'}</DrField>
            <DrField lbl="BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{selBranch.patientCount.toLocaleString('vi-VN')}</span></DrField>
            <DrField lbl="NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{selBranch.staffCount}</span></DrField>
            <DrField lbl="Doanh thu hôm nay"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtCurr(selBranch.todayRevenue)}</span></DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default Dashboard3CapV2;
