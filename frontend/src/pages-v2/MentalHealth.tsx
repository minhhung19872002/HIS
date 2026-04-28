import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { searchCases, getStats } from '../api/mentalHealth';
import type { MentalHealthCase, MentalHealthStats } from '../api/mentalHealth';
import TermIcon from '../layouts/terminal/Icon';

const TYPE_LABEL: Record<string, string> = {
  schizophrenia: 'Tâm thần phân liệt',
  depression: 'Trầm cảm',
  anxiety: 'Lo âu',
  bipolar: 'RL lưỡng cực',
  ptsd: 'PTSD',
  substance: 'Lệ thuộc chất',
};
const SEVERITY: Record<string, { text: string; cls: string }> = {
  mild: { text: 'Nhẹ', cls: 'ok' },
  moderate: { text: 'TB', cls: 'warn' },
  severe: { text: 'Nặng', cls: 'crit' },
};
const STATUS_LABEL: Record<number, string> = { 0: 'Đang điều trị', 1: 'Ổn định', 2: 'Thuyên giảm', 3: 'Đã xuất viện' };

const MentalHealthV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MentalHealthCase[]>([]);
  const [stats, setStats] = useState<MentalHealthStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<MentalHealthCase | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await searchCases({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as MentalHealthCase[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
      const s = await getStats().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: items.length,
    severe: items.filter((c) => c.severity === 'severe').length,
    overdue: items.filter((c) => c.nextFollowUpDate && dayjs(c.nextFollowUpDate).isBefore(dayjs(), 'day')).length,
    poorAdherence: items.filter((c) => c.adherenceLevel === 'poor').length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Sức khỏe tâm thần · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / mã ca..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/mental-health')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có ca</div> : (
              <table className="tbl">
                <thead><tr><th>Mã ca</th><th>BN</th><th>Loại</th><th>Mức độ</th><th>BS</th><th>Tái khám</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((c) => {
                    const sev = SEVERITY[c.severity] || { text: '—', cls: 'ghost' };
                    const overdue = c.nextFollowUpDate && dayjs(c.nextFollowUpDate).isBefore(dayjs(), 'day');
                    return (
                      <tr key={c.id} className={sel?.id === c.id ? 'sel' : ''} onClick={() => setSel(c)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{c.caseCode}</td>
                        <td><div style={{ fontWeight: 500 }}>{c.patientName}</div><div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{c.patientCode}</div></td>
                        <td className="muted">{TYPE_LABEL[c.caseType] || c.caseType}</td>
                        <td><span className={`chip ${sev.cls}`}>{sev.text}</span></td>
                        <td className="muted">{c.psychiatristName}</td>
                        <td className="mono" style={{ color: overdue ? 'var(--s-crit)' : undefined }}>{c.nextFollowUpDate ? dayjs(c.nextFollowUpDate).format('DD/MM/YYYY') : '—'}</td>
                        <td className="muted">{STATUS_LABEL[c.status] || '—'}</td>
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
              <Stat label="Tổng ca" value={local.total} />
              <Stat label="Nặng" value={local.severe} crit />
              <Stat label="Quá hạn TK" value={local.overdue} warn />
              <Stat label="Adh. kém" value={local.poorAdherence} crit />
              {stats && <Stat label="Đánh giá tháng" value={stats.assessmentsThisMonth} cy />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết ca</span><span className="sub">{sel?.patientName || 'Chọn ca'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn ca</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.caseCode}</span>} />
                <Field label="BN" value={`${sel.patientName} · ${sel.patientCode}`} />
                <Field label="Loại" value={TYPE_LABEL[sel.caseType] || sel.caseType} />
                <Field label="Chẩn đoán" value={sel.diagnosis} />
                <Field label="Mức độ" value={SEVERITY[sel.severity]?.text || '—'} />
                <Field label="Bắt đầu" value={dayjs(sel.startDate).format('DD/MM/YYYY')} />
                <Field label="BS điều trị" value={sel.psychiatristName} />
                <Field label="Thuốc" value={sel.medications || '—'} />
                <Field label="Adherence" value={sel.adherenceLevel} />
                <Field label="Đánh giá cuối" value={sel.lastAssessmentDate ? dayjs(sel.lastAssessmentDate).format('DD/MM/YYYY') : '—'} />
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

export default MentalHealthV2;
