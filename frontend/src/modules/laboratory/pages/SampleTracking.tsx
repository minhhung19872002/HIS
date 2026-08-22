import React, { useEffect, useMemo, useState } from 'react';
import { useTabState } from '@/hooks/useTabState';
import dayjs from 'dayjs';
import { Input, DatePicker } from 'antd';
import {
  getSampleRejections, undoRejection, reCollectSample,
  rejectSample, getSampleTimeline, getSampleTrackingSummary,
} from '../api/sampleTracking';
import type { SampleRejection, SampleTrackingEvent, SampleTrackingSummary } from '../api/sampleTracking';
import { getSampleBatches, type SampleBatchDto, type SampleBatchItemDto } from '../api/sampleBatch';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, Btn,
  DrawerShell, ModalShell, DrSec, DrField, CrudModal, tk, ti, te, cf, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { BarcodeScanner } from '@/components/form';
import { RowActions } from '@/components/actions';
import { RefreshButton } from '@/components/actions/RefreshButton/RefreshButton';
import { Field } from '@/components/form/Field';
import { useModalForm } from '@/hooks/useModalForm';
import { friendlyErrorMessage } from '@/utils/friendlyError';

type SKey = 'pending' | 'undone' | 'recollected';
const STATUS_TABS = [
  { v: 'pending' as SKey,     l: 'Chưa xử lý',  tone: 'warn' as const },
  { v: 'undone' as SKey,      l: 'Đã hủy TC',   tone: 'info' as const },
  { v: 'recollected' as SKey, l: 'Đã lấy lại',  tone: 'ok' as const },
];

const sKey = (r: SampleRejection): SKey =>
  r.reCollected ? 'recollected' : r.isUndone ? 'undone' : 'pending';

// Parity v1 (#352 P4): tab Theo đợt + Thống kê + quét barcode + timeline + tạo từ chối mẫu
type Tab = 'rejections' | 'batches' | 'stats';
const TOP_TABS = [
  { v: 'rejections' as Tab, l: 'Từ chối mẫu', ic: 'alert' },
  { v: 'batches' as Tab,    l: 'Theo đợt',    ic: 'layers' },
  { v: 'stats' as Tab,      l: 'Thống kê',    ic: 'chart' },
];

const REJECT_FIELDS: CrudFieldCfg[] = [
  { key: 'sampleBarcode', label: 'Barcode mẫu', required: true },
  { key: 'labRequestId', label: 'Mã yêu cầu XN', required: true },
  { key: 'rejectionCode', label: 'Mã lý do', type: 'select', required: true, options: [
    { value: 'HEM', label: 'HEM - Mẫu vỡ hồng cầu' },
    { value: 'CLT', label: 'CLT - Mẫu đông' },
    { value: 'QNS', label: 'QNS - Không đủ lượng mẫu' },
    { value: 'WRG', label: 'WRG - Sai ống/loại mẫu' },
    { value: 'LBL', label: 'LBL - Sai nhãn/không nhãn' },
    { value: 'TMP', label: 'TMP - Nhiệt độ không đạt' },
    { value: 'OLD', label: 'OLD - Mẫu quá hạn' },
    { value: 'OTH', label: 'OTH - Lý do khác' },
  ] },
  { key: 'rejectionReason', label: 'Chi tiết lý do', type: 'textarea', required: true },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];

const EVENT_TYPE: Record<string, { l: string; tone: 'ok' | 'info' | 'warn' | 'crit' }> = {
  collected:   { l: 'Lấy mẫu',    tone: 'info' },
  received:    { l: 'Tiếp nhận',  tone: 'info' },
  rejected:    { l: 'Từ chối',    tone: 'crit' },
  reCollected: { l: 'Lấy lại',    tone: 'warn' },
  processing:  { l: 'Đang XN',    tone: 'info' },
  completed:   { l: 'Hoàn thành', tone: 'ok' },
  stored:      { l: 'Lưu trữ',    tone: 'info' },
  retrieved:   { l: 'Lấy ra',     tone: 'warn' },
  disposed:    { l: 'Hủy',        tone: 'crit' },
};

const PER = 18;

