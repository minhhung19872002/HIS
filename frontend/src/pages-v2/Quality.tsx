import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getIncidents, getQualityIndicators } from '../api/quality';
import type { IncidentReport, QualityIndicator } from '../api/quality';
import TermIcon from '../layouts/terminal/Icon';

const SEVERITY_LABEL: Record<string, { text: string; cls: string }> = {
  Low: { text: 'Thấp', cls: 'ok' },
  Medium: { text: 'TB', cls: 'warn' },
  High: { text: 'Cao', cls: 'crit' },
  Critical: { text: 'Khẩn', cls: 'crit' },
};

const QualityV2: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'incidents' | 'indicators'>('incidents');
  const [incidents, setIncidents] = useState<IncidentReport[]>([]);
  const [indicators, setIndicators] = useState<QualityIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<IncidentReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'incidents') {
        const r = await getIncidents({ keyword, page: 1, pageSize: 100 } as Parameters<typeof getIncidents>[0]);
        const list = (r.data?.items || []) as IncidentReport[];
        setIncidents(list);
        if (list.length > 0 && !sel) setSel(list[0]);
      } else {
        const r = await getQualityIndicators();
        setIndicators(Array.isArray(r.data) ? r.data : []);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const stats = useMemo(() => ({
    total: incidents.length,
    critical: incidents.filter((i) => (i.severity as string) === 'Critical' || (i.severity as string) === 'High').length,
    open: incidents.filter((i) => (i.status as string) !== 'Closed').length,
    indicatorCount: indicators.length,
  }), [incidents, indicators]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Quản lý chất lượng</span>
          <div className="actions">
            <div className="rx-seg" style={{ display: 'flex', gap: 4 }}>
              <div className={'rx-seg-i ' + (tab === 'incidents' ? 'on' : '')} onClick={() => setTab('incidents')}>Sự cố</div>
              <div className={'rx-seg-i ' + (tab === 'indicators' ? 'on' : '')} onClick={() => setTab('indicators')}>Chỉ số</div>
            </div>
            <input className="input" style={{ width: 200 }} placeholder="Tìm..." value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/quality')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : tab === 'incidents' ? (
              incidents.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có sự cố</div> : (
                <table className="tbl">
                  <thead><tr><th>Mã</th><th>Tiêu đề</th><th>Loại</th><th>Khoa</th><th>Mức độ</th><th>Trạng thái</th><th>Ngày báo</th></tr></thead>
                  <tbody>
                    {incidents.map((i) => {
                      const sev = SEVERITY_LABEL[String(i.severity)] || { text: String(i.severity), cls: 'ghost' };
                      return (
                        <tr key={i.id} className={sel?.id === i.id ? 'sel' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                          <td className="mono">{i.incidentCode}</td>
                          <td style={{ fontWeight: 500 }}>{i.title}</td>
                          <td className="muted">{i.incidentType}</td>
                          <td className="muted">{i.departmentName || '—'}</td>
                          <td><span className={`chip ${sev.cls}`}>{sev.text}</span></td>
                          <td className="muted">{i.status}</td>
                          <td className="mono">{dayjs(i.reportDate).format('DD/MM HH:mm')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              indicators.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có chỉ số</div> : (
                <table className="tbl">
                  <thead><tr><th>Mã</th><th>Tên chỉ số</th><th>Đơn vị</th><th>Mục tiêu</th><th>Khoa</th></tr></thead>
                  <tbody>
                    {indicators.map((i) => (
                      <tr key={i.id}>
                        <td className="mono">{i.indicatorCode}</td>
                        <td style={{ fontWeight: 500 }}>{i.indicatorName}</td>
                        <td className="muted">{i.unit || '—'}</td>
                        <td className="mono">{i.targetValue ?? '—'}</td>
                        <td className="muted">{i.category || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Sự cố" value={stats.total} />
              <Stat label="Khẩn/Cao" value={stats.critical} crit />
              <Stat label="Đang mở" value={stats.open} warn />
              <Stat label="Chỉ số" value={stats.indicatorCount} cy />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết sự cố</span><span className="sub">{sel?.title || 'Chọn sự cố'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn sự cố</div> : (
              <div className="stack-sm">
                <Field label="Mã" value={<span className="mono">{sel.incidentCode}</span>} />
                <Field label="Tiêu đề" value={sel.title} />
                <Field label="Mô tả" value={sel.description || '—'} />
                <Field label="Loại" value={String(sel.incidentType)} />
                <Field label="Khoa" value={sel.departmentName || '—'} />
                <Field label="BN liên quan" value={sel.patientName || '—'} />
                <Field label="Mức nguy hại" value={String(sel.harmLevel)} />
                <Field label="Người báo cáo" value={sel.reportedByName || '—'} />
                <Field label="Ngày báo" value={<span className="mono">{dayjs(sel.reportDate).format('DD/MM/YYYY HH:mm')}</span>} />
                <Field label="Trạng thái" value={<span className="chip">{String(sel.status)}</span>} />
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

export default QualityV2;
