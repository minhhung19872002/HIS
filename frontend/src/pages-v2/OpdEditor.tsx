/* =====================================================================
 * OpdEditor v2 — full-screen khám ngoại trú (native v2, ab-* design)
 * Ported from design-system bundle mod-opd-editor-v2.jsx.
 * 3-col: Queue (trái) · Vitals/Bệnh sử/Khám/CĐ/CLS (giữa) · Kết luận/Actions (phải)
 * Real API (examinationApi): getActiveExaminationRooms, getRoomPatientList,
 * getVitalSigns/updateVitalSigns, getMedicalInterview/updateMedicalInterview,
 * getPhysicalExamination/updatePhysicalExamination, getDiagnoses/
 * updateDiagnosisList, searchIcdCodes, searchServices, getServiceOrders/
 * createServiceOrders, completeExamination. No backend change.
 * ===================================================================== */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { KpiStrip, StatusBadge, ActBtn, Btn, ModalShell, fmtVNDg, tk, tw, te, ti } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import BarcodeScanner from '../components/BarcodeScanner';
import {
  examinationApi, createSickLeave,
  type RoomDto, type RoomPatientListDto, type IcdCodeFullDto, type ServiceDto,
  type ServiceOrderFullDto, type DiagnosisFullDto,
} from '../api/examination';
import {
  addFollowUpSpecialty,
  changeRoomBeforeExam,
  getCompletionStatus,
  printBill,
  cancelPrintBill,
  cancelCompletion,
  deleteRegistration,
  type ExamCompletionStatus,
} from '../api/multiSpecialtyExam';
import '../layouts/terminal/ed-responsive.css';

interface Vitals { pulse?: number; temperature?: number; systolicBP?: number; diastolicBP?: number; respiratoryRate?: number; spO2?: number; weight?: number; height?: number; }
interface DxRow { icdCode: string; icdName: string; isPrimary: boolean; }
interface OrderRow { serviceId: string; code: string; name: string; qty: number; unitPrice: number; }

const VITAL_FIELDS: { k: keyof Vitals; l: string; unit: string }[] = [
  { k: 'pulse', l: 'Mạch', unit: 'l/p' },
  { k: 'temperature', l: 'Nhiệt', unit: '°C' },
  { k: 'systolicBP', l: 'HA tâm thu', unit: 'mmHg' },
  { k: 'diastolicBP', l: 'HA tâm trương', unit: 'mmHg' },
  { k: 'respiratoryRate', l: 'Nhịp thở', unit: 'l/p' },
  { k: 'spO2', l: 'SpO₂', unit: '%' },
  { k: 'weight', l: 'Cân', unit: 'kg' },
  { k: 'height', l: 'Cao', unit: 'cm' },
];

