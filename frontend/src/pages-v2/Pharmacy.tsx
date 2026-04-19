import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as pharmacyApi from '../api/pharmacy';
import type { PendingPrescription } from '../api/pharmacy';
import TermIcon from '../layouts/terminal/Icon';

const statusChip = (s: PendingPrescription['status']) => {
  switch (s) {
    case 'pending': return <span className="chip warn">Chờ tiếp nhận</span>;
    case 'accepted': return <span className="chip cy">Đã nhận</span>;
    case 'dispensing': return <span className="chip info">Đang cấp phát</span>;
    case 'completed': return <span className="chip ok">Hoàn tất</span>;
    case 'rejected': return <span className="chip crit">Từ chối</span>;
    default: return <span className="chip">{s}</span>;
  }
};

const PharmacyV2: React.FC = () => {
  const [rows, setRows] = useState<PendingPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [meds, setMeds] = useState<pharmacyApi.MedicationItem[] | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await pharmacyApi.getPendingPrescriptions();
        setRows(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) { setMeds(null); return; }
    pharmacyApi.getMedicationItems(selectedId).then((res) => setMeds(res.data || [])).catch(() => setMeds([]));
  }, [selectedId]);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter) r = r.filter((x) => x.status === statusFilter);
    const kw = keyword.trim().toLowerCase();
    if (kw) r = r.filter((x) => x.patientName?.toLowerCase().includes(kw) || x.prescriptionCode?.toLowerCase().includes(kw) || x.patientCode?.toLowerCase().includes(kw));
    return r;
  }, [rows, keyword, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    dispensing: rows.filter((r) => r.status === 'dispensing' || r.status === 'accepted').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    urgent: rows.filter((r) => r.priority === 'urgent').length,
  }), [rows]);

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Đơn thuốc nhà thuốc · <b>{filtered.length}</b></span>
          <div className="actions">
            <select className="select" style={{ width: 160 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ tiếp nhận</option>
              <option value="accepted">Đã nhận</option>
              <option value="dispensing">Đang cấp phát</option>
              <option value="completed">Hoàn tất</option>
              <option value="rejected">Từ chối</option>
            </select>
            <input className="input" style={{ width: 240 }} placeholder="Tìm tên / mã BN / mã đơn…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filtered.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có đơn khớp điều kiện</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Khoa</th>
                  <th className="num">Số thuốc</th>
                  <th className="num">Tổng tiền</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={r.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{r.prescriptionCode}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                    </td>
                    <td className="muted">{r.doctorName}</td>
                    <td className="muted">{r.department}</td>
                    <td className="num">{r.itemsCount}</td>
                    <td className="num">{r.totalAmount?.toLocaleString('vi-VN')} đ</td>
                    <td>{r.priority === 'urgent' ? <span className="chip crit">Khẩn</span> : <span className="muted">—</span>}</td>
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
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng đơn" value={stats.total} />
              <StatCell label="Chờ tiếp nhận" value={stats.pending} warn />
              <StatCell label="Đang cấp phát" value={stats.dispensing} cy />
              <StatCell label="Đã hoàn tất" value={stats.completed} ok />
              <StatCell label="Khẩn" value={stats.urgent} crit />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết đơn</span>
            <span className="sub">{selected ? selected.prescriptionCode : 'Chọn một đơn'}</span>
            {selected && <div className="actions"><button className="btn primary sm" type="button"><TermIcon name="plus" size={12} />Cấp phát</button></div>}
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn đơn thuốc để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Bác sĩ kê" value={selected.doctorName} />
                <Field label="Khoa" value={selected.department} />
                <Field label="Thời gian" value={<span className="mono">{dayjs(selected.createdDate).format('HH:mm DD/MM')}</span>} />
                <div>
                  <div className="label">Thuốc ({meds?.length ?? selected.itemsCount})</div>
                  {meds === null ? <div className="ph" style={{ padding: 8 }}>Đang tải…</div> :
                    meds.length === 0 ? <div className="muted">Không có chi tiết</div> :
                    <table className="tbl">
                      <tbody>
                        {meds.slice(0, 10).map((m) => (
                          <tr key={m.id}>
                            <td style={{ fontWeight: 500 }}>{m.medicationName}</td>
                            <td className="num">{m.quantity} {m.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: crit ? 'var(--s-crit)' : warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default PharmacyV2;
