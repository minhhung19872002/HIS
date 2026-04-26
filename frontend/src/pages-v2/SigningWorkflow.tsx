import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getPendingRequests, getSubmittedRequests, getHistory, getSigningStats } from '../api/signingWorkflow';
import type { SigningRequestItem, SigningWorkflowStats } from '../api/signingWorkflow';
import TermIcon from '../layouts/terminal/Icon';

const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ ký', cls: 'warn' },
  1: { text: 'Đã duyệt', cls: 'ok' },
  2: { text: 'Từ chối', cls: 'crit' },
  3: { text: 'Hủy', cls: 'ghost' },
};

type Tab = 'pending' | 'submitted' | 'history';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pending', label: 'Chờ tôi ký' },
  { key: 'submitted', label: 'Tôi đã gửi' },
  { key: 'history', label: 'Lịch sử' },
];

const SigningWorkflowV2: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('pending');
  const [items, setItems] = useState<SigningRequestItem[]>([]);
  const [stats, setStats] = useState<SigningWorkflowStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<SigningRequestItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const fn = tab === 'pending' ? getPendingRequests : tab === 'submitted' ? getSubmittedRequests : getHistory;
      const list = await fn();
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
      const s = await getSigningStats().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const local = useMemo(() => ({
    total: items.length,
    pending: items.filter((i) => i.status === 0).length,
    approved: items.filter((i) => i.status === 1).length,
    rejected: items.filter((i) => i.status === 2).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Luồng ký số</span>
          <div className="actions">
            <div className="rx-seg" style={{ display: 'flex', gap: 4 }}>
              {TABS.map((t) => (
                <div key={t.key} className={'rx-seg-i ' + (tab === t.key ? 'on' : '')} onClick={() => setTab(t.key)}>{t.label}</div>
              ))}
            </div>
            <button className="btn primary" type="button" onClick={load}><TermIcon name="refresh" size={13} />Làm mới</button>
            <button className="btn sm" type="button" onClick={() => navigate('/signing-workflow')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có yêu cầu</div> : (
              <table className="tbl">
                <thead><tr><th>Loại</th><th>Tiêu đề</th><th>BN</th><th>Người gửi</th><th>Người ký</th><th>Ngày tạo</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((r) => {
                    const st = STATUS_LABEL[r.status] || { text: r.statusText, cls: 'ghost' };
                    return (
                      <tr key={r.id} className={sel?.id === r.id ? 'sel' : ''} onClick={() => setSel(r)} style={{ cursor: 'pointer' }}>
                        <td className="muted">{r.documentType}</td>
                        <td style={{ fontWeight: 500 }}>{r.documentTitle}</td>
                        <td className="muted">{r.patientName || '—'}</td>
                        <td className="muted">{r.submittedByName}</td>
                        <td className="muted">{r.assignedToName}</td>
                        <td className="mono">{dayjs(r.createdAt).format('DD/MM HH:mm')}</td>
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
              <Stat label="Trên trang" value={local.total} />
              <Stat label="Chờ ký" value={local.pending} warn />
              <Stat label="Đã duyệt" value={local.approved} ok />
              <Stat label="Từ chối" value={local.rejected} crit />
              {stats?.todaySubmitted !== undefined && <Stat label="Hôm nay gửi" value={stats.todaySubmitted} cy />}
              {stats?.todayApproved !== undefined && <Stat label="Hôm nay ký" value={stats.todayApproved} ok />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết yêu cầu</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn yêu cầu</div> : (
              <div className="stack-sm">
                <Field label="Loại" value={sel.documentType} />
                <Field label="Tiêu đề" value={sel.documentTitle} />
                {sel.patientName && <Field label="BN" value={sel.patientName} />}
                {sel.departmentName && <Field label="Khoa" value={sel.departmentName} />}
                <Field label="Người gửi" value={sel.submittedByName} />
                <Field label="Người ký" value={sel.assignedToName} />
                <Field label="Ngày tạo" value={<span className="mono">{dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm')}</span>} />
                {sel.signedAt && <Field label="Ngày ký" value={<span className="mono">{dayjs(sel.signedAt).format('DD/MM/YYYY HH:mm')}</span>} />}
                <Field label="Trạng thái" value={<span className={'chip ' + (STATUS_LABEL[sel.status]?.cls || 'ghost')}>{STATUS_LABEL[sel.status]?.text || '—'}</span>} />
                {sel.rejectReason && <Field label="Lý do từ chối" value={<span style={{ color: 'var(--s-crit)' }}>{sel.rejectReason}</span>} />}
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

export default SigningWorkflowV2;