const OpdEditorV2: React.FC = () => {
  const navigate = useNavigate();

  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [roomId, setRoomId] = useState<string>('');
  const [type, setType] = useState<'general' | 'yhct'>('general');
  const [queue, setQueue] = useState<RoomPatientListDto[]>([]);
  const [selPt, setSelPt] = useState<RoomPatientListDto | null>(null);

  const [vitals, setVitals] = useState<Vitals>({});
  const [history, setHistory] = useState('');       // → MedicalInterview.historyOfPresentIllness
  const [exam, setExam] = useState('');             // → PhysicalExamination.generalAppearance
  const [conclusion, setConclusion] = useState(''); // → completeExamination.conclusionNotes
  const [diagnoses, setDx] = useState<DxRow[]>([]);
  const [orders, setOrd] = useState<OrderRow[]>([]);

  const [scanOpen, setScanOpen] = useState(false);
  const [sickFrom, setSickFrom] = useState('');
  const [sickTo, setSickTo] = useState('');
  const [icdQ, setIcdQ] = useState('');
  const [icdResults, setIcdResults] = useState<IcdCodeFullDto[]>([]);
  const [svcQ, setSvcQ] = useState('');
  const [svcResults, setSvcResults] = useState<ServiceDto[]>([]);
  const [saving, setSaving] = useState(false);

  // ── Đa chuyên khoa state ─────────────────────────────────────────
  const [completion, setCompletion] = useState<ExamCompletionStatus | null>(null);

  // Modal: khám thêm CK khác
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpRoomId, setFollowUpRoomId] = useState('');
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpSaving, setFollowUpSaving] = useState(false);

  // Modal: đổi phòng trước khám
  const [changeRoomOpen, setChangeRoomOpen] = useState(false);
  const [changeRoomNewId, setChangeRoomNewId] = useState('');
  const [changeRoomReason, setChangeRoomReason] = useState('');
  const [changeRoomSaving, setChangeRoomSaving] = useState(false);

  // Modal: xóa đăng ký
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteSaving, setDeleteSaving] = useState(false);

  const examId = selPt?.examinationId ?? null;

  // ── Completion status: load when patient selected, clear when deselected ──
  const refreshCompletion = useCallback(async (eid: string) => {
    try {
      const status = await getCompletionStatus(eid);
      setCompletion(status);
    } catch {
      setCompletion(null);
    }
  }, []);

  useEffect(() => {
    if (!examId) { setCompletion(null); return; }
    refreshCompletion(examId);
  }, [examId, refreshCompletion]);

  const bmi = vitals.weight && vitals.height ? (vitals.weight / ((vitals.height / 100) ** 2)) : null;
  const bmiStr = bmi ? bmi.toFixed(1) : '—';
  const totalSvc = orders.reduce((s, o) => s + o.unitPrice * o.qty, 0);

  // ── Rooms (once) ─────────────────────────────────────────────────
  useEffect(() => {
    examinationApi.getActiveExaminationRooms()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setRooms(list);
        if (list.length > 0) setRoomId(list[0].id);
      })
      .catch(() => setRooms([]));
  }, []);

  // ── Queue when room changes ──────────────────────────────────────
  const loadQueue = useCallback(async (rid: string) => {
    if (!rid) { setQueue([]); return; }
    try {
      const r = await examinationApi.getRoomPatientList(rid);
      setQueue(Array.isArray(r.data) ? r.data : []);
    } catch { setQueue([]); }
  }, []);
  useEffect(() => { loadQueue(roomId); }, [roomId, loadQueue]);

  // ── Select patient → load exam detail ────────────────────────────
  const selectPatient = useCallback(async (q: RoomPatientListDto) => {
    setSelPt(q);
    setLeftOpen(false);
    // reset then load
    setVitals({}); setHistory(''); setExam(''); setConclusion(''); setDx([]); setOrd([]);
    const id = q.examinationId;
    const [v, mi, pe, dx, so] = await Promise.allSettled([
      examinationApi.getVitalSigns(id),
      examinationApi.getMedicalInterview(id),
      examinationApi.getPhysicalExamination(id),
      examinationApi.getDiagnoses(id),
      examinationApi.getServiceOrders(id),
    ]);
    if (v.status === 'fulfilled' && v.value.data) {
      const d = v.value.data;
      setVitals({ pulse: d.pulse, temperature: d.temperature, systolicBP: d.systolicBP, diastolicBP: d.diastolicBP, respiratoryRate: d.respiratoryRate, spO2: d.spO2, weight: d.weight, height: d.height });
    }
    if (mi.status === 'fulfilled' && mi.value.data) setHistory(mi.value.data.historyOfPresentIllness || mi.value.data.chiefComplaint || '');
    if (pe.status === 'fulfilled' && pe.value.data) setExam(pe.value.data.generalAppearance || '');
    if (dx.status === 'fulfilled' && Array.isArray(dx.value.data)) {
      setDx((dx.value.data as DiagnosisFullDto[]).map((x) => ({ icdCode: x.icdCode, icdName: x.icdName, isPrimary: x.isPrimary })));
    }
    if (so.status === 'fulfilled' && Array.isArray(so.value.data)) {
      setOrd((so.value.data as ServiceOrderFullDto[]).map((x) => ({ serviceId: x.serviceId, code: x.serviceCode, name: x.serviceName, qty: x.quantity, unitPrice: x.unitPrice })));
    }
  }, []);

  // ── ICD search ───────────────────────────────────────────────────
  const searchIcd = useCallback(async (q: string) => {
    setIcdQ(q);
    if (!q || q.length < 2) { setIcdResults([]); return; }
    try { const r = await examinationApi.searchIcdCodes(q, undefined, 20); setIcdResults(Array.isArray(r.data) ? r.data : []); }
    catch { setIcdResults([]); }
  }, []);
  const addIcd = (i: IcdCodeFullDto) => {
    setDx((p) => p.some((x) => x.icdCode === i.code) ? p : [...p, { icdCode: i.code, icdName: i.name, isPrimary: p.length === 0 }]);
    setIcdQ(''); setIcdResults([]);
  };
  const setPrimary = (idx: number) => setDx((p) => p.map((x, i) => ({ ...x, isPrimary: i === idx })));
  const removeIcd = (idx: number) => setDx((p) => {
    const next = p.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some((x) => x.isPrimary)) next[0].isPrimary = true;
    return [...next];
  });

  // ── Service search ───────────────────────────────────────────────
  const searchSvc = useCallback(async (q: string) => {
    setSvcQ(q);
    if (!q || q.length < 2) { setSvcResults([]); return; }
    try { const r = await examinationApi.searchServices(q, 20); setSvcResults(Array.isArray(r.data) ? r.data : []); }
    catch { setSvcResults([]); }
  }, []);
  const addSvc = (s: ServiceDto) => {
    setOrd((p) => p.some((x) => x.serviceId === s.id) ? p : [...p, { serviceId: s.id, code: s.code, name: s.name, qty: 1, unitPrice: s.unitPrice }]);
    setSvcQ(''); setSvcResults([]);
  };
  const updateQty = (i: number, q: number) => setOrd((p) => p.map((x, j) => (j === i ? { ...x, qty: q } : x)));
  const removeSvc = (i: number) => setOrd((p) => p.filter((_, j) => j !== i));

  // ── Save / complete ──────────────────────────────────────────────
  const persist = async (): Promise<boolean> => {
    if (!examId) { tw('Chưa chọn bệnh nhân từ hàng đợi'); return false; }
    const primary = diagnoses.find((d) => d.isPrimary);
    await Promise.allSettled([
      examinationApi.updateVitalSigns(examId, { ...vitals, measuredAt: new Date().toISOString() }),
      examinationApi.updateMedicalInterview(examId, { historyOfPresentIllness: history }),
      examinationApi.updatePhysicalExamination(examId, { generalAppearance: exam }),
      examinationApi.updateDiagnosisList(examId, {
        primaryIcdCode: primary?.icdCode,
        primaryDiagnosis: primary?.icdName,
        secondaryDiagnoses: diagnoses.filter((d) => !d.isPrimary).map((d) => ({ icdCode: d.icdCode, diagnosisName: d.icdName })),
      }),
    ]);
    if (orders.length > 0) {
      await examinationApi.createServiceOrders({
        examinationId: examId,
        diagnosisCode: primary?.icdCode,
        diagnosisName: primary?.icdName,
        services: orders.map((o) => ({ serviceId: o.serviceId, quantity: o.qty, paymentType: 1, isPriority: false, isEmergency: false })),
        autoSelectRoom: true,
        calculateOptimalPath: true,
      }).catch(() => { /* orders may already exist */ });
    }
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    try { if (await persist()) tk('Đã lưu nháp phiếu khám'); }
    catch { te('Lưu nháp thất bại'); }
    finally { setSaving(false); }
  };

  const complete = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    if (diagnoses.length === 0) { tw('Cần ít nhất 1 chẩn đoán'); return; }
    setSaving(true);
    try {
      await persist();
      await examinationApi.completeExamination(examId, { conclusionType: 1, conclusionNotes: conclusion });
      tk('✓ Đã hoàn tất khám');
      loadQueue(roomId);
    } catch { te('Hoàn tất khám thất bại'); }
    finally { setSaving(false); }
  };

  const goPrescribe = () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    navigate(`/v2/prescription/edit?examId=${encodeURIComponent(examId)}`);
  };

  const saveSickLeave = async () => {
    if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
    if (!sickFrom || !sickTo) { tw('Chọn từ ngày / đến ngày'); return; }
    const days = Math.max(1, Math.round((new Date(sickTo).getTime() - new Date(sickFrom).getTime()) / 86400000) + 1);
    try {
      await createSickLeave(examId, { days, fromDate: sickFrom, toDate: sickTo });
      tk(`Đã lưu giấy nghỉ ${days} ngày`);
      setSickFrom(''); setSickTo('');
    } catch { te('Lưu giấy nghỉ thất bại'); }
  };

  const waitingCount = queue.filter((q) => q.status === 0 || q.status === 1).length;

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      {/* KPI */}
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'Phòng khám', val: rooms.find((r) => r.id === roomId)?.name || '—', sub: type === 'general' ? 'Ngoại trú chung' : 'YHCT' },
          { lbl: 'BN đang khám', val: selPt?.patientName || '—', sub: selPt ? `${selPt.patientCode} · ${selPt.age}T` : '—' },
          { lbl: 'Hàng đợi', val: waitingCount, tone: 'warn', sub: `/ ${queue.length} tổng` },
          { lbl: 'Số CĐ', val: diagnoses.length, sub: `${diagnoses.filter((d) => d.isPrimary).length} chính` },
          { lbl: 'Chỉ định CLS', val: orders.length, tone: 'info', sub: fmtVNDg(totalSvc) },
        ]} />
      </div>

      {/* Queue panel */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', overflow: 'auto', padding: 10, background: 'var(--d-1)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <select className="hui-inp hui-sel" value={roomId} onChange={(e) => { setRoomId(e.target.value); setSelPt(null); }} style={{ flex: 1, height: 30 }}>
            {rooms.length === 0 && <option value="">(Chưa có phòng)</option>}
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
          </select>
          <ActBtn ic="qr" title="Quét barcode BN" onClick={() => setScanOpen(true)} />
        </div>
        <div style={{ display: 'inline-flex', background: 'var(--d-0)', borderRadius: 4, padding: 2, marginBottom: 10, width: '100%' }}>
          {([{ v: 'general', l: 'Ngoại trú' }, { v: 'yhct', l: 'YHCT' }] as const).map((t) => (
            <button key={t.v} onClick={() => setType(t.v)} style={{ flex: 1, background: type === t.v ? 'var(--c-pri)' : 'transparent', color: type === t.v ? '#fff' : 'var(--t-1)', border: 0, padding: '4px 8px', borderRadius: 3, cursor: 'pointer', fontSize: 11, fontWeight: type === t.v ? 700 : 400 }}>{t.l}</button>
          ))}
        </div>

        <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 6 }}>Hàng đợi ({queue.length})</div>
        {queue.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 11.5, padding: 12, textAlign: 'center' }}>Không có bệnh nhân trong phòng</div>}
        {queue.map((q) => {
          const sel = q.examinationId === selPt?.examinationId;
          const tone = q.status === 2 ? 'info' : q.status === 1 ? 'warn' : 'info';
          return (
            <div key={q.examinationId} onClick={() => selectPatient(q)} style={{ padding: 10, marginBottom: 5, background: sel ? 'var(--c-pri-bg, rgba(37,99,235,.12))' : 'var(--d-0)', border: sel ? '1px solid var(--c-pri)' : '1px solid var(--line)', borderRadius: 6, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-pri, #2563eb)' }}>{q.queueNumber}</span>
                {(q.isEmergency || q.isPriority) && <StatusBadge tone="crit">{q.isEmergency ? 'Cấp cứu' : 'Ưu tiên'}</StatusBadge>}
              </div>
              <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 3 }}>{q.patientName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--t-2)' }}>{q.age}T · {q.gender === 1 ? 'Nam' : 'Nữ'}</span>
                <StatusBadge tone={tone}>{q.statusName || (q.status === 2 ? 'Đang khám' : q.status === 1 ? 'Gọi' : 'Chờ')}</StatusBadge>
              </div>
            </div>
          );
        })}
      </aside>

      {/* Main */}
      <main style={{ overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {!selPt ? (
          <div style={{ padding: '60px 12px', textAlign: 'center', color: 'var(--t-3)' }}>
            <TermIcon name="user" size={32} />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--t-2)' }}>Chọn bệnh nhân từ hàng đợi để bắt đầu khám</div>
          </div>
        ) : (
          <>
            {/* Vitals */}
            <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Sinh hiệu</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 8 }}>
                {VITAL_FIELDS.map((v) => (
                  <div key={v.k}>
                    <label style={{ fontSize: 10, color: 'var(--t-2)' }}>{v.l}</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input className="hui-inp mono" type="number" value={vitals[v.k] ?? ''} onChange={(e) => setVitals((s) => ({ ...s, [v.k]: e.target.value === '' ? undefined : +e.target.value }))} style={{ width: '100%', height: 28, fontSize: 12 }} />
                      <span style={{ fontSize: 10, color: 'var(--t-3)' }}>{v.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 8, padding: 6, background: 'var(--d-1)', borderRadius: 4, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--t-2)' }}>
                BMI = <b style={{ color: bmi == null ? 'var(--t-2)' : bmi < 18.5 ? '#0284c7' : bmi > 25 ? '#dc2626' : '#16a34a' }}>{bmiStr}</b>
                {bmi != null && <> ({bmi < 18.5 ? 'Gầy' : bmi > 25 ? 'Thừa cân' : 'Bình thường'})</>}
              </div>
            </section>

            {/* History + exam */}
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Bệnh sử · Lý do khám</h4>
                <textarea value={history} onChange={(e) => setHistory(e.target.value)} placeholder="Lý do đến khám, diễn biến bệnh, tiền sử…" style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid var(--line)', borderRadius: 4, fontSize: 12, background: 'var(--d-0)', color: 'var(--t-0)' }} />
              </div>
              <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Khám lâm sàng</h4>
                <textarea value={exam} onChange={(e) => setExam(e.target.value)} placeholder="Toàn thân, tim, phổi, bụng…" style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid var(--line)', borderRadius: 4, fontSize: 12, background: 'var(--d-0)', color: 'var(--t-0)' }} />
              </div>
            </section>

            {/* Diagnosis */}
            <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Chẩn đoán (ICD-10)</h4>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <div className="ab-search">
                  <TermIcon name="search" size={13} />
                  <input value={icdQ} onChange={(e) => searchIcd(e.target.value)} placeholder="Tìm mã ICD-10 hoặc tên bệnh (≥2 ký tự)…" />
                </div>
                {icdResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 6, marginTop: 4, maxHeight: 220, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
                    {icdResults.map((i) => (
                      <div key={i.code} onClick={() => addIcd(i)} style={{ padding: '6px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'flex', gap: 10 }}>
                        <span className="mono" style={{ fontWeight: 700, color: 'var(--c-pri, #2563eb)', width: 70 }}>{i.code}</span>
                        <span style={{ fontSize: 12 }}>{i.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {diagnoses.length === 0 && <span style={{ color: 'var(--t-3)', fontSize: 11.5 }}>Chưa có chẩn đoán</span>}
                {diagnoses.map((d, i) => (
                  <span key={d.icdCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: d.isPrimary ? 'var(--c-pri, #2563eb)' : 'var(--d-1)', color: d.isPrimary ? '#fff' : 'var(--t-0)', borderRadius: 4, fontSize: 11.5 }}>
                    <span className="mono" style={{ fontWeight: 700 }}>{d.icdCode}</span>
                    <span>{d.icdName}</span>
                    {d.isPrimary ? <span style={{ fontSize: 9, fontWeight: 700, opacity: .8 }}>CHÍNH</span>
                      : <button onClick={() => setPrimary(i)} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer', fontSize: 10 }} title="Đặt làm chính">★</button>}
                    <button onClick={() => removeIcd(i)} style={{ background: 'transparent', border: 0, color: 'inherit', cursor: 'pointer' }}>×</button>
                  </span>
                ))}
              </div>
            </section>

            {/* Orders */}
            <section style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8, padding: 12 }}>
              <h4 style={{ margin: '0 0 10px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Chỉ định CLS · Dịch vụ</h4>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <div className="ab-search">
                  <TermIcon name="search" size={13} />
                  <input value={svcQ} onChange={(e) => searchSvc(e.target.value)} placeholder="Tìm XN / CĐHA / thủ thuật (≥2 ký tự)…" />
                </div>
                {svcResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 6, marginTop: 4, maxHeight: 220, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
                    {svcResults.map((s) => (
                      <div key={s.id} onClick={() => addSvc(s)} style={{ padding: '6px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '110px 1fr 110px', gap: 10 }}>
                        <span className="mono" style={{ color: 'var(--c-pri, #2563eb)' }}>{s.code}</span>
                        <span style={{ fontSize: 12 }}>{s.name}</span>
                        <span className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(s.unitPrice)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <table className="ab-tbl" style={{ fontSize: 12 }}>
                <thead><tr><th style={{ width: 32 }}>#</th><th>Dịch vụ</th><th style={{ width: 80 }}>SL</th><th style={{ width: 120, textAlign: 'right' }}>Đơn giá</th><th style={{ width: 120, textAlign: 'right' }}>Thành tiền</th><th style={{ width: 40 }}></th></tr></thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: 'var(--t-3)' }}>Chưa có chỉ định</td></tr>}
                  {orders.map((o, i) => (
                    <tr key={o.serviceId}>
                      <td className="mono">{i + 1}</td>
                      <td><div style={{ fontWeight: 600 }}>{o.name}</div><div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{o.code}</div></td>
                      <td><input type="number" className="hui-inp" style={{ width: '100%', height: 26 }} value={o.qty} onChange={(e) => updateQty(i, +e.target.value)} /></td>
                      <td className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(o.unitPrice)}</td>
                      <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVNDg(o.unitPrice * o.qty)}</td>
                      <td><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => removeSvc(i)} /></td>
                    </tr>
                  ))}
                </tbody>
                {orders.length > 0 && <tfoot><tr style={{ background: 'var(--d-1)', fontWeight: 700 }}><td colSpan={4} style={{ textAlign: 'right' }}>Tổng CLS:</td><td className="mono" style={{ textAlign: 'right', color: 'var(--s-ok)' }}>{fmtVNDg(totalSvc)}</td><td></td></tr></tfoot>}
              </table>
            </section>
          </>
        )}
      </main>

      {/* Right tools */}
      <aside className={'ed-right-panel ' + (rightOpen ? 'is-open' : '')} style={{ borderLeft: '1px solid var(--line)', padding: 12, background: 'var(--d-1)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
        <section style={{ padding: 12, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Kết luận</h4>
          <textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} placeholder="Kết luận khám, hướng xử trí, hẹn tái khám…" style={{ width: '100%', minHeight: 80, padding: 8, border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5, background: 'var(--d-0)', color: 'var(--t-0)' }} />
        </section>

        <section style={{ padding: 12, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 8px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Giấy nghỉ ốm</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div><label style={{ fontSize: 10, color: 'var(--t-2)' }}>Từ ngày</label><input type="date" className="hui-inp" style={{ width: '100%', height: 26 }} value={sickFrom} onChange={(e) => setSickFrom(e.target.value)} /></div>
            <div><label style={{ fontSize: 10, color: 'var(--t-2)' }}>Đến ngày</label><input type="date" className="hui-inp" style={{ width: '100%', height: 26 }} value={sickTo} onChange={(e) => setSickTo(e.target.value)} /></div>
          </div>
          <Btn variant="ghost" size="sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }} disabled={!sickFrom || !sickTo} onClick={saveSickLeave}>
            <TermIcon name="file-text" size={11} /> Lưu giấy nghỉ
          </Btn>
        </section>

        <div style={{ display: 'grid', gap: 6 }}>
          <Btn variant="ghost" disabled={saving} onClick={saveDraft}><TermIcon name="folder" size={12} /> Lưu nháp</Btn>
          <Btn variant="ghost" onClick={goPrescribe}><TermIcon name="pill" size={12} /> Kê đơn thuốc →</Btn>
          <Btn variant="ghost" onClick={() => tk('Đã gửi máy in')}><TermIcon name="print" size={12} /> In phiếu khám</Btn>
          <Btn variant="primary" disabled={saving} onClick={complete}><TermIcon name="check" size={12} /> Hoàn tất khám</Btn>
        </div>

        {/* ── ĐA CHUYÊN KHOA ─────────────────────────────────── */}
        <section style={{ padding: 12, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--t-2)' }}>Đa chuyên khoa</h4>

          {/* 1. Khám thêm CK khác */}
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
                setFollowUpRoomId('');
                setFollowUpReason('');
                setFollowUpOpen(true);
              }}
            >
              <TermIcon name="plus" size={11} /> Khám thêm CK khác
            </Btn>

            {/* 2. Đổi phòng (trước khám) — chỉ khi status Chờ hoặc Gọi */}
            <Btn
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
                if (selPt?.status !== 0 && selPt?.status !== 1) {
                  tw('Chỉ có thể đổi phòng khi bệnh nhân đang Chờ hoặc Gọi');
                  return;
                }
                setChangeRoomNewId('');
                setChangeRoomReason('');
                setChangeRoomOpen(true);
              }}
              disabled={examId !== null && selPt?.status !== 0 && selPt?.status !== 1}
            >
              <TermIcon name="arrow-right" size={11} /> Đổi phòng (trước khám)
            </Btn>
          </div>

          {/* 3. Bảng kê chi phí — completion status */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)', marginBottom: 6 }}>Bảng kê chi phí</div>
            {completion ? (
              <>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, fontSize: 11 }}>
                  <span>Hoàn tất: <b style={{ color: completion.isCompleted ? 'var(--s-ok)' : 'var(--t-2)' }}>{completion.isCompleted ? '✓' : '✗'}</b></span>
                  <span>Đã in BK: <b style={{ color: completion.isBillPrinted ? 'var(--s-ok)' : 'var(--t-2)' }}>{completion.isBillPrinted ? '✓' : '✗'}</b></span>
                  {completion.totalExamsInChain > 1 && (
                    <span style={{ color: 'var(--t-2)' }}>{completion.completedExamsInChain}/{completion.totalExamsInChain} CK</span>
                  )}
                </div>
                {completion.blockReason && (
                  <div style={{ fontSize: 11, color: 'var(--s-warn)', marginBottom: 6, padding: '4px 6px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--s-warn)' }}>
                    {completion.blockReason}
                  </div>
                )}
                <div style={{ display: 'grid', gap: 5 }}>
                  {/* In bảng kê */}
                  {completion.canPrintBill && (
                    <Btn
                      variant="ok"
                      size="sm"
                      onClick={async () => {
                        if (!examId) return;
                        try {
                          const result = await printBill(examId);
                          tk('Đã in chi phí (bảng kê)');
                          setCompletion(result);
                        } catch (err: unknown) {
                          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                          te(msg || 'Không thể in bảng kê chi phí');
                        }
                      }}
                    >
                      <TermIcon name="print" size={11} /> In bảng kê chi phí
                    </Btn>
                  )}
                  {/* Hủy in chi phí */}
                  {completion.isBillPrinted && (
                    <Btn
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!examId) return;
                        try {
                          const result = await cancelPrintBill(examId);
                          tk('Đã hủy in chi phí');
                          setCompletion(result);
                        } catch (err: unknown) {
                          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                          te(msg || 'Không thể hủy in chi phí');
                        }
                      }}
                    >
                      <TermIcon name="x" size={11} /> Hủy in chi phí
                    </Btn>
                  )}
                  {/* Hủy hoàn tất */}
                  {completion.isCompleted && (
                    <Btn
                      variant="crit"
                      size="sm"
                      onClick={async () => {
                        if (!examId) return;
                        // Cảnh báo nếu đã in bảng kê
                        const confirmed = window.confirm(
                          'Hủy hoàn tất? Phiên khám trở về Đang khám.' +
                          (completion.isBillPrinted ? ' Cần hủy in chi phí trước nếu có.' : ''),
                        );
                        if (!confirmed) return;
                        try {
                          const result = await cancelCompletion(examId);
                          tk('Đã hủy hoàn tất');
                          setCompletion(result);
                          loadQueue(roomId);
                        } catch (err: unknown) {
                          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                          te(msg || 'Không thể hủy hoàn tất');
                        }
                      }}
                    >
                      <TermIcon name="refresh" size={11} /> Hủy hoàn tất (về Đang khám)
                    </Btn>
                  )}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--t-3)' }}>{examId ? 'Đang tải…' : 'Chọn bệnh nhân để xem trạng thái'}</div>
            )}
          </div>

          {/* 4. Xóa đăng ký — destructive */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
            <Btn
              variant="crit"
              size="sm"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                if (!examId) { tw('Chưa chọn bệnh nhân'); return; }
                setDeleteReason('');
                setDeleteOpen(true);
              }}
            >
              <TermIcon name="trash" size={11} /> Xóa đăng ký khám
            </Btn>
          </div>
        </section>
      </aside>

      {/* ── Modal: Khám thêm CK khác ─────────────────────────────────── */}
      <ModalShell
        open={followUpOpen}
        onClose={() => setFollowUpOpen(false)}
        title="Khám thêm chuyên khoa khác"
        sub="Tạo phiên khám tại phòng chuyên khoa khác cho bệnh nhân này"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setFollowUpOpen(false)}>Hủy</Btn>
            <Btn
              variant="primary"
              size="sm"
              disabled={!followUpRoomId || followUpSaving}
              onClick={async () => {
                if (!examId || !followUpRoomId) return;
                setFollowUpSaving(true);
                try {
                  const result = await addFollowUpSpecialty({
                    parentExaminationId: examId,
                    roomId: followUpRoomId,
                    reason: followUpReason || undefined,
                  });
                  tk(`Đã tạo phiên khám CK khác — Phòng ${result.roomName}, STT ${result.queueNumber}`);
                  setFollowUpOpen(false);
                  loadQueue(roomId);
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  te(msg || 'Không thêm được phiên khám CK khác');
                } finally {
                  setFollowUpSaving(false);
                }
              }}
            >
              <TermIcon name="plus" size={11} /> Tạo phiên khám
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>Phòng chuyên khoa <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <select
              className="hui-inp hui-sel"
              value={followUpRoomId}
              onChange={(e) => setFollowUpRoomId(e.target.value)}
              style={{ width: '100%', height: 30 }}
            >
              <option value="">(Chọn phòng)</option>
              {rooms.filter((r) => r.id !== roomId).map((r) => (
                <option key={r.id} value={r.id}>{r.code} · {r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>Lý do (tùy chọn)</label>
            <textarea
              className="hui-inp"
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
              placeholder="Lý do chuyển khám chuyên khoa…"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: Đổi phòng trước khám ──────────────────────────────── */}
      <ModalShell
        open={changeRoomOpen}
        onClose={() => setChangeRoomOpen(false)}
        title="Đổi phòng trước khi khám"
        sub="Chuyển bệnh nhân sang phòng khám khác (chỉ khi chưa bắt đầu khám)"
        size="sm"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setChangeRoomOpen(false)}>Hủy</Btn>
            <Btn
              variant="primary"
              size="sm"
              disabled={!changeRoomNewId || changeRoomSaving}
              onClick={async () => {
                if (!examId || !changeRoomNewId) return;
                setChangeRoomSaving(true);
                try {
                  await changeRoomBeforeExam({
                    examinationId: examId,
                    newRoomId: changeRoomNewId,
                    reason: changeRoomReason || undefined,
                  });
                  tk('Đã đổi phòng trước khám');
                  setChangeRoomOpen(false);
                  setSelPt(null);
                  loadQueue(roomId);
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  te(msg || 'Không thể đổi phòng');
                } finally {
                  setChangeRoomSaving(false);
                }
              }}
            >
              <TermIcon name="arrow-right" size={11} /> Xác nhận đổi phòng
            </Btn>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>Phòng mới <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <select
              className="hui-inp hui-sel"
              value={changeRoomNewId}
              onChange={(e) => setChangeRoomNewId(e.target.value)}
              style={{ width: '100%', height: 30 }}
            >
              <option value="">(Chọn phòng)</option>
              {rooms.filter((r) => r.id !== roomId).map((r) => (
                <option key={r.id} value={r.id}>{r.code} · {r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>Lý do (tùy chọn)</label>
            <textarea
              className="hui-inp"
              value={changeRoomReason}
              onChange={(e) => setChangeRoomReason(e.target.value)}
              placeholder="Lý do đổi phòng…"
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>
        </div>
      </ModalShell>

      {/* ── Modal: Xóa đăng ký khám ──────────────────────────────────── */}
      <ModalShell
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xóa đăng ký khám"
        sub="Thao tác này không thể hoàn tác"
        size="sm"
        tone="danger"
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" size="sm" onClick={() => setDeleteOpen(false)}>Hủy</Btn>
            <Btn
              variant="crit"
              size="sm"
              disabled={!deleteReason.trim() || deleteSaving}
              onClick={async () => {
                if (!examId || !deleteReason.trim()) return;
                setDeleteSaving(true);
                try {
                  await deleteRegistration(examId, deleteReason.trim());
                  tk('Đã xóa đăng ký khám');
                  setDeleteOpen(false);
                  setSelPt(null);
                  setCompletion(null);
                  loadQueue(roomId);
                } catch (err: unknown) {
                  const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                  te(msg || 'Không thể xóa đăng ký khám');
                } finally {
                  setDeleteSaving(false);
                }
              }}
            >
              <TermIcon name="trash" size={11} /> Xóa đăng ký
            </Btn>
          </div>
        }
      >
        <div>
          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--t-1)' }}>
            Xóa đăng ký khám của <b>{selPt?.patientName}</b> (STT {selPt?.queueNumber})?
          </div>
          <label style={{ fontSize: 11, color: 'var(--t-2)', display: 'block', marginBottom: 4 }}>
            Lý do xóa <span style={{ color: 'var(--s-err)' }}>*</span>
          </label>
          <textarea
            className="hui-inp"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="Bắt buộc nhập lý do xóa…"
            rows={3}
            style={{ width: '100%', resize: 'vertical', borderColor: !deleteReason.trim() ? 'var(--s-err)' : undefined }}
          />
          {!deleteReason.trim() && (
            <div style={{ fontSize: 11, color: 'var(--s-err)', marginTop: 4 }}>Lý do không được để trống</div>
          )}
        </div>
      </ModalShell>

      {/* Responsive toggles */}
      {(leftOpen || rightOpen) && <div className="ed-panel-backdrop" onClick={closeAll} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Hàng đợi">
          <TermIcon name="list" size={18} />
          {waitingCount > 0 ? <span className="badge">{waitingCount}</span> : null}
        </button>
        <button className="ed-panel-toggle" onClick={() => setRightOpen((o) => !o)} title="Kết luận & thao tác" style={{ background: 'var(--s-warn)' }}>
          <TermIcon name="check" size={18} />
        </button>
      </div>

      {/* Barcode scan → find patient in current room queue */}
      <BarcodeScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={(code) => {
          setScanOpen(false);
          const key = code.trim().toLowerCase();
          const hit = queue.find((q) => q.patientCode?.toLowerCase() === key || q.examinationId?.toLowerCase() === key);
          if (hit) { selectPatient(hit); tk(`Đã chọn ${hit.patientName}`); }
          else ti(`Không thấy BN "${code}" trong hàng đợi phòng này`);
        }}
      />
    </div>
  );
};

export default OpdEditorV2;
