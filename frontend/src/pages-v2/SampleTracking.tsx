import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input } from 'antd';
import { getSampleRejections, undoRejection, reCollectSample } from '../api/sampleTracking';
import type { SampleRejection } from '../api/sampleTracking';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, ModalShell, DrSec, DrField, tk, ti, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

type SKey = 'pending' | 'undone' | 'recollected';
const STATUS_TABS = [
  { v: 'pending' as SKey,     l: 'Chưa xử lý',  tone: 'warn' as const },
  { v: 'undone' as SKey,      l: 'Đã hủy TC',   tone: 'info' as const },
  { v: 'recollected' as SKey, l: 'Đã lấy lại',  tone: 'ok' as const },
];

const sKey = (r: SampleRejection): SKey =>
  r.reCollected ? 'recollected' : r.isUndone ? 'undone' : 'pending';

const PER = 18;

const SampleTrackingV2: React.FC = () => {
  const [items, setItems] = useState<SampleRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fReason, setFReason] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SampleRejection | null>(null);
  const [undoTarget, setUndoTarget] = useState<SampleRejection | null>(null);
  const [undoReason, setUndoReason] = useState('');
  const [undoLoading, setUndoLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getSampleRejections({
        fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
        keyword: search,
      });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as SampleRejection[];
      setItems(list);
    } catch { setItems([]); ti('Không tải được danh sách từ chối'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const reasons = useMemo(() => {
    const set = new Set(items.map((r) => r.rejectionCode).filter(Boolean));
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
      if (fReason && r.rejectionCode !== fReason) return false;
      if (!k) return true;
      return [r.sampleBarcode, r.patientName, r.patientCode, r.requestCode, r.rejectionReason]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fReason]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<SampleRejection>[] = [
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'req', label: 'Mã YC', code: true, render: (r) => r.requestCode },
    { key: 'reason', label: 'Lý do', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.rejectionReason}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.rejectionCode}</div>
      </div>
    ) },
    { key: 'by', label: 'TC bởi', render: (r) => r.rejectedBy },
    { key: 'date', label: 'TC lúc', mono: true, render: (r) => dayjs(r.rejectedAt).format('DD/MM HH:mm') },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const k = sKey(r);
      const t = STATUS_TABS.find((x) => x.v === k);
      return <StatusBadge tone={t?.tone || 'info'} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const handleReCollect = (r: SampleRejection) => cf(
    `Yêu cầu lấy lại mẫu "${r.sampleBarcode}"?`,
    async () => {
      try {
        await reCollectSample(r.id);
        tk('Đã yêu cầu lấy lại mẫu');
        load();
      } catch { te('Lấy lại mẫu thất bại'); }
    },
    { confirm: 'Lấy lại' },
  );

  const actions = (r: SampleRejection) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {!r.reCollected && !r.isUndone && (
        <>
          <ActBtn ic="refresh" title="Hủy từ chối" onClick={() => { setUndoTarget(r); setUndoReason(''); }} />
          <ActBtn ic="package" title="Lấy lại mẫu" onClick={() => handleReCollect(r)} />
        </>
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng từ chối', val: items.length, sub: '30 ngày qua' },
        { lbl: 'Chưa xử lý', val: counts.pending || 0, sub: 'cần lấy lại', tone: 'warn' },
        { lbl: 'Đã hủy TC', val: counts.undone || 0, sub: 'sửa nhầm lẫn', tone: 'info' },
        { lbl: 'Đã lấy lại', val: counts.recollected || 0, sub: `${Math.round(((counts.recollected || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / barcode / mã YC…" />
        <Filter value={fReason} onChange={setFReason} options={reasons} placeholder="▾ Mã từ chối" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFReason(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => setReportOpen(true)}>
          <Ico name="activity" size={12} /> Báo cáo
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<SampleRejection>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Không có mẫu bị từ chối'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Modal Hủy từ chối */}
      <ModalShell
        open={!!undoTarget}
        onClose={() => setUndoTarget(null)}
        size="sm"
        title={`Hủy từ chối · ${undoTarget?.sampleBarcode || ''}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setUndoTarget(null)}>Huỷ</Btn>
          <Btn variant="primary" disabled={undoLoading} onClick={async () => {
            if (!undoReason.trim()) { te('Nhập lý do hủy từ chối'); return; }
            setUndoLoading(true);
            try {
              await undoRejection(undoTarget!.id, { reason: undoReason.trim() });
              tk('Đã hủy từ chối mẫu');
              setUndoTarget(null);
              load();
            } catch { te('Hủy từ chối thất bại'); }
            finally { setUndoLoading(false); }
          }}>
            <Ico name="check" size={12} /> {undoLoading ? 'Đang lưu…' : 'Xác nhận'}
          </Btn>
        </>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--t-2)' }}>Lý do hủy từ chối *</span>
          <Input.TextArea rows={3} value={undoReason} onChange={(e) => setUndoReason(e.target.value)} placeholder="Nhập lý do…" />
        </div>
      </ModalShell>

      {/* Drawer Báo cáo từ chối */}
      <DrawerShell
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        size="lg"
        title="Báo cáo mẫu từ chối"
        sub={`${items.length} mẫu · 30 ngày qua`}
        footer={<Btn variant="ghost" onClick={() => setReportOpen(false)}>Đóng</Btn>}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { lbl: 'Tổng từ chối', val: items.length, color: 'var(--t-0)' },
              { lbl: 'Chưa xử lý', val: counts.pending || 0, color: 'var(--a-or-text)' },
              { lbl: 'Đã lấy lại', val: counts.recollected || 0, color: 'var(--a-em-text)' },
            ].map((k) => (
              <div key={k.lbl} style={{ padding: 12, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4 }}>{k.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lý do từ chối phổ biến
          </div>
          {Array.from(new Set(items.map((r) => r.rejectionReason))).slice(0, 10).map((reason) => {
            const cnt = items.filter((r) => r.rejectionReason === reason).length;
            const pct = Math.round((cnt / Math.max(1, items.length)) * 100);
            return (
              <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 13, color: 'var(--t-1)' }}>{reason}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13 }}>{cnt} <span style={{ color: 'var(--t-2)', fontWeight: 400 }}>({pct}%)</span></span>
              </div>
            );
          })}
          {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 32 }}>Không có dữ liệu</div>}
        </div>
      </DrawerShell>

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Mẫu từ chối · ${sel.sampleBarcode}` : ''}
        sub={sel ? `${sel.patientName} · ${sel.requestCode}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && !sel.reCollected && !sel.isUndone && <>
            <Btn onClick={() => { setUndoTarget(sel); setUndoReason(''); setSel(null); }}>
              <Ico name="refresh" size={12} /> Hủy TC
            </Btn>
            <Btn variant="primary" onClick={() => { handleReCollect(sel); setSel(null); }}>
              <Ico name="package" size={12} /> Lấy lại
            </Btn>
          </>}
        </>}
      >
        {sel && <>
          <DrSec title="Mẫu & bệnh nhân">
            <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
            <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
          </DrSec>
          <DrSec title="Từ chối">
            <DrField lbl="Mã TC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.rejectionCode}</span></DrField>
            <DrField lbl="Lý do">{sel.rejectionReason}</DrField>
            <DrField lbl="Người TC">{sel.rejectedBy}</DrField>
            <DrField lbl="Lúc TC">{dayjs(sel.rejectedAt).format('DD/MM/YYYY HH:mm')}</DrField>
          </DrSec>
          {(sel.isUndone || sel.reCollected) && (
            <DrSec title="Xử lý sau">
              {sel.isUndone && <>
                <DrField lbl="Hủy TC">{sel.undoneAt ? dayjs(sel.undoneAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
                <DrField lbl="Hủy bởi">{sel.undoneBy || '—'}</DrField>
              </>}
              {sel.reCollected && (
                <DrField lbl="Lấy lại lúc">{sel.reCollectedAt ? dayjs(sel.reCollectedAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
              )}
            </DrSec>
          )}
          {sel.notes && (
            <DrSec title="Ghi chú">
              <div style={{ fontSize: 13, color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>
    </div>
  );
};

export default SampleTrackingV2;
