import React, { useEffect, useState } from 'react';
import { Input } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw, te } from '@/_v2kit';
import { Field } from '../../../components/form/Field';
import systemApi from '../../system/api/system';
import type { DepartmentCatalogDto } from '../../system/api/system';
import { escalateObservationStay } from '../api/observation';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────────────────── Chuyển nội trú một phiên phòng lưu ───────────────────────────
// PUT /observation/{id}/escalate — QA-R8: thêm chọn "khoa đề nghị nhập viện" (admissionDepartmentId, không bắt
// buộc: màn "chờ nhập viện" của nội trú vẫn chọn được khoa). Backend ghi nó vào lượt khám làm khoa nhập viện.

const DEFAULT_REASON = 'Chuyển nhập viện từ phòng lưu cấp cứu';

export interface EscalateObservationModalProps {
  open: boolean;
  stayId: string | null;
  patientName?: string;
  onClose: () => void;
  /** Called after the API accepted the escalation. */
  onDone: () => void | Promise<void>;
}

export const EscalateObservationModal: React.FC<EscalateObservationModalProps> = ({
  open, stayId, patientName, onClose, onDone,
}) => {
  const [departments, setDepartments] = useState<DepartmentCatalogDto[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [reason, setReason] = useState(DEFAULT_REASON);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDepartmentId('');
    setDiagnosis('');
    setReason(DEFAULT_REASON);
    if (departments.length > 0) return;
    systemApi.catalog.getDepartments(undefined, undefined, true)
      .then((r) => setDepartments(Array.isArray(r.data) ? r.data : []))
      .catch((e) => tw(friendlyErrorMessage(e, 'Không tải được danh sách khoa — vẫn chuyển được, khoa chọn sau ở màn nội trú')));
  }, [open, departments.length]);

  const handleSubmit = async () => {
    if (!stayId || submitting) return;
    setSubmitting(true);
    try {
      await escalateObservationStay(stayId, {
        dischargeReason: reason.trim() || DEFAULT_REASON,
        finalDiagnosis: diagnosis.trim() || undefined,
        admissionDepartmentId: departmentId || undefined,
      });
      tk(`Đã chuyển ${patientName || 'bệnh nhân'} sang nội trú`);
      onClose();
      await onDone();
    } catch (e) {
      te(friendlyErrorMessage(e, 'Chuyển nội trú thất bại. Vui lòng thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!submitting) onClose(); }}
      size="md"
      title="Chuyển nội trú"
      sub={patientName}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Hủy</Btn>
        <Btn variant="primary" icon="check" loading={submitting} onClick={() => void handleSubmit()}>Chuyển nội trú</Btn>
      </>}
    >
      <Field label="Khoa đề nghị nhập viện" hint="Không chọn thì khoa nội trú chọn khi tiếp nhận">
        <AbSelect
          value={departmentId}
          onChange={setDepartmentId}
          options={departments}
          fieldNames={{ value: 'id', label: 'name' }}
          placeholder="— Chưa chọn khoa —"
          style={{ width: '100%' }}
        />
      </Field>
      <Field label="Chẩn đoán vào viện">
        <Input.TextArea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)}
          placeholder="Để trống thì dùng chẩn đoán của phiên lưu" />
      </Field>
      <Field label="Lý do">
        <Input.TextArea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
    </ModalShell>
  );
};
