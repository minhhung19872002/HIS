/**
 * DischargeModal — Ra vien + tong ket benh an noi tru.
 *
 * Luong:
 *   1. Mo modal → checkPreDischarge(admissionId) hien cac muc chua hoan tat.
 *   2. Form ra vien (ngay, loai ra vien, tinh trang, chan doan, loi dan…).
 *   3. Luu → dischargePatient(CompleteDischargeDto).
 *   4. Phu tro: Huy ra vien (cancelDischarge) · In giay ra vien · In bang ke 6556 ·
 *      In giay chuyen vien (khi loai = Chuyen vien).
 *
 * Enum đã verify (InpatientCompleteDTOs.cs):
 *   DischargeType:      1-Ra viện · 2-Chuyển viện · 3-Trốn viện · 4-Tử vong
 *   DischargeCondition: 1-Khỏi · 2-Đỡ · 3-Không đổi · 4-Nặng hơn · 5-Tử vong
 *
 * API verify trong api/inpatient.ts:
 *   checkPreDischarge · dischargePatient · cancelDischarge ·
 *   printDischargeCertificate · printBillingStatement6556 · printReferralCertificate ·
 *   getDiagnosisFromRecord
 */

import React, { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, DatePicker, Input, InputNumber, Select } from 'antd';
import dayjs from 'dayjs';
import {
  checkPreDischarge, dischargePatient, cancelDischarge,
  printDischargeCertificate, printBillingStatement6556, printReferralCertificate,
  getDiagnosisFromRecord, getAutoTreatmentSummary,
} from '../api/inpatient';
import type {
  PreDischargeCheckDto, CompleteDischargeDto, InpatientListDto, ReferralCertificateDto,
} from '../api/inpatient';
import { ModalShell, Btn, DrSec, tk, te } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

const DISCHARGE_TYPES = [
  { value: 1, label: 'Ra viện' },
  { value: 2, label: 'Chuyển viện' },
  { value: 3, label: 'Trốn viện / Bỏ về' },
  { value: 4, label: 'Tử vong' },
];

const DISCHARGE_CONDITIONS = [
  { value: 1, label: 'Khỏi' },
  { value: 2, label: 'Đỡ, giảm' },
  { value: 3, label: 'Không thay đổi' },
  { value: 4, label: 'Nặng hơn' },
  { value: 5, label: 'Tử vong' },
];

const openPrintBlob = (blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (w) w.onload = () => URL.revokeObjectURL(url);
};

export interface DischargeModalProps {
  open: boolean;
  patient: InpatientListDto;
  onClose: () => void;
  onDone: () => void;
}

