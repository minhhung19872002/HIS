import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRequests } from '../api/interHospitalSharing';
import type { InterHospitalRequest } from '../api/interHospitalSharing';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
  type ColumnDef,
} from './_v2kit';

const TYPE_LABEL: Record<string, string> = {
  drug_lookup: 'Tra thuốc', ecpr: 'eCPR', patient_transfer: 'Chuyển BN',
  consultation: 'Hội chẩn', record_sharing: 'Chia sẻ HS',
};

const URGENCY_LABEL: Record<string, string> = { normal: 'Thường', urgent: 'Khẩn', emergency: 'Cấp cứu' };
const URGENCY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  normal: 'ok', urgent: 'warn', emergency: 'crit',
};

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ', 1: 'Đã nhận', 2: 'Đang xử lý', 3: 'Hoàn thành', 4: 'Từ chối',
};

type SKey = 'pending' | 'received' | 'processing' | 'completed' | 'rejected';
const STATUS_TABS = [
  { v: 'pending' as SKey,    l: 'Chờ',          tone: 'warn' as const },
  { v: 'received' as SKey,   l: 'Đã nhận',      tone: 'info' as const },
  { v: 'processing' as SKey, l: 'Đang xử lý',   tone: 'info' as const },
  { v: 'completed' as SKey,  l: 'Hoàn thành',   tone: 'ok' as const },
  { v: 'rejected' as SKey,   l: 'Từ chối',      tone: 'crit' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'received' : n === 2 ? 'processing' : n === 3 ? 'completed' : 'rejected';

const PER = 18;

const InterHospitalSharingV2: React.FC = () => {
  const [items, setItems] = useState<InterHospitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<InterHospitalRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r: any = await searchRequests({ keyword: search });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as InterHospitalRequest[];
      setItems(list);
    } catch { ti('Không tải được yêu cầu liên viện'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const types = useMemo(() => Object.entries(TYPE_LABEL).map(([v, l]) => ({ v, l })), []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.requestType !== fType) return false;
      if (!k) return true;
      return [r.requestCode, r.subject, r.patientName, r.requestingHospital, r.respondingHospital]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<InterHospitalRequest>[] = [
    { key: 'code', label: 'Mã YC', code: true, render: (r) => r.requestCode },
    { key: 'type', label: 'Loại', render: (r) => (
      <StatusBadge tone="info">{TYPE_LABEL[r.requestType] || r.requestType}</StatusBadge>
    ) },
    { key: 'dir', label: 'Chiều', render: (r) => (
      <span style={{ fontWeight: 600, color: r.direction === 'incoming' ? 'var(--a-cy-text)' : 'var(--a-or-text)' }}>
        {r.direction === 'incoming' ? '← Vào' : '→ Ra'}
      </span>
    ) },
    { key: 'subj', label: 'Chủ đề', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.subject}</div>
        {r.patientName && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>BN: {r.patientName}</div>}
      </div>
    ) },
    { key: 'hosp', label: 'BV đối tác', render: (r) => r.direction === 'incoming' ? r.requestingHospital : r.respondingHospital },
    { key: 'time', label: 'Thời gian', mono: true, render: (r) => dayjs(r.requestedAt).format('DD/MM HH:mm') },
    { key: 'urg', label: 'Ưu tiên', render: (r) => (
      <StatusBadge tone={URGENCY_TONE[r.urgency] || 'info'} dot>{URGENCY_LABEL[r.urgency] || r.urgency}</StatusBadge>
    ) },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: InterHospitalRequest) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {(r.status === 0 || r.status === 1) && (
        <ActBtn ic="check" title="Xử lý" onClick={() => tk(`Xử lý ${r.requestCode}`)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng yêu cầu', val: items.length, sub: 'tất cả' },
        { lbl: 'Chờ xử lý', val: counts.pending || 0, sub: 'cần phản hồi', tone: 'warn' },
        { lbl: 'Khẩn / Cấp cứu', val: items.filter((r) => r.urgency !== 'normal').length, sub: 'ưu tiên', tone: 'crit' },
        { lbl: 'Hoàn thành', val: counts.completed || 0, sub: `${Math.round(((counts.completed || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm chủ đề / BV / BN…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại YC" />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở yêu cầu liên viện mới')}>
          <Ico name="plus" size={12} /> Yêu cầu mới
        </button>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<InterHospitalRequest>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có yêu cầu liên viện'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? sel.subject : ''}
        sub={sel ? `${sel.requestCode} · ${TYPE_LABEL[sel.requestType] || sel.requestType}` : ''}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          <button type="button" className="ab-btn" onClick={() => tk('Đã in YC')}>
            <Ico name="print" size={12} /> In YC
          </button>
          {sel && (sel.status === 0 || sel.status === 1) && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã xử lý'); setSel(null); }}>
              <Ico name="check" size={12} /> Xử lý
            </button>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Yêu cầu">
            <DrField lbl="Mã YC"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.requestCode}</span></DrField>
            <DrField lbl="Loại">{TYPE_LABEL[sel.requestType] || sel.requestType}</DrField>
            <DrField lbl="Chiều">{sel.direction === 'incoming' ? '← Đi vào' : '→ Đi ra'}</DrField>
            <DrField lbl="Chủ đề">{sel.subject}</DrField>
            <DrField lbl="Chi tiết">
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{sel.details}</div>
            </DrField>
            <DrField lbl="Ưu tiên">
              <StatusBadge tone={URGENCY_TONE[sel.urgency] || 'info'} dot>{URGENCY_LABEL[sel.urgency] || sel.urgency}</StatusBadge>
            </DrField>
          </DrSec>
          {sel.patientName && (
            <DrSec title="Bệnh nhân">
              <DrField lbl="Họ tên">{sel.patientName}</DrField>
              <DrField lbl="Mã BN"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.patientCode}</span></DrField>
            </DrSec>
          )}
          <DrSec title="Bệnh viện">
            <DrField lbl="BV yêu cầu">{sel.requestingHospital}</DrField>
            <DrField lbl="BV phản hồi">{sel.respondingHospital}</DrField>
            <DrField lbl="YC bởi">{sel.requestedBy}</DrField>
            <DrField lbl="YC lúc">{dayjs(sel.requestedAt).format('DD/MM/YYYY HH:mm')}</DrField>
          </DrSec>
          <DrSec title="Phản hồi">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
            {sel.respondedBy && <DrField lbl="Trả lời bởi">{sel.respondedBy}</DrField>}
            {sel.respondedAt && <DrField lbl="Phản hồi lúc">{dayjs(sel.respondedAt).format('DD/MM/YYYY HH:mm')}</DrField>}
            {sel.responseNotes && <DrField lbl="Nội dung phản hồi">{sel.responseNotes}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default InterHospitalSharingV2;
