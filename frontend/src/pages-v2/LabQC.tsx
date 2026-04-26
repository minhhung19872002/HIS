import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getQCLots, getQCResults } from '../api/labQC';
import type { QCLot, QCResult } from '../api/labQC';
import { GenericListPage } from './_GenericListPage';

const LEVEL_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High' };

type Tab = 'lots' | 'results';

const LabQCV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('lots');
  const [lots, setLots] = useState<QCLot[]>([]);
  const [results, setResults] = useState<QCResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [selLot, setSelLot] = useState<QCLot | null>(null);
  const [selRes, setSelRes] = useState<QCResult | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'lots') {
        const r = await getQCLots({ testCode: keyword || undefined });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCLot[];
        setLots(list);
        if (list.length > 0 && !selLot) setSelLot(list[0]);
      } else {
        const r = await getQCResults({ testCode: keyword || undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD') });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCResult[];
        setResults(list);
        if (list.length > 0 && !selRes) setSelRes(list[0]);
      }
    } catch { /* keep empty */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const stats = useMemo(() => {
    if (tab === 'lots') return [
      { label: 'Tổng lô', value: lots.length },
      { label: 'Đang dùng', value: lots.filter((l) => l.isActive).length, tone: 'ok' as const },
      { label: 'Sắp hết hạn 30d', value: lots.filter((l) => dayjs(l.expiryDate).diff(dayjs(), 'day') < 30 && dayjs(l.expiryDate).isAfter(dayjs())).length, tone: 'warn' as const },
      { label: 'Hết hạn', value: lots.filter((l) => dayjs(l.expiryDate).isBefore(dayjs())).length, tone: 'crit' as const },
    ];
    return [
      { label: 'Tổng KQ 30d', value: results.length },
      { label: 'Vi phạm Westgard', value: results.filter((r) => r.isViolation).length, tone: 'crit' as const },
      { label: 'Trong giới hạn', value: results.filter((r) => !r.isViolation).length, tone: 'ok' as const },
      { label: 'TB Z-score', value: results.length > 0 ? (results.reduce((s, r) => s + Math.abs(r.zScore), 0) / results.length).toFixed(2) : '0' },
    ];
  }, [lots, results, tab]);

  if (tab === 'lots') {
    return (
      <div>
        <div style={{ padding: '4px 20px 0' }}>
          <div className="rx-seg" style={{ display: 'flex', gap: 4 }}>
            <div className={'rx-seg-i on'} onClick={() => setTab('lots')}>Lô QC</div>
            <div className={'rx-seg-i'} onClick={() => setTab('results')}>Kết quả QC</div>
          </div>
        </div>
        <GenericListPage<QCLot>
          title="QC — Lô" v1Path="/lab-qc"
          items={lots} loading={loading}
          keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
          searchPlaceholder="Tìm mã XN..."
          selectedId={selLot?.id} onSelect={setSelLot}
          stats={stats}
          columns={[
            { key: 'lot', label: 'Lô', render: (r) => <span className="mono">{r.lotNumber}</span> },
            { key: 'test', label: 'XN', render: (r) => <span style={{ fontWeight: 500 }}>{r.testName}</span> },
            { key: 'level', label: 'Mức', render: (r) => <span className="chip">{LEVEL_LABEL[r.level]}</span> },
            { key: 'mfg', label: 'NSX', render: (r) => <span className="muted">{r.manufacturer}</span> },
            { key: 'mean', label: 'Mean', render: (r) => <span className="mono">{r.targetMean} {r.unit}</span> },
            { key: 'sd', label: 'SD', render: (r) => <span className="mono">{r.targetSD}</span> },
            { key: 'exp', label: 'HSD', render: (r) => <span className="mono">{dayjs(r.expiryDate).format('DD/MM/YYYY')}</span> },
          ]}
          detailTitle={selLot?.testName || 'Chọn lô'}
          detailFields={!selLot ? null : [
            { label: 'Mã lô', value: <span className="mono">{selLot.lotNumber}</span> },
            { label: 'Xét nghiệm', value: `${selLot.testCode} · ${selLot.testName}` },
            { label: 'Mức', value: LEVEL_LABEL[selLot.level] },
            { label: 'NSX', value: selLot.manufacturer },
            { label: 'Mean ± SD', value: <span className="mono">{selLot.targetMean} ± {selLot.targetSD} {selLot.unit}</span> },
            { label: 'HSD', value: <span className="mono">{dayjs(selLot.expiryDate).format('DD/MM/YYYY')}</span> },
            { label: 'Hoạt động', value: selLot.isActive ? 'Có' : 'Không' },
          ]}
        />
      </div>
    );
  }

  return (
    <div>
      <div style={{ padding: '4px 20px 0' }}>
        <div className="rx-seg" style={{ display: 'flex', gap: 4 }}>
          <div className={'rx-seg-i'} onClick={() => setTab('lots')}>Lô QC</div>
          <div className={'rx-seg-i on'} onClick={() => setTab('results')}>Kết quả QC</div>
        </div>
      </div>
      <GenericListPage<QCResult>
        title="QC — Kết quả" v1Path="/lab-qc"
        items={results} loading={loading}
        keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
        searchPlaceholder="Tìm mã XN..."
        selectedId={selRes?.id} onSelect={setSelRes}
        stats={stats}
        columns={[
          { key: 'date', label: 'Ngày', render: (r) => <span className="mono">{dayjs(r.runDate).format('DD/MM HH:mm')}</span> },
          { key: 'test', label: 'XN', render: (r) => <span style={{ fontWeight: 500 }}>{r.testName}</span> },
          { key: 'lot', label: 'Lô', render: (r) => <span className="mono">{r.lotNumber}</span> },
          { key: 'level', label: 'Mức', render: (r) => LEVEL_LABEL[r.level] },
          { key: 'val', label: 'Giá trị', render: (r) => <span className="mono">{r.value}</span> },
          { key: 'z', label: 'Z-score', render: (r) => <span className="mono" style={{ color: Math.abs(r.zScore) > 2 ? 'var(--s-warn)' : undefined }}>{r.zScore.toFixed(2)}</span> },
          { key: 'rule', label: 'Westgard', render: (r) => r.isViolation ? <span className="chip crit">{r.westgardRule || 'Vi phạm'}</span> : <span className="chip ok">OK</span> },
        ]}
        detailTitle={selRes?.testName || 'Chọn KQ'}
        detailFields={!selRes ? null : [
          { label: 'Ngày', value: <span className="mono">{dayjs(selRes.runDate).format('DD/MM/YYYY HH:mm')}</span> },
          { label: 'Xét nghiệm', value: `${selRes.testCode} · ${selRes.testName}` },
          { label: 'Lô', value: <span className="mono">{selRes.lotNumber}</span> },
          { label: 'Mức', value: LEVEL_LABEL[selRes.level] },
          { label: 'Giá trị', value: <span className="mono">{selRes.value}</span> },
          { label: 'Mean ± SD', value: <span className="mono">{selRes.mean} ± {selRes.sd}</span> },
          { label: 'Z-score', value: <span className="mono">{selRes.zScore.toFixed(3)}</span> },
          { label: 'Westgard', value: selRes.isViolation ? <span style={{ color: 'var(--s-crit)' }}>{selRes.westgardRule || 'Vi phạm'}</span> : 'OK' },
          { label: 'Máy XN', value: selRes.analyzerName || '—' },
          { label: 'KTV', value: selRes.operatorName },
        ]}
      />
    </div>
  );
};

export default LabQCV2;