const SampleTrackingV2: React.FC = () => {
  const [items, setItems] = useState<SampleRejection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<SKey | 'all'>('all', 'stab');
  const [fReason, setFReason] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SampleRejection | null>(null);
  const [undoTarget, setUndoTarget] = useState<SampleRejection | null>(null);
  const [undoReason, setUndoReason] = useState('');
  const [undoLoading, setUndoLoading] = useState(false);
  const undoForm = useModalForm({ undoReason: { required: true, message: 'Nhập lý do hủy từ chối' } }, !!undoTarget);
  const [reportOpen, setReportOpen] = useState(false);

  const [tab, setTab] = useTabState<Tab>('rejections', 'tab');
  const [rejectOpen, setRejectOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [batchDate, setBatchDate] = useState<dayjs.Dayjs>(dayjs());
  const [batches, setBatches] = useState<SampleBatchDto[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchLoading, setBatchLoading] = useState(false);
  const [summary, setSummary] = useState<SampleTrackingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [tlBarcode, setTlBarcode] = useState<string | null>(null);
  const [tlEvents, setTlEvents] = useState<SampleTrackingEvent[]>([]);
  const [tlLoading, setTlLoading] = useState(false);

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

  const loadBatches = async () => {
    setBatchLoading(true);
    try {
      const r = await getSampleBatches(batchDate.toISOString());
      setBatches(r?.batches || []);
      setBatchTotal(r?.total || 0);
    } catch { setBatches([]); setBatchTotal(0); ti('Không tải được mẫu theo đợt'); }
    finally { setBatchLoading(false); }
  };
  useEffect(() => {
    if (tab === 'batches') loadBatches();
    // eslint-disable-next-line
  }, [tab, batchDate]);

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const r = await getSampleTrackingSummary();
      setSummary(r || null);
    } catch { setSummary(null); ti('Không tải được thống kê mẫu'); }
    finally { setSummaryLoading(false); }
  };
  useEffect(() => {
    if (tab === 'stats') loadSummary();
    // eslint-disable-next-line
  }, [tab]);

  const openTimeline = async (barcode: string) => {
    setTlBarcode(barcode);
    setTlLoading(true);
    try {
      const data = await getSampleTimeline(barcode);
      setTlEvents(Array.isArray(data) ? data : []);
    } catch (e) { setTlEvents([]); ti(friendlyErrorMessage(e, 'Không tải được timeline mẫu')); }
    finally { setTlLoading(false); }
  };

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
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'req', label: 'Mã YC', code: true, render: (r) => r.requestCode },
    { key: 'reason', label: 'Lý do', render: (r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{r.rejectionReason}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.rejectionCode}</div>
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
      <RowActions actions={[
        { key: 'view', icon: 'eye', label: 'Xem chi tiết', primary: true, onClick: () => setSel(r) },
        { key: 'timeline', icon: 'activity', label: 'Timeline mẫu', primary: true,
          onClick: () => openTimeline(r.sampleBarcode) },
        { key: 'undo', icon: 'refresh', label: 'Hủy từ chối',
          hidden: r.reCollected || r.isUndone,
          onClick: () => { setUndoTarget(r); setUndoReason(''); } },
        { key: 'recollect', icon: 'flask', label: 'Lấy lại mẫu',
          hidden: r.reCollected || r.isUndone,
          onClick: () => handleReCollect(r) },
      ]} />
    </div>
  );

  const batchCols: ColumnDef<SampleBatchItemDto>[] = [
    { key: 'time', label: 'Giờ', mono: true, render: (r) => dayjs(r.collectedAt).format('HH:mm') },
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode || '—' },
    { key: 'test', label: 'Xét nghiệm', render: (r) => r.testName },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại mẫu', render: (r) => r.sampleType || '—' },
    { key: 'ktv', label: 'KTV', render: (r) => r.collectorName || '—' },
    { key: 'prio', label: 'Ưu tiên', render: (r) =>
      r.priority === 3 ? <StatusBadge tone="crit" dot>Cấp cứu</StatusBadge>
      : r.priority === 2 ? <StatusBadge tone="warn" dot>Ưu tiên</StatusBadge>
      : <StatusBadge tone="info">Thường</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng từ chối', val: items.length, sub: '30 ngày qua' },
        { lbl: 'Chưa xử lý', val: counts.pending || 0, sub: 'cần lấy lại', tone: 'warn' },
        { lbl: 'Đã hủy TC', val: counts.undone || 0, sub: 'sửa nhầm lẫn', tone: 'info' },
        { lbl: 'Đã lấy lại', val: counts.recollected || 0, sub: `${Math.round(((counts.recollected || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TOP_TABS} actions={
        <>
          <Btn variant="ghost" onClick={() => setScannerOpen(true)}>
            <Ico name="scan" size={12} /> Quét barcode
          </Btn>
          <Btn variant="primary" onClick={() => setRejectOpen(true)}>
            <Ico name="x" size={12} /> Từ chối mẫu
          </Btn>
        </>
      } />

      {tab === 'rejections' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Tìm BN / barcode / mã YC…" />
          <Filter value={fReason} onChange={setFReason} options={reasons} placeholder="▾ Mã từ chối" />
          <Btn variant="ghost" onClick={() => { setSearch(''); setFReason(''); setStab('all'); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </Btn>
          <span className="spacer" />
          <RefreshButton onRefresh={load} loading={loading} />
          <Btn variant="ghost" onClick={() => setReportOpen(true)}>
            <Ico name="activity" size={12} /> Báo cáo
          </Btn>
        </div>

        <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

        <DataTable<SampleRejection>
          columns={cols} data={paged} rowKey={(r) => r.id}
          onRowClick={setSel} actions={actions}
          loading={loading}
          empty={'Không có mẫu bị từ chối'}
        />
        <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />
      </>}

      {tab === 'batches' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <DatePicker value={batchDate} onChange={(d) => d && setBatchDate(d)} format="DD/MM/YYYY" allowClear={false} size="small" />
          <RefreshButton onRefresh={loadBatches} loading={batchLoading} label="Tải" />
          <span className="spacer" />
          <StatusBadge tone="info">Tổng {batchTotal} mẫu</StatusBadge>
        </div>
        {batchLoading && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-24)' }}>Đang tải…</div>}
        {!batchLoading && batches.map((b) => (
          <div key={b.batchName} style={{ marginBottom: 'var(--space-16)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '8px 12px', borderBottom: '1px solid var(--line)' }}>
              <span style={{ fontWeight: 700, color: 'var(--t-0)' }}>{b.batchName}</span>
              <StatusBadge tone={b.count > 0 ? 'info' : 'warn'}>{b.count} mẫu</StatusBadge>
            </div>
            {b.count > 0 && (
              <DataTable<SampleBatchItemDto>
                columns={batchCols} data={b.items} rowKey={(r) => r.id}
                empty="Không có mẫu"
              />
            )}
          </div>
        ))}
        {!batchLoading && batches.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-32)' }}>Không có dữ liệu đợt lấy mẫu</div>
        )}
      </>}

      {tab === 'stats' && <>
        {summaryLoading && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-24)' }}>Đang tải…</div>}
        {!summaryLoading && summary && (
          <div style={{ padding: 'var(--space-16)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 'var(--space-12)', marginBottom: 'var(--space-16)' }}>
              {[
                { lbl: 'Tổng mẫu', val: summary.totalSamples, color: 'var(--t-0)' },
                { lbl: 'Đã lấy', val: summary.collected, color: 'var(--t-0)' },
                { lbl: 'Đang XN', val: summary.processing, color: 'var(--a-cy-text)' },
                { lbl: 'Hoàn thành', val: summary.completed, color: 'var(--a-em-text)' },
                { lbl: 'Từ chối', val: summary.rejected, color: 'var(--s-crit)' },
                { lbl: 'Tỉ lệ TC', val: `${(summary.rejectionRate * 100).toFixed(1)}%`, color: summary.rejectionRate > 0.05 ? 'var(--s-crit)' : 'var(--a-em-text)' },
                { lbl: 'TAT trung bình', val: `${summary.averageTurnaroundMinutes} phút`, color: 'var(--t-0)' },
              ].map((k) => (
                <div key={k.lbl} style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>{k.lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Lý do từ chối hàng đầu
            </div>
            {(summary.topRejectionReasons || []).map((t) => (
              <div key={t.reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{t.reason}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>{t.count}</span>
              </div>
            ))}
            {(summary.topRejectionReasons || []).length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-16)' }}>Không có dữ liệu</div>
            )}
          </div>
        )}
        {!summaryLoading && !summary && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-32)' }}>Không có dữ liệu thống kê</div>
        )}
      </>}

      {/* Modal Hủy từ chối */}
      <ModalShell
        open={!!undoTarget}
        onClose={() => setUndoTarget(null)}
        size="sm"
        title={`Hủy từ chối · ${undoTarget?.sampleBarcode || ''}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setUndoTarget(null)}>Huỷ</Btn>
          <Btn variant="primary" disabled={undoLoading} onClick={async () => {
            if (!undoForm.validate({ undoReason })) return;
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
        <Field label="Lý do hủy từ chối" required error={undoForm.errors.undoReason}>
          <Input.TextArea rows={3} value={undoReason} onChange={(e) => { setUndoReason(e.target.value); undoForm.clear('undoReason'); }} placeholder="Nhập lý do…" />
        </Field>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 'var(--space-12)', marginBottom: 'var(--space-16)' }}>
            {[
              { lbl: 'Tổng từ chối', val: items.length, color: 'var(--t-0)' },
              { lbl: 'Chưa xử lý', val: counts.pending || 0, color: 'var(--a-or-text)' },
              { lbl: 'Đã lấy lại', val: counts.recollected || 0, color: 'var(--a-em-text)' },
            ].map((k) => (
              <div key={k.lbl} style={{ padding: 'var(--space-12)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>{k.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-2)', marginBottom: 'var(--space-8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Lý do từ chối phổ biến
          </div>
          {Array.from(new Set(items.map((r) => r.rejectionReason))).slice(0, 10).map((reason) => {
            const cnt = items.filter((r) => r.rejectionReason === reason).length;
            const pct = Math.round((cnt / Math.max(1, items.length)) * 100);
            return (
              <div key={reason} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                <span style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{reason}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--fs-md)' }}>{cnt} <span style={{ color: 'var(--t-2)', fontWeight: 400 }}>({pct}%)</span></span>
              </div>
            );
          })}
          {items.length === 0 && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-32)' }}>Không có dữ liệu</div>}
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
          {sel && (
            <Btn variant="ghost" onClick={() => { openTimeline(sel.sampleBarcode); setSel(null); }}>
              <Ico name="activity" size={12} /> Timeline
            </Btn>
          )}
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
              <div style={{ fontSize: 'var(--fs-md)', color: 'var(--t-1)' }}>{sel.notes}</div>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      {/* Drawer Timeline mẫu (parity v1) */}
      <DrawerShell
        open={!!tlBarcode}
        onClose={() => setTlBarcode(null)}
        size="md"
        title={tlBarcode ? `Timeline mẫu · ${tlBarcode}` : ''}
        sub={`${tlEvents.length} sự kiện`}
        footer={<Btn variant="ghost" onClick={() => setTlBarcode(null)}>Đóng</Btn>}
      >
        {tlLoading && <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-24)' }}>Đang tải…</div>}
        {!tlLoading && tlEvents.map((ev) => {
          const info = EVENT_TYPE[ev.eventType] || { l: ev.eventType, tone: 'info' as const };
          return (
            <div key={ev.id} style={{ display: 'flex', gap: 'var(--space-12)', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ minWidth: 110 }}>
                <StatusBadge tone={info.tone} dot>{info.l}</StatusBadge>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-sm)', color: 'var(--t-0)' }}>
                  {dayjs(ev.eventDate).format('DD/MM/YYYY HH:mm')}
                </div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
                  {ev.userName}{ev.location ? ` · ${ev.location}` : ''}
                </div>
                {ev.reason && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Lý do: {ev.reason}</div>}
                {ev.notes && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{ev.notes}</div>}
              </div>
            </div>
          );
        })}
        {!tlLoading && tlEvents.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-32)' }}>Không có dữ liệu timeline</div>
        )}
      </DrawerShell>

      {/* Modal Từ chối mẫu mới (parity v1) */}
      <CrudModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Từ chối mẫu"
        fields={REJECT_FIELDS}
        initial={null}
        onSubmit={async (v) => {
          await rejectSample(v as { sampleBarcode: string; labRequestId: string; rejectionCode: string; rejectionReason: string; notes?: string });
          tk('Đã từ chối mẫu');
          load();
        }}
      />

      {/* Quét barcode → mở timeline (parity v1) */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(code) => { setScannerOpen(false); openTimeline(code); }}
      />
    </div>
  );
};

export default SampleTrackingV2;
