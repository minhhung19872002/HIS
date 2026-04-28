import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchHealthCheckups, getHealthCheckupStats } from '../api/healthCheckup';
import type { HealthCheckup, HealthCheckupStats } from '../api/healthCheckup';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ', cls: 'warn' },
  1: { text: 'Đang khám', cls: 'cy' },
  2: { text: 'Hoàn thành', cls: 'ok' },
  3: { text: 'Đã chứng nhận', cls: 'ok' },
};

const CONCLUSION: Record<string, { text: string; cls: string }> = {
  pass: { text: 'Đạt', cls: 'ok' },
  fail: { text: 'Không đạt', cls: 'crit' },
  conditional: { text: 'Có điều kiện', cls: 'warn' },
};

const HealthCheckupV2: React.FC = () => {
  const [items, setItems] = useState<HealthCheckup[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<HealthCheckup | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchHealthCheckups({ keyword, pageSize: 100 }), getHealthCheckupStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Tổng KSK', value: stats?.totalCheckups ?? items.length },
    { label: 'Hôm nay', value: stats?.todayCount ?? 0, tone: 'cy' as const },
    { label: 'Đạt', value: stats?.passCount ?? items.filter((c) => c.conclusion === 'pass').length, tone: 'ok' as const },
    { label: 'Không đạt', value: stats?.failCount ?? items.filter((c) => c.conclusion === 'fail').length, tone: 'crit' as const },
  ], [items, stats]);

  return (
    <GenericListPage<HealthCheckup>
      title="Khám sức khoẻ" v1Path="/health-checkup"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã KSK..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã KSK', render: (r) => <span className="mono">{r.checkupCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'date', label: 'Ngày', render: (r) => <span className="mono">{dayjs(r.checkupDate).format('DD/MM')}</span> },
        { key: 'type', label: 'Loại', render: (r) => <span className="muted">{r.checkupType}</span> },
        { key: 'company', label: 'Công ty', render: (r) => <span className="muted">{r.companyName || '—'}</span> },
        { key: 'doc', label: 'BS khám', render: (r) => <span className="muted">{r.examDoctor}</span> },
        { key: 'concl', label: 'KL', render: (r) => {
          const c = CONCLUSION[r.conclusion] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${c.cls}`}>{c.text}</span>;
        } },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.checkupCode || 'Chọn KSK'}
      detailFields={!sel ? null : [
        { label: 'Mã KSK', value: <span className="mono">{sel.checkupCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'GT/Sinh', value: `${sel.gender === 1 ? 'Nam' : 'Nữ'} · ${dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}` },
        { label: 'Loại', value: sel.checkupType },
        { label: 'Công ty', value: sel.companyName || '—' },
        { label: 'Nhóm', value: sel.groupName || '—' },
        { label: 'Ngày khám', value: <span className="mono">{dayjs(sel.checkupDate).format('DD/MM/YYYY')}</span> },
        { label: 'BS khám', value: sel.examDoctor },
        { label: 'Kết luận', value: CONCLUSION[sel.conclusion]?.text || '—' },
        ...(sel.notes ? [{ label: 'Ghi chú', value: sel.notes }] : []),
      ]}
    />
  );
};

export default HealthCheckupV2;
