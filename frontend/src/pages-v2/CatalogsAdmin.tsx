import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Checkbox } from 'antd';
import {
  saveAbbreviation, deleteAbbreviation, searchAbbreviations,
  ABBREVIATION_SCOPES, type AbbreviationDto,
} from '../api/abbreviation';
import {
  saveTemplate, deleteTemplate, searchTemplates, getTemplateById,
  TEMPLATE_TYPE_LABELS, type ClinicalTemplateDto,
} from '../api/clinicalTemplate';
import { invalidateAbbreviationCache } from '../hooks/useAbbreviationExpander';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, StatusBadge, ActBtn,
  ModalShell, DrawerShell, Ico, tk, ti, tw, cf,
  type ColumnDef,
} from './_v2kit';

type Tab = 'abbr' | 'templates';
const TABS = [
  { v: 'abbr' as Tab,      l: 'Viết tắt (F2)',   ic: 'edit' },
  { v: 'templates' as Tab, l: 'Template lâm sàng', ic: 'file-text' },
];

const SCOPE_OPTIONS = [
  { v: String(ABBREVIATION_SCOPES.GENERAL),      l: 'Chung' },
  { v: String(ABBREVIATION_SCOPES.PRESCRIPTION), l: 'Ghi chú thuốc' },
  { v: String(ABBREVIATION_SCOPES.DIAGNOSIS),    l: 'Chẩn đoán / Triệu chứng' },
  { v: String(ABBREVIATION_SCOPES.LAB),          l: 'Kết quả XN' },
  { v: String(ABBREVIATION_SCOPES.RADIOLOGY),    l: 'CĐHA' },
  { v: String(ABBREVIATION_SCOPES.APPOINTMENT),  l: 'Hẹn' },
];

