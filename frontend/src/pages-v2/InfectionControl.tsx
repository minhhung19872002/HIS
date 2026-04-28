import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getHAICases } from '../api/infectionControl';
import { GenericListPage } from './_GenericListPage';

type Row = {
  id: string;
  caseCode?: string;
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  bedNumber?: string;
  infectionType?: string;
  infectionTypeName?: string;
  infectionSite?: string;
  onsetDate?: string;
  diagnosisDate?: string;
  organism?: string;
  isMDRO?: boolean;
  mdroType?: string;
  resistancePattern?: string;
  daysSinceAdmission?: number;
  hasCentralLine?: boolean;
  centralLineDays?: number | null;
  hasUrinaryCatheter?: boolean;
  catheterDays?: number | null;
  onVentilator?: boolean;
  ventilatorDays?: number | null;
  deviceAssociated?: boolean;
  deviceType?: string;
  deviceDays?: number;
  isOutbreakRelated?: boolean;
  status?: string | number;
  statusName?: string;
  severity?: string | number;
  severityName?: string;
  riskFactors?: string[];
  reportedBy?: string;
  reportedAt?: string;
  requiresIsolation?: boolean;
};

const SEVERITY: Record<string, { text: string; cls: string }> = {
  Mild: { text: 'Nhẹ', cls: 'ok' },
  Moderate: { text: 'Vừa', cls: 'warn' },
  Severe: { text: 'Nặng', cls: 'crit' },
};

const STATUS: Record<string, { text: string; cls: string }> = {
  Suspected: { text: 'Nghi ngờ', cls: 'warn' },
  Confirmed: { text: 'Xác định', cls: 'crit' },
  Resolved: { text: 'Đã GQ', cls: 'ok' },
  Excluded: { text: 'Loại trừ', cls: 'ghost' },
  Deceased: { text: 'Tử vong', cls: 'crit' },
};

const InfectionControlV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getHAICases({ keyword, pageSize: 100 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const isDevice = (r: Row) => r.deviceAssociated || r.hasCentralLine || r.hasUrinaryCatheter || r.onVentilator;
  const stats = useMemo(() => [
    { label: 'Ca HAI', value: items.length },
    { label: 'MDRO', value: items.filter((c) => c.isMDRO).length, tone: 'crit' as const },
    { label: 'Liên quan TB', value: items.filter(isDevice).length, tone: 'warn' as const },
    { label: 'Liên quan ổ dịch', value: items.filter((c) => c.isOutbreakRelated).length, tone: 'cy' as const },
  ], [items]);

  return (
    <GenericListPage<Row>
      title="Kiểm soát nhiễm khuẩn — Ca HAI" v1Path="/infection-control"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã ca..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã ca', render: (r) => <span className="mono">{r.caseCode || ''}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode || ''}</div></>
        ) },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}{r.bedNumber ? ` · ${r.bedNumber}` : ''}</span> },
        { key: 'inf', label: 'Loại NK', render: (r) => <span className="muted">{r.infectionTypeName || r.infectionType || '—'}</span> },
        { key: 'org', label: 'Mầm bệnh', render: (r) => (
          <>
            <span className="muted">{r.organism || '—'}</span>
            {r.isMDRO && <span className="chip crit" style={{ marginLeft: 6 }}>MDRO</span>}
          </>
        ) },
        { key: 'date', label: 'Khởi phát', render: (r) => r.onsetDate ? <span className="mono">{dayjs(r.onsetDate).format('DD/MM')}</span> : <span className="muted">—</span> },
        { key: 'sev', label: 'Mức', render: (r) => {
          const s = SEVERITY[String(r.severity || '')] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{r.severityName || s.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[String(r.status || '')] || { text: String(r.status || '—'), cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{r.statusName || s.text}</span>;
        } },
      ]}
      detailTitle={sel?.caseCode || 'Chọn ca HAI'}
      detailFields={!sel ? null : [
        { label: 'Mã ca', value: <span className="mono">{sel.caseCode || ''}</span> },
        { label: 'BN', value: `${sel.patientName || '—'}${sel.patientCode ? ' · ' + sel.patientCode : ''}` },
        { label: 'Khoa', value: sel.departmentName || '—' },
        { label: 'Giường', value: sel.bedNumber || '—' },
        { label: 'Loại NK', value: sel.infectionTypeName || sel.infectionType || '—' },
        { label: 'Vị trí NK', value: sel.infectionSite || '—' },
        ...(sel.onsetDate ? [{ label: 'Khởi phát', value: <span className="mono">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</span> }] : []),
        ...(sel.diagnosisDate ? [{ label: 'Chẩn đoán', value: <span className="mono">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</span> }] : []),
        { label: 'Ngày sau nhập viện', value: <span className="mono">{sel.daysSinceAdmission ?? '—'}</span> },
        { label: 'Mầm bệnh', value: sel.organism || '—' },
        { label: 'MDRO', value: sel.isMDRO ? `Có${sel.mdroType ? ' (' + sel.mdroType + ')' : ''}${sel.resistancePattern ? ' · ' + sel.resistancePattern : ''}` : 'Không' },
        ...(sel.hasCentralLine ? [{ label: 'Catheter TM TT', value: <span className="mono">{sel.centralLineDays ?? '?'} ngày</span> }] : []),
        ...(sel.hasUrinaryCatheter ? [{ label: 'Catheter tiểu', value: <span className="mono">{sel.catheterDays ?? '?'} ngày</span> }] : []),
        ...(sel.onVentilator ? [{ label: 'Thở máy', value: <span className="mono">{sel.ventilatorDays ?? '?'} ngày</span> }] : []),
        ...(sel.deviceAssociated && sel.deviceType ? [{ label: 'Thiết bị', value: `${sel.deviceType}${sel.deviceDays ? ' · ' + sel.deviceDays + ' ngày' : ''}` }] : []),
        { label: 'Liên quan ổ dịch', value: sel.isOutbreakRelated ? 'Có' : 'Không' },
        ...(sel.riskFactors && sel.riskFactors.length > 0 ? [{ label: 'Yếu tố nguy cơ', value: sel.riskFactors.join(', ') }] : []),
        { label: 'Người báo cáo', value: sel.reportedBy || '—' },
      ]}
    />
  );
};

export default InfectionControlV2;
