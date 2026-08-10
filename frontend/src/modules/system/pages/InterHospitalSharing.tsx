import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchRequests, respondToRequest, createRequest, getStats } from '../api/interHospitalSharing';
import type { InterHospitalRequest, InterHospitalStats } from '../api/interHospitalSharing';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

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
  const [stats, setStats] = useState<InterHospitalStats | null>(null);
  const [items, setItems] = useState<InterHospitalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [fDir, setFDir] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<InterHospitalRequest | null>(null);
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondTarget, setRespondTarget] = useState<InterHospitalRequest | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const openRespond = (r: InterHospitalRequest) => { setRespondTarget(r); setRespondOpen(true); };

  const RESPOND_FIELDS: CrudFieldCfg[] = [
    { key: 'statusDecision', label: 'Quyết định', type: 'select', required: true, options: [
      { value: 'accept',  label: 'Tiếp nhận (Đã nhận)' },
      { value: 'reject',  label: 'Từ chối' }] },
    { key: 'responseNotes', label: 'Nội dung phản hồi', type: 'textarea', required: true },
  ];

  const CREATE_FIELDS: CrudFieldCfg[] = [
    { key: 'requestType', label: 'Loại yêu cầu', type: 'select', required: true, options: Object.entries(TYPE_LABEL).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'respondingHospital', label: 'Bệnh viện nhận', required: true },
    { key: 'subject', label: 'Chủ đề', required: true },
    { key: 'details', label: 'Chi tiết', type: 'textarea', required: true },
    { key: 'urgency', label: 'Mức độ ưu tiên', type: 'select', required: true, options: Object.entries(URGENCY_LABEL).map(([v, l]) => ({ value: v, label: l })) },
    { key: 'patientName', label: 'Tên bệnh nhân (nếu có)' },
    { key: 'patientCode', label: 'Mã bệnh nhân' },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        searchRequests({
          keyword: search || undefined,
          direction: fDir || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        getStats().catch(() => null),
      ]);
      setItems(normalizeArrayResponse<InterHospitalRequest>(r));
      if (s) setStats(s);
    } catch { ti('Không tải được yêu cầu liên viện'); }
    finally { setLoading(false); }
  }, [search, fDir, fromDate, toDate]);
  useEffect(() => { load(); }, [load]);

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

  const DIR_OPTS = [{ v: 'incoming', l: '← Vào' }, { v: 'outgoing', l: '→ Ra' }];

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
        {r.patientName && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>BN: {r.patientName}</div>}
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
      {r.direction === 'incoming' && (r.status === 0 || r.status === 1) && (
        <ActBtn ic="check" title="Xử lý" onClick={() => openRespond(r)} />
      )}
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng yêu cầu', val: stats?.totalRequests ?? items.length, sub: 'tất cả' },
        { lbl: 'Chờ xử lý', val: stats?.pendingRequests ?? (counts.pending || 0), sub: 'cần phản hồi', tone: 'warn' },
        { lbl: 'Hoàn thành hôm nay', val: stats?.completedToday ?? (counts.completed || 0), sub: 'hôm nay', tone: 'ok' },
        { lbl: 'TB phản hồi', val: stats ? `${Math.round(stats.avgResponseTimeMinutes)}p` : '—', sub: 'phút/yêu cầu', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm chủ đề / BV / BN…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại YC" />
        <Filter value={fDir} onChange={setFDir} options={DIR_OPTS} placeholder="▾ Chiều" />
        <input type="date" style={{ height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13 }}
          value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} title="Từ ngày" />
        <input type="date" style={{ height: 30, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)', background: 'var(--bg-1)', fontSize: 13 }}
          value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }} title="Đến ngày" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setFDir(''); setFromDate(''); setToDate(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load} loading={loading}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={() => setCreateOpen(true)}>Yêu cầu mới</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<InterHospitalRequest>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions} loading={loading}
        empty={'Chưa có yêu cầu liên viện'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* Modal phản hồi yêu cầu */}
      <CrudModal
        open={respondOpen}
        onClose={() => setRespondOpen(false)}
        title={respondTarget ? `Phản hồi: ${respondTarget.requestCode}` : 'Phản hồi yêu cầu liên viện'}
        fields={RESPOND_FIELDS}
        initial={{ statusDecision: 'approve', responseNotes: '' }}
        size="md"
        onSubmit={async (v) => {
          if (!respondTarget) return;
          const statusCode = v.statusDecision === 'accept' ? 1 : 4; // 1=Đã nhận, 4=Từ chối
          await respondToRequest(respondTarget.id, {
            status: statusCode,
            responseNotes: v.responseNotes as string,
          });
          tk(v.statusDecision === 'accept' ? 'Đã tiếp nhận yêu cầu' : 'Đã từ chối yêu cầu');
          load();
        }}
      />

      {/* Modal tạo yêu cầu liên viện mới */}
      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yêu cầu liên viện mới"
        fields={CREATE_FIELDS}
        initial={{ requestType: 'consultation', urgency: 'normal' }}
        size="lg"
        onSubmit={async (v) => {
          await createRequest({
            requestType: v.requestType as InterHospitalRequest['requestType'],
            direction: 'outgoing',
            urgency: v.urgency as InterHospitalRequest['urgency'],
            respondingHospital: v.respondingHospital as string,
            subject: v.subject as string,
            details: v.details as string,
            patientName: v.patientName as string | undefined,
            patientCode: v.patientCode as string | undefined,
          });
          tk('Đã gửi yêu cầu liên viện');
          load();
        }}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? sel.subject : ''}
        sub={sel ? `${sel.requestCode} · ${TYPE_LABEL[sel.requestType] || sel.requestType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="print" onClick={() => window.print()}>In YC</Btn>
          {sel && sel.direction === 'incoming' && (sel.status === 0 || sel.status === 1) && (
            <Btn variant="primary" icon="check" onClick={() => { openRespond(sel); setSel(null); }}>Xử lý</Btn>
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
              <div style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-md)' }}>{sel.details}</div>
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
