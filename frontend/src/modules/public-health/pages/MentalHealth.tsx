import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  searchCases, createCase, getAssessments, screenDepression, getStats,
} from '../api/mentalHealth';
import type { MentalHealthCase, MentalHealthAssessment, MentalHealthStats } from '../api/mentalHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, tw, Ico,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';

type StatusKey = 'active' | 'stable' | 'remission' | 'discharged';
const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'active',     l: 'Đang điều trị', tone: 'warn' },
  { v: 'stable',     l: 'Ổn định',       tone: 'ok' },
  { v: 'remission',  l: 'Thuyên giảm',   tone: 'ok' },
  { v: 'discharged', l: 'Đã xuất viện',  tone: 'info' },
];
const statusKey = (s: number): StatusKey => {
  if (s === 1) return 'stable';
  if (s === 2) return 'remission';
  if (s === 3) return 'discharged';
  return 'active';
};
const TYPE_LABEL: Record<string, string> = {
  schizophrenia: 'Tâm thần phân liệt',
  depression: 'Trầm cảm',
  anxiety: 'Lo âu',
  bipolar: 'Rối loạn lưỡng cực',
  ptsd: 'PTSD',
  substance: 'Lạm dụng chất',
};
const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { mild: 'ok', moderate: 'warn', severe: 'crit' };
const SEVERITY_LABEL: Record<string, string> = { mild: 'Nhẹ', moderate: 'TB', severe: 'Nặng' };
const ADHERENCE_LABEL: Record<string, string> = { good: 'Tốt', moderate: 'TB', poor: 'Kém' };
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';

const CASE_TYPE_OPTIONS = Object.entries(TYPE_LABEL).map(([value, label]) => ({ value, label }));

const CREATE_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Bệnh nhân', required: true },
  { key: 'patientCode', label: 'Mã BN' },
  { key: 'caseType', label: 'Loại bệnh', type: 'select', required: true, options: CASE_TYPE_OPTIONS },
  { key: 'severity', label: 'Mức độ', type: 'select', options: [
    { value: 'mild', label: 'Nhẹ' },
    { value: 'moderate', label: 'Trung bình' },
    { value: 'severe', label: 'Nặng' },
  ] },
  { key: 'diagnosis', label: 'Chẩn đoán', required: true, type: 'textarea' },
  { key: 'medications', label: 'Thuốc điều trị', type: 'textarea' },
];

const PHQ9_QUESTIONS = [
  'Ít hứng thú hoặc vui vẻ khi làm việc',
  'Cảm thấy buồn bã, chán nản hoặc tuyệt vọng',
  'Khó ngủ, mất ngủ hoặc ngủ nhiều',
  'Mệt mỏi, cảm thấy thiếu sức lực',
  'Ăn kém ngon hoặc ăn nhiều hơn',
  'Cảm thấy tự ti, thất bại hoặc làm hổ thẹn gia đình',
  'Khó tập trung vào các việc như đọc báo, xem tivi',
  'Cử động hoặc nói chậm, hoặc bứt rứt bồn chồn',
  'Có ý nghĩ rằng chết đi tốt hơn hoặc tự gây hại bản thân',
];
const PHQ9_SCORE_OPTIONS = [
  { value: 0, label: '0 – Không hề' },
  { value: 1, label: '1 – Vài ngày' },
  { value: 2, label: '2 – Hơn nửa số ngày' },
  { value: 3, label: '3 – Gần như mỗi ngày' },
];
const PHQ9_FIELDS: CrudFieldCfg[] = [
  { key: 'patientId', label: 'Mã bệnh nhân' },
  ...PHQ9_QUESTIONS.map((q, i) => ({
    key: `q${i + 1}`,
    label: `${i + 1}. ${q}`,
    type: 'select' as const,
    options: PHQ9_SCORE_OPTIONS,
  })),
];

const PER = 20;

