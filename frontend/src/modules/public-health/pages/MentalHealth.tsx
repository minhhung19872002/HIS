import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTabState } from '../../../hooks/useTabState';
import dayjs from 'dayjs';
import {
  searchCases, createCase, updateCase, addAssessment, getAssessments, screenDepression, getStats,
} from '../api/mentalHealth';
import { apiClient } from '../../../services/apiClient';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import type { MentalHealthCase, MentalHealthAssessment, MentalHealthStats } from '../api/mentalHealth';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, useTabCounts, tk, ti, tw, Ico,
  type ColumnDef, type StatusTab, type CrudFieldCfg,
} from '@/_v2kit';
import { friendlyErrorMessage } from '@/utils/friendlyError';
import { RefreshButton } from '../../../components/actions';

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

// Bệnh nhân = BN có trong HIS (ô chọn ghép trong component) — trước đây nhập tay họ tên, ca lưu PatientId rỗng.
const CREATE_FIELDS_REST: CrudFieldCfg[] = [
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
const PHQ9_QUESTION_FIELDS: CrudFieldCfg[] = [
  ...PHQ9_QUESTIONS.map((q, i) => ({
    key: `q${i + 1}`,
    label: `${i + 1}. ${q}`,
    type: 'select' as const,
    options: PHQ9_SCORE_OPTIONS,
  })),
];

const PER = 20;

// Cập nhật ca (PUT /mental-health/cases/{id}) — trạng thái / tuân thủ / hẹn tái khám trước đây không sửa được
const UPDATE_FIELDS: CrudFieldCfg[] = [
  { key: 'status', label: 'Trạng thái', type: 'select', required: true, options: [
    { value: 0, label: 'Đang điều trị' }, { value: 1, label: 'Ổn định' },
    { value: 2, label: 'Thuyên giảm' }, { value: 3, label: 'Đã xuất viện' },
  ] },
  { key: 'severity', label: 'Mức độ', type: 'select', options: [
    { value: 'mild', label: 'Nhẹ' }, { value: 'moderate', label: 'Trung bình' }, { value: 'severe', label: 'Nặng' },
  ] },
  { key: 'adherenceLevel', label: 'Tuân thủ điều trị', type: 'select', options: [
    { value: 'good', label: 'Tốt' }, { value: 'moderate', label: 'Trung bình' }, { value: 'poor', label: 'Kém' },
  ] },
  { key: 'nextFollowUpDate', label: 'Hẹn tái khám', type: 'date' },
  { key: 'psychiatristName', label: 'BS tâm thần' },
  { key: 'medications', label: 'Thuốc điều trị', type: 'textarea' },
  { key: 'notes', label: 'Ghi chú', type: 'textarea' },
];
const ASSESS_FIELDS: CrudFieldCfg[] = [
  { key: 'assessmentType', label: 'Thang đánh giá', type: 'select', required: true, options: [
    { value: 'PHQ9', label: 'PHQ-9' }, { value: 'GAD7', label: 'GAD-7' }, { value: 'PANSS', label: 'PANSS' },
    { value: 'HAM-D', label: 'HAM-D' }, { value: 'YMRS', label: 'YMRS' }, { value: 'general', label: 'Khám chung' },
  ] },
  { key: 'assessmentDate', label: 'Ngày đánh giá', type: 'date', required: true },
  { key: 'totalScore', label: 'Tổng điểm', type: 'number', required: true },
  { key: 'interpretation', label: 'Diễn giải' },
  { key: 'findings', label: 'Phát hiện', type: 'textarea' },
  { key: 'recommendations', label: 'Khuyến nghị', type: 'textarea' },
  { key: 'assessorName', label: 'Người đánh giá' },
];

const MentalHealthV2: React.FC = () => {
  const [rows, setRows] = useState<MentalHealthCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useTabState<StatusKey | 'all'>('all');
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
  const [editCase, setEditCase] = useState<MentalHealthCase | null>(null);
  const [assessOpen, setAssessOpen] = useState(false);

  const [patientOpts, setPatientOpts] = useState<Array<{ id: string; patientCode: string; fullName: string }>>([]);
  const searchPatients = useCallback((kw: string) => {
    if (!kw || kw.trim().length < 2) return;
    apiClient.post<unknown>('/patients/search', { keyword: kw.trim(), page: 1, pageSize: 20 })
      .then((r) => setPatientOpts(normalizeArrayResponse<{ id: string; patientCode: string; fullName: string }>(r.data)))
      .catch(() => { /* đang gõ dở — không toast */ });
  }, []);
  const createFields = useMemo<CrudFieldCfg[]>(() => [
    { key: 'patientId', label: 'Bệnh nhân', type: 'autocomplete', required: true,
      options: patientOpts.map((p) => ({ value: p.id, label: `${p.patientCode} — ${p.fullName}` })),
      onSearch: searchPatients, debounce: 300, placeholder: 'Gõ mã BN hoặc họ tên (≥ 2 ký tự)…',
        // QA-R11: the autocomplete also accepts free text → BE 400 INVALID_REFERENCE. Only a picked patient id passes.
        rules: [{ required: true, message: 'Chọn bệnh nhân từ danh sách' }, {
          validator: (_: unknown, v: unknown) => (!v || patientOpts.some((p) => p.id === v)
            ? Promise.resolve() : Promise.reject(new Error('Chọn bệnh nhân từ danh sách'))),
        }], },
    ...CREATE_FIELDS_REST,
  ], [patientOpts, searchPatients]);

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
      // BE MentalHealthCaseDto: diagnosisName+diagnosisCode / treatingDoctor / nextVisitDate / lastVisitDate / medicationRegimen
      type BeCase = MentalHealthCase & { diagnosisName?: string; diagnosisCode?: string; treatingDoctor?: string; nextVisitDate?: string; lastVisitDate?: string; medicationRegimen?: string };
      setRows((Array.isArray(data) ? data as BeCase[] : []).map((x) => ({
        ...x,
        diagnosis: x.diagnosis ?? ([x.diagnosisCode, x.diagnosisName].filter(Boolean).join(' - ') || ''),
        psychiatristName: x.psychiatristName ?? x.treatingDoctor ?? '',
        nextFollowUpDate: x.nextFollowUpDate ?? x.nextVisitDate,
        lastAssessmentDate: x.lastAssessmentDate ?? x.lastVisitDate,
        medications: x.medications ?? x.medicationRegimen,
      })));
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
  // PHQ-9: chọn ca đang quản lý để lưu kết quả thành 1 lần đánh giá (trước đây chỉ tính điểm, không lưu)
  const phqFields = useMemo<CrudFieldCfg[]>(() => [
    { key: 'caseId', label: 'Ca bệnh (lưu kết quả vào hồ sơ — bỏ trống = chỉ tính điểm)', type: 'select',
      options: rows.filter((r) => r.status !== 3).map((r) => ({ value: r.id, label: `${r.caseCode} — ${r.patientName}` })) },
    ...PHQ9_QUESTION_FIELDS,
  ], [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      return true;
    });
  }, [rows, stab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));

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
      <ActBtn ic="edit" title="Cập nhật ca" onClick={() => setEditCase(r)} />
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
        <RefreshButton onRefresh={async () => { await load(); }} />
      </div>

      <StatusTabs<StatusKey>
        value={stab}
        onChange={(v) => { setStab(v); setPage(0); }}
        tabs={STATUS_TABS}
        counts={counts}
      />

      <DataTable<MentalHealthCase>
        columns={columns}
        data={filtered}
        page={page}
        perPage={PER}
        onSortChange={() => setPage(0)}
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
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn variant="ghost" onClick={() => sel && setEditCase(sel)}><Ico name="edit" size={12} /> Cập nhật ca</Btn>
          <Btn variant="primary" onClick={() => setAssessOpen(true)}><Ico name="plus" size={12} /> Thêm đánh giá</Btn>
        </>}
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
        fields={createFields}
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
        fields={phqFields}
        initial={{ q1: 0, q2: 0, q3: 0, q4: 0, q5: 0, q6: 0, q7: 0, q8: 0, q9: 0 }}
        size="lg"
        onSubmit={async (v) => {
          const answers = PHQ9_QUESTIONS.map((_, i) => Number(v[`q${i + 1}`] ?? 0));
          // BE is a stateless scorer (nothing is saved) — the old toast "done" hid the result entirely.
          const res = await screenDepression({ patientId: String(v.caseId || ''), answers }) as
            { score?: number; interpretation?: string; recommendation?: string } | undefined;
          const total = answers.reduce((s, x) => s + x, 0);
          const caseId = v.caseId ? String(v.caseId) : '';
          if (caseId) {
            await addAssessment(caseId, {
              assessmentType: 'PHQ9', totalScore: res?.score ?? total,
              interpretation: res?.interpretation ?? '', recommendations: res?.recommendation ?? '',
              findings: answers[8] > 0 ? 'Câu 9 dương tính (ý nghĩ tự hại)' : '',
            });
            if (sel && sel.id === caseId) { try { setAssessments(await getAssessments(caseId)); } catch { /* giữ cũ */ } }
            load();
          }
          // PHQ-9 item 9 (self-harm thoughts) > 0 needs a suicide-risk assessment regardless of the total score.
          if (answers[8] > 0) {
            tw(`PHQ-9 = ${res?.score ?? total}: câu 9 dương tính — ĐÁNH GIÁ NGUY CƠ TỰ SÁT NGAY`);
          }
          tk(`PHQ-9 = ${res?.score ?? total} · ${res?.interpretation ?? ''}${res?.recommendation ? ` · ${res.recommendation}` : ''}${caseId ? ' — đã lưu vào hồ sơ' : ' (chưa chọn ca — không lưu)'}`);
        }}
      />

      {/* Cập nhật ca */}
      <CrudModal
        open={!!editCase}
        onClose={() => setEditCase(null)}
        title="Cập nhật ca tâm thần"
        sub={editCase ? `${editCase.caseCode} · ${editCase.patientName}` : undefined}
        fields={UPDATE_FIELDS}
        initial={editCase ? {
          id: editCase.id, status: editCase.status, severity: editCase.severity,
          adherenceLevel: editCase.adherenceLevel || undefined, nextFollowUpDate: editCase.nextFollowUpDate,
          psychiatristName: editCase.psychiatristName, medications: editCase.medications, notes: editCase.notes,
        } : null}
        onSubmit={async (v) => {
          if (!editCase) return;
          await updateCase(editCase.id, {
            status: v.status != null ? Number(v.status) : undefined,
            severity: v.severity, adherenceLevel: v.adherenceLevel,
            nextFollowUpDate: v.nextFollowUpDate, psychiatristName: v.psychiatristName,
            medications: v.medications, notes: v.notes,
          } as Partial<MentalHealthCase>);
          tk('Đã cập nhật ca');
          if (sel && sel.id === editCase.id) setSel(null);
          setEditCase(null);
          load();
        }}
      />

      {/* Thêm đánh giá */}
      <CrudModal
        open={assessOpen}
        onClose={() => setAssessOpen(false)}
        title="Thêm đánh giá tâm thần"
        sub={sel ? `${sel.caseCode} · ${sel.patientName}` : undefined}
        fields={ASSESS_FIELDS}
        initial={{ assessmentType: 'general', assessmentDate: dayjs().format('YYYY-MM-DD') }}
        onSubmit={async (v) => {
          if (!sel) return;
          await addAssessment(sel.id, { ...v, totalScore: Number(v.totalScore ?? 0) } as Partial<MentalHealthAssessment>);
          tk('Đã lưu đánh giá');
          try { setAssessments(await getAssessments(sel.id)); } catch { /* giữ cũ */ }
          load();
        }}
      />
    </div>
  );
};

export default MentalHealthV2;
