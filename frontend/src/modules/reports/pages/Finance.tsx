import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from 'antd';
import dayjs from 'dayjs';
import { financeApi, type RevenueByServiceDto } from '../../system/api/system';
import hospitalReportApi, { type HospitalReportResult } from '../api/hospitalReport';
import { exportToExcel, type ExcelColumn, formatVnd } from '../../../utils/excelExport';
import { downloadCsv, escapeCsvCell } from '../../../utils/csvExport';
import { exportToPdf } from '../api/reporting';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, fmtVNDg, tk, ti, te, Ico,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';

type Row = RevenueByServiceDto & { id: string };

const fmtPct = (n: number) => `${(n || 0).toFixed(1)}%`;
const PER = 18;

const FinanceV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fGroup, setFGroup] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  // Monthly report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<HospitalReportResult | null>(null);
  // Export loading states
  const [csvLoading, setCsvLoading] = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
  // Send report email modal
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const emailInputRef = useRef<string>('');

  const load = async () => {
    setLoading(true);
    try {
      const fromDate = dayjs().startOf('month').format('YYYY-MM-DD');
      const toDate = dayjs().endOf('month').format('YYYY-MM-DD');
      const r = await financeApi.getRevenueByService(fromDate, toDate);
      setItems((r.data || []).map((x, i) => ({ ...x, id: x.serviceId || `r-${i}` })));
    } catch { setItems([]); ti('Không tải được dữ liệu tài chính'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
      const cols: ExcelColumn<Record<string, unknown>>[] = [
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
      exportToExcel(
        items as unknown as Record<string, unknown>[],
        cols,
        `bao-cao-tai-chinh-${dayjs().format('YYYYMM')}.xlsx`,
        'Doanh thu dịch vụ',
      );
      tk(`Đã xuất Excel báo cáo tài chính tháng ${dayjs().format('MM/YYYY')}`);
    } catch {
      te('Xuất Excel thất bại');
    } finally {
      setXlsxLoading(false);
    }
  };

  const handleMonthlyReport = async () => {
    setReportOpen(true);
    setReportLoading(true);
    setReportData(null);
    try {
      const from = dayjs().startOf('month').format('YYYY-MM-DD');
      const to = dayjs().endOf('month').format('YYYY-MM-DD');
      const res = await hospitalReportApi.getReport('REVENUE_MONTHLY', from, to);
      setReportData(res.data);
    } catch {
      te('Không tải được báo cáo tổng hợp tháng');
      setReportOpen(false);
    } finally {
      setReportLoading(false);
    }
  };

  const handleSendReport = async () => {
    const toEmail = emailInputRef.current.trim();
    if (!toEmail) { te('Vui lòng nhập địa chỉ email'); return; }
    setEmailLoading(true);
    try {
      const from = dayjs().startOf('month').format('YYYY-MM-DD');
      const to = dayjs().endOf('month').format('YYYY-MM-DD');
      await hospitalReportApi.sendReport('REVENUE_MONTHLY', { toEmail, from, to });
      tk(`Đã gửi báo cáo tháng ${dayjs().format('MM/YYYY')} tới ${toEmail}`);
      setEmailModalOpen(false);
      emailInputRef.current = '';
    } catch {
      te('Gửi báo cáo thất bại — vui lòng thử lại');
    } finally {
      setEmailLoading(false);
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

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / mã dịch vụ…" />
        <Filter value={fGroup} onChange={setFGroup} options={groups} placeholder="▾ Nhóm dịch vụ" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFGroup(''); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" disabled={csvLoading} onClick={handleExportCsv}>
          <Ico name="download" size={12} /> {csvLoading ? 'Đang xuất…' : 'Xuất CSV'}
        </Btn>
        <Btn variant="ghost" disabled={xlsxLoading} onClick={handleExportExcel}>
          <Ico name="download" size={12} /> {xlsxLoading ? 'Đang xuất…' : 'Xuất Excel'}
        </Btn>
        <Btn variant="primary" onClick={handleMonthlyReport}>
          <Ico name="activity" size={12} /> Báo cáo tháng
        </Btn>
      </div>

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Không có dữ liệu doanh thu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Báo cáo tổng hợp tháng */}
      <ModalShell
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={`Báo cáo tổng hợp tháng ${dayjs().format('MM/YYYY')}`}
        sub={reportData ? `Cập nhật: ${dayjs(reportData.generatedAt).format('DD/MM/YYYY HH:mm')}` : ''}
        size="lg"
        footer={<Btn variant="ghost" onClick={() => setReportOpen(false)}>Đóng</Btn>}
      >
        {reportLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải báo cáo…</div>}
        {!reportLoading && reportData && (
          <div style={{ fontSize: 'var(--fs-md)' }}>
            {Object.entries(reportData.summary).map(([k, v]) => (
              <DrField key={k} lbl={k}>{String(v)}</DrField>
            ))}
            {reportData.data.length > 0 && (
              <div style={{ marginTop: 'var(--space-12)', overflowX: 'auto' }}>
                <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
                  <thead>
                    <tr>{reportData.columns.map((c) => <th key={c}>{c}</th>)}</tr>
                  </thead>
                  <tbody>
                    {reportData.data.slice(0, 50).map((row, i) => (
                      <tr key={i}>
                        {reportData.columns.map((c) => <td key={c}>{String(row[c] ?? '—')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {reportData.data.length > 50 && (
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-6)' }}>
                    Hiển thị 50 / {reportData.data.length} dòng
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* Modal gửi báo cáo qua email */}
      <ModalShell
        open={emailModalOpen}
        onClose={() => { setEmailModalOpen(false); emailInputRef.current = ''; }}
        title="Gửi báo cáo qua email"
        sub={`Báo cáo tháng ${dayjs().format('MM/YYYY')}`}
        size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => { setEmailModalOpen(false); emailInputRef.current = ''; }}>Hủy</Btn>
          <Btn variant="primary" loading={emailLoading} onClick={handleSendReport}>
            <Ico name="send" size={12} /> Gửi
          </Btn>
        </>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)', marginBottom: 'var(--space-8)' }}>Địa chỉ email nhận báo cáo</div>
          <Input
            type="email"
            placeholder="example@hospital.vn"
            autoFocus
            onChange={(e) => { emailInputRef.current = e.target.value; }}
            onPressEnter={handleSendReport}
            style={{ borderRadius: 'var(--r-2)' }}
          />
        </div>
      </ModalShell>

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Dịch vụ · ${sel.serviceName}` : ''}
        sub={sel ? `${sel.serviceCode} · ${sel.serviceGroupName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => {
            if (!sel) return;
            const from = dayjs().startOf('month').format('YYYY-MM-DD');
            const to = dayjs().endOf('month').format('YYYY-MM-DD');
            const url = exportToPdf('SERVICE_REVENUE', from, to);
            window.open(url, '_blank');
            tk(`Mở PDF báo cáo dịch vụ: ${sel.serviceName}`);
          }}>
            <Ico name="print" size={12} /> In
          </Btn>
          <Btn variant="primary" onClick={() => setEmailModalOpen(true)}>
            <Ico name="send" size={12} /> Gửi báo cáo
          </Btn>
        </>}
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

export default FinanceV2;
