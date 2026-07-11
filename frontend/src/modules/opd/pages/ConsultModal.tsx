import React from 'react';
import { ModalShell, Btn } from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';
import type { ConsultationRecordDto } from '../api/examination';

/* ==========================================================================
   Modal Sổ hội chẩn — extracted verbatim from OpdEditor.tsx (#205 FE-2 split,
   Phase 1). saveConsult stays in the main component and is passed as onSave;
   the form state + records are owned by main and threaded via props.
   ========================================================================== */

interface ConsultForm { reason: string; summary: string; conclusion: string; recommendations: string; }

export const ConsultModal: React.FC<{
  open: boolean;
  onClose: () => void;
  consults: ConsultationRecordDto[];
  form: ConsultForm;
  setForm: React.Dispatch<React.SetStateAction<ConsultForm>>;
  saving: boolean;
  onSave: () => void;
  sub?: string;
}> = ({ open, onClose, consults, form, setForm, saving, onSave, sub }) => (
  <ModalShell
    open={open}
    onClose={onClose}
    title="Sổ hội chẩn"
    sub={sub}
    size="lg"
    footer={
      <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" onClick={onClose}>Đóng</Btn>
        <Btn variant="primary" size="sm" disabled={saving || !form.reason.trim()} onClick={onSave}>
          <TermIcon name="plus" size={11} /> Lưu biên bản
        </Btn>
      </div>
    }
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
      {consults.length > 0 && (
        <div>
          <h4 style={{ margin: '0 0 6px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Biên bản đã lập ({consults.length})</h4>
          {consults.map((c) => (
            <div key={c.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-10)', marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>
                <b>{c.reason}</b>
                <span className="spacer" />
                <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>{c.consultationDate ? new Date(c.consultationDate).toLocaleString('vi-VN') : ''}</span>
              </div>
              {c.conclusion && <div style={{ color: 'var(--t-1)' }}>KL: {c.conclusion}</div>}
              {c.recommendations && <div style={{ color: 'var(--t-2)', fontSize: 11.5 }}>Đề nghị: {c.recommendations}</div>}
            </div>
          ))}
        </div>
      )}
      <div>
        <h4 style={{ margin: '0 0 6px', fontSize: 11.5, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: 'var(--t-2)' }}>Lập biên bản mới</h4>
        <div style={{ display: 'grid', gap: 'var(--space-8)' }}>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Lý do hội chẩn <span style={{ color: 'var(--s-err)' }}>*</span></label>
            <input className="hui-inp" style={{ width: '100%', height: 28 }} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Ca khó, đa bệnh lý…" />
          </div>
          <div>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Tóm tắt diễn biến</label>
            <textarea className="hui-inp" rows={2} style={{ width: '100%', resize: 'vertical' }} value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Kết luận</label>
              <textarea className="hui-inp" rows={2} style={{ width: '100%', resize: 'vertical' }} value={form.conclusion} onChange={(e) => setForm((f) => ({ ...f, conclusion: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Đề nghị</label>
              <textarea className="hui-inp" rows={2} style={{ width: '100%', resize: 'vertical' }} value={form.recommendations} onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  </ModalShell>
);