const CatalogsAdminV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('abbr');
  const [abbrs, setAbbrs] = useState<AbbreviationDto[]>([]);
  const [abbrLoading, setAbbrLoading] = useState(false);
  const [abbrScope, setAbbrScope] = useState('');
  const [abbrEditing, setAbbrEditing] = useState<AbbreviationDto | null>(null);
  const [abbrModal, setAbbrModal] = useState(false);
  const [abbrForm] = Form.useForm<{ code: string; expansion: string; scope: number; scopeKey?: string; ownerOnly: boolean; sortOrder: number }>();
  const [tpls, setTpls] = useState<ClinicalTemplateDto[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplType, setTplType] = useState('');
  const [tplKeyword, setTplKeyword] = useState('');
  const [tplEditing, setTplEditing] = useState<ClinicalTemplateDto | null>(null);
  const [tplDrawer, setTplDrawer] = useState(false);
  const [tplForm] = Form.useForm<{ templateName: string; templateType: number; icdCode?: string; icdName?: string; gender: number; minAgeYears?: number; maxAgeYears?: number; content: string; isPublic: boolean; sortOrder: number }>();

  const loadAbbrs = useCallback(async () => {
    setAbbrLoading(true);
    try { setAbbrs(await searchAbbreviations(abbrScope ? Number(abbrScope) : undefined)); }
    catch { setAbbrs([]); ti('Tải viết tắt thất bại'); }
    finally { setAbbrLoading(false); }
  }, [abbrScope]);

  const loadTpls = useCallback(async () => {
    setTplLoading(true);
    try { setTpls(await searchTemplates({ templateType: tplType ? Number(tplType) : undefined, keyword: tplKeyword, pageSize: 100, onlyActive: true })); }
    catch { setTpls([]); ti('Tải template thất bại'); }
    finally { setTplLoading(false); }
  }, [tplType, tplKeyword]);

  useEffect(() => { if (tab === 'abbr') loadAbbrs(); else loadTpls(); }, [tab, loadAbbrs, loadTpls]);

  const openAbbrAdd = () => {
    setAbbrEditing(null); abbrForm.resetFields();
    abbrForm.setFieldsValue({ scope: 0, ownerOnly: false, sortOrder: 0 });
    setAbbrModal(true);
  };
  const openAbbrEdit = (r: AbbreviationDto) => {
    setAbbrEditing(r);
    abbrForm.setFieldsValue({
      code: r.code, expansion: r.expansion, scope: r.scope, scopeKey: r.scopeKey,
      ownerOnly: !!r.ownerUserId, sortOrder: r.sortOrder,
    });
    setAbbrModal(true);
  };
  const submitAbbr = async () => {
    try {
      const v = await abbrForm.validateFields();
      await saveAbbreviation({ id: abbrEditing?.id, ...v });
      tk('Đã lưu'); setAbbrModal(false); invalidateAbbreviationCache(); loadAbbrs();
    } catch { tw('Lưu thất bại'); }
  };
  const deleteAbbr = (r: AbbreviationDto) => cf(`Xóa viết tắt "${r.code}"?`, async () => {
    await deleteAbbreviation(r.id); tk('Đã xóa'); invalidateAbbreviationCache(); loadAbbrs();
  }, { tone: 'crit', confirm: 'Xóa' });

  const openTplAdd = () => {
    setTplEditing(null); tplForm.resetFields();
    tplForm.setFieldsValue({ templateType: 1, gender: 0, isPublic: true, sortOrder: 0 });
    setTplDrawer(true);
  };
  const openTplEdit = async (r: ClinicalTemplateDto) => {
    const full = await getTemplateById(r.id);
    if (!full) return;
    setTplEditing(full);
    tplForm.setFieldsValue({
      templateName: full.templateName, templateType: full.templateType,
      icdCode: full.icdCode, icdName: full.icdName, gender: full.gender,
      minAgeYears: full.minAgeYears, maxAgeYears: full.maxAgeYears,
      content: full.content, isPublic: full.isPublic, sortOrder: full.sortOrder,
    });
    setTplDrawer(true);
  };
  const submitTpl = async () => {
    try {
      const v = await tplForm.validateFields();
      await saveTemplate({ id: tplEditing?.id, ...v });
      tk('Đã lưu template'); setTplDrawer(false); loadTpls();
    } catch { tw('Lưu thất bại'); }
  };
  const deleteTpl = (r: ClinicalTemplateDto) => cf(`Xóa template "${r.templateName}"?`, async () => {
    await deleteTemplate(r.id); tk('Đã xóa'); loadTpls();
  }, { tone: 'crit', confirm: 'Xóa' });

  const abbrCols: ColumnDef<AbbreviationDto>[] = [
    { key: 'code', label: 'Code', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'exp', label: 'Cụm từ đầy đủ', render: (r) => r.expansion },
    { key: 'scope', label: 'Scope', render: (r) => r.scopeName || '—' },
    { key: 'owner', label: 'Quyền', render: (r) => r.ownerUserId
      ? <StatusBadge tone="warn">Cá nhân</StatusBadge>
      : <StatusBadge tone="ok">Chung</StatusBadge>
    },
    { key: 'usage', label: 'Đã dùng', mono: true, render: (r) => r.usageCount },
  ];

  const tplCols: ColumnDef<ClinicalTemplateDto>[] = [
    { key: 'name', label: 'Tên template', render: (r) => <b>{r.templateName}</b> },
    { key: 'type', label: 'Loại', render: (r) => <StatusBadge tone="info">{r.templateTypeName}</StatusBadge> },
    { key: 'icd', label: 'ICD', code: true, render: (r) => r.icdCode || '—' },
    { key: 'gender', label: 'Giới', render: (r) => r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : 'Tất cả' },
    { key: 'age', label: 'Tuổi', mono: true, render: (r) =>
      (r.minAgeYears != null || r.maxAgeYears != null)
        ? `${r.minAgeYears ?? 0}–${r.maxAgeYears ?? '∞'}`
        : '—'
    },
    { key: 'public', label: 'Quyền', render: (r) => r.isPublic
      ? <StatusBadge tone="ok">Công khai</StatusBadge>
      : <StatusBadge tone="warn">Cá nhân</StatusBadge>
    },
    { key: 'usage', label: 'Đã dùng', mono: true, render: (r) => r.usageCount },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Viết tắt', val: abbrs.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Template', val: tpls.length, sub: 'tổng số', tone: 'ok' },
        { lbl: 'Cá nhân', val: tab === 'abbr' ? abbrs.filter((a) => a.ownerUserId).length : tpls.filter((t) => !t.isPublic).length, sub: 'không chia sẻ', tone: 'warn' },
        { lbl: 'Lượt dùng',
          val: tab === 'abbr' ? abbrs.reduce((s, a) => s + (a.usageCount || 0), 0) : tpls.reduce((s, t) => s + (t.usageCount || 0), 0),
          sub: 'tổng cộng', tone: 'info',
        },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={() => tab === 'abbr' ? loadAbbrs() : loadTpls()}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          <button className="ab-btn primary" type="button" onClick={() => tab === 'abbr' ? openAbbrAdd() : openTplAdd()}>
            <Ico name="plus" size={12} /> {tab === 'abbr' ? 'Thêm viết tắt' : 'Thêm template'}
          </button>
        </>
      } />

      {tab === 'abbr' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={abbrScope} onChange={setAbbrScope} options={SCOPE_OPTIONS} placeholder="▾ Lọc scope" />
          <button className="ab-btn ghost" type="button" onClick={() => setAbbrScope('')}>
            <Ico name="x" size={12} /> Bỏ lọc
          </button>
          <span className="spacer" />
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>Hướng dẫn: gõ code trong textarea rồi bấm F2 để tự động thay thế</span>
        </div>
        <DataTable<AbbreviationDto>
          columns={abbrCols} data={abbrs} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openAbbrEdit(r)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => deleteAbbr(r)} />
            </div>
          )}
          empty={abbrLoading ? 'Đang tải…' : 'Chưa có viết tắt'}
        />
      </>}

      {tab === 'templates' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={tplType} onChange={setTplType}
            options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ v: k, l: v as string }))}
            placeholder="▾ Loại template" />
          <SearchBox value={tplKeyword} onChange={setTplKeyword} placeholder="Tìm theo tên / ICD…" />
          <button className="ab-btn ghost" type="button" onClick={() => { setTplKeyword(''); setTplType(''); }}>
            <Ico name="x" size={12} /> Bỏ lọc
          </button>
        </div>
        <DataTable<ClinicalTemplateDto>
          columns={tplCols} data={tpls} rowKey={(r) => r.id}
          onRowClick={openTplEdit}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openTplEdit(r)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => deleteTpl(r)} />
            </div>
          )}
          empty={tplLoading ? 'Đang tải…' : 'Chưa có template'}
        />
      </>}

      <ModalShell
        open={abbrModal}
        onClose={() => setAbbrModal(false)}
        size="md"
        title={abbrEditing ? 'Sửa viết tắt' : 'Thêm viết tắt'}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setAbbrModal(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitAbbr}>
            <Ico name="check" size={12} /> Lưu
          </button>
        </>}
      >
        <Form form={abbrForm} layout="vertical">
          <Form.Item name="code" label="Code (ngắn, lowercase, không dấu)"
            rules={[{ required: true, pattern: /^[a-z0-9]+$/, message: 'Chỉ chữ thường + số' }]}>
            <Input placeholder="VD: ha, nth, kbt" maxLength={20} />
          </Form.Item>
          <Form.Item name="expansion" label="Cụm từ đầy đủ" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="VD: Không bất thường" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select options={SCOPE_OPTIONS.map((s) => ({ value: Number(s.v), label: s.l }))} />
          </Form.Item>
          <Form.Item name="scopeKey" label="Scope key (tùy chọn, cho CĐHA theo kỹ thuật)">
            <Input placeholder="VD: CT, MRI, XQ, nội soi" />
          </Form.Item>
          <Form.Item name="ownerOnly" valuePropName="checked">
            <Checkbox>Chỉ mình tôi dùng được (nếu không tick = chia sẻ cho mọi BS)</Checkbox>
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp"><InputNumber min={0} /></Form.Item>
        </Form>
      </ModalShell>

      <DrawerShell
        open={tplDrawer}
        onClose={() => setTplDrawer(false)}
        size="xl"
        title={tplEditing ? 'Sửa template' : 'Thêm template mới'}
        sub={tplEditing?.templateTypeName}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setTplDrawer(false)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={submitTpl}>
            <Ico name="check" size={12} /> Lưu
          </button>
        </>}
      >
        <div style={{ padding: 20 }}>
          <Form form={tplForm} layout="vertical">
            <Form.Item name="templateName" label="Tên template" rules={[{ required: true }]}>
              <Input placeholder="VD: Kết luận X-quang ngực bình thường" />
            </Form.Item>
            <Form.Item name="templateType" label="Loại" rules={[{ required: true }]}>
              <Select options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))} />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
              <Form.Item name="icdCode" label="Mã ICD-10"><Input placeholder="VD: J18.9" maxLength={20} /></Form.Item>
              <Form.Item name="icdName" label="Tên chẩn đoán"><Input placeholder="Viêm phổi không xác định" /></Form.Item>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 120px 120px 1fr', gap: 12 }}>
              <Form.Item name="gender" label="Giới tính">
                <Select options={[{ value: 0, label: 'Tất cả' }, { value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
              </Form.Item>
              <Form.Item name="minAgeYears" label="Tuổi tối thiểu"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
              <Form.Item name="maxAgeYears" label="Tuổi tối đa"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
            </div>
            <Form.Item name="content" label="Nội dung template" rules={[{ required: true }]}
              tooltip="Có thể dùng placeholder {{field}} — VD: {{patientName}}">
              <Input.TextArea rows={12} placeholder="Nội dung mẫu sẽ hiển thị/chèn vào kết luận, HSBA, PTTT…" />
            </Form.Item>
            <Form.Item name="isPublic" valuePropName="checked">
              <Checkbox>Công khai cho tất cả BS (nếu không tick = template cá nhân)</Checkbox>
            </Form.Item>
            <Form.Item name="sortOrder" label="Thứ tự sắp xếp"><InputNumber min={0} /></Form.Item>
          </Form>
        </div>
      </DrawerShell>
    </div>
  );
};

export default CatalogsAdminV2;
