/**
 * Theo doi dieu tri (B1.5)
 * Slice-1: Sinh hieu · Chuyen khoa · Chi dinh suat an
 * Slice-2: Truyen dich · Truyen mau · Bang ke vien phi 6556
 * All APIs verified in frontend/src/api/inpatient.ts
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select, DatePicker, Checkbox, Tag } from 'antd';
import {
  LineChart, Line,
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  createVitalSigns, getVitalSignsChart,
  transferDepartment,
  createNutritionOrder,
  createInfusionRecord,
  createBloodTransfusion,
  getBillingStatement6556,
  printBillingStatement6556,
  getPrescriptions,
  createPrescription,
  getAdmissionServiceRequests,
  cancelServiceRequests,
  updateServiceRequestPaymentType,
  getDiagnosisFromRecord,
  saveInpatientDiagnosis,
  getTreatmentSheets,
  printTreatmentSheet,
  getTreatmentStatAggregate,
  type TreatmentSheetDto,
  type TreatmentStatAggregateDto,
} from '../../api/inpatient';
import { getWarehouses } from '../../api/warehouse';
import type { WarehouseDto } from '../../api/warehouse';
import type {
  CreateVitalSignsDto,
  VitalSignsChartDto,
  DepartmentTransferDto,
  CreateNutritionOrderDto,
  CreateInfusionRecordDto,
  CreateBloodTransfusionDto,
  BillingStatement6556Dto,
  InpatientListDto,
  InpatientPrescriptionDto,
  InpatientMedicineItemDto,
  InpatientServiceRequestItemDto,
  SecondaryDiagnosisItemDto,
} from '../../api/inpatient';
import { catalogApi } from '../../api/system';
import type { DepartmentCatalogDto } from '../../api/system';
import { ModalShell, Btn } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import BedLabResultSection from './BedLabResultSection';
import { CabinetIssueModal, ItemPicker } from '../shared/CabinetIssueModal';
import { InpatientPrescriptionModal } from './InpatientPrescriptionModal';
import { InpatientServiceOrderCreateModal } from './InpatientServiceOrderCreateModal';
import DischargeModal from './DischargeModal';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const IpFld: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>
    {children}
  </div>
);

const MEAL_TYPES = [
  { value: 1, label: 'Bữa sáng' },
  { value: 2, label: 'Bữa trưa' },
  { value: 3, label: 'Bữa tối' },
  { value: 4, label: 'Bữa phụ' },
];

const NUTRITION_LEVELS = [
  { value: 1, label: 'Bình thường' },
  { value: 2, label: 'Ăn kiêng' },
  { value: 3, label: 'Đặc biệt / Chuyên biệt' },
];

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'].map((v) => ({ value: v, label: v }));
const RH_FACTORS = [
  { value: '+', label: 'Rh+ (dương)' },
  { value: '-', label: 'Rh- (âm)' },
];
const BLOOD_PRODUCTS = [
  'Hồng cầu khối', 'Khối tiểu cầu', 'Huyết tương tươi đông lạnh',
  'Tủa lạnh', 'Máu toàn phần',
].map((v) => ({ value: v, label: v }));

const INFUSION_ROUTES = [
  'Tĩnh mạch ngoại vi', 'Tĩnh mạch trung tâm', 'Truyền dưới da',
].map((v) => ({ value: v, label: v }));

const fmtMoney = (n: number | undefined | null) =>
  (n ?? 0).toLocaleString('vi-VN') + ' đ';

// Open a PDF/printable blob in a new tab for printing
const openPrintBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) w.onload = () => URL.revokeObjectURL(url);
};

// Chart metric selector — keep readable, not a hairball
const METRIC_OPTIONS = [
  { value: 'temp', label: 'Nhiệt độ (°C)' },
  { value: 'pulse', label: 'Mạch (lần/phút)' },
  { value: 'spo2', label: 'SpO₂ (%)' },
  { value: 'bp', label: 'HA tâm thu / tâm trương' },
];

type MetricKey = 'temp' | 'pulse' | 'spo2' | 'bp';

// Map VitalSignsChartDto series onto recharts data array
const buildChartData = (chart: VitalSignsChartDto, metric: MetricKey) => {
  const fmt = (iso: string) => dayjs(iso).format('DD/MM HH:mm');
  switch (metric) {
    case 'temp':
      return (chart.temperatureData || []).map((p) => ({ t: fmt(p.time), val: p.value }));
    case 'pulse':
      return (chart.pulseData || []).map((p) => ({ t: fmt(p.time), val: p.value }));
    case 'spo2':
      return (chart.spO2Data || []).map((p) => ({ t: fmt(p.time), val: p.value }));
    case 'bp':
      // value = systolic, value2 = diastolic
      return (chart.bpData || []).map((p) => ({ t: fmt(p.time), sys: p.value, dia: p.value2 }));
  }
};

// ---------------------------------------------------------------------------
// VitalSigns modal
// ---------------------------------------------------------------------------

const VitalSignsModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();

  const [recordTime, setRecordTime] = useState<dayjs.Dayjs>(dayjs());
  const [temperature, setTemperature] = useState<number | null>(null);
  const [pulse, setPulse] = useState<number | null>(null);
  const [respiratoryRate, setRespiratoryRate] = useState<number | null>(null);
  const [systolicBP, setSystolicBP] = useState<number | null>(null);
  const [diastolicBP, setDiastolicBP] = useState<number | null>(null);
  const [spO2, setSpO2] = useState<number | null>(null);
  const [weight, setWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  // Chart state
  const [chart, setChart] = useState<VitalSignsChartDto | null>(null);
  const [chartMetric, setChartMetric] = useState<MetricKey>('temp');
  const [chartLoading, setChartLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    // Reset form
    setRecordTime(dayjs());
    setTemperature(null); setPulse(null); setRespiratoryRate(null);
    setSystolicBP(null); setDiastolicBP(null); setSpO2(null);
    setWeight(null); setHeight(null); setNotes('');
    setChart(null);

    // Load last 7 days chart
    setChartLoading(true);
    const from = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    const to = dayjs().format('YYYY-MM-DD');
    getVitalSignsChart(admissionId, from, to)
      .then((r) => setChart(r.data ?? null))
      .catch(() => setChart(null))
      .finally(() => setChartLoading(false));
  }, [open, admissionId]);

  const submit = async () => {
    if (!recordTime) { message.warning('Chọn thời điểm ghi nhận'); return; }
    const dto: CreateVitalSignsDto = {
      admissionId,
      recordTime: recordTime.toISOString(),
      temperature: temperature ?? undefined,
      pulse: pulse ?? undefined,
      respiratoryRate: respiratoryRate ?? undefined,
      systolicBP: systolicBP ?? undefined,
      diastolicBP: diastolicBP ?? undefined,
      spO2: spO2 ?? undefined,
      weight: weight ?? undefined,
      height: height ?? undefined,
      notes: notes.trim() || undefined,
    };
    setBusy(true);
    try {
      await createVitalSigns(dto);
      message.success('Đã ghi nhận sinh hiệu');
      onDone();
    } catch {
      message.error('Ghi nhận sinh hiệu thất bại');
    } finally {
      setBusy(false);
    }
  };

  const chartData = chart ? buildChartData(chart, chartMetric) : [];
  const hasChartData = chartData.length > 0;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Ghi nhận sinh hiệu"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu sinh hiệu'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-12)' }}>
          <IpFld label="Thời điểm *" full>
            <DatePicker
              showTime
              value={recordTime}
              onChange={(v) => setRecordTime(v ?? dayjs())}
              format="DD/MM/YYYY HH:mm"
              style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Nhiệt độ (°C)">
            <InputNumber
              value={temperature} onChange={(v) => setTemperature(v)}
              min={35} max={42} step={0.1} precision={1}
              placeholder="37.0" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Mạch (lần/phút)">
            <InputNumber
              value={pulse} onChange={(v) => setPulse(v)}
              min={0} max={250} placeholder="80" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Nhịp thở (lần/phút)">
            <InputNumber
              value={respiratoryRate} onChange={(v) => setRespiratoryRate(v)}
              min={0} max={60} placeholder="18" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="HA tâm thu (mmHg)">
            <InputNumber
              value={systolicBP} onChange={(v) => setSystolicBP(v)}
              min={0} max={300} placeholder="120" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="HA tâm trương (mmHg)">
            <InputNumber
              value={diastolicBP} onChange={(v) => setDiastolicBP(v)}
              min={0} max={200} placeholder="80" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="SpO₂ (%)">
            <InputNumber
              value={spO2} onChange={(v) => setSpO2(v)}
              min={0} max={100} placeholder="99" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Cân nặng (kg)">
            <InputNumber
              value={weight} onChange={(v) => setWeight(v)}
              min={0} max={300} step={0.1} precision={1}
              placeholder="60.0" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Chiều cao (cm)">
            <InputNumber
              value={height} onChange={(v) => setHeight(v)}
              min={0} max={250} placeholder="165" style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Ghi chú" full>
            <Input.TextArea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={2} placeholder="Ghi chú lâm sàng…"
            />
          </IpFld>
        </div>

        {/* Trend chart */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
            <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)' }}>
              <TermIcon name="activity" size={11} /> Xu hướng 7 ngày qua
            </span>
            <Select<MetricKey>
              value={chartMetric}
              onChange={setChartMetric}
              options={METRIC_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              size="small"
              style={{ width: 220 }}
            />
          </div>
          {chartLoading && (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
              Đang tải biểu đồ…
            </div>
          )}
          {!chartLoading && !hasChartData && (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
              Chưa có dữ liệu sinh hiệu
            </div>
          )}
          {!chartLoading && hasChartData && (
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === 'bp' ? (
                  <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                    <XAxis dataKey="t" fontSize={10} />
                    <YAxis fontSize={10} domain={['auto', 'auto']} width={36} />
                    <RTooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 'var(--fs-xs)' }} />
                    <Line type="monotone" dataKey="sys" name="Tâm thu" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="dia" name="Tâm trương" stroke="var(--s-warn)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                  </LineChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 20, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                    <XAxis dataKey="t" fontSize={10} />
                    <YAxis fontSize={10} domain={['auto', 'auto']} width={36} />
                    <RTooltip />
                    <Line
                      type="monotone" dataKey="val"
                      name={METRIC_OPTIONS.find((o) => o.value === chartMetric)?.label ?? chartMetric}
                      stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Transfer department modal
// ---------------------------------------------------------------------------

const TransferModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string | undefined>();
  const [targetRoomId, setTargetRoomId] = useState('');
  const [targetBedId, setTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [diagnosisOnTransfer, setDiagnosisOnTransfer] = useState('');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [receivingDoctorId, setReceivingDoctorId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTargetDepartmentId(undefined);
    setTargetRoomId(''); setTargetBedId('');
    setTransferReason(''); setDiagnosisOnTransfer('');
    setTreatmentSummary(''); setReceivingDoctorId('');
    catalogApi.getDepartments(undefined, undefined, true)
      .then((r) => setDepts(r.data || []))
      .catch(() => setDepts([]));
  }, [open]);

  const submit = async () => {
    if (!targetDepartmentId) { message.warning('Chọn khoa chuyển đến'); return; }
    if (!targetRoomId.trim()) { message.warning('Nhập mã phòng'); return; }
    if (!receivingDoctorId.trim()) { message.warning('Nhập mã bác sĩ tiếp nhận'); return; }
    const dto: DepartmentTransferDto = {
      admissionId,
      targetDepartmentId,
      targetRoomId: targetRoomId.trim(),
      targetBedId: targetBedId.trim() || undefined,
      transferReason: transferReason.trim() || undefined,
      diagnosisOnTransfer: diagnosisOnTransfer.trim() || undefined,
      treatmentSummary: treatmentSummary.trim() || undefined,
      receivingDoctorId: receivingDoctorId.trim(),
    };
    setBusy(true);
    try {
      await transferDepartment(dto);
      message.success('Chuyển khoa thành công');
      onDone();
    } catch {
      message.error('Chuyển khoa thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Chuyển khoa"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Xác nhận chuyển khoa'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <IpFld label="Khoa chuyển đến *" full>
          <Select
            value={targetDepartmentId}
            onChange={setTargetDepartmentId}
            showSearch optionFilterProp="label"
            placeholder="Chọn khoa"
            style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </IpFld>
        <IpFld label="Mã phòng *">
          <Input value={targetRoomId} onChange={(e) => setTargetRoomId(e.target.value)} placeholder="Mã phòng / UUID" />
        </IpFld>
        <IpFld label="Mã giường">
          <Input value={targetBedId} onChange={(e) => setTargetBedId(e.target.value)} placeholder="Tùy chọn" />
        </IpFld>
        <IpFld label="Mã BS tiếp nhận *" full>
          <Input value={receivingDoctorId} onChange={(e) => setReceivingDoctorId(e.target.value)} placeholder="Mã BS / UUID" />
        </IpFld>
        <IpFld label="Lý do chuyển khoa" full>
          <Input.TextArea value={transferReason} onChange={(e) => setTransferReason(e.target.value)} rows={2} placeholder="Lý do chuyển…" />
        </IpFld>
        <IpFld label="Chẩn đoán khi chuyển" full>
          <Input value={diagnosisOnTransfer} onChange={(e) => setDiagnosisOnTransfer(e.target.value)} placeholder="VD: J18.9 - Viêm phổi" />
        </IpFld>
        <IpFld label="Tóm tắt điều trị" full>
          <Input.TextArea value={treatmentSummary} onChange={(e) => setTreatmentSummary(e.target.value)} rows={3} placeholder="Tóm tắt quá trình điều trị…" />
        </IpFld>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Nutrition order modal
// ---------------------------------------------------------------------------

const NutritionModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [orderDate, setOrderDate] = useState<dayjs.Dayjs>(dayjs());
  const [mealType, setMealType] = useState<number>(2); // bua trua default
  const [nutritionLevel, setNutritionLevel] = useState<number>(1);
  const [menuCode, setMenuCode] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrderDate(dayjs());
    setMealType(2); setNutritionLevel(1);
    setMenuCode(''); setSpecialRequirements('');
  }, [open]);

  const submit = async () => {
    if (!orderDate) { message.warning('Chọn ngày chỉ định'); return; }
    const dto: CreateNutritionOrderDto = {
      admissionId,
      orderDate: orderDate.format('YYYY-MM-DD'),
      mealType,
      nutritionLevel,
      menuCode: menuCode.trim() || undefined,
      specialRequirements: specialRequirements.trim() || undefined,
    };
    setBusy(true);
    try {
      await createNutritionOrder(dto);
      message.success('Đã chỉ định suất ăn');
      onDone();
    } catch {
      message.error('Chỉ định suất ăn thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title="Chỉ định suất ăn"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Chỉ định'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <IpFld label="Ngày chỉ định *" full>
          <DatePicker
            value={orderDate}
            onChange={(v) => setOrderDate(v ?? dayjs())}
            format="DD/MM/YYYY"
            style={{ width: '100%' }}
          />
        </IpFld>
        <IpFld label="Bữa ăn *">
          <Select<number>
            value={mealType} onChange={setMealType}
            style={{ width: '100%' }}
            options={MEAL_TYPES}
          />
        </IpFld>
        <IpFld label="Mức dinh dưỡng *">
          <Select<number>
            value={nutritionLevel} onChange={setNutritionLevel}
            style={{ width: '100%' }}
            options={NUTRITION_LEVELS}
          />
        </IpFld>
        <IpFld label="Mã thực đơn" full>
          <Input value={menuCode} onChange={(e) => setMenuCode(e.target.value)} placeholder="Mã thực đơn (tùy chọn)" />
        </IpFld>
        <IpFld label="Yêu cầu đặc biệt" full>
          <Input.TextArea value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} rows={3} placeholder="VD: Không ăn mặn, dị ứng hải sản…" />
        </IpFld>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Infusion record modal (truyen dich)
// ---------------------------------------------------------------------------

const InfusionModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [fluidName, setFluidName] = useState('');
  const [volume, setVolume] = useState<number | null>(null);
  const [dropRate, setDropRate] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<dayjs.Dayjs>(dayjs());
  const [route, setRoute] = useState<string | undefined>('Tĩnh mạch ngoại vi');
  const [additionalMedication, setAdditionalMedication] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFluidName(''); setVolume(null); setDropRate(null);
    setStartTime(dayjs()); setRoute('Tĩnh mạch ngoại vi'); setAdditionalMedication('');
  }, [open]);

  // Estimated duration: 20 drops/ml standard set → minutes ≈ volume*20 / dropRate
  const estMinutes = volume && dropRate ? Math.round((volume * 20) / dropRate) : null;

  const submit = async () => {
    if (!fluidName.trim()) { message.warning('Nhập tên dịch truyền'); return; }
    if (!volume || volume <= 0) { message.warning('Nhập thể tích (ml)'); return; }
    if (!dropRate || dropRate <= 0) { message.warning('Nhập tốc độ giọt/phút'); return; }
    const dto: CreateInfusionRecordDto = {
      admissionId,
      fluidName: fluidName.trim(),
      volume,
      dropRate,
      startTime: startTime.toISOString(),
      route: route || undefined,
      additionalMedication: additionalMedication.trim() || undefined,
    };
    setBusy(true);
    try {
      await createInfusionRecord(dto);
      message.success('Đã ghi nhận truyền dịch');
      onDone();
    } catch {
      message.error('Ghi nhận truyền dịch thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Truyền dịch"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Ghi nhận'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <IpFld label="Tên dịch truyền *" full>
          <Input value={fluidName} onChange={(e) => setFluidName(e.target.value)} placeholder="VD: NaCl 0.9% 500ml" />
        </IpFld>
        <IpFld label="Thể tích (ml) *">
          <InputNumber value={volume} onChange={(v) => setVolume(v)} min={1} max={5000} placeholder="500" style={{ width: '100%' }} />
        </IpFld>
        <IpFld label="Tốc độ (giọt/phút) *">
          <InputNumber value={dropRate} onChange={(v) => setDropRate(v)} min={1} max={300} placeholder="40" style={{ width: '100%' }} />
        </IpFld>
        <IpFld label="Thời điểm bắt đầu *">
          <DatePicker showTime value={startTime} onChange={(v) => setStartTime(v ?? dayjs())} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
        </IpFld>
        <IpFld label="Đường truyền">
          <Select value={route} onChange={setRoute} style={{ width: '100%' }} options={INFUSION_ROUTES} />
        </IpFld>
        <IpFld label="Thuốc pha thêm" full>
          <Input value={additionalMedication} onChange={(e) => setAdditionalMedication(e.target.value)} placeholder="VD: KCl 10mEq (tùy chọn)" />
        </IpFld>
        {estMinutes != null && (
          <div style={{ gridColumn: '1 / -1', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            ⏱ Thời gian truyền ước tính (bộ dây 20 giọt/ml): <b>{estMinutes} phút</b> (~{(estMinutes / 60).toFixed(1)} giờ)
          </div>
        )}
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Blood transfusion modal (truyen mau)
// ---------------------------------------------------------------------------

const BloodTransfusionModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [bloodType, setBloodType] = useState<string | undefined>();
  const [rhFactor, setRhFactor] = useState<string | undefined>('+');
  const [bloodProductType, setBloodProductType] = useState<string | undefined>('Hồng cầu khối');
  const [bagNumber, setBagNumber] = useState('');
  const [volume, setVolume] = useState<number | null>(null);
  const [transfusionStart, setTransfusionStart] = useState<dayjs.Dayjs>(dayjs());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBloodType(undefined); setRhFactor('+'); setBloodProductType('Hồng cầu khối');
    setBagNumber(''); setVolume(null); setTransfusionStart(dayjs());
  }, [open]);

  const submit = async () => {
    if (!bloodType) { message.warning('Chọn nhóm máu'); return; }
    if (!rhFactor) { message.warning('Chọn yếu tố Rh'); return; }
    if (!bloodProductType) { message.warning('Chọn chế phẩm máu'); return; }
    if (!bagNumber.trim()) { message.warning('Nhập số túi máu'); return; }
    if (!volume || volume <= 0) { message.warning('Nhập thể tích (ml)'); return; }
    const dto: CreateBloodTransfusionDto = {
      admissionId,
      bloodType,
      rhFactor,
      bloodProductType,
      bagNumber: bagNumber.trim(),
      volume,
      transfusionStart: transfusionStart.toISOString(),
    };
    setBusy(true);
    try {
      await createBloodTransfusion(dto);
      message.success('Đã ghi nhận truyền máu');
      onDone();
    } catch {
      message.error('Ghi nhận truyền máu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Truyền máu"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Ghi nhận'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)' }}>
        <div style={{
          marginBottom: 'var(--space-12)', padding: '8px 12px', borderRadius: 'var(--r-2)',
          background: 'var(--warn-soft)', border: '1px solid var(--warn)',
          fontSize: 'var(--fs-xs)', color: 'var(--t-1)',
        }}>
          ⚠ Đảm bảo đã định nhóm máu tại giường &amp; phản ứng chéo trước khi truyền.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <IpFld label="Nhóm máu *">
            <Select value={bloodType} onChange={setBloodType} placeholder="A / B / AB / O" style={{ width: '100%' }} options={BLOOD_TYPES} />
          </IpFld>
          <IpFld label="Yếu tố Rh *">
            <Select value={rhFactor} onChange={setRhFactor} style={{ width: '100%' }} options={RH_FACTORS} />
          </IpFld>
          <IpFld label="Chế phẩm máu *" full>
            <Select value={bloodProductType} onChange={setBloodProductType} style={{ width: '100%' }} options={BLOOD_PRODUCTS} />
          </IpFld>
          <IpFld label="Số túi máu *">
            <Input value={bagNumber} onChange={(e) => setBagNumber(e.target.value)} placeholder="Mã đơn vị máu" />
          </IpFld>
          <IpFld label="Thể tích (ml) *">
            <InputNumber value={volume} onChange={(v) => setVolume(v)} min={1} max={1000} placeholder="250" style={{ width: '100%' }} />
          </IpFld>
          <IpFld label="Thời điểm bắt đầu truyền *" full>
            <DatePicker showTime value={transfusionStart} onChange={(v) => setTransfusionStart(v ?? dayjs())} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </IpFld>
        </div>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Billing statement 6556 viewer (bang ke chi phi KCB)
// ---------------------------------------------------------------------------

const BillingStatementModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
}> = ({ open, admissionId, onClose }) => {
  const { message } = AntdApp.useApp();
  const [data, setData] = useState<BillingStatement6556Dto | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setData(null);
    setLoading(true);
    getBillingStatement6556(admissionId)
      .then((r) => setData(r.data ?? null))
      .catch(() => message.error('Không tải được bảng kê 6556'))
      .finally(() => setLoading(false));
  }, [open, admissionId, message]);

  const print = async () => {
    setPrinting(true);
    try {
      const r = await printBillingStatement6556(admissionId);
      openPrintBlob(r.data as Blob);
    } catch {
      message.error('In bảng kê thất bại');
    } finally {
      setPrinting(false);
    }
  };

  const sum = ([label, value, strong]: [string, number | undefined, boolean?]) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 'var(--fs-sm)', fontWeight: strong ? 700 : 400 }}>
      <span className="ab-u-muted">{label}</span>
      <span style={{ color: strong ? 'var(--accent)' : 'var(--t-1)' }}>{fmtMoney(value)}</span>
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Bảng kê chi phí KCB (Mẫu 01/BV — 6556)"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={printing || !data} onClick={print}>
            <TermIcon name="printer" size={12} /> {printing ? 'Đang in…' : 'In bảng kê'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)' }}>
        {loading && <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Đang tải bảng kê…</div>}
        {!loading && !data && <div style={{ padding: 'var(--space-24)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Chưa có bảng kê (cần xuất viện trước).</div>}
        {!loading && data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-14)' }}>
              <div><span className="ab-u-muted">Bệnh nhân: </span><b>{data.patientName}</b> ({data.patientCode})</div>
              <div><span className="ab-u-muted">Số thẻ BHYT: </span>{data.insuranceNumber || '—'}</div>
              <div><span className="ab-u-muted">Chẩn đoán: </span>{data.diagnosisCode ? `${data.diagnosisCode} - ` : ''}{data.diagnosis || '—'}</div>
              <div><span className="ab-u-muted">Số ngày điều trị: </span>{data.daysOfStay}</div>
            </div>

            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
                <thead>
                  <tr style={{ background: 'var(--d-1)', position: 'sticky', top: 0 }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>TT</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Nội dung</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>SL</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Đơn giá</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>Thành tiền</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>BHYT</th>
                    <th style={{ textAlign: 'right', padding: '6px 8px' }}>BN trả</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((it) => (
                    <tr key={it.orderNo} style={{ borderTop: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '5px 8px' }}>{it.orderNo}</td>
                      <td style={{ padding: '5px 8px' }}>{it.itemName}<span className="ab-u-muted"> · {it.unit}</span></td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.unitPrice)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.amount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.insuranceAmount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.patientAmount)}</td>
                    </tr>
                  ))}
                  {(data.items || []).length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--t-2)' }}>Không có khoản mục chi phí</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 'var(--space-12)', maxWidth: 360, marginLeft: 'auto' }}>
              {sum(['Tổng chi phí', data.totalAmount])}
              {sum(['BHYT chi trả', data.insuranceAmount])}
              {sum(['Cùng chi trả', data.patientCoPayAmount])}
              {sum(['Chi phí ngoài BHYT', data.outOfPocketAmount])}
              {sum(['Đã tạm ứng', data.depositAmount])}
              {sum(['Hoàn trả', data.refundAmount])}
              <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)' }}>
                {sum(['Còn phải thu', data.amountDue, true])}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// G-02: Drug return modal (Hoan tra thuoc y lenh)
// ---------------------------------------------------------------------------

const RETURN_REASONS = [
  { value: 'Thừa thuốc', label: 'Thừa thuốc' },
  { value: 'Đổi thuốc', label: 'Đổi thuốc' },
  { value: 'Ngừng điều trị', label: 'Ngừng điều trị' },
  { value: 'Khác', label: 'Khác' },
];

interface ReturnItem {
  medicineId: string;
  medicineName: string;
  unit: string;
  maxQty: number;
  returnQty: number;
  selected: boolean;
}

const DrugReturnModal: React.FC<{
  open: boolean;
  admissionId: string;
  patientId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, patientId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [reason, setReason] = useState('Thừa thuốc');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('Thừa thuốc'); setNote('');
    setLoading(true);
    getPrescriptions(admissionId)
      .then((r) => {
        const prescriptions: InpatientPrescriptionDto[] = Array.isArray(r.data) ? r.data : [];
        // Aggregate items across prescriptions — only issued (status >= 2)
        const map = new Map<string, ReturnItem>();
        prescriptions.forEach((p) => {
          if (p.status < 1) return; // skip un-approved
          p.items.forEach((it: InpatientMedicineItemDto) => {
            const existing = map.get(it.medicineId);
            if (existing) {
              existing.maxQty += it.quantity;
            } else {
              map.set(it.medicineId, {
                medicineId: it.medicineId,
                medicineName: it.medicineName,
                unit: it.unit,
                maxQty: it.quantity,
                returnQty: it.quantity,
                selected: false,
              });
            }
          });
        });
        setItems(Array.from(map.values()));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, admissionId]);

  const toggleItem = (idx: number) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it));
  const setReturnQty = (idx: number, v: number | null) =>
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, returnQty: Math.min(v ?? 1, it.maxQty) } : it));

  const submit = async () => {
    const selected = items.filter((it) => it.selected && it.returnQty > 0);
    if (!selected.length) { message.warning('Chọn ít nhất 1 thuốc cần hoàn trả'); return; }
    if (!reason.trim()) { message.warning('Chọn lý do hoàn trả'); return; }
    setBusy(true);
    try {
      // Import createApproval inline to avoid circular — re-import from pharmacyApproval
      const { createApproval } = await import('../../api/pharmacyApproval');
      await createApproval({
        approvalType: 5, // HOAN_TRA
        patientId,
        note: `${reason}${note ? ` — ${note}` : ''}`,
        items: selected.map((it) => ({
          medicineId: it.medicineId,
          requestedQuantity: it.returnQty,
          unit: it.unit,
          unitPrice: 0,
          usageInstruction: reason,
        })),
      });
      message.success('Đã tạo phiếu hoàn trả — chờ dược duyệt');
      onDone();
    } catch {
      message.error('Tạo phiếu hoàn trả thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Hoàn trả thuốc y lệnh"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang tạo phiếu…' : 'Tạo phiếu hoàn trả'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Đang tải danh sách thuốc…</div>}
        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
            Không có thuốc nào đã lĩnh trong đợt nằm viện này.
          </div>
        )}
        {!loading && items.length > 0 && (
          <div style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--d-1)' }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', width: 36 }}></th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Tên thuốc</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', width: 60 }}>Đã lĩnh</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right', width: 100 }}>SL trả</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.medicineId} style={{ borderTop: '1px solid var(--line-soft)', background: it.selected ? 'var(--s-info-bg)' : undefined }}>
                    <td style={{ padding: '5px 10px', textAlign: 'center' }}>
                      <Checkbox checked={it.selected} onChange={() => toggleItem(idx)} />
                    </td>
                    <td style={{ padding: '5px 10px' }}>
                      {it.medicineName}
                      <span style={{ color: 'var(--t-2)', marginLeft: 'var(--space-4)' }}>{it.unit}</span>
                    </td>
                    <td style={{ padding: '5px 10px', textAlign: 'right' }}>{it.maxQty}</td>
                    <td style={{ padding: '5px 10px' }}>
                      <InputNumber
                        size="small"
                        value={it.returnQty}
                        onChange={(v) => setReturnQty(idx, v)}
                        min={1} max={it.maxQty}
                        disabled={!it.selected}
                        style={{ width: 80 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <IpFld label="Lý do hoàn trả *">
            <Select
              value={reason}
              onChange={setReason}
              options={RETURN_REASONS}
              style={{ width: '100%' }}
            />
          </IpFld>
          <IpFld label="Ghi chú thêm">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ghi chú (tùy chọn)" />
          </IpFld>
        </div>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// G-07: Discharge prescription modal (Don thuoc xuat vien — toa ve)
// ---------------------------------------------------------------------------

interface DischargeRxLine {
  key: string;
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  dosage: string;
  usage: string;
}
const emptyRxLine = (): DischargeRxLine => ({
  key: Math.random().toString(36).slice(2),
  medicineId: '', medicineName: '', unit: '', quantity: 1, dosage: '', usage: '',
});

const DischargePrescriptionModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [lines, setLines] = useState<DischargeRxLine[]>([emptyRxLine()]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLines([emptyRxLine()]); setLabels({}); setWarehouseId('');
    // Kho thuốc (WarehouseType=1) — nguồn xuất toa về.
    getWarehouses(1)
      .then((r) => {
        const list = (Array.isArray(r.data) ? r.data : []) as WarehouseDto[];
        setWarehouses(list);
        if (list.length === 1) setWarehouseId(list[0].id);
      })
      .catch(() => setWarehouses([]));
  }, [open]);

  const updateLine = (key: string, patch: Partial<DischargeRxLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) => setLines((ls) => ls.filter((l) => l.key !== key));

  const submit = async () => {
    if (!warehouseId) { message.warning('Chọn kho thuốc'); return; }
    const valid = lines.filter((l) => l.medicineId && l.quantity > 0);
    if (valid.length === 0) { message.warning('Chọn ít nhất 1 thuốc'); return; }
    setBusy(true);
    try {
      await createPrescription({
        admissionId,
        prescriptionDate: dayjs().toISOString(),
        warehouseId,
        drugOrderType: 4, // toa về (đơn xuất viện)
        items: valid.map((l) => ({
          medicineId: l.medicineId,
          quantity: l.quantity,
          dosage: l.dosage.trim() || undefined,
          usageInstructions: l.usage.trim() || undefined,
          paymentSource: 1,
        })),
      });
      message.success('Đã lưu đơn thuốc xuất viện (toa về)');
      onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || 'Lưu đơn thuốc xuất viện thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Đơn thuốc xuất viện (toa về)"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu đơn'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <div style={{ padding: '8px 12px', borderRadius: 'var(--r-2)', background: 'var(--s-info-bg)', border: '1px solid var(--info)', fontSize: 'var(--fs-xs)', color: 'var(--t-1)' }}>
          Đơn loại <b>toa về (DrugOrderType=4)</b> — thuốc BN mang về sau xuất viện, lấy từ kho thuốc đã chọn.
        </div>
        <IpFld label="Kho thuốc *">
          <Select
            value={warehouseId || undefined}
            onChange={setWarehouseId}
            placeholder="Chọn kho thuốc…"
            style={{ width: '100%' }}
            showSearch
            optionFilterProp="label"
            options={warehouses.map((w) => ({ value: w.id, label: `${w.warehouseCode} · ${w.warehouseName}` }))}
            notFoundContent={warehouses.length === 0 ? 'Không có kho thuốc' : 'Không tìm thấy'}
          />
        </IpFld>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr style={{ background: 'var(--d-1)', borderBottom: '1px solid var(--line)' }}>
                {['Thuốc', 'SL', 'Liều dùng', 'Cách dùng', ''].map((h) => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '4px 4px', minWidth: 220 }}>
                    <ItemPicker
                      warehouseId={warehouseId}
                      value={labels[l.key] ?? ''}
                      onChange={(v) => setLabels((m) => ({ ...m, [l.key]: v }))}
                      onSelect={(med) => {
                        setLabels((m) => ({ ...m, [l.key]: med.name }));
                        updateLine(l.key, { medicineId: med.id, medicineName: med.name, unit: med.unit ?? '' });
                      }}
                    />
                  </td>
                  <td style={{ padding: '4px 4px', width: 80 }}>
                    <InputNumber value={l.quantity} min={1} max={1000} size="small" style={{ width: '100%' }}
                      onChange={(v) => updateLine(l.key, { quantity: v ?? 1 })} />
                  </td>
                  <td style={{ padding: '4px 4px', width: 150 }}>
                    <Input size="small" value={l.dosage} placeholder="1v × 3/ngày"
                      onChange={(e) => updateLine(l.key, { dosage: e.target.value })} />
                  </td>
                  <td style={{ padding: '4px 4px', minWidth: 160 }}>
                    <Input size="small" value={l.usage} placeholder="Uống sau ăn…"
                      onChange={(e) => updateLine(l.key, { usage: e.target.value })} />
                  </td>
                  <td style={{ padding: '4px 4px', width: 32 }}>
                    {lines.length > 1 && (
                      <Btn variant="ghost" onClick={() => removeLine(l.key)} style={{ color: 'var(--s-crit)' }}>
                        <TermIcon name="x" size={11} />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Btn variant="ghost" onClick={() => setLines((ls) => [...ls, emptyRxLine()])}>
          <TermIcon name="plus" size={11} /> Thêm thuốc
        </Btn>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// G-08 + G-15: CLS service requests modal
// ---------------------------------------------------------------------------

const PATIENT_TYPE_OPTIONS = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Viện phí' },
  { value: 3, label: 'Dịch vụ' },
];

const PATIENT_TYPE_COLORS: Record<number, string> = { 1: 'green', 2: 'blue', 3: 'purple' };

const ClsOrdersModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message, modal } = AntdApp.useApp();
  const [orders, setOrders] = useState<InpatientServiceRequestItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [cancelReason, setCancelReason] = useState('');
  const cancelReasonRef = React.useRef('');
  const [cancelling, setCancelling] = useState(false);
  // G-15 payment type change
  const [paymentChangeId, setPaymentChangeId] = useState<string | null>(null);
  const [newPatientType, setNewPatientType] = useState<number>(1);
  const [paymentBusy, setPaymentBusy] = useState(false);
  // Tạo chỉ định CLS mới
  const [createOpen, setCreateOpen] = useState(false);

  const reload = () => {
    setLoading(true);
    getAdmissionServiceRequests(admissionId)
      .then((r) => setOrders(Array.isArray(r.data) ? r.data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    setSelectedIds([]); setCancelReason(''); setPaymentChangeId(null);
    reload();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, admissionId]);

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleCancelSelected = async () => {
    if (!selectedIds.length) { message.warning('Chọn ít nhất 1 chỉ định để hủy'); return; }
    cancelReasonRef.current = '';
    modal.confirm({
      title: `Hủy ${selectedIds.length} chỉ định CLS?`,
      content: (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>Lý do hủy:</div>
          <Input
            placeholder="Nhập lý do…"
            onChange={(e) => { cancelReasonRef.current = e.target.value; setCancelReason(e.target.value); }}
          />
        </div>
      ),
      okText: 'Xác nhận hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCancelling(true);
        try {
          const r = await cancelServiceRequests(admissionId, { serviceRequestIds: selectedIds, reason: cancelReasonRef.current });
          const result = r.data as typeof r.data;
          message.success(`Đã hủy ${result.cancelledCount} chỉ định${result.failedIds.length ? `, ${result.failedIds.length} không thể hủy (đã có KQ)` : ''}`);
          setSelectedIds([]);
          reload();
          onDone();
        } catch {
          message.error('Hủy chỉ định thất bại');
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  const handleChangePaymentType = async (requestId: string) => {
    if (!newPatientType) return;
    setPaymentBusy(true);
    try {
      await updateServiceRequestPaymentType(requestId, { patientType: newPatientType });
      message.success('Đã đổi đối tượng thanh toán');
      setPaymentChangeId(null);
      reload();
    } catch {
      message.error('Đổi đối tượng thanh toán thất bại');
    } finally {
      setPaymentBusy(false);
    }
  };

  const activeOrders = orders.filter((o) => o.status !== 4);

  return (
   <>
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Chỉ định CLS nội trú"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" onClick={() => setCreateOpen(true)}>
            <TermIcon name="plus" size={12} /> Tạo chỉ định
          </Btn>
          {selectedIds.length > 0 && (
            <Btn variant="crit" disabled={cancelling} onClick={handleCancelSelected}>
              <TermIcon name="x" size={12} /> Hủy {selectedIds.length} chỉ định
            </Btn>
          )}
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)' }}>
        {loading && <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', padding: 'var(--space-16)' }}>Đang tải…</div>}
        {!loading && activeOrders.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', padding: 'var(--space-16)' }}>
            Không có chỉ định CLS nào trong đợt điều trị này.
          </div>
        )}
        {!loading && activeOrders.length > 0 && (
          <div style={{ border: '1px solid var(--line-soft)', borderRadius: 'var(--r-2)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--d-1)' }}>
                  <th style={{ padding: '6px 8px', width: 36 }}>
                    <Checkbox
                      checked={selectedIds.length === activeOrders.filter(o => o.status < 3).length && activeOrders.filter(o => o.status < 3).length > 0}
                      indeterminate={selectedIds.length > 0 && selectedIds.length < activeOrders.filter(o => o.status < 3).length}
                      onChange={(e) => {
                        const cancellable = activeOrders.filter(o => o.status < 3).map(o => o.id);
                        setSelectedIds(e.target.checked ? cancellable : []);
                      }}
                    />
                  </th>
                  <th style={{ padding: '6px 8px', textAlign: 'left' }}>Dịch vụ</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 80 }}>Loại</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 90 }}>Trạng thái</th>
                  <th style={{ padding: '6px 8px', textAlign: 'center', width: 100 }}>Đ.Tượng TT</th>
                  <th style={{ padding: '6px 8px', textAlign: 'right', width: 80 }}>Tiền</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((o) => {
                  const isCancellable = o.status < 3;
                  const isChangingPayment = paymentChangeId === o.id;
                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderTop: '1px solid var(--line-soft)',
                        background: selectedIds.includes(o.id) ? 'var(--s-info-bg)' : undefined,
                        opacity: !isCancellable ? 0.6 : 1,
                      }}
                    >
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {isCancellable && (
                          <Checkbox
                            checked={selectedIds.includes(o.id)}
                            onChange={() => toggleSelect(o.id)}
                          />
                        )}
                      </td>
                      <td style={{ padding: '5px 8px' }}>
                        {o.serviceName ?? o.requestCode}
                        {o.isEmergency && <Tag color="red" style={{ marginLeft: 'var(--space-4)', fontSize: 'var(--fs-xxs)' }}>CẤP CỨU</Tag>}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        <Tag>{o.requestTypeName ?? o.requestType}</Tag>
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        <Tag color={o.status === 3 ? 'success' : o.status === 2 ? 'processing' : 'warning'}>
                          {o.statusName ?? o.status}
                        </Tag>
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                        {isChangingPayment ? (
                          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                            <Select<number>
                              size="small"
                              value={newPatientType}
                              onChange={setNewPatientType}
                              options={PATIENT_TYPE_OPTIONS}
                              style={{ width: 90 }}
                            />
                            <Btn variant="primary" onClick={() => handleChangePaymentType(o.id)} disabled={paymentBusy}>
                              <TermIcon name="check" size={10} />
                            </Btn>
                            <Btn variant="ghost" onClick={() => setPaymentChangeId(null)}>
                              <TermIcon name="x" size={10} />
                            </Btn>
                          </div>
                        ) : (
                          <Tag
                            color={PATIENT_TYPE_COLORS[o.patientType] ?? 'default'}
                            style={{ cursor: isCancellable ? 'pointer' : 'default' }}
                            onClick={() => {
                              if (!isCancellable) return;
                              setNewPatientType(o.patientType);
                              setPaymentChangeId(o.id);
                            }}
                          >
                            {o.patientTypeName ?? (o.patientType === 1 ? 'BHYT' : o.patientType === 2 ? 'Viện phí' : 'Dịch vụ')}
                            {isCancellable && <span style={{ marginLeft: 'var(--space-3)' }}><TermIcon name="edit-2" size={9} /></span>}
                          </Tag>
                        )}
                      </td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                        {(o.totalAmount ?? 0).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && activeOrders.length > 0 && (
          <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            Nhấn vào tag đối tượng thanh toán để đổi BHYT↔Viện phí. Tick checkbox + nút Hủy để hủy nhiều chỉ định.
            Chỉ định đã có kết quả (status=3) không thể hủy.
          </div>
        )}
      </div>
    </ModalShell>

    {/* Tạo chỉ định CLS mới — search + cây danh mục */}
    <InpatientServiceOrderCreateModal
      open={createOpen}
      admissionId={admissionId}
      onClose={() => setCreateOpen(false)}
      onDone={() => { setCreateOpen(false); reload(); onDone(); }}
    />
   </>
  );
};

// ---------------------------------------------------------------------------
// Diagnosis modal — thêm/sửa chẩn đoán chính + kèm theo
// ---------------------------------------------------------------------------

const InpatientDiagnosisModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [mainCode, setMainCode] = useState('');
  const [mainName, setMainName] = useState('');
  const [secondaries, setSecondaries] = useState<SecondaryDiagnosisItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDiagnosisFromRecord(admissionId)
      .then((r) => {
        setMainCode(r.data?.mainDiagnosisCode ?? '');
        setMainName(r.data?.mainDiagnosis ?? '');
        setSecondaries(r.data?.secondaryDiagnoses ?? []);
      })
      .catch(() => { setMainCode(''); setMainName(''); setSecondaries([]); })
      .finally(() => setLoading(false));
  }, [open, admissionId]);

  const addSecondary = () =>
    setSecondaries((prev) => [...prev, { code: '', name: '' }]);

  const removeSecondary = (idx: number) =>
    setSecondaries((prev) => prev.filter((_, i) => i !== idx));

  const updateSecondary = (idx: number, field: 'code' | 'name', val: string) =>
    setSecondaries((prev) =>
      prev.map((it, i) => i === idx ? { ...it, [field]: val } : it)
    );

  const submit = async () => {
    if (!mainCode.trim() && !mainName.trim()) {
      message.warning('Nhập ít nhất mã hoặc tên chẩn đoán chính');
      return;
    }
    setBusy(true);
    try {
      await saveInpatientDiagnosis(admissionId, {
        mainDiagnosisCode: mainCode.trim() || undefined,
        mainDiagnosis: mainName.trim() || undefined,
        secondaryDiagnoses: secondaries.filter((s) => s.code.trim() || s.name.trim()),
      });
      message.success('Đã lưu chẩn đoán');
      onDone();
    } catch {
      message.error('Lưu chẩn đoán thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Chẩn đoán nội trú"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy || loading} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Lưu chẩn đoán'}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-16)' }}>
        {loading && (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
            Đang tải chẩn đoán hiện tại…
          </div>
        )}
        {!loading && (
          <>
            {/* Chẩn đoán chính */}
            <div>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--space-8)', color: 'var(--t-1)' }}>
                Chẩn đoán chính
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 'var(--space-8)' }}>
                <IpFld label="Mã ICD-10">
                  <Input
                    value={mainCode}
                    onChange={(e) => setMainCode(e.target.value)}
                    placeholder="VD: J06.9"
                    size="small"
                  />
                </IpFld>
                <IpFld label="Tên chẩn đoán chính">
                  <Input
                    value={mainName}
                    onChange={(e) => setMainName(e.target.value)}
                    placeholder="Nhập tên chẩn đoán chính..."
                    size="small"
                  />
                </IpFld>
              </div>
            </div>

            {/* Chẩn đoán kèm theo */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)' }}>
                  Chẩn đoán kèm theo ({secondaries.length})
                </div>
                <Btn variant="ghost" onClick={addSecondary}>
                  <TermIcon name="plus" size={11} /> Thêm
                </Btn>
              </div>
              {secondaries.length === 0 && (
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-3)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                  Chưa có chẩn đoán kèm theo
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                {secondaries.map((s, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 1fr auto', gap: 'var(--space-6)', alignItems: 'center' }}>
                    <Input
                      value={s.code}
                      onChange={(e) => updateSecondary(idx, 'code', e.target.value)}
                      placeholder="Mã ICD"
                      size="small"
                    />
                    <Input
                      value={s.name}
                      onChange={(e) => updateSecondary(idx, 'name', e.target.value)}
                      placeholder="Tên chẩn đoán kèm theo"
                      size="small"
                    />
                    <Btn variant="crit" onClick={() => removeSecondary(idx)}>
                      <TermIcon name="x" size={11} />
                    </Btn>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// TreatmentSheetsModal — chọn nhiều đợt điều trị + in tuần tự
// ---------------------------------------------------------------------------

const TreatmentSheetsModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
}> = ({ open, admissionId, onClose }) => {
  const { message } = AntdApp.useApp();
  const [sheets, setSheets] = useState<TreatmentSheetDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setLoading(true);
    getTreatmentSheets({ admissionId }).then((r) => {
      setSheets(Array.isArray(r.data) ? r.data : []);
    }).catch(() => {
      message.warning('Không tải được danh sách phiếu điều trị');
    }).finally(() => setLoading(false));
  }, [open, admissionId, message]);

  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === sheets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(sheets.map((s) => s.id)));
  };

  const printSelected = async () => {
    if (selectedIds.size === 0) { message.warning('Chưa chọn phiếu nào'); return; }
    setPrinting(true);
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try {
        const r = await printTreatmentSheet(id);
        const url = URL.createObjectURL(r.data as Blob);
        const w = window.open(url, '_blank');
        if (w) w.onload = () => URL.revokeObjectURL(url);
        else URL.revokeObjectURL(url);
      } catch {
        failed++;
      }
    }
    setPrinting(false);
    if (failed > 0) message.error(`Không in được ${failed}/${ids.length} phiếu`);
    else message.success(`Đã mở ${ids.length} tờ điều trị`);
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="In tờ điều trị"
      sub={`Chọn đợt điều trị cần in · ${sheets.length} phiếu`}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" disabled={printing || selectedIds.size === 0} onClick={printSelected}>
            <TermIcon name="printer" size={12} />
            {printing ? 'Đang in…' : `In ${selectedIds.size} phiếu`}
          </Btn>
        </>
      }
    >
      <div style={{ padding: 'var(--space-16)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--t-2)', padding: 'var(--space-24)' }}>Đang tải…</div>
        ) : sheets.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--t-3)', padding: 'var(--space-24)' }}>Chưa có phiếu điều trị</div>
        ) : (
          <>
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)', cursor: 'pointer', fontWeight: 600 }}>
                <input type="checkbox" checked={selectedIds.size === sheets.length} onChange={toggleAll} />
                Chọn tất cả ({sheets.length} phiếu)
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: 360, overflowY: 'auto' }}>
              {sheets.map((s) => (
                <label key={s.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)', cursor: 'pointer',
                  padding: '8px 10px', borderRadius: 'var(--r-2)',
                  background: selectedIds.has(s.id) ? 'var(--a-em-bg)' : 'var(--d-1)',
                  border: `1px solid ${selectedIds.has(s.id) ? 'var(--a-em-bd)' : 'var(--line)'}`,
                  fontSize: 12.5,
                }}>
                  <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggle(s.id)} style={{ marginTop: 'var(--space-2)' }} />
                  <div>
                    <div style={{ fontWeight: 500 }}>{dayjs(s.treatmentDate).format('DD/MM/YYYY')}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{s.doctorName || '—'}</div>
                    {s.progressNotes && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)', whiteSpace: 'pre-line', maxWidth: 400 }}>{s.progressNotes.slice(0, 80)}{s.progressNotes.length > 80 ? '…' : ''}</div>}
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// F8.13 — TreatmentStatSection: 2 bieu do thong ke qua trinh dieu tri
// ---------------------------------------------------------------------------

