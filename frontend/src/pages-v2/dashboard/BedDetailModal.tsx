import React from 'react';
import { Modal } from 'antd';
import type { BedLayoutDto } from '../../modules/inpatient/api/inpatient';

/* ==========================================================================
   Bed detail modal
   ========================================================================== */

export const BedDetailModal: React.FC<{
  bed: BedLayoutDto | null;
  onClose: () => void;
  onReserve: () => void;
  onOpenRecord: () => void;
}> = ({ bed, onClose, onReserve, onOpenRecord }) => {
  if (!bed) return null;
  const isFree = bed.status === 1;
  const isOccupied = bed.status === 2;
  const statusVi = bed.status === 1 ? 'Trống' : bed.status === 2 ? 'Đang dùng' : bed.status === 3 ? 'Bảo trì' : bed.statusName || 'Khác';
  return (
    <Modal
      open={!!bed}
      onCancel={onClose}
      title={bed.bedName?.toLowerCase().includes('giường') ? bed.bedName : `Giường ${bed.bedName}`}
      width={420}
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        isFree && <button key="reserve" type="button" className="btn primary" onClick={onReserve}>Đặt trước</button>,
        isOccupied && <button key="open" type="button" className="btn primary" onClick={onOpenRecord}>Mở hồ sơ</button>,
      ]}
    >
      <div style={{ display: 'grid', gap: 'var(--space-8)', fontSize: 'var(--fs-md)' }}>
        <div><span className="ab-u-muted">Mã giường:</span> <b className="mono">{bed.bedName}</b></div>
        <div><span className="ab-u-muted">Trạng thái:</span> <b>{statusVi}</b></div>
        {bed.patientName && (
          <div><span className="ab-u-muted">Bệnh nhân:</span> <b>{bed.patientName}</b></div>
        )}
        {bed.bedCode && (
          <div><span className="ab-u-muted">Vị trí:</span> <span className="mono">{bed.bedCode}</span></div>
        )}
      </div>
    </Modal>
  );
};
