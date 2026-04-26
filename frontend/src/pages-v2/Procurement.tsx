import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getProcurementRequests } from '../api/warehouse';
import type { ProcurementRequestDto } from '../api/warehouse';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Mới', cls: 'warn' },
  1: { text: 'Đã duyệt', cls: 'cy' },
  2: { text: 'Đã mua', cls: 'ok' },
  3: { text: 'Hủy', cls: 'crit' },
};

const ProcurementV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProcurementRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<ProcurementRequestDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getProcurementRequests(undefined, undefined,
        dayjs().subtract(60, 'day').format('YYYY-MM-DD'),
        dayjs().format('YYYY-MM-DD'));
      const list = Array.isArray(r.data) ? r.data : [];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    total: items.length,
    new: items.filter((r) => r.status === 0).length,
    approved: items.filter((r) => r.status === 1).length,
    purchased: items.filter((r) => r.status === 2).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Dự trù mua sắm · <b>{items.length}</b></span>
          <div className="actions">
            <button className="btn primary" type="button" onClick={load}><TermIcon name="refresh" size={13} />Làm mới</button>
            <button className="btn sm" type="button" onClick={() => navigate('/procurement')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có dự trù</div> : (
              <table className="tbl">
                <thead><tr><th>Mã</th><th>Kho</th><th>Mô tả</th><th>Số mục</th><th>Người tạo</th><th>Ngày</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((r) => {
                    const st = STATUS_LABEL[r.status] || { text: r.statusName, cls: 'ghost' };
                    return (
                      <tr key={r.id} className={sel?.id === r.id ? 'sel' : ''} onClick={() => setSel(r)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{r.requestCode}</td>
                        <td className="muted">{r.warehouseName}</td>
                        <td className="muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description || '—'}</td>
                        <td className="mono">{r.items?.length || 0}</td>
                        <td className="muted">{r.createdByName}</td>
                        <td className="mono">{dayjs(r.requestDate).format('DD/MM/YYYY')}</td>
                        <td><span className={`chip ${st.cls}`}>{st.text}</span></td>
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
              <Stat label="Tổng" value={stats.total} />
              <Stat label="Chờ duyệt" value={stats.new} warn />
              <Stat label="Đã duyệt" value={stats.approved} cy />
              <Stat label="Đã mua" value={stats.purchased} ok />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết dự trù</span><span className="sub">{sel?.requestCode || 'Chọn'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn dự trù</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.requestCode}</span>} />
                <Field label="Kho" value={sel.warehouseName} />
                <Field label="Mô tả" value={sel.description || '—'} />
                <Field label="Người tạo" value={sel.createdByName} />
                <Field label="Ngày yêu cầu" value={<span className="mono">{dayjs(sel.requestDate).format('DD/MM/YYYY')}</span>} />
                <Field label="Trạng thái" value={<span className={'chip ' + (STATUS_LABEL[sel.status]?.cls || 'ghost')}>{sel.statusName}</span>} />
                <div>
                  <div className="label">Danh sách mặt hàng ({sel.items?.length || 0})</div>
                  <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.7 }}>
                    {(sel.items || []).slice(0, 8).map((it) => (
                      <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', padding: '4px 0' }}>
                        <span>{it.itemName}</span>
                        <span className="mono">{it.requestedQuantity} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default ProcurementV2;
