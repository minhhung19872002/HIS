/**
 * surgery-modals/PreAnesthesiaModal.tsx
 * Phiếu khám tiền mê + hồi tỉnh (AnesthesiaRecord)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Select, Spin } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw, te } from '../../_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import { anesthesiaApi } from '../../../api/clinicalRecords';
import { printAnesthesiaForm } from '../../../api/surgery';
import { Section, Row2, ASA_OPTIONS, MALLAMPATI_OPTIONS, ANESTHESIA_TYPE_OPTIONS } from './_shared';

// ---------------------------------------------------------------------------
// Types & constants (PreAnesthesia-specific)
// ---------------------------------------------------------------------------

export interface PreAnesthesiaModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientId: string;
  patientName?: string;
  surgeryCode?: string;
}

interface PreAnesthForm {
  asaClass: number;
  mallampatiScore: number;
  allergies: string;
  npoStatus: string;
  anesthesiaType: string;
  airwayPlan: string;
  preOpAssessment: string;
  psychologicalAssessment: string;
  recoveryNotes: string;
  status: number;
}

const EMPTY_PREANEST: PreAnesthForm = {
  asaClass: 1,
  mallampatiScore: 1,
  allergies: '',
  npoStatus: '',
  anesthesiaType: 'Gây mê toàn thân',
  airwayPlan: '',
  preOpAssessment: '',
  psychologicalAssessment: '',
  recoveryNotes: '',
  status: 0,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PreAnesthesiaModal: React.FC<PreAnesthesiaModalProps> = ({
  open, onClose, surgeryId, patientId, patientName, surgeryCode,
}) => {
  const [form, setForm] = useState<PreAnesthForm>(EMPTY_PREANEST);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printing, setPrinting] = useState(false);

  const set = <K extends keyof PreAnesthForm>(k: K, v: PreAnesthForm[K]) =>
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
          asaClass: existing.asaClass ?? 1,
          mallampatiScore: existing.mallampatiScore ?? 1,
          allergies: existing.allergies ?? '',
          npoStatus: existing.npoStatus ?? '',
          anesthesiaType: existing.anesthesiaType || 'Gây mê toàn thân',
          airwayPlan: existing.airwayPlan ?? '',
          preOpAssessment: existing.preOpAssessment ?? '',
          psychologicalAssessment: existing.psychologicalAssessment ?? '',
          recoveryNotes: existing.recoveryNotes ?? '',
          status: existing.status ?? 0,
        });
      } else {
        setExistingId(null);
        setForm(EMPTY_PREANEST);
      }
    } catch {
      setForm(EMPTY_PREANEST);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId]);

  useEffect(() => { if (open) load(); }, [open, load]);

  const handleSave = async () => {
    if (!form.anesthesiaType) { tw('Cần chọn phương pháp vô cảm'); return; }
    setSaving(true);
    try {
      await anesthesiaApi.save({
        id: existingId ?? undefined,
        surgeryId,
        patientId,
        patientName: patientName ?? '',
        asaClass: form.asaClass,
        mallampatiScore: form.mallampatiScore,
        allergies: form.allergies || undefined,
        npoStatus: form.npoStatus || undefined,
        anesthesiaType: form.anesthesiaType,
        airwayPlan: form.airwayPlan || undefined,
        preOpAssessment: form.preOpAssessment || undefined,
        psychologicalAssessment: form.psychologicalAssessment || undefined,
        recoveryNotes: form.recoveryNotes || undefined,
        status: form.status,
      });
      tk('Đã lưu phiếu khám tiền mê');
      await load();
    } catch {
      te('Không thể lưu phiếu khám tiền mê');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    if (!surgeryId) return;
    setPrinting(true);
    try {
      const res = await printAnesthesiaForm(surgeryId);
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      te('Không in được phiếu gây mê');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="activity" size={14} />
          <span>Phiếu khám tiền mê</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          {existingId && (
            <Btn variant="ghost" loading={printing} onClick={handlePrint} icon="print">
              In phiếu
            </Btn>
          )}
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
          <Section title="Đánh giá tiền phẫu">
            <Row2 label="Phân loại ASA">
              <AbSelect
                options={ASA_OPTIONS}
                value={form.asaClass}
                onChange={(v) => set('asaClass', Number(v))}
              />
            </Row2>
            <Row2 label="Mallampati">
              <AbSelect
                options={MALLAMPATI_OPTIONS}
                value={form.mallampatiScore}
                onChange={(v) => set('mallampatiScore', Number(v))}
              />
            </Row2>
            <Row2 label="Dị ứng">
              <Input
                value={form.allergies}
                onChange={(e) => set('allergies', e.target.value)}
                placeholder="Thuốc / chất dị ứng (nếu có)…"
                size="small"
              />
            </Row2>
            <Row2 label="Nhịn ăn (NPO)">
              <Input
                value={form.npoStatus}
                onChange={(e) => set('npoStatus', e.target.value)}
                placeholder="VD: nhịn ăn từ 22h hôm qua…"
                size="small"
              />
            </Row2>
            <Row2 label="Phương pháp vô cảm *">
              <Select
                style={{ width: '100%' }}
                size="small"
                value={form.anesthesiaType}
                onChange={(v) => set('anesthesiaType', v)}
                options={ANESTHESIA_TYPE_OPTIONS}
              />
            </Row2>
            <Row2 label="Kế hoạch đường thở">
              <Input.TextArea
                rows={2}
                value={form.airwayPlan}
                onChange={(e) => set('airwayPlan', e.target.value)}
                placeholder="Nội khí quản / mask thanh quản / khó đường thở…"
              />
            </Row2>
            <Row2 label="Đánh giá tiền mê">
              <Input.TextArea
                rows={3}
                value={form.preOpAssessment}
                onChange={(e) => set('preOpAssessment', e.target.value)}
                placeholder="Nhận xét tình trạng BN, khuyến nghị trước mổ…"
              />
            </Row2>
            <Row2 label="Khám tâm lý trước mổ">
              <Input.TextArea
                rows={3}
                value={form.psychologicalAssessment}
                onChange={(e) => set('psychologicalAssessment', e.target.value)}
                placeholder="Tâm trạng, lo âu, mức độ hợp tác, tư vấn tâm lý trước mổ…"
              />
            </Row2>
          </Section>

          <Section title="Hồi tỉnh sau mổ">
            <Row2 label="Ghi chú hồi tỉnh">
              <Input.TextArea
                rows={3}
                value={form.recoveryNotes}
                onChange={(e) => set('recoveryNotes', e.target.value)}
                placeholder="Diễn biến hồi tỉnh, điểm Aldrete, xử trí sau mổ…"
              />
            </Row2>
            <Row2 label="Trạng thái">
              <AbSelect
                options={[
                  { value: 0, label: 'Nháp' },
                  { value: 1, label: 'Đang thực hiện' },
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
