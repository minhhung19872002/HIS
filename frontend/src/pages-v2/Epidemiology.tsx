import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { searchDiseaseReports, getEpiStats } from '../api/epidemiology';
import type { DiseaseReport, EpiStats } from '../api/epidemiology';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Nháp', cls: 'ghost' },
  1: { text: 'Đã gửi', cls: 'cy' },
  2: { text: 'Xác nhận', cls: 'ok' },
  3: { text: 'Đóng', cls: 'ghost' },
};

const GROUP: Record<string, string> = { A: 'crit', B: 'warn', C: 'cy' };

const EpidemiologyV2: React.FC = () => {
  const [items, setItems] = useState<DiseaseReport[]>([]);
  const [stats, setStats] = useState<EpiStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<DiseaseReport | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [list, s] = await Promise.all([searchDiseaseReports({ keyword }), getEpiStats()]);
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Tổng báo cáo', value: stats?.totalReports ?? items.length },
    { label: 'Xác định', value: stats?.confirmedCases ?? items.filter((r) => r.labConfirmed).length, tone: 'cy' as const },
    { label: 'Ổ dịch', value: stats?.activeOutbreaks ?? 0, tone: 'crit' as const },
    { label: 'Tử vong', value: stats?.deathCount ?? 0, tone: 'crit' as const },
  ], [items, stats]);

  return (
    <GenericListPage<DiseaseReport>
      title="Dịch tễ — Báo cáo bệnh truyền nhiễm" v1Path="/epidemiology"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã BC..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã BC', render: (r) => <span className="mono">{r.reportCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode}</div></>
        ) },
        { key: 'dis', label: 'Bệnh', render: (r) => (
          <><div>{r.diseaseName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.diseaseCode}</div></>
        ) },
        { key: 'grp', label: 'Nhóm', render: (r) => <span className={`chip ${GROUP[r.diseaseGroup] || 'ghost'}`}>{r.diseaseGroup}</span> },
        { key: 'date', label: 'Báo cáo', render: (r) => <span className="mono">{dayjs(r.reportDate).format('DD/MM')}</span> },
        { key: 'lab', label: 'XN', render: (r) => r.labConfirmed ? <span className="chip cy">+</span> : <span className="muted">—</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.reportCode || 'Chọn báo cáo'}
      detailFields={!sel ? null : [
        { label: 'Mã BC', value: <span className="mono">{sel.reportCode}</span> },
        { label: 'BN', value: `${sel.patientName} · ${sel.patientCode}` },
        { label: 'Tuổi/GT', value: `${sel.age} · ${sel.gender === 1 ? 'Nam' : 'Nữ'}` },
        { label: 'Địa chỉ', value: sel.address },
        { label: 'Bệnh', value: `${sel.diseaseName} (${sel.diseaseCode})` },
        { label: 'Nhóm', value: sel.diseaseGroup },
        { label: 'Khởi phát', value: <span className="mono">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</span> },
        { label: 'Chẩn đoán', value: <span className="mono">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</span> },
        { label: 'XN khẳng định', value: sel.labConfirmed ? 'Có' : 'Chưa' },
        { label: 'BS báo cáo', value: sel.reportingDoctor },
        ...(sel.outcome ? [{ label: 'Diễn biến', value: sel.outcome }] : []),
      ]}
    />
  );
};

export default EpidemiologyV2;
