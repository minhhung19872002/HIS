import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getSampleStorageRecords } from '../api/sampleStorage';
import type { SampleStorageRecord } from '../api/sampleStorage';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const STATUS_LABEL: Record<number, string> = {
  0: 'Đã lưu', 1: 'Đã lấy', 2: 'Đã hủy', 3: 'Hết hạn',
};

type SKey = 'stored' | 'retrieved' | 'expired' | 'disposed';
const STATUS_TABS = [
  { v: 'stored' as SKey,    l: 'Đang lưu',   tone: 'ok' as const },
  { v: 'retrieved' as SKey, l: 'Đã lấy',     tone: 'info' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',    tone: 'crit' as const },
  { v: 'disposed' as SKey,  l: 'Đã hủy',     tone: 'warn' as const },
];

const sKey = (r: SampleStorageRecord): SKey => {
  if (r.isExpired || r.status === 3) return 'expired';
  if (r.status === 1) return 'retrieved';
  if (r.status === 2) return 'disposed';
  return 'stored';
};

const PER = 18;

const SampleStorageV2: React.FC = () => {
  const [items, setItems] = useState<SampleStorageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fCond, setFCond] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SampleStorageRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSampleStorageRecords({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as SampleStorageRecord[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách lưu mẫu'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const conds = useMemo(() => {
    const set = new Set(items.map((r) => r.storageCondition).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fCond && r.storageCondition !== fCond) return false;
      if (!k) return true;
      return [r.sampleBarcode, r.patientName, r.patientCode, r.requestCode, r.storageLocation]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fCond]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<SampleStorageRecord>[] = [
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => r.patientName ? (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) : '—' },
    { key: 'type', label: 'Loại mẫu', render: (r) => r.sampleType },
    { key: 'tube', label: 'Ống', render: (r) => r.tubeColor },
    { key: 'loc', label: 'Vị trí', code: true, render: (r) => r.storageLocation },
    { key: 'cond', label: 'Bảo quản', render: (r) => (
      <span>{r.storageCondition}
        {r.temperature !== undefined && <span style={{ color: 'var(--t-2)', fontSize: 11 }}> ({r.temperature}°C)</span>}
      </span>
    ) },
    { key: 'stored', label: 'Lưu lúc', mono: true, render: (r) => dayjs(r.storedAt).format('DD/MM HH:mm') },
    { key: 'st', label: 'TT', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: SampleStorageRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {sKey(r) === 'stored' && (
        <ActBtn ic="package" title="Lấy mẫu" onClick={() => tk(`Mở lấy mẫu ${r.sampleBarcode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng mẫu', val: items.length, sub: 'tất cả' },
        { lbl: 'Đang lưu', val: counts.stored || 0, sub: 'trong kho', tone: 'ok' },
        { lbl: 'Hết hạn', val: counts.expired || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Đã lấy', val: counts.retrieved || 0, sub: 'đã sử dụng', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm barcode / BN / vị trí…" />
        <Filter value={fCond} onChange={setFCond} options={conds} placeholder="▾ Điều kiện BQ" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFCond(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở quét QR/barcode')}>
          <Ico name="qr" size={12} /> Quét QR
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở lưu mẫu mới')}>
          <Ico name="plus" size={12} /> Lưu mẫu
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<SampleStorageRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có mẫu lưu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Mẫu · ${sel.sampleBarcode}` : ''}
        sub={sel ? `${sel.sampleType} · ${sel.storageLocation}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          {sel && sKey(sel) === 'stored' && <>
            <button type="button" className="ab-btn" onClick={() => tk(`Mở lấy mẫu ${sel.sampleBarcode}`)}>
              <Ico name="package" size={12} /> Lấy mẫu
            </button>
            <button type="button" className="ab-btn primary" onClick={() => tk(`Mở hủy mẫu ${sel.sampleBarcode}`)}>
              <Ico name="trash" size={12} /> Hủy mẫu
            </button>
          </>}
        </>}
      >
        {sel && <>
          <DrSec title="Mẫu">
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
            {sel.requestCode && <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>}
            {sel.patientName && <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>}
            <DrField lbl="Loại mẫu">{sel.sampleType}</DrField>
            <DrField lbl="Ống">{sel.tubeColor}</DrField>
          </DrSec>
          <DrSec title="Vị trí lưu trữ">
            <DrField lbl="Vị trí"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.storageLocation}</span></DrField>
            {sel.freezer && <DrField lbl="Tủ">{sel.freezer}</DrField>}
            {sel.rack && <DrField lbl="Giá">{sel.rack}</DrField>}
            {sel.box && <DrField lbl="Hộp">{sel.box}</DrField>}
            {sel.position && <DrField lbl="Ô">{sel.position}</DrField>}
            <DrField lbl="Điều kiện">{sel.storageCondition}</DrField>
            {sel.temperature !== undefined && <DrField lbl="Nhiệt độ"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.temperature}°C</span></DrField>}
          </DrSec>
          <DrSec title="Lịch sử">
            <DrField lbl="Lưu lúc">{dayjs(sel.storedAt).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Lưu bởi">{sel.storedBy}</DrField>
            {sel.expiryDate && <DrField lbl="HSD">
              <span style={{ color: sel.isExpired ? 'var(--a-rd-text)' : undefined, fontFamily: 'var(--font-mono)' }}>
                {dayjs(sel.expiryDate).format('DD/MM/YYYY')}
              </span>
            </DrField>}
            {sel.retrievedAt && <>
              <DrField lbl="Đã lấy lúc">{dayjs(sel.retrievedAt).format('DD/MM/YYYY HH:mm')}</DrField>
              <DrField lbl="Lấy bởi">{sel.retrievedBy || '—'}</DrField>
            </>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.notes && <DrField lbl="Ghi chú">{sel.notes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default SampleStorageV2;
