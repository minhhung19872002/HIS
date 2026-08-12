import React, { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchCases, getStats, getExaminations, createCase, updateCase, approveCase,
} from '../api/forensic';
import type { ForensicCase, ForensicExamination, ForensicStats } from '../api/forensic';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, DrSec, DrField, CrudModal,
  useTabCounts, tk, te, cf,
  type ColumnDef, type StatusTab, type CrudFieldCfg, type KpiItem,
} from '@/_v2kit';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

type SKey = 'pending' | 'examining' | 'completed' | 'approved';
const STATUS_TABS: StatusTab<SKey>[] = [
  { v: 'pending',   l: 'Chờ GĐ',   tone: 'info' },
  { v: 'examining', l: 'Đang GĐ',  tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất', tone: 'ok' },
  { v: 'approved',  l: 'Đã duyệt', tone: 'ok' },
];
const sKey = (s: number): SKey =>
  s === 3 ? 'approved' : s === 2 ? 'completed' : s === 1 ? 'examining' : 'pending';
const TONE: Record<SKey, 'ok' | 'warn' | 'info' | 'crit'> = {
  pending: 'info', examining: 'warn', completed: 'ok', approved: 'ok',
};
const TYPE_LABEL: Record<string, string> = {
  disability: 'Tỉ lệ TT', driver: 'Lái xe',
  employment: 'Tuyển dụng', insurance: 'Bảo hiểm', court: 'Tố tụng',
};
const TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));

const FIELDS: CrudFieldCfg[] = [
  { key: 'patientName',            label: 'Họ tên đối tượng', required: true },
  { key: 'patientCode',            label: 'Mã đối tượng' },
  { key: 'caseType',               label: 'Loại giám định', type: 'select', required: true, options: TYPE_OPTIONS },
  { key: 'requestingOrganization', label: 'Tổ chức yêu cầu', required: true },
  { key: 'purpose',                label: 'Mục đích', type: 'textarea', required: true },
  { key: 'requestDate',            label: 'Ngày yêu cầu', type: 'date', required: true },
  { key: 'disabilityPercent',      label: 'Tỉ lệ tổn thương (%)', type: 'number' },
  { key: 'conclusion',             label: 'Kết luận', type: 'textarea' },
  { key: 'notes',                  label: 'Ghi chú', type: 'textarea' },
];

const PER = 20;

