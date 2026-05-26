// =====================================================================
// HIS Terminal · BỆNH ÁN CHUYÊN KHOA (Specialty EMR) — v2
// List + KPI + status tabs + detail drawer + form tạo/sửa HSBA (27 CK,
// field động). Bound to /api/specialty-emr (search/get/save/delete/pdf/xml).
// Field config dùng chung từ ../constants/specialtyEmr.
// =====================================================================
import React, { useEffect, useMemo, useState } from 'react';
import { Input, InputNumber, Select, Checkbox, DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import client from '../api/client';
import { useRegisterCommands } from '../contexts/CommandContext';
import {
  SPECIALTY_TYPES, SPECIALTY_FIELDS, SPECIALTY_LABEL, type FieldDef,
} from '../constants/specialtyEmr';
import {
  KpiStrip, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

// Backend SpecialtyEmrDto (api/specialty-emr) — fieldData is a JSON string.
interface SpecialtyRecord {
  id: string;
  patientId: string;
  patientCode: string;
  patientName: string;
  specialtyType: string;
  specialtyTypeName: string;
  recordDate: string;
  doctorName: string;
  departmentName: string;
  icdCode: string;
  icdName: string;
  fieldData: string;
  status: number;
  statusName: string;
  createdAt: string;
}

interface FormState {
  id?: string;
  patientId?: string;
  patientCode: string;
  patientName: string;
  specialtyType: string;
  recordDate: Dayjs | null;
  doctorName: string;
  departmentName: string;
  icdCode: string;
  icdName: string;
  status: number;
  fieldData: Record<string, unknown>;
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

// Backend Status: 0=Nháp, 1=Hoàn thành, 2=Đã ký
type StatusKey = 'draft' | 'done' | 'signed';
const STATUS_TABS = [
  { v: 'draft' as StatusKey,  l: 'Nháp',       tone: 'warn' as const },
  { v: 'done' as StatusKey,   l: 'Hoàn thành', tone: 'info' as const },
  { v: 'signed' as StatusKey, l: 'Đã ký',      tone: 'ok' as const },
];
const statusKey = (n: number): StatusKey => (n === 0 ? 'draft' : n === 2 ? 'signed' : 'done');
const statusTone = (n: number): 'warn' | 'ok' | 'info' => (n === 0 ? 'warn' : n === 2 ? 'ok' : 'info');
const STATUS_OPTIONS = [
  { value: 0, label: 'Nháp' },
  { value: 1, label: 'Hoàn thành' },
  { value: 2, label: 'Đã ký' },
];
const PER = 18;

const parseFieldData = (s: string | undefined | null): Record<string, unknown> => {
  if (!s) return {};
  try { const o = JSON.parse(s); return o && typeof o === 'object' ? (o as Record<string, unknown>) : {}; }
  catch { return {}; }
};

const specialtyLabel = (r: SpecialtyRecord): string =>
  SPECIALTY_LABEL[r.specialtyType] || r.specialtyTypeName || r.specialtyType;

// Render a single dynamic field as a controlled v2 input.
const FormField: React.FC<{ field: FieldDef; value: unknown; onChange: (v: unknown) => void }> = ({ field, value, onChange }) => {
  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={field.rows || 2} placeholder={field.placeholder} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <InputNumber min={field.min} max={field.max} step={field.step} addonAfter={field.addonAfter} style={{ width: '100%' }} value={value as number ?? undefined} onChange={(v) => onChange(v)} />;
    case 'select':
      return <Select allowClear placeholder={field.placeholder || 'Chọn'} options={field.options} style={{ width: '100%' }} value={(value as string) || undefined} onChange={(v) => onChange(v)} />;
    case 'multiselect':
      return <Select mode="multiple" placeholder={field.placeholder || 'Chọn'} options={field.options} style={{ width: '100%' }} value={(value as string[]) || []} onChange={(v) => onChange(v)} />;
    case 'tags':
      return <Select mode="tags" placeholder={field.placeholder || 'Nhập'} options={field.options} style={{ width: '100%' }} value={(value as string[]) || []} onChange={(v) => onChange(v)} />;
    case 'checkbox':
      return <Checkbox.Group options={field.options} value={(value as string[]) || []} onChange={(v) => onChange(v)} />;
    case 'text':
    default:
      return <Input placeholder={field.placeholder} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} />;
  }
};

// Format a stored field value for read-only display.
const fmtFieldVal = (field: FieldDef, value: unknown): string => {
  if (value == null || value === '') return '—';
  const labelOf = (val: string) => field.options?.find((o) => o.value === val)?.label || val;
  if (Array.isArray(value)) return value.map((v) => labelOf(String(v))).join(', ') || '—';
  if (field.type === 'select') return labelOf(String(value));
  return String(value);
};

const SpecialtyEMRV2: React.FC = () => {
  const [items, setItems] = useState<SpecialtyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fSpec, setFSpec] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<SpecialtyRecord | null>(null);   // detail drawer
  const [form, setForm] = useState<FormState | null>(null);       // create/edit drawer
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get('/specialty-emr/search', { params: { pageIndex: 0, pageSize: 200 } });
      const body = res.data;
      const data = (Array.isArray(body) ? body : body?.items || body?.data || []) as Partial<SpecialtyRecord>[];
      const rows: SpecialtyRecord[] = data.map((r, i) => ({
        id: r.id || `r-${i}`,
        patientId: r.patientId || '',
        patientCode: r.patientCode || '',
        patientName: r.patientName || '',
        specialtyType: r.specialtyType || '',
        specialtyTypeName: r.specialtyTypeName || '',
        recordDate: r.recordDate || '',
        doctorName: r.doctorName || '',
        departmentName: r.departmentName || '',
        icdCode: r.icdCode || '',
        icdName: r.icdName || '',
        fieldData: r.fieldData || '{}',
        status: r.status ?? 1,
        statusName: r.statusName || '',
        createdAt: r.createdAt || '',
      }));
      setItems(rows);
    } catch { setItems([]); ti('Không tải được hồ sơ chuyên khoa'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fSpec && r.specialtyType !== fSpec) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.icdCode, r.icdName, specialtyLabel(r)]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fSpec]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const bySpecialty = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((r) => { const l = specialtyLabel(r); map.set(l, (map.get(l) || 0) + 1); });
    return Array.from(map.entries())
      .map(([l, n]) => ({ l, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [items]);

  const last7d = items.filter((r) => r.recordDate && dayjs(r.recordDate).isAfter(dayjs().subtract(7, 'day'))).length;

  // ── create / edit ───────────────────────────────────────────────
  const openCreate = () => {
    setForm({
      patientCode: '', patientName: '', specialtyType: 'surgical',
      recordDate: dayjs(), doctorName: '', departmentName: '',
      icdCode: '', icdName: '', status: 0, fieldData: {},
    });
    setIsNew(true);
  };

  const openEdit = async (r: SpecialtyRecord) => {
    // Fetch full record (fieldData) so the dynamic section is pre-filled.
    let detail: Partial<SpecialtyRecord> = r;
    try {
      const res = await client.get(`/specialty-emr/${r.id}`);
      detail = (res.data?.data || res.data || r) as Partial<SpecialtyRecord>;
    } catch { /* fall back to row data */ }
    setForm({
      id: r.id,
      patientId: detail.patientId || r.patientId,
      patientCode: detail.patientCode || r.patientCode,
      patientName: detail.patientName || r.patientName,
      specialtyType: detail.specialtyType || r.specialtyType || 'surgical',
      recordDate: (detail.recordDate || r.recordDate) ? dayjs(detail.recordDate || r.recordDate) : dayjs(),
      doctorName: detail.doctorName || r.doctorName || '',
      departmentName: detail.departmentName || r.departmentName || '',
      icdCode: detail.icdCode || r.icdCode || '',
      icdName: detail.icdName || r.icdName || '',
      status: detail.status ?? r.status ?? 0,
      fieldData: parseFieldData(detail.fieldData || r.fieldData),
    });
    setIsNew(false);
    setSel(null);
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.patientCode.trim() || !form.patientName.trim()) {
      te('Nhập mã và họ tên bệnh nhân');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        id: form.id || undefined,
        patientId: form.patientId && form.patientId !== '' ? form.patientId : EMPTY_GUID,
        patientCode: form.patientCode.trim(),
        patientName: form.patientName.trim(),
        specialtyType: form.specialtyType,
        recordDate: (form.recordDate || dayjs()).format('YYYY-MM-DDTHH:mm:ss'),
        doctorName: form.doctorName || null,
        departmentName: form.departmentName || null,
        icdCode: form.icdCode || null,
        icdName: form.icdName || null,
        fieldData: JSON.stringify(form.fieldData || {}),
        status: form.status,
      };
      await client.post('/specialty-emr', payload);
      tk(isNew ? 'Đã tạo HSBA chuyên khoa' : 'Đã cập nhật HSBA');
      setForm(null);
      load();
    } catch { te('Lưu HSBA thất bại'); }
    finally { setSaving(false); }
  };

  const handleDelete = (r: SpecialtyRecord) => {
    cf(`Xoá HSBA của "${r.patientName}" (${r.patientCode})?`, async () => {
      try {
        await client.delete(`/specialty-emr/${r.id}`);
        tk('Đã xoá HSBA');
        setSel(null);
        load();
      } catch { te('Xoá thất bại'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  const openReport = async (r: SpecialtyRecord) => {
    try {
      const res = await client.get(`/specialty-emr/${r.id}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
      const w = window.open(url, '_blank');
      if (w) { try { w.addEventListener('load', () => { try { w.print(); } catch { /* ignore */ } }); } catch { /* ignore */ } }
      else te('Trình duyệt chặn cửa sổ in');
    } catch { te('Không tạo được báo cáo HSBA'); }
  };

  const downloadXml = async (r: SpecialtyRecord) => {
    try {
      const res = await client.get(`/specialty-emr/${r.id}/xml`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/xml' }));
      const a = document.createElement('a');
      a.href = url; a.download = `benh-an-ck-${r.patientCode || r.id}.xml`; a.click();
      URL.revokeObjectURL(url);
      tk('Đã tải XML');
    } catch { te('Xuất XML thất bại'); }
  };

  // Phím lệnh toàn cục (F3 Thêm · F2 Lưu · F5 Làm mới · F8 In). F4/Ctrl+F tìm
  // do shell tự focus ô tìm; Esc đóng drawer do Antd xử lý sẵn.
  useRegisterCommands({
    new: openCreate,
    save: () => { if (form) handleSave(); else ti('Mở một HSBA để lưu (F3 để tạo mới)'); },
    refresh: load,
    print: () => {
      if (sel) openReport(sel);
      else if (form?.id) openReport(form as unknown as SpecialtyRecord);
      else ti('Chọn một HSBA để in');
    },
  });

  const cols: ColumnDef<SpecialtyRecord>[] = [
    { key: 'pat', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'spec', label: 'Chuyên khoa', render: (r) => (
      <span className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>{specialtyLabel(r)}</span>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'icd', label: 'ICD', mono: true, render: (r) => r.icdCode || '—' },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => (
      <span style={{ display: 'block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.icdName}>
        {r.icdName || '—'}
      </span>
    ) },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'date', label: 'Ngày', mono: true, render: (r) => (r.recordDate ? dayjs(r.recordDate).format('DD/MM/YYYY') : '—') },
    { key: 'status', label: 'TT', render: (r) => (
      <StatusBadge tone={statusTone(r.status)} dot>{STATUS_TABS.find((x) => x.v === statusKey(r.status))?.l}</StatusBadge>
    ) },
  ];

  const actions = (r: SpecialtyRecord) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sửa HSBA" onClick={() => openEdit(r)} />
      <ActBtn ic="print" title="In HSBA" onClick={() => openReport(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => handleDelete(r)} />
    </div>
  );

  const specOptions = SPECIALTY_TYPES.map((s) => ({ v: s.key, l: s.label }));
  const curFields = form ? (SPECIALTY_FIELDS[form.specialtyType]?.fields || []) : [];
  const detailFields = sel ? (SPECIALTY_FIELDS[sel.specialtyType]?.fields || []) : [];
  const detailData = sel ? parseFieldData(sel.fieldData) : {};

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng HSBA chuyên khoa', val: items.length, sub: `${SPECIALTY_TYPES.length} chuyên khoa` },
        { lbl: '7 ngày qua', val: last7d, sub: 'mới ghi nhận', tone: 'info' },
        { lbl: 'Hoàn thành', val: counts.done || 0, sub: 'status=1', tone: 'info' },
        { lbl: 'Đã ký', val: counts.signed || 0, sub: 'status=2', tone: 'ok' },
        { lbl: 'Nháp', val: counts.draft || 0, sub: 'status=0', tone: 'warn' },
        { lbl: 'CK nhiều nhất', val: bySpecialty[0]?.l || '—', sub: bySpecialty[0] ? `${bySpecialty[0].n} HSBA` : '' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / ICD / chẩn đoán…" />
        <Filter
          value={fSpec} onChange={setFSpec}
          options={specOptions}
          placeholder="▾ Chuyên khoa"
        />
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFSpec(''); setStab('all'); setPage(0); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn primary" type="button" onClick={openCreate}>
          <Ico name="plus" size={12} /> HSBA mới
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      {bySpecialty.length > 0 && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', background: 'var(--d-1)' }}>
          <div style={{ fontSize: 10, color: 'var(--t-2)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>TOP 5 CHUYÊN KHOA</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
            {bySpecialty.map((s) => (
              <div key={s.l} style={{ padding: '8px 10px', background: 'var(--bg-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{s.l}</div>
                <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--t-0)' }}>{s.n}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <DataTable<SpecialtyRecord>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có hồ sơ chuyên khoa'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      {/* ── Detail drawer (read-only) ── */}
      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="xl"
        title={sel ? `HSBA · ${sel.patientName}` : ''}
        sub={sel ? `${sel.patientCode} · ${specialtyLabel(sel)}` : ''}
        footer={sel ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
            <button type="button" className="ab-btn" onClick={() => downloadXml(sel)}><Ico name="download" size={12} /> Xuất XML</button>
            <button type="button" className="ab-btn" onClick={() => openReport(sel)}><Ico name="print" size={12} /> In HSBA</button>
            <button type="button" className="ab-btn primary" onClick={() => openEdit(sel)}><Ico name="edit" size={12} /> Sửa</button>
          </>
        ) : null}
      >
        {sel && <>
          <DrSec title="Bệnh nhân">
            <DrField lbl="Mã BN">{sel.patientCode}</DrField>
            <DrField lbl="Họ tên">{sel.patientName}</DrField>
          </DrSec>
          <DrSec title="HSBA chuyên khoa">
            <DrField lbl="Chuyên khoa">
              <span className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 11 }}>{specialtyLabel(sel)}</span>
            </DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Bác sĩ">{sel.doctorName || '—'}</DrField>
            <DrField lbl="Ngày ghi nhận">{sel.recordDate ? dayjs(sel.recordDate).format('DD/MM/YYYY') : '—'}</DrField>
            <DrField lbl="Tạo lúc">{sel.createdAt ? dayjs(sel.createdAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
          </DrSec>
          <DrSec title="Chẩn đoán">
            <DrField lbl="Mã ICD"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.icdCode || '—'}</span></DrField>
            <DrField lbl="Nội dung">{sel.icdName || '—'}</DrField>
          </DrSec>
          {detailFields.length > 0 && (
            <DrSec title={`Dữ liệu chuyên khoa · ${SPECIALTY_FIELDS[sel.specialtyType]?.title || ''}`}>
              {detailFields.map((f) => (
                <DrField key={f.name} lbl={f.label}>{fmtFieldVal(f, detailData[f.name])}</DrField>
              ))}
            </DrSec>
          )}
          <DrSec title="Trạng thái">
            <DrField lbl="HSBA">
              <StatusBadge tone={statusTone(sel.status)} dot>{STATUS_TABS.find((x) => x.v === statusKey(sel.status))?.l}</StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      {/* ── Create / edit drawer (form) ── */}
      <DrawerShell
        open={!!form}
        onClose={() => setForm(null)}
        size="xl"
        title={isNew ? 'HSBA chuyên khoa mới' : `Sửa HSBA · ${form?.patientName || ''}`}
        sub={form ? (SPECIALTY_FIELDS[form.specialtyType]?.title || '') : ''}
        footer={form ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setForm(null)}>Huỷ</button>
            {!isNew && form.id && (
              <button type="button" className="ab-btn" onClick={() => openReport(form as unknown as SpecialtyRecord)}>
                <Ico name="print" size={12} /> In
              </button>
            )}
            <button type="button" className="ab-btn primary" disabled={saving} onClick={handleSave}>
              <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : isNew ? 'Tạo mới' : 'Lưu'}
            </button>
          </>
        ) : null}
      >
        {form && <>
          <DrSec title="Thông tin chung">
            <DrField lbl="Mã BN *">
              <Input value={form.patientCode} onChange={(e) => setForm({ ...form, patientCode: e.target.value })} placeholder="Mã bệnh nhân" />
            </DrField>
            <DrField lbl="Họ tên *">
              <Input value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} placeholder="Họ tên bệnh nhân" />
            </DrField>
            <DrField lbl="Chuyên khoa *">
              <Select
                value={form.specialtyType}
                options={SPECIALTY_TYPES.map((s) => ({ value: s.key, label: s.label }))}
                style={{ width: '100%' }}
                showSearch
                optionFilterProp="label"
                onChange={(v) => setForm({ ...form, specialtyType: v })}
              />
            </DrField>
            <DrField lbl="Ngày ghi nhận">
              <DatePicker
                value={form.recordDate}
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                onChange={(d) => setForm({ ...form, recordDate: d })}
              />
            </DrField>
            <DrField lbl="Bác sĩ">
              <Input value={form.doctorName} onChange={(e) => setForm({ ...form, doctorName: e.target.value })} placeholder="Bác sĩ điều trị" />
            </DrField>
            <DrField lbl="Khoa/Phòng">
              <Input value={form.departmentName} onChange={(e) => setForm({ ...form, departmentName: e.target.value })} placeholder="Khoa" />
            </DrField>
            <DrField lbl="Trạng thái">
              <Select value={form.status} options={STATUS_OPTIONS} style={{ width: '100%' }} onChange={(v) => setForm({ ...form, status: v })} />
            </DrField>
          </DrSec>

          <DrSec title="Chẩn đoán">
            <DrField lbl="Mã ICD-10">
              <Input value={form.icdCode} onChange={(e) => setForm({ ...form, icdCode: e.target.value })} placeholder="VD: J18.9" />
            </DrField>
            <DrField lbl="Tên chẩn đoán">
              <Input value={form.icdName} onChange={(e) => setForm({ ...form, icdName: e.target.value })} placeholder="Mô tả chẩn đoán" />
            </DrField>
          </DrSec>

          <DrSec title={`Dữ liệu chuyên khoa · ${SPECIALTY_FIELDS[form.specialtyType]?.title || ''}`}>
            {curFields.length === 0
              ? <div style={{ color: 'var(--t-2)', fontSize: 12.5 }}>Chuyên khoa này chưa cấu hình trường riêng.</div>
              : curFields.map((f) => (
                <DrField key={f.name} lbl={f.label}>
                  <FormField
                    field={f}
                    value={form.fieldData[f.name]}
                    onChange={(v) => setForm({ ...form, fieldData: { ...form.fieldData, [f.name]: v } })}
                  />
                </DrField>
              ))}
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default SpecialtyEMRV2;
