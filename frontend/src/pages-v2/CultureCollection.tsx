import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, InputNumber, Select } from 'antd';
import {
  getCultureStocks, getCultureStockStats, createCultureStock, updateCultureStock,
  retrieveAliquot, subcultureStock, getStockLogs, recordViabilityCheck,
} from '../api/cultureStock';
import type { CultureStock, CultureStockStats, CultureStockLog } from '../api/cultureStock';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, CrudModal, tk, ti, te, Ico,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

const STOCK_FIELDS: CrudFieldCfg[] = [
  { key: 'stockCode', label: 'Mã chủng', required: true, disabledOnEdit: true },
  { key: 'organismCode', label: 'Mã VSV', required: true },
  { key: 'organismName', label: 'Tên VSV', required: true },
  { key: 'scientificName', label: 'Tên khoa học' },
  { key: 'gramStain', label: 'Nhuộm Gram', type: 'select', options: [
    { value: 'positive', label: 'Gram (+)' }, { value: 'negative', label: 'Gram (−)' }] },
  { key: 'sourceType', label: 'Nguồn gốc' },
  { key: 'freezerCode', label: 'Tủ' },
  { key: 'rackCode', label: 'Rack' },
  { key: 'boxCode', label: 'Hộp' },
  { key: 'position', label: 'Vị trí' },
  { key: 'preservationMethod', label: 'PP bảo quản', type: 'select', required: true, options: [
    { value: 'glycerol', label: 'Glycerol stock' }, { value: 'freeze_dry', label: 'Đông khô' },
    { value: 'deep_freeze', label: 'Đông lạnh sâu' }, { value: 'skim_milk', label: 'Sữa gầy' }] },
  { key: 'storageTemperature', label: 'Nhiệt độ' },
  { key: 'passageNumber', label: 'Passage', type: 'number' },
  { key: 'aliquotCount', label: 'Số ống', type: 'number' },
  { key: 'preservationDate', label: 'Ngày lưu', type: 'date', required: true },
  { key: 'expiryDate', label: 'Hạn dùng', type: 'date' },
  { key: 'status', label: 'Trạng thái', type: 'select', options: [
    { value: 0, label: 'Hoạt động' }, { value: 1, label: 'Sắp hết' }, { value: 2, label: 'Hết hạn' },
    { value: 3, label: 'Đã cạn' }, { value: 4, label: 'Loại bỏ' }] },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Hoạt động', 1: 'Sắp hết', 2: 'Hết hạn', 3: 'Hết ống', 4: 'Đã hủy',
};

type SKey = 'active' | 'lowstock' | 'expired' | 'depleted' | 'discarded';
const STATUS_TABS = [
  { v: 'active' as SKey,    l: 'Hoạt động', tone: 'ok' as const },
  { v: 'lowstock' as SKey,  l: 'Sắp hết',   tone: 'warn' as const },
  { v: 'expired' as SKey,   l: 'Hết hạn',   tone: 'crit' as const },
  { v: 'depleted' as SKey,  l: 'Hết ống',   tone: 'crit' as const },
  { v: 'discarded' as SKey, l: 'Đã hủy',    tone: 'info' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'active' : n === 1 ? 'lowstock' : n === 2 ? 'expired' : n === 3 ? 'depleted' : 'discarded';

const PER = 18;

/* ── Modal Lấy ống (retrieveAliquot) ── */
const RetrieveAliquotModal: React.FC<{
  open: boolean;
  stock: CultureStock | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, stock, onClose, onDone }) => {
  const [count, setCount] = useState<number | null>(1);
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setCount(1); setPurpose(''); setNotes(''); } }, [open]);

  const submit = async () => {
    if (!stock || !count || count < 1) { te('Số ống phải ≥ 1'); return; }
    if (count > stock.remainingAliquots) { te(`Chỉ còn ${stock.remainingAliquots} ống`); return; }
    setSubmitting(true);
    try {
      await retrieveAliquot(stock.id, { aliquotCount: count, purpose: purpose.trim() || undefined, notes: notes.trim() || undefined });
      tk(`Đã lấy ${count} ống từ ${stock.stockCode}`);
      onDone();
    } catch { te('Lấy ống thất bại'); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="sm"
      title={`Lấy ống · ${stock?.stockCode || ''}`}
      sub={stock ? `${stock.organismName} · Còn ${stock.remainingAliquots}/${stock.aliquotCount} ống` : ''}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Lấy ống'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Số ống cần lấy *</div>
          <InputNumber style={{ width: '100%' }} value={count} onChange={(v) => setCount(v)} min={1} max={stock?.remainingAliquots || 1} />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Mục đích</div>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Vd: Cấy subculture / Kháng sinh đồ…" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Ghi chú</div>
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
};

/* ── Modal Cấy chuyền (subcultureStock) ── */
const SubcultureModal: React.FC<{
  open: boolean;
  stock: CultureStock | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, stock, onClose, onDone }) => {
  const [targetLocation, setTargetLocation] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setTargetLocation(''); setPurpose(''); setNotes(''); } }, [open]);

  const submit = async () => {
    if (!stock) return;
    if (!targetLocation.trim()) { te('Nhập vị trí chủng cấy chuyền'); return; }
    setSubmitting(true);
    try {
      await subcultureStock(stock.id, { targetLocation: targetLocation.trim(), purpose: purpose.trim() || undefined, notes: notes.trim() || undefined });
      tk(`Đã mở cấy chuyền từ ${stock.stockCode}`);
      onDone();
    } catch { te('Cấy chuyền thất bại'); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="sm"
      title={`Cấy chuyền · ${stock?.stockCode || ''}`}
      sub={stock?.organismName || ''}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Xác nhận cấy'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Vị trí chủng mới *</div>
          <Input value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} placeholder="Vd: Freezer-B/Rack-1/Box-3/Pos-4" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Mục đích</div>
          <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="Vd: Subculture lần 2 / Nhân giống…" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Ghi chú</div>
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
};

