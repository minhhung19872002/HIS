// =====================================================================
// HIS Terminal · DANH MỤC THĂM DÒ CHỨC NĂNG — v2
// 2 tab: Loại TDCN / Mẫu kết quả
// #40 #64 #65 #66 #67 — Route /v2/functional-diagnostic-catalog
// =====================================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Select, Switch } from 'antd';
import {
  getTestTypes, saveTestType, deleteTestType,
  getTemplates, saveTemplate, deleteTemplate,
  type FunctionalDiagnosticTestTypeDto,
  type FunctionalDiagnosticTemplateDto,
  type SaveFunctionalDiagnosticTestTypeDto,
  type SaveFunctionalDiagnosticTemplateDto,
} from '../api/functionalDiagnosticCatalog';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, tk, te, cf,
  type ColumnDef,
} from './_v2kit';

type TabKey = 'testType' | 'template';

const TABS: { v: TabKey; l: string; ic: string }[] = [
  { v: 'testType',  l: 'Loại TDCN',   ic: 'layers' },
  { v: 'template',  l: 'Mẫu kết quả', ic: 'file-text' },
];

const EMPTY_TYPE_EDIT: SaveFunctionalDiagnosticTestTypeDto = {
  code: '', name: '', description: '', isActive: true,
};

const EMPTY_TMPL_EDIT: SaveFunctionalDiagnosticTemplateDto = {
  code: '', name: '', testTypeId: '', content: '', isActive: true,
};

const PER = 20;

