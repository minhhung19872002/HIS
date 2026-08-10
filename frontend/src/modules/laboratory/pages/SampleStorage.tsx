import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select } from 'antd';
import {
  getSampleStorageRecords, retrieveSample, disposeSample, storeSample, getSampleByBarcode,
} from '../api/sampleStorage';
import type { SampleStorageRecord } from '../api/sampleStorage';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, te, Ico,
  type ColumnDef,
} from '@/_v2kit';

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

/* ── Modal Lấy mẫu / Hủy mẫu ── */
const ActionModal: React.FC<{
  open: boolean;
  title: string;
  label: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}> = ({ open, title, label, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (!reason.trim()) { te('Nhập lý do'); return; }
    setSubmitting(true);
    try { await onSubmit(reason.trim()); onClose(); }
    catch { te('Thao tác thất bại'); }
    finally { setSubmitting(false); }
  };
  return (
    <ModalShell open={open} onClose={onClose} size="sm" title={title}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : label}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Lý do *</span>
        <Input.TextArea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do…" />
      </div>
    </ModalShell>
  );
};

/* ── Modal Lưu mẫu mới / Quét QR ── */
const STORAGE_COND_OPTS = [
  { value: 'room', label: 'Nhiệt độ phòng' },
  { value: 'refrigerator', label: 'Tủ lạnh (2-8°C)' },
  { value: 'frozen', label: 'Đông lạnh (-20°C)' },
  { value: 'deepFrozen', label: 'Siêu đông lạnh (-80°C)' },
];

const StoreSampleModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  initialBarcode?: string;
}> = ({ open, onClose, onDone, initialBarcode }) => {
  const [barcode, setBarcode] = useState(initialBarcode || '');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState<string | undefined>(undefined);
  const [temp, setTemp] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setBarcode(initialBarcode || ''); setErr(''); } }, [open, initialBarcode]);

  const handleSubmit = async () => {
    if (!barcode.trim() || !location.trim() || !condition) {
      setErr('Nhập barcode, vị trí và điều kiện bảo quản'); return;
    }
    setErr('');
    setSubmitting(true);
    try {
      await storeSample({
        sampleBarcode: barcode.trim(),
        storageLocation: location.trim(),
        storageCondition: condition,
        temperature: temp ? Number(temp) : undefined,
        notes: notes.trim() || undefined,
      });
      tk('Đã lưu mẫu vào kho');
      onDone();
    } catch { te('Lưu mẫu thất bại'); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="md" title="Lưu mẫu vào kho"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={handleSubmit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Lưu mẫu'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Barcode mẫu *</div>
          <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Quét hoặc nhập barcode" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Vị trí lưu * (vd: Freezer-A/Rack-2/Box-5/Pos-12)</div>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Freezer/Rack/Box/Position" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Điều kiện bảo quản *</div>
            <Select style={{ width: '100%' }} value={condition} onChange={setCondition} placeholder="Chọn điều kiện" options={STORAGE_COND_OPTS} />
          </div>
          <div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Nhiệt độ (°C)</div>
            <Input value={temp} onChange={(e) => setTemp(e.target.value)} placeholder="Vd: -20" type="number" />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>Ghi chú</div>
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

/* ── Modal Quét QR ── */
const ScanModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onFound: (rec: SampleStorageRecord) => void;
}> = ({ open, onClose, onFound }) => {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { if (open) { setBarcode(''); setErr(''); } }, [open]);

  const handleScan = async () => {
    if (!barcode.trim()) { setErr('Nhập barcode'); return; }
    setLoading(true);
    setErr('');
    try {
      const rec = await getSampleByBarcode(barcode.trim()) as SampleStorageRecord;
      if (!rec) { setErr('Không tìm thấy mẫu'); return; }
      tk(`Tìm thấy: ${rec.sampleBarcode}`);
      onFound(rec);
      onClose();
    } catch { setErr('Không tìm thấy mẫu với barcode này'); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="sm" title="Quét QR / Barcode"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={handleScan} disabled={loading}>
          <Ico name="search" size={12} /> {loading ? 'Đang tìm…' : 'Tìm mẫu'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Barcode *</span>
        <Input
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onPressEnter={handleScan}
          placeholder="Quét hoặc nhập barcode mẫu"
          autoFocus
        />
        {err && <div style={{ color: 'var(--s-crit)', fontSize: 'var(--fs-sm)' }}>{err}</div>}
      </div>
    </ModalShell>
  );
};

const SampleStorageV2: React.FC = () => {
  const [items, setItems] = useState<SampleStorageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fCond, setFCond] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SampleStorageRecord | null>(null);
  const [retrieveTarget, setRetrieveTarget] = useState<SampleStorageRecord | null>(null);
  const [disposeTarget, setDisposeTarget] = useState<SampleStorageRecord | null>(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

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
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) : '—' },
    { key: 'type', label: 'Loại mẫu', render: (r) => r.sampleType },
    { key: 'tube', label: 'Ống', render: (r) => r.tubeColor },
    { key: 'loc', label: 'Vị trí', code: true, render: (r) => r.storageLocation },
    { key: 'cond', label: 'Bảo quản', render: (r) => (
      <span>{r.storageCondition}
        {r.temperature !== undefined && <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}> ({r.temperature}°C)</span>}
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
        <ActBtn ic="package" title="Lấy mẫu" onClick={() => setRetrieveTarget(r)} />
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
        <Btn variant="ghost" onClick={() => { setSearch(''); setFCond(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load} loading={loading} icon="refresh">
          Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => setScanOpen(true)}>
          <Ico name="qr" size={12} /> Quét QR
        </Btn>
        <Btn variant="primary" onClick={() => setStoreOpen(true)}>
          <Ico name="plus" size={12} /> Lưu mẫu
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<SampleStorageRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        loading={loading}
        empty={'Chưa có mẫu lưu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Modals */}
      <ActionModal
        open={!!retrieveTarget}
        title={`Lấy mẫu · ${retrieveTarget?.sampleBarcode || ''}`}
        label="Lấy mẫu"
        onClose={() => setRetrieveTarget(null)}
        onSubmit={async (reason) => {
          await retrieveSample(retrieveTarget!.id, { reason });
          tk('Đã lấy mẫu thành công');
          load();
        }}
      />
      <ActionModal
        open={!!disposeTarget}
        title={`Hủy mẫu · ${disposeTarget?.sampleBarcode || ''}`}
        label="Hủy mẫu"
        onClose={() => setDisposeTarget(null)}
        onSubmit={async (reason) => {
          await disposeSample(disposeTarget!.id, { reason });
          tk('Đã hủy mẫu');
          load();
        }}
      />
      <StoreSampleModal
        open={storeOpen}
        onClose={() => setStoreOpen(false)}
        onDone={() => { setStoreOpen(false); load(); }}
      />
      <ScanModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onFound={(rec) => setSel(rec)}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Mẫu · ${sel.sampleBarcode}` : ''}
        sub={sel ? `${sel.sampleType} · ${sel.storageLocation}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && sKey(sel) === 'stored' && <>
            <Btn onClick={() => { setRetrieveTarget(sel); setSel(null); }}>
              <Ico name="package" size={12} /> Lấy mẫu
            </Btn>
            <Btn variant="primary" onClick={() => { setDisposeTarget(sel); setSel(null); }}>
              <Ico name="trash" size={12} /> Hủy mẫu
            </Btn>
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
