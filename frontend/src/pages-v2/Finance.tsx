import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { financeApi, type RevenueByServiceDto } from '../api/system';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, fmtVNDg, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

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
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.serviceGroupName || '—'}</div>
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

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Xuất CSV" onClick={() => tk('Đã xuất CSV')} />
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
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFGroup(''); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã xuất Excel')}>
          <Ico name="download" size={12} /> Xuất Excel
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở báo cáo tổng hợp tháng')}>
          <Ico name="activity" size={12} /> Báo cáo tháng
        </button>
      </div>

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Không có dữ liệu doanh thu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Dịch vụ · ${sel.serviceName}` : ''}
        sub={sel ? `${sel.serviceCode} · ${sel.serviceGroupName}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in báo cáo dịch vụ')}>
            <Ico name="print" size={12} /> In
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã gửi báo cáo')}>
            <Ico name="send" size={12} /> Gửi báo cáo
          </button>
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
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
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
