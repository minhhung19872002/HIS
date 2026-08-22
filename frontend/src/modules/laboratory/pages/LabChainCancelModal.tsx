import React from 'react';
import { ModalShell, Btn } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import type { LabRequest } from '../api/laboratory';
import { Field } from '../../../components/form/Field';
import { useModalForm } from '../../../hooks/useModalForm';

export const LabChainCancelModal: React.FC<{
  open: boolean;
  onClose: () => void;
  busy: boolean;
  target: LabRequest | null;
  level: 1 | 2 | 3;
  setLevel: (v: 1 | 2 | 3) => void;
  reason: string;
  setReason: (v: string) => void;
  onConfirm: () => void;
}> = ({ open, onClose, busy, target, level, setLevel, reason, setReason, onConfirm }) => {
  const form = useModalForm({
    reason: { required: true, message: 'Bắt buộc nhập lý do hủy' },
  }, open);

  return (
  <ModalShell
    open={open}
    onClose={() => { if (!busy) onClose(); }}
    title="Hủy ngược chuỗi xét nghiệm"
    sub={target ? `${target.requestCode} · ${target.patientName} · ${(target.tests || []).length} chỉ số` : ''}
    size="sm"
    tone="danger"
    footer={
      <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" disabled={busy} onClick={onClose}>Hủy bỏ</Btn>
        <Btn
          variant="crit"
          size="sm"
          disabled={busy}
          onClick={() => { if (form.validate({ reason })) onConfirm(); }}
        >
          <TermIcon name="refresh" size={11} /> {busy ? 'Đang xử lý…' : 'Thực hiện hủy'}
        </Btn>
      </div>
    }
  >
    <div style={{ display: 'grid', gap: 'var(--space-10)' }}>
      <div>
        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', display: 'block', marginBottom: 'var(--space-6)' }}>Mức hủy (áp cho mọi chỉ số của phiếu, chạy tuần tự theo bước)</label>
        {([
          { v: 1 as const, l: 'Hủy duyệt kết quả', d: 'Đã duyệt → Đã có KQ' },
          { v: 2 as const, l: 'Hủy KQ + hủy nhận mẫu', d: 'Đã có KQ / Đang xử lý → Đã lấy mẫu (xóa kết quả)' },
          { v: 3 as const, l: 'Hủy lấy mẫu', d: 'Đã lấy mẫu → Chờ lấy mẫu (hủy toàn bộ về đầu)' },
        ]).map((o) => (
          <label key={o.v} style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'flex-start', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-4)', cursor: 'pointer', background: level === o.v ? 'var(--d-1)' : 'transparent' }}>
            <input type="radio" name="chain-level" checked={level === o.v} onChange={() => setLevel(o.v)} style={{ marginTop: 'var(--space-2)' }} />
            <span>
              <b style={{ fontSize: 'var(--fs-sm)' }}>{o.l}</b>
              <span style={{ display: 'block', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{o.d}</span>
            </span>
          </label>
        ))}
      </div>
      <Field label="Lý do hủy" required error={form.errors.reason}>
        <textarea className="hui-inp" rows={2} style={{ width: '100%', resize: 'vertical' }} value={reason} onChange={(e) => { setReason(e.target.value); form.clear('reason'); }} placeholder="Bắt buộc — ghi vào ghi chú KTV của từng chỉ số…" />
      </Field>
      {level >= 2 && (
        <div style={{ fontSize: 11.5, color: 'var(--s-warn)', padding: '6px 8px', background: 'var(--d-1)', borderRadius: 4, borderLeft: '3px solid var(--s-warn)' }}>
          ⚠ Mức này XÓA kết quả đã nhập của các chỉ số — không thể hoàn tác.
        </div>
      )}
    </div>
  </ModalShell>
  );
};
