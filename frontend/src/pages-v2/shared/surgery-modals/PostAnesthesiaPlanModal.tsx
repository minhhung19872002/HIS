/**
 * surgery-modals/PostAnesthesiaPlanModal.tsx
 * Kế hoạch sau gây mê – phẫu thuật (AnesthesiaRecord.PostSurgeryPlan + RecoveryNotes)
 *
 * Lưu vào AnesthesiaRecord.PostSurgeryPlan + RecoveryNotes (2 trường riêng):
 *  - RecoveryNotes  : diễn biến hồi tỉnh, điểm Aldrete
 *  - PostSurgeryPlan: kế hoạch chăm sóc sau mổ (chế độ ăn, giảm đau, thay băng…)
 * Dùng cùng endpoint /clinical-records/anesthesia (upsert theo surgeryId)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Spin } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw, te } from '../../_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import { anesthesiaApi } from '../../../api/clinicalRecords';
import { printAnesthesiaRecovery } from '../../../components/AnesthesiaPrintTemplates';
import { Section, Row2 } from './_shared';

// ---------------------------------------------------------------------------
// Types & constants (PostAnesthesiaPlan-specific)
// ---------------------------------------------------------------------------

export interface PostAnesthesiaPlanModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface PostAnesthForm {
  recoveryNotes: string;    // Diễn biến hồi tỉnh
  postSurgeryPlan: string;  // Kế hoạch chăm sóc sau mổ
  status: number;
}

const EMPTY_POST: PostAnesthForm = {
  recoveryNotes: '',
  postSurgeryPlan: '',
  status: 1,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PostAnesthesiaPlanModal: React.FC<PostAnesthesiaPlanModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [form, setForm] = useState<PostAnesthForm>(EMPTY_POST);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof PostAnesthForm>(k: K, v: PostAnesthForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const existing = Array.isArray(records) ? records[0] : null;
      if (existing) {
        setExistingId(existing.id);
        setForm({
          recoveryNotes: existing.recoveryNotes ?? '',
          postSurgeryPlan: existing.postSurgeryPlan ?? '',
          status: existing.status ?? 1,
        });
      } else {
        setExistingId(null);
        setForm(EMPTY_POST);
      }
    } catch {
      setForm(EMPTY_POST);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // In phiếu hồi tỉnh — fetch bản ghi đầy đủ (có monitors) + merge form hiện tại
  const handlePrint = async () => {
    if (!surgeryId) return;
    try {
      const records = await anesthesiaApi.getRecords({ surgeryId });
      const base = (Array.isArray(records) ? records[0] : null) ?? {};
      printAnesthesiaRecovery({
        ...base,
        patientName: patientName ?? (base.patientName ?? ''),
        recoveryNotes: form.recoveryNotes || base.recoveryNotes || '',
        postSurgeryPlan: form.postSurgeryPlan || base.postSurgeryPlan || '',
      });
    } catch {
      te('Không in được phiếu hồi tỉnh');
    }
  };

  const handleSave = async () => {
    if (!form.recoveryNotes.trim() && !form.postSurgeryPlan.trim()) {
      tw('Nhập ít nhất diễn biến hồi tỉnh hoặc kế hoạch chăm sóc');
      return;
    }
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        // Preserve required fields (use defaults if record is new)
        asaClass: 1,
        mallampatiScore: 1,
        anesthesiaType: 'Gây mê toàn thân',
        recoveryNotes: form.recoveryNotes || undefined,
        postSurgeryPlan: form.postSurgeryPlan || undefined,
        status: form.status,
      });
      tk('Đã lưu kế hoạch sau gây mê – phẫu thuật');
      await load();
    } catch {
      te('Không thể lưu kế hoạch sau gây mê');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="clipboard" size={14} />
          <span>Kế hoạch sau gây mê – phẫu thuật</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" onClick={handlePrint} title="In kế hoạch sau gây mê">
            <TermIcon name="print" size={12} /> In
          </Btn>
          <Btn variant="primary" loading={saving} onClick={handleSave}>
            <TermIcon name="download" size={12} /> Lưu
          </Btn>
        </>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-32)' }}><Spin /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Section title="Hồi tỉnh sau mổ">
            <Row2 label="Diễn biến hồi tỉnh">
              <Input.TextArea
                rows={4}
                value={form.recoveryNotes}
                onChange={(e) => set('recoveryNotes', e.target.value)}
                placeholder="Điểm Aldrete, thời gian hồi tỉnh, biến chứng, xử trí tại phòng hồi tỉnh…"
              />
            </Row2>
          </Section>

          <Section title="Kế hoạch chăm sóc sau phẫu thuật">
            <Row2 label="Kế hoạch chi tiết">
              <Input.TextArea
                rows={6}
                value={form.postSurgeryPlan}
                onChange={(e) => set('postSurgeryPlan', e.target.value)}
                placeholder={`Nhập kế hoạch chăm sóc sau mổ, ví dụ:\n- Chế độ ăn uống: ...\n- Giảm đau: ...\n- Thay băng / chăm sóc vết mổ: ...\n- Vật lý trị liệu: ...\n- Lịch tái khám: ...\n- Dấu hiệu cảnh báo cần đến viện ngay: ...`}
              />
            </Row2>
            <Row2 label="Trạng thái">
              <AbSelect
                options={[
                  { value: 0, label: 'Nháp' },
                  { value: 1, label: 'Đang theo dõi' },
                  { value: 2, label: 'Hoàn thành' },
                ]}
                value={form.status}
                onChange={(v) => set('status', Number(v))}
              />
            </Row2>
          </Section>
        </div>
      )}
    </ModalShell>
  );
};
