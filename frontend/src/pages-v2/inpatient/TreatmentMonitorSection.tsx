/**
 * Theo doi dieu tri (B1.5)
 * Slice-1: Sinh hieu · Chuyen khoa · Chi dinh suat an
 * Slice-2: Truyen dich · Truyen mau · Bang ke vien phi 6556
 * All APIs verified in frontend/src/api/inpatient.ts
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select, DatePicker } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
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
} from '../../api/inpatient';
import type {
  CreateVitalSignsDto,
  VitalSignsChartDto,
  DepartmentTransferDto,
  CreateNutritionOrderDto,
  CreateInfusionRecordDto,
  CreateBloodTransfusionDto,
  BillingStatement6556Dto,
  InpatientListDto,
} from '../../api/inpatient';
import { catalogApi } from '../../api/system';
import type { DepartmentCatalogDto } from '../../api/system';
import { ModalShell, Btn } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

const IpFld: React.FC<{ label: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
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
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Form */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t-1)' }}>
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
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)', fontSize: 12 }}>
              Đang tải biểu đồ…
            </div>
          )}
          {!chartLoading && !hasChartData && (
            <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-2)', fontSize: 12 }}>
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
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="sys" name="Tâm thu" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="dia" name="Tâm trương" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
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
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
          <div style={{ gridColumn: '1 / -1', fontSize: 11, color: 'var(--t-2)' }}>
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
      <div style={{ padding: 16 }}>
        <div style={{
          marginBottom: 12, padding: '8px 12px', borderRadius: 6,
          background: 'var(--warn-soft, #fff7ed)', border: '1px solid var(--warn, #fb923c)',
          fontSize: 11, color: 'var(--t-1)',
        }}>
          ⚠ Đảm bảo đã định nhóm máu tại giường &amp; phản ứng chéo trước khi truyền.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12, fontWeight: strong ? 700 : 400 }}>
      <span style={{ color: 'var(--t-2)' }}>{label}</span>
      <span style={{ color: strong ? 'var(--accent, #0891b2)' : 'var(--t-1)' }}>{fmtMoney(value)}</span>
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
      <div style={{ padding: 16 }}>
        {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)', fontSize: 12 }}>Đang tải bảng kê…</div>}
        {!loading && !data && <div style={{ padding: 24, textAlign: 'center', color: 'var(--t-2)', fontSize: 12 }}>Chưa có bảng kê (cần xuất viện trước).</div>}
        {!loading && data && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12, marginBottom: 14 }}>
              <div><span style={{ color: 'var(--t-2)' }}>Bệnh nhân: </span><b>{data.patientName}</b> ({data.patientCode})</div>
              <div><span style={{ color: 'var(--t-2)' }}>Số thẻ BHYT: </span>{data.insuranceNumber || '—'}</div>
              <div><span style={{ color: 'var(--t-2)' }}>Chẩn đoán: </span>{data.diagnosisCode ? `${data.diagnosisCode} - ` : ''}{data.diagnosis || '—'}</div>
              <div><span style={{ color: 'var(--t-2)' }}>Số ngày điều trị: </span>{data.daysOfStay}</div>
            </div>

            <div style={{ maxHeight: 280, overflow: 'auto', border: '1px solid var(--line-soft)', borderRadius: 6 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ background: 'var(--d-1, #f7f9fc)', position: 'sticky', top: 0 }}>
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
                      <td style={{ padding: '5px 8px' }}>{it.itemName}<span style={{ color: 'var(--t-2)' }}> · {it.unit}</span></td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{it.quantity}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.unitPrice)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.amount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.insuranceAmount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmtMoney(it.patientAmount)}</td>
                    </tr>
                  ))}
                  {(data.items || []).length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 16, textAlign: 'center', color: 'var(--t-2)' }}>Không có khoản mục chi phí</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 12, maxWidth: 360, marginLeft: 'auto' }}>
              {sum(['Tổng chi phí', data.totalAmount])}
              {sum(['BHYT chi trả', data.insuranceAmount])}
              {sum(['Cùng chi trả', data.patientCoPayAmount])}
              {sum(['Chi phí ngoài BHYT', data.outOfPocketAmount])}
              {sum(['Đã tạm ứng', data.depositAmount])}
              {sum(['Hoàn trả', data.refundAmount])}
              <div style={{ borderTop: '1px solid var(--line-soft)', marginTop: 4, paddingTop: 4 }}>
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
// Main section component — rendered inside the patient detail drawer
// ---------------------------------------------------------------------------

export interface TreatmentMonitorSectionProps {
  patient: InpatientListDto;
  onRefresh: () => void;
}

type ActiveModal = 'vitals' | 'transfer' | 'nutrition' | 'infusion' | 'transfusion' | 'billing' | null;

const TreatmentMonitorSection: React.FC<TreatmentMonitorSectionProps> = ({ patient, onRefresh }) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const close = () => setActiveModal(null);
  const done = () => { close(); onRefresh(); };

  return (
    <div className="rec-section">
      <h5><TermIcon name="activity" size={11} /> THEO DOI DIEU TRI</h5>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
    </div>
  );
};

export default TreatmentMonitorSection;