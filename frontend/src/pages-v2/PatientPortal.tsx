import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getMyAppointments, getAccount } from '../api/patientPortal';
import type { OnlineAppointmentDto, PatientAccountDto } from '../api/patientPortal';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  1: { text: 'Đã yêu cầu', cls: 'warn' },
  2: { text: 'Xác nhận', cls: 'cy' },
  3: { text: 'Đã đến', cls: 'ok' },
  4: { text: 'Hoàn thành', cls: 'ok' },
  5: { text: 'Đã hủy', cls: 'crit' },
  6: { text: 'Vắng', cls: 'crit' },
};

const PatientPortalV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<OnlineAppointmentDto[]>([]);
  const [account, setAccount] = useState<PatientAccountDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<OnlineAppointmentDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.allSettled([
        getMyAppointments(undefined,
          dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          dayjs().add(30, 'day').format('YYYY-MM-DD')),
        getAccount(),
      ]);
      if (r1.status === 'fulfilled') {
        const list = (Array.isArray(r1.value.data) ? r1.value.data : []) as OnlineAppointmentDto[];
        setItems(list);
        if (list.length > 0 && !sel) setSel(list[0]);
      }
      if (r2.status === 'fulfilled') setAccount(r2.value.data);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    total: items.length,
    upcoming: items.filter((a) => a.scheduledDate && dayjs(a.scheduledDate).isAfter(dayjs())).length,
    completed: items.filter((a) => a.status === 4).length,
    cancelled: items.filter((a) => a.status === 5 || a.status === 6).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Cổng bệnh nhân · <b>{items.length}</b></span>
          <div className="actions">
            <button className="btn primary" type="button" onClick={load}><TermIcon name="refresh" size={13} />Làm mới</button>
            <button className="btn sm" type="button" onClick={() => navigate('/patient-portal')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có cuộc hẹn online</div> : (
              <table className="tbl">
                <thead><tr><th>Mã</th><th>BN</th><th>Khoa</th><th>BS</th><th>Ngày</th><th>Loại</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((a) => {
                    const st = STATUS_LABEL[a.status] || { text: a.statusName, cls: 'ghost' };
                    return (
                      <tr key={a.id} className={sel?.id === a.id ? 'sel' : ''} onClick={() => setSel(a)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{a.appointmentCode}</td>
                        <td style={{ fontWeight: 500 }}>{a.patientName}</td>
                        <td className="muted">{a.departmentName}</td>
                        <td className="muted">{a.doctorName || '—'}</td>
                        <td className="mono">{a.scheduledDate ? dayjs(a.scheduledDate).format('DD/MM') : dayjs(a.preferredDate).format('DD/MM')} {a.scheduledTime || a.preferredTime}</td>
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
              <Stat label="Sắp tới" value={stats.upcoming} cy />
              <Stat label="Hoàn thành" value={stats.completed} ok />
              <Stat label="Đã hủy" value={stats.cancelled} crit />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Tài khoản</span></div>
          <div className="panel-body pad">
            {!account ? <div className="ph">Chưa có thông tin tài khoản</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{account.accountCode}</span>} />
                <Field label="Họ tên" value={account.fullName} />
                <Field label="SĐT" value={account.phone} />
                {account.email && <Field label="Email" value={account.email} />}
                <Field label="BN liên kết" value={account.patientCode || '—'} />
                <Field label="Đăng nhập gần nhất" value={account.lastLoginAt ? <span className="mono">{dayjs(account.lastLoginAt).format('DD/MM/YYYY HH:mm')}</span> : '—'} />
                <Field label="Số lần đăng nhập" value={String(account.loginCount)} />
                <Field label="Trạng thái" value={<span className="chip">{account.accountStatusName}</span>} />
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

export default PatientPortalV2;
