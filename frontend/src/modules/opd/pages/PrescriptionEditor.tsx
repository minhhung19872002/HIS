/* =====================================================================
 * PrescriptionEditor v2 — full-screen kê đơn (native v2, ab-* design)
 * Ported from design-system bundle mod-prescription-editor-v2.jsx.
 * 3-col layout: Patient panel (trái) · Editor (giữa) · Warnings/Tools (phải)
 * Real API: patientApi (search/getById), examinationApi (searchMedicines /
 * checkDrugInteractions / createPrescription / getPrescriptionTemplates /
 * searchExaminations), dataInheritance (getPrescriptionContext). No backend
 * change. Replaces the old navigate('/prescription') v1 jump.
 * ===================================================================== */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  KpiStrip, StatusBadge, ActBtn, Btn, ModalShell, DrawerShell, fmtVNDg, tk, tw, te,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { examinationApi, printExternalPrescription, type MedicineDto, type DrugInteractionDto, type CreatePrescriptionDto, type PrescriptionTemplateDto, type WarehouseDto } from '../api/examination';
import { patientApi, type Patient } from '../../patient/api/patient';
import { getPrescriptionContext, type PrescriptionContextDto } from '../../patient/api/dataInheritance';
import PatientFlagBanner from '../../patient/components/PatientFlagBanner';
import BusinessAlertPanel from '../../patient/components/BusinessAlertPanel';
import '../../../components/layout/terminal/ed-responsive.css';
import { fmtDate } from '../../../utils/format';
import { HOSPITAL_NAME, HOSPITAL_ADDRESS } from '../../../constants/hospital';

const RX_ROUTE = ['Uống', 'Tiêm bắp', 'Tiêm tĩnh mạch', 'Bôi ngoài da', 'Khí dung', 'Ngậm dưới lưỡi'];

interface RxItem {
  medicineId: string; code: string; name: string;
  // Dose schedule S/T/Ch/T (patient-safety — serialised via formatDosage for DTO)
  morning: number; noon: number; evening: number; night: number;
  mealTiming: 'before' | 'after' | '';
  freq: string; qty: number; days: number; route: string; note: string; price: number;
  // Pharmacy clarity fields
  dosageForm: string; strength: string;
  // Per-item BHYT: true=BHYT covers, false=self-pay (paymentType 1 vs 2 in DTO)
  bhyt: boolean;
}

const ageOf = (p: Patient): number => {
  if (p.yearOfBirth) return new Date().getFullYear() - p.yearOfBirth;
  if (p.dateOfBirth) return new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
  return 0;
};
const vitalsStr = (c: PrescriptionContextDto | null): string => {
  if (!c) return '';
  const parts: string[] = [];
  if (c.bloodPressureSystolic && c.bloodPressureDiastolic) parts.push(`HA ${c.bloodPressureSystolic}/${c.bloodPressureDiastolic}`);
  if (c.pulse) parts.push(`M ${c.pulse}`);
  if (c.temperature) parts.push(`T ${c.temperature}°C`);
  if (c.spO2) parts.push(`SpO₂ ${c.spO2}%`);
  return parts.join(' · ');
};

/** Serialise structured dose → 'Sáng: 1, Tối: 1 (Sau ăn)' for DTO dosage field. */
const formatDosage = (it: Pick<RxItem, 'morning' | 'noon' | 'evening' | 'night' | 'mealTiming'>): string => {
  const parts: string[] = [];
  if (it.morning > 0) parts.push(`Sáng: ${it.morning}`);
  if (it.noon > 0) parts.push(`Trưa: ${it.noon}`);
  if (it.evening > 0) parts.push(`Chiều: ${it.evening}`);
  if (it.night > 0) parts.push(`Tối: ${it.night}`);
  let result = parts.join(', ') || '—';
  if (it.mealTiming === 'before') result += ' (Trước ăn)';
  else if (it.mealTiming === 'after') result += ' (Sau ăn)';
  return result;
};

