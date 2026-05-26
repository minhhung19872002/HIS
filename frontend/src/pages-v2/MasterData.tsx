import React, { useEffect, useMemo, useState } from 'react';
import systemApi from '../api/system';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge,
  type ColumnDef,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Danh mục v2 — left-sidebar catalog nav + table (theo mock MasterData v2).
   Sidebar liệt kê các danh mục (kèm số mục); panel phải hiển thị bảng
   của danh mục đang chọn. Dữ liệu thật từ systemApi.catalog.
   ──────────────────────────────────────────────────────────── */

type CatalogKey = 'departments' | 'services' | 'medicines' | 'icd' | 'clinical-terms';

const CATALOGS: { v: CatalogKey; l: string; ic: string }[] = [
  { v: 'departments',    l: 'Khoa / Phòng',   ic: 'building' },
  { v: 'services',       l: 'Dịch vụ KCB',    ic: 'list' },
  { v: 'medicines',      l: 'Danh mục thuốc', ic: 'pill' },
  { v: 'icd',            l: 'ICD-10',         ic: 'tag' },
  { v: 'clinical-terms', l: 'Thuật ngữ LS',   ic: 'book' },
];

interface CatalogRow {
  id?: string;
  code: string;
  name: string;
  meta?: string;
  isActive?: boolean;
}

async function loadCatalog(cat: CatalogKey, keyword?: string): Promise<CatalogRow[]> {
  if (cat === 'departments') {
    const r = await systemApi.catalog.getDepartments(keyword || undefined, undefined, true);
    return (r.data || []).map((d) => ({ id: d.id, code: d.code, name: d.name, meta: d.departmentType, isActive: true }));
  }
  if (cat === 'services') {
    const r = await systemApi.catalog.getParaclinicalServices(keyword || undefined, undefined, true);
    const items = Array.isArray(r.data) ? r.data : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((s: any) => ({ id: s.id, code: s.code, name: s.name, meta: s.serviceType, isActive: s.isActive }));
  }
  if (cat === 'medicines') {
    const r = await systemApi.catalog.getMedicines({ keyword: keyword || undefined, isActive: true } as Parameters<typeof systemApi.catalog.getMedicines>[0]);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((m) => ({ id: m.id, code: m.code, name: m.name, meta: `${m.activeIngredient || ''} · ${m.unit || ''}`, isActive: m.isActive }));
  }
  if (cat === 'icd') {
    const r = await systemApi.catalog.getICD10Codes(keyword || undefined, undefined, true);
    const items = Array.isArray(r.data) ? r.data : [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return items.map((i: any) => ({ id: i.id, code: i.code, name: i.name, meta: i.chapterCode }));
  }
  const r = await systemApi.catalog.getClinicalTerms(keyword || undefined, undefined, undefined, true);
  const items = Array.isArray(r.data) ? r.data : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return items.map((c: any) => ({ id: c.id, code: c.code, name: c.name, meta: `${c.category || ''} · ${c.bodySystem || ''}` }));
}

const MasterDataV2: React.FC = () => {
  const [active, setActive] = useState<CatalogKey>('icd');
  const [keyword, setKeyword] = useState('');
  const [dataMap, setDataMap] = useState<Record<string, CatalogRow[]>>({});
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled(CATALOGS.map((c) => loadCatalog(c.v)));
    const map: Record<string, CatalogRow[]> = {};
    CATALOGS.forEach((c, i) => {
      const r = results[i];
      map[c.v] = r.status === 'fulfilled' ? r.value : [];
    });
    setDataMap(map);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const rows = dataMap[active] || [];
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, keyword]);

  const kpis = useMemo(() => [
    { lbl: 'Tổng mục', val: rows.length, sub: CATALOGS.find((c) => c.v === active)?.l },
    { lbl: 'Hoạt động', val: rows.filter((r) => r.isActive !== false).length, tone: 'ok' as const },
    { lbl: 'Tạm dừng', val: rows.filter((r) => r.isActive === false).length, tone: 'warn' as const },
    { lbl: 'Hiển thị', val: filtered.length, sub: 'sau lọc', tone: 'info' as const },
  ], [rows, filtered, active]);

  const columns: ColumnDef<CatalogRow>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, width: 160, render: (r) => r.code },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'meta', label: 'Phân loại / chú thích', render: (r) => r.meta || '—' },
    {
      key: 'isActive', label: 'Trạng thái', width: 130,
      render: (r) => r.isActive === false
        ? <StatusBadge tone="warn">Tạm dừng</StatusBadge>
        : <StatusBadge tone="ok">Hoạt động</StatusBadge>,
    },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, borderTop: '1px solid var(--line)' }}>
        {/* Left sidebar — catalog list */}
        <div style={{ width: 230, flex: '0 0 230px', borderRight: '1px solid var(--line)', background: 'var(--d-1)', overflow: 'auto', padding: '10px 8px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px 8px' }}>Danh mục</div>
          {CATALOGS.map((c) => {
            const cnt = dataMap[c.v]?.length ?? 0;
            const on = active === c.v;
            return (
              <button
                key={c.v}
                type="button"
                onClick={() => { setActive(c.v); setKeyword(''); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 10px', marginBottom: 2, borderRadius: 6, cursor: 'pointer',
                  border: on ? '1px solid var(--a-cy-line, #a5f3fc)' : '1px solid transparent',
                  background: on ? 'var(--a-cy-bg, #ecfeff)' : 'transparent',
                  color: on ? 'var(--a-cy)' : 'var(--t-1)',
                  fontSize: 12.5, fontWeight: on ? 600 : 500, textAlign: 'left',
                }}
              >
                <TermIcon name={c.ic} size={14} />
                <span style={{ flex: 1 }}>{c.l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: on ? 'var(--a-cy)' : 'var(--t-2)' }}>{cnt}</span>
              </button>
            );
          })}
        </div>

        {/* Right panel — selected catalog */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ab-tools">
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm trong danh mục theo mã / tên…" />
            <button type="button" className="ab-btn ghost" onClick={loadAll}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </button>
            <span className="spacer" />
            <span style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{filtered.length} mục</span>
          </div>
          <DataTable<CatalogRow>
            columns={columns}
            data={filtered}
            rowKey={(r) => r.id || r.code}
            empty={loading ? 'Đang tải…' : (
              <div className="ab-empty"><TermIcon name="search" size={20} /><div>Không có mục nào</div></div>
            )}
          />
        </div>
      </div>
    </div>
  );
};

export default MasterDataV2;
