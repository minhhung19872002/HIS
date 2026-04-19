import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getSurgerySchedule } from '../api/surgery';
import type { SurgeryScheduleDto, SurgeryScheduleItemDto } from '../api/surgery';
import TermIcon from '../layouts/terminal/Icon';

const statusChip = (s: number, name: string) => {
  const cls = s === 0 || s === 1 ? 'warn' : s === 2 ? 'cy' : s === 3 ? 'info' : s === 4 ? 'ok' : s === 5 ? 'crit' : 'ghost';
  return <span className={`chip ${cls}`}>{name}</span>;
};

const SurgeryV2: React.FC = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [schedules, setSchedules] = useState<SurgeryScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filterOR, setFilterOR] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getSurgerySchedule(date);
        setSchedules(res.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [date]);

  const allItems = useMemo<Array<SurgeryScheduleItemDto & { operatingRoomName: string }>>(() => {
    const flat: Array<SurgeryScheduleItemDto & { operatingRoomName: string }> = [];
    schedules.forEach((s) => s.surgeries.forEach((i) => flat.push({ ...i, operatingRoomName: s.operatingRoomName })));
    return flat;
  }, [schedules]);

  const filteredItems = useMemo(() => {
    if (!filterOR) return allItems;
    return allItems.filter((i) => i.operatingRoomName === filterOR);
  }, [allItems, filterOR]);

  const stats = useMemo(() => ({
    total: allItems.length,
    scheduled: allItems.filter((x) => x.status === 0 || x.status === 1).length,
    inProgress: allItems.filter((x) => x.status === 2 || x.status === 3).length,
    done: allItems.filter((x) => x.status === 4).length,
    cancelled: allItems.filter((x) => x.status === 5).length,
  }), [allItems]);

  const selected = allItems.find((i) => i.surgeryId === selectedId);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Lịch phẫu thuật · <b>{filteredItems.length}</b></span>
          <span className="sub">{dayjs(date).format('dddd, DD/MM/YYYY')}</span>
          <div className="actions">
            <input type="date" className="input" style={{ width: 150 }} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className="select" style={{ width: 160 }} value={filterOR} onChange={(e) => setFilterOR(e.target.value)}>
              <option value="">Tất cả phòng mổ</option>
              {schedules.map((s) => <option key={s.operatingRoomId} value={s.operatingRoomName}>{s.operatingRoomName}</option>)}
            </select>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : filteredItems.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có lịch phẫu thuật</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Giờ</th>
                  <th>Phòng mổ</th>
                  <th>Mã PT</th>
                  <th>Bệnh nhân</th>
                  <th>Loại phẫu thuật</th>
                  <th>Phẫu thuật viên</th>
                  <th>Gây mê</th>
                  <th className="num">Dự kiến (p)</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((s) => (
                  <tr key={s.surgeryId} className={s.surgeryId === selectedId ? 'sel' : ''} onClick={() => setSelectedId(s.surgeryId)} style={{ cursor: 'pointer' }}>
                    <td className="mono">{s.scheduledTime ? dayjs(s.scheduledTime).format('HH:mm') : '—'}</td>
                    <td>{s.operatingRoomName}</td>
                    <td className="mono">{s.surgeryCode}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.patientName}</div>
                      <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{s.patientCode}</div>
                    </td>
                    <td className="muted" style={{ maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.surgeryServiceName}</td>
                    <td className="muted">{s.surgeonName}</td>
                    <td className="muted">{s.anesthesiologistName || '—'}</td>
                    <td className="num">{s.estimatedDuration}</td>
                    <td>{statusChip(s.status, s.statusName)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan ngày</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <StatCell label="Tổng ca" value={stats.total} />
              <StatCell label="Đã lên lịch" value={stats.scheduled} warn />
              <StatCell label="Đang mổ" value={stats.inProgress} cy />
              <StatCell label="Hoàn tất" value={stats.done} ok />
              <StatCell label="Huỷ" value={stats.cancelled} crit />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><span className="title">Theo phòng mổ</span></div>
          <div className="panel-body pad">
            {schedules.length === 0 ? <div className="ph">Chưa có lịch</div> :
              schedules.map((s) => (
                <div key={s.operatingRoomId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line-hair)', fontSize: 13 }}>
                  <span>{s.operatingRoomName}</span>
                  <span className="mono" style={{ color: 'var(--t-2)' }}>{s.surgeries.length} ca</span>
                </div>
              ))
            }
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết ca</span>
            <span className="sub">{selected ? selected.surgeryCode : 'Chọn một ca'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn ca phẫu thuật để xem chi tiết</div> : (
              <div className="stack-sm">
                <Field label="Bệnh nhân" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="Phòng mổ" value={selected.operatingRoomName} />
                <Field label="Phẫu thuật viên" value={selected.surgeonName} />
                <Field label="Gây mê" value={selected.anesthesiologistName || '—'} />
                <Field label="Giờ dự kiến" value={<span className="mono">{selected.scheduledTime ? dayjs(selected.scheduledTime).format('HH:mm DD/MM') : '—'}</span>} />
                <Field label="Thời gian ước tính" value={`${selected.estimatedDuration} phút`} />
                <Field label="Phẫu thuật" value={selected.surgeryServiceName} />
                <Field label="Trạng thái" value={statusChip(selected.status, selected.statusName)} />
                <div className="row" style={{ gap: 8, marginTop: 6 }}>
                  <button className="btn primary sm" type="button" onClick={() => navigate('/surgery')}>
                    <TermIcon name="stethoscope" size={12} />Bắt đầu
                  </button>
                  <button className="btn sm" type="button" onClick={() => navigate('/surgery')}>
                    Hoãn/Huỷ
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

const StatCell: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: crit ? 'var(--s-crit)' : warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default SurgeryV2;
