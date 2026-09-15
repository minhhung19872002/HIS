import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, Switch, Upload, Form } from 'antd';
import systemApi from '../api/system';
import { administrativeCatalogApi } from '../../administration/api/administrativeCatalog';
import { applyServerErrors } from '../../../utils/formError';
import { friendlyErrorMessage } from '../../../utils/friendlyError';
import {
  KpiStrip, SearchBox, DataTable, StatusBadge, ModalShell, ActBtn, Btn, tk, te, tw, cf,
  type ColumnDef,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { RefreshButton } from '../../../components/actions';

// Row raw từ API — opaque dict để Antd Form setFieldsValue + truyền lại khi save
type CatalogRowRaw = Record<string, unknown>;
// Shape chung khi map các catalog read-only (services / icd / clinical-terms)
interface RawCatalogItem {
  id?: string; code?: string; name?: string;
  serviceType?: string; isActive?: boolean;
  chapterCode?: string;
  category?: string; bodySystem?: string;
}

/* Danh mục v2 — sidebar + table + CRUD. departments/medicines/clinical-terms
   + occupations/genders/admin-divisions/services/ICD có API ghi.
   Validate: client (UX, focus) + BACKEND (authoritative). Excel import: medicines + ICD. */

type CatalogKey = 'departments' | 'services' | 'medicines' | 'icd' | 'clinical-terms'
  | 'occupations' | 'genders' | 'admin-divisions' | 'countries' | 'healthcare-facilities';
const WRITABLE: CatalogKey[] = ['departments', 'services', 'medicines', 'icd', 'clinical-terms', 'occupations', 'genders', 'admin-divisions', 'countries', 'healthcare-facilities'];

const CATALOGS: { v: CatalogKey; l: string; ic: string }[] = [
  { v: 'departments',           l: 'Khoa / Phòng',   ic: 'building' },
  { v: 'services',              l: 'Dịch vụ KCB',    ic: 'list' },
  { v: 'medicines',             l: 'Danh mục thuốc', ic: 'pill' },
  { v: 'icd',                   l: 'ICD-10',         ic: 'tag' },
  { v: 'clinical-terms',        l: 'Thuật ngữ LS',   ic: 'book' },
  { v: 'occupations',           l: 'Nghề nghiệp',    ic: 'user' },
  { v: 'genders',               l: 'Giới tính',      ic: 'users' },
  { v: 'admin-divisions',       l: 'Tỉnh/Huyện/Xã',  ic: 'layers' },
  { v: 'countries',             l: 'Quốc gia',       ic: 'globe' },
  { v: 'healthcare-facilities', l: 'CSKCB',          ic: 'building' },
];

// Nhãn cấp đơn vị hành chính (verbatim v1 MasterData)
const DIVISION_LEVELS: Record<number, string> = { 1: 'Tỉnh/TP', 2: 'Quận/Huyện', 3: 'Phường/Xã' };

// Numeric codes stored in BE (sent/returned as strings).
// Services.ServiceType: 1-Khám (own catalog), 2-XN, 3-CĐHA, 4-TDCN, 5-PTTT.
const SERVICE_TYPE_OPTIONS = [
  { value: '2', label: 'Xét nghiệm' }, { value: '3', label: 'Chẩn đoán hình ảnh' },
  { value: '4', label: 'Thăm dò chức năng' }, { value: '5', label: 'Phẫu thuật / thủ thuật' },
];
// Departments.DepartmentType (DatabaseSeeder): 0-Hành chính, 1-Lâm sàng, 2-Cận lâm sàng, 3-Dược.
const DEPARTMENT_TYPE_OPTIONS = [
  { value: '1', label: 'Lâm sàng' }, { value: '2', label: 'Cận lâm sàng' },
  { value: '3', label: 'Dược' }, { value: '0', label: 'Hành chính' },
];
const optLabel = (opts: { value: string; label: string }[], v?: string) => opts.find((o) => o.value === String(v ?? ''))?.label ?? v;

interface CatalogRow { id?: string; code: string; name: string; meta?: string; isActive?: boolean; raw?: CatalogRowRaw; }

type FieldType = 'text' | 'number' | 'select' | 'switch';
interface FieldCfg { key: string; label: string; type?: FieldType; required?: boolean; options?: { value: string | number; label: string }[]; }
const FORM_FIELDS: Record<string, FieldCfg[]> = {
  services: [
    { key: 'code', label: 'Mã dịch vụ', required: true },
    { key: 'name', label: 'Tên dịch vụ', required: true },
    // BE Service.ServiceType is an int sent as string ("2".."5"); text values like 'Xray' were saved as 2 (XN).
    // departmentId / nameEnglish removed: the Service table has no such columns, the BE silently dropped them.
    { key: 'serviceType', label: 'Loại dịch vụ', required: true, type: 'select' as const, options: SERVICE_TYPE_OPTIONS },
    { key: 'unitPrice', label: 'Đơn giá (VNĐ)', required: true, type: 'number' as const },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' as const },
  ],
  icd: [
    { key: 'code', label: 'Mã ICD-10', required: true },
    { key: 'name', label: 'Tên bệnh (tiếng Việt)', required: true },
    { key: 'englishName', label: 'Tên bệnh (tiếng Anh)' }, // BE ICD10CatalogDto.EnglishName
    { key: 'chapterCode', label: 'Mã chương', required: true },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' as const },
  ],
  departments: [
    { key: 'code', label: 'Mã', required: true },
    { key: 'name', label: 'Tên khoa/phòng', required: true },
    // BE Department.DepartmentType is an int sent as string; text values were never parsed (create → 1, edit → unchanged).
    { key: 'departmentType', label: 'Loại', required: true, type: 'select', options: DEPARTMENT_TYPE_OPTIONS },
    { key: 'phone', label: 'Điện thoại' },
    { key: 'location', label: 'Vị trí' },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' },
  ],
  medicines: [
    { key: 'code', label: 'Mã thuốc', required: true },
    { key: 'name', label: 'Tên thuốc', required: true },
    // BE MedicineCatalogDto uses activeIngredientName; genericName has no column (was required yet discarded).
    { key: 'activeIngredientName', label: 'Hoạt chất', required: true },
    { key: 'dosageForm', label: 'Dạng bào chế', required: true },
    { key: 'unit', label: 'Đơn vị', required: true },
    { key: 'concentration', label: 'Hàm lượng' },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' },
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
  occupations: [
    { key: 'code', label: 'Mã nghề nghiệp', required: true },
    { key: 'name', label: 'Tên nghề nghiệp', required: true },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' },
  ],
  genders: [
    { key: 'code', label: 'Mã giới tính', required: true },
    { key: 'name', label: 'Tên giới tính', required: true },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' },
  ],
  'admin-divisions': [
    { key: 'code', label: 'Mã đơn vị', required: true },
    { key: 'name', label: 'Tên đơn vị', required: true },
    { key: 'level', label: 'Cấp', required: true, type: 'select' as const, options: [
      { value: 1, label: 'Tỉnh/Thành phố' }, { value: 2, label: 'Quận/Huyện' }, { value: 3, label: 'Phường/Xã' }] },
    { key: 'parentCode', label: 'Mã đơn vị cha' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' as const },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' as const },
  ],
  countries: [
    { key: 'code', label: 'Mã quốc gia', required: true },
    { key: 'name', label: 'Tên quốc gia', required: true },
    { key: 'nationalityName', label: 'Tên quốc tịch' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' as const },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' as const },
  ],
  'healthcare-facilities': [
    { key: 'code', label: 'Mã CSKCB', required: true },
    { key: 'name', label: 'Tên cơ sở', required: true },
    { key: 'level', label: 'Tuyến', type: 'select' as const, options: [
      { value: 'TW', label: 'Trung ương' }, { value: 'Tinh', label: 'Tỉnh' },
      { value: 'Huyen', label: 'Huyện' }, { value: 'Xa', label: 'Xã' }] },
    { key: 'address', label: 'Địa chỉ' },
    { key: 'provinceCode', label: 'Mã tỉnh' },
    { key: 'sortOrder', label: 'Thứ tự', type: 'number' as const },
    { key: 'isActive', label: 'Trạng thái', type: 'switch' as const },
  ],
};

interface DivisionFilter { level?: number; parentCode?: string; }

async function loadCatalog(cat: CatalogKey, keyword?: string, divFilter?: DivisionFilter): Promise<CatalogRow[]> {
  if (cat === 'occupations') {
    const r = await administrativeCatalogApi.getOccupations(keyword || undefined);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((o) => ({ id: o.id, code: o.code, name: o.name, meta: `Thứ tự ${o.sortOrder}`, isActive: o.isActive, raw: o as unknown as CatalogRowRaw }));
  }
  if (cat === 'genders') {
    const r = await administrativeCatalogApi.getGenders(keyword || undefined);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((g) => ({ id: g.id, code: g.code, name: g.name, meta: `Thứ tự ${g.sortOrder}`, isActive: g.isActive, raw: g as unknown as CatalogRowRaw }));
  }
  if (cat === 'admin-divisions') {
    const r = await administrativeCatalogApi.getAdministrativeDivisions(keyword || undefined, divFilter?.level, divFilter?.parentCode);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((d) => ({
      id: d.id, code: d.code, name: d.name,
      meta: `${DIVISION_LEVELS[d.level] || `Cấp ${d.level}`}${d.parentCode ? ` · cha: ${d.parentCode}` : ''}`,
      isActive: d.isActive, raw: d as unknown as CatalogRowRaw,
    }));
  }
  // Admin catalog lists include inactive rows (no isActive filter): with isActive=true a row switched
  // to "Tạm dừng" vanished from this screen and could never be re-activated.
  if (cat === 'departments') {
    const r = await systemApi.catalog.getDepartments(keyword || undefined, undefined, undefined);
    return (r.data || []).map((d) => ({ id: d.id, code: d.code, name: d.name, meta: optLabel(DEPARTMENT_TYPE_OPTIONS, d.departmentType), isActive: d.isActive, raw: d as unknown as CatalogRowRaw }));
  }
  if (cat === 'services') {
    const r = await systemApi.catalog.getParaclinicalServices(keyword || undefined, undefined, undefined);
    const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
    return items.map((s) => ({ id: s.id, code: s.code || '', name: s.name || '', meta: optLabel(SERVICE_TYPE_OPTIONS, s.serviceType), isActive: s.isActive, raw: s as CatalogRowRaw }));
  }
  if (cat === 'medicines') {
    const r = await systemApi.catalog.getMedicines({ keyword: keyword || undefined } as Parameters<typeof systemApi.catalog.getMedicines>[0]);
    const items = Array.isArray(r.data) ? r.data : [];
    // BE field is activeIngredientName (activeIngredient was always blank).
    return items.map((m) => ({ id: m.id, code: m.code, name: m.name, meta: `${(m as unknown as { activeIngredientName?: string }).activeIngredientName || ''} · ${m.unit || ''}`, isActive: m.isActive, raw: m as unknown as CatalogRowRaw }));
  }
  if (cat === 'icd') {
    const r = await systemApi.catalog.getICD10Codes(keyword || undefined, undefined, undefined);
    const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
    return items.map((i) => ({ id: i.id, code: i.code || '', name: i.name || '', meta: i.chapterCode, isActive: i.isActive, raw: i as CatalogRowRaw }));
  }
  if (cat === 'countries') {
    const r = await administrativeCatalogApi.getCountries(keyword || undefined);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((c) => ({ id: c.id, code: c.code, name: c.name, meta: c.nationalityName, isActive: c.isActive, raw: c as unknown as CatalogRowRaw }));
  }
  if (cat === 'healthcare-facilities') {
    const r = await administrativeCatalogApi.getHealthcareFacilities(keyword || undefined);
    const items = Array.isArray(r.data) ? r.data : [];
    return items.map((f) => ({ id: f.id, code: f.code, name: f.name, meta: `${f.level || ''} · ${f.address || ''}`, isActive: f.isActive, raw: f as unknown as CatalogRowRaw }));
  }
  const r = await systemApi.catalog.getClinicalTerms(keyword || undefined, undefined, undefined, undefined);
  const items: RawCatalogItem[] = Array.isArray(r.data) ? r.data : [];
  return items.map((c) => ({ id: c.id, code: c.code || '', name: c.name || '', meta: `${c.category || ''} · ${c.bodySystem || ''}`, isActive: c.isActive, raw: c as CatalogRowRaw }));
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

  const loadOne = async (cat: CatalogKey) => {
    try { const r = await loadCatalog(cat); setDataMap((m) => ({ ...m, [cat]: r })); }
    catch { tw('Không tải lại được danh mục — dữ liệu hiển thị có thể chưa cập nhật'); }
  };
  const loadAll = async () => {
    setLoading(true);
    const results = await Promise.allSettled(CATALOGS.map((c) => loadCatalog(c.v)));
    const map: Record<string, CatalogRow[]> = {};
    let hasFailure = false;
    CATALOGS.forEach((c, i) => {
      const r = results[i];
      map[c.v] = r.status === 'fulfilled' ? r.value : [];
      if (r.status === 'rejected') hasFailure = true;
    });
    setDataMap(map); setLoading(false);
    if (hasFailure) tw('Một số danh mục tải không thành công — vui lòng thử làm mới lại');
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
  const openNew = () => { mF.resetFields(); mF.setFieldsValue({ isActive: true }); setEditId(null); setModal('new'); };
  const openEdit = (r: CatalogRow) => { mF.resetFields(); mF.setFieldsValue(r.raw || { code: r.code, name: r.name }); setEditId(r.id || null); setModal('edit'); };
  const submit = async () => {
    let v: Record<string, unknown>;
    try { v = await mF.validateFields(); } catch { return; } // client UX: focus field lỗi
    // validateFields() only returns the fields rendered in the form. The BE save endpoints overwrite every
    // column (BHYT code, prices, registration no., parent…), so an edit must start from the loaded row.
    const editedRaw = editId ? (rows.find((x) => x.id === editId)?.raw ?? {}) : {};
    v = { ...editedRaw, ...v };
    if (editId) v.id = editId;
    setSaving(true);
    try {
      if (active === 'departments') await systemApi.catalog.saveDepartment(v as unknown as Parameters<typeof systemApi.catalog.saveDepartment>[0]);
      else if (active === 'services') await systemApi.catalog.saveParaclinicalService({ isActive: true, unitPrice: 0, ...v } as unknown as Parameters<typeof systemApi.catalog.saveParaclinicalService>[0]);
      else if (active === 'medicines') await systemApi.catalog.saveMedicine(v as unknown as Parameters<typeof systemApi.catalog.saveMedicine>[0]);
      else if (active === 'icd') await systemApi.catalog.saveICD10Code({ isReportable: false, isActive: true, ...v } as unknown as Parameters<typeof systemApi.catalog.saveICD10Code>[0]);
      else if (active === 'clinical-terms') await systemApi.catalog.saveClinicalTerm({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof systemApi.catalog.saveClinicalTerm>[0]);
      else if (active === 'occupations') await administrativeCatalogApi.saveOccupation({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof administrativeCatalogApi.saveOccupation>[0]);
      else if (active === 'genders') await administrativeCatalogApi.saveGender({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof administrativeCatalogApi.saveGender>[0]);
      else if (active === 'admin-divisions') await administrativeCatalogApi.saveAdministrativeDivision({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof administrativeCatalogApi.saveAdministrativeDivision>[0]);
      else if (active === 'countries') await administrativeCatalogApi.saveCountry({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof administrativeCatalogApi.saveCountry>[0]);
      else if (active === 'healthcare-facilities') await administrativeCatalogApi.saveHealthcareFacility({ sortOrder: 0, isActive: true, ...v } as unknown as Parameters<typeof administrativeCatalogApi.saveHealthcareFacility>[0]);
      else { te('Danh mục này chưa hỗ trợ ghi'); return; }
      tk(modal === 'new' ? 'Đã thêm' : 'Đã cập nhật'); setModal(null); loadOne(active);
    } catch (e: unknown) {
      if (!applyServerErrors(mF, e)) te(friendlyErrorMessage(e, 'Lưu thất bại'));
    }
    finally { setSaving(false); }
  };
  const del = (r: CatalogRow) => {
    if (!r.id) { te('Thiếu ID'); return; }
    cf(`Xoá "${r.name}"?`, async () => {
      try {
        if (active === 'departments') await systemApi.catalog.deleteDepartment(r.id!);
        else if (active === 'services') await systemApi.catalog.deleteParaclinicalService(r.id!);
        else if (active === 'medicines') await systemApi.catalog.deleteMedicine(r.id!);
        else if (active === 'icd') await systemApi.catalog.deleteICD10Code(r.id!);
        else if (active === 'clinical-terms') await systemApi.catalog.deleteClinicalTerm(r.id!);
        else if (active === 'occupations') await administrativeCatalogApi.deleteOccupation(r.id!);
        else if (active === 'genders') await administrativeCatalogApi.deleteGender(r.id!);
        else if (active === 'admin-divisions') await administrativeCatalogApi.deleteAdministrativeDivision(r.id!);
        else if (active === 'countries') await administrativeCatalogApi.deleteCountry(r.id!);
        else if (active === 'healthcare-facilities') await administrativeCatalogApi.deleteHealthcareFacility(r.id!);
        else { te('Danh mục này chưa hỗ trợ xoá'); return; }
        tk('Đã xoá'); loadOne(active);
      } catch { te('Xoá thất bại (có thể đang được dùng)'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  // Excel import (medicines/ICD-10) — verbatim v1 handleImportExcel: gửi arrayBuffer,
  // báo warning nếu backend xử lý nhưng không có dòng nào được nhập.
  const [importing, setImporting] = useState(false);
  const handleImportExcel = async (file: File, type: 'medicines' | 'icd') => {
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = type === 'medicines'
        ? await systemApi.catalog.importMedicines(arrayBuffer)
        : await systemApi.catalog.importICD10(arrayBuffer);
      if (result.data) tk(type === 'medicines' ? 'Nhập danh mục thuốc từ Excel thành công' : 'Nhập danh mục ICD-10 từ Excel thành công');
      else tw('Tệp đã được xử lý nhưng không có dữ liệu nào được nhập');
      loadOne(type === 'medicines' ? 'medicines' : 'icd');
    } catch {
      tw('Nhập Excel thất bại. Vui lòng kiểm tra định dạng tệp và thử lại.');
    } finally {
      setImporting(false);
    }
    return false; // ngăn Upload tự upload mặc định
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
            <RefreshButton onRefresh={loadAll} loading={loading} />
            <span className="spacer" />
            {(active === 'medicines' || active === 'icd') && (
              // BE import parses tab-separated text (header row + code, name, …); there is no .xlsx parser,
              // so a binary .xlsx imported 0 rows. Excel: "Lưu thành → Text (Tab delimited)".
              <Upload
                accept=".txt,.tsv"
                showUploadList={false}
                disabled={importing}
                beforeUpload={(f) => handleImportExcel(f, active === 'medicines' ? 'medicines' : 'icd')}
              >
                <Btn variant="ghost" disabled={importing} title="Tệp văn bản phân tách Tab (Excel: Lưu thành → Text (Tab delimited))">
                  <TermIcon name="upload" size={12} /> {importing ? 'Đang nhập…' : 'Nhập tệp (TSV)'}
                </Btn>
              </Upload>
            )}
            {writable ? <Btn variant="primary" onClick={openNew}>+ Thêm mới</Btn>
              : <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Danh mục chỉ đọc (chưa có API ghi)</span>}
          </div>
          <DataTable<CatalogRow>
            columns={columns} data={filtered} rowKey={(r) => r.id || r.code} loading={loading}
            onRowClick={writable ? openEdit : undefined}
            actions={writable ? (r) => (<div className="ab-actions"><ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} /><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} /></div>) : undefined}
            empty={loading ? 'Đang tải…' : (<div className="ab-empty"><TermIcon name="search" size={20} /><div>Không có mục nào</div></div>)}
          />
        </div>
      </div>

      <ModalShell open={!!modal} onClose={() => setModal(null)}
        title={`${modal === 'new' ? 'Thêm' : 'Sửa'} — ${CATALOGS.find((c) => c.v === active)?.l}`} size="md"
        footer={<><Btn onClick={() => setModal(null)}>Huỷ</Btn><Btn variant="primary" loading={saving} onClick={submit}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={mF} layout="vertical" scrollToFirstError requiredMark>
          {(FORM_FIELDS[active] || []).map((f) => (
            <Form.Item key={f.key} name={f.key} label={f.label}
              valuePropName={f.type === 'switch' ? 'checked' : undefined}
              rules={f.required ? [{ required: true, message: `Nhập ${f.label}` }] : undefined}>
              {f.type === 'select'
                ? <Select allowClear showSearch optionFilterProp="label" options={f.options} />
                : f.type === 'number'
                  ? <InputNumber style={{ width: '100%' }} />
                  : f.type === 'switch'
                    // Was rendered as a text Input: new rows were sent with isActive undefined → saved INACTIVE.
                    ? <Switch checkedChildren="Hoạt động" unCheckedChildren="Tạm dừng" />
                    : <Input disabled={modal === 'edit' && f.key === 'code'} />}
            </Form.Item>
          ))}
        </Form>
      </ModalShell>
    </div>
  );
};

export default MasterDataV2;
