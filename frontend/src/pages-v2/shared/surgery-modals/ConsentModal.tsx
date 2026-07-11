/**
 * surgery-modals/ConsentModal.tsx
 * Phiếu cam đoan PTTT (SurgeryConsent)
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Input, Spin } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw, te } from '../../_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import {
  getSurgeryConsents,
  saveSurgeryConsent,
  signConsent,
  type SurgeryConsentDto,
  type SaveConsentDto,
} from '../../../modules/surgery/api/surgery';
import { Section, Row2 } from './_shared';

// ---------------------------------------------------------------------------
// Types & constants (Consent-specific)
// ---------------------------------------------------------------------------

export interface ConsentModalProps {
  open: boolean;
  onClose: () => void;
  surgeryId: string;
  patientName?: string;
  surgeryCode?: string;
  plannedProcedure?: string;
  diagnosis?: string;
}

const CONSENT_TYPE_OPTIONS = [
  { value: 1, label: 'Cam đoan phẫu thuật' },
  { value: 2, label: 'Cam đoan gây mê' },
  { value: 3, label: 'Cam đoan truyền máu' },
  { value: 4, label: 'Cam đoan thủ thuật' },
];

interface ConsentForm {
  consentType: number;
  diagnosis: string;
  plannedProcedure: string;
  risks: string;
  alternatives: string;
  doctorExplanation: string;
  signerName: string;
  signerRelationship: string;
}

const EMPTY_CONSENT: ConsentForm = {
  consentType: 1,
  diagnosis: '',
  plannedProcedure: '',
  risks: '',
  alternatives: '',
  doctorExplanation: '',
  signerName: '',
  signerRelationship: '',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConsentModal: React.FC<ConsentModalProps> = ({
  open, onClose, surgeryId, patientName, surgeryCode, plannedProcedure, diagnosis,
}) => {
  const [consents, setConsents]   = useState<SurgeryConsentDto[]>([]);
  const [form, setForm]           = useState<ConsentForm>(EMPTY_CONSENT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [signing, setSigning]     = useState(false);

  const set = <K extends keyof ConsentForm>(k: K, v: ConsentForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    if (!open || !surgeryId) return;
    setLoading(true);
    try {
      const data = await getSurgeryConsents(surgeryId);
      setConsents(data);
      // Pre-fill form if no existing consent of type 1
      const hasPtConsent = data.some((c) => c.consentType === 1);
      if (!hasPtConsent) {
        setForm({
          ...EMPTY_CONSENT,
          diagnosis: diagnosis ?? '',
          plannedProcedure: plannedProcedure ?? '',
        });
        setSelectedId(null);
      } else {
        const first = data[0];
        setSelectedId(first.id);
        setForm({
          consentType: first.consentType,
          diagnosis: first.diagnosis ?? '',
          plannedProcedure: first.plannedProcedure ?? '',
          risks: first.risks ?? '',
          alternatives: first.alternatives ?? '',
          doctorExplanation: first.doctorExplanation ?? '',
          signerName: first.signerName ?? '',
          signerRelationship: first.signerRelationship ?? 'BN',
        });
      }
    } catch {
      setConsents([]);
    } finally {
      setLoading(false);
    }
  }, [open, surgeryId, diagnosis, plannedProcedure]);

  useEffect(() => { if (open) load(); else { setConsents([]); setSelectedId(null); setForm(EMPTY_CONSENT); } }, [open, load]);

  const handleSave = async () => {
    if (!form.plannedProcedure.trim()) { tw('Cần nhập phương pháp phẫu thuật dự kiến'); return; }
    setSaving(true);
    try {
      const dto: SaveConsentDto = {
        id: selectedId ?? undefined,
        surgeryId,
        consentType: form.consentType,
        diagnosis: form.diagnosis || undefined,
        plannedProcedure: form.plannedProcedure,
        risks: form.risks || undefined,
        alternatives: form.alternatives || undefined,
        doctorExplanation: form.doctorExplanation || undefined,
      };
      const saved = await saveSurgeryConsent(dto);
      setSelectedId(saved.id);
      tk('Đã lưu cam đoan PTTT');
      await load();
    } catch {
      te('Không thể lưu cam đoan PTTT');
    } finally {
      setSaving(false);
    }
  };

  const handleSign = async () => {
    if (!selectedId) { tw('Lưu cam đoan trước khi ký'); return; }
    if (!form.signerName.trim()) { tw('Cần nhập tên người ký'); return; }
    setSigning(true);
    try {
      await signConsent(selectedId, form.signerName, form.signerRelationship || 'BN');
      tk('Đã ký cam đoan');
      await load();
    } catch {
      te('Ký cam đoan thất bại');
    } finally {
      setSigning(false);
    }
  };

  const activeConsent = selectedId ? consents.find((c) => c.id === selectedId) : null;

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="check" size={14} />
          <span>Cam đoan PTTT</span>
        </span>
      }
      sub={[patientName, surgeryCode].filter(Boolean).join(' · ') || undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" loading={signing} onClick={handleSign}>
            <TermIcon name="edit" size={12} /> Ký
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
          {/* Existing consents list */}
          {consents.length > 0 && (
            <Section title={`Cam đoan đã lập (${consents.length})`}>
              {consents.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: `1px solid ${selectedId === c.id ? 'var(--a-cy)' : 'var(--line)'}`,
                    borderRadius: 'var(--r-2)', padding: '8px 10px', marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    setSelectedId(c.id);
                    setForm({
                      consentType: c.consentType,
                      diagnosis: c.diagnosis ?? '',
                      plannedProcedure: c.plannedProcedure ?? '',
                      risks: c.risks ?? '',
                      alternatives: c.alternatives ?? '',
                      doctorExplanation: c.doctorExplanation ?? '',
                      signerName: c.signerName ?? '',
                      signerRelationship: c.signerRelationship ?? 'BN',
                    });
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                    <b>{CONSENT_TYPE_OPTIONS.find((o) => o.value === c.consentType)?.label ?? `Loại ${c.consentType}`}</b>
                    {c.isSigned && (
                      <span className="chip ok" style={{ fontSize: 'var(--fs-xxs)' }}>
                        <TermIcon name="check" size={9} /> Đã ký — {c.signerName}
                      </span>
                    )}
                    {!c.isSigned && <span className="chip warn" style={{ fontSize: 'var(--fs-xxs)' }}>Chờ ký</span>}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Consent form */}
          <Section title={selectedId ? 'Chỉnh sửa cam đoan' : 'Lập cam đoan mới'}>
            <Row2 label="Loại cam đoan">
              <AbSelect
                options={CONSENT_TYPE_OPTIONS}
                value={form.consentType}
                onChange={(v) => set('consentType', Number(v))}
              />
            </Row2>
            <Row2 label="Chẩn đoán">
              <Input
                value={form.diagnosis}
                onChange={(e) => set('diagnosis', e.target.value)}
                placeholder="Chẩn đoán bệnh cần phẫu thuật…"
                size="small"
              />
            </Row2>
            <Row2 label="Phương pháp PT *">
              <Input
                value={form.plannedProcedure}
                onChange={(e) => set('plannedProcedure', e.target.value)}
                placeholder="Tên phẫu thuật / thủ thuật dự kiến…"
                size="small"
              />
            </Row2>
            <Row2 label="Rủi ro">
              <Input.TextArea
                rows={2}
                value={form.risks}
                onChange={(e) => set('risks', e.target.value)}
                placeholder="Các rủi ro có thể xảy ra…"
              />
            </Row2>
            <Row2 label="Phương án khác">
              <Input.TextArea
                rows={2}
                value={form.alternatives}
                onChange={(e) => set('alternatives', e.target.value)}
                placeholder="Các phương án điều trị khác nếu có…"
              />
            </Row2>
            <Row2 label="Giải thích BS">
              <Input.TextArea
                rows={2}
                value={form.doctorExplanation}
                onChange={(e) => set('doctorExplanation', e.target.value)}
                placeholder="Bác sĩ đã giải thích đầy đủ cho bệnh nhân / người nhà…"
              />
            </Row2>
          </Section>

          {/* Sign section */}
          {activeConsent && !activeConsent.isSigned && (
            <Section title="Ký cam đoan">
              <Row2 label="Người ký">
                <Input
                  value={form.signerName}
                  onChange={(e) => set('signerName', e.target.value)}
                  placeholder="Họ tên người ký (BN / người đại diện)…"
                  size="small"
                />
              </Row2>
              <Row2 label="Quan hệ với BN">
                <AbSelect
                  options={[
                    { value: 'BN', label: 'Bản thân bệnh nhân' },
                    { value: 'Vợ/chồng', label: 'Vợ / Chồng' },
                    { value: 'Cha/mẹ', label: 'Cha / Mẹ' },
                    { value: 'Con', label: 'Con' },
                    { value: 'Người giám hộ', label: 'Người giám hộ' },
                  ]}
                  value={form.signerRelationship || 'BN'}
                  onChange={(v) => set('signerRelationship', String(v))}
                />
              </Row2>
            </Section>
          )}

          {activeConsent?.isSigned && (
            <div style={{ color: 'var(--s-ok)', fontSize: 'var(--fs-sm)', padding: '8px 10px', background: 'var(--s-ok-bg)', borderRadius: 'var(--r-2)' }}>
              <TermIcon name="check" size={12} /> Cam đoan đã được ký bởi {activeConsent.signerName} ({activeConsent.signerRelationship})
              {activeConsent.signedAt && ` — ${new Date(activeConsent.signedAt).toLocaleString('vi-VN')}`}
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
};
