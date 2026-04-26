import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getPathologyRequests, getPathologyStatistics } from '../api/pathology';
import type { PathologyRequest, PathologyStats } from '../api/pathology';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: 'warn' | 'cy' | 'mag' | 'ok' | 'ghost' }> = {
  0: { text: 'Chờ mô tả', cls: 'warn' },
  1: { text: 'Đại thể', cls: 'cy' },
  2: { text: 'Vi thể', cls: 'mag' },
  3: { text: 'Hoàn tất', cls: 'cy' },
  4: { text: 'Đã duyệt', cls: 'ok' },
};

const SPECIMEN_LABEL: Record<string, string> = {
  biopsy: 'Sinh thiết',
  cytology: 'Tế bào học',
  pap: 'PAP',
  frozenSection: 'Cắt lạnh',
};

const PathologyV2: React.FC = () => {
  const [items, setItems] = useState<PathologyRequest[]>([]);
  const [stats, setStats] = useState<PathologyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);
  const [specimenFilter, setSpecimenFilter] = useState<string>('');
  const [selected, setSelected] = useState<PathologyRequest | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [reqs, st] = await Promise.all([
        getPathologyRequests({
          keyword: keyword || undefined,
          status: statusFilter,
          specimenType: specimenFilter || undefined,
        }),
        getPathologyStatistics().catch(() => null),
      ]);
      setItems(reqs);
      setStats(st);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const localStats = useMemo(() => ({
    total: items.length,
    pending: items.filter((r) => r.status <= 1).length,
    inProgress: items.filter((r) => r.status === 2).length,
    completed: items.filter((r) => r.status >= 3).length,
    urgent: items.filter((r) => r.priority === 'urgent').length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Giải phẫu bệnh · <b>{items.length}</b></span>
          <div className="actions">
            <select className="select" style={{ width: 130 }} value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">Tất cả TT</option>
              <option value="0">Chờ mô tả</option>
              <option value="1">Đại thể</option>
              <option value="2">Vi thể</option>
              <option value="3">Hoàn tất</option>
              <option value="4">Đã duyệt</option>
            </select>
            <select className="select" style={{ width: 130 }} value={specimenFilter} onChange={(e) => setSpecimenFilter(e.target.value)}>
              <option value="">Tất cả loại</option>
              <option value="biopsy">Sinh thiết</option>
              <option value="cytology">Tế bào học</option>
              <option value="pap">PAP</option>
              <option value="frozenSection">Cắt lạnh</option>
            </select>
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / mã yêu cầu..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có yêu cầu GPB</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã YC</th>
                  <th>Bệnh nhân</th>
                  <th>Ngày YC</th>
                  <th>Loại</th>
                  <th>Vị trí lấy</th>
                  <th>Chẩn đoán LS</th>
                  <th>BS YC</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const st = STATUS_LABEL[r.status] || { text: '—', cls: 'ghost' as const };
                  return (
                    <tr key={r.id} className={selected?.id === r.id ? 'sel' : ''} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{r.requestCode}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.patientName}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div>
                      </td>
                      <td className="mono">{dayjs(r.requestDate).format('DD/MM HH:mm')}</td>
                      <td className="muted">{SPECIMEN_LABEL[r.specimenType] || r.specimenType}</td>
                      <td className="muted">{r.specimenSite}</td>
                      <td className="muted" style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.clinicalDiagnosis}</td>
                      <td className="muted">{r.requestingDoctor}</td>
                      <td>
                        <span className={`chip ${st.cls}`}>{st.text}</span>
                        {r.priority === 'urgent' && <span className="chip crit" style={{ marginLeft: 4 }}>KHẨN</span>}
                      </td>
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
              <Stat label="Tổng YC" value={localStats.total} />
              <Stat label="Khẩn" value={localStats.urgent} crit />
              <Stat label="Chờ mô tả" value={localStats.pending} warn />
              <Stat label="Vi thể" value={localStats.inProgress} cy />
              <Stat label="Hoàn tất" value={localStats.completed} ok />
              {stats && <Stat label="TAT TB (ngày)" value={stats.avgTurnaroundDays} />}
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết YC</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn YC'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn yêu cầu GPB</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{selected.requestCode}</span>} />
                <Field label="BN" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Ngày YC" value={<span className="mono">{dayjs(selected.requestDate).format('DD/MM/YYYY HH:mm')}</span>} />
                <Field label="Loại bệnh phẩm" value={SPECIMEN_LABEL[selected.specimenType] || selected.specimenType} />
                <Field label="Vị trí lấy" value={selected.specimenSite} />
                <Field label="Chẩn đoán LS" value={selected.clinicalDiagnosis} />
                <Field label="BS yêu cầu" value={selected.requestingDoctor} />
                {selected.departmentName && <Field label="Khoa" value={selected.departmentName} />}
                <Field label="Ưu tiên" value={selected.priority === 'urgent' ? <span style={{ color: 'var(--s-crit)' }}>KHẨN</span> : 'Thường'} />
                <Field label="Trạng thái" value={(() => { const st = STATUS_LABEL[selected.status] || { text: '—', cls: 'ghost' as const }; return <span className={`chip ${st.cls}`}>{st.text}</span>; })()} />
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

export default PathologyV2;
