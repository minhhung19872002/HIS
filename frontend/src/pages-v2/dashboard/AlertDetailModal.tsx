import React from 'react';
import { Modal } from 'antd';
import type { BusinessAlertDto } from '../../api/businessAlerts';
import { fmtRelShort } from './_shared';

/* ==========================================================================
   Alert detail modal
   ========================================================================== */

export const AlertDetailModal: React.FC<{
  alert: BusinessAlertDto | null;
  onClose: () => void;
  onAck: () => void;
}> = ({ alert, onClose, onAck }) => {
  if (!alert) return null;
  return (
    <Modal
      open={!!alert}
      onCancel={onClose}
      width={480}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {alert.patientName ? `${alert.patientName} · ` : ''}{alert.module?.toUpperCase() || alert.title}
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{fmtRelShort(alert.createdAt)}</div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        <button key="ack" type="button" className="btn primary" onClick={onAck}>Xác nhận (ACK)</button>,
      ]}
    >
      <div style={{ padding: '4px 0 8px', fontSize: 'var(--fs-md)', color: 'var(--t-1)', lineHeight: 1.5 }}>{alert.message}</div>
    </Modal>
  );
};
