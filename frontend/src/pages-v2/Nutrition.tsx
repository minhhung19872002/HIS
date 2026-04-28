import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getDietOrders } from '../api/nutrition';
import { GenericListPage } from './_GenericListPage';

// Loose row type — backend DietOrderDto has slightly different shape than the
// frontend nutrition.ts type definition, and may arrive as flat List<T> or
// PagedResultDto<T>. Index access lets us tolerate both.
type Row = {
  id: string;
  orderCode?: string;
  patientName?: string;
  patientCode?: string;
  medicalRecordCode?: string;
  departmentName?: string;
  bedNumber?: string;
  dietType?: string;
  dietTypeName?: string;
  dietCategory?: string;
  texture?: string;
  consistency?: string;
  // backend uses camelCase: calorieLevel, proteinLevel
  calorieLevel?: number;
  proteinLevel?: number;
  // alternative shape
  energyKcal?: number;
  proteinGrams?: number;
  fluidMl?: number;
  feedingRoute?: string;
  mealFrequency?: number;
  restrictions?: string[] | string;
  allergies?: string[] | string;
  status?: string | number;
  statusName?: string;
  orderedBy?: string;
  orderedByName?: string;
  startDate?: string;
  endDate?: string;
};

const NutritionV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getDietOrders({ keyword, pageSize: 100 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const isActive = (s: string | number | undefined) => s === 'Active' || s === 1 || s === '1';
  const stats = useMemo(() => [
    { label: 'Đơn dinh dưỡng', value: items.length },
    { label: 'Hoạt động', value: items.filter((d) => isActive(d.status)).length, tone: 'ok' as const },
    { label: 'Đặc biệt', value: items.filter((d) => (d.feedingRoute || 'Oral').toLowerCase() !== 'oral').length, tone: 'warn' as const },
    { label: 'Có dị ứng', value: items.filter((d) => {
      const a = d.allergies; return Array.isArray(a) ? a.length > 0 : !!a;
    }).length, tone: 'cy' as const },
  ], [items]);

  const kcal = (r: Row) => r.energyKcal ?? r.calorieLevel ?? '—';
  const protein = (r: Row) => r.proteinGrams ?? r.proteinLevel ?? '—';
  const allergyText = (r: Row) => {
    const a = r.allergies; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };
  const restrictText = (r: Row) => {
    const a = r.restrictions; if (!a) return '—';
    return Array.isArray(a) ? (a.join(', ') || '—') : a;
  };

  return (
    <GenericListPage<Row>
      title="Dinh dưỡng — Đơn chế độ ăn" v1Path="/nutrition"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã đơn..."
      selectedId={sel?.id} onSelect={setSel}
      stats={stats}
      columns={[
        { key: 'code', label: 'Mã đơn', render: (r) => <span className="mono">{r.orderCode || ''}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName || '—'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.patientCode || r.medicalRecordCode || ''}</div></>
        ) },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}{r.bedNumber ? ` · ${r.bedNumber}` : ''}</span> },
        { key: 'diet', label: 'Loại', render: (r) => <span className="muted">{r.dietTypeName || r.dietType || '—'}</span> },
        { key: 'tex', label: 'Cấu trúc', render: (r) => <span className="muted">{r.texture || '—'}</span> },
        { key: 'kcal', label: 'kcal/Pro', render: (r) => <span className="mono">{kcal(r)} / {protein(r)}g</span> },
        { key: 'route', label: 'Đường', render: (r) => <span className="muted">{r.feedingRoute || 'Oral'}</span> },
        { key: 'status', label: 'TT', render: (r) => <span className={`chip ${isActive(r.status) ? 'ok' : 'ghost'}`}>{r.statusName || String(r.status || '—')}</span> },
      ]}
      detailTitle={sel?.orderCode || 'Chọn đơn'}
      detailFields={!sel ? null : [
        { label: 'Mã đơn', value: <span className="mono">{sel.orderCode || ''}</span> },
        { label: 'BN', value: `${sel.patientName || '—'}${sel.patientCode ? ' · ' + sel.patientCode : ''}` },
        { label: 'Khoa / Giường', value: `${sel.departmentName || '—'}${sel.bedNumber ? ' · ' + sel.bedNumber : ''}` },
        { label: 'Loại chế độ', value: sel.dietTypeName || sel.dietType || '—' },
        { label: 'Phân loại', value: sel.dietCategory || '—' },
        { label: 'Cấu trúc', value: sel.texture || '—' },
        { label: 'Năng lượng', value: <span className="mono">{kcal(sel)} kcal</span> },
        { label: 'Protein', value: <span className="mono">{protein(sel)} g</span> },
        ...(sel.fluidMl ? [{ label: 'Dịch', value: <span className="mono">{sel.fluidMl} ml</span> }] : []),
        { label: 'Đường nuôi', value: sel.feedingRoute || 'Oral' },
        { label: 'Hạn chế', value: restrictText(sel) },
        { label: 'Dị ứng', value: allergyText(sel) },
        { label: 'BS chỉ định', value: sel.orderedByName || sel.orderedBy || '—' },
        ...(sel.startDate ? [{ label: 'Bắt đầu', value: <span className="mono">{dayjs(sel.startDate).format('DD/MM/YYYY')}</span> }] : []),
      ]}
    />
  );
};

export default NutritionV2;
