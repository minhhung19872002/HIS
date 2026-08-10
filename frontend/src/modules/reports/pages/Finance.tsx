import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  financeApi,
  type RevenueByServiceDto, type RevenueByExecutingDeptDto,
  type SurgeryProfitReportDto, type CostByDepartmentDto,
  type FinancialSummaryReportDto, type InsuranceReconciliationDto,
} from '../../system/api/system/finance';
import {
  exportMultiSheetExcel, downloadCsv, escapeCsvCell,
  type ExcelColumn, formatVnd,
} from '../../../services/file.service';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, fmtVNDg, tk, ti, te, Ico,
  type ColumnDef, type TopTab,
} from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

type Row = RevenueByServiceDto & { id: string };
type DeptRow = RevenueByExecutingDeptDto & { id: string };
type TopKey = 'service' | 'department' | 'reports';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'service', l: 'Theo dịch vụ', ic: 'list' },
  { v: 'department', l: 'Theo khoa', ic: 'grid' },
  { v: 'reports', l: 'Báo cáo', ic: 'grid' },
];

const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
const PER = 18;
// Verbatim v1 (pages/Finance.tsx) — tránh NaN khi mẫu số = 0
const safePercent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const FinanceV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [tab, setTab] = useState<TopKey>('service');
  const [deptItems, setDeptItems] = useState<DeptRow[]>([]);
  // Export loading states
  const [csvLoading, setCsvLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  const [reportFrom, setReportFrom] = useState<string>(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [reportTo,   setReportTo]   = useState<string>(dayjs().endOf('month').format('YYYY-MM-DD'));

  // Department detail drawer
  const [deptSel, setDeptSel] = useState<DeptRow | null>(null);

  // Report cards
  const [rpSurgery, setRpSurgery] = useState<SurgeryProfitReportDto[] | null>(null);
  const [rpCost, setRpCost] = useState<CostByDepartmentDto[] | null>(null);
  const [rpSummary, setRpSummary] = useState<FinancialSummaryReportDto | null>(null);
  const [rpInsurance, setRpInsurance] = useState<InsuranceReconciliationDto | null>(null);
  const [rpLoading, setRpLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svcRes, deptRes] = await Promise.all([
        financeApi.getRevenueByService(reportFrom, reportTo),
        financeApi.getRevenueByExecutingDept(reportFrom, reportTo),
      ]);
      setItems((svcRes.data || []).map((x, i) => ({ ...x, id: x.serviceId || `r-${i}` })));
      setDeptItems((deptRes.data || []).map((x, i) => ({ ...x, id: x.departmentId || `d-${i}` })));
    } catch { setItems([]); setDeptItems([]); ti('Không tải được dữ liệu tài chính'); }
    finally { setLoading(false); }
  }, [reportFrom, reportTo]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const set = new Set(items.map((r) => r.serviceGroupName).filter(Boolean));
    return Array.from(set).map((g) => ({ v: g, l: g }));
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (fGroup && r.serviceGroupName !== fGroup) return false;
      if (!k) return true;
      return (r.serviceName || '').toLowerCase().includes(k)
        || (r.serviceCode || '').toLowerCase().includes(k);
    });
  }, [items, search, fGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const kpis = useMemo(() => {
    const totalRev = items.reduce((s, r) => s + (r.totalRevenue || 0), 0);
    const insur = items.reduce((s, r) => s + (r.insuranceRevenue || 0), 0);
    const profit = items.reduce((s, r) => s + (r.profit || 0), 0);
    const totalQty = items.reduce((s, r) => s + (r.quantity || 0), 0);
    return { totalRev, insur, patient: totalRev - insur, profit, qty: totalQty, count: items.length };
  }, [items]);

  // Cơ cấu doanh thu theo đối tượng (BHYT / Viện phí / Dịch vụ) — verbatim v1 Tổng quan tab
  const deptComposition = useMemo(() => {
    const totalRevenue = deptItems.reduce((s, d) => s + (d.totalRevenue || 0), 0);
    const totalInsurance = deptItems.reduce((s, d) => s + (d.insuranceRevenue || 0), 0);
    const totalSelfPay = deptItems.reduce((s, d) => s + (d.patientRevenue || 0), 0);
    const totalService = deptItems.reduce((s, d) => s + (d.serviceRevenue || 0), 0);
    return {
      totalRevenue, totalInsurance, totalSelfPay, totalService,
      insurPct: safePercent(totalInsurance, totalRevenue),
      selfPayPct: safePercent(totalSelfPay, totalRevenue),
      servicePct: safePercent(totalService, totalRevenue),
    };
  }, [deptItems]);

  const deptCols: ColumnDef<DeptRow>[] = [
    { key: 'dept', label: 'Khoa/Phòng', render: (r) => <b style={{ color: 'var(--t-0)' }}>{r.departmentName || r.departmentCode || '—'}</b> },
    { key: 'patients', label: 'Số BN', mono: true, render: (r) => (r.patientCount || 0).toLocaleString('vi-VN') },
    { key: 'insur', label: 'BHYT', mono: true, render: (r) => <span style={{ color: 'var(--a-cy-text)' }}>{fmtVNDg(r.insuranceRevenue)}</span> },
    { key: 'selfpay', label: 'Viện phí', mono: true, render: (r) => fmtVNDg(r.patientRevenue) },
    { key: 'service', label: 'Dịch vụ', mono: true, render: (r) => fmtVNDg(r.serviceRevenue) },
    { key: 'total', label: 'Tổng doanh thu', mono: true, render: (r) => <b>{fmtVNDg(r.totalRevenue)}</b> },
  ];

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã DV', code: true, render: (r) => r.serviceCode || '—' },
    { key: 'name', label: 'Tên dịch vụ', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.serviceName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.serviceGroupName || '—'}</div>
      </div>
    ) },
    { key: 'qty', label: 'SL', mono: true, render: (r) => r.quantity || 0 },
    { key: 'rev', label: 'Doanh thu', mono: true, render: (r) => <b>{fmtVNDg(r.totalRevenue)}</b> },
    { key: 'bhyt', label: 'BHYT', mono: true, render: (r) => (
      <span style={{ color: 'var(--a-cy-text)' }}>{fmtVNDg(r.insuranceRevenue)}</span>
    ) },
    { key: 'profit', label: 'LN', mono: true, render: (r) => {
      const ok = (r.profit || 0) >= 0;
      return <span style={{ color: ok ? 'var(--a-em-text)' : 'var(--a-rd-text)' }}>{fmtVNDg(r.profit)}</span>;
    } },
    { key: 'margin', label: 'Biên LN', mono: true, render: (r) => fmtPct(r.profitMargin) },
  ];

  const handleExportCsv = async () => {
    setCsvLoading(true);
    try {
      const fromDate = dayjs().startOf('month').format('DD/MM/YYYY');
      const toDate = dayjs().endOf('month').format('DD/MM/YYYY');
      const header = ['Mã DV', 'Tên dịch vụ', 'Nhóm', 'Số lượng', 'Doanh thu', 'BHYT', 'Bệnh nhân', 'Chi phí', 'Lợi nhuận', 'Biên LN (%)']
        .map(escapeCsvCell).join(',');
      const rows = items.map((r) =>
        [r.serviceCode, r.serviceName, r.serviceGroupName, r.quantity, r.totalRevenue,
          r.insuranceRevenue, r.patientRevenue, r.cost, r.profit, fmtPct(r.profitMargin)]
          .map(escapeCsvCell).join(','),
      );
      downloadCsv(`doanh-thu-dich-vu-${dayjs().format('YYYYMM')}.csv`, [header, ...rows]);
      tk(`Đã xuất CSV doanh thu ${fromDate} – ${toDate} (${items.length} dịch vụ)`);
    } catch {
      te('Xuất CSV thất bại');
    } finally {
      setCsvLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setXlsxLoading(true);
    try {
      const serviceCols: ExcelColumn<Record<string, unknown>>[] = [
        { header: 'Mã DV', key: 'serviceCode', width: 14 },
        { header: 'Tên dịch vụ', key: 'serviceName', width: 30 },
        { header: 'Nhóm', key: 'serviceGroupName', width: 20 },
        { header: 'Số lượng', key: 'quantity', width: 10 },
        { header: 'Doanh thu (đ)', key: 'totalRevenue', format: formatVnd, width: 18 },
        { header: 'BHYT (đ)', key: 'insuranceRevenue', format: formatVnd, width: 18 },
        { header: 'Bệnh nhân (đ)', key: 'patientRevenue', format: formatVnd, width: 18 },
        { header: 'Chi phí (đ)', key: 'cost', format: formatVnd, width: 18 },
        { header: 'Lợi nhuận (đ)', key: 'profit', format: formatVnd, width: 18 },
        { header: 'Biên LN (%)', key: 'profitMargin', format: (v) => Number(v).toFixed(1), width: 12 },
      ];
      const deptCols: ExcelColumn<Record<string, unknown>>[] = [
        { header: 'Mã khoa', key: 'departmentCode', width: 14 },
        { header: 'Khoa/Phòng', key: 'departmentName', width: 26 },
        { header: 'Số BN', key: 'patientCount', width: 10 },
        { header: 'BHYT (đ)', key: 'insuranceRevenue', format: formatVnd, width: 18 },
        { header: 'Viện phí (đ)', key: 'patientRevenue', format: formatVnd, width: 18 },
        { header: 'Dịch vụ (đ)', key: 'serviceRevenue', format: formatVnd, width: 18 },
        { header: 'Tổng doanh thu (đ)', key: 'totalRevenue', format: formatVnd, width: 18 },
      ];
      exportMultiSheetExcel(
        [
          { sheetName: 'Doanh thu dịch vụ', data: items as unknown as Record<string, unknown>[], columns: serviceCols },
          { sheetName: 'Doanh thu khoa', data: deptItems as unknown as Record<string, unknown>[], columns: deptCols },
        ],
        `bao-cao-tai-chinh-${dayjs().format('YYYYMM')}.xlsx`,
      );
      tk(`Đã xuất Excel báo cáo tài chính tháng ${dayjs().format('MM/YYYY')}`);
    } catch {
      te('Xuất Excel thất bại');
    } finally {
      setXlsxLoading(false);
    }
  };

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Xuất CSV dịch vụ này" onClick={() => {
        const header = ['Mã DV', 'Tên dịch vụ', 'Nhóm', 'Số lượng', 'Doanh thu', 'BHYT', 'Bệnh nhân', 'Chi phí', 'Lợi nhuận', 'Biên LN (%)']
          .map(escapeCsvCell).join(',');
        const line = [r.serviceCode, r.serviceName, r.serviceGroupName, r.quantity, r.totalRevenue,
          r.insuranceRevenue, r.patientRevenue, r.cost, r.profit, fmtPct(r.profitMargin)]
          .map(escapeCsvCell).join(',');
        downloadCsv(`dv-${r.serviceCode || 'export'}.csv`, [header, line]);
        tk(`Đã xuất CSV: ${r.serviceName}`);
      }} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Số dịch vụ', val: kpis.count, sub: `${groups.length} nhóm` },
        { lbl: 'Số lượt', val: kpis.qty.toLocaleString('vi-VN'), sub: 'tháng này', tone: 'info' },
        { lbl: 'Tổng doanh thu', val: Math.round(kpis.totalRev / 1_000_000), unit: 'tr', sub: 'VND' },
        { lbl: 'BHYT', val: Math.round(kpis.insur / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Người bệnh', val: Math.round(kpis.patient / 1_000_000), unit: 'tr', sub: 'VND', tone: 'warn' },
        { lbl: 'Lợi nhuận', val: Math.round(kpis.profit / 1_000_000), unit: 'tr', sub: 'VND', tone: kpis.profit >= 0 ? 'ok' : 'crit' },
      ]} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px var(--space-14)', borderBottom: '1px solid var(--line)' }}>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Kỳ báo cáo:</span>
        <input type="date" style={{ height: 28, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 12 }}
          value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} />
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>→</span>
        <input type="date" style={{ height: 28, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 12 }}
          value={reportTo} onChange={(e) => setReportTo(e.target.value)} />
        <Btn variant="ghost" onClick={() => { setReportFrom(dayjs().startOf('month').format('YYYY-MM-DD')); setReportTo(dayjs().endOf('month').format('YYYY-MM-DD')); }}>
          Tháng này
        </Btn>
      </div>

      <TopTabs<TopKey>
        tab={tab}
        setTab={setTab}
        tabs={TOP_TABS}
        actions={tab !== 'reports' ? (
          <Btn variant="ghost" disabled={xlsxLoading} onClick={handleExportExcel}>
            <Ico name="download" size={12} /> {xlsxLoading ? 'Đang xuất…' : 'Xuất Excel'}
          </Btn>
        ) : undefined}
      />

      {tab === 'service' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / mã dịch vụ…" />
          <Filter value={fGroup} onChange={setFGroup} options={groups} placeholder="▾ Nhóm dịch vụ" />
          <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
          <span className="spacer" />
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          <Btn variant="ghost" disabled={csvLoading} onClick={handleExportCsv}>
            <Ico name="download" size={12} /> {csvLoading ? 'Đang xuất…' : 'Xuất CSV'}
          </Btn>
        </div>

        <DataTable<Row>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu doanh thu'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {tab === 'department' && <>
        <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
          <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Doanh thu theo khoa thực hiện · {dayjs(reportFrom).format('DD/MM')} – {dayjs(reportTo).format('DD/MM/YYYY')}</span>
          <span className="spacer" />
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
        </div>

        <div style={{ padding: 'var(--space-14)', margin: '0 var(--space-14) var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)', marginBottom: 'var(--space-12)' }}>Cơ cấu doanh thu theo đối tượng</div>
          <CompositionBar label="BHYT chi trả" value={deptComposition.totalInsurance} pct={deptComposition.insurPct} color="var(--a-cy-text)" />
          <CompositionBar label="Viện phí" value={deptComposition.totalSelfPay} pct={deptComposition.selfPayPct} color="var(--a-em-text)" />
          <CompositionBar label="Dịch vụ" value={deptComposition.totalService} pct={deptComposition.servicePct} color="var(--a-or-text)" />
        </div>

        <DataTable<DeptRow>
          columns={deptCols} data={deptItems} rowKey={(r) => r.id}
          onRowClick={(r) => setDeptSel(r)}
          empty={loading ? 'Đang tải…' : 'Không có dữ liệu doanh thu theo khoa'}
        />
      </>}

      {tab === 'reports' && (
        <div style={{ padding: 'var(--space-14)', display: 'grid', gap: 'var(--space-12)', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          <RptCard title="Chi phí theo khoa" desc="Thuốc · Vật tư · Nhân sự · Tiện ích" loading={rpLoading === 'cost'}
            onLoad={async () => { setRpLoading('cost'); try { const r = await financeApi.getCostByDepartment(reportFrom, reportTo); setRpCost((r.data || []) as CostByDepartmentDto[]); } catch (e) { te(friendlyErrorMessage(e, 'Không tải được báo cáo chi phí theo khoa')); } finally { setRpLoading(null); } }}
            hasData={!!rpCost}
            content={rpCost ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Khoa', 'Thuốc', 'Vật tư', 'Nhân sự', 'Tổng CP'].map((h) => <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--t-2)' }}>{h}</th>)}
                </tr></thead>
                <tbody>{rpCost.map((r) => (
                  <tr key={r.departmentId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '4px 6px' }}>{r.departmentName || r.departmentCode}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{fmtVNDg(r.medicineCost)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{fmtVNDg(r.supplyCost)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{fmtVNDg(r.personnelCost)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{fmtVNDg(r.totalCost)}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : null}
          />
          <RptCard title="Đối soát BHYT" desc="QĐ 6556/BYT · Chênh lệch quyết toán" loading={rpLoading === 'ins'}
            onLoad={async () => { setRpLoading('ins'); try { const r = await financeApi.getInsuranceReconciliation(reportFrom, reportTo); setRpInsurance(r.data as InsuranceReconciliationDto); } catch (e) { te(friendlyErrorMessage(e, 'Không tải được báo cáo đối soát BHYT')); } finally { setRpLoading(null); } }}
            hasData={!!rpInsurance}
            content={rpInsurance ? (
              <div style={{ fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--t-2)' }}>Tổng BN</span><span style={{ fontFamily: 'var(--font-mono)' }}>{(rpInsurance.totalPatients || 0).toLocaleString('vi-VN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--t-2)' }}>Tổng lượt khám</span><span style={{ fontFamily: 'var(--font-mono)' }}>{(rpInsurance.totalVisits || 0).toLocaleString('vi-VN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--t-2)' }}>BV tính</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtVNDg(rpInsurance.hospitalCalculation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ color: 'var(--t-2)' }}>BHYT tính</span><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtVNDg(rpInsurance.insuranceCalculation)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontWeight: 600 }}>Chênh lệch</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: (rpInsurance.difference || 0) > 0 ? 'var(--a-em-text)' : 'var(--a-rd-text)' }}>
                    {fmtVNDg(rpInsurance.difference)} ({fmtPct(rpInsurance.differencePercentage)})
                  </span>
                </div>
              </div>
            ) : null}
          />
          <RptCard title="Lợi nhuận phẫu thuật" desc="Doanh thu · Chi phí · Biên LN từng loại mổ" loading={rpLoading === 'surg'}
            onLoad={async () => { setRpLoading('surg'); try { const r = await financeApi.getSurgeryProfitReport(reportFrom, reportTo); setRpSurgery((r.data || []) as SurgeryProfitReportDto[]); } catch (e) { te(friendlyErrorMessage(e, 'Không tải được báo cáo lợi nhuận phẫu thuật')); } finally { setRpLoading(null); } }}
            hasData={!!rpSurgery}
            content={rpSurgery ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Loại mổ', 'SL', 'Doanh thu', 'Chi phí', 'LN%'].map((h) => <th key={h} style={{ padding: '4px 6px', textAlign: 'left', color: 'var(--t-2)' }}>{h}</th>)}
                </tr></thead>
                <tbody>{rpSurgery.map((r) => (
                  <tr key={r.surgeryId} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '4px 6px' }}>{r.surgeryName}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{r.surgeryCount}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{fmtVNDg(r.totalRevenue)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)' }}>{fmtVNDg(r.totalCost)}</td>
                    <td style={{ padding: '4px 6px', fontFamily: 'var(--font-mono)', color: r.profitMargin >= 0 ? 'var(--a-em-text)' : 'var(--a-rd-text)' }}>{fmtPct(r.profitMargin)}</td>
                  </tr>
                ))}</tbody>
              </table>
            ) : null}
          />
          <RptCard title="Tổng hợp thu chi" desc="Doanh thu · Chi phí · Lợi nhuận ròng" loading={rpLoading === 'sum'}
            onLoad={async () => { setRpLoading('sum'); try { const r = await financeApi.getFinancialSummary(reportFrom, reportTo); setRpSummary(r.data as FinancialSummaryReportDto); } catch (e) { te(friendlyErrorMessage(e, 'Không tải được báo cáo tổng hợp thu chi')); } finally { setRpLoading(null); } }}
            hasData={!!rpSummary}
            content={rpSummary ? (
              <div style={{ fontSize: 12 }}>
                {[
                  { l: 'Tổng doanh thu', v: fmtVNDg(rpSummary.totalRevenue), tone: 'info' },
                  { l: '  BHYT', v: fmtVNDg(rpSummary.insuranceRevenue) },
                  { l: '  Bệnh nhân', v: fmtVNDg(rpSummary.patientRevenue) },
                  { l: 'Tổng chi phí', v: fmtVNDg(rpSummary.totalCost), tone: 'warn' },
                  { l: '  Thuốc', v: fmtVNDg(rpSummary.medicineCost) },
                  { l: '  Nhân sự', v: fmtVNDg(rpSummary.personnelCost) },
                  { l: 'Lợi nhuận gộp', v: fmtVNDg(rpSummary.grossProfit), tone: rpSummary.grossProfit >= 0 ? 'ok' : 'crit' },
                  { l: 'Lợi nhuận ròng', v: `${fmtVNDg(rpSummary.netProfit)} (${fmtPct(rpSummary.profitMargin)})`, tone: rpSummary.netProfit >= 0 ? 'ok' : 'crit', bold: true },
                ].map(({ l, v, tone, bold }) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid var(--line)', fontWeight: bold ? 700 : 400, color: tone === 'ok' ? 'var(--a-em-text)' : tone === 'crit' ? 'var(--a-rd-text)' : tone === 'info' ? 'var(--a-cy-text)' : tone === 'warn' ? 'var(--a-or-text)' : 'var(--t-0)' }}>
                    <span>{l}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{v}</span>
                  </div>
                ))}
              </div>
            ) : null}
          />
        </div>
      )}

      {/* ===== Dept Detail Drawer ===== */}
      <DrawerShell
        open={!!deptSel}
        onClose={() => setDeptSel(null)}
        size="md"
        title={deptSel ? `${deptSel.departmentName || deptSel.departmentCode}` : ''}
        sub={deptSel ? `Doanh thu · ${dayjs(reportFrom).format('DD/MM')} – ${dayjs(reportTo).format('DD/MM/YYYY')}` : ''}
        footer={<Btn variant="ghost" onClick={() => setDeptSel(null)}>Đóng</Btn>}
      >
        {deptSel && (
          <DrSec title="Chi tiết doanh thu">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
              {[
                { l: 'BHYT chi trả', v: fmtVNDg(deptSel.insuranceRevenue), color: 'var(--a-cy-text)' },
                { l: 'Viện phí', v: fmtVNDg(deptSel.patientRevenue), color: 'var(--a-em-text)' },
                { l: 'Dịch vụ', v: fmtVNDg(deptSel.serviceRevenue), color: 'var(--a-or-text)' },
                { l: 'Số BN', v: (deptSel.patientCount || 0).toLocaleString('vi-VN'), color: 'var(--t-0)' },
              ].map(({ l, v, color }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)', color }}>
                  <span>{l}</span><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 700, fontSize: 14 }}>
                <span>Tổng doanh thu</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtVNDg(deptSel.totalRevenue)}</span>
              </div>
            </div>
          </DrSec>
        )}
      </DrawerShell>

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Dịch vụ · ${sel.serviceName}` : ''}
        sub={sel ? `${sel.serviceCode} · ${sel.serviceGroupName}` : ''}
        footer={<Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>}
      >
        {sel && <>
          <DrSec title="Thông tin dịch vụ">
            <DrField lbl="Mã DV">{sel.serviceCode}</DrField>
            <DrField lbl="Tên DV">{sel.serviceName}</DrField>
            <DrField lbl="Nhóm">{sel.serviceGroupName || '—'}</DrField>
            <DrField lbl="Số lượng">{sel.quantity?.toLocaleString('vi-VN')}</DrField>
            <DrField lbl="Đơn giá">{fmtVNDg(sel.unitPrice)}</DrField>
          </DrSec>
          <DrSec title="Doanh thu chi tiết">
            <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
              <Row label="Tổng doanh thu" value={fmtVNDg(sel.totalRevenue)} />
              <Row label="BHYT chi trả" value={`−${fmtVNDg(sel.insuranceRevenue)}`} tone="info" />
              <Row label="Người bệnh chi trả" value={fmtVNDg(sel.patientRevenue)} />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Row label="Chi phí" value={fmtVNDg(sel.cost)} />
              <Row label="Lợi nhuận" value={`${fmtVNDg(sel.profit)} (${fmtPct(sel.profitMargin)})`} tone={sel.profit >= 0 ? 'ok' : 'crit'} bold />
            </div>
          </DrSec>
          <DrSec title="Phân tích">
            <DrField lbl="LN/lượt">{fmtVNDg(Math.round((sel.profit || 0) / Math.max(1, sel.quantity || 1)))}</DrField>
            <DrField lbl="Tỷ lệ BHYT">{fmtPct((sel.insuranceRevenue / Math.max(1, sel.totalRevenue)) * 100)}</DrField>
            <DrField lbl="Đánh giá">
              <StatusBadge tone={sel.profitMargin >= 30 ? 'ok' : sel.profitMargin >= 15 ? 'info' : sel.profitMargin >= 0 ? 'warn' : 'crit'}>
                {sel.profitMargin >= 30 ? 'Hiệu quả cao'
                  : sel.profitMargin >= 15 ? 'Khá'
                  : sel.profitMargin >= 0 ? 'Trung bình' : 'Lỗ'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

const Row: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn'; bold?: boolean }> = ({ label, value, tone, bold }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

const RptCard: React.FC<{
  title: string; desc: string; loading: boolean;
  onLoad: () => void; hasData: boolean;
  content: React.ReactNode;
}> = ({ title, desc, loading, onLoad, hasData, content }) => (
  <div style={{ background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-14)' }}>
    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--t-0)', marginBottom: 4 }}>{title}</div>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-10)' }}>{desc}</div>
    {!hasData ? (
      <Btn variant="ghost" onClick={onLoad} disabled={loading}>
        <Ico name="download" size={12} /> {loading ? 'Đang tải…' : 'Tải báo cáo'}
      </Btn>
    ) : (
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>{content}</div>
    )}
  </div>
);

// Thanh "biểu đồ" cơ cấu doanh thu theo đối tượng (BHYT/Viện phí/Dịch vụ) — thay thế <Progress> antd v1
const CompositionBar: React.FC<{ label: string; value: number; pct: number; color: string }> = ({ label, value, pct, color }) => (
  <div style={{ marginBottom: 'var(--space-10)' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 4 }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtVNDg(value)} · {pct}%</span>
    </div>
    <div style={{ height: 6, background: 'var(--d-2)', borderRadius: 3, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: '100%', background: color, borderRadius: 3 }} />
    </div>
  </div>
);

export default FinanceV2;