/* ── Modal KT Viability (recordViabilityCheck) ── */
const ViabilityModal: React.FC<{
  open: boolean;
  stock: CultureStock | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, stock, onClose, onDone }) => {
  const [isViable, setIsViable] = useState<string>('true');
  const [method, setMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (open) { setIsViable('true'); setMethod(''); setNotes(''); } }, [open]);

  const submit = async () => {
    if (!stock) return;
    setSubmitting(true);
    try {
      await recordViabilityCheck(stock.id, { isViable: isViable === 'true', method: method.trim() || undefined, notes: notes.trim() || undefined });
      tk(`Đã ghi kết quả KT viability: ${isViable === 'true' ? 'Sống' : 'Chết'}`);
      onDone();
    } catch { te('Ghi KT viability thất bại'); }
    finally { setSubmitting(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="sm"
      title={`KT Viability · ${stock?.stockCode || ''}`}
      sub={stock?.organismName || ''}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Huỷ</Btn>
        <Btn variant="primary" onClick={submit} disabled={submitting}>
          <Ico name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Ghi kết quả'}
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Kết quả *</div>
          <Select style={{ width: '100%' }} value={isViable} onChange={setIsViable} options={[
            { value: 'true', label: 'Sống (Viable)' },
            { value: 'false', label: 'Chết (Non-viable)' },
          ]} />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Phương pháp</div>
          <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Vd: Cấy thạch / Nhuộm Gram…" />
        </div>
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)', marginBottom: 4 }}>Ghi chú</div>
          <Input.TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </ModalShell>
  );
};

