import React, { useEffect, useState } from 'react';
import { Input } from 'antd';
import { ModalShell, Btn, cf, tk, te } from '@/_v2kit';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';
import { friendlyErrorMessage } from '../../../utils/friendlyError';

// ─────────────────────────── Đổi tên / xóa mẫu (đơn thuốc mẫu, nhóm dịch vụ mẫu nội trú) ───────────────────────────
// QA-R9: backend chỉ cho người tạo mẫu hoặc quản trị viên sửa/xóa (mẫu dùng chung: chỉ quản trị viên) — lỗi 403
// hiện đúng thông điệp của backend.

export interface TemplateManageActionsProps {
  /** Selected template (undefined → buttons disabled). */
  template?: { id: string; name: string };
  /** Noun shown in messages, e.g. "đơn mẫu" / "nhóm mẫu". */
  noun: string;
  onRename: (id: string, newName: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** Called after a successful rename/delete (reload the list, clear the selection…). */
  onChanged: (deletedId?: string) => void;
}

export const TemplateManageActions: React.FC<TemplateManageActionsProps> = ({
  template, noun, onRename, onDelete, onChanged,
}) => {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const form = useModalForm({ name: { required: true, message: `Nhập tên ${noun}` } }, renameOpen);

  useEffect(() => { if (renameOpen) setName(template?.name ?? ''); }, [renameOpen, template]);

  const doRename = async () => {
    if (!template || busy || !form.validate({ name: name.trim() })) return;
    setBusy(true);
    try {
      await onRename(template.id, name.trim());
      tk(`Đã đổi tên ${noun}`);
      setRenameOpen(false);
      onChanged();
    } catch (e) {
      te(friendlyErrorMessage(e, `Đổi tên ${noun} thất bại`));
    } finally {
      setBusy(false);
    }
  };

  const askDelete = () => {
    if (!template) return;
    cf(`Xóa ${noun} "${template.name}"?`, () => {
      void (async () => {
        try {
          await onDelete(template.id);
          tk(`Đã xóa ${noun}`);
          onChanged(template.id);
        } catch (e) {
          te(friendlyErrorMessage(e, `Xóa ${noun} thất bại`));
        }
      })();
    }, { tone: 'crit', confirm: 'Xóa' });
  };

  return (
    <>
      <Btn variant="ghost" size="sm" icon="edit" disabled={!template} onClick={() => setRenameOpen(true)}>Đổi tên</Btn>
      <Btn variant="ghost" size="sm" icon="trash" disabled={!template} onClick={askDelete}>Xóa mẫu</Btn>
      <ModalShell
        open={renameOpen}
        onClose={() => { if (!busy) setRenameOpen(false); }}
        size="sm"
        title={`Đổi tên ${noun}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setRenameOpen(false)} disabled={busy}>Đóng</Btn>
          <Btn variant="primary" icon="check" loading={busy} onClick={() => void doRename()}>Lưu</Btn>
        </>}
      >
        <Field label="Tên mới" required error={form.errors.name}>
          <Input
            value={name}
            maxLength={200}
            onChange={(e) => { setName(e.target.value); form.clear('name'); }}
            onPressEnter={() => void doRename()}
          />
        </Field>
      </ModalShell>
    </>
  );
};

export default TemplateManageActions;
