import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, App as AntdApp, Form, Input, InputNumber, Select as AntdSelect, Radio } from 'antd';
import { useNavigate } from 'react-router-dom';
import * as examinationApi from '../api/examination';
import type { MedicineDto, PrescriptionTemplateDto } from '../api/examination';
import * as patientApi from '../api/patient';
import type { Patient as ApiPatient } from '../api/patient';
import { getPrescriptionContext } from '../api/dataInheritance';
import type { PrescriptionContextDto } from '../api/dataInheritance';
import { getPrescriptions as getRecentPrescriptions } from '../api/patientPortal';
import { getSignatures } from '../api/digitalSignature';
import type { DocumentSignatureDto } from '../api/digitalSignature';
import { useSigningContext } from '../contexts/SigningContext';
import { PinEntryModal } from '../components/digital-signature';

/* ==========================================================================
   Types
   ========================================================================== */

interface Patient {
  id: string;
  patientCode: string;
  fullName: string;
  dateOfBirth?: string;
  gender: number;
  phoneNumber?: string;
  address?: string;
  allergies?: string[];
  insuranceNumber?: string;
  age?: number;
}

interface Medicine {
  id: string;
  code: string;
  name: string;
  activeIngredient: string;
  dosageForm: string;
  strength: string;
  unit: string;
  unitPrice: number;
  stock: number;
  insuranceCovered: boolean;
}

interface DosageInstruction {
  morning: number;
  noon: number;
  evening: number;
  night: number;
  beforeMeal: boolean;
  afterMeal: boolean;
}

interface PrescriptionItem {
  id: string;
  medicine: Medicine;
  dosageForm: string;
  strength: string;
  quantity: number;
  dosage: DosageInstruction;
  duration: number;
  route: string;
  notes?: string;
  totalDose: number;
  totalCost: number;
  insuranceCoverage: number;
}

interface DrugInteraction {
  medicine1: string;
  medicine2: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  recommendation?: string;
}

interface RecentPrescriptionDto {
  id: string;
  prescriptionCode?: string;
  prescriptionDate: string;
  patientId?: string;
  patientCode?: string;
  patientName?: string;
  diagnosis?: string;
  doctorName?: string;
  status: string;
}

const convertMedicine = (dto: MedicineDto): Medicine => ({
  id: dto.id,
  code: dto.code,
  name: dto.name,
  activeIngredient: dto.activeIngredient || '',
  dosageForm: dto.unit || 'Viên',
  strength: '',
  unit: dto.unit || 'Viên',
  unitPrice: dto.unitPrice,
  stock: dto.availableQuantity,
  insuranceCovered: dto.insurancePrice > 0,
});

const formatDosage = (d: DosageInstruction): string => {
  const parts: string[] = [];
  if (d.morning > 0) parts.push(`S:${d.morning}`);
  if (d.noon > 0)    parts.push(`T:${d.noon}`);
  if (d.evening > 0) parts.push(`C:${d.evening}`);
  if (d.night > 0)   parts.push(`Tối:${d.night}`);
  let r = parts.join(' · ');
  if (d.beforeMeal) r += ' (trước ăn)';
  else if (d.afterMeal) r += ' (sau ăn)';
  return r || '—';
};

const calcAge = (dob?: string): number => {
  if (!dob) return 0;
  return dayjs().diff(dayjs(dob), 'year');
};

/* ==========================================================================
   Main component
   ========================================================================== */

