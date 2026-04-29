import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import client from '../api/client';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

interface ArchivedRecord {
  id: string;
  patientCode: string;
  patientName: string;
  medicalRecordCode: string;
  archiveDate: string;
  archiveFormat?: string;
  storageType?: string;
  fileSize?: number;
  verified?: boolean;
  departmentName?: string;
  dischargeDate?: string;
}

const PER = 20;

type Verified = 'verified' | 'unverified';
const STATUS_TABS = [
  { v: 'verified' as Verified,   l: 'Đã xác thực', tone: 'ok' as const },
  { v: 'unverified' as Verified, l: 'Chưa xác thực', tone: 'warn' as const },
];

const MedicalRecordArchiveV2: React.FC = () => {
  const [items, setItems] = useState<ArchivedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<Verified | 'all'>('all');
  const [fFmt, setFFmt] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<ArchivedRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/inpatient/medical-record-archive/list');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (res.data?.items || res.data || []) as any[];
      const rows: ArchivedRecord[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        medicalRecordCode: r.medicalRecordCode || r.recordCode || '',
        archiveDate: r.archiveDate || r.createdAt || '',
        archiveFormat: r.archiveFormat,
        storageType: r.storageType,
        fileSize: r.fileSize,
        verified: r.verified,
        departmentName: r.departmentName,
        dischargeDate: r.dischargeDate,
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ lưu trữ'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const formats = useMemo(() => {
    const set = new Set(items.map((r) => r.archiveFormat).filter(Boolean) as string[]);
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    c.verified = items.filter((r) => r.verified).length;
    c.unverified = items.filter((r) => !r.verified).length;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab === 'verified' && !r.verified) return false;
      if (stab === 'unverified' && r.verified) return false;
      if (fFmt && r.archiveFormat !== fFmt) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.medicalRecordCode].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fFmt]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalSize = items.reduce((s, r) => s + (r.fileSize || 0), 0);
  const cloudCount = items.filter((r) => r.storageType === 'cloud' || r.storageType === 'both').length;
  const localCount = items.filter((r) => r.storageType === 'local' || r.storageType === 'both').length;

  const cols: ColumnDef<ArchivedRecord>[] = [
    { key: 'mrc', label: 'Mã HSBA', code: true, render: (r) => r.medicalRecordCode || '—' },
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'date', label: 'Ngày lưu', mono: true, render: (r) => r.archiveDate ? dayjs(r.archiveDate).format('DD/MM/YYYY') : '—' },
    { key: 'fmt', label: 'Định dạng', render: (r) => <span className="ab-stat info" style={{ height: 20, padding: '0 8px', fontSize: 10 }}>{r.archiveFormat || '—'}</span> },
    { key: 'store', label: 'Lưu trữ', render: (r) => r.storageType || '—' },
    { key: 'size', label: 'KB', mono: true, render: (r) => r.fileSize ? r.fileSize.toLocaleString('vi-VN') : '—' },
    { key: 'v', label: 'Xác thực', render: (r) => (
      <StatusBadge tone={r.verified ? 'ok' : 'warn'} dot>{r.verified ? 'Đã xác thực' : 'Chưa'}</StatusBadge>
    ) },
  ];

  const actions = (r: ArchivedRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem" onClick={() => setSel(r)} />
      <ActBtn ic="download" title="Tải xuống" onClick={() => tk(`Đã tải ${r.medicalRecordCode}`)} />
      {!r.verified && <ActBtn ic="check" title="Xác thực" onClick={() => tk('Đã xác thực hồ sơ')} />}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng hồ sơ', val: items.length, sub: `${formats.length} định dạng` },
        { lbl: 'Đã xác thực', val: counts.verified || 0, sub: `${Math.round(((counts.verified || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Chưa xác thực', val: counts.unverified || 0, sub: 'cần kiểm tra', tone: 'warn' },
        { lbl: 'Cloud', val: cloudCount, sub: 'lưu cloud', tone: 'info' },
        { lbl: 'Local', val: localCount, sub: 'lưu nội bộ' },
        { lbl: 'Dung lượng', val: Math.round(totalSize / 1024), unit: 'MB', sub: 'tổng' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / mã HSBA…" />
        <Filter value={fFmt} onChange={setFFmt} options={formats} placeholder="▾ Định dạng" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFFmt(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Đã đồng bộ cloud')}>
          <Ico name="cloud" size={12} /> Đồng bộ cloud
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Lưu trữ hồ sơ mới')}>
          <Ico name="archive" size={12} /> Lưu hồ sơ mới
        </button>
      </div>

      <StatusTabs<Verified> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<ArchivedRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ lưu trữ'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Hồ sơ · ${sel.medicalRecordCode}` : ''}
        sub={sel?.patientName ?? ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã tải xuống')}>
            <Ico name="download" size={12} /> Tải xuống
          </button>
          <button type="button" className="ab-btn primary" onClick={() => tk('Đã in HSBA')}>
            <Ico name="print" size={12} /> In HSBA
          </button>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Ngày ra viện">{sel.dischargeDate ? dayjs(sel.dischargeDate).format('DD/MM/YYYY') : '—'}</DrField>
          </DrSec>
          <DrSec title="Lưu trữ">
            <DrField lbl="Mã HSBA">{sel.medicalRecordCode}</DrField>
            <DrField lbl="Ngày lưu">{sel.archiveDate ? dayjs(sel.archiveDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Định dạng">{sel.archiveFormat || '—'}</DrField>
            <DrField lbl="Loại lưu trữ">{sel.storageType || '—'}</DrField>
            <DrField lbl="Kích thước">{sel.fileSize ? `${sel.fileSize.toLocaleString('vi-VN')} KB` : '—'}</DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Xác thực">
              <StatusBadge tone={sel.verified ? 'ok' : 'warn'} dot>
                {sel.verified ? 'Đã xác thực' : 'Chưa xác thực'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default MedicalRecordArchiveV2;
