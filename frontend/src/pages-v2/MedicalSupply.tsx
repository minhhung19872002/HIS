import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getStock } from '../api/warehouse';
import type { StockDto } from '../api/warehouse';
import TermIcon from '../layouts/terminal/Icon';

const MedicalSupplyV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<StockDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<StockDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getStock({ keyword, itemType: 2, page: 1, pageSize: 200 } as Parameters<typeof getStock>[0]);
      const list = (r.data?.items || (Array.isArray(r.data) ? r.data : [])) as StockDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const stats = useMemo(() => ({
    total: items.length,
    inStock: items.filter((s) => s.quantity > 0).length,
    expiringSoon: items.filter((s) => s.expiryDate && dayjs(s.expiryDate).diff(today, 'day') < 90).length,
    totalValue: items.reduce((sum, s) => sum + (s.quantity * (s.unitPrice || 0)), 0),
  }), [items, today]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Vật tư y tế · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 220 }} placeholder="Tìm theo mã / tên..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/medical-supply')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có vật tư</div> : (
              <table className="tbl">
                <thead><tr><th>Mã</th><th>Tên</th><th>ĐVT</th><th>Lô</th><th>HSD</th><th>Tồn</th><th>Giá</th><th>Thành tiền</th></tr></thead>
                <tbody>
                  {items.map((s) => {
                    const expSoon = s.expiryDate && dayjs(s.expiryDate).diff(today, 'day') < 90;
                    return (
                      <tr key={s.id} className={sel?.id === s.id ? 'sel' : ''} onClick={() => setSel(s)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{s.itemCode}</td>
                        <td style={{ fontWeight: 500 }}>{s.itemName}</td>
                        <td className="muted">{s.unit}</td>
                        <td className="mono">{s.batchNumber || '—'}</td>
                        <td className="mono" style={{ color: expSoon ? 'var(--s-warn)' : undefined }}>{s.expiryDate ? dayjs(s.expiryDate).format('DD/MM/YYYY') : '—'}</td>
                        <td className="mono">{s.quantity}</td>
                        <td className="mono">{s.unitPrice?.toLocaleString('vi-VN') || '—'}</td>
                        <td className="mono">{(s.quantity * (s.unitPrice || 0)).toLocaleString('vi-VN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Tổng SKU" value={String(stats.total)} />
              <Stat label="Còn tồn" value={String(stats.inStock)} ok />
              <Stat label="Sắp hết hạn" value={String(stats.expiringSoon)} warn />
              <Stat label="Tổng giá trị" value={`${Math.round(stats.totalValue / 1_000_000)}M₫`} cy />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết VT</span><span className="sub">{sel?.itemName || 'Chọn'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn VT</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.itemCode}</span>} />
                <Field label="Tên" value={sel.itemName} />
                <Field label="ĐVT" value={sel.unit} />
                <Field label="Lô" value={sel.batchNumber ? <span className="mono">{sel.batchNumber}</span> : '—'} />
                <Field label="HSD" value={sel.expiryDate ? <span className="mono">{dayjs(sel.expiryDate).format('DD/MM/YYYY')}</span> : '—'} />
                <Field label="Tồn kho" value={<span className="mono">{sel.quantity} {sel.unit}</span>} />
                <Field label="Đã giữ chỗ" value={String(sel.reservedQuantity)} />
                <Field label="Đơn giá" value={sel.unitPrice ? <span className="mono">{sel.unitPrice.toLocaleString('vi-VN')}đ</span> : '—'} />
                <Field label="Thành tiền" value={<span className="mono">{(sel.quantity * (sel.unitPrice || 0)).toLocaleString('vi-VN')}đ</span>} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default MedicalSupplyV2;
