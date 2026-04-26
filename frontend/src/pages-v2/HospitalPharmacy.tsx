import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getRetailSales, getPharmacyDashboard } from '../api/hospitalPharmacy';
import type { RetailSaleDto, PharmacyDashboardDto } from '../api/hospitalPharmacy';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' },
  1: { text: 'Đã bán', cls: 'ok' },
  2: { text: 'Hủy', cls: 'crit' },
};
const PAYMENT_LABEL: Record<number, string> = { 0: 'Tiền mặt', 1: 'Thẻ', 2: 'Chuyển khoản' };

const HospitalPharmacyV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<RetailSaleDto[]>([]);
  const [dash, setDash] = useState<PharmacyDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<RetailSaleDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.allSettled([
        getRetailSales({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          keyword,
        }),
        getPharmacyDashboard(),
      ]);
      if (r1.status === 'fulfilled') {
        const list = (r1.value?.items || (Array.isArray(r1.value) ? r1.value : [])) as RetailSaleDto[];
        setItems(list);
        if (list.length > 0 && !sel) setSel(list[0]);
      }
      if (r2.status === 'fulfilled') setDash(r2.value);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: items.length,
    completed: items.filter((s) => s.status === 1).length,
    revenue: items.filter((s) => s.status === 1).reduce((sum, s) => sum + s.finalAmount, 0),
    cancelled: items.filter((s) => s.status === 2).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Nhà thuốc bán lẻ · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm khách / mã đơn..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/hospital-pharmacy')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có hóa đơn</div> : (
              <table className="tbl">
                <thead><tr><th>Mã đơn</th><th>Khách</th><th>SĐT</th><th>Phương thức</th><th>Tổng</th><th>Đã giảm</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
                <tbody>
                  {items.map((s) => {
                    const st = STATUS_LABEL[s.status] || { text: '—', cls: 'ghost' };
                    return (
                      <tr key={s.id} className={sel?.id === s.id ? 'sel' : ''} onClick={() => setSel(s)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{s.saleCode}</td>
                        <td style={{ fontWeight: 500 }}>{s.customerName || 'Khách lẻ'}</td>
                        <td className="muted">{s.customerPhone || '—'}</td>
                        <td className="muted">{PAYMENT_LABEL[s.paymentMethod] || '—'}</td>
                        <td className="mono">{s.finalAmount.toLocaleString('vi-VN')}đ</td>
                        <td className="mono" style={{ color: 'var(--s-ok)' }}>{s.discountAmount > 0 ? `-${s.discountAmount.toLocaleString('vi-VN')}đ` : '—'}</td>
                        <td><span className={`chip ${st.cls}`}>{st.text}</span></td>
                        <td className="mono">{dayjs(s.saleDate).format('DD/MM HH:mm')}</td>
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
              <Stat label="Hóa đơn 7d" value={String(local.total)} />
              <Stat label="Đã bán" value={String(local.completed)} ok />
              <Stat label="Doanh thu" value={`${Math.round(local.revenue / 1_000_000)}M₫`} cy />
              <Stat label="Đã hủy" value={String(local.cancelled)} crit />
              {dash?.totalSalesToday !== undefined && <Stat label="Hôm nay" value={String(dash.totalSalesToday)} ok />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết đơn</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn đơn</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.saleCode}</span>} />
                <Field label="Khách" value={sel.customerName || 'Khách lẻ'} />
                {sel.customerPhone && <Field label="SĐT" value={sel.customerPhone} />}
                <Field label="Số mặt hàng" value={String(sel.items?.length || 0)} />
                <Field label="Tổng" value={<span className="mono">{sel.totalAmount.toLocaleString('vi-VN')}đ</span>} />
                {sel.discountAmount > 0 && <Field label="Giảm" value={<span className="mono" style={{ color: 'var(--s-ok)' }}>-{sel.discountAmount.toLocaleString('vi-VN')}đ</span>} />}
                <Field label="Cuối cùng" value={<span className="mono">{sel.finalAmount.toLocaleString('vi-VN')}đ</span>} />
                <Field label="Phương thức" value={PAYMENT_LABEL[sel.paymentMethod]} />
                <Field label="Người bán" value={sel.createdByName || '—'} />
                <Field label="Ngày" value={<span className="mono">{dayjs(sel.saleDate).format('DD/MM/YYYY HH:mm')}</span>} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default HospitalPharmacyV2;
