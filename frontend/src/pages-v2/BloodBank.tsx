import React, { useEffect, useMemo, useState } from 'react';
import { getBloodStock } from '../api/bloodBank';
import type { BloodStockDto } from '../api/bloodBank';
import TermIcon from '../layouts/terminal/Icon';

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'];
const RH = ['+', '-'];

const BloodBankV2: React.FC = () => {
  const [rows, setRows] = useState<BloodStockDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getBloodStock();
        setRows(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Aggregate by blood type + rh (across product types)
  const byType = useMemo(() => {
    const map: Record<string, { total: number; available: number; reserved: number; expiring: number; expired: number; volume: number }> = {};
    rows.forEach((s) => {
      const key = `${s.bloodType}${s.rhFactor}`;
      if (!map[key]) map[key] = { total: 0, available: 0, reserved: 0, expiring: 0, expired: 0, volume: 0 };
      map[key].total += s.totalBags;
      map[key].available += s.availableBags;
      map[key].reserved += s.reservedBags;
      map[key].expiring += s.expiringWithin7Days;
      map[key].expired += s.expiredBags;
      map[key].volume += s.totalVolume || 0;
    });
    return map;
  }, [rows]);

  const selectedRows = useMemo(() => {
    if (!selectedType) return rows;
    return rows.filter((r) => `${r.bloodType}${r.rhFactor}` === selectedType);
  }, [rows, selectedType]);

  const stats = useMemo(() => ({
    totalBags: rows.reduce((a, b) => a + b.totalBags, 0),
    available: rows.reduce((a, b) => a + b.availableBags, 0),
    reserved: rows.reduce((a, b) => a + b.reservedBags, 0),
    expiring: rows.reduce((a, b) => a + b.expiringWithin7Days, 0),
    expired: rows.reduce((a, b) => a + b.expiredBags, 0),
  }), [rows]);

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', minHeight: 0 }}>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <StatCell label="Tổng túi máu" value={stats.totalBags.toString()} />
        <StatCell label="Sẵn có" value={stats.available.toString()} ok />
        <StatCell label="Đã giữ chỗ" value={stats.reserved.toString()} cy />
        <StatCell label="Sắp hết hạn (7d)" value={stats.expiring.toString()} warn />
        <StatCell label="Đã hết hạn" value={stats.expired.toString()} crit />
      </div>

      {/* Blood type matrix */}
      <div className="panel">
        <div className="panel-h">
          <span className="title">Kho máu theo nhóm · <b>{Object.keys(byType).length}</b> nhóm có tồn</span>
          {selectedType && <span className="sub">Đang lọc: {selectedType}</span>}
          <div className="actions">
            {selectedType && <button className="btn sm" type="button" onClick={() => setSelectedType(null)}><TermIcon name="x" size={12} />Bỏ lọc</button>}
          </div>
        </div>
        <div className="panel-body pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {BLOOD_TYPES.map((bt) => RH.map((rh) => {
              const key = `${bt}${rh}`;
              const s = byType[key];
              const total = s?.total || 0;
              const avail = s?.available || 0;
              const pct = total > 0 ? Math.round((avail / total) * 100) : 0;
              const low = total > 0 && avail < 5;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedType(selectedType === key ? null : key)}
                  className="dashcard"
                  style={{
                    padding: 16, cursor: 'pointer',
                    borderColor: selectedType === key ? 'var(--a-cy)' : 'var(--line)',
                    background: selectedType === key ? 'var(--a-cy-bg)' : '#fff',
                    textAlign: 'left',
                  }}
                >
                  <div className="dashcard-eyebrow"><span className={`dot ${low ? 'crit' : 'cy'}`} /><span>NHÓM · {key}</span></div>
                  <div style={{ fontSize: 32, fontWeight: 600, color: low ? 'var(--s-crit)' : 'var(--t-0)', lineHeight: 1 }}>{total}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4 }}>
                    {avail} sẵn / {s?.reserved || 0} giữ / {s?.expiring || 0} sắp hết hạn
                  </div>
                  <div style={{ marginTop: 8, height: 4, background: 'var(--d-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: low ? 'var(--s-crit)' : 'var(--a-cy)' }} />
                  </div>
                </button>
              );
            }))}
          </div>
        </div>
      </div>

      {/* Detail table by product type */}
      <div className="panel" style={{ flex: 1, minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Chi tiết theo chế phẩm · <b>{selectedRows.length}</b></span>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : selectedRows.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có dữ liệu</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Nhóm</th>
                  <th>Chế phẩm</th>
                  <th className="num">Tổng túi</th>
                  <th className="num">Sẵn</th>
                  <th className="num">Giữ chỗ</th>
                  <th className="num">Sắp hết hạn</th>
                  <th className="num">Đã hết hạn</th>
                  <th className="num">Thể tích (mL)</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map((s, i) => (
                  <tr key={i}>
                    <td className="mono"><span className="chip cy">{s.bloodType}{s.rhFactor}</span></td>
                    <td>{s.productTypeName}</td>
                    <td className="num">{s.totalBags}</td>
                    <td className="num" style={{ color: 'var(--s-ok)' }}>{s.availableBags}</td>
                    <td className="num">{s.reservedBags}</td>
                    <td className="num" style={{ color: s.expiringWithin7Days > 0 ? 'var(--s-warn)' : undefined }}>{s.expiringWithin7Days}</td>
                    <td className="num" style={{ color: s.expiredBags > 0 ? 'var(--s-crit)' : undefined }}>{s.expiredBags}</td>
                    <td className="num">{(s.totalVolume || 0).toLocaleString('vi-VN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div className="dashcard" style={{ padding: 16 }}>
    <div className="dashcard-eyebrow"><span className={`dot ${crit ? 'crit' : warn ? 'warn' : ok ? 'ok' : cy ? 'cy' : ''}`} /><span>{label}</span></div>
    <div style={{ fontSize: 32, fontWeight: 600, color: crit ? 'var(--s-crit)' : warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)', lineHeight: 1 }}>{value}</div>
  </div>
);

export default BloodBankV2;
