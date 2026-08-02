import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Input, InputNumber, DatePicker } from 'antd';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { getQCLots, getQCResults, createQCLot, updateQCLot, deleteQCLot, getQCReport } from '../api/labQC';
import { fmtDateTime } from '../../../utils/format';
import type { QCLot, QCResult, QCReport } from '../api/labQC';
import { exportToExcel, formatDate } from '../../../utils/excelExport';
import { runQC, getLeveyJenningsChart, getAnalyzers, getLabTestCatalog } from '../api/lis';
import type { QCResultDto, LeveyJenningsChartDto, LabAnalyzerDto, LabTestCatalogDto } from '../api/lis';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, ModalShell, AbSelect, tk, ti, te, cf, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';

type ApiErr = { response?: { data?: { message?: string } } };

const LOT_FIELDS: CrudFieldCfg[] = [
  { key: 'lotNumber', label: 'Số lô', required: true, disabledOnEdit: true },
  { key: 'testCode', label: 'Mã xét nghiệm', required: true },
  { key: 'testName', label: 'Tên xét nghiệm', required: true },
  { key: 'level', label: 'Mức QC', type: 'select', required: true, options: [
    { value: 1, label: 'Low' }, { value: 2, label: 'Normal' }, { value: 3, label: 'High' }] },
  { key: 'manufacturer', label: 'Nhà sản xuất' },
  { key: 'targetMean', label: 'Target Mean', type: 'number', required: true },
  { key: 'targetSD', label: 'Target SD', type: 'number', required: true },
  { key: 'unit', label: 'Đơn vị' },
  { key: 'expiryDate', label: 'Hạn dùng', type: 'date', required: true },
  { key: 'isActive', label: 'Đang dùng', type: 'switch' },
];

const LEVEL_LABEL: Record<number, string> = { 1: 'Low', 2: 'Normal', 3: 'High' };

type Tab = 'lots' | 'results' | 'reports';
const TABS = [
  { v: 'lots' as Tab, l: 'Lô QC', ic: 'package' },
  { v: 'results' as Tab, l: 'Kết quả QC', ic: 'activity' },
  { v: 'reports' as Tab, l: 'Báo cáo QC', ic: 'file-text' },
];

const REPORT_STATUS_LABEL: Record<string, string> = { good: 'Tốt', warning: 'Cảnh báo', error: 'Lỗi' };

const PER = 18;

// ─────────────── Chạy QC + Levey-Jennings (dùng api/lis — contract chuẩn) ───────────────

const QC_LEVELS = [
  { value: 'Level1', label: 'Level 1 · Low' },
  { value: 'Level2', label: 'Level 2 · Normal' },
  { value: 'Level3', label: 'Level 3 · High' },
];

const FormRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div style={{
      fontSize: 'var(--fs-xs)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
      letterSpacing: '0.05em', color: 'var(--t-2)', marginBottom: 'var(--space-6)',
    }}>{label}</div>
    {children}
  </div>
);