const CultureCollectionV2: React.FC = () => {
  const [items, setItems] = useState<CultureStock[]>([]);
  const [stats, setStats] = useState<CultureStockStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fMethod, setFMethod] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<CultureStock | null>(null);
  const [retrieveTarget, setRetrieveTarget] = useState<CultureStock | null>(null);
  const [subcultureTarget, setSubcultureTarget] = useState<CultureStock | null>(null);
  const [viabilityTarget, setViabilityTarget] = useState<CultureStock | null>(null);
  const [logStock, setLogStock] = useState<CultureStock | null>(null);
  const [logs, setLogs] = useState<CultureStockLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([getCultureStocks({ keyword: search }), getCultureStockStats()]);
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được lưu chủng VS'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const methods = useMemo(() => {
    const set = new Set(items.map((r) => r.preservationMethod).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fMethod && r.preservationMethod !== fMethod) return false;
      if (!k) return true;
      return [r.stockCode, r.organismName, r.organismCode, r.scientificName, r.locationDisplay]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fMethod]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<CultureStock>[] = [
    { key: 'code', label: 'Mã chủng', code: true, render: (r) => r.stockCode },
    { key: 'org', label: 'Vi sinh vật', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.organismName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.organismCode}</div>
      </div>
    ) },
    { key: 'loc', label: 'Vị trí', code: true, render: (r) => r.locationDisplay },
    { key: 'method', label: 'PP bảo quản', render: (r) => (
      <StatusBadge tone="info">{r.preservationMethod}</StatusBadge>
    ) },
    { key: 'aliq', label: 'Ống còn', mono: true, render: (r) => {
      const ratio = r.aliquotCount ? r.remainingAliquots / r.aliquotCount : 0;
      const tone = ratio < 0.2 ? 'var(--a-rd-text)' : ratio < 0.5 ? 'var(--a-or-text)' : 'var(--a-em-text)';
      return <span style={{ color: tone, fontWeight: 600 }}>{r.remainingAliquots}/{r.aliquotCount}</span>;
    } },
    { key: 'pass', label: 'Passage', mono: true, render: (r) => `P${r.passageNumber}` },
    { key: 'exp', label: 'Hết hạn', mono: true, render: (r) => {
      if (!r.expiryDate) return '—';
      const d = dayjs(r.expiryDate);
      const days = d.diff(dayjs(), 'day');
      const tone = days < 0 ? 'var(--a-rd-text)' : days < 30 ? 'var(--a-or-text)' : undefined;
      return <span style={{ color: tone }}>{d.format('DD/MM/YYYY')}</span>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const openCreate = () => { setCrudInit({ status: 0, passageNumber: 0, aliquotCount: 1 }); setCrudOpen(true); };
  const openEdit = (r: CultureStock) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const openLogs = async (r: CultureStock) => {
    setLogStock(r);
    setLogsLoading(true);
    try {
      const data = await getStockLogs(r.id);
      setLogs(data);
    } catch { te('Không tải được lịch sử'); setLogs([]); }
    finally { setLogsLoading(false); }
  };

  const actions = (r: CultureStock) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="package" title="Lấy ống" onClick={() => setRetrieveTarget(r)} />
      <ActBtn ic="activity" title="Cấy chuyền" onClick={() => setSubcultureTarget(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng chủng', val: stats?.totalStocks ?? items.length, sub: 'tất cả' },
        { lbl: 'Hoạt động', val: stats?.activeCount ?? counts.active, sub: 'sẵn dùng', tone: 'ok' },
        { lbl: 'Sắp hết hạn', val: stats?.expiringIn30Days ?? 0, sub: '< 30 ngày', tone: 'warn' },
        { lbl: 'Cần KT viability', val: stats?.needViabilityCheck ?? 0, sub: '> 90 ngày', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm mã chủng / VSV / vị trí…" />
        <Filter value={fMethod} onChange={setFMethod} options={methods} placeholder="▾ PP bảo quản" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFMethod(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => ti('Chọn chủng trong bảng → nhấn "Lịch sử" hoặc mở chi tiết → Cấy chuyền')}>
          <Ico name="activity" size={12} /> Cấy chuyền
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Lưu chủng
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<CultureStock>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có chủng VS lưu'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.organismName : ''}
        sub={sel ? `${sel.stockCode} · ${sel.locationDisplay}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) openLogs(sel); setSel(null); }}>
            <Ico name="activity" size={12} /> Lịch sử
          </Btn>
          <Btn onClick={() => { if (sel) openEdit(sel); setSel(null); }}>
            <Ico name="edit" size={12} /> Sửa
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) setViabilityTarget(sel); setSel(null); }}>
            <Ico name="check" size={12} /> KT viability
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Vi sinh vật">
            <DrField lbl="Mã chủng"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.stockCode}</span></DrField>
            <DrField lbl="Tên VSV">{sel.organismName}</DrField>
            <DrField lbl="Mã VSV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.organismCode}</span></DrField>
            <DrField lbl="Tên KH">{sel.scientificName || '—'}</DrField>
            <DrField lbl="Gram">{sel.gramStain || '—'}</DrField>
            {sel.sourceDescription && <DrField lbl="Nguồn">{sel.sourceDescription}</DrField>}
          </DrSec>
          <DrSec title="Vị trí lưu">
            <DrField lbl="Vị trí"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.locationDisplay}</span></DrField>
            {sel.freezerCode && <DrField lbl="Tủ">{sel.freezerCode}</DrField>}
            {sel.rackCode && <DrField lbl="Giá">{sel.rackCode}</DrField>}
            {sel.boxCode && <DrField lbl="Hộp">{sel.boxCode}</DrField>}
            {sel.position && <DrField lbl="Ô">{sel.position}</DrField>}
            <DrField lbl="PP bảo quản">{sel.preservationMethod}</DrField>
            <DrField lbl="Nhiệt độ">{sel.storageTemperature || '—'}</DrField>
          </DrSec>
          <DrSec title="Số lượng & passage">
            <div style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, marginBottom: 10 }}>
              <Line label="Ống còn / tổng" value={`${sel.remainingAliquots}/${sel.aliquotCount}`} bold />
              <Line label="Passage" value={`P${sel.passageNumber}`} />
            </div>
            <DrField lbl="Lưu lúc">{dayjs(sel.preservationDate).format('DD/MM/YYYY')}</DrField>
            {sel.expiryDate && <DrField lbl="Hết hạn">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Người lưu">{sel.preservedBy || '—'}</DrField>
          </DrSec>
          {sel.lastViabilityCheck && (
            <DrSec title="Kiểm tra viability">
              <DrField lbl="Lần KT cuối">{dayjs(sel.lastViabilityCheck).format('DD/MM/YYYY')}</DrField>
              <DrField lbl="Kết quả">
                <StatusBadge tone={sel.lastViabilityResult ? 'ok' : 'crit'} dot>
                  {sel.lastViabilityResult ? 'Sống' : 'Chết'}
                </StatusBadge>
              </DrField>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      {/* Modal lấy ống */}
      <RetrieveAliquotModal
        open={!!retrieveTarget}
        stock={retrieveTarget}
        onClose={() => setRetrieveTarget(null)}
        onDone={() => { setRetrieveTarget(null); load(); }}
      />

      {/* Modal cấy chuyền */}
      <SubcultureModal
        open={!!subcultureTarget}
        stock={subcultureTarget}
        onClose={() => setSubcultureTarget(null)}
        onDone={() => { setSubcultureTarget(null); load(); }}
      />

      {/* Modal KT viability */}
      <ViabilityModal
        open={!!viabilityTarget}
        stock={viabilityTarget}
        onClose={() => setViabilityTarget(null)}
        onDone={() => { setViabilityTarget(null); load(); }}
      />

      {/* Drawer lịch sử */}
      <DrawerShell
        open={!!logStock}
        onClose={() => { setLogStock(null); setLogs([]); }}
        size="lg"
        title={logStock ? `Lịch sử · ${logStock.stockCode}` : ''}
        sub={logStock?.organismName || ''}
        footer={<Btn variant="ghost" onClick={() => { setLogStock(null); setLogs([]); }}>Đóng</Btn>}
      >
        {logsLoading
          ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Đang tải…</div>
          : logs.length === 0
            ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--t-2)' }}>Chưa có lịch sử</div>
            : logs.map((log) => (
              <div key={log.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--t-0)', fontSize: 13 }}>{log.action}</div>
                  {log.purpose && <div style={{ fontSize: 12, color: 'var(--t-1)' }}>{log.purpose}</div>}
                  {log.result && <div style={{ fontSize: 12, color: 'var(--t-2)' }}>KQ: {log.result}</div>}
                  {log.notes && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{log.notes}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {log.aliquotsTaken !== undefined && log.aliquotsTaken !== null && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13, color: 'var(--a-or-text)' }}>−{log.aliquotsTaken} ống</div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{dayjs(log.performedAt).format('DD/MM/YYYY HH:mm')}</div>
                  <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{log.performedBy}</div>
                </div>
              </div>
            ))
        }
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật chủng VS' : 'Lưu chủng vi sinh mới'}
        fields={STOCK_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateCultureStock(String(crudInit.id), v);
          else await createCultureStock(v);
          tk(editing ? 'Đã cập nhật chủng' : 'Đã lưu chủng');
          load();
        }}
      />
    </div>
  );
};

const Line: React.FC<{ label: string; value: React.ReactNode; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400 }}>
    <span style={{ color: 'var(--t-2)' }}>{label}</span>
    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-0)' }}>{value}</span>
  </div>
);

export default CultureCollectionV2;
