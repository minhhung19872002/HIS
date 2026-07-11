import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Input } from 'antd';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField,
  tk, tw, te, cf,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import {
  getAnalyzerInbox, transferInboxResult, rejectInboxResult,
  getAnalyzers,
  type AnalyzerInboxItemDto,
} from '../modules/laboratory/api/lis';
import type { LabAnalyzerDto } from '../modules/laboratory/api/lis';

// G-18: Màn "KQ máy" — inbox kết quả từ máy xét nghiệm
// Status: 0=Pending, 1=Matched, 2=ManualMapped, 3=Ignored, 4=Transferred

type SKey = 'pending' | 'matched' | 'transferred' | 'rejected';

const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'pending',     l: 'Chờ',       tone: 'warn' },
  { v: 'matched',     l: 'Đã khớp',   tone: 'info' },
  { v: 'transferred', l: 'Đã chuyển', tone: 'ok'   },
  { v: 'rejected',    l: 'Từ chối',   tone: 'crit' },
];

const STATUS_VALUE: Record<SKey, number | null> = {
  pending:     0,
  matched:     1,
  transferred: 4,
  rejected:    3,
};

const TONE_MAP: Record<number, 'warn' | 'info' | 'ok' | 'crit'> = {
  0: 'warn', 1: 'info', 2: 'info', 3: 'crit', 4: 'ok',
};

const FLAG_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  N: 'ok', NORMAL: 'ok',
  H: 'warn', L: 'warn',
  HH: 'crit', LL: 'crit',
};

const PER = 20;

