/* =====================================================================
 * EmrDataTags v2 — Cấu hình Thẻ dữ liệu (Data Tag) EMR (#86 / F8.4)
 * Quản trị danh mục thẻ dữ liệu: tên/kiểu/mặc định/phân loại + gán vào
 * loại tờ phiếu (FormType). Backend sẵn: EmrManagementController data-tags.
 * ===================================================================== */
import { useState, useEffect, useCallback } from 'react';
import {
  KpiStrip, DataTable, StatusBadge, ActBtn, Btn, ModalShell, SearchBox,
  tk, te, cf, type ColumnDef,
} from './_v2kit';
import { getEmrDataTags, saveEmrDataTag, deleteEmrDataTag, type EmrDataTagDto } from '../api/emrManagement';

// Kiểu dữ liệu thẻ — khớp comment entity EmrDataTag.DataType
const DATA_TYPES = [
  { v: 'Text', l: 'Văn bản' },
  { v: 'Number', l: 'Số' },
  { v: 'Date', l: 'Ngày' },
  { v: 'Boolean', l: 'Đúng/Sai' },
  { v: 'List', l: 'Danh sách' },
];
const dataTypeLabel = (v: string) => DATA_TYPES.find((d) => d.v === v)?.l || v || '—';

interface TagForm {
  id?: string; code: string; name: string; dataType: string;
  defaultValue: string; category: string; formType: string; sortOrder: number;
}
const EMPTY_FORM: TagForm = { code: '', name: '', dataType: 'Text', defaultValue: '', category: '', formType: '', sortOrder: 0 };

const EmrDataTagsV2 = () => {
  const [tags, setTags] = useState<EmrDataTagDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [kw, setKw] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<TagForm>(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getEmrDataTags();
      setTags(Array.isArray(r.data) ? r.data : []);
    } catch { setTags([]); te('Không tải được danh mục thẻ dữ liệu'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (t: EmrDataTagDto) => {
    setForm({
      id: t.id, code: t.code || '', name: t.name, dataType: t.dataType || 'Text',
      defaultValue: t.defaultValue || '', category: t.category || '', formType: t.formType || '',
      sortOrder: t.sortOrder ?? 0,
    });
    setModalOpen(true);
  };

  const submit = async () => {
    if (!form.name.trim()) { te('Nhập tên thẻ'); return; }
    setSaving(true);
    try {
      await saveEmrDataTag({
        id: form.id,
        code: form.code.trim() || undefined,
        name: form.name.trim(),
        dataType: form.dataType,
        defaultValue: form.defaultValue.trim() || undefined,
        category: form.category.trim() || undefined,
        formType: form.formType.trim() || undefined,
        sortOrder: form.sortOrder || 0,
      });
      tk(form.id ? 'Đã cập nhật thẻ dữ liệu' : 'Đã thêm thẻ dữ liệu');
      setModalOpen(false);
      load();
    } catch { te('Lưu thẻ thất bại'); }
    finally { setSaving(false); }
  };

  const doDelete = (t: EmrDataTagDto) => {
    if (t.isSystem) { te('Thẻ hệ thống không thể xóa'); return; }
    cf(`Xóa thẻ dữ liệu "${t.name}"?`, async () => {
      try { await deleteEmrDataTag(t.id); tk('Đã xóa thẻ'); load(); }
      catch { te('Xóa thất bại'); }
    }, { tone: 'crit', confirm: 'Xóa' });
  };

  const filtered = tags.filter((t) =>
    !kw.trim() || `${t.name} ${t.code ?? ''} ${t.category ?? ''} ${t.formType ?? ''}`.toLowerCase().includes(kw.toLowerCase()));

  const kpis = [
    { lbl: 'Tổng thẻ', val: tags.length, tone: 'info' as const },
    { lbl: 'Đang dùng', val: tags.filter((t) => t.isActive).length, tone: 'ok' as const },
    { lbl: 'Thẻ hệ thống', val: tags.filter((t) => t.isSystem).length, tone: 'warn' as const },
  ];

  const columns: ColumnDef<EmrDataTagDto>[] = [
    { key: 'name', label: 'Tên thẻ', render: (t) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <b>{t.name}</b>
        {t.isSystem && <StatusBadge tone="info">Hệ thống</StatusBadge>}
      </span>
    ) },
    { key: 'code', label: 'Mã', mono: true, render: (t) => t.code || '—' },
    { key: 'dataType', label: 'Kiểu', render: (t) => dataTypeLabel(t.dataType) },
    { key: 'defaultValue', label: 'Mặc định', render: (t) => t.defaultValue || '—' },
    { key: 'category', label: 'Phân loại', render: (t) => t.category || '—' },
    { key: 'formType', label: 'Gán vào mẫu', render: (t) => t.formType || 'Mọi mẫu' },
    { key: 'isActive', label: 'Trạng thái', render: (t) => <StatusBadge tone={t.isActive ? 'ok' : 'warn'} dot>{t.isActive ? 'Hoạt động' : 'Ngừng'}</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <SearchBox value={kw} onChange={setKw} placeholder="Tìm thẻ theo tên / mã / mẫu…" />
        <span className="spacer" />
        <Btn icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm thẻ</Btn>
      </div>

      <DataTable<EmrDataTagDto>
        columns={columns}
        data={filtered}
        rowKey={(t) => t.id}
        onRowClick={openEdit}
        actions={(t) => (
          <>
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(t)} />
            <ActBtn ic="trash" title={t.isSystem ? 'Thẻ hệ thống — không xóa' : 'Xóa'} tone="crit" onClick={() => doDelete(t)} />
          </>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">Chưa có thẻ dữ liệu nào — bấm “Thêm thẻ”.</div>
        )}
      />

      <ModalShell
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? 'Sửa thẻ dữ liệu' : 'Thêm thẻ dữ liệu'}
        size="md"
        footer={
          <>
            <Btn variant="ghost" onClick={() => setModalOpen(false)}>Hủy</Btn>
            <span style={{ flex: 1 }} />
            <Btn variant="primary" icon="check" loading={saving} onClick={submit}>Lưu</Btn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ fontSize: 12.5, flex: 2 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Tên thẻ *</div>
              <input className="ed-fld" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Mã thẻ</div>
              <input className="ed-fld" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="VD: DX_MAIN" style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Kiểu dữ liệu</div>
              <select className="ed-fld" value={form.dataType} onChange={(e) => setForm({ ...form, dataType: e.target.value })} style={{ width: '100%' }}>
                {DATA_TYPES.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Giá trị mặc định</div>
              <input className="ed-fld" value={form.defaultValue} onChange={(e) => setForm({ ...form, defaultValue: e.target.value })} style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Phân loại</div>
              <input className="ed-fld" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="VD: Chẩn đoán, Hành chính…" style={{ width: '100%' }} />
            </label>
            <label style={{ fontSize: 12.5, flex: 1 }}>
              <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Gán vào mẫu (loại tờ phiếu)</div>
              <input className="ed-fld" value={form.formType} onChange={(e) => setForm({ ...form, formType: e.target.value })} placeholder="Để trống = mọi mẫu" style={{ width: '100%' }} />
            </label>
          </div>
          <label style={{ fontSize: 12.5, width: 140 }}>
            <div style={{ marginBottom: 4, color: 'var(--t-1)' }}>Thứ tự sắp xếp</div>
            <input type="number" className="ed-fld" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} style={{ width: '100%' }} />
          </label>
        </div>
      </ModalShell>
    </div>
  );
};

export default EmrDataTagsV2;
