/**
 * CombinedTreatmentSection — Điều trị kết hợp (QA-R8 backend: bảng CombinedTreatments).
 * - Danh sách theo lượt nội trú: GET  /inpatient/combined-treatments/{admissionId}
 * - Yêu cầu:                     POST /inpatient/combined-treatment  (khoa kết hợp ≠ khoa đang điều trị, chặn trùng yêu cầu đang mở)
 * - Hoàn thành:                  POST /inpatient/combined-treatment/{id}/complete  (kết quả bắt buộc)
 * Nút ghi chỉ hiện khi có Inpatient.Update (WritePermissionMap["InpatientComplete"] mặc định).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { App as AntdApp, Input, Select, Spin } from 'antd';
import {
  createCombinedTreatment,
  getCombinedTreatments,
  completeCombinedTreatment,
} from '../api/inpatient';
import type { CombinedTreatmentDto, InpatientListDto } from '../api/inpatient';
import { catalogApi } from '../../system/api/system';
import type { DepartmentCatalogDto } from '../../system/api/system';
import { ModalShell, Btn, StatusBadge, fmtDTg } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import { can } from '../../../services/permission.service';

const WRITE_PERMISSION = 'Inpatient.Update';

/** CombinedTreatment.Status: 0 chờ tiếp nhận · 1 đang điều trị · 2 hoàn thành · 3 đã hủy. */
const isOpenRequest = (c: CombinedTreatmentDto) => c.status === 0 || c.status === 1;
const statusTone = (s: number) => (s === 2 ? 'ok' : s === 3 ? 'crit' : s === 1 ? 'info' : 'warn');

// ---------------------------------------------------------------------------
// Request modal
// ---------------------------------------------------------------------------

type RequestField = 'consultingDepartmentId' | 'requestReason';

const RequestModal: React.FC<{
  open: boolean;
  patient: InpatientListDto;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, patient, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [consultingDepartmentId, setConsultingDepartmentId] = useState<string | undefined>();
  const [requestReason, setRequestReason] = useState('');
  const [consultingDiagnosis, setConsultingDiagnosis] = useState('');
  const [saving, setSaving] = useState(false);
  const form = useModalForm<RequestField>({
    consultingDepartmentId: { required: true, message: 'Chọn khoa điều trị kết hợp' },
    requestReason: { required: true, message: 'Nhập lý do yêu cầu' },
  }, open);

  useEffect(() => {
    if (!open) return;
    setConsultingDepartmentId(undefined);
    setRequestReason('');
    setConsultingDiagnosis(patient.mainDiagnosis ?? '');
    catalogApi.getDepartments(undefined, undefined, true)
      .then((r) => setDepts(Array.isArray(r.data) ? r.data : []))
      .catch((e) => { setDepts([]); message.warning(friendlyErrorMessage(e, 'Không tải được danh sách khoa')); });
  }, [open, patient.mainDiagnosis, message]);

  const submit = async () => {
    if (saving || !form.validate({ consultingDepartmentId, requestReason })) return;
    setSaving(true);
    try {
      await createCombinedTreatment({
        admissionId: patient.admissionId,
        consultingDepartmentId: consultingDepartmentId!,
        requestReason: requestReason.trim(),
        consultingDiagnosis: consultingDiagnosis.trim() || undefined,
      });
      message.success('Đã gửi yêu cầu điều trị kết hợp');
      onDone();
    } catch (e) {
      message.error(friendlyErrorMessage(e, 'Gửi yêu cầu điều trị kết hợp thất bại'));
    } finally {
      setSaving(false);
    }
  };

  // The patient's own department cannot be the consulting one (the API rejects it too).
  const deptOptions = depts
    .filter((d) => d.id && d.name !== patient.departmentName)
    .map((d) => ({ value: d.id!, label: d.name }));

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      size="md"
      title="Yêu cầu điều trị kết hợp"
      sub={`${patient.patientName} · ${patient.patientCode} · đang điều trị tại ${patient.departmentName}`}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Đóng</Btn>
        <Btn variant="primary" icon="send" loading={saving} onClick={() => void submit()}>Gửi yêu cầu</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <Field label="Khoa điều trị kết hợp" required error={form.errors.consultingDepartmentId}>
          <Select
            value={consultingDepartmentId}
            onChange={(v) => { setConsultingDepartmentId(v); form.clear('consultingDepartmentId'); }}
            showSearch
            optionFilterProp="label"
            placeholder="Chọn khoa"
            style={{ width: '100%' }}
            options={deptOptions}
          />
        </Field>
        <Field label="Lý do yêu cầu" required error={form.errors.requestReason}>
          <Input.TextArea
            rows={2}
            maxLength={1000}
            value={requestReason}
            onChange={(e) => { setRequestReason(e.target.value); form.clear('requestReason'); }}
            placeholder="VD: phối hợp điều trị đái tháo đường…"
          />
        </Field>
        <Field label="Chẩn đoán">
          <Input value={consultingDiagnosis} maxLength={500} onChange={(e) => setConsultingDiagnosis(e.target.value)} />
        </Field>
      </div>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Complete modal
// ---------------------------------------------------------------------------

const CompleteModal: React.FC<{
  target: CombinedTreatmentDto | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ target, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const open = !!target;
  const [treatmentResult, setTreatmentResult] = useState('');
  const [saving, setSaving] = useState(false);
  const form = useModalForm<'treatmentResult'>({
    treatmentResult: { required: true, message: 'Nhập kết quả điều trị kết hợp' },
  }, open);

  useEffect(() => { if (open) setTreatmentResult(''); }, [open]);

  const submit = async () => {
    if (!target || saving || !form.validate({ treatmentResult })) return;
    setSaving(true);
    try {
      await completeCombinedTreatment(target.id, treatmentResult.trim());
      message.success('Đã hoàn thành điều trị kết hợp');
      onDone();
    } catch (e) {
      message.error(friendlyErrorMessage(e, 'Hoàn thành điều trị kết hợp thất bại'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!saving) onClose(); }}
      size="sm"
      title="Hoàn thành điều trị kết hợp"
      sub={target ? `${target.consultingDepartmentName} · yêu cầu ${fmtDTg(target.requestDate)}` : undefined}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Đóng</Btn>
        <Btn variant="ok" icon="check" loading={saving} onClick={() => void submit()}>Hoàn thành</Btn>
      </>}
    >
      <Field label="Kết quả điều trị" required error={form.errors.treatmentResult}>
        <Input.TextArea
          rows={4}
          maxLength={2000}
          value={treatmentResult}
          onChange={(e) => { setTreatmentResult(e.target.value); form.clear('treatmentResult'); }}
          placeholder="Kết quả / ý kiến của khoa điều trị kết hợp…"
        />
      </Field>
    </ModalShell>
  );
};

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

