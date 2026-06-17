/**
 * InpatientPrescriptionModal — Ke y lenh thuoc noi tru CO CAU TRUC.
 *
 * Thay cho textarea tu do: bang dong thuoc voi search thuoc theo kho dang chon,
 * lieu dung / duong dung / so ngay / so lan/ngay / so luong moi lan / doi tuong (BHYT|Thu phi).
 *
 * Tai dung cho 2 loai don qua prop `drugOrderType`:
 *   1 = Thuong qui (ke y lenh thuong ngay) — mac dinh
 *   4 = Don xuat vien (toa ve)
 *
 * API (da verify trong api/inpatient.ts):
 *   - searchMedicines(keyword, warehouseId)         → MedicineSearchItemDto[]
 *   - getPrescriptionTemplates(departmentId?)       → PrescriptionTemplateDto[]
 *   - prescribeByTemplate(admissionId, templateId)  → tao don tu mau (tao ngay)
 *   - getDiagnosisFromRecord(admissionId)           → { diagnosisCode?, diagnosis? }
 *   - createPrescription(CreateInpatientPrescriptionDto)
 *   - warehouse.getWarehouses(1)                    → kho thuoc (type 1)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AutoComplete, DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import {
  searchMedicines, createPrescription, getPrescriptionTemplates,
  prescribeByTemplate, getDiagnosisFromRecord,
} from '../../api/inpatient';
import type {
  MedicineSearchItemDto, CreateInpatientPrescriptionDto,
  PrescriptionTemplateDto,
} from '../../api/inpatient';
import { getWarehouses } from '../../api/warehouse';
import type { WarehouseDto } from '../../api/warehouse';
import { ModalShell, Btn, DrSec, DrField, tk, tw, te } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';

// ── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_SOURCE_OPTIONS = [
  { value: 1, label: 'BHYT' },
  { value: 2, label: 'Thu phí' },
];

// ── Types ────────────────────────────────────────────────────────────────────

interface RxLine {
  _key: string;
  medicineId: string;
  medicineCode: string;
  medicineName: string;
  unit: string;
  unitPrice: number;
  dosage: string;        // liều mỗi lần (VD: 1 viên)
  route: string;         // đường dùng → usageInstructions
  days: number;          // số ngày
  timesPerDay: number;   // số lần / ngày
  qtyPerTime: number;    // số lượng mỗi lần
  paymentSource: number; // 1 BHYT / 2 Thu phí
}

let _seq = 0;
function emptyLine(): RxLine {
  return {
    _key: `rx${_seq++}`,
    medicineId: '', medicineCode: '', medicineName: '', unit: '', unitPrice: 0,
    dosage: '', route: '', days: 1, timesPerDay: 1, qtyPerTime: 1, paymentSource: 1,
  };
}

const lineQuantity = (l: RxLine): number =>
  Math.max(1, Math.round((l.days || 0) * (l.timesPerDay || 0) * (l.qtyPerTime || 0)) || 1);

// ── Medicine search picker (debounced) ───────────────────────────────────────

const MedicinePicker: React.FC<{
  warehouseId: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (med: MedicineSearchItemDto) => void;
}> = ({ warehouseId, value, onChange, onSelect }) => {
  const [options, setOptions] = useState<{ value: string; label: string; med: MedicineSearchItemDto }[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = (kw: string) => {
    onChange(kw);
    if (timer.current) clearTimeout(timer.current);
    if (!kw.trim() || !warehouseId) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await searchMedicines(kw.trim(), warehouseId);
        const meds = (res.data as MedicineSearchItemDto[]) || [];
        setOptions(meds.map((m) => ({
          value: m.id,
          label: `[${m.code ?? '—'}] ${m.name}${m.unit ? ` · ${m.unit}` : ''}${m.stock != null ? ` (tồn: ${m.stock})` : ''}`,
          med: m,
        })));
      } catch {
        setOptions([]);
      }
    }, 280);
  };

  return (
    <AutoComplete
      value={value}
      options={options}
      onChange={onChange}
      onSearch={handleSearch}
      onSelect={(_v, opt) => onSelect((opt as typeof options[number]).med)}
      placeholder="Tìm tên / mã thuốc…"
      allowClear
      filterOption={false}
      style={{ width: '100%' }}
      disabled={!warehouseId}
    />
  );
};

// ── Main modal ───────────────────────────────────────────────────────────────

export interface InpatientPrescriptionModalProps {
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
  /** 1 = Thường quy (mặc định) · 4 = Đơn xuất viện (toa về) */
  drugOrderType?: number;
  patientName?: string;
}

