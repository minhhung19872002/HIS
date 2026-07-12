import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, Form } from 'antd';
import type { AxiosError } from 'axios';
import systemApi from '../api/system';
import { applyServerErrors, type ServerValidationError } from '../../../utils/formError';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge, ModalShell, ActBtn, Btn, tk, te, cf,
  type ColumnDef,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';

// Row raw từ API — opaque dict để Antd Form setFieldsValue + truyền lại khi save
type CatalogRowRaw = Record<string, unknown>;
// Shape chung khi map các catalog read-only (services / icd / clinical-terms)
interface RawCatalogItem {
  id?: string; code?: string; name?: string;
  serviceType?: string; isActive?: boolean;
  chapterCode?: string;
  category?: string; bodySystem?: string;
}

/* Danh mục v2 — sidebar + table + CRUD. departments/medicines/clinical-terms có API ghi;
   services + ICD hiện chỉ đọc (chưa có API ghi). Validate: client (UX, focus) + BACKEND (authoritative). */

type CatalogKey = 'departments' | 'services' | 'medicines' | 'icd' | 'clinical-terms';
const WRITABLE: CatalogKey[] = ['departments', 'medicines', 'clinical-terms'];

const CATALOGS: { v: CatalogKey; l: string; ic: string }[] = [
  { v: 'departments',    l: 'Khoa / Phòng',   ic: 'building' },
  { v: 'services',       l: 'Dịch vụ KCB',    ic: 'list' },
  { v: 'medicines',      l: 'Danh mục thuốc', ic: 'pill' },
  { v: 'icd',            l: 'ICD-10',         ic: 'tag' },
  { v: 'clinical-terms', l: 'Thuật ngữ LS',   ic: 'book' },
];

interface CatalogRow { id?: string; code: string; name: string; meta?: string; isActive?: boolean; raw?: CatalogRowRaw; }

type FieldType = 'text' | 'number' | 'select';
interface FieldCfg { key: string; label: string; type?: FieldType; required?: boolean; options?: { value: string; label: string }[]; }
const FORM_FIELDS: Record<string, FieldCfg[]> = {
  departments: [
    { key: 'code', label: 'Mã', required: true },
    { key: 'name', label: 'Tên khoa/phòng', required: true },
    { key: 'departmentType', label: 'Loại', required: true, type: 'select', options: [
      { value: 'Clinical', label: 'Lâm sàng' }, { value: 'Paraclinical', label: 'Cận lâm sàng' },
      { value: 'Pharmacy', label: 'Dược' }, { value: 'Administrative', label: 'Hành chính' }] },
    { key: 'nameEnglish', label: 'Tên tiếng Anh' },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'location', label: 'Vị trí' },
  ],
  medicines: [
    { key: 'code', label: 'Mã thuốc', required: true },
    { key: 'name', label: 'Tên thuốc', required: true },
    { key: 'genericName', label: 'Tên gốc (generic)', required: true },
    { key: 'activeIngredient', label: 'Hoạt chất', required: true },
    { key: 'dosageForm', label: 'Dạng bào chế', required: true },
    { key: 'unit', label: 'Đơn vị', required: true },
    { key: 'concentration', label: 'Hàm lượng' },
  ],
  'clinical-terms': [
    { key: 'code', label: 'Mã', required: true },
    { key: 'name', label: 'Tên thuật ngữ', required: true },
    { key: 'category', label: 'Phân loại', required: true, type: 'select', options: [
      { value: 'Symptom', label: 'Triệu chứng' }, { value: 'Sign', label: 'Dấu hiệu' },
      { value: 'Examination', label: 'Thăm khám' }, { value: 'ReviewOfSystems', label: 'Hỏi bệnh' },
      { value: 'Procedure', label: 'Thủ thuật' }, { value: 'Other', label: 'Khác' }] },
    { key: 'bodySystem', label: 'Hệ cơ quan', type: 'select', options: ['General', 'Cardiovascular', 'Respiratory', 'GI', 'Neuro', 'MSK', 'Skin', 'ENT', 'Eye', 'Urogenital'].map((x) => ({ value: x, label: x })) },
    { key: 'description', label: 'Mô tả' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
  ],
};

