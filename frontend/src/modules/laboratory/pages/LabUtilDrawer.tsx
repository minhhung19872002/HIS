import React from 'react';
import dayjs from 'dayjs';
import TermIcon from '../../../components/layout/terminal/Icon';
import { DrawerShell } from '../../../pages-v2/_v2kit';
import type { WarehouseStock, LabChemicalItem } from './_shared';

export const LabUtilDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  loading: boolean;
  filterMonth: string;
  setFilterMonth: (v: string) => void;
  cabinetStock: WarehouseStock[];
  chemStock: WarehouseStock[];
  chemicals: LabChemicalItem[];
}> = ({ open, onClose, loading, filterMonth, setFilterMonth, cabinetStock, chemStock, chemicals }) => {
  // Filter helpers cho panel
  const filterByMonth = (items: WarehouseStock[]) => {
    if (!filterMonth) return items;
    return items.filter((s) => {
      if (!s.expiryDate) return true; // Hạn không xác định → giữ lại
      return s.expiryDate.startsWith(filterMonth);
    });
  };
  const applyUtilFilters = (items: WarehouseStock[]) => filterByMonth(items);

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Tiện ích XN — Tồn kho"
      sub="Tủ trực hóa chất · Tồn kho hóa chất · Định mức XN"
      size="lg"
    >
      {loading ? (
        <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải…</div>
      ) : (
        <>
          {/* ── Filter chung ── */}
          <div style={{ display: 'flex', gap: 'var(--space-8)', marginBottom: 'var(--space-12)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', marginBottom: 'var(--space-2)' }}>Tháng/Năm HSD</div>
              <input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                style={{
                  padding: '4px 8px', border: '1px solid var(--line)', borderRadius: 4,
                  fontSize: 'var(--fs-sm)', background: 'var(--d-1)', color: 'inherit',
                }}
              />
            </div>
            {filterMonth && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  onClick={() => setFilterMonth('')}
                  style={{ padding: '4px 8px', fontSize: 'var(--fs-xs)', cursor: 'pointer',
                    border: '1px solid var(--line)', borderRadius: 4, background: 'var(--d-0)', color: 'var(--t-2)' }}
                >
                  Xóa lọc
                </button>
              </div>
            )}
          </div>

          {/* ── Section 1: Tủ trực (WarehouseType=5) ── */}
          <div className="rec-section">
            <h5><TermIcon name="package" size={11} /> TỒN TỦ TRỰC (Kho hóa chất nội bộ khoa)</h5>
            {applyUtilFilters(cabinetStock).length === 0 ? (
              <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>
                {cabinetStock.length === 0 ? 'Không có dữ liệu tủ trực' : 'Không có mục nào khớp filter'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', textTransform: 'uppercase',
                  fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span>Tên hóa chất / Kho</span>
                  <span style={{ textAlign: 'right' }}>Tồn</span>
                  <span style={{ textAlign: 'right' }}>Khả dụng</span>
                  <span>HSD</span>
                </div>
                {applyUtilFilters(cabinetStock).slice(0, 50).map((s) => (
                  <div key={s.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                    fontSize: 12.5, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                      <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{s.warehouseName}</div>
                    </div>
                    <span className="mono" style={{ textAlign: 'right' }}>{s.quantity} {s.unit}</span>
                    <span className="mono" style={{
                      textAlign: 'right',
                      color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? 'var(--s-warn)' : 'inherit',
                      fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                    }}>
                      {s.availableQuantity}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? 'var(--s-warn)' : 'var(--t-2)' }}>
                      {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                      {s.daysToExpiry !== undefined && s.daysToExpiry < 30 && (
                        <span style={{ marginLeft: 'var(--space-4)', color: 'var(--s-crit)', fontSize: 'var(--fs-xxs)' }}>({s.daysToExpiry}d)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 2: Tồn kho hóa chất (ngoài tủ trực) ── */}
          <div className="rec-section" style={{ marginTop: 'var(--space-16)' }}>
            <h5><TermIcon name="flask" size={11} /> TỒN KHO HÓA CHẤT (Kho XN — không kể tủ trực)</h5>
            {applyUtilFilters(chemStock).length === 0 ? (
              <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>
                {chemStock.length === 0 ? 'Không có dữ liệu tồn kho hóa chất' : 'Không có mục nào khớp filter'}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', textTransform: 'uppercase',
                  fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span>Tên hóa chất / Kho</span>
                  <span style={{ textAlign: 'right' }}>Tồn</span>
                  <span style={{ textAlign: 'right' }}>Khả dụng</span>
                  <span>HSD</span>
                </div>
                {applyUtilFilters(chemStock).slice(0, 50).map((s) => (
                  <div key={s.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                    fontSize: 12.5, alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{s.itemName}</div>
                      <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)' }}>{s.warehouseName}</div>
                    </div>
                    <span className="mono" style={{ textAlign: 'right' }}>{s.quantity} {s.unit}</span>
                    <span className="mono" style={{
                      textAlign: 'right',
                      color: s.availableQuantity <= 0 ? 'var(--s-crit)' : s.availableQuantity < 10 ? 'var(--s-warn)' : 'inherit',
                      fontWeight: s.availableQuantity <= 0 ? 700 : 400,
                    }}>
                      {s.availableQuantity}
                    </span>
                    <span style={{ fontSize: 'var(--fs-xs)', color: s.daysToExpiry !== undefined && s.daysToExpiry < 30 ? 'var(--s-warn)' : 'var(--t-2)' }}>
                      {s.expiryDate ? dayjs(s.expiryDate).format('MM/YYYY') : '—'}
                      {s.daysToExpiry !== undefined && s.daysToExpiry < 30 && (
                        <span style={{ marginLeft: 'var(--space-4)', color: 'var(--s-crit)', fontSize: 'var(--fs-xxs)' }}>({s.daysToExpiry}d)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Section 3: Định mức hóa chất theo XN ── */}
          <div className="rec-section" style={{ marginTop: 'var(--space-16)' }}>
            <h5><TermIcon name="activity" size={11} /> ĐỊNH MỨC HÓA CHẤT THEO XN (LIS Catalog)</h5>
            {chemicals.length === 0 ? (
              <div style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)', padding: '8px 0' }}>Chưa khai báo định mức hóa chất</div>
            ) : (
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                <div style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                  fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', textTransform: 'uppercase',
                  fontWeight: 600, padding: '4px 0', borderBottom: '1px solid var(--line-soft)',
                }}>
                  <span>Dịch vụ XN</span>
                  <span>Hóa chất</span>
                  <span style={{ textAlign: 'right' }}>Định mức/lần</span>
                  <span>Loại</span>
                </div>
                {chemicals.filter(c => c.isActive).slice(0, 50).map((c) => (
                  <div key={c.id} style={{
                    display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr',
                    padding: '6px 0', borderBottom: '1px solid var(--line-soft)',
                    fontSize: 12.5, alignItems: 'center',
                  }}>
                    <span>{c.serviceName || '—'}</span>
                    <span>
                      <span style={{ fontWeight: 500 }}>{c.supplyName || '—'}</span>
                      {c.supplyCode && <span style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', marginLeft: 'var(--space-4)' }}>({c.supplyCode})</span>}
                    </span>
                    <span className="mono" style={{ textAlign: 'right' }}>{c.quantityPerTest} {c.unit || ''}</span>
                    <span style={{
                      fontSize: 'var(--fs-xs)',
                      color: c.objectType === 'ThuPhi' ? 'var(--s-warn)' : 'var(--t-2)',
                    }}>
                      {c.objectType === 'ThuPhi' ? 'Thu phí' : 'Hao phí'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </DrawerShell>
  );
};
