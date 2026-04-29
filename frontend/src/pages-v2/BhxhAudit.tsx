import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import client from '../api/client';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, fmtVNDg, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

interface AuditRecord {
  id: string;
  maLk: string;
  patientCode: string;
  patientName: string;
  insuranceNumber: string;
  admissionDate: string;
  dischargeDate?: string;
  departmentName: string;
  diagnosisCode: string;
  diagnosisName: string;
  totalAmount: number;
  insuranceAmount: number;
  patientAmount: number;
  auditStatus: number;
  paymentStatus: number;
  sentToPortal: boolean;
}

const PER = 18;

type AuditKey = 'pending' | 'approved' | 'rejected';
const STATUS_TABS = [
  { v: 'pending' as AuditKey,  l: 'Chờ duyệt',     tone: 'warn' as const },
  { v: 'approved' as AuditKey, l: 'Đã duyệt',      tone: 'ok' as const },
  { v: 'rejected' as AuditKey, l: 'Bị từ chối',    tone: 'crit' as const },
];

const auditKey = (n: number): AuditKey => n === 1 ? 'approved' : n === 2 ? 'rejected' : 'pending';

const BhxhAuditV2: React.FC = () => {
  const [items, setItems] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<AuditKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AuditRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/bhxh-audit/records');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data?.items || res.data || []) as any[];
      const rows: AuditRecord[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        maLk: r.maLk || '',
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        insuranceNumber: r.insuranceNumber || '',
        admissionDate: r.admissionDate || '',
        dischargeDate: r.dischargeDate,
        departmentName: r.departmentName || '',
        diagnosisCode: r.diagnosisCode || '',
        diagnosisName: r.diagnosisName || '',
        totalAmount: r.totalAmount || 0,
        insuranceAmount: r.insuranceAmount || 0,
        patientAmount: r.patientAmount || 0,
        auditStatus: r.auditStatus ?? 0,
        paymentStatus: r.paymentStatus ?? 0,
        sentToPortal: r.sentToPortal ?? false,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ giám định BHYT'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean));
    return Array.from(set).map((d) => ({ v: d, l: d }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => auditKey(r.auditStatus) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && auditKey(r.auditStatus) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.patientName, r.maLk, r.insuranceNumber, r.patientCode].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalIns = items.reduce((s, r) => s + (r.insuranceAmount || 0), 0);
  const totalAmt = items.reduce((s, r) => s + (r.totalAmount || 0), 0);
  const sentCount = items.filter((r) => r.sentToPortal).length;

  const cols: ColumnDef<AuditRecord>[] = [
    { key: 'malk', label: 'Mã LK', code: true, render: (r) => r.maLk || '—' },
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'bhyt', label: 'Số BHYT', mono: true, render: (r) => r.insuranceNumber },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName },
    { key: 'icd', label: 'ICD', mono: true, render: (r) => (
      <span title={r.diagnosisName}>{r.diagnosisCode}</span>
    ) },
    { key: 'amt', label: 'Tổng tiền', mono: true, render: (r) => fmtVNDg(r.totalAmount) },
    { key: 'ins', label: 'BHYT', mono: true, render: (r) => <span style={{ color: 'var(--a-cy-text)' }}>{fmtVNDg(r.insuranceAmount)}</span> },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const s = auditKey(r.auditStatus);
      const tone = s === 'approved' ? 'ok' : s === 'rejected' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: AuditRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {auditKey(r.auditStatus) === 'pending' && (
        <ActBtn ic="check" title="Duyệt" onClick={() => tk(`Đã duyệt ${r.maLk}`)} />
      )}
      {!r.sentToPortal && (
        <ActBtn ic="send" title="Gửi cổng BHXH" onClick={() => tk(`Đã gửi ${r.maLk} lên cổng`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: items.length, sub: 'kỳ này' },
        { lbl: 'Chờ duyệt', val: counts.pending || 0, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Đã duyệt', val: counts.approved || 0, sub: `${Math.round(((counts.approved || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Bị từ chối', val: counts.rejected || 0, sub: 'cần sửa', tone: 'crit' },
        { lbl: 'BHYT chi trả', val: Math.round(totalIns / 1_000_000), unit: 'tr', sub: 'VND', tone: 'info' },
        { lbl: 'Đã gửi cổng', val: sentCount, sub: `${Math.round((sentCount / Math.max(1, items.length)) * 100)}%`, tone: sentCount === items.length ? 'ok' : 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm mã LK / BN / số BHYT…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk(`Đã xuất XML ${items.length} hồ sơ`)}>
          <Ico name="download" size={12} /> Xuất XML BHXH
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk(`Đã gửi ${items.length - sentCount} hồ sơ lên cổng`)}>
          <Ico name="send" size={12} /> Gửi tất cả lên cổng
        </button>
      </div>

      <StatusTabs<AuditKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<AuditRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ giám định'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `Hồ sơ giám định · ${sel.maLk}` : ''}
        sub={sel ? `${sel.patientName} · BHYT ${sel.insuranceNumber}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in phiếu giám định')}>
            <Ico name="print" size={12} /> In phiếu
          </button>
          {sel && auditKey(sel.auditStatus) === 'pending' && (
            <button type="button" className="ab-btn primary" onClick={() => { tk(`Đã duyệt ${sel.maLk}`); setSel(null); }}>
              <Ico name="check" size={12} /> Duyệt hồ sơ
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin bệnh nhân">
            <DrField lbl="Mã LK">{sel.maLk}</DrField>
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Số BHYT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.insuranceNumber}</span></DrField>
            <DrField lbl="Khoa">{sel.departmentName}</DrField>
            <DrField lbl="Vào viện">{sel.admissionDate ? dayjs(sel.admissionDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Ra viện">{sel.dischargeDate ? dayjs(sel.dischargeDate).format('DD/MM/YYYY') : '—'}</DrField>
          </DrSec>
          <DrSec title="Chẩn đoán">
            <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.diagnosisCode}</span></DrField>
            <DrField lbl="Tên bệnh">{sel.diagnosisName}</DrField>
          </DrSec>
          <DrSec title="Tài chính">
            <div style={{ padding: 14, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6 }}>
              <Line label="Tổng tiền" value={fmtVNDg(sel.totalAmount)} />
              <Line label="BHYT chi trả" value={`−${fmtVNDg(sel.insuranceAmount)}`} tone="info" />
              <Line label="Người bệnh trả" value={fmtVNDg(sel.patientAmount)} />
              <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '8px 0' }} />
              <Line label="Tỷ lệ BHYT" value={`${Math.round((sel.insuranceAmount / Math.max(1, sel.totalAmount)) * 100)}%`} />
            </div>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Giám định">
              <StatusBadge tone={auditKey(sel.auditStatus) === 'approved' ? 'ok' : auditKey(sel.auditStatus) === 'rejected' ? 'crit' : 'warn'} dot>
                {STATUS_TABS.find((x) => x.v === auditKey(sel.auditStatus))?.l}
              </StatusBadge>
            </DrField>
            <DrField lbl="Thanh toán">{sel.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán'}</DrField>
            <DrField lbl="Cổng BHXH">
              <StatusBadge tone={sel.sentToPortal ? 'ok' : 'warn'} dot>
                {sel.sentToPortal ? 'Đã gửi' : 'Chưa gửi'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; tone?: 'ok' | 'crit' | 'info' | 'warn' }> = ({ label, value, tone }) => {
  const color = tone === 'ok' ? 'var(--a-em-text)'
    : tone === 'crit' ? 'var(--a-rd-text)'
    : tone === 'info' ? 'var(--a-cy-text)'
    : tone === 'warn' ? 'var(--a-or-text)'
    : 'var(--t-0)';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color }}>
      <span>{label}</span><span style={{ fontFamily: 'var(--font-mono)' }}>{value}</span>
    </div>
  );
};

export default BhxhAuditV2;
