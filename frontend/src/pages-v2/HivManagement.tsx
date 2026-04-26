import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { searchPatients, getStats } from '../api/hivManagement';
import type { HivPatient, HivStats } from '../api/hivManagement';
import TermIcon from '../layouts/terminal/Icon';

const ART_LABEL: Record<string, { text: string; cls: string }> = {
  PreART: { text: 'Pre-ART', cls: 'warn' },
  OnART: { text: 'Đang ART', cls: 'cy' },
  Interrupted: { text: 'Gián đoạn', cls: 'crit' },
  Transferred: { text: 'Chuyển', cls: 'ghost' },
  Deceased: { text: 'Tử vong', cls: 'ghost' },
  Lost: { text: 'Mất theo dõi', cls: 'crit' },
};

const HivManagementV2: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<HivPatient[]>([]);
  const [stats, setStats] = useState<HivStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<HivPatient | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await searchPatients({ keyword });
      const list = Array.isArray(r) ? r : (r?.items || []);
      setItems(list as HivPatient[]);
      if (list.length > 0 && !sel) setSel(list[0] as HivPatient);
      const s = await getStats().catch(() => null);
      setStats(s);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const local = useMemo(() => ({
    total: items.length,
    onArt: items.filter((p) => p.artStatus === 'OnART').length,
    suppressed: items.filter((p) => p.viralSuppressed).length,
    pregnant: items.filter((p) => p.isPregnant).length,
  }), [items]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, height: '100%', minHeight: 0 }}>
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">Quản lý HIV/AIDS · <b>{items.length}</b></span>
          <div className="actions">
            <input className="input" style={{ width: 200 }} placeholder="Tìm BN / mã HIV..." value={keyword} onChange={(e) => setKeyword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(); }} />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/hiv-management')}><TermIcon name="layers" size={12} />Mở v1</button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : items.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có BN</div> : (
              <table className="tbl">
                <thead><tr><th>HIV code</th><th>BN</th><th>WHO</th><th>ART</th><th>CD4 cuối</th><th>VL cuối</th><th>VS</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  {items.map((p) => {
                    const st = ART_LABEL[p.artStatus] || { text: p.artStatus, cls: 'ghost' };
                    return (
                      <tr key={p.id} className={sel?.id === p.id ? 'sel' : ''} onClick={() => setSel(p)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{p.hivCode}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{p.fullName}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{p.patientCode}</div>
                        </td>
                        <td className="mono">{p.whoStage}</td>
                        <td><span className={`chip ${st.cls}`}>{st.text}</span></td>
                        <td className="mono">{p.lastCd4Count ?? '—'}</td>
                        <td className="mono">{p.lastViralLoad ?? '—'}</td>
                        <td>{p.viralSuppressed ? <span className="chip ok">VS</span> : <span className="chip warn">No</span>}</td>
                        <td className="muted">{p.adherenceStatus}</td>
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
              <Stat label="Tổng BN" value={local.total} />
              <Stat label="Đang ART" value={local.onArt} cy />
              <Stat label="Suppressed" value={local.suppressed} ok />
              <Stat label="Đang mang thai" value={local.pregnant} warn />
            </div>
          </div>
        </div>
        <div className="panel" style={{ flex: 1, minHeight: 0 }}>
          <div className="panel-h"><span className="title">Chi tiết BN</span><span className="sub">{sel?.fullName || 'Chọn BN'}</span></div>
          <div className="panel-body pad">
            {!sel ? <div className="ph">Chọn BN</div> : (
              <div className="stack-sm">
                <Field label="HIV code" value={<span className="mono">{sel.hivCode}</span>} />
                <Field label="BN" value={`${sel.fullName} · ${sel.patientCode}`} />
                <Field label="DOB" value={dayjs(sel.dateOfBirth).format('DD/MM/YYYY')} />
                <Field label="Chẩn đoán" value={dayjs(sel.diagnosisDate).format('DD/MM/YYYY')} />
                <Field label="Đăng ký" value={dayjs(sel.enrollmentDate).format('DD/MM/YYYY')} />
                <Field label="WHO stage" value={String(sel.whoStage)} />
                <Field label="Phác đồ" value={sel.currentRegimen || '—'} />
                <Field label="ART start" value={sel.artStartDate ? dayjs(sel.artStartDate).format('DD/MM/YYYY') : '—'} />
                <Field label="CD4 cuối" value={`${sel.lastCd4Count ?? '—'} (${sel.lastCd4Date ? dayjs(sel.lastCd4Date).format('DD/MM/YYYY') : '—'})`} />
                <Field label="VL cuối" value={`${sel.lastViralLoad ?? '—'} (${sel.lastViralLoadDate ? dayjs(sel.lastViralLoadDate).format('DD/MM/YYYY') : '—'})`} />
                <Field label="Đồng nhiễm" value={[sel.tbCoinfection && 'TB', sel.hbvCoinfection && 'HBV', sel.hcvCoinfection && 'HCV'].filter(Boolean).join(', ') || '—'} />
                <Field label="BS phụ trách" value={sel.assignedDoctorName || '—'} />
                <Field label="Khám tiếp theo" value={sel.nextAppointmentDate ? dayjs(sel.nextAppointmentDate).format('DD/MM/YYYY') : '—'} />
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

export default HivManagementV2;
