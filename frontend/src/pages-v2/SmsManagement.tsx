import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getSmsLogs, getSmsBalance, getSmsStats } from '../api/sms';
import type { SmsLogDto, SmsBalanceDto } from '../api/sms';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đã gửi', cls: 'ok' },
  1: { text: 'Lỗi', cls: 'crit' },
  2: { text: 'Dev mode', cls: 'ghost' },
};

const SmsManagementV2: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SmsLogDto[]>([]);
  const [balance, setBalance] = useState<SmsBalanceDto | null>(null);
  const [stats, setStats] = useState<{ totalSent?: number; totalFailed?: number; byType?: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<SmsLogDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.allSettled([
        getSmsLogs({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          keyword, pageIndex: 1, pageSize: 100,
        }),
        getSmsBalance(),
        getSmsStats(dayjs().subtract(30, 'day').format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD')),
      ]);
      if (r1.status === 'fulfilled') {
        const list = (r1.value.data?.items || (Array.isArray(r1.value.data) ? r1.value.data : [])) as SmsLogDto[];
        setLogs(list);
        if (list.length > 0 && !sel) setSel(list[0]);
      }
      if (r2.status === 'fulfilled') setBalance(r2.value.data);
      if (r3.status === 'fulfilled') setStats(r3.value.data as unknown as typeof stats);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: logs.length,
    sent: logs.filter((l) => l.status === 0).length,
    failed: logs.filter((l) => l.status === 1).length,
  }), [logs]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Quản lý SMS · <b>{logs.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm SĐT / nội dung..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/sms-management')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : logs.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có SMS</div> : (
              <table className="tbl">
                <thead><tr><th>Thời gian</th><th>SĐT</th><th>Loại</th><th>Nội dung</th><th>NCC</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {logs.map((l) => {
                    const st = STATUS_LABEL[l.status] || { text: '—', cls: 'ghost' };
                    return (
                      <tr key={l.id} className={sel?.id === l.id ? 'sel' : ''} onClick={() => setSel(l)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{dayjs(l.createdAt).format('DD/MM HH:mm')}</td>
                        <td className="mono">{l.phoneNumber}</td>
                        <td className="muted">{l.messageType}</td>
                        <td className="muted" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.message}</td>
                        <td className="muted">{l.provider}</td>
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
          <div className="panel-h"><span className="title">Số dư + thống kê</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Số dư" value={balance ? `${balance.balance.toLocaleString()} ${balance.currency || ''}` : '—'} ok />
              <Stat label="NCC" value={balance?.provider || '—'} cy />
              <Stat label="Đã gửi 7d" value={String(local.sent)} ok />
              <Stat label="Lỗi 7d" value={String(local.failed)} crit />
              {stats?.totalSent !== undefined && <Stat label="30 ngày gửi" value={String(stats.totalSent)} cy />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết SMS</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn SMS</div> : (
              <div className="stack-sm">
                <Field label="SĐT" value={<span className="mono">{sel.phoneNumber}</span>} />
                <Field label="Loại" value={sel.messageType} />
                <Field label="Nội dung" value={<div style={{ whiteSpace: 'pre-wrap' }}>{sel.message}</div>} />
                <Field label="NCC" value={sel.provider} />
                <Field label="Thời gian" value={<span className="mono">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm:ss')}</span>} />
                <Field label="Trạng thái" value={<span className={'chip ' + (STATUS_LABEL[sel.status]?.cls || 'ghost')}>{STATUS_LABEL[sel.status]?.text || '—'}</span>} />
                {sel.patientName && <Field label="BN liên quan" value={sel.patientName} />}
                {sel.errorMessage && <Field label="Lỗi" value={<span style={{ color: 'var(--s-crit)' }}>{sel.errorMessage}</span>} />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default SmsManagementV2;
