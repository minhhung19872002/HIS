import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getChronicRecords, getChronicStatistics } from '../api/chronicDisease';
import type { ChronicRecordDto, ChronicStatisticsDto } from '../api/chronicDisease';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đang điều trị', cls: 'cy' },
  1: { text: 'Cần tái khám', cls: 'warn' },
  2: { text: 'Đã đóng', cls: 'ok' },
  3: { text: 'Đã loại', cls: 'ghost' },
};

const ChronicDiseaseV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ChronicRecordDto[]>([]);
  const [stats, setStats] = useState<ChronicStatisticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<ChronicRecordDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getChronicRecords({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as ChronicRecordDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
      const s = await getChronicStatistics().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: items.length,
    needFollowUp: items.filter((r) => r.status === 1).length,
    overdue: items.filter((r) => r.nextFollowUpDate && dayjs(r.nextFollowUpDate).isBefore(dayjs(), 'day')).length,
    closed: items.filter((r) => r.status === 2 || r.status === 3).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Bệnh mạn tính · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / ICD..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/chronic-disease')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có hồ sơ</div> : (
              <table className="tbl">
                <thead><tr><th>BN</th><th>ICD</th><th>Tên bệnh</th><th>BS</th><th>Tái khám</th><th>Tần suất</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((i) => {
                    const st = STATUS_LABEL[i.status] || { text: '—', cls: 'ghost' };
                    const overdue = i.nextFollowUpDate && dayjs(i.nextFollowUpDate).isBefore(dayjs(), 'day');
                    return (
                      <tr key={i.id} className={sel?.id === i.id ? 'sel' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{i.patientName}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{i.patientCode}</div>
                        </td>
                        <td className="mono" style={{ color: 'var(--a-cy)' }}>{i.icdCode}</td>
                        <td className="muted">{i.icdName}</td>
                        <td className="muted">{i.doctorName || '—'}</td>
                        <td className="mono" style={{ color: overdue ? 'var(--s-crit)' : undefined }}>{i.nextFollowUpDate ? dayjs(i.nextFollowUpDate).format('DD/MM/YYYY') : '—'}</td>
                        <td className="mono">{i.followUpIntervalDays}d</td>
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
              <Stat label="Tổng" value={local.total} />
              <Stat label="Cần tái khám" value={local.needFollowUp} warn />
              <Stat label="Quá hạn" value={local.overdue} crit />
              <Stat label="Đã đóng" value={local.closed} ok />
              {stats && <Stat label="Mới tháng này" value={stats.newThisMonth} cy />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết HS</span><span className="sub">{sel?.patientName || 'Chọn HS'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn hồ sơ</div> : (
              <div className="stack-sm">
                <Field label="BN" value={`${sel.patientName} · ${sel.patientCode}`} />
                <Field label="SĐT" value={sel.phoneNumber || '—'} />
                <Field label="ICD" value={<><span className="mono" style={{ color: 'var(--a-cy)' }}>{sel.icdCode}</span> {sel.icdName}</>} />
                <Field label="Ngày chẩn đoán" value={dayjs(sel.diagnosisDate).format('DD/MM/YYYY')} />
                <Field label="BS phụ trách" value={sel.doctorName || '—'} />
                <Field label="Khoa" value={sel.departmentName || '—'} />
                <Field label="Chu kỳ tái khám" value={`${sel.followUpIntervalDays} ngày`} />
                <Field label="Tái khám tiếp theo" value={sel.nextFollowUpDate ? <span className="mono">{dayjs(sel.nextFollowUpDate).format('DD/MM/YYYY')}</span> : '—'} />
                {sel.notes && <Field label="Ghi chú" value={sel.notes} />}
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
    <div style={{ fontSize: 22, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default ChronicDiseaseV2;
