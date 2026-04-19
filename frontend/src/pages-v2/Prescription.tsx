import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import TermIcon from '../layouts/terminal/Icon';

const PrescriptionV2: React.FC = () => {
  const [rows, setRows] = useState<ExaminationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      // Examinations in progress or awaiting conclusion → typical prescription queue
      const res = await searchExaminations({
        keyword: keyword || '',
        fromDate: dayjs().format('YYYY-MM-DD'),
        toDate: dayjs().format('YYYY-MM-DD'),
        status: '',
        pageIndex: 1, pageSize: 100,
      });
      const items = (res.data?.items || []).filter((e) => e.status === 1 || e.status === 3 || e.status === 4);
      setRows(items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return rows;
    return rows.filter((x) =>
      x.patientName?.toLowerCase().includes(kw) ||
      x.patientCode?.toLowerCase().includes(kw) ||
      x.diagnosisName?.toLowerCase().includes(kw) ||
      x.diagnosisCode?.toLowerCase().includes(kw),
    );
  }, [rows, keyword]);

  const stats = useMemo(() => ({
    total: rows.length,
    inExam: rows.filter((x) => x.status === 1).length,
    pendingConclusion: rows.filter((x) => x.status === 3).length,
    completed: rows.filter((x) => x.status === 4).length,
  }), [rows]);

  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Bệnh nhân cần kê đơn · <b>{filtered.length}</b></span>
          <span className="sub">{dayjs().format('DD/MM/YYYY')}</span>
          <div className="actions">
            <input className="input" style={{ width: 260 }} placeholder="Tên / Mã BN / Chẩn đoán…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tải lại</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filtered.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có bệnh nhân cần kê đơn</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã BN</th>
                  <th>Bệnh nhân</th>
                  <th>STT</th>
                  <th>Phòng khám</th>
                  <th>Bác sĩ</th>
                  <th>Chẩn đoán</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const cls = r.status === 1 ? 'cy' : r.status === 3 ? 'mag' : 'ok';
                  return (
                    <tr key={r.id} className={r.id === selectedId ? 'sel' : ''} onClick={() => setSelectedId(r.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{r.patientCode}</td>
                      <td style={{ fontWeight: 500 }}>{r.patientName}</td>
                      <td className="mono num">{r.queueNumber || '—'}</td>
                      <td className="muted">{r.roomName || '—'}</td>
                      <td className="muted">{r.doctorName || '—'}</td>
                      <td className="muted" style={{ maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {r.diagnosisCode && <span className="mono" style={{ color: 'var(--a-cy)', marginRight: 6 }}>{r.diagnosisCode}</span>}
                        {r.diagnosisName || '—'}
                      </td>
                      <td><span className={`chip ${cls}`}>{r.statusName}</span></td>
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
              <StatCell label="Tổng BN" value={stats.total} />
              <StatCell label="Đang khám" value={stats.inExam} cy />
              <StatCell label="Chờ kết luận" value={stats.pendingConclusion} warn />
              <StatCell label="Hoàn tất" value={stats.completed} ok />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn một bệnh nhân'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn bệnh nhân để mở kê đơn</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Phòng khám" value={selected.roomName || '—'} />
                <Field label="Bác sĩ" value={selected.doctorName || '—'} />
                <Field label="STT" value={selected.queueNumber?.toString() || '—'} />
                <Field label="Thời gian khám" value={<span className="mono">{dayjs(selected.examinationDate).format('HH:mm DD/MM')}</span>} />
                {selected.diagnosisCode && <Field label="Mã ICD" value={<span className="mono">{selected.diagnosisCode}</span>} />}
                <Field label="Chẩn đoán" value={selected.diagnosisName || '—'} />
                <div className="row" style={{ gap: 8, marginTop: 8 }}>
                  <button className="btn primary sm" type="button"><TermIcon name="plus" size={12} />Kê đơn mới</button>
                  <button className="btn sm" type="button">Sao đơn trước</button>
                  <button className="btn sm" type="button">Mẫu</button>
                </div>
                <div className="hline" style={{ margin: '10px 0' }} />
                <div className="ph" style={{ padding: 20 }}>
                  Kê đơn chi tiết: mở trong layout cũ để dùng đầy đủ chức năng (DDI check, tra thuốc, ký số).
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

export default PrescriptionV2;
