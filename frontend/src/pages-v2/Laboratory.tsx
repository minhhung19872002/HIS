import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import * as labApi from '../api/laboratory';
import type { LabRequest } from '../api/laboratory';
import TermIcon from '../layouts/terminal/Icon';

const statusLabel = (s: number) => {
  switch (s) {
    case 0: return { text: 'Chờ lấy mẫu', cls: 'warn' as const };
    case 1: return { text: 'Đã lấy mẫu', cls: 'cy' as const };
    case 2: return { text: 'Đang chạy', cls: 'info' as const };
    case 3: return { text: 'Có kết quả', cls: 'mag' as const };
    case 4: return { text: 'Đã duyệt', cls: 'ok' as const };
    default: return { text: '—', cls: 'ghost' as const };
  }
};

const priorityChip = (p: number) => {
  if (p === 2) return <span className="chip crit">STAT</span>;
  if (p === 1) return <span className="chip warn">Ưu tiên</span>;
  return <span className="muted">Thường</span>;
};

const LaboratoryV2: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<LabRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await labApi.getLabRequests({});
        setRows(data || []);
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
    if (kw) r = r.filter((x) => x.patientName?.toLowerCase().includes(kw) || x.requestCode?.toLowerCase().includes(kw) || x.patientCode?.toLowerCase().includes(kw));
    return r;
  }, [rows, keyword, statusFilter]);

  const stats = useMemo(() => ({
    total: rows.length,
    pending: rows.filter((r) => r.status === 0).length,
    running: rows.filter((r) => r.status === 2).length,
    done: rows.filter((r) => r.status === 4).length,
    stat: rows.filter((r) => r.priority === 2).length,
  }), [rows]);

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Yêu cầu xét nghiệm · <b>{filtered.length}</b></span>
          <span className="sub">{dayjs().format('DD/MM/YYYY')}</span>
          <div className="actions">
            <select className="select" style={{ width: 150 }} value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Tất cả</option>
              <option value="0">Chờ lấy mẫu</option>
              <option value="1">Đã lấy mẫu</option>
              <option value="2">Đang chạy</option>
              <option value="3">Có kết quả</option>
              <option value="4">Đã duyệt</option>
            </select>
            <input className="input" style={{ width: 240 }} placeholder="Tìm tên / mã phiếu / mã BN…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filtered.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có phiếu khớp điều kiện</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã phiếu</th>
                  <th>Bệnh nhân</th>
                  <th>Xét nghiệm</th>
                  <th>Khoa</th>
                  <th>BS chỉ định</th>
                  <th>Mẫu</th>
                  <th>Ưu tiên</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const st = statusLabel(r.status);
                  return (
                    <tr key={r.id} className={r.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{r.requestCode}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                      </td>
                      <td className="muted" style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.requestedTests?.slice(0, 3).join(', ')}
                        {r.requestedTests && r.requestedTests.length > 3 && <span className="dim"> +{r.requestedTests.length - 3}</span>}
                      </td>
                      <td className="muted">{r.departmentName || '—'}</td>
                      <td className="muted">{r.doctorName || '—'}</td>
                      <td className="mono">{r.sampleBarcode || '—'}</td>
                      <td>{priorityChip(r.priority)}</td>
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
          <div className="panel-h"><span className="title">Tổng quan ca trực</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng phiếu" value={stats.total} />
              <StatCell label="Chờ lấy mẫu" value={stats.pending} warn />
              <StatCell label="Đang chạy" value={stats.running} cy />
              <StatCell label="Đã duyệt" value={stats.done} ok />
              <StatCell label="STAT" value={stats.stat} crit />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết phiếu</span>
            <span className="sub">{selected ? selected.requestCode : 'Chọn một phiếu'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn phiếu XN để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Bác sĩ chỉ định" value={selected.doctorName || '—'} />
                <Field label="Khoa" value={selected.departmentName || '—'} />
                <Field label="Chỉ định" value={<span className="mono">{dayjs(selected.requestDate).format('HH:mm DD/MM')}</span>} />
                <Field label="Loại mẫu" value={selected.sampleType || '—'} />
                <Field label="Mã mẫu" value={<span className="mono">{selected.sampleBarcode || '—'}</span>} />
                {selected.clinicalInfo && <Field label="Thông tin LS" value={selected.clinicalInfo} />}
                <div>
                  <div className="label">Danh mục XN ({selected.requestedTests?.length || 0})</div>
                  {selected.requestedTests?.length ? (
                    <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                      {selected.requestedTests.map((t) => <span key={t} className="chip">{t}</span>)}
                    </div>
                  ) : <div className="muted">—</div>}
                </div>
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button" onClick={() => navigate('/lab')}>
                    <TermIcon name="plus" size={12} />Nhập kết quả
                  </button>
                  <button className="btn sm" type="button" onClick={() => navigate('/lab')}>In phiếu</button>
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

export default LaboratoryV2;
