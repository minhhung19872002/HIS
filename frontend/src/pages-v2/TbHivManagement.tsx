import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { getTbHivRecords, getTbHivStatistics } from '../api/tbHivManagement';
import type { TbHivRecordDto, TbHivStatisticsDto } from '../api/tbHivManagement';
import TermIcon from '../layouts/terminal/Icon';

const TYPE_LABEL: Record<number, string> = { 0: 'TB', 1: 'HIV', 2: 'TB+HIV' };
const STATUS_LABEL: Record<number, { text: string; cls: string }> = {
  0: { text: 'Đang điều trị', cls: 'cy' },
  1: { text: 'Khỏi', cls: 'ok' },
  2: { text: 'Thất bại', cls: 'crit' },
  3: { text: 'Bỏ trị', cls: 'crit' },
  4: { text: 'Tử vong', cls: 'ghost' },
  5: { text: 'Chuyển tuyến', cls: 'ghost' },
};

const TbHivManagementV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<TbHivRecordDto[]>([]);
  const [stats, setStats] = useState<TbHivStatisticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<TbHivRecordDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getTbHivRecords({ keyword });
      const list = (r?.items || (Array.isArray(r) ? r : [])) as TbHivRecordDto[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
      const s = await getTbHivStatistics().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: items.length,
    onTreatment: items.filter((r) => r.status === 0).length,
    tbCount: items.filter((r) => r.recordType === 0).length,
    hivCount: items.filter((r) => r.recordType === 1).length,
    coInfection: items.filter((r) => r.recordType === 2).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">TB + HIV · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/tb-hiv-management')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có HS</div> : (
              <table className="tbl">
                <thead><tr><th>Mã ĐK</th><th>BN</th><th>Loại</th><th>Phác đồ</th><th>Bắt đầu</th><th>Tháng</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((i) => {
                    const st = STATUS_LABEL[i.status] || { text: '—', cls: 'ghost' };
                    return (
                      <tr key={i.id} className={sel?.id === i.id ? 'sel' : ''} onClick={() => setSel(i)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{i.registrationCode}</td>
                        <td><div style={{ fontWeight: 500 }}>{i.patientName}</div><div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{i.patientCode}</div></td>
                        <td><span className="chip cy">{TYPE_LABEL[i.recordType] || '—'}</span></td>
                        <td className="muted">{i.regimen}</td>
                        <td className="mono">{dayjs(i.startDate).format('DD/MM/YYYY')}</td>
                        <td className="mono">{i.treatmentMonth ?? '—'}</td>
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
              <Stat label="Tổng HS" value={local.total} />
              <Stat label="Đang điều trị" value={local.onTreatment} cy />
              <Stat label="TB" value={local.tbCount} />
              <Stat label="HIV" value={local.hivCount} />
              <Stat label="Đồng nhiễm" value={local.coInfection} warn />
              {stats && <Stat label="Tổng BE" value={stats.onTreatment} ok />}
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết HS</span><span className="sub">{sel?.patientName || 'Chọn HS'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn HS</div> : (
              <div className="stack-sm">
                <Field label="Mã ĐK" value={<span className="mono">{sel.registrationCode}</span>} />
                <Field label="BN" value={`${sel.patientName} · ${sel.patientCode}`} />
                <Field label="SĐT" value={sel.phoneNumber || '—'} />
                <Field label="Loại" value={TYPE_LABEL[sel.recordType] || '—'} />
                <Field label="Phác đồ" value={sel.regimen} />
                <Field label="Bắt đầu" value={dayjs(sel.startDate).format('DD/MM/YYYY')} />
                {sel.sputumSmearResult && <Field label="Đờm AFB" value={sel.sputumSmearResult} />}
                {sel.geneXpertResult && <Field label="GeneXpert" value={sel.geneXpertResult} />}
                {sel.cd4Count && <Field label="CD4" value={String(sel.cd4Count)} />}
                {sel.viralLoad && <Field label="VL" value={String(sel.viralLoad)} />}
                {sel.artRegimen && <Field label="ART" value={sel.artRegimen} />}
                <Field label="BS" value={sel.doctorName || '—'} />
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

export default TbHivManagementV2;
