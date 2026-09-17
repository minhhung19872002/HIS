import React, { useEffect, useState } from 'react';
import { Input, message } from 'antd';
import { ModalShell } from '../ModalShell';
import { Btn } from '../../actions/Btn';
import { Field } from '../../form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────────────────── ReasonModal — hỏi lý do bắt buộc trước một thao tác hủy ───────────────────────────
// Dùng chung cho các nút "Hủy phiếu / Hủy duyệt…": lý do bắt buộc (lỗi hiện tại trường theo useModalForm),
// bấm xác nhận → onSubmit(lý do đã trim). onSubmit ném lỗi → hiện thông điệp backend, modal giữ nguyên để sửa.

export interface ReasonModalProps {
  open: boolean;
  title: React.ReactNode;
  sub?: React.ReactNode;
  /** Nhãn trường lý do. */
  label?: string;
  placeholder?: string;
  confirmText?: string;
  /** Thông điệp khi backend từ chối mà không kèm message. */
  errorFallback?: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  open, title, sub, label = 'Lý do', placeholder = 'Nhập lý do…', confirmText = 'Xác nhận',
  errorFallback = 'Thao tác thất bại', onClose, onSubmit,
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const form = useModalForm({ reason: { required: true, message: `Vui lòng nhập ${label.toLowerCase()}` } }, open);

  useEffect(() => { if (open) setReason(''); }, [open]);

  const handleConfirm = async () => {
    if (submitting || !form.validate({ reason })) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      onClose();
    } catch (e) {
      void message.error(friendlyErrorMessage(e, errorFallback));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={() => { if (!submitting) onClose(); }}
      size="sm"
      tone="danger"
      title={title}
      sub={sub}
      footer={<>
        <Btn variant="ghost" onClick={onClose} disabled={submitting}>Đóng</Btn>
        <Btn variant="crit" icon="x" loading={submitting} onClick={() => void handleConfirm()}>{confirmText}</Btn>
      </>}
    >
      <Field label={label} required error={form.errors.reason}>
        <Input.TextArea
          rows={3}
          maxLength={500}
          value={reason}
          placeholder={placeholder}
          onChange={(e) => { setReason(e.target.value); form.clear('reason'); }}
        />
      </Field>
    </ModalShell>
  );
};