const PrescriptionEditorV2: React.FC = () => {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  // Responsive panels (tablet ≤1180px slide-over)
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const closeAll = () => { setLeftOpen(false); setRightOpen(false); };

  const [pt, setPt] = useState<Patient | null>(null);
  const [ctx, setCtx] = useState<PrescriptionContextDto | null>(null);
  const [examinationId, setExamId] = useState<string | null>(null);
  const [type, setType] = useState<1 | 2>(1); // 1 = Ngoại trú, 2 = YHCT
  const [warehouse, setWh] = useState('');
  const [warehouses, setWarehouses] = useState<WarehouseDto[]>([]);
  const [items, setItems] = useState<RxItem[]>([]);
  const [interactions, setInteractions] = useState<DrugInteractionDto[]>([]);
  const [templates, setTemplates] = useState<PrescriptionTemplateDto[]>([]);

  const [drugQuery, setDQ] = useState('');
  const [drugResults, setDrugResults] = useState<MedicineDto[]>([]);

  const [searchOpen, setSearchOpen] = useState(false);
  const [interOpen, setInterOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // F3 = BHYT/Thu phí (kho nội viện), F5 = Toa mua ngoài (nhà thuốc)
  const [rxMode, setRxMode] = useState<1 | 2>(1);
  const [printingExt, setPrintingExt] = useState(false);
  // Save-as-template
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDiagnosis, setTemplateDiagnosis] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);
  // Interaction gate: tracks which save action was blocked by interactions
  const [pendingAction, setPendingAction] = useState<'draft' | 'sign' | null>(null);
  // Phiếu công khai thuốc MSS-01
  const [disclosureOpen, setDisclosureOpen] = useState(false);

  const allergyNames = (ctx?.allergies || []).map((a) => a.allergenName);
  const total = items.reduce((s, x) => s + x.price * x.qty, 0);
  const intCount = interactions.length;

  // ── Patient: select + derive examination context ────────────────
  // Guard chống race khi đổi BN nhanh: response cũ đến muộn không được ghi đè context BN đang chọn (#416 patient-safety, cùng pattern #374)
  const selectReqRef = useRef(0);
  const selectPatient = useCallback(async (p: Patient) => {
    const reqId = ++selectReqRef.current;
    setPt(p);
    setSearchOpen(false);
    setCtx(null);
    setExamId(null);
    setItems([]); // xóa giỏ thuốc BN cũ ngay lập tức — tránh toa BN-A gắn vào phiếu BN-B (#416 patient-safety)
    setInteractions([]);
    try {
      const res = await examinationApi.searchExaminations({ patientCode: p.patientCode, pageIndex: 0, pageSize: 1 });
      if (selectReqRef.current !== reqId) return; // BN khác đã được chọn trong lúc chờ — bỏ response cũ
      const data = res.data as { items?: Array<{ id: string }> } | Array<{ id: string }>;
      const list = Array.isArray(data) ? data : data?.items;
      const exId = list && list.length > 0 ? list[0].id : null;
      if (exId) {
        setExamId(exId);
        const ctxRes = await getPrescriptionContext(exId);
        if (selectReqRef.current !== reqId) return;
        if (ctxRes.data) setCtx(ctxRes.data);
      }
    } catch {
      // No examination found → editor still usable but cannot complete.
    }
  }, []);

  // ── Preload from URL (?examId= from OPD, or ?patientId=) ─────────
  useEffect(() => {
    const exId = sp.get('examId');
    const pid = sp.get('patientId');
    (async () => {
      try {
        if (exId) {
          const reqId = ++selectReqRef.current; // preload cũng là 1 request — thua nếu user chọn BN tay trong lúc chờ
          const ctxRes = await getPrescriptionContext(exId);
          if (selectReqRef.current !== reqId) return;
          if (ctxRes.data) {
            setCtx(ctxRes.data);
            setExamId(exId);
            const pRes = await patientApi.getById(ctxRes.data.patientId);
            if (selectReqRef.current !== reqId) return;
            if (pRes.data) setPt(pRes.data);
          }
        } else if (pid) {
          // Guard: nếu user chọn BN tay trong lúc getById đang chờ → preload thua và bị bỏ (#416)
          const reqId = ++selectReqRef.current;
          const pRes = await patientApi.getById(pid);
          if (selectReqRef.current !== reqId) return;
          if (pRes.data) await selectPatient(pRes.data);
        }
      } catch { /* ignore preload errors */ }
    })();
  }, [sp, selectPatient]);

  // ── Templates (once) ─────────────────────────────────────────────
  useEffect(() => {
    examinationApi.getPrescriptionTemplates()
      .then((r) => { if (Array.isArray(r.data)) setTemplates(r.data); })
      .catch(() => { /* templates optional */ });
    examinationApi.getDispensaryWarehouses()
      .then((r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        setWarehouses(list);
        if (list.length > 0) setWh(list[0].id);
      })
      .catch(() => { /* warehouses optional */ });
  }, []);

  // ── Drug interactions: re-check when cart changes ────────────────
  useEffect(() => {
    if (items.length < 2) { setInteractions([]); return; }
    let cancelled = false;
    examinationApi.checkDrugInteractions(items.map((x) => x.medicineId))
      .then((r) => { if (!cancelled && Array.isArray(r.data)) setInteractions(r.data); })
      .catch(() => { if (!cancelled) setInteractions([]); });
    return () => { cancelled = true; };
  }, [items]);

  // ── Drug search ──────────────────────────────────────────────────
  const searchDrugs = useCallback(async (q: string) => {
    setDQ(q);
    if (!q || q.length < 2) { setDrugResults([]); return; }
    try {
      const r = await examinationApi.searchMedicines(q, undefined, 20);
      setDrugResults(Array.isArray(r.data) ? r.data : []);
    } catch { setDrugResults([]); }
  }, []);

  const addDrug = (d: MedicineDto) => {
    setItems((p) => [...p, {
      medicineId: d.id, code: d.code, name: d.name,
      morning: 1, noon: 0, evening: 0, night: 1,
      mealTiming: '' as const,
      freq: '1 lần/ngày', qty: 30, days: 30, route: 'Uống', note: '', price: d.unitPrice,
      dosageForm: d.unit || 'Viên',
      strength: d.name.match(/\d+\s*mg/i)?.[0] || '',
      bhyt: !!pt?.insuranceNumber,
    }]);
    setDQ(''); setDrugResults([]);
    tk(`Đã thêm ${d.name}`);
  };
  const updateItem = (i: number, k: keyof RxItem, v: string | number | boolean) =>
    setItems((p) => p.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const removeItem = (i: number) => setItems((p) => p.filter((_, j) => j !== i));

  // ── Save / complete ──────────────────────────────────────────────
  // Derive paymentCategory: 3=Thuốc ngoài (F5), 1=BHYT, 2=Thu phí
  const derivePaymentCategory = (): number => {
    if (rxMode === 2) return 3; // F5 = mua ngoài / nhà thuốc
    if (ctx?.patientType === 1) return 1; // BHYT
    return 2; // Thu phí / viện phí
  };

  const buildDto = (): CreatePrescriptionDto => ({
    examinationId: examinationId!,
    prescriptionType: type,
    paymentCategory: derivePaymentCategory(),
    diagnosisCode: ctx?.mainIcdCode,
    diagnosisName: ctx?.mainDiagnosis,
    warehouseId: warehouse || undefined,
    totalDays: items.reduce((m, x) => Math.max(m, x.days), 0),
    items: items.map((it) => ({
      medicineId: it.medicineId, quantity: it.qty, days: it.days,
      dosage: formatDosage(it), route: it.route, frequency: it.freq,
      usageInstructions: it.note, paymentType: it.bhyt ? 1 : 2,
    })),
  });

  const guard = (): boolean => {
    if (!pt) { tw('Chưa chọn bệnh nhân'); return false; }
    if (!examinationId) { tw('Bệnh nhân chưa có phiếu khám — không thể lưu đơn'); return false; }
    if (items.length === 0) { tw('Chưa có thuốc trong đơn'); return false; }
    return true;
  };

  const doSaveDraft = async () => {
    setSaving(true);
    try { await examinationApi.createPrescription(buildDto()); tk('Đã lưu nháp đơn thuốc'); }
    catch { te('Lưu nháp thất bại'); }
    finally { setSaving(false); }
  };

  const saveDraft = async () => {
    if (!guard()) return;
    if (interactions.length > 0) { setPendingAction('draft'); setInterOpen(true); return; }
    await doSaveDraft();
  };

  const completeWithSign = async () => {
    setSaving(true);
    try {
      await examinationApi.createPrescription(buildDto());
      setSignOpen(false);
      tk('✓ Đã hoàn tất & ký đơn thuốc');
    } catch { te('Hoàn tất đơn thất bại'); }
    finally { setSaving(false); }
  };

  const onClickSign = () => {
    if (!guard()) return;
    if (interactions.length > 0) { setPendingAction('sign'); setInterOpen(true); return; }
    setSignOpen(true);
  };

  // ── In đơn thuốc nội viện ─────────────────────────────────────────
  const handlePrintInternalRx = () => {
    if (!guard()) return;
    const pw = window.open('', '_blank');
    if (!pw) { tw('Không thể mở cửa sổ in — vui lòng cho phép popup'); return; }
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    pw.document.write(`<!DOCTYPE html><html><head><title>Đơn thuốc</title>
<style>body{font-family:'Times New Roman',serif;font-size:13px;padding:20px}.title{font-size:18px;font-weight:bold;text-align:center;margin:15px 0}.info{margin:5px 0}
table{width:100%;border-collapse:collapse;margin:15px 0}th,td{border:1px solid #000;padding:5px;text-align:left}th{background:#f0f0f0}
.tr{text-align:right}.sig{display:flex;justify-content:space-between;margin-top:40px;text-align:center}
@media print{body{padding:10px}}</style></head><body>
<div style="text-align:center"><strong>${HOSPITAL_NAME}</strong></div>
<div class="title">ĐƠN THUỐC</div>
${pt ? `<div class="info">Họ tên: <strong>${pt.fullName}</strong> — Mã BN: ${pt.patientCode}</div>
<div class="info">Giới: ${pt.gender === 1 ? 'Nam' : 'Nữ'} · BHYT: ${pt.insuranceNumber || 'Không'}</div>` : ''}
<div class="info">Chẩn đoán: <strong>${ctx?.mainDiagnosis || ''}</strong></div>
<table><thead><tr><th>STT</th><th>Tên thuốc</th><th>Liều dùng</th><th>Số ngày</th><th>SL</th><th>Đường dùng</th><th>Ghi chú</th></tr></thead>
<tbody>${items.map((it, i) => `<tr><td>${i + 1}</td>
<td><strong>${it.name}</strong>${it.strength ? `<br/><small>${it.strength}</small>` : ''}</td>
<td>${formatDosage(it)}</td><td>${it.days} ngày</td>
<td>${it.qty} ${it.dosageForm || 'viên'}</td><td>${it.route}</td><td>${it.note || ''}</td></tr>`).join('')}</tbody></table>
<div class="info"><strong>Tổng tiền:</strong> ${total.toLocaleString('vi-VN')} đ</div>
<div class="sig"><div style="width:45%"><div>Ngày ${dd} tháng ${mm} năm ${yyyy}</div><strong>Bác sĩ kê đơn</strong><div style="margin-top:50px"></div></div></div>
</body></html>`);
    pw.document.close(); pw.focus();
    setTimeout(() => { pw.print(); }, 500);
  };

  // ── Phiếu công khai thuốc MSS-01 ──────────────────────────────────
  const handlePrintDrugDisclosure = () => {
    if (items.length === 0) { tw('Chưa có thuốc trong đơn'); return; }
    const pw = window.open('', '_blank');
    if (!pw) { tw('Không thể mở cửa sổ in — vui lòng cho phép popup'); return; }
    const isBHYT = !!pt?.insuranceNumber;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    pw.document.write(`<!DOCTYPE html><html><head><title>Phiếu công khai thuốc</title>
<style>body{font-family:'Times New Roman',serif;font-size:13px;padding:20px}
.ft{font-size:16px;font-weight:bold;text-align:center;margin:15px 0 10px;text-transform:uppercase}
.info{margin:4px 0}table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12px}
th,td{border:1px solid #000;padding:4px 6px}th{background:#f0f0f0;text-align:center;font-weight:bold}
.tr{text-align:right}.tc{text-align:center}.tot{font-weight:bold;background:#fafafa}
.sig{display:flex;justify-content:space-between;margin-top:30px}
.sigcol{width:40%;text-align:center}@media print{body{padding:10px}}</style></head><body>
<div style="text-align:center;margin-bottom:10px"><div style="font-weight:bold;font-size:14px">${HOSPITAL_NAME}</div>
<div style="font-size:12px">${HOSPITAL_ADDRESS}</div></div>
<div class="ft">PHIẾU CÔNG KHAI THUỐC</div>
${pt ? `<div class="info">Họ tên: <strong>${pt.fullName}</strong> &nbsp; Mã BN: <strong>${pt.patientCode}</strong></div>
<div class="info">Giới tính: ${pt.gender === 1 ? 'Nam' : 'Nữ'}</div>
${pt.insuranceNumber ? `<div class="info">Số thẻ BHYT: <strong>${pt.insuranceNumber}</strong></div>` : ''}` : ''}
<div class="info">Chẩn đoán: <strong>${ctx?.mainDiagnosis || ''}</strong></div>
<table><thead><tr><th style="width:35px">STT</th><th>Tên thuốc</th><th>Hàm lượng</th><th>ĐVT</th>
<th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th>BHYT chi trả</th><th>BN chi trả</th><th>Ghi chú</th></tr></thead>
<tbody>${items.map((it, i) => {
  const itTot = it.price * it.qty;
  const bhytPay = isBHYT ? Math.round(itTot * 0.8) : 0;
  return `<tr><td class="tc">${i + 1}</td><td><strong>${it.name}</strong></td>
<td class="tc">${it.strength || ''}</td><td class="tc">${it.dosageForm || 'Viên'}</td>
<td class="tc">${it.qty}</td><td class="tr">${it.price.toLocaleString('vi-VN')}</td>
<td class="tr">${itTot.toLocaleString('vi-VN')}</td>
<td class="tr">${bhytPay > 0 ? bhytPay.toLocaleString('vi-VN') : '-'}</td>
<td class="tr">${(itTot - bhytPay).toLocaleString('vi-VN')}</td><td>${it.note || ''}</td></tr>`;
}).join('')}
<tr class="tot"><td colspan="6" class="tc"><strong>Tổng cộng</strong></td>
<td class="tr"><strong>${total.toLocaleString('vi-VN')}</strong></td>
<td class="tr"><strong>${isBHYT ? Math.round(total * 0.8).toLocaleString('vi-VN') : '-'}</strong></td>
<td class="tr"><strong>${(isBHYT ? Math.round(total * 0.2) : total).toLocaleString('vi-VN')}</strong></td>
<td></td></tr></tbody></table>
<div class="info"><em>Tổng số: ${items.length} khoản thuốc</em></div>
<div class="sig">
<div class="sigcol"><div style="font-style:italic;font-size:12px">(Ký, ghi rõ họ tên)</div><div style="font-weight:bold;margin-bottom:60px">Người lập</div></div>
<div class="sigcol"><div style="font-style:italic;font-size:12px">(Ký, ghi rõ họ tên)</div><div style="font-weight:bold;margin-bottom:60px">Bệnh nhân/Người nhà</div></div>
</div>
<div style="text-align:right;margin-top:15px;font-size:12px">Ngày ${dd} tháng ${mm} năm ${yyyy}</div>
</body></html>`);
    pw.document.close(); pw.focus();
    setTimeout(() => { pw.print(); }, 500);
  };

  // ── Lưu mẫu đơn ───────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (items.length === 0) { tw('Chưa có thuốc trong đơn để lưu mẫu'); return; }
    if (!templateName.trim()) { tw('Vui lòng nhập tên mẫu'); return; }
    setSavingTpl(true);
    try {
      await examinationApi.createPrescriptionTemplate({
        id: '', templateName: templateName.trim(),
        description: templateDiagnosis.trim(),
        templateType: 1,
        items: items.map((it) => ({
          medicineId: it.medicineId, quantity: it.qty, days: it.days,
          dosage: formatDosage(it), route: it.route, frequency: it.freq,
          usageInstructions: it.note, paymentType: 1,
        })),
        isShared: false,
      });
      tk('Đã lưu mẫu đơn thuốc');
      setSaveTemplateOpen(false);
      setTemplateName(''); setTemplateDiagnosis('');
    } catch { te('Lưu mẫu thất bại'); }
    finally { setSavingTpl(false); }
  };

  // In toa nhà thuốc (mua ngoài): tạo đơn rồi in qua endpoint print-external.
  // DTO tạo đơn không có cờ phân loại toa-ngoài nên không set field — chỉ in bản nhà thuốc.
  const printExternalRx = async () => {
    if (!guard()) return;
    setPrintingExt(true);
    try {
      const created = await examinationApi.createPrescription(buildDto());
      const rxId = created.data?.id;
      if (!rxId) { te('Không lấy được mã đơn vừa tạo'); return; }
      const blob = await printExternalPrescription(rxId);
      const url = URL.createObjectURL(blob.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      tk('Đã tạo & in toa nhà thuốc');
    } catch { te('In toa nhà thuốc thất bại'); }
    finally { setPrintingExt(false); }
  };

  // Apply a template: resolve each item's medicine (name/price) then add to cart.
  const applyTemplate = async (t: PrescriptionTemplateDto) => {
    setTplOpen(false);
    if (!t.items || t.items.length === 0) { tw('Đơn mẫu rỗng'); return; }
    try {
      const fetched = await Promise.all(
        t.items.map((it) =>
          examinationApi.getMedicineWithStock(it.medicineId, warehouse || undefined)
            .then((r) => ({ it, med: r.data }))
            .catch(() => ({ it, med: null as MedicineDto | null }))),
      );
      const newItems: RxItem[] = fetched
        .filter((f) => f.med)
        .map((f) => ({
          medicineId: f.med!.id, code: f.med!.code, name: f.med!.name,
          morning: 1, noon: 0, evening: 0, night: 1,
          mealTiming: '' as const,
          freq: f.it.frequency || '1 lần/ngày',
          qty: f.it.quantity || 30, days: f.it.days || 30,
          route: f.it.route || 'Uống', note: f.it.usageInstructions || '',
          price: f.med!.unitPrice,
          dosageForm: f.med!.unit || 'Viên',
          strength: f.med!.name.match(/\d+\s*mg/i)?.[0] || '',
          bhyt: !!pt?.insuranceNumber,
        }));
      setItems((p) => {
        const existing = new Set(p.map((x) => x.medicineId));
        return [...p, ...newItems.filter((x) => !existing.has(x.medicineId))];
      });
      if (newItems.length > 0) tk(`Đã áp dụng mẫu "${t.templateName}" (${newItems.length} thuốc)`);
      else tw('Không nạp được thuốc từ mẫu (thiếu tồn kho/định danh)');
    } catch { te('Áp dụng đơn mẫu thất bại'); }
  };

  return (
    <div className="ab ed-root" style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      {/* KPI */}
      <div style={{ gridColumn: '1 / -1' }}>
        <KpiStrip items={[
          { lbl: 'BN đang kê', val: pt ? pt.fullName : '—', sub: pt ? `${pt.patientCode} · ${ageOf(pt)}T · ${pt.gender === 1 ? 'Nam' : 'Nữ'}` : 'Chưa chọn' },
          { lbl: 'Loại đơn', val: rxMode === 2 ? 'Toa ngoài (F5)' : (type === 1 ? 'Ngoại trú (F3)' : 'YHCT (F3)'), tone: rxMode === 2 ? 'warn' : 'info', sub: rxMode === 2 ? 'Mua ngoài / nhà thuốc' : 'Theo kho nội viện' },
          { lbl: 'Số thuốc', val: items.length, sub: items.length ? `${items.reduce((s, x) => s + x.qty, 0)} viên/gói` : '—' },
          { lbl: 'Cảnh báo', val: intCount + allergyNames.length, tone: 'warn', sub: `${intCount} tương tác · ${allergyNames.length} dị ứng` },
          { lbl: 'Tổng tiền', val: fmtVNDg(total), tone: 'ok' },
        ]} />
      </div>

      {/* Patient panel */}
      <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', overflow: 'auto', padding: 'var(--space-12)', background: 'var(--d-1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-10)' }}>
          <h4 style={{ margin: 0, fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)', letterSpacing: '.06em' }}>Bệnh nhân</h4>
          <Btn variant="ghost" size="sm" onClick={() => setSearchOpen(true)}><TermIcon name="search" size={11} /> Tìm BN</Btn>
        </div>
        {!pt ? (
          <div style={{ padding: '40px 12px', textAlign: 'center', color: 'var(--t-3)' }}>
            <TermIcon name="user" size={28} />
            <div style={{ marginTop: 'var(--space-10)', fontWeight: 600, color: 'var(--t-2)' }}>Chưa chọn BN</div>
            <div style={{ fontSize: 11.5, marginTop: 'var(--space-4)' }}>Bấm "Tìm BN" để bắt đầu</div>
          </div>
        ) : (
          <>
            <div style={{ padding: 'var(--space-12)', background: 'var(--d-0)', borderRadius: 'var(--r-3)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 700 }}>{pt.fullName}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', marginTop: 'var(--space-4)' }}>{pt.patientCode} · {ageOf(pt)}T · {pt.gender === 1 ? 'Nam' : 'Nữ'}</div>
              <div style={{ marginTop: 'var(--space-8)', fontSize: 11.5 }}>
                <div><span className="ab-u-muted">BHYT: </span>{pt.insuranceNumber ? <><span className="mono">{pt.insuranceNumber}</span> <StatusBadge tone="ok">Hợp lệ</StatusBadge></> : <StatusBadge tone="warn">Không có</StatusBadge>}</div>
                {pt.identityNumber && <div style={{ marginTop: 'var(--space-4)' }}><span className="ab-u-muted">CCCD: </span><span className="mono">{pt.identityNumber}</span></div>}
                {pt.phoneNumber && <div style={{ marginTop: 'var(--space-4)' }}><span className="ab-u-muted">SĐT: </span><span className="mono">{pt.phoneNumber}</span></div>}
              </div>
            </div>

            {/* #357 patient-safety: khôi phục cờ cảnh báo BN + cảnh báo nghiệp vụ (parity v1 Prescription) */}
            <div style={{ marginTop: 'var(--space-12)' }}>
              <PatientFlagBanner patientId={pt.id} patientName={pt.fullName} />
              <BusinessAlertPanel patientId={pt.id} examinationId={examinationId ?? undefined} module="Prescription" />
            </div>

            {allergyNames.length > 0 && (
              <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-10)', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)', borderRadius: 'var(--r-2)' }}>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--s-crit-tx)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 'var(--space-6)' }}><TermIcon name="alert" size={11} /> Dị ứng</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {allergyNames.map((a) => <span key={a} style={{ background: 'var(--s-crit)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--r-1)', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>{a}</span>)}
                </div>
              </div>
            )}

            {(ctx?.mainDiagnosis || vitalsStr(ctx)) && (
              <div style={{ marginTop: 'var(--space-12)', padding: 'var(--space-12)', background: 'var(--d-0)', borderRadius: 'var(--r-3)', border: '1px solid var(--line)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-6)' }}>Từ phiếu khám OPD</div>
                {ctx?.mainDiagnosis && <div style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-4)' }}><b>CĐ:</b> {ctx.mainIcdCode ? `${ctx.mainIcdCode} · ` : ''}{ctx.mainDiagnosis}</div>}
                {vitalsStr(ctx) && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{vitalsStr(ctx)}</div>}
              </div>
            )}

            {(ctx?.existingPrescriptions?.length ?? 0) > 0 && (
              <div style={{ marginTop: 'var(--space-12)' }}>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-6)' }}>Đơn gần đây</div>
                {ctx!.existingPrescriptions.slice(0, 4).map((e, i) => (
                  <div key={i} style={{ padding: 'var(--space-8)', marginBottom: 5, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="mono">{e.prescriptionCode}</span>
                      <span style={{ color: 'var(--t-2)', fontSize: 10.5 }}>{e.prescriptionDate ? fmtDate(e.prescriptionDate) : ''}</span>
                    </div>
                    <div style={{ marginTop: 'var(--space-3)', color: 'var(--t-2)' }}>{e.itemCount} thuốc · {e.statusName}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </aside>

      {/* Main editor */}
      <main style={{ overflow: 'auto', padding: 'var(--space-14)', display: 'flex', flexDirection: 'column', gap: 'var(--space-14)' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', padding: '10px 14px', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'var(--d-1)', borderRadius: 4, padding: 'var(--space-2)' }}>
            {([{ v: 1, l: 'Ngoại trú' }, { v: 2, l: 'YHCT' }] as const).map((t) => (
              <button key={t.v} onClick={() => setType(t.v)} style={{ background: type === t.v ? 'var(--c-pri)' : 'transparent', color: type === t.v ? '#fff' : 'var(--t-1)', border: 0, padding: '5px 12px', borderRadius: 'var(--r-1)', cursor: 'pointer', fontSize: 11.5, fontWeight: type === t.v ? 700 : 400 }}>{t.l}</button>
            ))}
          </div>
          <select className="hui-inp hui-sel" value={warehouse} onChange={(e) => setWh(e.target.value)} style={{ width: 200, height: 32 }} disabled={rxMode === 2} title={rxMode === 2 ? 'Toa ngoài không cấp theo kho nội viện' : undefined}>
            {warehouses.length === 0 && <option value="">(Chưa có kho)</option>}
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} — {w.name}</option>)}
          </select>
          {/* F3/F5 explicit rx-type radio — bác sĩ override BHYT ↔ tự trả */}
          <div style={{ display: 'inline-flex', background: 'var(--d-1)', borderRadius: 4, padding: 'var(--space-2)' }}>
            {([{ v: 1 as const, l: 'BHYT/Thu phí (F3)' }, { v: 2 as const, l: 'Toa ngoài (F5)' }]).map((m) => (
              <button key={m.v} onClick={() => setRxMode(m.v)} style={{ background: rxMode === m.v ? (m.v === 2 ? 'var(--s-warn)' : 'var(--c-pri)') : 'transparent', color: rxMode === m.v ? '#fff' : 'var(--t-1)', border: 0, padding: '5px 12px', borderRadius: 'var(--r-1)', cursor: 'pointer', fontSize: 11.5, fontWeight: rxMode === m.v ? 700 : 400, whiteSpace: 'nowrap' }}>{m.l}</button>
            ))}
          </div>
          <span className="spacer ab-u-flex1" />
          <Btn variant="ghost" onClick={() => setTplOpen(true)}><TermIcon name="folder" size={12} /> Đơn mẫu</Btn>
          <Btn variant="ghost" onClick={() => setSaveTemplateOpen(true)}><TermIcon name="folder" size={12} /> Lưu mẫu</Btn>
          <Btn variant="ghost" disabled={saving} onClick={saveDraft}><TermIcon name="folder" size={12} /> Lưu nháp</Btn>
          <Btn variant="ghost" onClick={handlePrintInternalRx}><TermIcon name="print" size={12} /> In đơn</Btn>
          <Btn variant="ghost" disabled={printingExt} onClick={printExternalRx}><TermIcon name="print" size={12} /> In toa nhà thuốc</Btn>
          <Btn variant="ghost" onClick={() => setDisclosureOpen(true)}><TermIcon name="list" size={12} /> Phiếu công khai</Btn>
          {rxMode === 1 && <Btn variant="primary" disabled={saving} onClick={onClickSign}><TermIcon name="check" size={12} /> Hoàn tất · Ký số</Btn>}
        </div>

        {/* Drug search */}
        <div style={{ position: 'relative' }}>
          <div className="ab-search ab-u-wfull">
            <TermIcon name="search" size={13} />
            <input value={drugQuery} onChange={(e) => searchDrugs(e.target.value)} placeholder="Tìm thuốc theo tên thương mại / hoạt chất / mã (≥2 ký tự)…" />
          </div>
          {drugResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginTop: 'var(--space-4)', maxHeight: 280, overflow: 'auto', zIndex: 10, boxShadow: '0 8px 20px rgba(0,0,0,.15)' }}>
              {drugResults.map((d) => (
                <div key={d.id} onClick={() => addDrug(d)} style={{ padding: '8px 12px', borderBottom: '1px solid var(--line-soft)', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 90px 90px 100px', gap: 'var(--space-10)', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12.5 }}>{d.name}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{d.activeIngredient || ''}</div>
                  </div>
                  <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{d.code}</span>
                  <span style={{ fontSize: 'var(--fs-xs)', color: d.availableQuantity < 1000 ? 'var(--s-warn)' : 'var(--t-2)' }}>Tồn: {d.availableQuantity?.toLocaleString() ?? 0}</span>
                  <span className="mono" style={{ textAlign: 'right' }}>{fmtVNDg(d.unitPrice)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drug table */}
        <div style={{ background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)', overflow: 'hidden' }}>
          <table className="ab-tbl" style={{ fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th style={{ width: 32 }}>#</th>
                <th>Thuốc</th>
                <th style={{ width: 170 }}>Liều S/T/Ch/T · Bữa ăn</th>
                <th style={{ width: 70 }}>SL</th>
                <th style={{ width: 70 }}>Ngày</th>
                <th style={{ width: 110 }}>Đường dùng</th>
                <th style={{ width: 52, textAlign: 'center' }} title="BHYT chi trả">BHYT</th>
                <th>Lời dặn</th>
                <th style={{ width: 110, textAlign: 'right' }}>Thành tiền</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={10} style={{ padding: 30, textAlign: 'center', color: 'var(--t-3)' }}>Chưa có thuốc · Tìm và thêm thuốc ở thanh trên</td></tr>}
              {items.map((it, i) => (
                <tr key={i}>
                  <td className="mono">{i + 1}</td>
                  <td><div style={{ fontWeight: 600 }}>{it.name}</div><div style={{ fontSize: 10.5, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{it.code}</div></td>
                  <td>
                    {/* 4-field dose grid + meal timing (patient-safety) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
                      {(['morning', 'noon', 'evening', 'night'] as const).map((f, fi) => (
                        <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10.5 }}>
                          <span style={{ color: 'var(--t-2)', minWidth: 22, fontFamily: 'var(--font-mono)' }}>{['S', 'T', 'Ch', 'T'][fi]}</span>
                          <input className="hui-inp" type="number" min={0} step={0.5}
                            style={{ width: 44, height: 22, padding: '0 4px', fontSize: 11 }}
                            value={it[f]}
                            onChange={(e) => updateItem(i, f, Math.max(0, +e.target.value))} />
                        </label>
                      ))}
                    </div>
                    <select className="hui-inp hui-sel" style={{ width: '100%', height: 22, marginTop: 3, fontSize: 10.5 }}
                      value={it.mealTiming} onChange={(e) => updateItem(i, 'mealTiming', e.target.value as 'before' | 'after' | '')}>
                      <option value="">— Bữa ăn</option>
                      <option value="before">Trước ăn</option>
                      <option value="after">Sau ăn</option>
                    </select>
                  </td>
                  <td><input className="hui-inp" type="number" style={{ width: '100%', height: 26 }} value={it.qty} onChange={(e) => updateItem(i, 'qty', +e.target.value)} /></td>
                  <td><input className="hui-inp" type="number" style={{ width: '100%', height: 26 }} value={it.days} onChange={(e) => updateItem(i, 'days', +e.target.value)} /></td>
                  <td><select className="hui-inp hui-sel" style={{ width: '100%', height: 26 }} value={it.route} onChange={(e) => updateItem(i, 'route', e.target.value)}>{RX_ROUTE.map((f) => <option key={f}>{f}</option>)}</select></td>
                  <td style={{ textAlign: 'center' }}><input type="checkbox" checked={it.bhyt} onChange={(e) => updateItem(i, 'bhyt', e.target.checked)} title={it.bhyt ? 'BHYT chi trả' : 'Tự chi'} /></td>
                  <td><input className="hui-inp" style={{ width: '100%', height: 26 }} value={it.note} onChange={(e) => updateItem(i, 'note', e.target.value)} /></td>
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{fmtVNDg(it.price * it.qty)}</td>
                  <td><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => removeItem(i)} /></td>
                </tr>
              ))}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--d-1)', fontWeight: 700 }}>
                  <td colSpan={8} style={{ textAlign: 'right' }}>Tổng cộng:</td>
                  <td className="mono" style={{ textAlign: 'right', color: 'var(--s-ok)', fontSize: 'var(--fs-md)' }}>{fmtVNDg(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </main>

      {/* Right panel: warnings & tools */}
      <aside className={'ed-right-panel ' + (rightOpen ? 'is-open' : '')} style={{ borderLeft: '1px solid var(--line)', overflow: 'auto', padding: 'var(--space-12)', background: 'var(--d-1)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        {intCount > 0 && (
          <div onClick={() => setInterOpen(true)} style={{ padding: 'var(--space-12)', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)', borderRadius: 'var(--r-3)', cursor: 'pointer' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--s-crit-tx)', fontWeight: 700, fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '.05em' }}><TermIcon name="alert" size={12} /> Tương tác thuốc</span>
              <span style={{ background: 'var(--s-crit)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 'var(--fs-xs)', fontWeight: 700 }}>{intCount}</span>
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: '#7f1d1d', marginTop: 'var(--space-6)' }}>{(interactions[0]?.description || interactions[0]?.recommendation || '').slice(0, 80)}…</div>
          </div>
        )}

        <div style={{ padding: 'var(--space-12)', background: 'var(--d-0)', border: '1px solid var(--line)', borderRadius: 'var(--r-3)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-8)' }}>Tóm tắt đơn</div>
          <div style={{ display: 'grid', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">Số dòng</span><b>{items.length}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">Tổng viên/gói</span><b className="mono">{items.reduce((s, x) => s + x.qty, 0)}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">Ngày dùng dài nhất</span><b className="mono">{Math.max(0, ...items.map((x) => x.days))} ngày</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-4)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--line)' }}><span className="ab-u-muted">BHYT chi trả (≈80%)</span><b className="mono" style={{ color: 'var(--s-ok)' }}>{fmtVNDg(Math.round(total * 0.8))}</b></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="ab-u-muted">BN đồng chi trả</span><b className="mono">{fmtVNDg(Math.round(total * 0.2))}</b></div>
          </div>
        </div>

        <Btn variant="ghost" onClick={() => setTplOpen(true)} style={{ width: '100%', justifyContent: 'flex-start' }}>
          <TermIcon name="folder" size={12} /> Đơn mẫu ({templates.length})
        </Btn>
        <Btn variant="ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => navigate('/v2/signing-workflow')}>
          <TermIcon name="check" size={12} /> Luồng ký số
        </Btn>
      </aside>

      {/* Responsive toggles (≤1180px) */}
      {(leftOpen || rightOpen) && <div className="ed-panel-backdrop" onClick={closeAll} />}
      <div className="ed-panel-toggles">
        <button className="ed-panel-toggle" onClick={() => setLeftOpen((o) => !o)} title="Bệnh nhân">
          <TermIcon name="list" size={18} />
        </button>
        <button className="ed-panel-toggle" onClick={() => setRightOpen((o) => !o)} title="Cảnh báo" style={{ background: 'var(--s-warn)' }}>
          <TermIcon name="alert" size={18} />
          {intCount + allergyNames.length > 0 ? <span className="badge">{intCount + allergyNames.length}</span> : null}
        </button>
      </div>

      {/* Patient search modal */}
      <PatientSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onPick={selectPatient} />

      {/* Save-as-template modal */}
      <ModalShell open={saveTemplateOpen} onClose={() => setSaveTemplateOpen(false)} title="Lưu mẫu đơn thuốc" sub={`${items.length} thuốc`} size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setSaveTemplateOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={savingTpl} onClick={handleSaveTemplate}><TermIcon name="check" size={12} /> Lưu mẫu</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-4)' }}>Tên mẫu <span style={{ color: 'var(--s-crit)' }}>*</span></label>
            <input className="hui-inp" style={{ width: '100%', height: 34 }} placeholder="VD: Cảm cúm thông thường" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-4)' }}>Chẩn đoán</label>
            <input className="hui-inp" style={{ width: '100%', height: 34 }} placeholder="VD: Nhiễm khuẩn đường hô hấp trên" value={templateDiagnosis} onChange={(e) => setTemplateDiagnosis(e.target.value)} />
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', padding: 'var(--space-8)', background: 'var(--d-1)', borderRadius: 'var(--r-2)' }}>
            {items.map((it, i) => <div key={i}>{i + 1}. {it.name} · {formatDosage(it)} · {it.days} ngày</div>)}
          </div>
        </div>
      </ModalShell>

      {/* Phiếu công khai thuốc MSS-01 drawer */}
      <DrawerShell open={disclosureOpen} onClose={() => setDisclosureOpen(false)} title="Phiếu công khai thuốc" sub="MSS-01 · xem trước" size="lg">
        <div style={{ padding: 'var(--space-14)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)', borderBottom: '1px solid var(--line)', marginBottom: 'var(--space-14)' }}>
          <Btn variant="primary" onClick={handlePrintDrugDisclosure} disabled={items.length === 0}><TermIcon name="print" size={12} /> In phiếu</Btn>
        </div>
        <div style={{ padding: '0 var(--space-14)', fontFamily: "'Times New Roman', serif" }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{HOSPITAL_NAME}</div>
            {HOSPITAL_ADDRESS && <div style={{ fontSize: 12 }}>{HOSPITAL_ADDRESS}</div>}
          </div>
          <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 700, margin: '15px 0 10px', textTransform: 'uppercase' }}>PHIẾU CÔNG KHAI THUỐC</div>
          {pt ? (
            <div style={{ marginBottom: 12, fontSize: 13 }}>
              <div>Họ tên: <strong>{pt.fullName}</strong> &nbsp; Mã BN: <strong>{pt.patientCode}</strong></div>
              <div>Giới tính: {pt.gender === 1 ? 'Nam' : 'Nữ'}</div>
              {pt.insuranceNumber && <div>Số thẻ BHYT: <strong>{pt.insuranceNumber}</strong></div>}
              {ctx?.mainDiagnosis && <div>Chẩn đoán: <strong>{ctx.mainDiagnosis}</strong></div>}
            </div>
          ) : (
            <div style={{ padding: 'var(--space-12)', background: 'var(--s-warn-bg)', borderRadius: 'var(--r-2)', marginBottom: 12, fontSize: 'var(--fs-sm)' }}>Chưa chọn bệnh nhân</div>
          )}
          {items.length === 0 ? (
            <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)', color: 'var(--t-3)' }}>Chưa có thuốc nào trong đơn</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    {['STT', 'Tên thuốc', 'Hàm lượng', 'ĐVT', 'SL', 'Đơn giá', 'Thành tiền', 'BHYT chi trả', 'BN chi trả', 'Ghi chú'].map((h) => (
                      <th key={h} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const itTot = it.price * it.qty;
                    const bhytPay = pt?.insuranceNumber ? Math.round(itTot * 0.8) : 0;
                    return (
                      <tr key={i}>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}><strong>{it.name}</strong></td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{it.strength || '—'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{it.dosageForm || 'Viên'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{it.qty}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{it.price.toLocaleString('vi-VN')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{itTot.toLocaleString('vi-VN')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{bhytPay > 0 ? bhytPay.toLocaleString('vi-VN') : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{(itTot - bhytPay).toLocaleString('vi-VN')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{it.note || ''}</td>
                      </tr>
                    );
                  })}
                  <tr style={{ fontWeight: 700, background: '#fafafa' }}>
                    <td colSpan={6} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>Tổng cộng</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{total.toLocaleString('vi-VN')}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{pt?.insuranceNumber ? Math.round(total * 0.8).toLocaleString('vi-VN') : '-'}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{(pt?.insuranceNumber ? Math.round(total * 0.2) : total).toLocaleString('vi-VN')}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                  </tr>
                </tbody>
              </table>
              <div style={{ margin: '12px 0', fontSize: 13 }}><em>Tổng số: {items.length} khoản thuốc</em></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <div style={{ width: '40%', textAlign: 'center' }}>
                  <div style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ fontWeight: 700, marginTop: 60 }}>Người lập</div>
                </div>
                <div style={{ width: '40%', textAlign: 'center' }}>
                  <div style={{ fontStyle: 'italic', fontSize: 12 }}>(Ký, ghi rõ họ tên)</div>
                  <div style={{ fontWeight: 700, marginTop: 60 }}>Bệnh nhân/Người nhà</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DrawerShell>

      {/* Interactions drawer */}
      <DrawerShell open={interOpen} onClose={() => { setInterOpen(false); setPendingAction(null); }} title="Tương tác thuốc" sub={`${intCount} cảnh báo`} size="lg">
        {interactions.map((it, i) => {
          const tone = it.severity >= 3 ? 'crit' : it.severity === 2 ? 'warn' : 'info';
          const bg = it.severity >= 3 ? 'var(--s-crit-bg)' : it.severity === 2 ? 'var(--a-or-bg)' : '#fefce8';
          const border = it.severity >= 3 ? 'var(--s-crit-bd)' : it.severity === 2 ? 'var(--s-warn-bd2)' : 'var(--s-warn-bd)';
          return (
            <div key={i} style={{ margin: 'var(--space-14)', padding: 'var(--space-14)', background: bg, border: `1px solid ${border}`, borderRadius: 'var(--r-3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                <span style={{ fontWeight: 700, fontSize: 'var(--fs-md)' }}>{it.drug1Name} × {it.drug2Name}</span>
                <StatusBadge tone={tone}>{it.severityName || (it.severity >= 3 ? 'Nặng' : it.severity === 2 ? 'Vừa' : 'Nhẹ')}</StatusBadge>
              </div>
              {it.description && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)', marginBottom: 'var(--space-6)' }}>{it.description}</div>}
              {it.recommendation && <div style={{ fontSize: 11.5, color: 'var(--t-2)', marginBottom: 'var(--space-10)' }}>Khuyến nghị: {it.recommendation}</div>}
              <textarea placeholder="Lý do override (bắt buộc nếu vẫn kê)…" style={{ width: '100%', minHeight: 60, padding: 'var(--space-8)', border: '1px solid var(--line)', borderRadius: 4, fontSize: 11.5 }} />
            </div>
          );
        })}
        {pendingAction && (
          <div style={{ margin: 'var(--space-14)', padding: 'var(--space-14)', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-10)' }}>
            <Btn variant="ghost" onClick={() => { setInterOpen(false); setPendingAction(null); }}>Hủy</Btn>
            <Btn variant="primary" disabled={saving} onClick={async () => {
              setInterOpen(false);
              if (pendingAction === 'draft') { await doSaveDraft(); }
              else { setSignOpen(true); }
              setPendingAction(null);
            }}>
              {pendingAction === 'draft' ? 'Lưu nháp dù có cảnh báo' : 'Tiếp tục ký dù có cảnh báo'}
            </Btn>
          </div>
        )}
      </DrawerShell>

      {/* Templates drawer */}
      <DrawerShell open={tplOpen} onClose={() => setTplOpen(false)} title="Đơn mẫu" sub={`${templates.length} mẫu khả dụng`} size="md">
        <div style={{ padding: 'var(--space-14)' }}>
          {templates.length === 0 && <div style={{ color: 'var(--t-3)', textAlign: 'center', padding: 'var(--space-24)' }}>Chưa có đơn mẫu</div>}
          {templates.map((t) => (
            <div key={t.id} style={{ padding: 'var(--space-12)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-8)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <b>{t.templateName}</b>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-3)' }}>{t.items?.length || 0} thuốc{t.description ? ` · ${t.description}` : ''}</div>
              </div>
              <Btn variant="primary" size="sm" onClick={() => applyTemplate(t)}>Áp dụng</Btn>
            </div>
          ))}
        </div>
      </DrawerShell>

      {/* Sign modal */}
      <ModalShell open={signOpen} onClose={() => setSignOpen(false)} title="Hoàn tất & ký số đơn thuốc" sub="USB Token · VNPT-CA" size="sm"
        footer={<>
          <Btn variant="ghost" onClick={() => setSignOpen(false)}>Hủy</Btn>
          <Btn variant="primary" disabled={saving} onClick={completeWithSign}><TermIcon name="check" size={12} /> Xác nhận</Btn>
        </>}>
        <div style={{ padding: 'var(--space-18)' }}>
          <div style={{ padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-14)', fontSize: 'var(--fs-sm)' }}>
            <div><b>{pt?.fullName || '—'}</b> · {items.length} thuốc · {fmtVNDg(total)}</div>
            <div style={{ color: 'var(--t-2)', marginTop: 'var(--space-3)' }}>{ctx?.mainDiagnosis || 'Chưa có chẩn đoán'}</div>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--t-2)' }}>
            Nhấn "Xác nhận" để tạo & hoàn tất đơn. Ký số PKI đầy đủ thực hiện ở
            <Btn variant="ghost" size="sm" style={{ marginLeft: 'var(--space-6)' }} onClick={() => { setSignOpen(false); navigate('/v2/signing-workflow'); }}>Luồng ký số</Btn>
          </div>
        </div>
      </ModalShell>
    </div>
  );
};

// ── Patient search modal (real patientApi.search) ──────────────────
const PatientSearchModal: React.FC<{ open: boolean; onClose: () => void; onPick: (p: Patient) => void }> = ({ open, onClose, onPick }) => {
  const [q, setQ] = useState('');
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) { setQ(''); setList([]); return; }
  }, [open]);

  const run = async (kw: string) => {
    setQ(kw);
    if (!kw || kw.length < 2) { setList([]); return; }
    setLoading(true);
    try {
      const res = await patientApi.search({ keyword: kw, page: 1, pageSize: 15 });
      setList(res.data?.items || []);
    } catch { setList([]); }
    finally { setLoading(false); }
  };

  return (
    <ModalShell open={open} onClose={onClose} title="Tìm bệnh nhân" sub="Tên · Mã · CCCD · Thẻ BHYT" size="md"
      footer={<Btn variant="ghost" onClick={onClose}>Đóng</Btn>}>
      <div style={{ padding: 'var(--space-16)' }}>
        <div className="ab-search ab-u-wfull">
          <TermIcon name="search" size={13} />
          <input value={q} onChange={(e) => run(e.target.value)} placeholder="Gõ ≥2 ký tự để tìm…" autoFocus />
        </div>
        <div style={{ marginTop: 'var(--space-12)', maxHeight: 360, overflow: 'auto' }}>
          {loading && <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-3)' }}>Đang tìm…</div>}
          {!loading && q.length >= 2 && list.length === 0 && <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--t-3)' }}>Không tìm thấy bệnh nhân</div>}
          {list.map((p) => (
            <div key={p.id} onClick={() => onPick(p)} style={{ padding: 'var(--space-10)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-6)', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <b>{p.fullName}</b>
                <span className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{p.patientCode}</span>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>{ageOf(p)}T · {p.gender === 1 ? 'Nam' : 'Nữ'} · BHYT {p.insuranceNumber || 'Không'}</div>
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
};

export default PrescriptionEditorV2;