const DischargeModal: React.FC<DischargeModalProps> = ({ open, patient, onClose, onDone }) => {
  const { message, modal } = AntdApp.useApp();
  const admissionId = patient.admissionId;

  const form = useModalForm({
    dischargeDiagnosis: { required: true, message: 'Nhập chẩn đoán ra viện' },
    transferToHospital: {
      validate: (v) => (dischargeType === 2 && !String(v ?? '').trim()) ? 'Nhập cơ sở chuyển đến' : undefined,
    },
  }, open);

  const [check, setCheck] = useState<PreDischargeCheckDto | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);

  const [dischargeDate, setDischargeDate] = useState<dayjs.Dayjs>(dayjs());
  const [dischargeType, setDischargeType] = useState<number>(1);
  const [dischargeCondition, setDischargeCondition] = useState<number>(1);
  const [dischargeDiagnosisCode, setDischargeDiagnosisCode] = useState('');
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState('');
  const [treatmentSummary, setTreatmentSummary] = useState('');
  const [dischargeInstructions, setDischargeInstructions] = useState('');
  const [medicationInstructions, setMedicationInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState<dayjs.Dayjs | null>(null);
  const [sickLeaveDays, setSickLeaveDays] = useState<number | null>(null);
  // Chuyển viện
  const [transferToHospital, setTransferToHospital] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  const loadCheck = useCallback(async () => {
    setLoadingCheck(true);
    try {
      const r = await checkPreDischarge(admissionId);
      setCheck(r.data ?? null);
    } catch {
      setCheck(null);
      message.error('Không kiểm tra được điều kiện ra viện');
    } finally {
      setLoadingCheck(false);
    }
  }, [admissionId, message]);

  useEffect(() => {
    if (!open) return;
    setCheck(null);
    setDischargeDate(dayjs());
    setDischargeType(1); setDischargeCondition(1);
    setDischargeDiagnosisCode(''); setDischargeDiagnosis('');
    setTreatmentSummary(''); setDischargeInstructions(''); setMedicationInstructions('');
    setFollowUpDate(null); setSickLeaveDays(null);
    setTransferToHospital(''); setTransferReason('');
    void loadCheck();
    void getDiagnosisFromRecord(admissionId)
      .then((r) => { setDischargeDiagnosisCode(r.data?.mainDiagnosisCode ?? ''); setDischargeDiagnosis(r.data?.mainDiagnosis ?? ''); })
      .catch(() => { /* optional */ });
    // #15: prefill tóm tắt điều trị tự tổng hợp (SOAP + đơn thuốc + CLS + PTTT) — user vẫn sửa được
    void getAutoTreatmentSummary(admissionId)
      .then((r) => { const s = r.data?.summary; if (s) setTreatmentSummary(s); })
      .catch(() => { /* optional */ });
  }, [open, admissionId, loadCheck]);

  const submit = async () => {
    const dto: CompleteDischargeDto = {
      admissionId,
      dischargeDate: dischargeDate.toISOString(),
      dischargeType,
      dischargeCondition,
      dischargeDiagnosisCode: dischargeDiagnosisCode.trim() || undefined,
      dischargeDiagnosis: dischargeDiagnosis.trim() || undefined,
      treatmentSummary: treatmentSummary.trim() || undefined,
      dischargeInstructions: dischargeInstructions.trim() || undefined,
      medicationInstructions: medicationInstructions.trim() || undefined,
      followUpDate: followUpDate ? followUpDate.toISOString() : undefined,
      sickLeaveDays: sickLeaveDays ?? undefined,
      transferToHospital: dischargeType === 2 ? (transferToHospital.trim() || undefined) : undefined,
      transferReason: dischargeType === 2 ? (transferReason.trim() || undefined) : undefined,
    };
    setSaving(true);
    try {
      await dischargePatient(dto);
      tk('Đã hoàn tất ra viện');
      onDone();
    } catch (e) {
      te(friendlyErrorMessage(e, 'Ra viện thất bại. Vui lòng kiểm tra lại thông tin và thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const doCancel = () => {
    let reason = '';
    modal.confirm({
      title: 'Hủy ra viện?',
      content: (
        <div style={{ marginTop: 'var(--space-8)' }}>
          <div style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>Lý do hủy:</div>
          <Input placeholder="Nhập lý do…" onChange={(e) => { reason = e.target.value; }} />
        </div>
      ),
      okText: 'Xác nhận hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        setCancelling(true);
        try {
          await cancelDischarge(admissionId, reason);
          tk('Đã hủy ra viện');
          onDone();
        } catch {
          te('Hủy ra viện thất bại');
        } finally {
          setCancelling(false);
        }
      },
    });
  };

  const doPrint = async (kind: 'discharge' | 'billing' | 'referral') => {
    setPrinting(kind);
    try {
      if (kind === 'discharge') {
        const r = await printDischargeCertificate(admissionId);
        openPrintBlob(r.data as Blob);
      } else if (kind === 'billing') {
        const r = await printBillingStatement6556(admissionId);
        openPrintBlob(r.data as Blob);
      } else {
        const data: ReferralCertificateDto = {
          admissionId,
          patientName: patient.patientName,
          gender: patient.gender,
          dateOfBirth: patient.dateOfBirth,
          insuranceNumber: patient.insuranceNumber,
          fromHospitalName: '',
          fromHospitalCode: '',
          toHospitalName: transferToHospital.trim(),
          toHospitalCode: '',
          transferReason: transferReason.trim() || undefined,
          diagnosis: dischargeDiagnosis.trim() || undefined,
          treatmentSummary: treatmentSummary.trim() || undefined,
          transferDate: dischargeDate.toISOString(),
        };
        const r = await printReferralCertificate(admissionId, data);
        openPrintBlob(r.data as Blob);
      }
    } catch {
      te('In tài liệu thất bại');
    } finally {
      setPrinting(null);
    }
  };

  // Row hiển thị 1 mục kiểm tra
  const checkRow = (ok: boolean, label: string, detail?: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '3px 0', fontSize: 'var(--fs-sm)' }}>
      <TermIcon name={ok ? 'check' : 'alert'} size={12} />
      <span style={{ color: ok ? 'var(--t-1)' : 'var(--s-warn)' }}>{label}</span>
      {detail && <span style={{ color: 'var(--t-2)', marginLeft: 'auto' }}>{detail}</span>}
    </div>
  );

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="home" size={14} />
          <span>Ra viện · Tổng kết bệnh án</span>
        </span>
      }
      sub={`${patient.patientName} · ${patient.patientCode}`}
      footer={
        <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <Btn variant="ghost" size="sm" loading={cancelling} onClick={doCancel}>
            <TermIcon name="rotate-ccw" size={12} /> Hủy ra viện
          </Btn>
          <Btn variant="ghost" size="sm" loading={printing === 'billing'} onClick={() => { void doPrint('billing'); }}>
            <TermIcon name="file-text" size={12} /> In bảng kê 6556
          </Btn>
          {dischargeType === 2 && (
            <Btn variant="ghost" size="sm" loading={printing === 'referral'} onClick={() => { void doPrint('referral'); }}>
              <TermIcon name="navigation" size={12} /> In giấy chuyển viện
            </Btn>
          )}
          <Btn variant="ghost" size="sm" loading={printing === 'discharge'} onClick={() => { void doPrint('discharge'); }}>
            <TermIcon name="print" size={12} /> In giấy ra viện
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            loading={saving}
            onClick={() => {
              if (form.validate({ dischargeDiagnosis, transferToHospital })) void submit();
            }}
          >
            <TermIcon name="check" size={12} /> Xác nhận ra viện
          </Btn>
        </div>
      }
    >
      {/* Kiểm tra trước ra viện */}
      <DrSec title="Kiểm tra điều kiện ra viện">
        {loadingCheck && <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Đang kiểm tra…</div>}
        {!loadingCheck && !check && <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có dữ liệu kiểm tra.</div>}
        {!loadingCheck && check && (
          <div>
            {checkRow(check.isInsuranceValid, 'Thẻ BHYT hợp lệ', check.insuranceCheckMessage)}
            {checkRow(!check.hasUnpaidBalance, 'Không còn dư nợ', check.hasUnpaidBalance ? `Còn ${(check.remainingAmount ?? 0).toLocaleString('vi-VN')} đ` : undefined)}
            {checkRow(!check.hasUnclaimedMedicine, 'Đã lĩnh hết thuốc', check.hasUnclaimedMedicine ? `${check.unclaimedPrescriptionCount} đơn chưa lĩnh` : undefined)}
            {checkRow(!check.hasPendingResults, 'Đã có đủ kết quả CLS', check.hasPendingResults ? `${check.pendingResultCount} KQ chờ` : undefined)}
            {checkRow(check.isMedicalRecordComplete, 'Hồ sơ bệnh án đầy đủ', check.missingDocuments?.length ? check.missingDocuments.join(', ') : undefined)}
            {(check.warnings?.length ?? 0) > 0 && (
              <div style={{ marginTop: 'var(--space-6)', padding: '6px 10px', borderRadius: 'var(--r-2)', background: 'var(--warn-soft)', border: '1px solid var(--warn)', fontSize: 'var(--fs-xs)', color: 'var(--t-1)' }}>
                {check.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
            <div style={{ marginTop: 'var(--space-8)', fontSize: 'var(--fs-sm)', fontWeight: 600, color: check.canDischarge ? 'var(--s-ok)' : 'var(--s-warn)' }}>
              {check.canDischarge ? '✓ Đủ điều kiện ra viện' : '⚠ Chưa đủ điều kiện — vẫn có thể ra viện nếu được duyệt'}
            </div>
          </div>
        )}
      </DrSec>

      {/* Form ra viện */}
      <DrSec title="Thông tin ra viện">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px' }}>
          <Field label="Ngày ra viện" required>
            <DatePicker showTime value={dischargeDate} onChange={(v) => setDischargeDate(v ?? dayjs())} format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Field>
          <Field label="Loại ra viện" required>
            <Select<number> value={dischargeType} onChange={setDischargeType} options={DISCHARGE_TYPES} style={{ width: '100%' }} />
          </Field>
          <Field label="Tình trạng" required>
            <Select<number> value={dischargeCondition} onChange={setDischargeCondition} options={DISCHARGE_CONDITIONS} style={{ width: '100%' }} />
          </Field>
          <Field label="Mã chẩn đoán">
            <Input value={dischargeDiagnosisCode} onChange={(e) => setDischargeDiagnosisCode(e.target.value)} placeholder="VD: J18.9" />
          </Field>
          <Field label="Chẩn đoán ra viện" required error={form.errors.dischargeDiagnosis}>
            <Input
              value={dischargeDiagnosis}
              onChange={(e) => { setDischargeDiagnosis(e.target.value); form.clear('dischargeDiagnosis'); }}
              placeholder="Chẩn đoán ra viện"
            />
          </Field>
          <Field label="Số ngày nghỉ">
            <InputNumber value={sickLeaveDays} onChange={(v) => setSickLeaveDays(v)} min={0} max={365} style={{ width: '100%' }} placeholder="0" />
          </Field>
          <Field label="Hẹn tái khám">
            <DatePicker value={followUpDate} onChange={(v) => setFollowUpDate(v)} format="DD/MM/YYYY" style={{ width: '100%' }} />
          </Field>
        </div>

        {dischargeType === 2 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 16px', marginTop: 'var(--space-4)' }}>
            <Field label="Chuyển đến" required error={form.errors.transferToHospital}>
              <Input
                value={transferToHospital}
                onChange={(e) => { setTransferToHospital(e.target.value); form.clear('transferToHospital'); }}
                placeholder="Tên cơ sở chuyển đến"
              />
            </Field>
            <Field label="Lý do chuyển">
              <Input value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="Lý do chuyển viện" />
            </Field>
          </div>
        )}

        <div style={{ marginTop: 'var(--space-6)' }}>
          <Field label="Tóm tắt điều trị">
            <Input.TextArea value={treatmentSummary} onChange={(e) => setTreatmentSummary(e.target.value)} rows={2} placeholder="Tóm tắt quá trình điều trị…" />
          </Field>
          <Field label="Lời dặn">
            <Input.TextArea value={dischargeInstructions} onChange={(e) => setDischargeInstructions(e.target.value)} rows={2} placeholder="Lời dặn cho bệnh nhân…" />
          </Field>
          <Field label="Dặn dùng thuốc">
            <Input.TextArea value={medicationInstructions} onChange={(e) => setMedicationInstructions(e.target.value)} rows={2} placeholder="Hướng dẫn dùng thuốc khi về…" />
          </Field>
        </div>
      </DrSec>
    </ModalShell>
  );
};

export default DischargeModal;