const FunctionalDiagnosticCatalog: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('testType');
  const [testTypes, setTestTypes] = useState<FunctionalDiagnosticTestTypeDto[]>([]);
  const [templates, setTemplates] = useState<FunctionalDiagnosticTemplateDto[]>([]);
  const [search, setSearch] = useState('');
  const [filterTypeId, setFilterTypeId] = useState('');
  const [page, setPage] = useState(0);

  // Edit state: two independent shapes stored as nullable union
  const [editType, setEditType] = useState<SaveFunctionalDiagnosticTestTypeDto & { id?: string } | null>(null);
  const [editTmpl, setEditTmpl] = useState<SaveFunctionalDiagnosticTemplateDto & { id?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Load ───────────────────────────────────────────────────────────────────
  const reloadTypes = useCallback(async () => {
    try { setTestTypes(await getTestTypes()); }
    catch { te('Không tải được danh sách loại TDCN'); }
  }, []);

  const reloadTemplates = useCallback(async () => {
    try { setTemplates(await getTemplates(filterTypeId || undefined)); }
    catch { te('Không tải được danh sách mẫu kết quả'); }
  }, [filterTypeId]);

  useEffect(() => { setSearch(''); setPage(0); }, [tab]);
  useEffect(() => { void reloadTypes(); }, [reloadTypes]);
  useEffect(() => {
    if (tab === 'template') void reloadTemplates();
  }, [tab, reloadTemplates]);

  // ── Filtered rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    const kw = search.toLowerCase();
    if (tab === 'testType')
      return testTypes.filter(t => !kw || t.name.toLowerCase().includes(kw) || t.code.toLowerCase().includes(kw));
    return templates.filter(t => !kw || t.name.toLowerCase().includes(kw) || t.code.toLowerCase().includes(kw));
  }, [tab, testTypes, templates, search]);

  const paged = rows.slice(page * PER, (page + 1) * PER);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const kpis = [
    { lbl: 'Loại TDCN', val: testTypes.filter(t => t.isActive).length, tone: 'info' as const },
    { lbl: 'Mẫu KQ',    val: templates.filter(t => t.isActive).length, tone: 'ok' as const },
  ];

  // ── Columns ────────────────────────────────────────────────────────────────
  const colsType: ColumnDef<FunctionalDiagnosticTestTypeDto>[] = [
    { key: 'code', label: 'Mã', width: 120, mono: true },
    { key: 'name', label: 'Tên loại TDCN' },
    { key: 'description', label: 'Mô tả', width: 300 },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: r => <StatusBadge tone={r.isActive ? 'ok' : 'crit'} dot>{r.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];

  const colsTmpl: ColumnDef<FunctionalDiagnosticTemplateDto>[] = [
    { key: 'code', label: 'Mã', width: 120, mono: true },
    { key: 'name', label: 'Tên mẫu' },
    { key: 'testTypeName', label: 'Loại TDCN', width: 180 },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: r => <StatusBadge tone={r.isActive ? 'ok' : 'crit'} dot>{r.isActive ? 'Đang dùng' : 'Ngưng'}</StatusBadge> },
  ];

  // ── Row click ─────────────────────────────────────────────────────────────
  const onTypeRowClick = (r: FunctionalDiagnosticTestTypeDto) =>
    setEditType({ id: r.id, code: r.code, name: r.name, description: r.description, isActive: r.isActive });

  const onTmplRowClick = (r: FunctionalDiagnosticTemplateDto) =>
    setEditTmpl({ id: r.id, code: r.code, name: r.name, testTypeId: r.testTypeId, content: r.content, isActive: r.isActive });

  // ── Delete ────────────────────────────────────────────────────────────────
  const onDeleteType = (id: string) =>
    cf('Xóa loại TDCN này?', async () => {
      try { await deleteTestType(id); tk('Đã xóa'); void reloadTypes(); }
      catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });

  const onDeleteTmpl = (id: string) =>
    cf('Xóa mẫu kết quả này?', async () => {
      try { await deleteTemplate(id); tk('Đã xóa'); void reloadTemplates(); }
      catch { te('Xóa thất bại'); }
    }, { tone: 'crit' });

  // ── Save TestType ──────────────────────────────────────────────────────────
  const onSaveType = async () => {
    if (!editType) return;
    if (!editType.code.trim() || !editType.name.trim()) { te('Vui lòng nhập Mã và Tên'); return; }
    setSaving(true);
    try {
      await saveTestType(editType);
      tk(editType.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setEditType(null);
      void reloadTypes();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Save Template ─────────────────────────────────────────────────────────
  const onSaveTmpl = async () => {
    if (!editTmpl) return;
    if (!editTmpl.code.trim() || !editTmpl.name.trim()) { te('Vui lòng nhập Mã và Tên'); return; }
    if (!editTmpl.testTypeId) { te('Chọn Loại TDCN'); return; }
    setSaving(true);
    try {
      await saveTemplate(editTmpl);
      tk(editTmpl.id ? 'Đã cập nhật' : 'Đã thêm mới');
      setEditTmpl(null);
      void reloadTemplates();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };

  // ── Filter bar (template tab) ──────────────────────────────────────────────
  const filterBar = tab === 'template' ? (
    <Select
      placeholder="Lọc theo loại TDCN"
      allowClear
      showSearch
      style={{ width: 220 }}
      value={filterTypeId || undefined}
      onChange={v => { setFilterTypeId(v ?? ''); setPage(0); }}
      options={testTypes.map(t => ({ value: t.id, label: t.name }))}
      optionFilterProp="label"
    />
  ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="ab-module">
      <div className="ab-header">
        <h2 className="ab-title">Danh mục thăm dò chức năng</h2>
        <div className="ab-actions">
          {filterBar}
          <SearchBox
            value={search}
            onChange={v => { setSearch(v); setPage(0); }}
            placeholder="Tìm mã hoặc tên..."
          />
          {tab === 'testType' && (
            <ActBtn ic="plus" title="Thêm loại" onClick={() => setEditType({ ...EMPTY_TYPE_EDIT })} />
          )}
          {tab === 'template' && (
            <ActBtn ic="plus" title="Thêm mẫu" onClick={() => setEditTmpl({ ...EMPTY_TMPL_EDIT })} />
          )}
        </div>
      </div>

      <KpiStrip items={kpis} />

      <TopTabs<TabKey>
        tabs={TABS}
        tab={tab}
        setTab={t => { setTab(t); setPage(0); }}
      />

      {tab === 'testType' && (
        <DataTable<FunctionalDiagnosticTestTypeDto>
          columns={colsType}
          data={paged as FunctionalDiagnosticTestTypeDto[]}
          rowKey={r => r.id}
          onRowClick={onTypeRowClick}
          actions={row => (
            <ActBtn ic="trash" title="Xóa" tone="crit"
              onClick={e => { e.stopPropagation(); onDeleteType(row.id); }} />
          )}
        />
      )}

      {tab === 'template' && (
        <DataTable<FunctionalDiagnosticTemplateDto>
          columns={colsTmpl}
          data={paged as FunctionalDiagnosticTemplateDto[]}
          rowKey={r => r.id}
          onRowClick={onTmplRowClick}
          actions={row => (
            <ActBtn ic="trash" title="Xóa" tone="crit"
              onClick={e => { e.stopPropagation(); onDeleteTmpl(row.id); }} />
          )}
        />
      )}

      <Pager
        page={page}
        totalPages={Math.ceil(rows.length / PER)}
        setPage={setPage}
        total={rows.length}
        perPage={PER}
      />

      {/* ── Drawer: Loại TDCN ────────────────────────────────────────── */}
      <DrawerShell
        open={editType !== null}
        onClose={() => setEditType(null)}
        title={editType?.id ? 'Sửa loại TDCN' : 'Thêm loại TDCN'}
        footer={<>
          <Btn onClick={() => setEditType(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSaveType} loading={saving} />
        </>}
      >
        {editType && (
          <DrSec title="Thông tin">
            <DrField lbl="Mã *">
              <Input
                value={editType.code}
                onChange={e => setEditType({ ...editType, code: e.target.value })}
                placeholder="VD: ECG, EEG, Endoscopy..."
                maxLength={50}
              />
            </DrField>
            <DrField lbl="Tên *">
              <Input
                value={editType.name}
                onChange={e => setEditType({ ...editType, name: e.target.value })}
                placeholder="Tên loại thăm dò chức năng"
                maxLength={200}
              />
            </DrField>
            <DrField lbl="Mô tả">
              <Input.TextArea
                value={editType.description ?? ''}
                onChange={e => setEditType({ ...editType, description: e.target.value })}
                placeholder="Mô tả ngắn (tùy chọn)"
                rows={3}
                maxLength={500}
              />
            </DrField>
            <DrField lbl="Đang dùng">
              <Switch
                checked={editType.isActive}
                onChange={v => setEditType({ ...editType, isActive: v })}
                checkedChildren="Có" unCheckedChildren="Không"
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>

      {/* ── Drawer: Mẫu kết quả ──────────────────────────────────────── */}
      <DrawerShell
        open={editTmpl !== null}
        onClose={() => setEditTmpl(null)}
        title={editTmpl?.id ? 'Sửa mẫu kết quả' : 'Thêm mẫu kết quả'}
        footer={<>
          <Btn onClick={() => setEditTmpl(null)}>Hủy</Btn>
          <ActBtn ic="save" title="Lưu" onClick={onSaveTmpl} loading={saving} />
        </>}
      >
        {editTmpl && (
          <DrSec title="Thông tin">
            <DrField lbl="Loại TDCN *">
              <Select
                style={{ width: '100%' }}
                showSearch
                placeholder="Chọn loại thăm dò"
                value={editTmpl.testTypeId || undefined}
                onChange={v => setEditTmpl({ ...editTmpl, testTypeId: v })}
                options={testTypes.filter(t => t.isActive).map(t => ({ value: t.id, label: t.name }))}
                optionFilterProp="label"
              />
            </DrField>
            <DrField lbl="Mã *">
              <Input
                value={editTmpl.code}
                onChange={e => setEditTmpl({ ...editTmpl, code: e.target.value })}
                placeholder="Mã mẫu"
                maxLength={50}
              />
            </DrField>
            <DrField lbl="Tên *">
              <Input
                value={editTmpl.name}
                onChange={e => setEditTmpl({ ...editTmpl, name: e.target.value })}
                placeholder="Tên mẫu kết quả"
                maxLength={200}
              />
            </DrField>
            <DrField lbl="Nội dung mẫu">
              <Input.TextArea
                value={editTmpl.content ?? ''}
                onChange={e => setEditTmpl({ ...editTmpl, content: e.target.value })}
                placeholder="Nội dung mẫu kết quả (text hoặc HTML)"
                rows={6}
              />
            </DrField>
            <DrField lbl="Đang dùng">
              <Switch
                checked={editTmpl.isActive}
                onChange={v => setEditTmpl({ ...editTmpl, isActive: v })}
                checkedChildren="Có" unCheckedChildren="Không"
              />
            </DrField>
          </DrSec>
        )}
      </DrawerShell>
    </div>
  );
};

export default FunctionalDiagnosticCatalog;