const CHART_COLORS = [
  '#0891b2', 'var(--s-warn)', '#059669', 'var(--s-mag)', 'var(--s-crit)',
  'var(--a-cy)', '#65a30d', '#db2777', '#b45309', '#0369a1',
];

const TreatmentStatSection: React.FC<{ admissionId: string }> = ({ admissionId }) => {
  const [data, setData] = useState<TreatmentStatAggregateDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!admissionId) return;
    setLoading(true);
    setError(false);
    getTreatmentStatAggregate(admissionId)
      .then((r) => setData(r.data ?? null))
      .catch(() => { setError(true); setData(null); })
      .finally(() => setLoading(false));
  }, [admissionId]);

  if (loading) {
    return (
      <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
        Dang tai bieu do thong ke…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '8px 0', fontSize: 'var(--fs-sm)', color: 'var(--s-crit)' }}>
        Khong tai duoc thong ke. Thu lai sau.
      </div>
    );
  }

  const hasDrugs = (data?.drugCounts?.length ?? 0) > 0;
  const hasDiag = (data?.diagnosisFrequency?.length ?? 0) > 0;

  if (!hasDrugs && !hasDiag) {
    return (
      <div style={{ padding: '8px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-3)' }}>
        Chua co du lieu thong ke (can it nhat 1 don thuoc noi tru duoc duyet).
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-24)', paddingTop: 'var(--space-4)' }}>
      {/* Bieu do 1: So luong tung thuoc */}
      {hasDrugs && (
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)', marginBottom: 'var(--space-8)' }}>
            <TermIcon name="pill" size={11} /> So luong tung thuoc (tong hop don noi tru)
          </div>
          <div style={{ width: '100%', height: Math.max(180, (data!.drugCounts.length * 32) + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data!.drugCounts}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" fontSize={10} domain={[0, 'auto']} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="medicineName"
                  fontSize={10}
                  width={160}
                  tick={{ textAnchor: 'end' }}
                />
                <RTooltip
                  formatter={(val) => [val ?? 0, 'So luong']}
                  labelFormatter={(label) => label}
                />
                <Bar dataKey="totalQuantity" name="So luong" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {data!.drugCounts.map((_entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bieu do 2: Tan suat tung ma chan doan */}
      {hasDiag && (
        <div>
          <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)', marginBottom: 'var(--space-8)' }}>
            <TermIcon name="clipboard" size={11} /> Tan suat ma chan doan ICD-10 (qua cac don thuoc)
          </div>
          <div style={{ width: '100%', height: Math.max(150, (data!.diagnosisFrequency.length * 32) + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data!.diagnosisFrequency}
                layout="vertical"
                margin={{ top: 4, right: 40, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" horizontal={false} />
                <XAxis type="number" fontSize={10} domain={[0, 'auto']} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="diagnosisCode"
                  fontSize={10}
                  width={80}
                  tick={{ textAnchor: 'end' }}
                />
                <RTooltip
                  formatter={(val, _name, item) => {
                    const p = (item?.payload ?? {}) as { diagnosisCode?: string; diagnosisName?: string };
                    const label = p.diagnosisName
                      ? `${p.diagnosisCode} — ${p.diagnosisName}`
                      : (p.diagnosisCode ?? '');
                    return [val ?? 0, label];
                  }}
                  labelFormatter={(label) => `Ma CĐ: ${label}`}
                />
                <Bar dataKey="count" name="So don" radius={[0, 3, 3, 0]} isAnimationActive={false}>
                  {data!.diagnosisFrequency.map((_entry, index) => (
                    <Cell key={index} fill={CHART_COLORS[(index + 3) % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main section component — rendered inside the patient detail drawer
// ---------------------------------------------------------------------------

export interface TreatmentMonitorSectionProps {
  patient: InpatientListDto;
  onRefresh: () => void;
}

type ActiveModal = 'vitals' | 'transfer' | 'nutrition' | 'infusion' | 'transfusion' | 'billing' | 'cabinet' | 'drugReturn' | 'prescription' | 'dischargePrescription' | 'clsOrders' | 'discharge' | 'diagnosis' | 'treatmentSheets' | null;

const TreatmentMonitorSection: React.FC<TreatmentMonitorSectionProps> = ({ patient, onRefresh }) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const close = () => setActiveModal(null);
  const done = () => { close(); onRefresh(); };

  return (
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> THEO DOI DIEU TRI</h5>
      <div style={{ display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        <Btn variant="primary" onClick={() => setActiveModal('prescription')}>
          <TermIcon name="pill" size={12} /> Ke y lenh thuoc
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('vitals')}>
          <TermIcon name="activity" size={12} /> Sinh hieu
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('transfer')}>
          <TermIcon name="navigation" size={12} /> Chuyen khoa
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('nutrition')}>
          <TermIcon name="package" size={12} /> Suat an
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('infusion')}>
          <TermIcon name="flask" size={12} /> Truyen dich
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('transfusion')}>
          <TermIcon name="heart" size={12} /> Truyen mau
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('billing')}>
          <TermIcon name="file-text" size={12} /> Bang ke 6556
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('cabinet')}>
          <TermIcon name="package" size={12} /> Xuat tu truc
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('drugReturn')}>
          <TermIcon name="rotate-ccw" size={12} /> Hoan tra thuoc
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('clsOrders')}>
          <TermIcon name="list" size={12} /> Chi dinh CLS
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('diagnosis')}>
          <TermIcon name="clipboard" size={12} /> Chan doan
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('dischargePrescription')}>
          <TermIcon name="home" size={12} /> Don xuat vien
        </Btn>
        <Btn variant="ghost" onClick={() => setActiveModal('treatmentSheets')}>
          <TermIcon name="printer" size={12} /> To dieu tri
        </Btn>
        <Btn variant="crit" onClick={() => setActiveModal('discharge')}>
          <TermIcon name="log-out" size={12} /> Ra vien
        </Btn>
      </div>

      <VitalSignsModal
        open={activeModal === 'vitals'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />
      <TransferModal
        open={activeModal === 'transfer'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />
      <NutritionModal
        open={activeModal === 'nutrition'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />
      <InfusionModal
        open={activeModal === 'infusion'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />
      <BloodTransfusionModal
        open={activeModal === 'transfusion'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />
      <BillingStatementModal
        open={activeModal === 'billing'}
        admissionId={patient.admissionId}
        onClose={close}
      />

      {/* G-10b: Xuất tủ trực nội trú */}
      <CabinetIssueModal
        open={activeModal === 'cabinet'}
        onClose={close}
        onSaved={done}
        patientName={patient.patientName}
        patientCode={patient.patientCode}
        admissionId={patient.admissionId}
      />

      {/* G-02: Hoàn trả thuốc y lệnh */}
      <DrugReturnModal
        open={activeModal === 'drugReturn'}
        admissionId={patient.admissionId}
        patientId={patient.patientId}
        onClose={close}
        onDone={done}
      />

      {/* Kê y lệnh thuốc nội trú có cấu trúc (thường quy) */}
      <InpatientPrescriptionModal
        open={activeModal === 'prescription'}
        admissionId={patient.admissionId}
        drugOrderType={1}
        patientName={`${patient.patientName} · ${patient.patientCode}`}
        onClose={close}
        onDone={done}
      />

      {/* G-07: Đơn thuốc xuất viện (toa về) — modal chuyên dụng với ItemPicker */}
      <DischargePrescriptionModal
        open={activeModal === 'dischargePrescription'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />

      {/* 3.7: Ra viện + tổng kết bệnh án */}
      <DischargeModal
        open={activeModal === 'discharge'}
        patient={patient}
        onClose={close}
        onDone={done}
      />

      {/* G-08 + G-15: Chỉ định CLS — hủy nhiều + đổi đối tượng TT */}
      <ClsOrdersModal
        open={activeModal === 'clsOrders'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />

      {/* Chẩn đoán chính + kèm theo */}
      <InpatientDiagnosisModal
        open={activeModal === 'diagnosis'}
        admissionId={patient.admissionId}
        onClose={close}
        onDone={done}
      />

      {/* G-01: Trả KQ XN tại giường — section riêng, không dùng modal trigger */}
      <BedLabResultSection admissionId={patient.admissionId} />

      {/* F8.13: 2 bieu do thong ke qua trinh dieu tri */}
      <div style={{ marginTop: 'var(--space-16)', padding: '12px 0', borderTop: '1px solid var(--line-soft)' }}>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--t-1)', marginBottom: 'var(--space-12)' }}>
          <TermIcon name="bar-chart-2" size={12} /> THONG KE QUA TRINH DIEU TRI
        </div>
        <TreatmentStatSection admissionId={patient.admissionId} />
      </div>

      {/* In tờ điều trị nhiều đợt */}
      <TreatmentSheetsModal
        open={activeModal === 'treatmentSheets'}
        admissionId={patient.admissionId}
        onClose={close}
      />
    </div>
  );
};

export default TreatmentMonitorSection;
