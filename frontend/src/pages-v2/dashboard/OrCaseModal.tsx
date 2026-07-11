import React from 'react';
import dayjs from 'dayjs';
import { Modal } from 'antd';
import type { SurgeryScheduleDto } from '../../modules/surgery/api/surgery';

/* ==========================================================================
   OR case modal
   ========================================================================== */

const Fld: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>{label.toUpperCase()}</div>
    <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 4, fontSize: 'var(--fs-md)' }}>{value}</div>
  </div>
);

export const OrCaseModal: React.FC<{
  data: { surgery: NonNullable<SurgeryScheduleDto['surgeries']>[number]; orName: string } | null;
  onClose: () => void;
  onPrint: () => void;
  onMarkDone: () => void;
}> = ({ data, onClose, onPrint, onMarkDone }) => {
  if (!data) return null;
  const { surgery: it, orName } = data;
  const start = it.scheduledTime ? dayjs(it.scheduledTime) : null;
  const end = start ? start.add(it.estimatedDuration || 60, 'minute') : null;
  return (
    <Modal
      open={!!data}
      onCancel={onClose}
      width={640}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{it.surgeryServiceName}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
            {orName} · {start ? start.format('HH:mm') : '—'} – {end ? end.format('HH:mm') : '—'} · {it.patientName}
          </div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        <button key="print" type="button" className="btn ghost" onClick={onPrint}>In phiếu mổ</button>,
        <button key="done" type="button" className="btn primary" onClick={onMarkDone}>Đánh dấu xong</button>,
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <Fld label="Bệnh nhân" value={`${it.patientName} · ${it.patientCode || '—'}`} />
        <Fld label="Trạng thái" value={it.statusName || '—'} />
        <Fld label="PTV chính" value={it.surgeonName || '—'} />
        <Fld label="Gây mê" value={it.anesthesiologistName || '—'} />
        <Fld label="Dự kiến" value={`${it.estimatedDuration || 60} phút`} />
        <Fld label="Loại ca" value={String(it.surgeryType ?? '—')} />
      </div>
    </Modal>
  );
};