const QCResultPanel: React.FC<{ result: QCResultDto }> = ({ result }) => (
  <div style={{ padding: 'var(--space-14)', background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
      <StatusBadge tone={result.isAccepted ? 'ok' : 'crit'} dot>{result.isAccepted ? 'QC ĐẠT' : 'QC VI PHẠM'}</StatusBadge>
      {result.westgardRule && <span className="chip crit">{result.westgardRule}</span>}
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-10)', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
      <div><div style={{ color: 'var(--t-2)', fontSize: 10.5 }}>Giá trị</div><b>{result.value}</b></div>
      <div><div style={{ color: 'var(--t-2)', fontSize: 10.5 }}>Mean ± SD</div><b>{result.mean} ± {result.sd}</b></div>
      <div><div style={{ color: 'var(--t-2)', fontSize: 10.5 }}>CV%</div><b>{result.cv}</b></div>
      <div><div style={{ color: 'var(--t-2)', fontSize: 10.5 }}>Z-score</div>
        <b style={{ color: Math.abs(result.zScore) >= 3 ? 'var(--a-rd-text)' : Math.abs(result.zScore) >= 2 ? 'var(--a-or-text)' : undefined }}>
          {result.zScore.toFixed(2)}
        </b>
      </div>
    </div>
    {result.violations?.length > 0 && (
      <div style={{ marginTop: 'var(--space-10)', fontSize: 'var(--fs-sm)', color: 'var(--a-rd-text)' }}>Vi phạm: {result.violations.join(' · ')}</div>
    )}
  </div>
);

// recharts dot — đỏ nếu điểm bị reject (vi phạm Westgard)
interface LJDotProps { cx?: number; cy?: number; index?: number; payload?: { rejected?: boolean } }
const renderLJDot = (props: LJDotProps): React.ReactElement => {
  const { cx, cy, payload, index } = props;
  return <circle key={index} cx={cx} cy={cy} r={4} fill={payload?.rejected ? 'var(--s-crit)' : '#0891b2'} stroke="#fff" strokeWidth={1.2} />;
};

const LJChart: React.FC<{ chart: LeveyJenningsChartDto }> = ({ chart }) => {
  const data = (chart.dataPoints || []).map((p, i) => ({
    idx: i + 1,
    date: dayjs(p.date).format('DD/MM'),
    value: p.value,
    rejected: p.isRejected,
  }));
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-12)', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 'var(--space-10)' }}>
        <span><b style={{ color: 'var(--t-0)' }}>{chart.testName}</b></span>
        <span>Máy: {chart.analyzerName}</span>
        <span style={{ fontFamily: 'var(--font-mono)' }}>Mean {chart.mean} · SD {chart.sd} · n={data.length}</span>
      </div>
      <div style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 30, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
            <XAxis dataKey="date" fontSize={11} />
            <YAxis fontSize={11} domain={['auto', 'auto']} width={48} />
            <RTooltip />
            <ReferenceLine y={chart.plus3SD} stroke="var(--s-crit)" strokeDasharray="4 4" label={{ value: '+3SD', fontSize: 'var(--fs-xxs)', fill: 'var(--s-crit)' }} />
            <ReferenceLine y={chart.plus2SD} stroke="var(--s-warn)" strokeDasharray="4 4" label={{ value: '+2SD', fontSize: 'var(--fs-xxs)', fill: 'var(--s-warn)' }} />
            <ReferenceLine y={chart.plus1SD} stroke="#9ca3af" strokeDasharray="4 4" />
            <ReferenceLine y={chart.mean} stroke="var(--s-ok)" strokeWidth={1.5} label={{ value: 'Mean', fontSize: 'var(--fs-xxs)', fill: 'var(--s-ok)' }} />
            <ReferenceLine y={chart.minus1SD} stroke="#9ca3af" strokeDasharray="4 4" />
            <ReferenceLine y={chart.minus2SD} stroke="var(--s-warn)" strokeDasharray="4 4" label={{ value: '-2SD', fontSize: 'var(--fs-xxs)', fill: 'var(--s-warn)' }} />
            <ReferenceLine y={chart.minus3SD} stroke="var(--s-crit)" strokeDasharray="4 4" label={{ value: '-3SD', fontSize: 'var(--fs-xxs)', fill: 'var(--s-crit)' }} />
            <Line type="monotone" dataKey="value" stroke="#0891b2" strokeWidth={2} dot={renderLJDot} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Modal Chạy QC — chọn máy + test (lấy GUID từ danh mục) → runQC → hiển thị đánh giá Westgard
const RunQCModal: React.FC<{
  open: boolean;
  lot: QCLot | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, lot, onClose, onDone }) => {
  const [analyzers, setAnalyzers] = useState<LabAnalyzerDto[]>([]);
  const [tests, setTests] = useState<LabTestCatalogDto[]>([]);
  const [analyzerId, setAnalyzerId] = useState('');
  const [testId, setTestId] = useState('');
  const [level, setLevel] = useState('Level2');
  const [lotNumber, setLotNumber] = useState('');
  const [value, setValue] = useState<number | null>(null);
  const [runTime, setRunTime] = useState<Dayjs>(() => dayjs());
  const [result, setResult] = useState<QCResultDto | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setResult(null); setAnalyzerId(''); setValue(null); setRunTime(dayjs());
    setLevel(lot ? `Level${lot.level}` : 'Level2');
    setLotNumber(lot?.lotNumber || '');
    getAnalyzers().then((r) => setAnalyzers(r.data || [])).catch(() => setAnalyzers([]));
    getLabTestCatalog().then((r) => setTests(r.data || [])).catch(() => setTests([]));
  }, [open, lot]);

  // map lot.testCode → testId (Guid) khi danh mục test đã tải
  useEffect(() => {
    if (!open) return;
    if (lot && tests.length) {
      const t = tests.find((x) => x.code === lot.testCode);
      setTestId(t?.id || '');
    } else if (!lot) {
      setTestId('');
    }
  }, [open, lot, tests]);

  const submit = async () => {
    if (!analyzerId || !testId || !lotNumber.trim() || value == null) {
      te('Chọn máy XN, xét nghiệm, số lô và nhập giá trị đo');
      return;
    }
    setSaving(true);
    try {
      const r = await runQC({
        analyzerId, testId, qcLevel: level,
        qcLotNumber: lotNumber.trim(), qcValue: value,
        runTime: runTime.toISOString(),
      });
      setResult(r.data);
      if (r.data.isAccepted) tk('QC đạt'); else ti('QC vi phạm quy tắc Westgard');
      onDone();
    } catch (e) {
      te((e as ApiErr)?.response?.data?.message || 'Chạy QC thất bại');
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} size="lg"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}><Ico name="activity" size={14} /> Chạy QC</span>}
      sub={lot ? `Lô ${lot.lotNumber} · ${lot.testName}` : 'Nhập kết quả nội kiểm để đánh giá Westgard'}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <span style={{ flex: 1 }} />
        <Btn variant="primary" onClick={submit} loading={saving} icon="check">Chạy QC</Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <FormRow label="Máy xét nghiệm">
          <AbSelect options={analyzers} fieldNames={{ value: 'id', label: 'name' }} value={analyzerId} onChange={setAnalyzerId} placeholder="— Chọn máy —" />
        </FormRow>
        <FormRow label="Xét nghiệm">
          <AbSelect options={tests} fieldNames={{ value: 'id', label: 'name' }} value={testId} onChange={setTestId} placeholder="— Chọn xét nghiệm —" />
        </FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <FormRow label="Mức QC">
            <AbSelect options={QC_LEVELS} fieldNames={{ value: 'value', label: 'label' }} value={level} onChange={setLevel} />
          </FormRow>
          <FormRow label="Số lô QC">
            <Input value={lotNumber} onChange={(e) => setLotNumber(e.target.value)} placeholder="Số lô…" />
          </FormRow>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <FormRow label="Giá trị đo">
            <InputNumber style={{ width: '100%' }} value={value} onChange={(v) => setValue(v)} placeholder="Giá trị…" />
          </FormRow>
          <FormRow label="Thời điểm chạy">
            <DatePicker showTime style={{ width: '100%' }} value={runTime} onChange={(d) => setRunTime(d || dayjs())} format="DD/MM/YYYY HH:mm" />
          </FormRow>
        </div>
        {result && <QCResultPanel result={result} />}
      </div>
    </ModalShell>
  );
};

