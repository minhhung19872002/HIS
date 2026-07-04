import React from 'react';
import { Link } from 'react-router-dom';
import type { ExpiryWarningDto } from '../../api/warehouse';

/* ==========================================================================
   Pharmacy — pending count + expiry warnings
   ========================================================================== */

export const PharmacyAlerts: React.FC<{
  items: ExpiryWarningDto[];
  pendingCount: number;
  onStockClick?: (i: ExpiryWarningDto) => void;
}> = ({ items, pendingCount, onStockClick }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Dược · <b>{pendingCount} đơn chờ</b></span>
      <div className="actions">
        <Link to="/v2/pharmacy" className="btn sm">Mở →</Link>
      </div>
    </div>
    <div className="panel-body" style={{ padding: '8px 14px 10px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', margin: '4px 0', letterSpacing: '0.06em' }}>
        CẢNH BÁO HẠN DÙNG
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '8px 0' }}>
          Không có thuốc sắp hết hạn trong 3 tháng
        </div>
      ) : (
        items.map((i) => {
          const color = i.daysToExpiry < 30 ? 'var(--s-crit)' : i.daysToExpiry < 60 ? 'var(--s-warn)' : 'var(--s-info)';
          return (
            <div
              key={i.stockId}
              className="stock-row"
              onClick={() => onStockClick?.(i)}
              style={{ cursor: onStockClick ? 'pointer' : 'default' }}
            >
              <span className="stock-n" title={i.itemName}>{i.itemName}</span>
              <span className="mono" style={{ color }}>
                {i.quantity.toLocaleString('vi-VN')} {i.unit}
              </span>
              <span className="mono" style={{ color, fontSize: 'var(--fs-xxs)' }}>
                {i.daysToExpiry}d
              </span>
            </div>
          );
        })
      )}
    </div>
  </div>
);