async function loadCatalog(cat: CatalogKey, keyword?: string): Promise<CatalogRow[]> {
  if (cat === 'departments') {
    const r = await systemApi.catalog.getDepartments(keyword || undefined, undefined, true);
    return (r.data || []).map((d) => ({ id: d.id, code: d.code, name: d.name, meta: d.departmentType, isActive: true, raw: d as unknown as CatalogRowRaw }));
  }
  if (cat === 'services') {
    const r = await systemApi.catalog.getParaclinicalServices(keyword || undefined, undefined, true);
    const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
    return items.map((s) => ({ id: s.id, code: s.code || '', name: s.name || '', meta: s.serviceType, isActive: s.isActive, raw: s as CatalogRowRaw }));
  }
  if (cat === 'medicines') {
    const r = await systemApi.catalog.getMedicines({ keyword: keyword || undefined, isActive: true } as Parameters<typeof systemApi.catalog.getMedicines>[0]);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((m) => ({ id: m.id, code: m.code, name: m.name, meta: `${m.activeIngredient || ''} · ${m.unit || ''}`, isActive: m.isActive, raw: m as unknown as CatalogRowRaw }));
  }
  if (cat === 'icd') {
    const r = await systemApi.catalog.getICD10Codes(keyword || undefined, undefined, true);
    const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
    return items.map((i) => ({ id: i.id, code: i.code || '', name: i.name || '', meta: i.chapterCode, raw: i as CatalogRowRaw }));
  }
  const r = await systemApi.catalog.getClinicalTerms(keyword || undefined, undefined, undefined, true);
  const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
  return items.map((c) => ({ id: c.id, code: c.code || '', name: c.name || '', meta: `${c.category || ''} · ${c.bodySystem || ''}`, raw: c as CatalogRowRaw }));
}

