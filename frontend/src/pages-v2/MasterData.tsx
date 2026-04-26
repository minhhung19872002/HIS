import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import systemApi from '../api/system';
import TermIcon from '../layouts/terminal/Icon';

type CatalogTab = 'departments' | 'services' | 'medicines' | 'icd' | 'clinical-terms';

const TABS: { key: CatalogTab; label: string; icon: string }[] = [
  { key: 'departments',   label: 'Khoa / Phòng',         icon: 'building' },
  { key: 'services',      label: 'Dịch vụ',              icon: 'list' },
  { key: 'medicines',     label: 'Thuốc',                 icon: 'pill' },
  { key: 'icd',           label: 'ICD-10',               icon: 'tag' },
  { key: 'clinical-terms', label: 'Thuật ngữ LS',         icon: 'book' },
];

interface CatalogRow {
  id?: string;
  code: string;
  name: string;
  meta?: string;
  isActive?: boolean;
}

const MasterDataV2: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<CatalogTab>('departments');
  const [keyword, setKeyword] = useState('');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      let mapped: CatalogRow[] = [];
      if (tab === 'departments') {
        const r = await systemApi.catalog.getDepartments(keyword || undefined, undefined, true);
        mapped = (r.data || []).map((d) => ({ id: d.id, code: d.code, name: d.name, meta: d.departmentType, isActive: true }));
      } else if (tab === 'services') {
        const r = await systemApi.catalog.getParaclinicalServices(keyword || undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((s: { id?: string; code: string; name: string; serviceType?: string; isActive?: boolean }) => ({ id: s.id, code: s.code, name: s.name, meta: s.serviceType, isActive: s.isActive }));
      } else if (tab === 'medicines') {
        const r = await systemApi.catalog.getMedicines({ keyword: keyword || undefined, isActive: true } as Parameters<typeof systemApi.catalog.getMedicines>[0]);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((m) => ({ id: m.id, code: m.code, name: m.name, meta: `${m.activeIngredient || ''} · ${m.unit || ''}`, isActive: m.isActive }));
      } else if (tab === 'icd') {
        const r = await systemApi.catalog.getICD10Codes(keyword || undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((i: { id?: string; code: string; name: string; chapterCode?: string }) => ({ id: i.id, code: i.code, name: i.name, meta: i.chapterCode }));
      } else if (tab === 'clinical-terms') {
        const r = await systemApi.catalog.getClinicalTerms(keyword || undefined, undefined, undefined, true);
        const items = Array.isArray(r.data) ? r.data : [];
        mapped = items.map((c: { id?: string; code: string; name: string; category?: string; bodySystem?: string }) => ({ id: c.id, code: c.code, name: c.name, meta: `${c.category || ''} · ${c.bodySystem || ''}` }));
      }
      setRows(mapped);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, height: '100%', minHeight: 0 }}>
      {/* Sidebar */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h"><span className="title">Danh mục</span></div>
        <div className="panel-body" style={{ padding: 4 }}>
          {TABS.map((t) => (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 2,
                background: tab === t.key ? 'var(--a-cy-bg)' : 'transparent',
                color: tab === t.key ? 'var(--a-cy)' : 'var(--t-1)',
                fontWeight: tab === t.key ? 500 : 400,
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <TermIcon name={t.icon} size={14} />
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">{TABS.find((t) => t.key === tab)?.label}</span>
          <span className="sub">· {rows.length} mục</span>
          <div className="actions">
            <input
              className="input" style={{ width: 240 }}
              placeholder="Tìm theo mã / tên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/master-data')}>
              <TermIcon name="layers" size={12} />Quản lý chi tiết
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : rows.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có mục nào</div>
            : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Phân loại / chú thích</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id || i}>
                    <td className="mono">{r.code}</td>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td className="muted">{r.meta || '—'}</td>
                    <td>
                      {r.isActive === false
                        ? <span className="chip ghost">Tạm dừng</span>
                        : <span className="chip ok">Hoạt động</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MasterDataV2;
