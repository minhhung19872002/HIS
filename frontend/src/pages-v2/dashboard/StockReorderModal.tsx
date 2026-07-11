import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Modal, InputNumber, Select as AntdSelect, DatePicker } from 'antd';
import type { ExpiryWarningDto } from '../../modules/pharmacy/api/warehouse';

/* ==========================================================================
   Stock reorder modal — create a purchase order for a near-expiry item
   ========================================================================== */

const SUPPLIERS = ['CTCP Dược Hậu Giang', 'CTCP Traphaco', 'CTCP Dược phẩm Pymepharco'];

export const StockReorderModal: React.FC<{
  item: ExpiryWarningDto | null;
  onClose: () => void;
  onCreatePO: (qty: number) => void;
}> = ({ item, onClose, onCreatePO }) => {
  const [qty, setQty] = useState(0);
  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [needDate, setNeedDate] = useState<dayjs.Dayjs | null>(dayjs().add(3, 'day'));
  useEffect(() => {
    if (item) setQty(Math.max((item.quantity || 100) * 3, 2000));
  }, [item]);
  if (!item) return null;
  return (
    <Modal
      open={!!item}
      onCancel={onClose}
      width={480}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Đặt hàng: {item.itemName}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
            Tồn hiện tại: {item.quantity.toLocaleString('vi-VN')} {item.unit} · Còn {item.daysToExpiry}d
          </div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
        <button key="po" type="button" className="btn primary" onClick={() => onCreatePO(qty)}>Tạo PO</button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)' }}>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: '#475569', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Số lượng đặt *</div>
          <InputNumber value={qty} onChange={(v) => setQty(Number(v) || 0)} style={{ width: '100%' }} addonAfter={item.unit} min={1} />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: '#475569', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Nhà cung cấp</div>
          <AntdSelect value={supplier} onChange={setSupplier} options={SUPPLIERS.map((s) => ({ value: s, label: s }))} style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 'var(--fs-xs)', color: '#475569', marginBottom: 'var(--space-4)', fontWeight: 500 }}>Ngày cần nhận</div>
          <DatePicker value={needDate} onChange={setNeedDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </div>
      </div>
    </Modal>
  );
};