const MentalHealthV2: React.FC = () => {
  const [rows, setRows] = useState<MentalHealthCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(0);
  const [statsData, setStatsData] = useState<MentalHealthStats | null>(null);

  const [sel, setSel] = useState<MentalHealthCase | null>(null);
  const [assessments, setAssessments] = useState<MentalHealthAssessment[]>([]);
  const [aLoading, setALoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [phqOpen, setPhqOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, s] = await Promise.all([
        searchCases({
          keyword: search || undefined,
          caseType: fType || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        }),
        getStats(),
      ]);
      setRows(Array.isArray(data) ? data : []);
      setStatsData(s);
    } catch { ti('Không tải được danh sách ca tâm thần'); }
    finally { setLoading(false); }
  }, [search, fType, fromDate, toDate]);
  useEffect(() => { load(); }, [load]);

  const openDetail = async (r: MentalHealthCase) => {
    setSel(r);
    setAssessments([]);
    setALoading(true);
    try { setAssessments(await getAssessments(r.id)); }
    catch (e) { tw(friendlyErrorMessage(e, 'Không tải được lịch sử đánh giá của ca bệnh.')); setAssessments([]); }
    finally { setALoading(false); }
  };

  const counts = useTabCounts(rows, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      return true;
    });
  }, [rows, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const columns: ColumnDef<MentalHealthCase>[] = [
    { key: 'code', label: 'Mã ca', mono: true, width: 130, render: (r) => r.caseCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div>
    ) },
    { key: 'type', label: 'Loại bệnh', width: 180,
      render: (r) => <span className="chip info">{TYPE_LABEL[r.caseType] || r.caseType}</span> },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis },
    { key: 'severity', label: 'Mức độ', width: 90,
      render: (r) => <span className={`chip ${SEVERITY_TONE[r.severity] || 'info'}`}>{SEVERITY_LABEL[r.severity] || r.severity}</span> },
    { key: 'adherence', label: 'Tuân thủ', width: 100,
      render: (r) => <span className={`chip ${r.adherenceLevel === 'good' ? 'ok' : r.adherenceLevel === 'moderate' ? 'warn' : 'crit'}`}>{ADHERENCE_LABEL[r.adherenceLevel] || r.adherenceLevel}</span> },
    { key: 'doctor', label: 'BS Tâm thần', width: 180, render: (r) => r.psychiatristName || '—' },
    { key: 'next', label: 'Hẹn tiếp', mono: true, width: 100, render: (r) => {
      if (!r.nextFollowUpDate) return '—';
      const overdue = dayjs(r.nextFollowUpDate).isBefore(dayjs(), 'day');
      return <span style={{ color: overdue ? 'var(--a-red)' : undefined }}>{fmtDMY(r.nextFollowUpDate)}</span>;
    } },
    { key: 'status', label: 'TT', width: 130, render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === statusKey(r.status));
      return <StatusBadge tone={t?.tone} dot>{t?.l}</StatusBadge>;
    } },
  ];

  const rowActions = (r: MentalHealthCase) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem chi tiết" onClick={() => openDetail(r)} />
    </div>
  );

  const severe = statsData?.severeCases ?? rows.filter((r) => r.severity === 'severe').length;
  const poor = rows.filter((r) => r.adherenceLevel === 'poor').length;

  const SEL: React.CSSProperties = {
    height: 28, padding: '0 6px', borderRadius: 4, border: '1px solid var(--line)',
    background: 'var(--bg-1)', fontSize: 13,
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng ca',      val: rows.length,                                               sub: 'tất cả' },
        { lbl: 'Đang ĐT',      val: statsData?.activeCases ?? (counts.active || 0),             tone: 'warn' },
        { lbl: 'Nặng',         val: severe,                                                    sub: 'cần ưu tiên', tone: 'crit' },
        { lbl: 'Quá hạn tái khám', val: statsData?.overdueFollowUps ?? 0,                      sub: 'cần liên hệ', tone: 'crit' },
        { lbl: 'ĐG tháng này', val: statsData?.assessmentsThisMonth ?? 0,                      tone: 'ok' },
        { lbl: 'Ổn định',      val: counts.stable || 0,                                        tone: 'ok' },
      ]} />

      <div className="ab-toolbar">
        <SearchBox
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ca / chẩn đoán…"
        />
        <Filter value={fType} onChange={(v) => { setFType(v); setPage(0); }} options={CASE_TYPE_OPTIONS.map((o) => ({ v: String(o.value), l: o.label }))} placeholder="▾ Loại bệnh" />
        <input type="date" style={SEL} value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }} title="Từ ngày" />
        <input type="date" style={SEL} value={toDate}   onChange={(e) => { setToDate(e.target.value);   setPage(0); }} title="Đến ngày" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setFromDate(''); setToDate(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => setPhqOpen(true)}>
          <Ico name="activity" size={12} /> Sàng lọc PHQ-9
        </Btn>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Tạo hồ sơ
        </Btn>
        <Btn variant="ghost" onClick={load} loading={loading} icon="refresh">Làm mới</Btn>
      </div>

      <StatusTabs<StatusKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<MentalHealthCase>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        loading={loading}
        onRowClick={openDetail}
        actions={rowActions}
        empty="Không có ca tâm thần"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.caseCode || ''}
        sub={sel ? `${sel.patientName} · ${TYPE_LABEL[sel.caseType] || sel.caseType}` : ''}
        footer={<Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>}
      >
        {sel && (
          <>
            <DrSec title="Bệnh nhân">
              <DrField lbl="Họ tên"><b>{sel.patientName}</b></DrField>
              <DrField lbl="Mã BN"><span className="mono">{sel.patientCode}</span></DrField>
              <DrField lbl="Mã ca">
                <span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.caseCode}</span>
              </DrField>
            </DrSec>

            <DrSec title="Chẩn đoán & điều trị">
              <DrField lbl="Loại bệnh"><b>{TYPE_LABEL[sel.caseType] || sel.caseType}</b></DrField>
              <DrField lbl="Chẩn đoán">{sel.diagnosis}</DrField>
              <DrField lbl="Mức độ">
                <span className={`chip ${SEVERITY_TONE[sel.severity] || 'info'}`}>
                  {SEVERITY_LABEL[sel.severity] || sel.severity}
                </span>
              </DrField>
              <DrField lbl="BS Tâm thần">{sel.psychiatristName || '—'}</DrField>
              <DrField lbl="Bắt đầu">{fmtDMY(sel.startDate)}</DrField>
              <DrField lbl="ĐG gần nhất">{fmtDMY(sel.lastAssessmentDate)}</DrField>
              <DrField lbl="Hẹn tái khám">{fmtDMY(sel.nextFollowUpDate)}</DrField>
              <DrField lbl="Tuân thủ">
                <span className={`chip ${sel.adherenceLevel === 'good' ? 'ok' : sel.adherenceLevel === 'moderate' ? 'warn' : 'crit'}`}>
                  {ADHERENCE_LABEL[sel.adherenceLevel] || sel.adherenceLevel}
                </span>
              </DrField>
            </DrSec>

            {sel.medications && (
              <DrSec title="Thuốc điều trị">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.medications}</div>
              </DrSec>
            )}
            {sel.notes && (
              <DrSec title="Ghi chú">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{sel.notes}</div>
              </DrSec>
            )}

            <DrSec title={`Lịch sử đánh giá${assessments.length ? ` (${assessments.length})` : ''}`}>
              {aLoading ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Đang tải…</div>
              ) : assessments.length === 0 ? (
                <div style={{ color: 'var(--t-2)', padding: '8px 0', fontSize: 13 }}>Chưa có đánh giá</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {assessments.map((a) => (
                    <div key={a.id} style={{ background: 'var(--bg-1)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4, alignItems: 'center' }}>
                        <span className="chip info">{a.assessmentType}</span>
                        <span className="mono" style={{ color: 'var(--t-2)', fontSize: 12 }}>{fmtDMY(a.assessmentDate)}</span>
                        <span style={{ fontWeight: 600, color: 'var(--t-0)' }}>Điểm: {a.totalScore}</span>
                        {a.assessmentType === 'PHQ9' && (
                          <span style={{
                            color: a.totalScore >= 15 ? 'var(--a-red)' : a.totalScore >= 10 ? 'var(--a-amber)' : 'var(--a-green)',
                            fontSize: 12,
                          }}>
                            {a.totalScore >= 15 ? '(Nặng)' : a.totalScore >= 10 ? '(Trung bình)' : '(Nhẹ)'}
                          </span>
                        )}
                        <span style={{ color: 'var(--t-2)', fontSize: 12, marginLeft: 'auto' }}>{a.assessorName}</span>
                      </div>
                      {a.interpretation && <div style={{ color: 'var(--t-1)' }}>{a.interpretation}</div>}
                      {a.findings && <div style={{ color: 'var(--t-2)', fontSize: 12, marginTop: 2 }}>Phát hiện: {a.findings}</div>}
                      {a.recommendations && <div style={{ color: 'var(--t-2)', fontSize: 12 }}>Khuyến nghị: {a.recommendations}</div>}
                    </div>
                  ))}
                </div>
              )}
            </DrSec>
          </>
        )}
      </DrawerShell>

      <CrudModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo hồ sơ tâm thần"
        fields={CREATE_FIELDS}
        initial={{ severity: 'moderate' }}
        onSubmit={async (v) => {
          await createCase(v as Parameters<typeof createCase>[0]);
          tk('Đã tạo hồ sơ tâm thần');
          load();
        }}
      />

      <CrudModal
        open={phqOpen}
        onClose={() => setPhqOpen(false)}
        title="Sàng lọc trầm cảm PHQ-9"
        fields={PHQ9_FIELDS}
        initial={{ patientId: '', q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 }}
        size="lg"
        onSubmit={async (v) => {
          const answers = PHQ9_QUESTIONS.map((_, i) => Number(v[`q${i + 1}`] ?? 0));
          await screenDepression({ patientId: String(v.patientId || ''), answers });
          tk('Đã hoàn thành sàng lọc PHQ-9');
        }}
      />
    </div>
  );
};

export default MentalHealthV2;