// Modal Levey-Jennings — biểu đồ nội kiểm theo thời gian
const LJModal: React.FC<{
  open: boolean;
  result: QCResult | null;
  onClose: () => void;
}> = ({ open, result, onClose }) => {
  const [analyzers, setAnalyzers] = useState<LabAnalyzerDto[]>([]);
  const [tests, setTests] = useState<LabTestCatalogDto[]>([]);
  const [analyzerId, setAnalyzerId] = useState('');
  const [testId, setTestId] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [dayjs().subtract(30, 'day'), dayjs()]);
  const [chart, setChart] = useState<LeveyJenningsChartDto | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChart(null);
    setAnalyzerId(result?.analyzerId || '');
    setRange([dayjs().subtract(30, 'day'), dayjs()]);
    getAnalyzers().then((r) => setAnalyzers(r.data || [])).catch(() => setAnalyzers([]));
    getLabTestCatalog().then((r) => setTests(r.data || [])).catch(() => setTests([]));
  }, [open, result]);

  useEffect(() => {
    if (!open) return;
    if (result && tests.length) {
      const t = tests.find((x) => x.code === result.testCode);
      setTestId(t?.id || '');
    } else if (!result) {
      setTestId('');
    }
  }, [open, result, tests]);

  const load = async () => {
    if (!testId || !analyzerId) { te('Chọn xét nghiệm và máy XN'); return; }
    setLoading(true);
    try {
      const r = await getLeveyJenningsChart(testId, analyzerId, range[0].format('YYYY-MM-DD'), range[1].format('YYYY-MM-DD'));
      setChart(r.data);
    } catch (e) {
      te((e as ApiErr)?.response?.data?.message || 'Không tải được biểu đồ');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} size="xl"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}><Ico name="activity" size={14} /> Biểu đồ Levey-Jennings</span>}
      sub="Theo dõi nội kiểm QC theo thời gian (Mean ± 1/2/3 SD)"
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Đóng</Btn>
        <span style={{ flex: 1 }} />
        <Btn variant="primary" onClick={load} loading={loading} icon="activity">Vẽ biểu đồ</Btn>
      </>}>
      <div style={{ display: 'flex', gap: 'var(--space-10)', marginBottom: 'var(--space-14)', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 180px' }}><FormRow label="Xét nghiệm"><AbSelect options={tests} fieldNames={{ value: 'id', label: 'name' }} value={testId} onChange={setTestId} placeholder="— Chọn —" /></FormRow></div>
        <div style={{ flex: '1 1 180px' }}><FormRow label="Máy xét nghiệm"><AbSelect options={analyzers} fieldNames={{ value: 'id', label: 'name' }} value={analyzerId} onChange={setAnalyzerId} placeholder="— Chọn —" /></FormRow></div>
        <div style={{ flex: '1 1 230px' }}><FormRow label="Khoảng thời gian"><DatePicker.RangePicker style={{ width: '100%' }} value={range} onChange={(v) => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} format="DD/MM/YYYY" /></FormRow></div>
      </div>
      {chart
        ? <LJChart chart={chart} />
        : <div style={{ padding: 'var(--space-40)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>{loading ? 'Đang tải…' : 'Chọn xét nghiệm + máy XN rồi bấm "Vẽ biểu đồ"'}</div>}
    </ModalShell>
  );
};

const LabQCV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('lots');
  const [lots, setLots] = useState<QCLot[]>([]);
  const [results, setResults] = useState<QCResult[]>([]);
  const [reports, setReports] = useState<QCReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [selLot, setSelLot] = useState<QCLot | null>(null);
  const [selRes, setSelRes] = useState<QCResult | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [runQCOpen, setRunQCOpen] = useState(false);
  const [runQCLot, setRunQCLot] = useState<QCLot | null>(null);
  const [ljOpen, setLjOpen] = useState(false);
  const [ljResult, setLjResult] = useState<QCResult | null>(null);
  const openRunQC = (l: QCLot | null) => { setRunQCLot(l); setRunQCOpen(true); };
  const openLJ = (r: QCResult | null) => { setLjResult(r); setLjOpen(true); };
  const openCreateLot = () => { setCrudInit({ level: 2, isActive: true }); setCrudOpen(true); };
  const openEditLot = (r: QCLot) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const delLot = (r: QCLot) => cf(`Xoá lô QC "${r.lotNumber}"?`, async () => {
    try { await deleteQCLot(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'lots') {
        const r = await getQCLots({ testCode: search || undefined });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCLot[];
        setLots(list);
      } else if (tab === 'results') {
        const r = await getQCResults({
          testCode: search || undefined,
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
        });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCResult[];
        setResults(list);
      } else {
        const r = await getQCReport({
          fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
        });
        const list = (r?.items || (Array.isArray(r) ? r : [])) as QCReport[];
        setReports(list);
      }
    } catch { ti('Không tải được dữ liệu QC'); }
    finally { setLoading(false); }
  };
  useEffect(() => { setPage(0); load(); /* eslint-disable-next-line */ }, [tab]);

  const filteredLots = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return lots;
    return lots.filter((l) =>
      (l.testCode || '').toLowerCase().includes(k)
      || (l.testName || '').toLowerCase().includes(k)
      || (l.lotNumber || '').toLowerCase().includes(k));
  }, [lots, search]);
  const filteredResults = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return results;
    return results.filter((r) =>
      (r.testCode || '').toLowerCase().includes(k)
      || (r.testName || '').toLowerCase().includes(k)
      || (r.lotNumber || '').toLowerCase().includes(k));
  }, [results, search]);
  const filteredReports = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return reports;
    return reports.filter((r) =>
      (r.testCode || '').toLowerCase().includes(k)
      || (r.testName || '').toLowerCase().includes(k));
  }, [reports, search]);

  const totalPages = Math.max(1, Math.ceil((tab === 'lots' ? filteredLots.length : tab === 'results' ? filteredResults.length : filteredReports.length) / PER));
  const pagedLots = filteredLots.slice(page * PER, (page + 1) * PER);
  const pagedRes = filteredResults.slice(page * PER, (page + 1) * PER);
  const pagedReports = filteredReports.slice(page * PER, (page + 1) * PER);

  const lotKpis = useMemo(() => {
    const today = dayjs();
    const expired = lots.filter((l) => dayjs(l.expiryDate).isBefore(today)).length;
    const soon = lots.filter((l) => {
      const d = dayjs(l.expiryDate);
      return d.isAfter(today) && d.diff(today, 'day') < 30;
    }).length;
    const active = lots.filter((l) => l.isActive).length;
    return [
      { lbl: 'Tổng lô', val: lots.length, sub: 'tất cả' },
      { lbl: 'Đang dùng', val: active, sub: `${Math.round((active / Math.max(1, lots.length)) * 100)}%`, tone: 'ok' as const },
      { lbl: 'Sắp hết hạn', val: soon, sub: '< 30 ngày', tone: 'warn' as const },
      { lbl: 'Hết hạn', val: expired, sub: 'cần thay', tone: 'crit' as const },
    ];
  }, [lots]);

  const resKpis = useMemo(() => {
    const violations = results.filter((r) => r.isViolation).length;
    const avgZ = results.length ? (results.reduce((s, r) => s + Math.abs(r.zScore), 0) / results.length) : 0;
    const tests = new Set(results.map((r) => r.testCode));
    return [
      { lbl: 'Tổng KQ', val: results.length, sub: '30 ngày qua' },
      { lbl: 'Trong giới hạn', val: results.length - violations, sub: 'OK', tone: 'ok' as const },
      { lbl: 'Vi phạm Westgard', val: violations, sub: `${Math.round((violations / Math.max(1, results.length)) * 100)}%`, tone: 'crit' as const },
      { lbl: 'TB |Z-score|', val: avgZ.toFixed(2), sub: tests.size + ' xét nghiệm' },
    ];
  }, [results]);

  const reportKpis = useMemo(() => {
    const warnCount = reports.filter((r) => r.status === 'warning').length;
    const errCount = reports.filter((r) => r.status === 'error').length;
    const totalViolations = reports.reduce((s, r) => s + (r.violations || 0), 0);
    return [
      { lbl: 'Tổng XN theo dõi', val: reports.length, sub: '30 ngày qua' },
      { lbl: 'Tốt', val: Math.max(0, reports.length - warnCount - errCount), tone: 'ok' as const },
      { lbl: 'Cảnh báo', val: warnCount, tone: 'warn' as const },
      { lbl: 'Lỗi', val: errCount, sub: `${totalViolations} vi phạm`, tone: 'crit' as const },
    ];
  }, [reports]);

  const lotCols: ColumnDef<QCLot>[] = [
    { key: 'lot', label: 'Lô', code: true, render: (r) => r.lotNumber },
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.testName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.testCode}</div>
      </div>
    ) },
    { key: 'level', label: 'Mức', render: (r) => <StatusBadge tone="info">{LEVEL_LABEL[r.level] || '—'}</StatusBadge> },
    { key: 'mfg', label: 'NSX', render: (r) => r.manufacturer || '—' },
    { key: 'mean', label: 'Mean ± SD', mono: true, render: (r) => `${r.targetMean} ± ${r.targetSD}` },
    { key: 'unit', label: 'Đơn vị', mono: true, render: (r) => r.unit || '—' },
    { key: 'exp', label: 'HSD', mono: true, render: (r) => {
      const d = dayjs(r.expiryDate);
      const expired = d.isBefore(dayjs());
      const soon = !expired && d.diff(dayjs(), 'day') < 30;
      return <span style={{ color: expired ? 'var(--a-rd-text)' : soon ? 'var(--a-or-text)' : undefined }}>
        {d.format('DD/MM/YYYY')}
      </span>;
    } },
    { key: 'st', label: 'TT', render: (r) => (
      <StatusBadge tone={r.isActive ? 'ok' : 'warn'} dot>{r.isActive ? 'Active' : 'Inactive'}</StatusBadge>
    ) },
  ];

  const resCols: ColumnDef<QCResult>[] = [
    { key: 'date', label: 'Thời gian', mono: true, render: (r) => dayjs(r.runDate).format('DD/MM HH:mm') },
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.testName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.testCode} · Lô {r.lotNumber}</div>
      </div>
    ) },
    { key: 'level', label: 'Mức', render: (r) => LEVEL_LABEL[r.level] || '—' },
    { key: 'val', label: 'Giá trị', mono: true, render: (r) => <b>{r.value}</b> },
    { key: 'mean', label: 'Mean ± SD', mono: true, render: (r) => `${r.mean} ± ${r.sd}` },
    { key: 'z', label: 'Z-score', mono: true, render: (r) => {
      const abs = Math.abs(r.zScore);
      const tone = abs >= 3 ? 'var(--a-rd-text)' : abs >= 2 ? 'var(--a-or-text)' : 'var(--t-0)';
      return <span style={{ color: tone, fontWeight: 600 }}>{r.zScore.toFixed(2)}</span>;
    } },
    { key: 'rule', label: 'Westgard', render: (r) => r.isViolation
      ? <StatusBadge tone="crit" dot>{r.westgardRule || 'Vi phạm'}</StatusBadge>
      : <StatusBadge tone="ok" dot>OK</StatusBadge>
    },
    { key: 'ana', label: 'Máy XN', render: (r) => r.analyzerName || '—' },
  ];

  const reportCols: ColumnDef<QCReport>[] = [
    { key: 'test', label: 'Xét nghiệm', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.testName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.testCode}</div>
      </div>
    ) },
    { key: 'total', label: 'Tổng lần chạy', mono: true, render: (r) => r.totalRuns },
    { key: 'violations', label: 'Vi phạm', render: (r) => r.violations > 0
      ? <StatusBadge tone="crit" dot>{r.violations}</StatusBadge>
      : <StatusBadge tone="ok" dot>0</StatusBadge> },
    { key: 'rate', label: 'Tỉ lệ VP', mono: true, render: (r) => `${(r.violationRate * 100).toFixed(1)}%` },
    { key: 'last', label: 'Lần chạy cuối', mono: true, render: (r) => r.lastRunDate ? dayjs(r.lastRunDate).format('DD/MM/YYYY HH:mm') : '—' },
    { key: 'status', label: 'Tình trạng', render: (r) => (
      <StatusBadge tone={r.status === 'good' ? 'ok' : r.status === 'warning' ? 'warn' : 'crit'} dot>
        {REPORT_STATUS_LABEL[r.status] || r.status}
      </StatusBadge>
    ) },
  ];

  const lotActions = (r: QCLot) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelLot(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEditLot(r)} />
      <ActBtn ic="activity" title="Chạy QC" onClick={() => openRunQC(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delLot(r)} />
    </div>
  );
  const resActions = (r: QCResult) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSelRes(r)} />
      <ActBtn ic="activity" title="Levey-Jennings" onClick={() => openLJ(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={tab === 'lots' ? lotKpis : tab === 'results' ? resKpis : reportKpis} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <Btn variant="ghost" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </Btn>
          {tab === 'lots' && <Btn variant="primary" onClick={openCreateLot}>
            <Ico name="plus" size={12} /> Thêm lô
          </Btn>}
          {tab === 'results' && <Btn variant="primary" onClick={() => openRunQC(null)}>
            <Ico name="activity" size={12} /> Chạy QC
          </Btn>}
        </>
      } />

      <div className="ab-toolbar" style={{ borderTop: 'none' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder={tab === 'lots' ? 'Tìm mã/tên XN, số lô…' : 'Tìm mã/tên XN…'} />
        <Btn variant="ghost" onClick={() => setSearch('')}>
          <Ico name="x" size={12} /> Xóa lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={() => {
          if (tab === 'lots') {
            if (!lots.length) { ti('Chưa có lô QC để xuất'); return; }
            exportToExcel(
              lots as unknown as Record<string, unknown>[],
              [
                { header: 'Số lô', key: 'lotNumber', width: 16 },
                { header: 'Mã XN', key: 'testCode', width: 14 },
                { header: 'Tên xét nghiệm', key: 'testName', width: 28 },
                { header: 'Mức QC', key: 'level', width: 10, format: (v) => v === 1 ? 'Low' : v === 2 ? 'Normal' : 'High' },
                { header: 'NSX', key: 'manufacturer', width: 18 },
                { header: 'Mean', key: 'targetMean', width: 10 },
                { header: 'SD', key: 'targetSD', width: 10 },
                { header: 'Đơn vị', key: 'unit', width: 10 },
                { header: 'Hạn dùng', key: 'expiryDate', width: 14, format: formatDate },
                { header: 'Trạng thái', key: 'isActive', width: 12, format: (v) => v ? 'Active' : 'Inactive' },
              ],
              `lab-qc-lots-${dayjs().format('YYYYMMDD')}`,
            );
            tk('Đã xuất Excel danh sách lô QC');
          } else if (tab === 'results') {
            if (!results.length) { ti('Chưa có kết quả QC để xuất'); return; }
            exportToExcel(
              results as unknown as Record<string, unknown>[],
              [
                { header: 'Thời gian', key: 'runDate', width: 18, format: (v) => v ? fmtDateTime(v as string) : '' },
                { header: 'Mã XN', key: 'testCode', width: 14 },
                { header: 'Tên xét nghiệm', key: 'testName', width: 28 },
                { header: 'Số lô', key: 'lotNumber', width: 14 },
                { header: 'Mức QC', key: 'level', width: 10, format: (v) => v === 1 ? 'Low' : v === 2 ? 'Normal' : 'High' },
                { header: 'Giá trị', key: 'value', width: 10 },
                { header: 'Mean', key: 'mean', width: 10 },
                { header: 'SD', key: 'sd', width: 10 },
                { header: 'Z-score', key: 'zScore', width: 10, format: (v) => Number(v).toFixed(3) },
                { header: 'Vi phạm Westgard', key: 'isViolation', width: 16, format: (v) => v ? 'Vi phạm' : 'OK' },
                { header: 'Quy tắc', key: 'westgardRule', width: 14 },
                { header: 'Máy XN', key: 'analyzerName', width: 18 },
                { header: 'KTV', key: 'operatorName', width: 16 },
              ],
              `lab-qc-results-${dayjs().format('YYYYMMDD')}`,
            );
            tk('Đã xuất Excel kết quả QC');
          } else {
            if (!reports.length) { ti('Chưa có báo cáo QC để xuất'); return; }
            exportToExcel(
              reports as unknown as Record<string, unknown>[],
              [
                { header: 'Mã XN', key: 'testCode', width: 14 },
                { header: 'Tên xét nghiệm', key: 'testName', width: 28 },
                { header: 'Tổng lần chạy', key: 'totalRuns', width: 14 },
                { header: 'Vi phạm', key: 'violations', width: 10 },
                { header: 'Tỉ lệ VP', key: 'violationRate', width: 10, format: (v) => `${(Number(v) * 100).toFixed(1)}%` },
                { header: 'Lần chạy cuối', key: 'lastRunDate', width: 18, format: (v) => v ? fmtDateTime(v as string) : '' },
                { header: 'Tình trạng', key: 'status', width: 12, format: (v) => REPORT_STATUS_LABEL[v as string] || String(v) },
              ],
              `lab-qc-reports-${dayjs().format('YYYYMMDD')}`,
            );
            tk('Đã xuất Excel báo cáo QC');
          }
        }}>
          <Ico name="download" size={12} /> Xuất Excel
        </Btn>
      </div>

      {tab === 'lots' ? (
        <>
          <DataTable<QCLot>
            columns={lotCols} data={pagedLots} rowKey={(r) => r.id}
            onRowClick={setSelLot} actions={lotActions}
            empty={loading ? 'Đang tải…' : 'Chưa có lô QC'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredLots.length} perPage={PER} />
        </>
      ) : tab === 'results' ? (
        <>
          <DataTable<QCResult>
            columns={resCols} data={pagedRes} rowKey={(r) => r.id}
            onRowClick={setSelRes} actions={resActions}
            empty={loading ? 'Đang tải…' : 'Chưa có kết quả QC'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredResults.length} perPage={PER} />
        </>
      ) : (
        <>
          <DataTable<QCReport>
            columns={reportCols} data={pagedReports} rowKey={(r) => r.testCode}
            empty={loading ? 'Đang tải…' : 'Chưa có báo cáo QC'}
          />
          <Pager page={page} setPage={setPage} totalPages={totalPages} total={filteredReports.length} perPage={PER} />
        </>
      )}

      <DrawerShell
        open={!!selLot}
        onClose={() => setSelLot(null)}
        size="lg"
        title={selLot ? `Lô QC · ${selLot.lotNumber}` : ''}
        sub={selLot ? `${selLot.testCode} · ${selLot.testName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSelLot(null)}>Đóng</Btn>
          <Btn onClick={() => { if (selLot) openEditLot(selLot); setSelLot(null); }}>
            <Ico name="edit" size={12} /> Sửa lô
          </Btn>
          <Btn variant="primary" onClick={() => { if (selLot) openRunQC(selLot); setSelLot(null); }}>
            <Ico name="activity" size={12} /> Chạy QC
          </Btn>
        </>}
      >
        {selLot && <>
          <DrSec title="Thông tin lô">
            <DrField lbl="Số lô"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.lotNumber}</span></DrField>
            <DrField lbl="Xét nghiệm">{selLot.testCode} · {selLot.testName}</DrField>
            <DrField lbl="Mức QC">{LEVEL_LABEL[selLot.level] || '—'}</DrField>
            <DrField lbl="Nhà sản xuất">{selLot.manufacturer || '—'}</DrField>
            <DrField lbl="Hạn dùng">{dayjs(selLot.expiryDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="Hoạt động">
              <StatusBadge tone={selLot.isActive ? 'ok' : 'warn'} dot>
                {selLot.isActive ? 'Đang dùng' : 'Tạm ngưng'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Mục tiêu (target)">
            <DrField lbl="Mean"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.targetMean} {selLot.unit}</span></DrField>
            <DrField lbl="SD"><span style={{ fontFamily: 'var(--font-mono)' }}>{selLot.targetSD}</span></DrField>
            <DrField lbl="±2 SD"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {(selLot.targetMean - 2 * selLot.targetSD).toFixed(2)} – {(selLot.targetMean + 2 * selLot.targetSD).toFixed(2)}
            </span></DrField>
            <DrField lbl="±3 SD"><span style={{ fontFamily: 'var(--font-mono)' }}>
              {(selLot.targetMean - 3 * selLot.targetSD).toFixed(2)} – {(selLot.targetMean + 3 * selLot.targetSD).toFixed(2)}
            </span></DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <DrawerShell
        open={!!selRes}
        onClose={() => setSelRes(null)}
        size="lg"
        title={selRes ? `KQ QC · ${selRes.testName}` : ''}
        sub={selRes ? `Lô ${selRes.lotNumber} · ${dayjs(selRes.runDate).format('DD/MM HH:mm')}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSelRes(null)}>Đóng</Btn>
          <Btn variant="primary" onClick={() => { openLJ(selRes); setSelRes(null); }}>
            <Ico name="activity" size={12} /> L-J Chart
          </Btn>
        </>}
      >
        {selRes && <>
          <DrSec title="Kết quả">
            <DrField lbl="Thời gian">{dayjs(selRes.runDate).format('DD/MM/YYYY HH:mm')}</DrField>
            <DrField lbl="Xét nghiệm">{selRes.testCode} · {selRes.testName}</DrField>
            <DrField lbl="Lô">{selRes.lotNumber} · {LEVEL_LABEL[selRes.level]}</DrField>
            <DrField lbl="Giá trị"><b style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>{selRes.value}</b></DrField>
          </DrSec>
          <DrSec title="Đánh giá thống kê">
            <DrField lbl="Mean ± SD"><span style={{ fontFamily: 'var(--font-mono)' }}>{selRes.mean} ± {selRes.sd}</span></DrField>
            <DrField lbl="Z-score">
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 600,
                color: Math.abs(selRes.zScore) >= 3 ? 'var(--a-rd-text)' : Math.abs(selRes.zScore) >= 2 ? 'var(--a-or-text)' : 'var(--a-em-text)',
              }}>{selRes.zScore.toFixed(3)}</span>
            </DrField>
            <DrField lbl="Westgard">
              {selRes.isViolation
                ? <StatusBadge tone="crit" dot>{selRes.westgardRule || 'Vi phạm'}</StatusBadge>
                : <StatusBadge tone="ok" dot>OK</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Quá trình">
            <DrField lbl="Máy XN">{selRes.analyzerName || '—'}</DrField>
            <DrField lbl="KTV">{selRes.operatorName || '—'}</DrField>
            <DrField lbl="Ghi chú">{selRes.notes || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật lô QC' : 'Thêm lô QC'}
        fields={LOT_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateQCLot(String(crudInit.id), v);
          else await createQCLot(v);
          tk(editing ? 'Đã cập nhật lô QC' : 'Đã thêm lô QC');
          load();
        }}
      />

      <RunQCModal
        open={runQCOpen}
        lot={runQCLot}
        onClose={() => setRunQCOpen(false)}
        onDone={() => { if (tab === 'results') load(); }}
      />
      <LJModal
        open={ljOpen}
        result={ljResult}
        onClose={() => setLjOpen(false)}
      />
    </div>
  );
};

export default LabQCV2;
