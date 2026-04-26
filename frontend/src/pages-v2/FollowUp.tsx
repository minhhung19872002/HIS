import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { searchAppointments, getOverdueFollowUps, updateAppointmentStatus } from '../api/examination';
import type { AppointmentListDto } from '../api/examination';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: 'warn' | 'cy' | 'ok' | 'ghost' | 'crit' }> = {
  0: { text: 'Đặt lịch', cls: 'warn' },
  1: { text: 'Xác nhận', cls: 'cy' },
  2: { text: 'Đã đến', cls: 'ok' },
  3: { text: 'Vắng', cls: 'crit' },
  4: { text: 'Hủy', cls: 'ghost' },
};

const FollowUpV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [items, setItems] = useState<AppointmentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'today' | 'upcoming' | 'overdue' | 'all'>('today');
  const [keyword, setKeyword] = useState('');
  const [selected, setSelected] = useState<AppointmentListDto | null>(null);

  const today = dayjs().format('YYYY-MM-DD');

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'overdue') {
        const r = await getOverdueFollowUps(7);
        setItems(Array.isArray(r.data) ? r.data : []);
      } else {
        const fromDate = tab === 'today' ? today
          : tab === 'upcoming' ? today
          : dayjs().subtract(60, 'day').format('YYYY-MM-DD');
        const toDate = tab === 'today' ? today
          : tab === 'upcoming' ? dayjs().add(30, 'day').format('YYYY-MM-DD')
          : dayjs().add(60, 'day').format('YYYY-MM-DD');
        const r = await searchAppointments({ fromDate, toDate, keyword: keyword || undefined, page: 1, pageSize: 200 });
        setItems(Array.isArray(r.data?.items) ? r.data.items : []);
      }
      setSelected(null);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const stats = useMemo(() => ({
    total: items.length,
    todayCount: items.filter((a) => dayjs(a.appointmentDate).isSame(dayjs(), 'day')).length,
    overdue: items.filter((a) => a.daysOverdue > 0).length,
    confirmed: items.filter((a) => a.status === 1 || a.status === 2).length,
  }), [items]);

  const updateStatus = async (id: string, status: number) => {
    try {
      await updateAppointmentStatus(id, status);
      message.success('Đã cập nhật trạng thái');
      load();
    } catch {
      message.error('Không thể cập nhật');
    }
  };

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Tái khám / lịch hẹn · <b>{items.length}</b></span>
          <div className="actions">
            <div className="rx-seg" style={{ display: 'flex', gap: 4 }}>
              {(['today', 'upcoming', 'overdue', 'all'] as const).map((k) => {
                const label = { today: 'Hôm nay', upcoming: 'Sắp tới', overdue: 'Quá hạn', all: 'Tất cả' }[k];
                return (
                  <div key={k} className={'rx-seg-i ' + (tab === k ? 'on' : '')} onClick={() => setTab(k)}>{label}</div>
                );
              })}
            </div>
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có lịch hẹn</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Bệnh nhân</th>
                  <th>SĐT</th>
                  <th>Ngày hẹn</th>
                  <th>Khoa / Phòng</th>
                  <th>BS</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const st = STATUS_LABEL[a.status] || { text: a.statusName, cls: 'ghost' as const };
                  const overdue = a.daysOverdue > 0;
                  return (
                    <tr key={a.id} className={selected?.id === a.id ? 'sel' : ''} onClick={() => setSelected(a)} style={{ cursor: 'pointer' }}>
                      <td className="mono">{a.appointmentCode}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{a.patientName}</div>
                        <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{a.patientCode}</div>
                      </td>
                      <td className="muted">{a.phoneNumber || '—'}</td>
                      <td className="mono" style={{ color: overdue ? 'var(--s-crit)' : undefined }}>
                        {dayjs(a.appointmentDate).format('DD/MM/YYYY')}
                        {overdue && <small style={{ display: 'block', fontSize: 10 }}>+{a.daysOverdue}d trễ</small>}
                      </td>
                      <td className="muted">{a.departmentName || '—'} {a.roomName && `· ${a.roomName}`}</td>
                      <td className="muted">{a.doctorName || '—'}</td>
                      <td className="muted">{a.appointmentTypeName}</td>
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
              <Stat label="Tổng" value={stats.total} />
              <Stat label="Hôm nay" value={stats.todayCount} cy />
              <Stat label="Quá hạn" value={stats.overdue} crit />
              <Stat label="Đã xác nhận" value={stats.confirmed} ok />
            </div>
          </div>
        </div>

        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h">
            <span className="title">Chi tiết hẹn</span>
            <span className="sub">{selected ? selected.patientName : 'Chọn lịch hẹn'}</span>
          </div>
          <div className="panel-body pad">
            {!selected ? <div className="ph">Chọn một lịch hẹn</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{selected.appointmentCode}</span>} />
                <Field label="BN" value={`${selected.patientName} · ${selected.patientCode}`} />
                <Field label="SĐT" value={selected.phoneNumber || '—'} />
                <Field label="Ngày hẹn" value={<span className="mono">{dayjs(selected.appointmentDate).format('DD/MM/YYYY')} {selected.appointmentTime}</span>} />
                <Field label="Khoa/Phòng" value={`${selected.departmentName || '—'} · ${selected.roomName || '—'}`} />
                <Field label="BS phụ trách" value={selected.doctorName || '—'} />
                <Field label="Loại" value={selected.appointmentTypeName} />
                {selected.reason && <Field label="Lý do" value={selected.reason} />}
                {selected.previousDiagnosis && <Field label="CĐ trước" value={selected.previousDiagnosis} />}
                {selected.daysOverdue > 0 && <Field label="Trễ" value={<span style={{ color: 'var(--s-crit)' }}>{selected.daysOverdue} ngày</span>} />}
                <div className="row" style={{ gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                  <button className="btn primary sm" type="button" onClick={() => updateStatus(selected.id, 2)}>Đã đến</button>
                  <button className="btn sm" type="button" onClick={() => updateStatus(selected.id, 3)}>Vắng</button>
                  <button className="btn sm" type="button" onClick={() => updateStatus(selected.id, 4)}>Hủy</button>
                </div>
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

export default FollowUpV2;
