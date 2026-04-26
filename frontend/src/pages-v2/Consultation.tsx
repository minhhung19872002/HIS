import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import risApi from '../api/ris';
import type { ConsultationSessionDto } from '../api/ris';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: 'warn' | 'cy' | 'ok' | 'ghost' | 'crit' }> = {
  0: { text: 'Lên lịch', cls: 'warn' },
  1: { text: 'Đang họp', cls: 'cy' },
  2: { text: 'Hoàn tất', cls: 'ok' },
  3: { text: 'Hủy', cls: 'crit' },
};

const ConsultationV2: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ConsultationSessionDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selectedId, setSelected] = useState<string | null>(null);
  const [keyword, setKeyword]   = useState('');
  const [fromDate, setFromDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [toDate, setToDate]     = useState(dayjs().format('YYYY-MM-DD'));
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined);

  const load = async () => {
    setLoading(true);
    try {
      const r = await risApi.searchConsultations({
        fromDate, toDate, keyword: keyword || undefined,
        status: statusFilter, page: 1, pageSize: 100,
      });
      const items = Array.isArray(r.data?.items) ? r.data.items : [];
      setSessions(items);
      if (items.length > 0 && !selectedId) setSelected(items[0].id);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    total: sessions.length,
    scheduled: sessions.filter((s) => s.status === 0).length,
    inProgress: sessions.filter((s) => s.status === 1).length,
    done: sessions.filter((s) => s.status === 2).length,
  }), [sessions]);

  const selected = sessions.find((s) => s.id === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Phiên hội chẩn · <b>{sessions.length}</b></span>
          <div className="actions">
            <input type="date" className="input" style={{ width: 140 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="input" style={{ width: 140 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <select className="select" style={{ width: 120 }} value={statusFilter ?? ''} onChange={(e) => setStatusFilter(e.target.value === '' ? undefined : Number(e.target.value))}>
              <option value="">Tất cả</option>
              <option value="0">Lên lịch</option>
              <option value="1">Đang họp</option>
              <option value="2">Hoàn tất</option>
            </select>
            <input className="input" style={{ width: 200 }} placeholder="Tìm theo tiêu đề..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : sessions.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có phiên hội chẩn</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã phiên</th>
                  <th>Tiêu đề</th>
                  <th>Lịch</th>
                  <th>Người tạo</th>
                  <th className="num">Ca</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => {
                  const st = STATUS_LABEL[s.status] || { text: s.statusName, cls: 'ghost' as const };
                  return (
                    <tr key={s.id} className={s.id === selectedId ? 'sel' : ''} onClick={() => setSelected(s.id)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{s.sessionCode}</td>
                      <td style={{ fontWeight: 500 }}>{s.title}</td>
                      <td className="mono">{dayjs(s.scheduledTime).format('HH:mm DD/MM')}</td>
                      <td className="muted">{s.createdByUserName}</td>
                      <td className="num">{s.caseCount}</td>
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
              <Stat label="Tổng phiên" value={stats.total} />
              <Stat label="Lên lịch" value={stats.scheduled} warn />
              <Stat label="Đang họp" value={stats.inProgress} cy />
              <Stat label="Hoàn tất" value={stats.done} ok />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết phiên</span>
            <span className="sub">{selected ? selected.title : 'Chọn phiên'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn phiên hội chẩn để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Mã phiên" value={<span className="mono">{selected.sessionCode}</span>} />
                <Field label="Tiêu đề" value={selected.title} />
                <Field label="Mô tả" value={selected.description || '—'} />
                <Field label="Lịch" value={<span className="mono">{dayjs(selected.scheduledTime).format('HH:mm DD/MM/YYYY')}</span>} />
                {selected.startTime && <Field label="Bắt đầu" value={<span className="mono">{dayjs(selected.startTime).format('HH:mm')}</span>} />}
                {selected.endTime && <Field label="Kết thúc" value={<span className="mono">{dayjs(selected.endTime).format('HH:mm')}</span>} />}
                <Field label="Người tạo" value={selected.createdByUserName} />
                <Field label="Số ca" value={String(selected.caseCount)} />
                {selected.meetingUrl && (
                  <Field label="Link họp" value={<a href={selected.meetingUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--a-cy)' }}>Mở liên kết</a>} />
                )}
                <Field label="Trạng thái" value={(() => { const st = STATUS_LABEL[selected.status] || { text: selected.statusName, cls: 'ghost' as const }; return <span className={`chip ${st.cls}`}>{st.text}</span>; })()} />
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button" onClick={() => navigate('/consultation')}>
                    <TermIcon name="layers" size={12} />Mở chi tiết
                  </button>
                </div>
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

export default ConsultationV2;
