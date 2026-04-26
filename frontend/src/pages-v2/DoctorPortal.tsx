import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { searchExaminations } from '../api/examination';
import type { ExaminationDto } from '../api/examination';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ khám', cls: 'warn' },
  1: { text: 'Đang khám', cls: 'cy' },
  2: { text: 'Chờ CLS', cls: 'warn' },
  3: { text: 'Chờ kết luận', cls: 'cy' },
  4: { text: 'Hoàn tất', cls: 'ok' },
};

const DoctorPortalV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<ExaminationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<ExaminationDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchExaminations({
        keyword: keyword || '',
        fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
        status: '',
        pageIndex: 1, pageSize: 100,
      });
      const list = (r.data?.items || []) as ExaminationDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    today: items.filter((e) => dayjs(e.examinationDate).isSame(dayjs(), 'day')).length,
    waiting: items.filter((e) => e.status === 0).length,
    inProgress: items.filter((e) => e.status === 1).length,
    done: items.filter((e) => e.status === 4).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Cổng bác sĩ · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/doctor-portal')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có ca khám</div> : (
              <table className="tbl">
                <thead><tr><th>BN</th><th>Phòng</th><th>BS</th><th>Chẩn đoán</th><th>Giờ khám</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((e) => {
                    const st = STATUS_LABEL[e.status] || { text: '—', cls: 'ghost' };
                    return (
                      <tr key={e.id} className={sel?.id === e.id ? 'sel' : ''} onClick={() => setSel(e)} style={{ cursor: 'pointer' }}>
                        <td><div style={{ fontWeight: 500 }}>{e.patientName}</div><div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{e.patientCode}</div></td>
                        <td className="muted">{e.roomName || '—'}</td>
                        <td className="muted">{e.doctorName || '—'}</td>
                        <td className="muted" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {e.diagnosisCode && <span className="mono" style={{ color: 'var(--a-cy)', marginRight: 6 }}>{e.diagnosisCode}</span>}
                          {e.diagnosisName || '—'}
                        </td>
                        <td className="mono">{dayjs(e.examinationDate).format('DD/MM HH:mm')}</td>
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
              <Stat label="Hôm nay" value={stats.today} cy />
              <Stat label="Chờ khám" value={stats.waiting} warn />
              <Stat label="Đang khám" value={stats.inProgress} cy />
              <Stat label="Hoàn tất" value={stats.done} ok />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết khám</span><span className="sub">{sel?.patientName || 'Chọn'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn ca</div> : (
              <div className="stack-sm">
                <Field label="BN" value={`${sel.patientName} · ${sel.patientCode}`} />
                <Field label="Giờ khám" value={<span className="mono">{dayjs(sel.examinationDate).format('DD/MM/YYYY HH:mm')}</span>} />
                <Field label="Phòng" value={sel.roomName || '—'} />
                <Field label="BS" value={sel.doctorName || '—'} />
                <Field label="STT" value={String(sel.queueNumber || '—')} />
                {sel.diagnosisCode && <Field label="ICD" value={<span className="mono">{sel.diagnosisCode}</span>} />}
                <Field label="Chẩn đoán" value={sel.diagnosisName || '—'} />
                <Field label="Trạng thái" value={<span className={'chip ' + (STATUS_LABEL[sel.status]?.cls || 'ghost')}>{STATUS_LABEL[sel.status]?.text || '—'}</span>} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean }> = ({ label, value, warn, cy, ok }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default DoctorPortalV2;