const MedicalForensicsV2: React.FC = () => {
  const [rows, setRows]         = useState<ForensicCase[]>([]);
  const [loading, setLoading]   = useState(false);
  const [stats, setStats]       = useState<ForensicStats | null>(null);
  const [stab, setStab]         = useState<SKey | 'all'>('all');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(0);
  const [sel, setSel]           = useState<ForensicCase | null>(null);
  const [exams, setExams]       = useState<ForensicExamination[]>([]);
  const [examLoad, setExamLoad] = useState(false);
  const [crudOpen, setCrudOpen] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cases, st] = await Promise.all([searchCases(), getStats()]);
      setRows(cases);
      setStats(st);
    } catch (e) { te(friendlyErrorMessage(e, 'Không tải được danh sách hồ sơ giám định.')); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (r: ForensicCase) => {
    setSel(r); setExams([]); setExamLoad(true);
    try { setExams(await getExaminations(r.id)); }
    finally { setExamLoad(false); }
  };

  const openCreate = () => { setEditId(null); setCrudInit(undefined); setCrudOpen(true); };
  const openEdit = (r: ForensicCase) => {
    setEditId(r.id);
    setCrudInit({
      patientName: r.patientName, patientCode: r.patientCode,
      caseType: r.caseType, requestingOrganization: r.requestingOrganization,
      purpose: r.purpose, requestDate: r.requestDate?.slice(0, 10),
      disabilityPercent: r.disabilityPercent, conclusion: r.conclusion, notes: r.notes,
    });
    setCrudOpen(true);
  };
  const handleApprove = (r: ForensicCase) =>
    cf('Duyệt hồ sơ giám định này?', async () => {
      try { await approveCase(r.id); tk('Đã duyệt'); load(); }
      catch { te('Duyệt thất bại'); }
    }, { tone: 'warn' });

  const handleSubmit = async (v: Record<string, unknown>) => {
    if (editId) {
      await updateCase(editId, v as Partial<ForensicCase>);
      tk('Đã cập nhật hồ sơ');
    } else {
      await createCase(v as Partial<ForensicCase>);
      tk('Đã tạo hồ sơ');
    }
    load();
  };

  const counts = useTabCounts(rows, STATUS_TABS, (r) => sKey(r.status));
  const filtered = rows.filter((r) => {
    if (stab !== 'all' && sKey(r.status) !== stab) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [r.patientName, r.patientCode, r.caseCode, r.requestingOrganization].some(
      (f) => (f ?? '').toLowerCase().includes(s),
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const kpis: KpiItem[] = [
    { lbl: 'Tổng HS', val: rows.length },
    { lbl: 'Chờ GĐ', val: stats?.pendingCases ?? 0, tone: 'warn' },
    { lbl: 'Hoàn tháng', val: stats?.completedThisMonth ?? 0, tone: 'ok' },
    { lbl: 'TB tổn thương', val: stats?.avgDisabilityPercent
        ? `${stats.avgDisabilityPercent.toFixed(1)}%` : '—' },
  ];

  const cols: ColumnDef<ForensicCase>[] = [
    { key: 'code', label: 'Mã GĐ', mono: true, width: 130,
      render: (r) => r.caseCode },
    { key: 'pat', label: 'Đối tượng', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    )},
    { key: 'type', label: 'Loại', width: 130, render: (r) => (
      <span className="chip info">{TYPE_LABEL[r.caseType] ?? r.caseType}</span>
    )},
    { key: 'org', label: 'Tổ chức', render: (r) => r.requestingOrganization },
    { key: 'date', label: 'Ngày YC', mono: true, width: 100,
      render: (r) => r.requestDate ? dayjs(r.requestDate).format('DD/MM/YY') : '—' },
    { key: 'pct', label: 'TT%', mono: true, width: 70,
      render: (r) => r.disabilityPercent != null ? `${r.disabilityPercent}%` : '—' },
    { key: 'st', label: 'TT', width: 100, render: (r) => {
      const k = sKey(r.status);
      return <StatusBadge tone={TONE[k]}>{STATUS_TABS.find((t) => t.v === k)?.l}</StatusBadge>;
    }},
    { key: 'act', label: '', width: 72, render: (r) => (
      <div style={{ display: 'flex', gap: 4 }} onClick={(e) => e.stopPropagation()}>
        <ActBtn ic="edit" onClick={() => openEdit(r)} title="Sửa" />
        {r.status === 2 && <ActBtn ic="check" onClick={() => handleApprove(r)} title="Duyệt" />}
      </div>
    )},
  ];

  return (
    <div>
      <KpiStrip items={kpis} />
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / mã / tổ chức…" />
        <Btn variant="primary" icon="plus" onClick={openCreate}>Tạo hồ sơ</Btn>
        <Btn icon="refresh" onClick={load} loading={loading} />
      </div>
      <StatusTabs<SKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />
      <DataTable<ForensicCase>
        columns={cols}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={openDetail}
        empty={loading ? 'Đang tải…' : 'Không có hồ sơ giám định'}
      />
      <Pager
        page={page}
        totalPages={totalPages}
        setPage={(p) => setPage(typeof p === 'function' ? p(page) : p)}
        total={filtered.length}
        perPage={PER}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        title={sel?.caseCode ?? ''}
        sub={sel ? `${TYPE_LABEL[sel.caseType] ?? sel.caseType} · ${sel.requestingOrganization}` : ''}
        footer={
          <>
            <Btn variant="ghost" onClick={() => { openEdit(sel!); setSel(null); }}>Sửa</Btn>
            {sel?.status === 2 && (
              <Btn variant="primary" onClick={() => { handleApprove(sel!); setSel(null); }}>Duyệt</Btn>
            )}
          </>
        }
      >
        {sel && (
          <>
            <DrSec title="Đối tượng">
              <DrField lbl="Họ tên">{sel.patientName}</DrField>
              <DrField lbl="Mã đối tượng"><span className="mono">{sel.patientCode}</span></DrField>
              <DrField lbl="Mã hồ sơ">
                <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.caseCode}</span>
              </DrField>
            </DrSec>
            <DrSec title="Yêu cầu giám định">
              <DrField lbl="Loại">{TYPE_LABEL[sel.caseType] ?? sel.caseType}</DrField>
              <DrField lbl="Tổ chức">{sel.requestingOrganization}</DrField>
              <DrField lbl="Mục đích">{sel.purpose}</DrField>
              <DrField lbl="Ngày YC">
                {sel.requestDate ? dayjs(sel.requestDate).format('DD/MM/YYYY') : '—'}
              </DrField>
            </DrSec>
            <DrSec title="Kết quả">
              {sel.examinerName && <DrField lbl="BS giám định">{sel.examinerName}</DrField>}
              {sel.disabilityPercent != null && (
                <DrField lbl="Tỉ lệ tổn thương">
                  <b style={{ color: 'var(--s-warn)' }}>{sel.disabilityPercent}%</b>
                </DrField>
              )}
              {sel.conclusion && <DrField lbl="Kết luận">{sel.conclusion}</DrField>}
              {sel.approvedBy && (
                <DrField lbl="Người duyệt">
                  {sel.approvedBy} · {sel.approvedAt ? dayjs(sel.approvedAt).format('DD/MM/YYYY') : ''}
                </DrField>
              )}
            </DrSec>
            {(exams.length > 0 || examLoad) && (
              <DrSec title={examLoad ? 'Chi tiết khám…' : `Chi tiết khám (${exams.length})`}>
                {exams.map((e) => (
                  <div key={e.id} style={{
                    padding: '8px 10px', marginBottom: 6,
                    background: 'var(--bg-1)', border: '1px solid var(--line-soft)',
                    borderRadius: 'var(--r-2)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>{e.examType}</div>
                    {e.findings && <div style={{ fontSize: 12, color: 'var(--t-2)' }}>{e.findings}</div>}
                    {e.conclusion && (
                      <div style={{ fontSize: 12, color: 'var(--t-1)', marginTop: 4 }}>{e.conclusion}</div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--t-3)', marginTop: 6 }}>
                      {e.examinerName} · {dayjs(e.examDate).format('DD/MM/YYYY')}
                    </div>
                  </div>
                ))}
              </DrSec>
            )}
            {sel.notes && <DrSec title="Ghi chú"><DrField lbl="">{sel.notes}</DrField></DrSec>}
          </>
        )}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={editId ? 'Sửa hồ sơ giám định' : 'Tạo hồ sơ giám định'}
        fields={FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default MedicalForensicsV2;
