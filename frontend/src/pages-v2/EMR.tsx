import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import TermIcon from '../layouts/terminal/Icon';

const statusLabel = (s: number) => {
  switch (s) {
    case 0: return { text: 'Chờ khám', cls: 'warn' as const };
    case 1: return { text: 'Đang khám', cls: 'cy' as const };
    case 2: return { text: 'Chờ CLS', cls: 'info' as const };
    case 3: return { text: 'Chờ kết luận', cls: 'mag' as const };
    case 4: return { text: 'Hoàn tất', cls: 'ok' as const };
    default: return { text: '—', cls: 'ghost' as const };
  }
};

const EMRV2: React.FC = () => {
  const [rows, setRows] = useState<ExaminationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await searchExaminations({
        keyword: keyword || '',
        fromDate, toDate,
        status: statusFilter || '',
        pageIndex: 1, pageSize: 100,
      });
      setRows(res.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const stats = useMemo(() => ({
    total: rows.length,
    waiting: rows.filter((x) => x.status === 0).length,
    inProgress: rows.filter((x) => x.status === 1).length,
    done: rows.filter((x) => x.status === 4).length,
  }), [rows]);

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Hồ sơ bệnh án · <b>{rows.length}</b></span>
          <div className="actions">
            <input type="date" className="input" style={{ width: 140 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="input" style={{ width: 140 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <select className="select" style={{ width: 140 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="0">Chờ khám</option>
              <option value="1">Đang khám</option>
              <option value="4">Hoàn tất</option>
            </select>
            <input className="input" style={{ width: 220 }} placeholder="Tên / Mã BN / Chẩn đoán…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : rows.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có hồ sơ khớp điều kiện</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Bệnh nhân</th>
                  <th>Ngày khám</th>
                  <th>Phòng</th>
                  <th>Bác sĩ</th>
                  <th>Chẩn đoán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = statusLabel(r.status);
                  return (
                    <tr key={r.id} className={r.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{r.patientCode}</td>
                      <td style={{ fontWeight: 500 }}>{r.patientName}</td>
                      <td className="mono">{dayjs(r.examinationDate).format('HH:mm DD/MM')}</td>
                      <td className="muted">{r.roomName || '—'}</td>
                      <td className="muted">{r.doctorName || '—'}</td>
                      <td className="muted" style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.diagnosisCode && <span className="mono" style={{ color: 'var(--a-cy)', marginRight: 6 }}>{r.diagnosisCode}</span>}
                        {r.diagnosisName || '—'}
                      </td>
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
              <StatCell label="Tổng HS" value={stats.total} />
              <StatCell label="Chờ khám" value={stats.waiting} warn />
              <StatCell label="Đang khám" value={stats.inProgress} cy />
              <StatCell label="Hoàn tất" value={stats.done} ok />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết hồ sơ</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn một hồ sơ'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn hồ sơ để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Mã BN" value={<span className="mono">{selected.patientCode}</span>} />
                <Field label="Họ tên" value={selected.patientName} />
                <Field label="Ngày khám" value={<span className="mono">{dayjs(selected.examinationDate).format('HH:mm DD/MM/YYYY')}</span>} />
                <Field label="Phòng khám" value={selected.roomName || '—'} />
                <Field label="Bác sĩ" value={selected.doctorName || '—'} />
                <Field label="STT" value={selected.queueNumber?.toString() || '—'} />
                {selected.diagnosisCode && <Field label="Mã ICD" value={<span className="mono">{selected.diagnosisCode}</span>} />}
                <Field label="Chẩn đoán" value={selected.diagnosisName || '—'} />
                <Field label="Trạng thái" value={(() => { const st = statusLabel(selected.status); return <span className={`chip ${st.cls}`}>{st.text}</span>; })()} />
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button"><TermIcon name="layers" size={12} />Xem chi tiết</button>
                  <button className="btn sm" type="button">In HS</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default EMRV2;