const AnalyzerInboxPage: React.FC = () => {
  const [items, setItems] = useState<AnalyzerInboxItemDto[]>([]);
  const [analyzers, setAnalyzers] = useState<LabAnalyzerDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fAnalyzer, setFAnalyzer] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AnalyzerInboxItemDto | null>(null);

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<AnalyzerInboxItemDto | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const statusVal = stab === 'all' ? undefined : (STATUS_VALUE[stab] ?? undefined);
      const [inboxRes, analyzerRes] = await Promise.all([
        getAnalyzerInbox({
          analyzerId: fAnalyzer || undefined,
          status: statusVal,
          page: 0,
          pageSize: 200,
        }),
        getAnalyzers(),
      ]);
      setItems(inboxRes.data || []);
      setAnalyzers(analyzerRes.data || []);
    } catch {
      tw('Không tải được dữ liệu inbox');
    } finally {
      setLoading(false);
    }
  }, [stab, fAnalyzer]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [load]);

  const analyzerOptions = useMemo(() =>
    analyzers.map((a) => ({ v: a.id, l: a.name })), [analyzers]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => {
      const sv = STATUS_VALUE[s.v];
      c[s.v] = items.filter((r) => r.status === sv).length;
    });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (!k) return true;
      return [r.sampleBarcode, r.testCode, r.result, r.analyzerName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const doTransfer = (r: AnalyzerInboxItemDto) =>
    cf(`Chuyển kết quả "${r.testCode}" (mã: ${r.sampleBarcode}) về phiếu?`, async () => {
      try {
        await transferInboxResult(r.id);
        tk('Đã chuyển kết quả về phiếu');
        setSel(null);
        load();
      } catch (err: unknown) {
        te((err as Error)?.message || 'Chuyển kết quả thất bại');
      }
    }, { tone: 'info', confirm: 'Chuyển về phiếu' });

  const doRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await rejectInboxResult(rejectTarget.id, rejectReason);
      tk('Đã từ chối');
      setRejectTarget(null);
      setRejectReason('');
      setSel(null);
      load();
    } catch {
      te('Từ chối thất bại');
    } finally {
      setRejectLoading(false);
    }
  };

  const cols: ColumnDef<AnalyzerInboxItemDto>[] = [
    {
      key: 'sample', label: 'Barcode / Máy', render: (r) => (
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-md)' }}>{r.sampleBarcode || '—'}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.analyzerName}</div>
        </div>
      ),
    },
    { key: 'testCode', label: 'Xét nghiệm', code: true, render: (r) => r.testCode },
    {
      key: 'result', label: 'Kết quả', render: (r) => (
        <div>
          <span style={{ fontWeight: 600 }}>{r.result}</span>
          {r.unit && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginLeft: 'var(--space-4)' }}>{r.unit}</span>}
          {r.flag && r.flag.toUpperCase() !== 'N' && (
            <span style={{ marginLeft: 'var(--space-4)' }}>
              <StatusBadge tone={FLAG_TONE[r.flag.toUpperCase()] || 'warn'}>{r.flag}</StatusBadge>
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status', label: 'Trạng thái', render: (r) => (
        <StatusBadge tone={TONE_MAP[r.status] || 'warn'} dot>{r.statusName}</StatusBadge>
      ),
    },
    {
      key: 'time', label: 'Nhận lúc', mono: true,
      render: (r) => dayjs(r.receivedAt).format('DD/MM HH:mm'),
    },
  ];

  const actions = (r: AnalyzerInboxItemDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {(r.status === 1 || r.status === 2) && (
        <ActBtn ic="check" title="Chuyển về phiếu" onClick={() => doTransfer(r)} />
      )}
      {r.status === 0 && (
        <ActBtn ic="x" title="Từ chối" tone="crit" onClick={() => { setRejectTarget(r); setRejectReason(''); }} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng',      val: items.length,      sub: 'inbox hôm nay'           },
        { lbl: 'Chờ khớp',  val: counts.pending || 0, sub: 'cần xử lý', tone: 'warn' },
        { lbl: 'Đã khớp',   val: counts.matched || 0, sub: 'sẵn chuyển', tone: 'info' },
        { lbl: 'Đã chuyển', val: counts.transferred || 0, sub: 'hoàn thành', tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm barcode / mã XN…"
        />
        <Filter
          value={fAnalyzer}
          onChange={(v) => { setFAnalyzer(v); setPage(0); }}
          options={analyzerOptions}
          placeholder="▾ Máy XN"
        />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFAnalyzer(''); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
      </div>

      <StatusTabs<SKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<AnalyzerInboxItemDto>
        columns={cols}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={setSel}
        actions={actions}
        empty={loading ? 'Đang tải…' : 'Inbox trống'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Detail Drawer */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? `${sel.testCode} — ${sel.sampleBarcode}` : ''}
        sub={sel ? sel.analyzerName : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && (sel.status === 1 || sel.status === 2) && (
            <Btn variant="primary" icon="check" onClick={() => doTransfer(sel!)}>Chuyển về phiếu</Btn>
          )}
          {sel && sel.status === 0 && (
            <Btn variant="ghost" icon="x" onClick={() => { setRejectTarget(sel!); setRejectReason(''); setSel(null); }}>
              Từ chối
            </Btn>
          )}
        </>}
      >
        {sel && (
          <>
            <DrSec title="Kết quả máy">
              <DrField lbl="Barcode"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.sampleBarcode}</span></DrField>
              <DrField lbl="Xét nghiệm"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.testCode}</span></DrField>
              <DrField lbl="Kết quả">
                <span style={{ fontWeight: 700, fontSize: 16 }}>{sel.result}</span>
                {sel.unit && <span style={{ color: 'var(--t-2)', marginLeft: 'var(--space-6)' }}>{sel.unit}</span>}
              </DrField>
              {sel.flag && (
                <DrField lbl="Flag">
                  <StatusBadge tone={FLAG_TONE[sel.flag.toUpperCase()] || 'warn'}>{sel.flag}</StatusBadge>
                </DrField>
              )}
              <DrField lbl="Thời điểm XN">{sel.resultTime ? dayjs(sel.resultTime).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            </DrSec>
            <DrSec title="Trạng thái inbox">
              <DrField lbl="Trạng thái">
                <StatusBadge tone={TONE_MAP[sel.status] || 'warn'} dot>{sel.statusName}</StatusBadge>
              </DrField>
              <DrField lbl="Nhận lúc">{dayjs(sel.receivedAt).format('DD/MM/YYYY HH:mm:ss')}</DrField>
              {sel.matchedLabRequestItemId && (
                <DrField lbl="Phiếu XN khớp">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{sel.matchedLabRequestItemId}</span>
                </DrField>
              )}
              {sel.rejectedReason && <DrField lbl="Lý do từ chối">{sel.rejectedReason}</DrField>}
              {sel.transferredAt && (
                <DrField lbl="Chuyển lúc">{dayjs(sel.transferredAt).format('DD/MM/YYYY HH:mm')}</DrField>
              )}
            </DrSec>
            <DrSec title="Nguồn">
              <DrField lbl="Máy XN">{sel.analyzerName}</DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>

      {/* Reject Modal */}
      <Modal
        open={!!rejectTarget}
        title={`Từ chối kết quả: ${rejectTarget?.testCode} — ${rejectTarget?.sampleBarcode}`}
        onOk={doRejectConfirm}
        onCancel={() => { setRejectTarget(null); setRejectReason(''); }}
        okText="Từ chối"
        cancelText="Hủy"
        okButtonProps={{ danger: true, loading: rejectLoading }}
        destroyOnHidden
      >
        <Input.TextArea
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Lý do từ chối (tùy chọn)…"
          rows={3}
          style={{ marginTop: 'var(--space-8)' }}
        />
      </Modal>
    </div>
  );
};

export default AnalyzerInboxPage;
