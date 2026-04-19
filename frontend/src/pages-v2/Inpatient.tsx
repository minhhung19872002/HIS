import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as ipdApi from '../api/inpatient';
import type { InpatientListDto } from '../api/inpatient';
import TermIcon from '../layouts/terminal/Icon';

const statusChip = (status: number, name: string) => {
  const cls = status === 0 ? 'cy' : status === 1 ? 'info' : status === 2 ? 'warn' : status === 3 ? 'ok' : 'ghost';
  return <span className={`chip ${cls}`}>{name}</span>;
};

const InpatientV2: React.FC = () => {
  const [rows, setRows] = useState<InpatientListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await ipdApi.getInpatientList({ page: 1, pageSize: 200 });
        setRows(res.data?.items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter !== undefined) r = r.filter((x) => x.status === statusFilter);
    const kw = keyword.trim().toLowerCase();
    if (kw) r = r.filter((x) => x.patientName?.toLowerCase().includes(kw) || x.patientCode?.toLowerCase().includes(kw));
    return r;
  }, [rows, keyword, statusFilter]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.status === 0 || r.status === 1).length,
      pendingDischarge: rows.filter((r) => r.status === 2).length,
      discharged: rows.filter((r) => r.status === 3).length,
      flaggedDebt: rows.filter((r) => r.isDebtWarning).length,
    }),
    [rows],
  );

  const selected = rows.find((r) => r.admissionId === selectedId);

  const byDepartment = useMemo(() => {
    const map: Record<string, number> = {};
    rows.forEach((r) => {
      const d = r.departmentName || '—';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Bệnh nhân nội trú · <b>{filtered.length}</b></span>
          <div className="actions">
            <select className="select" style={{ width: 140 }} value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Tất cả trạng thái</option>
              <option value="0">Đang điều trị</option>
              <option value="1">Đang quan sát</option>
              <option value="2">Chờ xuất viện</option>
              <option value="3">Đã xuất viện</option>
            </select>
            <input className="input" style={{ width: 240 }} placeholder="Tìm tên / mã BN…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button"><TermIcon name="plus" size={13} />Nhập viện</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? (
            <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
          ) : filtered.length === 0 ? (
            <div className="ph" style={{ margin: 14 }}>Không có bệnh nhân khớp điều kiện</div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hồ sơ</th>
                  <th>Bệnh nhân</th>
                  <th>Tuổi</th>
                  <th>Khoa / Phòng</th>
                  <th>Giường</th>
                  <th className="num">Ngày</th>
                  <th>Chẩn đoán chính</th>
                  <th>BS điều trị</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.admissionId} className={r.admissionId === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.admissionId)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{r.medicalRecordCode}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                    </td>
                    <td className="num">{r.age ?? '—'}</td>
                    <td className="muted">{r.departmentName} · {r.roomName}</td>
                    <td className="mono">{r.bedName || '—'}</td>
                    <td className="num">{r.daysOfStay}</td>
                    <td className="muted" style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.mainDiagnosis || '—'}</td>
                    <td className="muted">{r.attendingDoctorName || '—'}</td>
                    <td>
                      {statusChip(r.status, r.statusName)}
                      {r.isDebtWarning && <span className="chip warn" style={{ marginLeft: 4 }}>Nợ</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Thống kê nhanh</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng" value={stats.total} />
              <StatCell label="Đang điều trị" value={stats.active} cy />
              <StatCell label="Chờ xuất" value={stats.pendingDischarge} warn />
              <StatCell label="Đã xuất" value={stats.discharged} ok />
              <StatCell label="Cảnh báo nợ" value={stats.flaggedDebt} crit />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><span className="title">Phân bố theo khoa</span></div>
          <div className="panel-body pad">
            {byDepartment.slice(0, 8).map(([name, count]) => {
              const max = Math.max(1, byDepartment[0]?.[1] ?? 1);
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
            })}
            {byDepartment.length === 0 && <div className="ph">Chưa có dữ liệu</div>}
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn một dòng'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? (
              <div className="ph">Chọn bệnh nhân trong danh sách để xem chi tiết</div>
            ) : (
              <div className="stack-sm">
                <Field label="Hồ sơ" value={<span className="mono">{selected.medicalRecordCode}</span>} />
                <Field label="Nhập viện" value={<span className="mono">{dayjs(selected.admissionDate).format('HH:mm DD/MM/YYYY')} · {selected.daysOfStay} ngày</span>} />
                <Field label="Chẩn đoán" value={selected.mainDiagnosis || '—'} />
                <Field label="Khoa / Phòng / Giường" value={`${selected.departmentName} · ${selected.roomName} · ${selected.bedName || '—'}`} />
                {selected.insuranceNumber && (
                  <Field label="BHYT" value={<span className="mono">{selected.insuranceNumber}</span>} />
                )}
                {selected.totalDebt ? (
                  <Field label="Công nợ" value={<span style={{ color: 'var(--s-crit)' }}>{selected.totalDebt.toLocaleString('vi-VN')} đ</span>} />
                ) : null}
                <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {selected.hasPendingOrders && <span className="chip warn">Chờ y lệnh</span>}
                  {selected.hasPendingLabResults && <span className="chip info">Chờ kết quả CLS</span>}
                  {selected.hasUnclaimedMedicine && <span className="chip mag">Chưa lĩnh thuốc</span>}
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
  <div>
    <div className="label">{label}</div>
    <div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div>
  </div>
);

export default InpatientV2;
