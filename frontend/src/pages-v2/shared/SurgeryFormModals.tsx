/**
 * SurgeryFormModals — G-04: 4 phiếu phòng mổ
 *
 * Exported modals:
 *  - PreAnesthesiaModal     — Phiếu khám tiền mê + hồi tỉnh (AnesthesiaRecord)
 *  - AnesthesiaMonitorModal — Phiếu theo dõi gây mê (AnesthesiaRecord monitors/drugs/fluids)
 *  - ConsentModal           — Phiếu cam đoan PTTT (SurgeryConsent)
 *
 * All use endpoints that ALREADY EXIST on the backend.
 * Print buttons call existing BE print endpoints where available.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Select, InputNumber, Spin } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw, te } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { anesthesiaApi } from '../../api/clinicalRecords';
import {
  getSurgeryConsents,
  saveSurgeryConsent,
  signConsent,
  printAnesthesiaForm,
  type SurgeryConsentDto,
  type SaveConsentDto,
} from '../../api/surgery';
import {
  printAnesthesiaMonitor,
  printAnesthesiaRecovery,
  printAnesthesiaRecord,
} from '../../components/AnesthesiaPrintTemplates';

// ---------------------------------------------------------------------------
// Local layout helpers
// ---------------------------------------------------------------------------

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      fontSize: 10.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      color: 'var(--t-2)', marginBottom: 8, letterSpacing: '.05em',
    }}>{title}</div>
    {children}
  </div>
);

const Row2: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', alignItems: 'start', gap: 8, marginBottom: 6 }}>
    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', paddingTop: 5 }}>{label}</span>
    <div>{children}</div>
  </div>
);

// ---------------------------------------------------------------------------
// ASA class options
// ---------------------------------------------------------------------------
const ASA_OPTIONS = [
  { value: 1, label: 'ASA I — bình thường' },
  { value: 2, label: 'ASA II — bệnh lý nhẹ' },
  { value: 3, label: 'ASA III — bệnh lý nặng' },
  { value: 4, label: 'ASA IV — đe doạ tính mạng' },
  { value: 5, label: 'ASA V — hấp hối' },
];

const MALLAMPATI_OPTIONS = [
  { value: 1, label: 'Mallampati I — nhìn thấy toàn bộ' },
  { value: 2, label: 'Mallampati II — nhìn thấy phần lớn' },
  { value: 3, label: 'Mallampati III — chỉ thấy đáy lưỡi' },
  { value: 4, label: 'Mallampati IV — không nhìn thấy' },
];

const ANESTHESIA_TYPE_OPTIONS = [
  { value: 'Gây mê toàn thân', label: 'Gây mê toàn thân' },
  { value: 'Gây tê tủy sống', label: 'Gây tê tủy sống' },
  { value: 'Gây tê ngoài màng cứng', label: 'Gây tê ngoài màng cứng' },
  { value: 'Gây tê đám rối thần kinh', label: 'Gây tê đám rối thần kinh' },
  { value: 'Gây tê tại chỗ', label: 'Gây tê tại chỗ' },
  { value: 'Không vô cảm', label: 'Không vô cảm' },
];

// ---------------------------------------------------------------------------
// Pre-Anesthesia Modal (Phiếu khám tiền mê + hồi tỉnh)
// Reuses AnesthesiaRecord entity via /clinical-records/anesthesia
// ---------------------------------------------------------------------------

export interface PreAnesthesiaModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface PreAnesthForm {
  asaClass: number;
  mallampatiScore: number;
  allergies: string;
  npoStatus: string;
  anesthesiaType: string;
  airwayPlan: string;
  preOpAssessment: string;
  psychologicalAssessment: string;
  recoveryNotes: string;
  status: number;
}

const EMPTY_PREANEST: PreAnesthForm = {
  asaClass: 1,
  mallampatiScore: 1,
  allergies: '',
  npoStatus: '',
  anesthesiaType: 'Gây mê toàn thân',
  airwayPlan: '',
  preOpAssessment: '',
  psychologicalAssessment: '',
  recoveryNotes: '',
  status: 0,
};

export const PreAnesthesiaModal: React.FC<PreAnesthesiaModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [form, setForm] = useState<PreAnesthForm>(EMPTY_PREANEST);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const set = <K extends keyof PreAnesthForm>(k: K, v: PreAnesthForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const existing = Array.isArray(records) ? records[0] : null;
      if (existing) {
        setExistingId(existing.id);
        setForm({
          asaClass: existing.asaClass ?? 1,
          mallampatiScore: existing.mallampatiScore ?? 1,
          allergies: existing.allergies ?? '',
          npoStatus: existing.npoStatus ?? '',
          anesthesiaType: existing.anesthesiaType || 'Gây mê toàn thân',
          airwayPlan: existing.airwayPlan ?? '',
          preOpAssessment: existing.preOpAssessment ?? '',
          psychologicalAssessment: existing.psychologicalAssessment ?? '',
          recoveryNotes: existing.recoveryNotes ?? '',
          status: existing.status ?? 0,
        });
      } else {
        setExistingId(null);
        setForm(EMPTY_PREANEST);
      }
    } catch {
      setForm(EMPTY_PREANEST);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleSave = async () => {
    if (!form.anesthesiaType) { tw('Cần chọn phương pháp vô cảm'); return; }
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        asaClass: form.asaClass,
        mallampatiScore: form.mallampatiScore,
        allergies: form.allergies || undefined,
        npoStatus: form.npoStatus || undefined,
        anesthesiaType: form.anesthesiaType,
        airwayPlan: form.airwayPlan || undefined,
        preOpAssessment: form.preOpAssessment || undefined,
        psychologicalAssessment: form.psychologicalAssessment || undefined,
        recoveryNotes: form.recoveryNotes || undefined,
        status: form.status,
      });
      tk('Đã lưu phiếu khám tiền mê');
      await load();
    } catch {
      te('Không thể lưu phiếu khám tiền mê');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const res = await printAnesthesiaForm(surgeryId);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      te('Không in được phiếu gây mê');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TermIcon name="activity" size={14} />
          <span>Phiếu khám tiền mê</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          {existingId && (
            <Btn variant="ghost" loading={printing} onClick={handlePrint} icon="print">
              In phiếu
            </Btn>
          )}
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Section title="Đánh giá tiền phẫu">
            <Row2 label="Phân loại ASA">
              <AbSelect
                options={ASA_OPTIONS}
                value={form.asaClass}
                onChange={(v) => set('asaClass', Number(v))}
              />
            </Row2>
            <Row2 label="Mallampati">
              <AbSelect
                options={MALLAMPATI_OPTIONS}
                value={form.mallampatiScore}
                onChange={(v) => set('mallampatiScore', Number(v))}
              />
            </Row2>
            <Row2 label="Dị ứng">
              <Input
                value={form.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                placeholder="Thuốc / chất dị ứng (nếu có)…"
                size="small"
              />
            </Row2>
            <Row2 label="Nhịn ăn (NPO)">
              <Input
                value={form.npoStatus}
                onChange={(e) => set('npoStatus', e.target.value)}
                placeholder="VD: nhịn ăn từ 22h hôm qua…"
                size="small"
              />
            </Row2>
            <Row2 label="Phương pháp vô cảm *">
              <Select
                style={{ width: '100%' }}
                size="small"
                value={form.anesthesiaType}
                onChange={(v) => set('anesthesiaType', v)}
                options={ANESTHESIA_TYPE_OPTIONS}
              />
            </Row2>
            <Row2 label="Kế hoạch đường thở">
              <Input.TextArea
                rows={2}
                value={form.airwayPlan}
                onChange={(e) => set('airwayPlan', e.target.value)}
                placeholder="Nội khí quản / mask thanh quản / khó đường thở…"
              />
            </Row2>
            <Row2 label="Đánh giá tiền mê">
              <Input.TextArea
                rows={3}
                value={form.preOpAssessment}
                onChange={(e) => set('preOpAssessment', e.target.value)}
                placeholder="Nhận xét tình trạng BN, khuyến nghị trước mổ…"
              />
            </Row2>
            <Row2 label="Khám tâm lý trước mổ">
              <Input.TextArea
                rows={3}
                value={form.psychologicalAssessment}
                onChange={(e) => set('psychologicalAssessment', e.target.value)}
                placeholder="Tâm trạng, lo âu, mức độ hợp tác, tư vấn tâm lý trước mổ…"
              />
            </Row2>
          </Section>

          <Section title="Hồi tỉnh sau mổ">
            <Row2 label="Ghi chú hồi tỉnh">
              <Input.TextArea
                rows={3}
                value={form.recoveryNotes}
                onChange={(e) => set('recoveryNotes', e.target.value)}
                placeholder="Diễn biến hồi tỉnh, điểm Aldrete, xử trí sau mổ…"
              />
            </Row2>
            <Row2 label="Trạng thái">
              <AbSelect
                options={[
                  { value: 0, label: 'Nháp' },
                  { value: 1, label: 'Đang thực hiện' },
                  { value: 2, label: 'Hoàn thành' },
                ]}
                value={form.status}
                onChange={(v) => set('status', Number(v))}
              />
            </Row2>
          </Section>
        </div>
      )}
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Anesthesia Monitor Modal (Phiếu theo dõi gây mê — monitoring timeline)
// Reuses same AnesthesiaRecord entity, focuses on Monitors[] / Drugs[] / Fluids[]
// ---------------------------------------------------------------------------

export interface AnesthesiaMonitorModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface MonitorEntry {
  monitorTime: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  spO2?: number;
  etCO2?: number;
  temperature?: number;
  notes?: string;
}

interface DrugEntry {
  givenTime: string;
  drugName: string;
  dose?: string;
  route?: string;
}

const EMPTY_MONITOR: MonitorEntry = { monitorTime: '', systolicBP: undefined, diastolicBP: undefined, heartRate: undefined, spO2: undefined };

export const AnesthesiaMonitorModal: React.FC<AnesthesiaMonitorModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [existingId, setExistingId] = useState<string | null>(null);
  const [monitors, setMonitors]     = useState<MonitorEntry[]>([{ ...EMPTY_MONITOR }]);
  const [drugs, setDrugs]           = useState<DrugEntry[]>([]);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [printing, setPrinting]     = useState(false);

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const existing = Array.isArray(records) ? records[0] : null;
      if (existing) {
        setExistingId(existing.id);
        const mons: MonitorEntry[] = (existing.monitors ?? []).map((m: {
          monitorTime?: string; systolicBP?: number; diastolicBP?: number;
          heartRate?: number; spO2?: number; etCO2?: number;
          temperature?: number; notes?: string;
        }) => ({
          monitorTime:  m.monitorTime ?? '',
          systolicBP:   m.systolicBP,
          diastolicBP:  m.diastolicBP,
          heartRate:    m.heartRate,
          spO2:         m.spO2,
          etCO2:        m.etCO2,
          temperature:  m.temperature,
          notes:        m.notes,
        }));
        setMonitors(mons.length ? mons : [{ ...EMPTY_MONITOR }]);
        const drs: DrugEntry[] = (existing.drugs ?? []).map((d: {
          givenTime?: string; drugName?: string; dose?: string; route?: string;
        }) => ({
          givenTime: d.givenTime ?? '',
          drugName:  d.drugName ?? '',
          dose:      d.dose,
          route:     d.route,
        }));
        setDrugs(drs);
      } else {
        setExistingId(null);
        setMonitors([{ ...EMPTY_MONITOR }]);
        setDrugs([]);
      }
    } catch {
      setMonitors([{ ...EMPTY_MONITOR }]);
      setDrugs([]);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const addMonitor = () => setMonitors((m) => [...m, { ...EMPTY_MONITOR }]);
  const removeMonitor = (i: number) => setMonitors((m) => m.filter((_, idx) => idx !== i));
  const setMonitorField = (i: number, k: keyof MonitorEntry, v: string | number | undefined) =>
    setMonitors((m) => m.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const addDrug = () => setDrugs((d) => [...d, { givenTime: '', drugName: '' }]);
  const removeDrug = (i: number) => setDrugs((d) => d.filter((_, idx) => idx !== i));
  const setDrugField = (i: number, k: keyof DrugEntry, v: string) =>
    setDrugs((d) => d.map((row, idx) => idx === i ? { ...row, [k]: v } : row));

  const handleSave = async () => {
    const validMonitors = monitors.filter((m) => m.monitorTime);
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        asaClass: 1,
        mallampatiScore: 1,
        anesthesiaType: 'Gây mê toàn thân',
        status: 1,
        monitors: validMonitors,
        drugs: drugs.filter((d) => d.drugName),
        fluids: [],
      });
      tk('Đã lưu phiếu theo dõi gây mê');
      await load();
    } catch {
      te('Không thể lưu phiếu theo dõi gây mê');
    } finally {
      setSaving(false);
    }
  };

  // In phiếu: fetch bản ghi mới nhất rồi gọi print helper
  const handlePrintMonitor = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const rec = Array.isArray(records) ? records[0] : null;
      if (!rec) { tw('Chưa có dữ liệu theo dõi gây mê để in'); return; }
      printAnesthesiaMonitor(rec);
    } catch {
      te('Không in được phiếu theo dõi gây mê');
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintRecord = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const rec = Array.isArray(records) ? records[0] : null;
      if (!rec) { tw('Chưa có dữ liệu để in biên bản gây mê'); return; }
      printAnesthesiaRecord(rec);
    } catch {
      te('Không in được biên bản gây mê');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TermIcon name="chart" size={14} />
          <span>Theo dõi gây mê</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          {existingId && (
            <>
              <Btn variant="ghost" loading={printing} onClick={handlePrintMonitor} icon="print">
                In phiếu TD gây mê
              </Btn>
              <Btn variant="ghost" loading={printing} onClick={handlePrintRecord} icon="print">
                In biên bản GM
              </Btn>
            </>
          )}
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Section title={`Theo dõi sinh tồn (${monitors.length} lần)`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                <thead>
                  <tr style={{ background: 'var(--d-1)' }}>
                    {['Giờ', 'HA trên', 'HA dưới', 'Mạch', 'SpO2', 'EtCO2', 'Nhiệt độ', 'Ghi chú', ''].map((h, i) => (
                      <th key={i} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, color: 'var(--t-2)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((m, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td style={{ padding: '3px 4px' }}>
                        <input
                          type="time"
                          className="hui-inp"
                          style={{ width: 80, height: 26, fontSize: 'var(--fs-xs)' }}
                          value={m.monitorTime}
                          onChange={(e) => setMonitorField(i, 'monitorTime', e.target.value)}
                        />
                      </td>
                      {(['systolicBP', 'diastolicBP', 'heartRate', 'spO2', 'etCO2'] as const).map((k) => (
                        <td key={k} style={{ padding: '3px 4px' }}>
                          <InputNumber
                            size="small"
                            style={{ width: 64 }}
                            value={m[k] as number | undefined}
                            onChange={(v) => setMonitorField(i, k, v ?? undefined)}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '3px 4px' }}>
                        <InputNumber
                          size="small"
                          style={{ width: 72 }}
                          min={34}
                          max={42}
                          step={0.1}
                          value={m.temperature as number | undefined}
                          onChange={(v) => setMonitorField(i, 'temperature', v ?? undefined)}
                        />
                      </td>
                      <td style={{ padding: '3px 4px' }}>
                        <input
                          className="hui-inp"
                          style={{ width: 90, height: 26, fontSize: 'var(--fs-xs)' }}
                          value={m.notes ?? ''}
                          onChange={(e) => setMonitorField(i, 'notes', e.target.value)}
                          placeholder="Ghi chú…"
                        />
                      </td>
                      <td style={{ padding: '3px 4px' }}>
                        <Btn variant="crit" size="sm" onClick={() => removeMonitor(i)}>
                          <TermIcon name="x" size={10} />
                        </Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Btn variant="ghost" size="sm" onClick={addMonitor} style={{ marginTop: 6 }}>
              <TermIcon name="plus" size={11} /> Thêm lần theo dõi
            </Btn>
          </Section>

          <Section title={`Thuốc gây mê (${drugs.length})`}>
            {drugs.map((d, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                <input
                  type="time"
                  className="hui-inp"
                  style={{ width: 80, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.givenTime}
                  onChange={(e) => setDrugField(i, 'givenTime', e.target.value)}
                />
                <input
                  className="hui-inp"
                  style={{ flex: 2, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.drugName}
                  onChange={(e) => setDrugField(i, 'drugName', e.target.value)}
                  placeholder="Tên thuốc…"
                />
                <input
                  className="hui-inp"
                  style={{ flex: 1, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.dose ?? ''}
                  onChange={(e) => setDrugField(i, 'dose', e.target.value)}
                  placeholder="Liều…"
                />
                <input
                  className="hui-inp"
                  style={{ width: 80, height: 28, fontSize: 'var(--fs-xs)' }}
                  value={d.route ?? ''}
                  onChange={(e) => setDrugField(i, 'route', e.target.value)}
                  placeholder="Đường dùng"
                />
                <Btn variant="crit" size="sm" onClick={() => removeDrug(i)}>
                  <TermIcon name="x" size={10} />
                </Btn>
              </div>
            ))}
            <Btn variant="ghost" size="sm" onClick={addDrug}>
              <TermIcon name="plus" size={11} /> Thêm thuốc
            </Btn>
          </Section>
        </div>
      )}
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Consent Modal (Phiếu cam đoan PTTT)
// Reuses SurgeryConsent endpoints on SurgeryCompleteController
// ---------------------------------------------------------------------------

export interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientName?: string;
  surgeryCode?: string;
  plannedProcedure?: string;
  diagnosis?: string;
}

const CONSENT_TYPE_OPTIONS = [
  { value: 1, label: 'Cam đoan phẫu thuật' },
  { value: 2, label: 'Cam đoan gây mê' },
  { value: 3, label: 'Cam đoan truyền máu' },
  { value: 4, label: 'Cam đoan thủ thuật' },
];

interface ConsentForm {
  consentType: number;
  diagnosis: string;
  plannedProcedure: string;
  risks: string;
  alternatives: string;
  doctorExplanation: string;
  signerName: string;
  signerRelationship: string;
}

const EMPTY_CONSENT: ConsentForm = {
  consentType: 1,
  diagnosis: '',
  plannedProcedure: '',
  risks: '',
  alternatives: '',
  doctorExplanation: '',
  signerName: '',
  signerRelationship: '',
};

export const ConsentModal: React.FC<ConsentModalProps> = ({
  open, onClose, surgeryId, patientName, surgeryCode, plannedProcedure, diagnosis,
}) => {
  const [consents, setConsents]   = useState<SurgeryConsentDto[]>([]);
  const [form, setForm]           = useState<ConsentForm>(EMPTY_CONSENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [signing, setSigning]     = useState(false);

  const set = <K extends keyof ConsentForm>(k: K, v: ConsentForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const data = await getSurgeryConsents(surgeryId);
      setConsents(data);
      // Pre-fill form if no existing consent of type 1
      const hasPtConsent = data.some((c) => c.consentType === 1);
      if (!hasPtConsent) {
        setForm({
          ...EMPTY_CONSENT,
          diagnosis: diagnosis ?? '',
          plannedProcedure: plannedProcedure ?? '',
        });
        setSelectedId(null);
      } else {
        const first = data[0];
        setSelectedId(first.id);
        setForm({
          consentType: first.consentType,
          diagnosis: first.diagnosis ?? '',
          plannedProcedure: first.plannedProcedure ?? '',
          risks: first.risks ?? '',
          alternatives: first.alternatives ?? '',
          doctorExplanation: first.doctorExplanation ?? '',
          signerName: first.signerName ?? '',
          signerRelationship: first.signerRelationship ?? 'BN',
        });
      }
    } catch {
      setConsents([]);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId, diagnosis, plannedProcedure]);

  useEffect(() => { if (open) load(); else { setConsents([]); setSelectedId(null); setForm(EMPTY_CONSENT); } }, [open, load]);

  const handleSave = async () => {
    if (!form.plannedProcedure.trim()) { tw('Cần nhập phương pháp phẫu thuật dự kiến'); return; }
    setSaving(true);
    try {
      const dto: SaveConsentDto = {
        id: selectedId ?? undefined,
        surgeryId,
        consentType: form.consentType,
        diagnosis: form.diagnosis || undefined,
        plannedProcedure: form.plannedProcedure,
        risks: form.risks || undefined,
        alternatives: form.alternatives || undefined,
        doctorExplanation: form.doctorExplanation || undefined,
      };
      const saved = await saveSurgeryConsent(dto);
      setSelectedId(saved.id);
      tk('Đã lưu cam đoan PTTT');
      await load();
    } catch {
      te('Không thể lưu cam đoan PTTT');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!selectedId) { tw('Lưu cam đoan trước khi ký'); return; }
    if (!form.signerName.trim()) { tw('Cần nhập tên người ký'); return; }
    setSigning(true);
    try {
      await signConsent(selectedId, form.signerName, form.signerRelationship || 'BN');
      tk('Đã ký cam đoan');
      await load();
    } catch {
      te('Ký cam đoan thất bại');
    } finally {
      setSigning(false);
    }
  };

  const activeConsent = selectedId ? consents.find((c) => c.id === selectedId) : null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TermIcon name="check" size={14} />
          <span>Cam đoan PTTT</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" loading={signing} onClick={handleSign}>
            <TermIcon name="edit" size={12} /> Ký
          </Btn>
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {/* Existing consents list */}
          {consents.length > 0 && (
            <Section title={`Cam đoan đã lập (${consents.length})`}>
              {consents.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: `1px solid ${selectedId === c.id ? 'var(--a-cy)' : 'var(--line)'}`,
                    borderRadius: 6, padding: '8px 10px', marginBottom: 6, fontSize: 'var(--fs-sm)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedId(c.id);
                    setForm({
                      consentType: c.consentType,
                      diagnosis: c.diagnosis ?? '',
                      plannedProcedure: c.plannedProcedure ?? '',
                      risks: c.risks ?? '',
                      alternatives: c.alternatives ?? '',
                      doctorExplanation: c.doctorExplanation ?? '',
                      signerName: c.signerName ?? '',
                      signerRelationship: c.signerRelationship ?? 'BN',
                    });
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b>{CONSENT_TYPE_OPTIONS.find((o) => o.value === c.consentType)?.label ?? `Loại ${c.consentType}`}</b>
                    {c.isSigned && (
                      <span className="chip ok" style={{ fontSize: 'var(--fs-xxs)' }}>
                        <TermIcon name="check" size={9} /> Đã ký — {c.signerName}
                      </span>
                    )}
                    {!c.isSigned && <span className="chip warn" style={{ fontSize: 'var(--fs-xxs)' }}>Chờ ký</span>}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Consent form */}
          <Section title={selectedId ? 'Chỉnh sửa cam đoan' : 'Lập cam đoan mới'}>
            <Row2 label="Loại cam đoan">
              <AbSelect
                options={CONSENT_TYPE_OPTIONS}
                value={form.consentType}
                onChange={(v) => set('consentType', Number(v))}
              />
            </Row2>
            <Row2 label="Chẩn đoán">
              <Input
                value={form.diagnosis}
                onChange={(e) => set('diagnosis', e.target.value)}
                placeholder="Chẩn đoán bệnh cần phẫu thuật…"
                size="small"
              />
            </Row2>
            <Row2 label="Phương pháp PT *">
              <Input
                value={form.plannedProcedure}
                onChange={(e) => set('plannedProcedure', e.target.value)}
                placeholder="Tên phẫu thuật / thủ thuật dự kiến…"
                size="small"
              />
            </Row2>
            <Row2 label="Rủi ro">
              <Input.TextArea
                rows={2}
                value={form.risks}
                onChange={(e) => set('risks', e.target.value)}
                placeholder="Các rủi ro có thể xảy ra…"
              />
            </Row2>
            <Row2 label="Phương án khác">
              <Input.TextArea
                rows={2}
                value={form.alternatives}
                onChange={(e) => set('alternatives', e.target.value)}
                placeholder="Các phương án điều trị khác nếu có…"
              />
            </Row2>
            <Row2 label="Giải thích BS">
              <Input.TextArea
                rows={2}
                value={form.doctorExplanation}
                onChange={(e) => set('doctorExplanation', e.target.value)}
                placeholder="Bác sĩ đã giải thích đầy đủ cho bệnh nhân / người nhà…"
              />
            </Row2>
          </Section>

          {/* Sign section */}
          {activeConsent && !activeConsent.isSigned && (
            <Section title="Ký cam đoan">
              <Row2 label="Người ký">
                <Input
                  value={form.signerName}
                  onChange={(e) => set('signerName', e.target.value)}
                  placeholder="Họ tên người ký (BN / người đại diện)…"
                  size="small"
                />
              </Row2>
              <Row2 label="Quan hệ với BN">
                <AbSelect
                  options={[
                    { value: 'BN', label: 'Bản thân bệnh nhân' },
                    { value: 'Vợ/chồng', label: 'Vợ / Chồng' },
                    { value: 'Cha/mẹ', label: 'Cha / Mẹ' },
                    { value: 'Con', label: 'Con' },
                    { value: 'Người giám hộ', label: 'Người giám hộ' },
                  ]}
                  value={form.signerRelationship || 'BN'}
                  onChange={(v) => set('signerRelationship', String(v))}
                />
              </Row2>
            </Section>
          )}

          {activeConsent?.isSigned && (
            <div style={{ color: 'var(--s-ok)', fontSize: 'var(--fs-sm)', padding: '8px 10px', background: 'var(--s-ok-bg)', borderRadius: 6 }}>
              <TermIcon name="check" size={12} /> Cam đoan đã được ký bởi {activeConsent.signerName} ({activeConsent.signerRelationship})
              {activeConsent.signedAt && ` — ${new Date(activeConsent.signedAt).toLocaleString('vi-VN')}`}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// PostAnesthesiaPlanModal — Kế hoạch sau gây mê – phẫu thuật (riêng)
//
// Lưu vào AnesthesiaRecord.PostSurgeryPlan + RecoveryNotes (2 trường riêng):
//  - RecoveryNotes  : diễn biến hồi tỉnh, điểm Aldrete
//  - PostSurgeryPlan: kế hoạch chăm sóc sau mổ (chế độ ăn, giảm đau, thay băng…)
// Dùng cùng endpoint /clinical-records/anesthesia (upsert theo surgeryId)
// ---------------------------------------------------------------------------

export interface PostAnesthesiaPlanModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface PostAnesthForm {
  recoveryNotes: string;    // Diễn biến hồi tỉnh
  postSurgeryPlan: string;  // Kế hoạch chăm sóc sau mổ
  status: number;
}

const EMPTY_POST: PostAnesthForm = {
  recoveryNotes: '',
  postSurgeryPlan: '',
  status: 1,
};

export const PostAnesthesiaPlanModal: React.FC<PostAnesthesiaPlanModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [form, setForm] = useState<PostAnesthForm>(EMPTY_POST);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PostAnesthForm>(k: K, v: PostAnesthForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const existing = Array.isArray(records) ? records[0] : null;
      if (existing) {
        setExistingId(existing.id);
        setForm({
          recoveryNotes: existing.recoveryNotes ?? '',
          postSurgeryPlan: existing.postSurgeryPlan ?? '',
          status: existing.status ?? 1,
        });
      } else {
        setExistingId(null);
        setForm(EMPTY_POST);
      }
    } catch {
      setForm(EMPTY_POST);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // In phiếu hồi tỉnh — fetch bản ghi đầy đủ (có monitors) + merge form hiện tại
  const handlePrint = async () => {
    if (!surgeryId) return;
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const base = (Array.isArray(records) ? records[0] : null) ?? {};
      printAnesthesiaRecovery({
        ...base,
        patientName: patientName ?? (base.patientName ?? ''),
        recoveryNotes: form.recoveryNotes || base.recoveryNotes || '',
        postSurgeryPlan: form.postSurgeryPlan || base.postSurgeryPlan || '',
      });
    } catch {
      te('Không in được phiếu hồi tỉnh');
    }
  };

  const handleSave = async () => {
    if (!form.recoveryNotes.trim() && !form.postSurgeryPlan.trim()) {
      tw('Nhập ít nhất diễn biến hồi tỉnh hoặc kế hoạch chăm sóc');
      return;
    }
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        // Preserve required fields (use defaults if record is new)
        asaClass: 1,
        mallampatiScore: 1,
        anesthesiaType: 'Gây mê toàn thân',
        recoveryNotes: form.recoveryNotes || undefined,
        postSurgeryPlan: form.postSurgeryPlan || undefined,
        status: form.status,
      });
      tk('Đã lưu kế hoạch sau gây mê – phẫu thuật');
      await load();
    } catch {
      te('Không thể lưu kế hoạch sau gây mê');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <TermIcon name="clipboard" size={14} />
          <span>Kế hoạch sau gây mê – phẫu thuật</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={handlePrint} title="In kế hoạch sau gây mê">
            <TermIcon name="print" size={12} /> In
          </Btn>
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Section title="Hồi tỉnh sau mổ">
            <Row2 label="Diễn biến hồi tỉnh">
              <Input.TextArea
                rows={4}
                value={form.recoveryNotes}
                onChange={(e) => set('recoveryNotes', e.target.value)}
                placeholder="Điểm Aldrete, thời gian hồi tỉnh, biến chứng, xử trí tại phòng hồi tỉnh…"
              />
            </Row2>
          </Section>

          <Section title="Kế hoạch chăm sóc sau phẫu thuật">
            <Row2 label="Kế hoạch chi tiết">
              <Input.TextArea
                rows={6}
                value={form.postSurgeryPlan}
                onChange={(e) => set('postSurgeryPlan', e.target.value)}
                placeholder={`Nhập kế hoạch chăm sóc sau mổ, ví dụ:\n- Chế độ ăn uống: ...\n- Giảm đau: ...\n- Thay băng / chăm sóc vết mổ: ...\n- Vật lý trị liệu: ...\n- Lịch tái khám: ...\n- Dấu hiệu cảnh báo cần đến viện ngay: ...`}
              />
            </Row2>
            <Row2 label="Trạng thái">
              <AbSelect
                options={[
                  { value: 0, label: 'Nháp' },
                  { value: 1, label: 'Đang theo dõi' },
                  { value: 2, label: 'Hoàn thành' },
                ]}
                value={form.status}
                onChange={(v) => set('status', Number(v))}
              />
            </Row2>
          </Section>
        </div>
      )}
    </ModalShell>
  );
};
