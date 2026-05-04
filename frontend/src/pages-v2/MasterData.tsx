import React, { useCallback, useEffect, useMemo, useState } from 'react';
import systemApi from '../api/system';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, StatusBadge,
  type ColumnDef, type TopTab,
} from './_v2kit';

type CatalogTab = 'departments' | 'services' | 'medicines' | 'icd' | 'clinical-terms';

const TABS: TopTab<CatalogTab>[] = [
  { v: 'departments',    l: 'Khoa / Phòng',  ic: 'building' },
  { v: 'services',       l: 'Dịch vụ',       ic: 'list' },
  { v: 'medicines',      l: 'Thuốc',         ic: 'pill' },
  { v: 'icd',            l: 'ICD-10',        ic: 'tag' },
  { v: 'clinical-terms', l: 'Thuật ngữ LS',  ic: 'book' },
];

interface CatalogRow {
  id?: string;
  code: string;
  name: string;
  meta?: string;
  isActive?: boolean;
}

const MasterDataV2: React.FC = () => {
  const [tab, setTab] = useState<CatalogTab>('departments');
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let mapped: CatalogRow[] = [];
      if (tab === 'departments') {
        const r = await systemApi.catalog.getDepartments(keyword || undefined, undefined, true);
        mapped = (r.data || []).map((d) => ({ id: d.id, code: d.code, name: d.name, meta: d.departmentType, isActive: true }));
      } else if (tab === 'services') {
        const r = await systemApi.catalog.getParaclinicalServices(keyword || undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((s: { id?: string; code: string; name: string; serviceType?: string; isActive?: boolean }) =>
          ({ id: s.id, code: s.code, name: s.name, meta: s.serviceType, isActive: s.isActive }));
      } else if (tab === 'medicines') {
        const r = await systemApi.catalog.getMedicines({ keyword: keyword || undefined, isActive: true } as Parameters<typeof systemApi.catalog.getMedicines>[0]);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((m) => ({ id: m.id, code: m.code, name: m.name, meta: `${m.activeIngredient || ''} · ${m.unit || ''}`, isActive: m.isActive }));
      } else if (tab === 'icd') {
        const r = await systemApi.catalog.getICD10Codes(keyword || undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((i: { id?: string; code: string; name: string; chapterCode?: string }) =>
          ({ id: i.id, code: i.code, name: i.name, meta: i.chapterCode }));
      } else if (tab === 'clinical-terms') {
        const r = await systemApi.catalog.getClinicalTerms(keyword || undefined, undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((c: { id?: string; code: string; name: string; category?: string; bodySystem?: string }) =>
          ({ id: c.id, code: c.code, name: c.name, meta: `${c.category || ''} · ${c.bodySystem || ''}` }));
      }
      setRows(mapped);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [tab, keyword]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, keyword]);

  const kpis = useMemo(() => [
    { lbl: 'Tổng mục',   val: rows.length },
    { lbl: 'Hoạt động',  val: rows.filter((r) => r.isActive !== false).length, tone: 'ok' as const },
    { lbl: 'Tạm dừng',   val: rows.filter((r) => r.isActive === false).length, tone: 'warn' as const },
    { lbl: 'Đang xem',   val: TABS.find((t) => t.v === tab)?.l ?? '', tone: 'info' as const },
  ], [rows, tab]);

  const columns: ColumnDef<CatalogRow>[] = [
    { key: 'code', label: 'Mã',     mono: true, code: true,
      render: (r) => r.code },
    { key: 'name', label: 'Tên',
      render: (r) => r.name },
    { key: 'meta', label: 'Phân loại / chú thích',
      render: (r) => r.meta || '—' },
    { key: 'isActive', label: 'Trạng thái',
      render: (r) => r.isActive === false
        ? <StatusBadge tone="warn">Tạm dừng</StatusBadge>
        : <StatusBadge tone="ok">Hoạt động</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm theo mã / tên…" />
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={load}>Làm mới</button>
      </div>

      <DataTable<CatalogRow>
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id || r.code}
        empty={loading ? 'Đang tải…' : 'Không có mục nào'}
      />
    </div>
  );
};

export default MasterDataV2;
