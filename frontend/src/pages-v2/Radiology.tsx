import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWaitingList } from '../api/ris';
import type { RadiologyWaitingListDto } from '../api/ris';
import TermIcon from '../layouts/terminal/Icon';

const statusChip = (s: string) => {
  const v = (s || '').toLowerCase();
  if (v.includes('chờ') || v === 'waiting') return <span className="chip warn">Chờ chụp</span>;
  if (v.includes('đang') || v === 'in-progress' || v === 'inprogress') return <span className="chip cy">Đang chụp</span>;
  if (v.includes('hoàn') || v === 'completed') return <span className="chip info">Đã chụp</span>;
  if (v.includes('ký') || v === 'reported' || v === 'signed') return <span className="chip ok">Đã ký</span>;
  return <span className="chip ghost">{s || '—'}</span>;
};

const priorityChip = (p: string) => {
  const v = (p || '').toUpperCase();
  if (v.includes('STAT') || v.includes('CẤP')) return <span className="chip crit">STAT</span>;
  if (v.includes('ƯU TIÊN') || v.includes('KHẨN')) return <span className="chip warn">Ưu tiên</span>;
  return <span className="muted">Thường</span>;
};

const RadiologyV2: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<RadiologyWaitingListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [modality, setModality] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await getWaitingList(today, undefined, undefined);
        setRows(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const modalities = useMemo(() => Array.from(new Set(rows.map((r) => r.serviceTypeName).filter(Boolean))), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (modality) r = r.filter((x) => x.serviceTypeName === modality);
    const kw = keyword.trim().toLowerCase();
    if (kw) r = r.filter((x) => x.patientName?.toLowerCase().includes(kw) || x.orderCode?.toLowerCase().includes(kw) || x.patientCode?.toLowerCase().includes(kw));
    return r;
  }, [rows, keyword, modality]);

  const stats = useMemo(() => {
    const grouped: Record<string, number> = {};
    rows.forEach((r) => { grouped[r.serviceTypeName] = (grouped[r.serviceTypeName] || 0) + 1; });
    return { total: rows.length, groups: grouped };
  }, [rows]);

  const selected = rows.find((r) => r.orderId === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Worklist CĐHA · <b>{filtered.length}</b></span>
          <div className="actions">
            <select className="select" style={{ width: 160 }} value={modality} onChange={(e) => setModality(e.target.value)}>
              <option value="">Tất cả modality</option>
              {modalities.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <input className="input" style={{ width: 260 }} placeholder="Tìm tên / mã phiếu…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filtered.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có phiếu khớp điều kiện</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th className="num">STT</th>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Tuổi</th>
                  <th>Dịch vụ</th>
                  <th>Phòng</th>
                  <th>BS chỉ định</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.orderId} className={r.orderId === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.orderId)} style={{ cursor: 'pointer' }}>
                    <td className="num mono">{r.queueNumber || '—'}</td>
                    <td className="mono">{r.orderCode}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                    </td>
                    <td className="num">{r.age || '—'}</td>
                    <td className="muted">{r.serviceName}</td>
                    <td className="muted">{r.roomName || '—'}</td>
                    <td className="muted">{r.orderDoctorName || '—'}</td>
                    <td>{priorityChip(r.priority)}</td>
                    <td>{statusChip(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Theo modality</span></div>
          <div className="panel-body pad">
            {Object.keys(stats.groups).length === 0 ? <div className="ph">Chưa có phiếu hôm nay</div> :
              Object.entries(stats.groups).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => {
                const max = Math.max(1, ...Object.values(stats.groups));
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={name} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t-1)' }}>
                      <span>{name}</span>
                      <span className="mono" style={{ color: 'var(--t-2)' }}>{count}</span>
                    </div>
                    <div style={{ marginTop: 4, height: 5, background: 'var(--d-3)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--a-cy)' }} />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết phiếu</span>
            <span className="sub">{selected ? selected.orderCode : 'Chọn một phiếu'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn phiếu CĐHA để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Tuổi / Giới" value={`${selected.age || '—'} · ${selected.gender || '—'}`} />
                <Field label="Dịch vụ" value={selected.serviceName} />
                <Field label="Modality" value={selected.serviceTypeName} />
                <Field label="Phòng / Máy" value={selected.roomName} />
                <Field label="BS chỉ định" value={selected.orderDoctorName} />
                <Field label="Khoa chỉ định" value={selected.departmentName} />
                <Field label="Thời gian chỉ định" value={<span className="mono">{selected.orderTime}</span>} />
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button" onClick={() => navigate('/radiology')}>
                    <TermIcon name="plus" size={12} />Gọi BN vào
                  </button>
                  <button className="btn sm" type="button" onClick={() => navigate('/radiology/viewer')}>Xem DICOM</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default RadiologyV2;
