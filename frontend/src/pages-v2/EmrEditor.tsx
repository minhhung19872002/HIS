/* =====================================================================
 * EmrEditor v2 — full-screen hồ sơ bệnh án (native v2, ab-* design)
 * Ported from design-system bundle mod-emr-editor-v2.jsx.
 * 2-col: HSBA list (trái) · detail w/ 7 tabs (phải).
 * Mostly a viewer wired to real read APIs (examinationApi): getEmrRecords,
 * getPatientMedicalHistory, getMedicalRecordFull, getTreatmentSheets,
 * getConsultationRecords, getNursingCareSheets, getPatientAllergies.
 * No backend change. Replaces the v1 navigate('/emr') jump.
 * ===================================================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KpiStrip, StatusBadge, ActBtn, DataTable, TopTabs, DrawerShell, ModalShell,
  fmtDMYg, fmtDTg, tk, ti, te, tw, type ColumnDef, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import {
  getEmrRecords, type EmrRecordDto,
  getPatientMedicalHistory, type MedicalHistoryDto,
  getMedicalRecordFull, type MedicalRecordFullDto,
  getTreatmentSheets, createTreatmentSheet, type TreatmentSheetDto,
  getConsultationRecords, createConsultationRecord, type ConsultationRecordDto,
  getNursingCareSheets, createNursingCareSheet, type NursingCareSheetDto,
} from '../api/examination';
import '../layouts/terminal/ed-responsive.css';

type TabKey = 'record' | 'history' | 'treatment' | 'consult' | 'nursing' | 'reaction' | 'partograph';
const TABS: TopTab<TabKey>[] = [
  { v: 'record', l: 'Hồ sơ BA', ic: 'folder' },
  { v: 'history', l: 'Lịch sử khám', ic: 'clock' },
  { v: 'treatment', l: 'Phiếu điều trị', ic: 'pill' },
  { v: 'consult', l: 'Hội chẩn', ic: 'user' },
  { v: 'nursing', l: 'Chăm sóc ĐD', ic: 'heart' },
  { v: 'reaction', l: 'Phản ứng thuốc', ic: 'alert' },
  { v: 'partograph', l: 'Biểu đồ chuyển dạ', ic: 'activity' },
];

const PRINT_FORMS = [
  'MS-01 · Tóm tắt bệnh án ra viện',
  'MS-02 · Bệnh án tổng quát',
  'MS-03 · Phiếu điều trị',
  'MS-04 · Phiếu chăm sóc ĐD',
  'DD-01 · Phiếu công khai DV-Thuốc',
  'BHYT-01 · Tổng hợp thanh toán',
];

const EmrEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [leftOpen, setLeftOpen] = useState(false);

  const [records, setRecords] = useState<EmrRecordDto[]>([]);
  const [search, setSearch] = useState('');
  const [sel, setSel] = useState<EmrRecordDto | null>(null);
  const [tab, setTab] = useState<TabKey>('record');

  const [examId, setExamId] = useState<string | null>(null);
  const [full, setFull] = useState<MedicalRecordFullDto | null>(null);
  const [timeline, setTimeline] = useState<MedicalHistoryDto[]>([]);
  const [treatments, setTreatments] = useState<TreatmentSheetDto[]>([]);
  const [consults, setConsults] = useState<ConsultationRecordDto[]>([]);
  const [nursing, setNursing] = useState<NursingCareSheetDto[]>([]);

  const [printOpen, setPrintOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [modal, setModal] = useState<null | 'treatment' | 'consult' | 'nursing'>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [savingForm, setSavingForm] = useState(false);

  const openCreate = (kind: 'treatment' | 'consult' | 'nursing') => {
    if (!examId) { tw('Chưa có lần khám để thêm phiếu'); return; }
    setForm({ date: new Date().toISOString().slice(0, 10) });
    setModal(kind);
  };
  const fld = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // ── Load EMR list ────────────────────────────────────────────────
  const loadList = useCallback(async (kw?: string) => {
    try {
      const r = await getEmrRecords(kw || undefined, 1, 300);
      setRecords(Array.isArray(r.data) ? r.data : []);
    } catch { setRecords([]); }
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  // ── Select patient → derive latest exam + load detail ───────────
  const selectRecord = useCallback(async (rec: EmrRecordDto) => {
    setSel(rec);
    setLeftOpen(false);
    setTab('record');
    setFull(null); setExamId(null); setTreatments([]); setConsults([]); setNursing([]);
    let hist: MedicalHistoryDto[] = [];
    try {
      const h = await getPatientMedicalHistory(rec.patientId, 30);
      hist = Array.isArray(h.data) ? h.data : [];
    } catch { /* no history */ }
    setTimeline(hist);
    const id = hist[0]?.examinationId ?? null;
    setExamId(id);
    if (!id) return;
    const [f, t, c, n] = await Promise.allSettled([
      getMedicalRecordFull(id),
      getTreatmentSheets(id),
      getConsultationRecords(id),
      getNursingCareSheets(id),
    ]);
    if (f.status === 'fulfilled' && f.value.data) setFull(f.value.data);
    if (t.status === 'fulfilled' && Array.isArray(t.value.data)) setTreatments(t.value.data);
    if (c.status === 'fulfilled' && Array.isArray(c.value.data)) setConsults(c.value.data);
    if (n.status === 'fulfilled' && Array.isArray(n.value.data)) setNursing(n.value.data);
  }, []);

  const today = () => new Date().toISOString().slice(0, 10);
  const saveSheet = async () => {
    if (!examId) return;
    setSavingForm(true);
    try {
      if (modal === 'treatment') {
        await createTreatmentSheet({
          id: '', examinationId: examId, treatmentDate: form.date || today(),
          dayNumber: Number(form.dayNumber) || 1, dailyProgress: form.dailyProgress,
          treatmentOrders: form.treatmentOrders, doctorNotes: form.doctorNotes,
          medications: [], doctorId: '',
        });
        const r = await getTreatmentSheets(examId); setTreatments(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'consult') {
        await createConsultationRecord({
          id: '', examinationId: examId, consultationDate: form.date || today(),
          reason: form.reason || '', summary: form.summary || '', conclusion: form.conclusion || '',
          recommendations: form.recommendations || '', consultants: [],
          chairman: form.chairman, secretary: form.secretary,
        });
        const r = await getConsultationRecords(examId); setConsults(Array.isArray(r.data) ? r.data : []);
      } else if (modal === 'nursing') {
        await createNursingCareSheet({
          id: '', examinationId: examId, careDate: form.date || today(),
          shift: Number(form.shift) || 1, patientCondition: form.patientCondition,
          nursingAssessment: form.nursingAssessment, nursingInterventions: form.nursingInterventions,
          patientResponse: form.patientResponse, nurseId: '',
        });
        const r = await getNursingCareSheets(examId); setNursing(Array.isArray(r.data) ? r.data : []);
      }
      tk('Đã tạo phiếu'); setModal(null);
    } catch { te('Tạo phiếu thất bại'); }
    finally { setSavingForm(false); }
  };

  const filtered = records.filter((r) =>
    !search || `${r.patientCode} ${r.patientName} ${r.lastDiagnosisName || ''}`.toLowerCase().includes(search.toLowerCase()));

  const activeCount = records.filter((r) => (r.allergies?.length ?? 0) > 0).length;

  // ── Tab renderers ────────────────────────────────────────────────
  const treatCols: ColumnDef<TreatmentSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 110, render: (r) => fmtDMYg(r.treatmentDate) },
    { key: 'day', label: 'Ngày thứ', mono: true, width: 80, render: (r) => r.dayNumber },
    { key: 'orders', label: 'Y lệnh / diễn biến', render: (r) => <span style={{ fontSize: 12 }}>{r.treatmentOrders || r.dailyProgress || '—'}</span> },
    { key: 'doctor', label: 'BS điều trị', width: 140, render: (r) => r.doctorName || '—' },
  ];
  const consultCols: ColumnDef<ConsultationRecordDto>[] = [
    { key: 'date', label: 'Thời gian', mono: true, width: 150, render: (r) => fmtDTg(r.consultationDate) },
    { key: 'reason', label: 'Lý do', render: (r) => r.reason },
    { key: 'conclusion', label: 'Kết luận', render: (r) => r.conclusion },
    { key: 'chairman', label: 'Chủ tọa', width: 140, render: (r) => r.chairman || '—' },
  ];
  const nursingCols: ColumnDef<NursingCareSheetDto>[] = [
    { key: 'date', label: 'Ngày', mono: true, width: 150, render: (r) => fmtDTg(r.careDate) },
    { key: 'shift', label: 'Ca', width: 70, render: (r) => (r.shift === 1 ? 'Sáng' : r.shift === 2 ? 'Chiều' : r.shift === 3 ? 'Tối' : `${r.shift}`) },
    { key: 'interv', label: 'Can thiệp chăm sóc', render: (r) => r.nursingInterventions || r.patientCondition || '—' },
    { key: 'nurse', label: 'ĐD phụ trách', width: 140, render: (r) => r.nurseName || '—' },
  ];

  const v = full?.vitalSigns;

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'HSBA đang chọn', val: sel?.patientName || '—', sub: sel?.patientCode || '' },
          { lbl: 'Khoa/Phòng', val: sel?.lastRoomName || '—' },
          { lbl: 'Số lần khám', val: sel?.visitCount ?? '—', tone: 'info' },
          { lbl: 'Tổng HSBA', val: records.length, sub: `${activeCount} có dị ứng` },
          { lbl: 'Phiếu điều trị', val: treatments.length, tone: 'ok' },
        ]} />
      </div>

      {/* List */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: 10, borderBottom: '1px solid var(--line)' }}>
          <div className="ab-search" style={{ width: '100%' }}>
            <TermIcon name="search" size={13} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm mã BN / tên / chẩn đoán…" />
          </div>
        </div>
        <div style={{ overflow: 'auto', flex: 1 }}>
          {filtered.length === 0 && <div style={{ padding: 16, color: 'var(--t-3)', fontSize: 11.5, textAlign: 'center' }}>Không có hồ sơ</div>}
          {filtered.map((r) => {
            const isSel = r.patientId === sel?.patientId;
            return (
              <div key={r.patientId} onClick={() => selectRecord(r)} style={{ padding: '10px 12px', borderBottom: '1px solid var(--line-soft)', background: isSel ? 'var(--c-pri-bg, rgba(37,99,235,.12))' : 'transparent', borderLeft: isSel ? '3px solid var(--c-pri, #2563eb)' : '3px solid transparent', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 700 }}>{r.patientCode}</span>
                  {r.visitCount > 0 && <StatusBadge tone="info">{r.visitCount} lần</StatusBadge>}
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginTop: 4 }}>{r.patientName}</div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>{r.lastRoomName || '—'} · {r.lastVisit ? fmtDMYg(r.lastVisit) : '—'}</div>
                {r.lastDiagnosisName && <div style={{ fontSize: 11, color: 'var(--t-1)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>{r.lastDiagnosisCode ? `${r.lastDiagnosisCode} · ` : ''}{r.lastDiagnosisName}</div>}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Detail */}
      <main style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {!sel ? (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--t-3)' }}>
            <div style={{ textAlign: 'center' }}>
              <TermIcon name="folder" size={32} />
              <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--t-2)' }}>Chọn HSBA ở bảng trái để xem</div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{sel.patientName}</div>
                <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{sel.patientCode} · {sel.lastRoomName || '—'} · {sel.lastVisit ? fmtDMYg(sel.lastVisit) : '—'}{full?.medicalRecordCode ? ` · ${full.medicalRecordCode}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="ab-btn ghost" onClick={() => ti('Xuất XML — dùng cổng liên thông (P2)')}><TermIcon name="download" size={12} /> XML</button>
                <button className="ab-btn ghost" onClick={() => ti('Xuất PDF (P2)')}><TermIcon name="download" size={12} /> PDF</button>
                <button className="ab-btn ghost" onClick={() => setPrintOpen(true)}><TermIcon name="print" size={12} /> In biểu mẫu</button>
                <button className="ab-btn primary" onClick={() => setSignOpen(true)}><TermIcon name="check" size={12} /> Ký số</button>
              </div>
            </div>

            <TopTabs tab={tab} setTab={setTab} tabs={TABS} />

            <div style={{ overflow: 'auto', flex: 1, padding: 16 }}>
              {tab === 'record' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Thông tin BN</h4>
                    <Field lbl="Họ tên">{full?.patient?.fullName || sel.patientName}</Field>
                    <Field lbl="Mã BN"><span className="mono">{sel.patientCode}</span></Field>
                    <Field lbl="Giới · Tuổi">{sel.gender === 1 ? 'Nam' : 'Nữ'}{sel.age != null ? ` · ${sel.age}T` : ''}</Field>
                    <Field lbl="Khoa/Phòng">{sel.lastRoomName || '—'}</Field>
                    <Field lbl="BHYT"><span className="mono">{sel.insuranceNumber || '—'}</span></Field>
                    {(sel.chronicDiseases?.length ?? 0) > 0 && <Field lbl="Bệnh mạn">{sel.chronicDiseases.join(', ')}</Field>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Sinh hiệu</h4>
                    {v ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 12 }}>
                        {[['Mạch', v.pulse, 'l/p'], ['Nhiệt', v.temperature, '°C'], ['HA', v.systolicBP && v.diastolicBP ? `${v.systolicBP}/${v.diastolicBP}` : undefined, ''], ['Nhịp thở', v.respiratoryRate, 'l/p'], ['SpO₂', v.spO2, '%'], ['Cân', v.weight, 'kg'], ['Cao', v.height, 'cm'], ['BMI', v.bmi, '']].map((x, i) => (
                          <div key={i} style={{ padding: 8, background: 'var(--d-1)', borderRadius: 4 }}>
                            <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{x[0] as string}</div>
                            <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{x[1] ?? '—'} <span style={{ fontSize: 10, color: 'var(--t-3)' }}>{x[2] as string}</span></div>
                          </div>
                        ))}
                      </div>
                    ) : <div style={{ color: 'var(--t-3)', fontSize: 12 }}>Chưa có dữ liệu sinh hiệu</div>}
                  </section>
                  <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 14, gridColumn: '1 / -1' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Bệnh sử · Khám lâm sàng · Chẩn đoán</h4>
                    <div style={{ fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {full?.interview?.historyOfPresentIllness && <p><b>Bệnh sử:</b> {full.interview.historyOfPresentIllness}</p>}
                      {full?.physicalExam?.generalAppearance && <p><b>Khám:</b> {full.physicalExam.generalAppearance}</p>}
                      {(full?.diagnoses?.length ?? 0) > 0 && <p><b>Chẩn đoán:</b> {full!.diagnoses.map((d) => `${d.icdCode} · ${d.icdName}${d.isPrimary ? ' (chính)' : ''}`).join('; ')}</p>}
                      {!full?.interview?.historyOfPresentIllness && !full?.physicalExam?.generalAppearance && (full?.diagnoses?.length ?? 0) === 0 && <span style={{ color: 'var(--t-3)' }}>Chưa có nội dung bệnh án</span>}
                    </div>
                  </section>
                </div>
              )}

              {tab === 'history' && (
                <div style={{ position: 'relative', paddingLeft: 30, maxWidth: 900 }}>
                  <div style={{ position: 'absolute', left: 9, top: 6, bottom: 6, width: 2, background: 'var(--line)' }} />
                  {timeline.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 12 }}>Chưa có lịch sử khám</div>}
                  {timeline.map((e, i) => (
                    <div key={i} style={{ position: 'relative', paddingBottom: 18 }}>
                      <div style={{ position: 'absolute', left: -25, top: 6, width: 12, height: 12, borderRadius: 6, background: '#0284c7', border: '2px solid var(--d-0)', boxShadow: '0 0 0 3px #0284c733' }} />
                      <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 6, padding: 12, borderLeft: '3px solid #0284c7', cursor: 'pointer' }}
                        onClick={() => navigate(`/v2/opd/edit`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 12.5 }}>{e.diagnosisName || e.conclusionTypeName || 'Lần khám'}</span>
                          <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{fmtDTg(e.examinationDate)}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{e.roomName || ''}{e.doctorName ? ` · ${e.doctorName}` : ''}{e.diagnosisCode ? ` · ${e.diagnosisCode}` : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'treatment' && (
                <div>
                  <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                    <button className="ab-btn primary" onClick={() => openCreate('treatment')}><TermIcon name="plus" size={12} /> Tạo phiếu điều trị</button>
                  </div>
                  <DataTable<TreatmentSheetDto> columns={treatCols} data={treatments} rowKey={(r) => r.id} empty="Chưa có phiếu điều trị" />
                </div>
              )}

              {tab === 'consult' && (
                <div>
                  <div style={{ marginBottom: 12 }}><button className="ab-btn primary" onClick={() => openCreate('consult')}><TermIcon name="plus" size={12} /> Đề xuất hội chẩn</button></div>
                  <DataTable<ConsultationRecordDto> columns={consultCols} data={consults} rowKey={(r) => r.id} empty="Chưa có biên bản hội chẩn" />
                </div>
              )}

              {tab === 'nursing' && (
                <div>
                  <div style={{ marginBottom: 12 }}><button className="ab-btn primary" onClick={() => openCreate('nursing')}><TermIcon name="plus" size={12} /> Phiếu chăm sóc</button></div>
                  <DataTable<NursingCareSheetDto> columns={nursingCols} data={nursing} rowKey={(r) => r.id} empty="Chưa có phiếu chăm sóc" />
                </div>
              )}

              {tab === 'reaction' && (
                <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 12 }}>Phản ứng thuốc / Dị ứng đã ghi nhận</h4>
                  {(full?.allergies?.length ?? 0) === 0
                    ? <div style={{ color: 'var(--t-3)', fontSize: 12 }}>Không có dị ứng ghi nhận</div>
                    : (
                      <div style={{ padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, color: '#7f1d1d', fontSize: 12, lineHeight: 1.8 }}>
                        {full!.allergies.map((a) => (
                          <div key={a.id}><b>{a.allergenName}</b>{a.reaction ? ` — ${a.reaction}` : ''} · Mức độ: {a.severity === 3 ? 'Nặng' : a.severity === 2 ? 'Vừa' : 'Nhẹ'}</div>
                        ))}
                      </div>
                    )}
                </div>
              )}

              {tab === 'partograph' && (
                <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 14 }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 12 }}>Biểu đồ chuyển dạ (Partograph)</h4>
                  <div style={{ height: 320, background: 'var(--d-1)', borderRadius: 6, display: 'grid', placeItems: 'center', color: 'var(--t-2)', fontSize: 12, textAlign: 'center', padding: 16 }}>
                    Biểu đồ partograph (độ mở CTC · ngôi · tim thai · cơn co) — chỉ áp dụng HSBA sản khoa.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* Responsive toggle (list only — 2-col) */}
      {leftOpen && <div className="ed-panel-backdrop" onClick={() => setLeftOpen(false)} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Danh sách HSBA">
          <TermIcon name="list" size={18} />
        </button>
      </div>

      {/* Print drawer */}
      <DrawerShell open={printOpen} onClose={() => setPrintOpen(false)} title="In biểu mẫu HSBA" size="md">
        <div style={{ padding: 14 }}>
          {PRINT_FORMS.map((m) => (
            <div key={m} style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 6, marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5 }}>{m}</span>
              <button className="ab-btn ghost sm" onClick={() => tk(`Đã gửi in: ${m.split(' · ')[0]}`)}><TermIcon name="print" size={11} /> In</button>
            </div>
          ))}
        </div>
      </DrawerShell>

      {/* Sign modal → real PKI signing via signing-workflow */}
      <ModalShell open={signOpen} onClose={() => setSignOpen(false)} title="Ký số hồ sơ bệnh án" sub="USB Token · VNPT-CA" size="sm"
        footer={<>
          <button className="ab-btn ghost" onClick={() => setSignOpen(false)}>Hủy</button>
          <button className="ab-btn primary" onClick={() => { setSignOpen(false); navigate('/v2/signing-workflow'); }}><TermIcon name="check" size={12} /> Tới luồng ký số</button>
        </>}>
        <div style={{ padding: 18, fontSize: 12.5, color: 'var(--t-1)' }}>
          Ký số HSBA <b>{sel?.patientName}</b> ({sel?.patientCode}) — {treatments.length} phiếu điều trị, {consults.length} hội chẩn.
          <div style={{ marginTop: 10, fontSize: 11.5, color: 'var(--t-2)' }}>Ký PKI đầy đủ (USB Token / HSM) thực hiện ở Luồng ký số tập trung.</div>
        </div>
      </ModalShell>

      {/* Create sheet modal (treatment / consult / nursing) */}
      <ModalShell open={modal !== null} onClose={() => setModal(null)}
        title={modal === 'treatment' ? 'Tạo phiếu điều trị' : modal === 'consult' ? 'Đề xuất hội chẩn' : 'Tạo phiếu chăm sóc'}
        sub={sel?.patientName} size="md"
        footer={<>
          <button className="ab-btn ghost" onClick={() => setModal(null)}>Hủy</button>
          <button className="ab-btn primary" disabled={savingForm} onClick={saveSheet}><TermIcon name="check" size={12} /> Lưu</button>
        </>}>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <FormField lbl="Ngày"><input type="date" className="ed-fld" value={form.date || ''} onChange={(e) => fld('date', e.target.value)} /></FormField>
            {modal === 'treatment' && <FormField lbl="Ngày thứ"><input type="number" className="ed-fld" value={form.dayNumber || ''} onChange={(e) => fld('dayNumber', e.target.value)} /></FormField>}
            {modal === 'nursing' && (
              <FormField lbl="Ca"><select className="ed-fld" value={form.shift || '1'} onChange={(e) => fld('shift', e.target.value)}><option value="1">Sáng</option><option value="2">Chiều</option><option value="3">Tối</option></select></FormField>
            )}
          </div>
          {modal === 'treatment' && <>
            <FormField lbl="Diễn biến"><textarea className="ed-fld" rows={3} value={form.dailyProgress || ''} onChange={(e) => fld('dailyProgress', e.target.value)} /></FormField>
            <FormField lbl="Y lệnh"><textarea className="ed-fld" rows={3} value={form.treatmentOrders || ''} onChange={(e) => fld('treatmentOrders', e.target.value)} /></FormField>
            <FormField lbl="Ghi chú BS"><textarea className="ed-fld" rows={2} value={form.doctorNotes || ''} onChange={(e) => fld('doctorNotes', e.target.value)} /></FormField>
          </>}
          {modal === 'consult' && <>
            <FormField lbl="Lý do"><input className="ed-fld" value={form.reason || ''} onChange={(e) => fld('reason', e.target.value)} /></FormField>
            <FormField lbl="Tóm tắt"><textarea className="ed-fld" rows={2} value={form.summary || ''} onChange={(e) => fld('summary', e.target.value)} /></FormField>
            <FormField lbl="Kết luận"><textarea className="ed-fld" rows={2} value={form.conclusion || ''} onChange={(e) => fld('conclusion', e.target.value)} /></FormField>
            <FormField lbl="Khuyến nghị"><textarea className="ed-fld" rows={2} value={form.recommendations || ''} onChange={(e) => fld('recommendations', e.target.value)} /></FormField>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <FormField lbl="Chủ tọa"><input className="ed-fld" value={form.chairman || ''} onChange={(e) => fld('chairman', e.target.value)} /></FormField>
              <FormField lbl="Thư ký"><input className="ed-fld" value={form.secretary || ''} onChange={(e) => fld('secretary', e.target.value)} /></FormField>
            </div>
          </>}
          {modal === 'nursing' && <>
            <FormField lbl="Tình trạng BN"><textarea className="ed-fld" rows={2} value={form.patientCondition || ''} onChange={(e) => fld('patientCondition', e.target.value)} /></FormField>
            <FormField lbl="Nhận định ĐD"><textarea className="ed-fld" rows={2} value={form.nursingAssessment || ''} onChange={(e) => fld('nursingAssessment', e.target.value)} /></FormField>
            <FormField lbl="Can thiệp"><textarea className="ed-fld" rows={2} value={form.nursingInterventions || ''} onChange={(e) => fld('nursingInterventions', e.target.value)} /></FormField>
            <FormField lbl="Đáp ứng"><textarea className="ed-fld" rows={2} value={form.patientResponse || ''} onChange={(e) => fld('patientResponse', e.target.value)} /></FormField>
          </>}
        </div>
      </ModalShell>
    </div>
  );
};

const Field: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10, padding: '4px 0', fontSize: 12.5 }}>
    <div style={{ color: 'var(--t-2)' }}>{lbl}</div>
    <div style={{ color: 'var(--t-0)' }}>{children}</div>
  </div>
);

const FormField: React.FC<{ lbl: string; children: React.ReactNode }> = ({ lbl, children }) => (
  <label style={{ display: 'block', fontSize: 11.5 }}>
    <span style={{ display: 'block', color: 'var(--t-2)', marginBottom: 3 }}>{lbl}</span>
    {children}
  </label>
);

export default EmrEditorV2;