const MasterDataV2: React.FC = () => {
  const [active, setActive] = useState<CatalogKey>('departments');
  const [keyword, setKeyword] = useState('');
  const [dataMap, setDataMap] = useState<Record<string, CatalogRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mF] = Form.useForm();

  const loadOne = async (cat: CatalogKey) => { try { const r = await loadCatalog(cat); setDataMap((m) => ({ ...m, [cat]: r })); } catch { /* keep */ } };
  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled(CATALOGS.map((c) => loadCatalog(c.v)));
    const map: Record<string, CatalogRow[]> = {};
    CATALOGS.forEach((c, i) => { const r = results[i]; map[c.v] = r.status === 'fulfilled' ? r.value : []; });
    setDataMap(map); setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const rows = dataMap[active] || [];
  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [rows, keyword]);
  const writable = WRITABLE.includes(active);

  // ─── CRUD (Antd Form: validate UX + focus; BACKEND authoritative) ───
  const openNew = () => { mF.resetFields(); setEditId(null); setModal('new'); };
  const openEdit = (r: CatalogRow) => { mF.resetFields(); mF.setFieldsValue(r.raw || { code: r.code, name: r.name }); setEditId(r.id || null); setModal('edit'); };
  const submit = async () => {
    let v: Record<string, unknown>;
    try { v = await mF.validateFields(); } catch { return; } // client UX: focus field lỗi
    if (editId) v.id = editId;
    setSaving(true);
    try {
      if (active === 'departments') await systemApi.catalog.saveDepartment(v as unknown as Parameters<typeof systemApi.catalog.saveDepartment>[0]);
      else if (active === 'medicines') await systemApi.catalog.saveMedicine(v as unknown as Parameters<typeof systemApi.catalog.saveMedicine>[0]);
      else if (active === 'clinical-terms') await systemApi.catalog.saveClinicalTerm({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof systemApi.catalog.saveClinicalTerm>[0]);
      tk(modal === 'new' ? 'Đã thêm' : 'Đã cập nhật'); setModal(null); loadOne(active);
    } catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      if (!applyServerErrors(mF, e)) te(ax?.response?.data?.message || 'Lưu thất bại');
    }
    finally { setSaving(false); }
  };
  const del = (r: CatalogRow) => {
    if (!r.id) { te('Thiếu ID'); return; }
    cf(`Xoá "${r.name}"?`, async () => {
      try {
        if (active === 'departments') await systemApi.catalog.deleteDepartment(r.id!);
        else if (active === 'medicines') await systemApi.catalog.deleteMedicine(r.id!);
        else if (active === 'clinical-terms') await systemApi.catalog.deleteClinicalTerm(r.id!);
        tk('Đã xoá'); loadOne(active);
      } catch { te('Xoá thất bại (có thể đang được dùng)'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

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
    { key: 'isActive', label: 'Trạng thái', width: 120, render: (r) => r.isActive === false ? <StatusBadge tone="warn">Tạm dừng</StatusBadge> : <StatusBadge tone="ok">Hoạt động</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />
      <div style={{ display: 'flex', flex: 1, minHeight: 0, borderTop: '1px solid var(--line)' }}>
        <div style={{ width: 230, flex: '0 0 230px', borderRight: '1px solid var(--line)', background: 'var(--d-1)', overflow: 'auto', padding: '10px 8px' }}>
          <div style={{ fontSize: 10.5, color: 'var(--t-2)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '4px 8px 8px' }}>Danh mục</div>
          {CATALOGS.map((c) => {
            const cnt = dataMap[c.v]?.length ?? 0; const on = active === c.v;
            return (
              <button key={c.v} type="button" onClick={() => { setActive(c.v); setKeyword(''); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-8)', padding: '9px 10px', marginBottom: 'var(--space-2)', borderRadius: 'var(--r-2)', cursor: 'pointer',
                  border: on ? '1px solid var(--a-cy-line)' : '1px solid transparent', background: on ? 'var(--a-cy-bg)' : 'transparent',
                  color: on ? 'var(--a-cy)' : 'var(--t-1)', fontSize: 12.5, fontWeight: on ? 600 : 500, textAlign: 'left' }}>
                <TermIcon name={c.ic} size={14} />
                <span style={{ flex: 1 }}>{c.l}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: on ? 'var(--a-cy)' : 'var(--t-2)' }}>{cnt}</span>
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="ab-tools">
            <SearchBox value={keyword} onChange={setKeyword} placeholder="Tìm trong danh mục theo mã / tên…" />
            <Btn variant="ghost" onClick={loadAll}><TermIcon name="refresh" size={12} /> Làm mới</Btn>
            <span className="spacer" />
            {writable ? <Btn variant="primary" onClick={openNew}>+ Thêm mới</Btn>
              : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Danh mục chỉ đọc (chưa có API ghi)</span>}
          </div>
          <DataTable<CatalogRow>
            columns={columns} data={filtered} rowKey={(r) => r.id || r.code}
            onRowClick={writable ? openEdit : undefined}
            actions={writable ? (r) => (<><ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} /><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} /></>) : undefined}
            empty={loading ? 'Đang tải…' : (<div className="ab-empty"><TermIcon name="search" size={20} /><div>Không có mục nào</div></div>)}
          />
        </div>
      </div>

      <ModalShell open={!!modal} onClose={() => setModal(null)}
        title={`${modal === 'new' ? 'Thêm' : 'Sửa'} — ${CATALOGS.find((c) => c.v === active)?.l}`} size="md"
        footer={<><Btn onClick={() => setModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submit}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={mF} layout="vertical" scrollToFirstError requiredMark>
          {(FORM_FIELDS[active] || []).map((f) => (
            <Form.Item key={f.key} name={f.key} label={f.label}
              rules={f.required ? [{ required: true, message: `Nhập ${f.label}` }] : undefined}>
              {f.type === 'select'
                ? <Select allowClear showSearch optionFilterProp="label" options={f.options} />
                : f.type === 'number'
                  ? <InputNumber style={{ width: '100%' }} />
                  : <Input disabled={modal === 'edit' && f.key === 'code'} />}
            </Form.Item>
          ))}
        </Form>
      </ModalShell>
    </div>
  );
};

export default MasterDataV2;
