import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getAppointments } from '../api/telemedicine';
import type { TelemedicineAppointmentDto } from '../api/telemedicine';
import TermIcon from '../layouts/terminal/Icon';

const TYPE_LABEL: Record<number, string> = { 1: 'Khám lần đầu', 2: 'Tái khám', 3: 'Tham khảo ý kiến' };

const TelemedicineV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<TelemedicineAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TelemedicineAppointmentDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getAppointments({
        fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
        toDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
        keyword,
      } as Parameters<typeof getAppointments>[0]);
      const list = (r.data?.items || (Array.isArray(r.data) ? r.data : [])) as TelemedicineAppointmentDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    total: items.length,
    today: items.filter((a) => dayjs(a.scheduledDate).isSame(dayjs(), 'day')).length,
    upcoming: items.filter((a) => dayjs(a.scheduledDate).isAfter(dayjs(), 'day')).length,
    inSession: items.filter((a) => a.status === 2).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Khám từ xa · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / BS..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/telemedicine')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có cuộc hẹn</div> : (
              <table className="tbl">
                <thead><tr><th>Mã</th><th>BN</th><th>BS</th><th>Khoa</th><th>Loại</th><th>Lịch</th><th>Phí</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a.id} className={sel?.id === a.id ? 'sel' : ''} onClick={() => setSel(a)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{a.appointmentCode}</td>
                      <td><div style={{ fontWeight: 500 }}>{a.patientName}</div><div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{a.patientCode}</div></td>
                      <td className="muted">{a.doctorName}</td>
                      <td className="muted">{a.departmentName}</td>
                      <td className="muted">{TYPE_LABEL[a.appointmentType] || a.appointmentTypeName}</td>
                      <td className="mono">{dayjs(a.scheduledDate).format('DD/MM')} {a.scheduledTime}</td>
                      <td className="mono">{a.fee.toLocaleString('vi-VN')}đ</td>
                      <td><span className="chip">{a.statusName}</span></td>
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
              <Stat label="Tổng" value={stats.total} />
              <Stat label="Hôm nay" value={stats.today} cy />
              <Stat label="Sắp tới" value={stats.upcoming} ok />
              <Stat label="Đang khám" value={stats.inSession} warn />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết hẹn</span><span className="sub">{sel?.patientName || 'Chọn'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn cuộc hẹn</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.appointmentCode}</span>} />
                <Field label="BN" value={`${sel.patientName} · ${sel.patientCode}`} />
                <Field label="SĐT" value={sel.phone} />
                {sel.email && <Field label="Email" value={sel.email} />}
                <Field label="BS" value={`${sel.doctorName}${sel.doctorSpecialty ? ' · ' + sel.doctorSpecialty : ''}`} />
                <Field label="Khoa" value={sel.departmentName} />
                <Field label="Loại" value={TYPE_LABEL[sel.appointmentType] || sel.appointmentTypeName} />
                <Field label="Lịch" value={<span className="mono">{dayjs(sel.scheduledDate).format('DD/MM/YYYY')} {sel.scheduledTime} ({sel.durationMinutes}p)</span>} />
                {sel.chiefComplaint && <Field label="Lý do" value={sel.chiefComplaint} />}
                <Field label="Phí" value={<span className="mono">{sel.fee.toLocaleString('vi-VN')}đ</span>} />
                <Field label="Thanh toán" value={sel.paymentStatusName} />
                {sel.videoRoomUrl && <Field label="Phòng họp" value={<a href={sel.videoRoomUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--a-cy)' }}>Mở video</a>} />}
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

export default TelemedicineV2;
