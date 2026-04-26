import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getEquipment } from '../api/equipment';
import type { EquipmentDto } from '../api/equipment';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  1: { text: 'Hoạt động', cls: 'ok' },
  2: { text: 'Bảo trì', cls: 'warn' },
  3: { text: 'Hỏng', cls: 'crit' },
  4: { text: 'Thanh lý', cls: 'ghost' },
};

const EquipmentV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<EquipmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<EquipmentDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getEquipment({ keyword, page: 1, pageSize: 100 } as Parameters<typeof getEquipment>[0]);
      const list = (r.data?.items || []) as EquipmentDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const today = dayjs();
  const stats = useMemo(() => ({
    total: items.length,
    operational: items.filter((i) => i.operationalStatus === 1).length,
    maint: items.filter((i) => i.operationalStatus === 2).length,
    expiringMaint: items.filter((i) => i.nextMaintenanceDate && dayjs(i.nextMaintenanceDate).diff(today, 'day') < 30).length,
  }), [items, today]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Trang thiết bị · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 220 }} placeholder="Tìm theo mã / tên / model..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/equipment')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có thiết bị</div> : (
              <table className="tbl">
                <thead><tr><th>Mã TB</th><th>Tên</th><th>Hãng / Model</th><th>Khoa</th><th>S/N</th><th>BD tiếp theo</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((i) => {
                    const st = STATUS_LABEL[i.operationalStatus] || { text: i.operationalStatusName, cls: 'ghost' };
                    const overdueMaint = i.nextMaintenanceDate && dayjs(i.nextMaintenanceDate).isBefore(today, 'day');
                    return (
                      <tr key={i.id} className={sel?.id === i.id ? 'sel' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{i.equipmentCode}</td>
                        <td style={{ fontWeight: 500 }}>{i.name}</td>
                        <td className="muted">{i.manufacturer} / {i.model}</td>
                        <td className="muted">{i.departmentName}</td>
                        <td className="mono">{i.serialNumber}</td>
                        <td className="mono" style={{ color: overdueMaint ? 'var(--s-crit)' : undefined }}>{i.nextMaintenanceDate ? dayjs(i.nextMaintenanceDate).format('DD/MM/YYYY') : '—'}</td>
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
              <Stat label="Tổng TB" value={stats.total} />
              <Stat label="Hoạt động" value={stats.operational} ok />
              <Stat label="Đang bảo trì" value={stats.maint} warn />
              <Stat label="BD trong 30d" value={stats.expiringMaint} cy />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết TB</span><span className="sub">{sel?.name || 'Chọn TB'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn thiết bị</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.equipmentCode}</span>} />
                <Field label="Tên" value={sel.name} />
                <Field label="Hãng / Model" value={`${sel.manufacturer} / ${sel.model}`} />
                <Field label="Serial" value={<span className="mono">{sel.serialNumber}</span>} />
                <Field label="Khoa" value={sel.departmentName} />
                <Field label="Phòng" value={sel.roomName || '—'} />
                <Field label="Risk class" value={sel.riskClassName || sel.riskClass} />
                <Field label="Mua" value={sel.purchaseDate ? dayjs(sel.purchaseDate).format('DD/MM/YYYY') : '—'} />
                <Field label="Hết bảo hành" value={sel.warrantyExpiry ? dayjs(sel.warrantyExpiry).format('DD/MM/YYYY') : '—'} />
                <Field label="BT lần cuối" value={sel.lastMaintenanceDate ? dayjs(sel.lastMaintenanceDate).format('DD/MM/YYYY') : '—'} />
                <Field label="BT tiếp theo" value={sel.nextMaintenanceDate ? <span className="mono">{dayjs(sel.nextMaintenanceDate).format('DD/MM/YYYY')}</span> : '—'} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default EquipmentV2;