const PrescriptionV2: React.FC = () => {
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [medicineForm] = Form.useForm();
  const { sessionActive, openSession, tryAutoOpenSession, signDocument } = useSigningContext();

  // URL params
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const urlType = urlParams.get('type') === 'external' ? 2 : 1;

  const [rxType, setRxType]             = useState<1 | 2>(urlType as 1 | 2);
  const [patient, setPatient]           = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis]       = useState('');
  const [items, setItems]               = useState<PrescriptionItem[]>([]);
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [rxContext, setRxContext]       = useState<PrescriptionContextDto | null>(null);
  const [notes, setNotes]               = useState('Uống đúng giờ, đủ liều. Tái khám khi có dấu hiệu bất thường.');
  const [loadingPatient, setLoadingPatient] = useState(false);

  // Modals
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchKw, setPatientSearchKw]     = useState('');
  const [patientResults, setPatientResults]       = useState<ApiPatient[]>([]);

  const [medModalOpen, setMedModalOpen]       = useState(false);
  const [medSearchKw, setMedSearchKw]         = useState('');
  const [medResults, setMedResults]           = useState<Medicine[]>([]);
  const [selectedMed, setSelectedMed]         = useState<Medicine | null>(null);
  const [editingItemId, setEditingItemId]     = useState<string | null>(null);

  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen]     = useState(false);
  const [templates, setTemplates]                   = useState<PrescriptionTemplateDto[]>([]);
  const [tplName, setTplName]                       = useState('');

  const [interactionsDrawerOpen, setInteractionsDrawerOpen] = useState(false);

  // Recent prescriptions (shown when no patient selected)
  const [recent, setRecent]           = useState<RecentPrescriptionDto[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // PIN signing
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading]     = useState(false);
  const [pinError, setPinError]         = useState('');
  const [signatureMap, setSignatureMap] = useState<Map<string, DocumentSignatureDto>>(new Map());
  const [currentPrescriptionId, setCurrentPrescriptionId] = useState<string | null>(null);

  // Derived totals
  const totals = useMemo(() => {
    const total = items.reduce((s, i) => s + i.totalCost, 0);
    const bhyt  = items.reduce((s, i) => s + i.insuranceCoverage, 0);
    return { total, bhyt, final: total - bhyt };
  }, [items]);

  /* ----- data loaders ----- */

  useEffect(() => {
    (async () => {
      try {
        const r = await examinationApi.getPrescriptionTemplates();
        if (Array.isArray(r.data)) setTemplates(r.data);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    setLoadingRecent(true);
    getRecentPrescriptions()
      .then((r) => {
        const data = (r.data ?? []) as unknown as RecentPrescriptionDto[];
        setRecent(Array.isArray(data) ? data : []);
      })
      .catch(() => setRecent([]))
      .finally(() => setLoadingRecent(false));
  }, []);

  // Drug interaction check on items change
  useEffect(() => {
    if (items.length <= 1) { setInteractions([]); return; }
    (async () => {
      try {
        const ids = items.map((i) => i.medicine.id);
        const r = await examinationApi.checkDrugInteractions(ids);
        const apiData = r.data;
        if (Array.isArray(apiData)) {
          const mapped = apiData.map((dto: {
            drug1Name?: string; drug2Name?: string;
            severity?: number; severityName?: string;
            description?: string; recommendation?: string;
          }): DrugInteraction => ({
            medicine1: dto.drug1Name || '',
            medicine2: dto.drug2Name || '',
            severity: dto.severity === 3 || dto.severityName === 'high' ? 'high'
                    : dto.severity === 2 || dto.severityName === 'medium' ? 'medium'
                    : 'low',
            description: dto.description || '',
            recommendation: dto.recommendation,
          }));
          setInteractions(mapped);
        }
      } catch { setInteractions([]); }
    })();
  }, [items]);

  /* ----- patient handlers ----- */

  const handleSearchPatient = async (kw: string) => {
    if (!kw || kw.length < 2) { setPatientResults([]); return; }
    setLoadingPatient(true);
    try {
      const r = await patientApi.patientApi.search({ keyword: kw, pageSize: 10 });
      if (r.success && r.data?.items) setPatientResults(r.data.items);
      else setPatientResults([]);
    } catch {
      message.warning('Không thể tìm kiếm bệnh nhân');
      setPatientResults([]);
    } finally { setLoadingPatient(false); }
  };

  const handleSelectPatient = async (ap: ApiPatient) => {
    const p: Patient = {
      id: ap.id, patientCode: ap.patientCode, fullName: ap.fullName,
      dateOfBirth: ap.dateOfBirth, gender: ap.gender,
      phoneNumber: ap.phoneNumber, address: ap.address,
      insuranceNumber: ap.insuranceNumber,
      age: calcAge(ap.dateOfBirth),
      allergies: [],
    };
    setPatient(p);
    setPatientSearchOpen(false);
    setPatientResults([]);
    message.success(`Đã chọn bệnh nhân: ${p.fullName}`);

    // Auto-inherit from OPD if examined today
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const ex = await examinationApi.searchExaminations({
        patientCode: ap.patientCode, fromDate: today, toDate: today,
        pageIndex: 0, pageSize: 1,
      });
      const exItems = ex.data?.items || ex.data;
      if (Array.isArray(exItems) && exItems.length > 0) {
        const examId = exItems[0].id;
        const ctx = await getPrescriptionContext(examId);
        if (ctx.data) {
          setRxContext(ctx.data);
          if (ctx.data.mainDiagnosis) {
            const d = `${ctx.data.mainIcdCode || ''} - ${ctx.data.mainDiagnosis}`.trim();
            setDiagnosis(d);
          }
          if (ctx.data.allergies && ctx.data.allergies.length > 0) {
            p.allergies = ctx.data.allergies.map((a) => a.allergenName);
            setPatient({ ...p });
          }
        }
      }
    } catch { setRxContext(null); }
  };

  const handleSelectRecent = async (r: RecentPrescriptionDto) => {
    if (!r.patientId) { message.warning('Đơn thuốc không có mã BN'); return; }
    setLoadingPatient(true);
    try {
      const res = await patientApi.patientApi.getById(r.patientId);
      const ap = res.data;
      if (ap) {
        await handleSelectPatient(ap);
        if (r.diagnosis) setDiagnosis(r.diagnosis);
      }
    } catch { message.warning('Không thể tải BN'); }
    finally { setLoadingPatient(false); }
  };

  /* ----- medicine handlers ----- */

  const handleSearchMedicine = async (kw: string) => {
    if (!kw || kw.length < 2) { setMedResults([]); return; }
    try {
      const r = await examinationApi.searchMedicines(kw, undefined, 20);
      if (Array.isArray(r.data)) setMedResults(r.data.map(convertMedicine));
      else setMedResults([]);
    } catch { setMedResults([]); }
  };

  const openAddMedicine = () => {
    setEditingItemId(null);
    setSelectedMed(null);
    medicineForm.resetFields();
    setMedResults([]);
    setMedSearchKw('');
    setMedModalOpen(true);
  };

  const openEditMedicine = (it: PrescriptionItem) => {
    setEditingItemId(it.id);
    setSelectedMed(it.medicine);
    medicineForm.setFieldsValue({
      medicine: it.medicine.name,
      dosageForm: it.dosageForm, strength: it.strength,
      quantity: it.quantity,
      morning: it.dosage.morning, noon: it.dosage.noon,
      evening: it.dosage.evening, night: it.dosage.night,
      mealTiming: it.dosage.beforeMeal ? 'before' : it.dosage.afterMeal ? 'after' : undefined,
      duration: it.duration, route: it.route, notes: it.notes,
    });
    setMedModalOpen(true);
  };

  const handleAddOrUpdateMedicine = () => {
    medicineForm.validateFields().then((v) => {
      if (!selectedMed) { message.warning('Vui lòng chọn thuốc'); return; }
      const dosage: DosageInstruction = {
        morning: v.morning || 0, noon: v.noon || 0,
        evening: v.evening || 0, night: v.night || 0,
        beforeMeal: v.mealTiming === 'before',
        afterMeal: v.mealTiming === 'after',
      };
      const dailyDose = dosage.morning + dosage.noon + dosage.evening + dosage.night;
      const totalDose = dailyDose * v.duration;
      const total = v.quantity * selectedMed.unitPrice;
      const bhytRate = (selectedMed.insuranceCovered && !!patient?.insuranceNumber) ? 0.8 : 0;
      const bhyt = Math.round(total * bhytRate);

      const newItem: PrescriptionItem = {
        id: editingItemId || Date.now().toString(),
        medicine: selectedMed,
        dosageForm: v.dosageForm, strength: v.strength || '',
        quantity: v.quantity, dosage, duration: v.duration,
        route: v.route || 'Uống', notes: v.notes,
        totalDose, totalCost: total, insuranceCoverage: bhyt,
      };

      if (editingItemId) {
        setItems((prev) => prev.map((i) => i.id === editingItemId ? newItem : i));
        message.success('Cập nhật thuốc thành công');
      } else {
        setItems((prev) => [...prev, newItem]);
        message.success('Đã thêm thuốc');
      }
      setMedModalOpen(false);
    });
  };

  const handleDeleteMedicine = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    message.success('Đã xoá thuốc');
  };

  /* ----- template handlers ----- */

  const handleLoadTemplate = (t: PrescriptionTemplateDto) => {
    if (t.description) setDiagnosis(t.description);
    setTemplatePickerOpen(false);
    message.success(`Đã tải mẫu đơn: ${t.templateName}`);
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim()) { message.warning('Nhập tên mẫu'); return; }
    if (items.length === 0) { message.warning('Đơn chưa có thuốc'); return; }
    try {
      await examinationApi.createPrescriptionTemplate({
        id: '', templateName: tplName.trim(),
        description: diagnosis, items: [],
        templateType: 1, isShared: false,
      } as PrescriptionTemplateDto);
      message.success('Đã lưu mẫu đơn');
      setSaveTemplateOpen(false);
      setTplName('');
      // Reload templates
      const r = await examinationApi.getPrescriptionTemplates();
      if (Array.isArray(r.data)) setTemplates(r.data);
    } catch { message.error('Lưu mẫu thất bại'); }
  };

  /* ----- save + sign handlers ----- */

  const handleSaveDraft = async () => {
    if (!patient) { message.warning('Vui lòng chọn bệnh nhân'); return; }
    if (items.length === 0) { message.warning('Đơn thuốc chưa có thuốc'); return; }
    try {
      const dto = {
        patientId: patient.id,
        prescriptionDate: dayjs().toISOString(),
        diagnosis,
        notes,
        prescriptionType: rxType,
        items: items.map((i) => ({
          medicineId: i.medicine.id,
          quantity: i.quantity,
          dosageInstruction: formatDosage(i.dosage),
          duration: i.duration,
          route: i.route,
          notes: i.notes,
        })),
      };
      // Backend DTO type widening — the API accepts this shape
      const r = await examinationApi.createPrescription(dto as unknown as Parameters<typeof examinationApi.createPrescription>[0]);
      if (r.data?.id) setCurrentPrescriptionId(r.data.id);
      message.success('Đã lưu đơn thuốc nháp');
    } catch {
      message.error('Lưu đơn thất bại');
    }
  };

  const handlePinSubmit = async (pin: string) => {
    setPinLoading(true); setPinError('');
    try {
      const r = await openSession(pin);
      if (r.success) {
        setPinModalOpen(false);
        message.success('Phiên ký số đã mở');
        if (currentPrescriptionId) doSign(currentPrescriptionId);
      } else setPinError(r.message || 'PIN không đúng');
    } catch { setPinError('Không thể kết nối USB Token'); }
    finally { setPinLoading(false); }
  };

  const doSign = async (id: string) => {
    try {
      const r = await signDocument(id, 'Prescription', 'Ký xác nhận đơn thuốc');
      if (r.success) {
        message.success('Ký đơn thuốc thành công');
        const s = await getSignatures(id);
        if (s.data.length > 0) setSignatureMap((prev) => new Map(prev).set(id, s.data[0]));
      } else message.warning(r.message || 'Ký số thất bại');
    } catch { message.warning('Lỗi ký số'); }
  };

  const handleSignAndComplete = async () => {
    if (!patient || items.length === 0) {
      message.warning('Chưa đủ thông tin để ký');
      return;
    }
    // Save first if not saved
    let pid = currentPrescriptionId;
    if (!pid) {
      await handleSaveDraft();
      pid = currentPrescriptionId;
      if (!pid) return;
    }
    if (!sessionActive) {
      try {
        const r = await tryAutoOpenSession();
        if (r.success) {
          message.success(`Đã kết nối chứng thư số: ${r.caProvider || 'Windows'}`);
          doSign(pid);
          return;
        }
      } catch { /* fallback */ }
      setPinModalOpen(true);
      return;
    }
    doSign(pid);
  };

  /* ----- print ----- */

  const handlePrint = () => {
    if (!patient) { message.warning('Chưa chọn BN'); return; }
    window.print();
  };

  /* ----- reset ----- */

  const handleReset = () => {
    modal.confirm({
      title: 'Xoá đơn hiện tại?',
      content: 'Toàn bộ thuốc và chẩn đoán sẽ bị xoá khỏi form.',
      okText: 'Xoá',
      cancelText: 'Huỷ',
      onOk: () => {
        setPatient(null);
        setDiagnosis('');
        setItems([]);
        setInteractions([]);
        setRxContext(null);
        setCurrentPrescriptionId(null);
        message.info('Đã reset form');
      },
    });
  };

  const signature = currentPrescriptionId ? signatureMap.get(currentPrescriptionId) : undefined;
  const critInteractions = interactions.filter((i) => i.severity === 'high').length;

  return (
    <div className="px-wrap">
      {/* ====== TOP BAR ====== */}
      <div className="px-top">
        <div className="px-top-left">
          <div className="px-top-title">
            <b>Kê đơn thuốc</b>
            <span className="meta">{dayjs().format('DD/MM/YYYY · HH:mm')}</span>
          </div>
          <Radio.Group
            value={rxType}
            onChange={(e) => setRxType(e.target.value)}
            buttonStyle="solid"
            size="small"
          >
            <Radio.Button value={1}>🏥 Toa BHYT/Thu phí (F3)</Radio.Button>
            <Radio.Button value={2}>💊 Toa mua ngoài (F5)</Radio.Button>
          </Radio.Group>
        </div>
        <div className="px-top-right">
          <button className="btn sm" onClick={() => setTemplatePickerOpen(true)}>📋 Mẫu đơn</button>
          <button className="btn sm" onClick={() => setSaveTemplateOpen(true)}>💾 Lưu mẫu</button>
          <button className="btn sm ghost" onClick={handleReset}>↺ Làm mới</button>
        </div>
      </div>

      {/* ====== MAIN 3-COL ====== */}
      <div className="px-grid">
        {/* LEFT: patient ===== */}
        <div className="px-col">
          <div className="px-col-h">
            <b>Bệnh nhân</b>
            <button
              className="btn sm primary"
              onClick={() => setPatientSearchOpen(true)}
            >🔍 Tìm BN</button>
          </div>

          {!patient ? (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: 14 }}>
                <div className="ph" style={{ padding: 24 }}>
                  Chọn bệnh nhân để bắt đầu kê đơn<br />
                  hoặc chọn đơn thuốc gần đây bên dưới.
                </div>
              </div>
              <div className="px-sec-h">Đơn thuốc gần đây</div>
              <div className="px-recent">
                {loadingRecent ? (
                  <div className="ph" style={{ margin: 14 }}>Đang tải...</div>
                ) : recent.length === 0 ? (
                  <div className="ph" style={{ margin: 14 }}>Chưa có đơn thuốc gần đây</div>
                ) : recent.slice(0, 12).map((r) => (
                  <div
                    key={r.id}
                    className="px-recent-row"
                    onClick={() => handleSelectRecent(r)}
                  >
                    <div className="px-recent-h">
                      <span className="mono">{r.prescriptionCode || r.id.slice(0, 8)}</span>
                      <span className={'chip ' + (r.status === 'completed' ? 'ok' : r.status === 'draft' ? 'warn' : 'info')}>
                        {r.status}
                      </span>
                    </div>
                    <div className="px-recent-n">{r.patientName || '—'}</div>
                    <div className="px-recent-m">
                      <span>{dayjs(r.prescriptionDate).format('DD/MM HH:mm')}</span>
                      {r.diagnosis && <span>· {r.diagnosis}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-patient">
              <div className="px-patient-head">
                <div className="px-avatar">{patient.fullName.split(' ').slice(-1)[0][0]}</div>
                <div>
                  <div className="px-patient-n">{patient.fullName}</div>
                  <div className="px-patient-m">
                    <span><b>{patient.patientCode}</b></span>
                    <span>{patient.age || calcAge(patient.dateOfBirth)}t · {patient.gender === 1 ? 'Nam' : 'Nữ'}</span>
                  </div>
                </div>
              </div>
              <div className="px-patient-body">
                {patient.phoneNumber && <Fld l="SĐT" v={patient.phoneNumber} />}
                {patient.address && <Fld l="Địa chỉ" v={patient.address} />}
                {patient.insuranceNumber ? (
                  <Fld l="BHYT" v={<><span className="mono">{patient.insuranceNumber}</span> <span className="chip ok" style={{ marginLeft: 6 }}>✓ HL</span></>} />
                ) : (
                  <Fld l="BHYT" v={<span style={{ color: 'var(--t-3)' }}>Không có · thu 100%</span>} />
                )}
                {patient.allergies && patient.allergies.length > 0 && (
                  <div className="px-allergy">
                    <b>⚠ Dị ứng:</b> {patient.allergies.join(', ')}
                  </div>
                )}
                {rxContext?.mainIcdCode && (
                  <div className="px-opd-ctx">
                    <div className="px-sec-h">Từ phiếu khám (OPD)</div>
                    <Fld l="Chẩn đoán chính" v={`${rxContext.mainIcdCode} - ${rxContext.mainDiagnosis || ''}`} />
                    {(rxContext.bloodPressureSystolic || rxContext.pulse) && (
                      <Fld l="Sinh hiệu" v={`HA ${rxContext.bloodPressureSystolic ? `${rxContext.bloodPressureSystolic}/${rxContext.bloodPressureDiastolic ?? '—'}` : '—'} · Mạch ${rxContext.pulse || '—'}`} />
                    )}
                  </div>
                )}
                <div className="px-patient-totals">
                  <div><span className="l">Tổng số thuốc</span><b>{items.length}</b></div>
                  <div><span className="l">Tổng tiền</span><b>{totals.total.toLocaleString('vi-VN')} đ</b></div>
                  <div><span className="l">BHYT chi trả</span><b style={{ color: 'var(--s-ok)' }}>−{totals.bhyt.toLocaleString('vi-VN')} đ</b></div>
                  <div className="total"><span className="l">BN phải trả</span><b>{totals.final.toLocaleString('vi-VN')} đ</b></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MIDDLE: prescription editor ===== */}
        <div className="px-col px-col-main">
          <div className="px-col-h">
            <b>Đơn thuốc</b>
            {critInteractions > 0 && (
              <button
                type="button"
                className="chip crit"
                style={{ cursor: 'pointer', height: 22 }}
                onClick={() => setInteractionsDrawerOpen(true)}
              >⚠ {critInteractions} tương tác nghiêm trọng</button>
            )}
            {signature && (
              <span className="chip ok" style={{ marginLeft: 'auto' }}>
                ✓ Đã ký · {dayjs(signature.signedAt).format('HH:mm DD/MM')}
              </span>
            )}
          </div>

          <div className="px-body">
            <div className="px-sec-h">Chẩn đoán</div>
            <textarea
              className="px-input"
              style={{ minHeight: 54 }}
              placeholder="Nhập chẩn đoán ICD-10 hoặc free text..."
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />

            <div className="px-sec-h" style={{ marginTop: 14 }}>
              Danh sách thuốc · <b>{items.length}</b> khoản
              <button
                className="btn sm primary"
                style={{ marginLeft: 'auto' }}
                onClick={openAddMedicine}
                disabled={!patient}
              >+ Thêm thuốc (F8)</button>
            </div>

            {items.length === 0 ? (
              <div className="ph" style={{ margin: '10px 0' }}>
                Chưa có thuốc nào trong đơn. Nhấn "+ Thêm thuốc" để bắt đầu.
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 30 }}>#</th>
                    <th>Thuốc</th>
                    <th>Liều dùng</th>
                    <th className="num">SL</th>
                    <th className="num">Ngày</th>
                    <th className="num">Giá</th>
                    <th style={{ width: 80 }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id}>
                      <td>{i + 1}</td>
                      <td>
                        <b>{it.medicine.name}</b>
                        <div className="mono" style={{ fontSize: 10, color: 'var(--t-3)' }}>
                          {it.medicine.code} · {it.medicine.activeIngredient}
                        </div>
                      </td>
                      <td>
                        <div>{formatDosage(it.dosage)}</div>
                        {it.notes && <div style={{ fontSize: 10, color: 'var(--t-2)' }}>{it.notes}</div>}
                      </td>
                      <td className="num">{it.quantity}</td>
                      <td className="num">{it.duration}</td>
                      <td className="num">{it.totalCost.toLocaleString('vi-VN')}</td>
                      <td>
                        <button
                          className="btn sm ghost"
                          onClick={() => openEditMedicine(it)}
                          style={{ padding: '0 6px', marginRight: 2 }}
                        >✏</button>
                        <button
                          className="btn sm ghost"
                          onClick={() => handleDeleteMedicine(it.id)}
                          style={{ padding: '0 6px', color: 'var(--s-crit)' }}
                        >🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="px-sec-h" style={{ marginTop: 14 }}>Lời dặn BN</div>
            <textarea
              className="px-input"
              style={{ minHeight: 60 }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Footer actions */}
          <div className="px-actions">
            <div className="px-status" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-2)' }}>
              {patient ? `BN: ${patient.fullName}` : '— chưa chọn BN —'}
              {items.length > 0 && ` · ${items.length} khoản · ${totals.final.toLocaleString('vi-VN')} đ`}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn" onClick={handleSaveDraft} disabled={!patient}>
                💾 Lưu nháp
              </button>
              <button className="btn" onClick={handlePrint} disabled={!patient}>
                ⎙ In đơn
              </button>
              <button className="btn primary" onClick={handleSignAndComplete} disabled={!patient || items.length === 0}>
                ✓ Lưu &amp; Ký số (F2)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: summary ===== */}
        <div className="px-col">
          <div className="px-col-h">
            <b>Tổng kết</b>
            <span className="meta">real-time</span>
          </div>
          <div className="px-summary">
            <div className="px-sum-row">
              <span>Tổng chi phí</span>
              <b>{totals.total.toLocaleString('vi-VN')} đ</b>
            </div>
            <div className="px-sum-row">
              <span>BHYT chi trả</span>
              <b style={{ color: 'var(--s-ok)' }}>
                −{totals.bhyt.toLocaleString('vi-VN')} đ
              </b>
            </div>
            <div className="px-sum-row total">
              <span>Bệnh nhân trả</span>
              <b>{totals.final.toLocaleString('vi-VN')} đ</b>
            </div>
          </div>

          {interactions.length > 0 && (
            <>
              <div className="px-sec-h" style={{ padding: '10px 14px 0', margin: 0 }}>Tương tác thuốc</div>
              <div style={{ padding: '0 10px 14px' }}>
                {interactions.slice(0, 4).map((it, i) => (
                  <div
                    key={i}
                    className={'px-interaction ' + it.severity}
                    onClick={() => setInteractionsDrawerOpen(true)}
                  >
                    <div className="px-ia-h">
                      <span className={'chip ' + (it.severity === 'high' ? 'crit' : it.severity === 'medium' ? 'warn' : 'info')}>
                        {it.severity === 'high' ? 'NGHIÊM' : it.severity === 'medium' ? 'TRUNG BÌNH' : 'NHẸ'}
                      </span>
                    </div>
                    <div className="px-ia-p">{it.medicine1} × {it.medicine2}</div>
                    <div className="px-ia-d">{it.description}</div>
                  </div>
                ))}
                {interactions.length > 4 && (
                  <button
                    className="btn sm ghost"
                    style={{ width: '100%', marginTop: 6 }}
                    onClick={() => setInteractionsDrawerOpen(true)}
                  >Xem tất cả ({interactions.length})</button>
                )}
              </div>
            </>
          )}

          {rxContext?.allergies && rxContext.allergies.length > 0 && (
            <>
              <div className="px-sec-h" style={{ padding: '10px 14px 0', margin: 0 }}>Cảnh báo dị ứng</div>
              <div style={{ padding: '0 14px 14px' }}>
                {rxContext.allergies.map((a, i) => (
                  <div key={i} className="px-allergy-row">
                    <span>⚠</span> {a.allergenName}
                    {a.severity && <span style={{ color: 'var(--t-2)', fontSize: 11 }}> · {a.severity}</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ============ MODALS ============ */}

      {/* Patient search */}
      <Modal
        open={patientSearchOpen}
        onCancel={() => setPatientSearchOpen(false)}
        width={720}
        title="Tìm bệnh nhân"
        footer={null}
      >
        <Input.Search
          placeholder="Tìm theo tên, mã BN, CCCD, SĐT..."
          value={patientSearchKw}
          onChange={(e) => setPatientSearchKw(e.target.value)}
          onSearch={handleSearchPatient}
          enterButton="Tìm"
          loading={loadingPatient}
          autoFocus
          allowClear
        />
        <div style={{ maxHeight: 420, overflow: 'auto', marginTop: 12 }}>
          {patientResults.length === 0 ? (
            <div className="ph" style={{ padding: 24 }}>
              {patientSearchKw.length >= 2 ? 'Không tìm thấy' : 'Gõ ít nhất 2 ký tự để tìm'}
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Họ tên</th>
                  <th>Tuổi · Giới</th>
                  <th>SĐT</th>
                  <th>BHYT</th>
                </tr>
              </thead>
              <tbody>
                {patientResults.map((p) => (
                  <tr key={p.id} onClick={() => handleSelectPatient(p)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{p.patientCode}</td>
                    <td><b>{p.fullName}</b></td>
                    <td>{calcAge(p.dateOfBirth)}t · {p.gender === 1 ? 'Nam' : 'Nữ'}</td>
                    <td className="mono">{p.phoneNumber || '—'}</td>
                    <td className="mono">
                      {p.insuranceNumber ? <span className="chip ok">{p.insuranceNumber}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Modal>

      {/* Add/Edit medicine */}
      <Modal
        open={medModalOpen}
        onCancel={() => setMedModalOpen(false)}
        width={720}
        title={editingItemId ? 'Sửa thuốc' : 'Thêm thuốc vào đơn'}
        footer={[
          <button key="c" type="button" className="btn ghost" onClick={() => setMedModalOpen(false)}>Huỷ</button>,
          <button key="a" type="button" className="btn primary" onClick={handleAddOrUpdateMedicine}>
            {editingItemId ? 'Cập nhật' : 'Thêm vào đơn'}
          </button>,
        ]}
      >
        {!editingItemId && (
          <>
            <Input.Search
              placeholder="Tìm theo tên thuốc / hoạt chất / mã..."
              value={medSearchKw}
              onChange={(e) => setMedSearchKw(e.target.value)}
              onSearch={handleSearchMedicine}
              enterButton="Tìm"
              allowClear
              autoFocus
            />
            {medResults.length > 0 && (
              <div style={{ maxHeight: 200, overflow: 'auto', marginTop: 8, border: '1px solid #e4e9f0', borderRadius: 6 }}>
                {medResults.map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMed(m);
                      medicineForm.setFieldsValue({
                        medicine: m.name, dosageForm: m.dosageForm,
                        strength: m.strength, route: 'Uống',
                      });
                    }}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f4f9',
                      cursor: 'pointer',
                      background: selectedMed?.id === m.id ? '#eff5ff' : '#fff',
                    }}
                  >
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b' }}>
                      {m.code} · {m.activeIngredient} · Tồn {m.stock} {m.unit} · {m.unitPrice.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <Form
          form={medicineForm}
          layout="vertical"
          style={{ marginTop: editingItemId ? 0 : 12 }}
          initialValues={{
            morning: 1, noon: 0, evening: 0, night: 1,
            duration: 7, route: 'Uống', mealTiming: 'after',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Form.Item name="medicine" label="Thuốc" style={{ gridColumn: 'span 2' }}>
              <Input disabled />
            </Form.Item>
            <Form.Item name="dosageForm" label="Dạng bào chế"><Input /></Form.Item>
            <Form.Item name="strength" label="Hàm lượng"><Input /></Form.Item>

            <Form.Item name="morning" label="Sáng" rules={[{ required: true }]}><InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="noon" label="Trưa" rules={[{ required: true }]}><InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="evening" label="Chiều" rules={[{ required: true }]}><InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="night" label="Tối" rules={[{ required: true }]}><InputNumber min={0} max={10} step={0.5} style={{ width: '100%' }} /></Form.Item>

            <Form.Item name="mealTiming" label="Thời điểm" style={{ gridColumn: 'span 2' }}>
              <Radio.Group>
                <Radio value="before">Trước ăn</Radio>
                <Radio value="after">Sau ăn</Radio>
                <Radio value="anytime">Bất kỳ</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item name="duration" label="Số ngày" rules={[{ required: true }]}><InputNumber min={1} max={365} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="quantity" label="Tổng SL" rules={[{ required: true }]}><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="route" label="Đường dùng">
              <AntdSelect options={[
                { value: 'Uống', label: 'Uống (PO)' },
                { value: 'Tiêm IV', label: 'Tiêm IV' },
                { value: 'Tiêm IM', label: 'Tiêm IM' },
                { value: 'Tiêm SC', label: 'Tiêm SC' },
                { value: 'Bôi', label: 'Bôi ngoài' },
                { value: 'Nhỏ', label: 'Nhỏ mắt/tai/mũi' },
              ]} />
            </Form.Item>
            <Form.Item name="notes" label="Ghi chú" style={{ gridColumn: 'span 2' }}><Input /></Form.Item>
          </div>
        </Form>
      </Modal>

      {/* Template picker */}
      <Modal
        open={templatePickerOpen}
        onCancel={() => setTemplatePickerOpen(false)}
        width={600}
        title="Chọn mẫu đơn"
        footer={null}
      >
        {templates.length === 0 ? (
          <div className="ph" style={{ padding: 24 }}>Chưa có mẫu đơn</div>
        ) : (
          <table className="tbl">
            <thead><tr><th>Tên mẫu</th><th>Mô tả</th><th style={{ width: 80 }} /></tr></thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id}>
                  <td><b>{t.templateName}</b></td>
                  <td>{t.description || '—'}</td>
                  <td>
                    <button className="btn sm primary" onClick={() => handleLoadTemplate(t)}>Chọn</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* Save template */}
      <Modal
        open={saveTemplateOpen}
        onCancel={() => setSaveTemplateOpen(false)}
        width={480}
        title="Lưu đơn hiện tại thành mẫu"
        footer={[
          <button key="c" type="button" className="btn ghost" onClick={() => setSaveTemplateOpen(false)}>Huỷ</button>,
          <button key="s" type="button" className="btn primary" onClick={handleSaveTemplate}>Lưu mẫu</button>,
        ]}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Tên mẫu *</div>
          <Input
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="VD: Mẫu THA + ĐTĐ"
            autoFocus
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--t-2)' }}>
          Gồm: Chẩn đoán "{diagnosis || '—'}" và {items.length} thuốc.
        </div>
      </Modal>

      {/* Interactions drawer — full list */}
      <Modal
        open={interactionsDrawerOpen}
        onCancel={() => setInteractionsDrawerOpen(false)}
        width={720}
        title={`Tương tác thuốc (${interactions.length})`}
        footer={null}
      >
        {interactions.map((it, i) => (
          <div key={i} className={'px-interaction ' + it.severity} style={{ marginBottom: 10, cursor: 'default' }}>
            <div className="px-ia-h">
              <span className={'chip ' + (it.severity === 'high' ? 'crit' : it.severity === 'medium' ? 'warn' : 'info')}>
                {it.severity === 'high' ? 'NGHIÊM TRỌNG' : it.severity === 'medium' ? 'TRUNG BÌNH' : 'NHẸ'}
              </span>
            </div>
            <div className="px-ia-p" style={{ fontSize: 14 }}>{it.medicine1} × {it.medicine2}</div>
            <div className="px-ia-d" style={{ fontSize: 13 }}>{it.description}</div>
            {it.recommendation && (
              <div style={{
                marginTop: 6, padding: '6px 10px',
                background: '#eff6ff', borderRadius: 4, fontSize: 12,
              }}>
                <b>Khuyến nghị:</b> {it.recommendation}
              </div>
            )}
          </div>
        ))}
      </Modal>

      {/* PIN entry modal */}
      <PinEntryModal
        open={pinModalOpen}
        onSubmit={handlePinSubmit}
        onCancel={() => setPinModalOpen(false)}
        loading={pinLoading}
        error={pinError}
      />
    </div>
  );
};

/* ==========================================================================
   Sub-components
   ========================================================================== */

const Fld: React.FC<{ l: string; v: React.ReactNode }> = ({ l, v }) => (
  <div className="px-fld">
    <div className="px-fld-l">{l}</div>
    <div className="px-fld-v">{v}</div>
  </div>
);

export default PrescriptionV2;