export interface CombinedTreatmentSectionProps {
  patient: InpatientListDto;
}

const CombinedTreatmentSection: React.FC<CombinedTreatmentSectionProps> = ({ patient }) => {
  const canWrite = can(WRITE_PERMISSION);
  const [rows, setRows] = useState<CombinedTreatmentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestOpen, setRequestOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState<CombinedTreatmentDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const r = await getCombinedTreatments(patient.admissionId);
      setRows(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setRows([]);
      setError(friendlyErrorMessage(e, 'Không tải được danh sách điều trị kết hợp'));
    } finally {
      setLoading(false);
    }
  }, [patient.admissionId]);

  useEffect(() => { void load(); }, [load]);

  const done = () => {
    setRequestOpen(false);
    setCompleteTarget(null);
    void load();
  };

  return (
    <div className="rec-section">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-10)' }}>
        <h5 style={{ margin: 0 }}>
          <TermIcon name="users" size={11} /> DIEU TRI KET HOP
        </h5>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-6)' }}>
          {canWrite && (
            <Btn variant="ghost" icon="plus" onClick={() => setRequestOpen(true)}>Yêu cầu điều trị kết hợp</Btn>
          )}
          <Btn variant="ghost" icon="refresh" title="Tải lại" onClick={() => void load()} />
        </span>
      </div>

      {loading && (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}><Spin size="small" /></div>
      )}

      {!loading && (error || rows.length === 0) && (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: error ? 'var(--s-crit)' : 'var(--t-2)', fontSize: 'var(--fs-sm)', border: '1px dashed var(--line-soft)', borderRadius: 'var(--r-2)' }}>
          {error || 'Chưa có yêu cầu điều trị kết hợp nào trong lượt nội trú này.'}
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
          {rows.map((c) => (
            <div key={c.id} style={{ padding: '10px 12px', borderRadius: 'var(--r-2)', border: '1px solid var(--line-soft)', background: 'var(--d-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
                <b style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>{c.consultingDepartmentName || '—'}</b>
                <StatusBadge tone={statusTone(c.status)} dot>{c.statusName}</StatusBadge>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Yêu cầu {fmtDTg(c.requestDate)}</span>
                {c.completedDate && (
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                    · Hoàn thành {fmtDTg(c.completedDate)}{c.consultingDoctorName ? ` · ${c.consultingDoctorName}` : ''}
                  </span>
                )}
                {canWrite && isOpenRequest(c) && (
                  <Btn variant="ok" size="sm" icon="check" style={{ marginLeft: 'auto' }} onClick={() => setCompleteTarget(c)}>
                    Hoàn thành
                  </Btn>
                )}
              </div>
              <div style={{ marginTop: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--t-1)', display: 'grid', gap: 'var(--space-4)' }}>
                {c.requestReason && <div><span style={{ color: 'var(--t-2)' }}>Lý do: </span>{c.requestReason}</div>}
                {c.consultingDiagnosis && <div><span style={{ color: 'var(--t-2)' }}>Chẩn đoán: </span>{c.consultingDiagnosis}</div>}
                {c.treatmentResult && <div><span style={{ color: 'var(--t-2)' }}>Kết quả: </span>{c.treatmentResult}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <RequestModal open={requestOpen} patient={patient} onClose={() => setRequestOpen(false)} onDone={done} />
      <CompleteModal target={completeTarget} onClose={() => setCompleteTarget(null)} onDone={done} />
    </div>
  );
};

export default CombinedTreatmentSection;