export const InpatientPrescriptionModal: React.FC<InpatientPrescriptionModalProps> = ({
  open, admissionId, onClose, onDone, drugOrderType = 1, patientName,
}) => {
  const isDischargeRx = drugOrderType === 4;

  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState<dayjs.Dayjs>(dayjs());
  const [mainDiagnosisCode, setMainDiagnosisCode] = useState('');
  const [mainDiagnosis, setMainDiagnosis] = useState('');
  const [lines, setLines] = useState<RxLine[]>([emptyLine()]);
  const [lineLabels, setLineLabels] = useState<Record<string, string>>({});
  const [templates, setTemplates] = useState<PrescriptionTemplateDto[]>([]);
  const [templateId, setTemplateId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [tplBusy, setTplBusy] = useState(false);

  const loadInit = useCallback(async () => {
    // Kho thuốc (type 1) — đúng pattern InpatientDispensing
    try {
      const w = await getWarehouses(1);
      const list = (w.data as WarehouseDto[]) || [];
      setWarehouses(list);
      if (list.length === 1) setWarehouseId(list[0].id);
    } catch { setWarehouses([]); }
    // Đơn mẫu
    try {
      const t = await getPrescriptionTemplates();
      setTemplates(Array.isArray(t.data) ? t.data : []);
    } catch { setTemplates([]); }
    // Chẩn đoán từ HSBA
    try {
      const r = await getDiagnosisFromRecord(admissionId);
      setMainDiagnosisCode(r.data?.mainDiagnosisCode ?? '');
      setMainDiagnosis(r.data?.mainDiagnosis ?? '');
    } catch { /* không bắt buộc */ }
  }, [admissionId]);

  useEffect(() => {
    if (!open) return;
    setWarehouseId('');
    setPrescriptionDate(dayjs());
    setMainDiagnosisCode(''); setMainDiagnosis('');
    setLines([emptyLine()]); setLineLabels({});
    setTemplateId(undefined);
    void loadInit();
  }, [open, loadInit]);

  const updateLine = (key: string, patch: Partial<RxLine>) =>
    setLines((ls) => ls.map((l) => (l._key === key ? { ...l, ...patch } : l)));
  const removeLine = (key: string) =>
    setLines((ls) => (ls.length > 1 ? ls.filter((l) => l._key !== key) : ls));
  const addLine = () => setLines((ls) => [...ls, emptyLine()]);

  // Tải các dòng thuốc từ đơn mẫu vào bảng để chỉnh trước khi lưu
  const loadTemplateItems = () => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) { tw('Chọn đơn mẫu trước'); return; }
    if (!tpl.items?.length) { tw('Đơn mẫu không có thuốc'); return; }
    const newLines: RxLine[] = tpl.items.map((it) => ({
      ...emptyLine(),
      medicineId: it.medicineId,
      medicineCode: it.medicineCode,
      medicineName: it.medicineName,
      dosage: it.defaultDosage ?? '',
      route: it.defaultUsage ?? '',
      qtyPerTime: 1, timesPerDay: 1, days: it.defaultQuantity || 1,
    }));
    setLines(newLines);
    const labels: Record<string, string> = {};
    newLines.forEach((l) => { labels[l._key] = l.medicineName; });
    setLineLabels(labels);
    tk(`Đã nạp ${newLines.length} thuốc từ đơn mẫu — điều chỉnh rồi Lưu`);
  };

  // Kê ngay theo đơn mẫu (tạo luôn, không qua bảng)
  const quickPrescribeTemplate = async () => {
    if (!templateId) { tw('Chọn đơn mẫu trước'); return; }
    setTplBusy(true);
    try {
      await prescribeByTemplate(admissionId, templateId);
      tk('Đã kê đơn theo mẫu');
      onDone();
    } catch {
      te('Kê đơn theo mẫu thất bại');
    } finally {
      setTplBusy(false);
    }
  };

  const submit = async () => {
    if (!warehouseId) { tw('Chọn kho thuốc trước'); return; }
    const valid = lines.filter((l) => l.medicineId);
    if (!valid.length) { tw('Chưa chọn thuốc nào'); return; }
    const dto: CreateInpatientPrescriptionDto = {
      admissionId,
      prescriptionDate: prescriptionDate.toISOString(),
      mainDiagnosisCode: mainDiagnosisCode.trim() || undefined,
      mainDiagnosis: mainDiagnosis.trim() || undefined,
      warehouseId,
      drugOrderType,
      items: valid.map((l) => ({
        medicineId: l.medicineId,
        quantity: lineQuantity(l),
        dosage: l.dosage.trim() || undefined,
        usageInstructions: l.route.trim() || undefined,
        paymentSource: l.paymentSource,
        note: `${l.qtyPerTime} x ${l.timesPerDay} lần/ngày x ${l.days} ngày`,
      })),
    };
    setSaving(true);
    try {
      await createPrescription(dto);
      tk(isDischargeRx ? 'Đã lưu đơn thuốc xuất viện' : 'Đã lưu y lệnh thuốc');
      onDone();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      te(msg || 'Lưu y lệnh thuốc thất bại');
    } finally {
      setSaving(false);
    }
  };

  const totalEst = lines.reduce((s, l) => s + l.unitPrice * lineQuantity(l), 0);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="pill" size={14} />
          <span>{isDischargeRx ? 'Đơn thuốc xuất viện (toa về)' : 'Kê y lệnh thuốc nội trú'}</span>
        </span>
      }
      sub={patientName}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
          <Btn variant="ghost" size="sm" onClick={onClose}>Đóng</Btn>
          <Btn variant="primary" size="sm" loading={saving} disabled={!warehouseId} onClick={() => { void submit(); }}>
            <TermIcon name="check" size={12} /> Lưu y lệnh
          </Btn>
        </div>
      }
    >
      {/* Thông tin chung */}
      <DrSec title="Thông tin đơn">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          <DrField lbl="Kho thuốc *">
            <Select
              value={warehouseId || undefined}
              onChange={setWarehouseId}
              placeholder="Chọn kho thuốc…"
              style={{ width: '100%' }}
              options={warehouses.map((w) => ({ value: w.id, label: `${w.warehouseCode} · ${w.warehouseName}` }))}
              showSearch
              filterOption={(q, opt) => (opt?.label as string ?? '').toLowerCase().includes(q.toLowerCase())}
              notFoundContent={warehouses.length === 0 ? 'Không có kho thuốc' : 'Không tìm thấy'}
            />
          </DrField>
          <DrField lbl="Ngày kê *">
            <DatePicker
              showTime value={prescriptionDate}
              onChange={(v) => setPrescriptionDate(v ?? dayjs())}
              format="DD/MM/YYYY HH:mm" style={{ width: '100%' }}
            />
          </DrField>
          <DrField lbl="Mã chẩn đoán">
            <Input value={mainDiagnosisCode} onChange={(e) => setMainDiagnosisCode(e.target.value)} placeholder="VD: J18.9" />
          </DrField>
          <DrField lbl="Chẩn đoán">
            <Input value={mainDiagnosis} onChange={(e) => setMainDiagnosis(e.target.value)} placeholder="Chẩn đoán chính" />
          </DrField>
        </div>
      </DrSec>

      {/* Đơn mẫu */}
      <DrSec title="Đơn mẫu">
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center', flexWrap: 'wrap' }}>
          <Select
            value={templateId}
            onChange={setTemplateId}
            placeholder="Chọn đơn mẫu…"
            style={{ minWidth: 260, flex: 1 }}
            options={templates.map((t) => ({ value: t.id, label: `${t.templateName}${t.items?.length ? ` (${t.items.length} thuốc)` : ''}` }))}
            showSearch
            filterOption={(q, opt) => (opt?.label as string ?? '').toLowerCase().includes(q.toLowerCase())}
            allowClear
            notFoundContent={templates.length === 0 ? 'Chưa có đơn mẫu' : 'Không tìm thấy'}
          />
          <Btn variant="ghost" size="sm" disabled={!templateId} onClick={loadTemplateItems}>
            <TermIcon name="download" size={11} /> Nạp vào bảng
          </Btn>
          <Btn variant="ghost" size="sm" loading={tplBusy} disabled={!templateId} onClick={() => { void quickPrescribeTemplate(); }}>
            <TermIcon name="zap" size={11} /> Kê ngay theo mẫu
          </Btn>
        </div>
      </DrSec>

      {/* Bảng dòng thuốc */}
      <DrSec title={`Thuốc (${lines.length} dòng)`} action={
        <Btn variant="ghost" size="sm" onClick={addLine}><TermIcon name="plus" size={11} /> Thêm</Btn>
      }>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-sm)', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'var(--d-1)', borderBottom: '1px solid var(--line)' }}>
                {['Thuốc', 'Liều', 'Đường dùng', 'Số ngày', 'Lần/ngày', 'SL/lần', 'SL', 'Đối tượng', ''].map((h) => (
                  <th key={h} style={{ padding: '4px 6px', textAlign: 'left', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l._key} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '4px', minWidth: 200 }}>
                    <MedicinePicker
                      warehouseId={warehouseId}
                      value={lineLabels[l._key] ?? ''}
                      onChange={(v) => setLineLabels((m) => ({ ...m, [l._key]: v }))}
                      onSelect={(med) => {
                        setLineLabels((m) => ({ ...m, [l._key]: med.name }));
                        updateLine(l._key, {
                          medicineId: med.id,
                          medicineCode: med.code ?? '',
                          medicineName: med.name,
                          unit: med.unit ?? '',
                          unitPrice: med.unitPrice ?? 0,
                        });
                      }}
                    />
                  </td>
                  <td style={{ padding: '4px', width: 90 }}>
                    <Input size="small" value={l.dosage} onChange={(e) => updateLine(l._key, { dosage: e.target.value })} placeholder="1 viên" />
                  </td>
                  <td style={{ padding: '4px', width: 110 }}>
                    <Input size="small" value={l.route} onChange={(e) => updateLine(l._key, { route: e.target.value })} placeholder="Uống / Tiêm…" />
                  </td>
                  <td style={{ padding: '4px', width: 70 }}>
                    <InputNumber size="small" min={1} max={365} value={l.days} onChange={(v) => updateLine(l._key, { days: v ?? 1 })} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '4px', width: 70 }}>
                    <InputNumber size="small" min={1} max={24} value={l.timesPerDay} onChange={(v) => updateLine(l._key, { timesPerDay: v ?? 1 })} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '4px', width: 70 }}>
                    <InputNumber size="small" min={0.1} step={0.5} value={l.qtyPerTime} onChange={(v) => updateLine(l._key, { qtyPerTime: v ?? 1 })} style={{ width: '100%' }} />
                  </td>
                  <td style={{ padding: '4px', width: 50, textAlign: 'right', fontWeight: 600 }}>{lineQuantity(l)}</td>
                  <td style={{ padding: '4px', width: 100 }}>
                    <Select<number>
                      size="small" value={l.paymentSource}
                      onChange={(v) => updateLine(l._key, { paymentSource: v })}
                      options={PAYMENT_SOURCE_OPTIONS} style={{ width: '100%' }}
                    />
                  </td>
                  <td style={{ padding: '4px', width: 32 }}>
                    {lines.length > 1 && (
                      <Btn variant="ghost" size="sm" onClick={() => removeLine(l._key)} style={{ color: 'var(--s-crit)' }}>
                        <TermIcon name="x" size={11} />
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalEst > 0 && (
          <div style={{ textAlign: 'right', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-6)', color: 'var(--t-1)' }}>
            Tổng dự tính: <b>{totalEst.toLocaleString('vi-VN')} ₫</b>
          </div>
        )}
      </DrSec>
    </ModalShell>
  );
};

export default InpatientPrescriptionModal;
