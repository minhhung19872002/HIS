import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
  getAnalyzers, getLabconnectStatus, createAnalyzer, updateAnalyzer, deleteAnalyzer,
  testAnalyzerConnection, syncLabconnect,
  getTestParameters, createTestParameter, updateTestParameter, deleteTestParameter, importTestParametersCsv,
  getReferenceRanges, createReferenceRange, updateReferenceRange, deleteReferenceRange,
  getAnalyzerMappings, createAnalyzerMapping, updateAnalyzerMapping, deleteAnalyzerMapping, autoMapAnalyzer,
} from '../api/lisConfig';
import type {
  AnalyzerDto, LabconnectStatusDto, CreateAnalyzerDto,
  TestParameterDto, CreateTestParameterDto,
  ReferenceRangeDto, CreateReferenceRangeDto,
  AnalyzerMappingDto, CreateAnalyzerMappingDto,
} from '../api/lisConfig';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  TopTabs, OptionsSelect,
  DrawerShell, DrSec, DrField, tk, ti, tw, te, cf, useTabCounts,
  type ColumnDef, type CrudFieldCfg, type TopTab,
} from '@/_v2kit';

const ANALYZER_FIELDS: CrudFieldCfg[] = [
  { key: 'name', label: 'Tên máy XN', required: true },
  { key: 'manufacturer', label: 'Hãng sản xuất', required: true },
  { key: 'model', label: 'Model', required: true },
  { key: 'connectionType', label: 'Protocol', type: 'select', required: true, options: [
    { value: 'HL7', label: 'HL7' }, { value: 'ASTM', label: 'ASTM' }, { value: 'Serial', label: 'Serial' }] },
  { key: 'protocolVersion', label: 'Phiên bản protocol', placeholder: 'VD: 2.5.1' },
  { key: 'ipAddress', label: 'Địa chỉ IP', placeholder: 'VD: 192.168.1.50' },
  { key: 'port', label: 'Port', type: 'number', placeholder: 'VD: 8080' },
  { key: 'baudRate', label: 'Baud rate (Serial)', type: 'number', placeholder: 'VD: 9600' },
  { key: 'description', label: 'Mô tả', type: 'textarea' },
  { key: 'isActive', label: 'Kích hoạt', type: 'switch' },
];

const CONN_LABEL: Record<string, string> = {
  Connected: 'Đã kết nối', Disconnected: 'Mất kết nối', Unknown: 'Không rõ',
};
const CONN_TONE: Record<string, 'ok' | 'crit' | 'warn'> = {
  Connected: 'ok', Disconnected: 'crit', Unknown: 'warn',
};

type SKey = 'connected' | 'disconnected' | 'inactive';
const STATUS_TABS = [
  { v: 'connected' as SKey,    l: 'Đã kết nối', tone: 'ok' as const },
  { v: 'disconnected' as SKey, l: 'Mất KN',     tone: 'crit' as const },
  { v: 'inactive' as SKey,     l: 'Tắt',        tone: 'warn' as const },
];

const sKey = (r: AnalyzerDto): SKey => {
  if (!r.isActive) return 'inactive';
  return r.connectionStatus === 'Connected' ? 'connected' : 'disconnected';
};

const PER = 18;

// ===========================
// Tab 1: Cấu hình máy XN (host/port/protocol) — đã có sẵn, GIỮ NGUYÊN logic
// ===========================
const AnalyzerSection: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<AnalyzerDto[]>([]);
  const [labconn, setLabconn] = useState<LabconnectStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fProto, setFProto] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<AnalyzerDto | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ connectionType: 'HL7', isActive: true }); setCrudOpen(true); };
  const openEdit = (r: AnalyzerDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: AnalyzerDto) => cf(`Xoá máy XN "${r.name}"?`, async () => {
    try { await deleteAnalyzer(r.id); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });
  const testConn = async (r: AnalyzerDto) => {
    try {
      const res = await testAnalyzerConnection(r.id);
      (res.data?.success ? tk : tw)(res.data?.message || (res.data?.success ? 'Kết nối thành công' : 'Kết nối thất bại'));
      load();
    } catch { te('Test kết nối thất bại'); }
  };
  const runLabconnect = async () => {
    try { await syncLabconnect(); tk('Đã chạy đồng bộ LabConnect'); load(); } catch { te('Đồng bộ LabConnect thất bại'); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const [r, lc] = await Promise.all([
        getAnalyzers(),
        getLabconnectStatus().catch(() => ({ data: null as LabconnectStatusDto | null })),
      ]);
      setItems(r.data || []);
      setLabconn(lc.data || null);
    } catch { ti('Không tải được cấu hình LIS'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const protos = useMemo(() => {
    const set = new Set(items.map((r) => r.connectionType).filter(Boolean));
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r) !== stab) return false;
      if (fProto && r.connectionType !== fProto) return false;
      if (!k) return true;
      return [r.name, r.model, r.manufacturer, r.ipAddress]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fProto]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<AnalyzerDto>[] = [
    { key: 'name', label: 'Máy XN', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.name}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.manufacturer}</div>
      </div>
    ) },
    { key: 'model', label: 'Model', code: true, render: (r) => r.model },
    { key: 'proto', label: 'Protocol', render: (r) => (
      <div>
        <StatusBadge tone="info">{r.connectionType}</StatusBadge>
        {r.protocolVersion && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>v{r.protocolVersion}</div>}
      </div>
    ) },
    { key: 'addr', label: 'Địa chỉ', mono: true, render: (r) =>
      r.ipAddress ? `${r.ipAddress}:${r.port}` : (r.baudRate ? `${r.baudRate} bps` : '—')
    },
    { key: 'conn', label: 'Kết nối', render: (r) => (
      <StatusBadge tone={CONN_TONE[r.connectionStatus || 'Unknown'] || 'warn'} dot>
        {CONN_LABEL[r.connectionStatus || 'Unknown'] || '—'}
      </StatusBadge>
    ) },
    { key: 'last', label: 'Lần cuối', mono: true, render: (r) => r.lastConnectedAt ? dayjs(r.lastConnectedAt).format('DD/MM HH:mm') : '—' },
    { key: 'active', label: 'Bật', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge>
    },
  ];

  const actions = (r: AnalyzerDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => testConn(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
    </div>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Máy XN', val: items.length, sub: 'tổng' },
        { lbl: 'Đang KN', val: counts.connected || 0, sub: `${Math.round(((counts.connected || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Mất KN', val: counts.disconnected || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'LabConnect', val: labconn?.isConnected ? 'OK' : 'OFF', sub: labconn?.isConnected ? 'hoạt động' : 'chưa cấu hình', tone: labconn?.isConnected ? 'ok' : 'warn' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm tên / hãng / model / IP…" />
        <Filter value={fProto} onChange={setFProto} options={protos} placeholder="▾ Protocol" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFProto(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="activity" onClick={runLabconnect}>LabConnect</Btn>
        <Btn variant="ghost" icon="inbox" onClick={() => navigate('/v2/analyzer-inbox')}>KQ máy</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm máy</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<AnalyzerDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có máy XN cấu hình'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? sel.name : ''}
        sub={sel ? `${sel.manufacturer} · ${sel.model}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="refresh" onClick={() => { if (sel) testConn(sel); }}>Test KN</Btn>
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Chỉnh sửa</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Định danh">
            <DrField lbl="Tên">{sel.name}</DrField>
            <DrField lbl="Hãng">{sel.manufacturer}</DrField>
            <DrField lbl="Model"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.model}</span></DrField>
            <DrField lbl="Mô tả">{sel.description || '—'}</DrField>
          </DrSec>
          <DrSec title="Cấu hình kết nối">
            <DrField lbl="Protocol">{sel.connectionType}</DrField>
            {sel.protocolVersion && <DrField lbl="Phiên bản">v{sel.protocolVersion}</DrField>}
            {sel.ipAddress && <DrField lbl="IP · Port"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.ipAddress}:{sel.port}</span></DrField>}
            {sel.baudRate && <DrField lbl="Baud rate"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.baudRate} bps</span></DrField>}
            <DrField lbl="Bật">
              {sel.isActive
                ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
                : <StatusBadge tone="warn" dot>Tắt</StatusBadge>}
            </DrField>
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Kết nối">
              <StatusBadge tone={CONN_TONE[sel.connectionStatus || 'Unknown'] || 'warn'} dot>
                {CONN_LABEL[sel.connectionStatus || 'Unknown'] || '—'}
              </StatusBadge>
            </DrField>
            {sel.lastConnectedAt && <DrField lbl="Lần cuối KN">{dayjs(sel.lastConnectedAt).format('DD/MM/YYYY HH:mm')}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật máy xét nghiệm' : 'Thêm máy xét nghiệm'}
        fields={ANALYZER_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateAnalyzerDto;
          if (editing && crudInit?.id) await updateAnalyzer(crudInit.id as string, dto);
          else await createAnalyzer(dto);
          tk(editing ? 'Đã cập nhật máy XN' : 'Đã thêm máy XN');
          load();
        }}
      />
    </>
  );
};

// ===========================
// Tab 2: Chỉ số xét nghiệm (test parameters) — port từ v1 TestParametersTab
// ===========================
const TESTPARAM_FIELDS: CrudFieldCfg[] = [
  { key: 'code', label: 'Mã chỉ số', required: true, placeholder: 'VD: WBC' },
  { key: 'name', label: 'Tên chỉ số', required: true, placeholder: 'VD: Bạch cầu' },
  { key: 'unit', label: 'Đơn vị', required: true, placeholder: 'VD: 10^9/L' },
  { key: 'referenceLow', label: 'Tham chiếu thấp', type: 'number' },
  { key: 'referenceHigh', label: 'Tham chiếu cao', type: 'number' },
  { key: 'criticalLow', label: 'Nguy hiểm thấp', type: 'number' },
  { key: 'criticalHigh', label: 'Nguy hiểm cao', type: 'number' },
  { key: 'dataType', label: 'Kiểu dữ liệu', type: 'select', required: true, options: [
    { value: 'Number', label: 'Số (Number)' }, { value: 'Text', label: 'Văn bản (Text)' }, { value: 'Enum', label: 'Lựa chọn (Enum)' }] },
  { key: 'enumValues', label: 'Giá trị Enum (cách nhau bởi dấu phẩy)', placeholder: 'VD: Positive,Negative,Trace' },
  { key: 'sortOrder', label: 'Thứ tự sắp xếp', type: 'number' },
  { key: 'isActive', label: 'Kích hoạt', type: 'switch' },
];

const TestParamsSection: React.FC = () => {
  const [params, setParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTestParameters();
      setParams(Array.isArray(res.data) ? res.data : []);
    } catch { tw('Không thể tải danh sách chỉ số xét nghiệm'); setParams([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const openCreate = () => { setCrudInit({ isActive: true, dataType: 'Number' }); setCrudOpen(true); };
  const openEdit = (r: TestParameterDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: TestParameterDto) => cf(`Xoá chỉ số "${r.name}"?`, async () => {
    try { await deleteTestParameter(r.id); tk('Đã xoá'); load(); } catch { te('Lỗi khi xoá chỉ số'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const handleCsvImport = async (file: File) => {
    try { await importTestParametersCsv(file); tk('Import CSV thành công'); load(); }
    catch { tw('Lỗi khi import CSV'); }
  };

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    if (!k) return params;
    return params.filter((p) => (p.code || '').toLowerCase().includes(k) || (p.name || '').toLowerCase().includes(k));
  }, [params, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<TestParameterDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên chỉ số', render: (r) => r.name },
    { key: 'unit', label: 'Đơn vị', mono: true, render: (r) => r.unit || '—' },
    { key: 'ref', label: 'Tham chiếu (Low-High)', mono: true, render: (r) =>
      (r.referenceLow != null || r.referenceHigh != null) ? `${r.referenceLow ?? ''} - ${r.referenceHigh ?? ''}` : '—' },
    { key: 'crit', label: 'Nguy hiểm (Low-High)', mono: true, render: (r) =>
      (r.criticalLow != null || r.criticalHigh != null)
        ? <span style={{ color: '#d4380d' }}>{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</span> : '—' },
    { key: 'type', label: 'Kiểu dữ liệu', render: (r) => <StatusBadge tone="info">{r.dataType}</StatusBadge> },
    { key: 'active', label: 'Kích hoạt', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge> },
  ];

  return (
    <>
      <div className="ab-toolbar">
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm theo mã, tên chỉ số…" />
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <input
          ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }}
          onChange={(e) => { if (e.target.files?.[0]) { handleCsvImport(e.target.files[0]); e.target.value = ''; } }}
        />
        <Btn variant="ghost" icon="upload" onClick={() => fileInputRef.current?.click()}>Import CSV</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm chỉ số</Btn>
      </div>

      <DataTable<TestParameterDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={openEdit}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có chỉ số xét nghiệm nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Sửa chỉ số xét nghiệm' : 'Thêm chỉ số xét nghiệm'}
        fields={TESTPARAM_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateTestParameterDto;
          if (editing && crudInit?.id) await updateTestParameter(crudInit.id as string, dto);
          else await createTestParameter(dto);
          tk(editing ? 'Cập nhật chỉ số thành công' : 'Thêm chỉ số thành công');
          load();
        }}
      />
    </>
  );
};

// ===========================
// Tab 3: Dải tham chiếu (reference ranges theo nhóm tuổi/giới) — port từ v1 ReferenceRangesTab
// ===========================
const AGE_GROUP_LABEL: Record<string, string> = {
  Newborn: 'Sơ sinh (0-28 ngày)',
  Infant: 'Nhũ nhi (1-12 tháng)',
  Child: 'Trẻ em (1-12 tuổi)',
  Adolescent: 'Thanh thiếu niên (13-17)',
  Adult: 'Người lớn (18-64)',
  Elderly: 'Người cao tuổi (>=65)',
};
const GENDER_LABEL: Record<string, string> = { Male: 'Nam', Female: 'Nữ', Both: 'Cả hai' };
const AGE_GROUP_OPTIONS = Object.entries(AGE_GROUP_LABEL).map(([value, label]) => ({ value, label }));
const GENDER_OPTIONS = Object.entries(GENDER_LABEL).map(([value, label]) => ({ value, label }));

const ReferenceRangesSection: React.FC = () => {
  const [ranges, setRanges] = useState<ReferenceRangeDto[]>([]);
  const [testParams, setTestParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTestId, setFilterTestId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(0);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rangeRes, paramRes] = await Promise.allSettled([
        getReferenceRanges(filterTestId),
        getTestParameters(),
      ]);
      if (rangeRes.status === 'fulfilled') setRanges(Array.isArray(rangeRes.value.data) ? rangeRes.value.data : []);
      if (paramRes.status === 'fulfilled') setTestParams(Array.isArray(paramRes.value.data) ? paramRes.value.data : []);
    } catch { tw('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [filterTestId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: ReferenceRangeDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: ReferenceRangeDto) => cf('Xoá dải chỉ số này?', async () => {
    try { await deleteReferenceRange(r.id); tk('Đã xoá'); load(); } catch { te('Lỗi khi xoá'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const testParamOptions = useMemo(
    () => testParams.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
    [testParams],
  );

  const REFRANGE_FIELDS: CrudFieldCfg[] = useMemo(() => [
    { key: 'testParameterId', label: 'Chỉ số xét nghiệm', type: 'select', required: true, options: testParamOptions },
    { key: 'ageGroup', label: 'Nhóm tuổi', type: 'select', required: true, options: AGE_GROUP_OPTIONS },
    { key: 'gender', label: 'Giới tính', type: 'select', required: true, options: GENDER_OPTIONS },
    { key: 'low', label: 'Low', type: 'number' },
    { key: 'high', label: 'High', type: 'number' },
    { key: 'criticalLow', label: 'Critical Low', type: 'number' },
    { key: 'criticalHigh', label: 'Critical High', type: 'number' },
    { key: 'unit', label: 'Đơn vị', required: true, placeholder: 'VD: mmol/L' },
  ], [testParamOptions]);

  const cols: ColumnDef<ReferenceRangeDto>[] = [
    { key: 'testCode', label: 'Mã XN', code: true, render: (r) => r.testCode },
    { key: 'testName', label: 'Tên XN', render: (r) => r.testName || '—' },
    { key: 'age', label: 'Nhóm tuổi', render: (r) => AGE_GROUP_LABEL[r.ageGroup] || r.ageGroup },
    { key: 'gender', label: 'Giới tính', render: (r) => GENDER_LABEL[r.gender] || r.gender },
    { key: 'range', label: 'Tham chiếu', mono: true, render: (r) => `${r.low ?? ''} - ${r.high ?? ''}` },
    { key: 'crit', label: 'Nguy hiểm', mono: true, render: (r) =>
      (r.criticalLow != null || r.criticalHigh != null)
        ? <span style={{ color: '#d4380d' }}>{`${r.criticalLow ?? ''} - ${r.criticalHigh ?? ''}`}</span> : '—' },
    { key: 'unit', label: 'Đơn vị', render: (r) => r.unit },
  ];

  const totalPages = Math.max(1, Math.ceil(ranges.length / PER));
  const paged = ranges.slice(page * PER, (page + 1) * PER);

  return (
    <>
      <div className="ab-toolbar">
        <OptionsSelect
          value={filterTestId}
          onChange={(v) => { setFilterTestId(v); setPage(0); }}
          options={testParamOptions}
          placeholder="Lọc theo chỉ số XN"
          style={{ width: 260 }}
        />
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm dải chỉ số</Btn>
      </div>

      <DataTable<ReferenceRangeDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={openEdit}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có dải chỉ số nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={ranges.length} perPage={PER} />

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Sửa dải chỉ số' : 'Thêm dải chỉ số'}
        fields={REFRANGE_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateReferenceRangeDto;
          if (editing && crudInit?.id) await updateReferenceRange(crudInit.id as string, dto);
          else await createReferenceRange(dto);
          tk(editing ? 'Cập nhật thành công' : 'Thêm dải chỉ số thành công');
          load();
        }}
      />
    </>
  );
};

// ===========================
// Tab 4: Ánh xạ mã chỉ số máy XN ↔ HIS — port từ v1 AnalyzerMappingTab (gap chính của issue #409)
// ===========================
const AnalyzerMappingSection: React.FC = () => {
  const [mappings, setMappings] = useState<AnalyzerMappingDto[]>([]);
  const [analyzers, setAnalyzers] = useState<AnalyzerDto[]>([]);
  const [testParams, setTestParams] = useState<TestParameterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAnalyzerId, setFilterAnalyzerId] = useState<string | undefined>(undefined);
  const [autoMapping, setAutoMapping] = useState(false);
  const [page, setPage] = useState(0);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mapRes, analyzerRes, paramRes] = await Promise.allSettled([
        getAnalyzerMappings(filterAnalyzerId),
        getAnalyzers(),
        getTestParameters(),
      ]);
      if (mapRes.status === 'fulfilled') setMappings(Array.isArray(mapRes.value.data) ? mapRes.value.data : []);
      if (analyzerRes.status === 'fulfilled') setAnalyzers(Array.isArray(analyzerRes.value.data) ? analyzerRes.value.data : []);
      if (paramRes.status === 'fulfilled') setTestParams(Array.isArray(paramRes.value.data) ? paramRes.value.data : []);
    } catch { tw('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  }, [filterAnalyzerId]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setCrudInit({ isActive: true, analyzerId: filterAnalyzerId }); setCrudOpen(true); };
  const openEdit = (r: AnalyzerMappingDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const del = (r: AnalyzerMappingDto) => cf('Xoá ánh xạ này?', async () => {
    try { await deleteAnalyzerMapping(r.id); tk('Đã xoá'); load(); } catch { te('Lỗi khi xoá'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const handleAutoMap = async () => {
    if (!filterAnalyzerId) { tw('Vui lòng chọn máy xét nghiệm trước'); return; }
    setAutoMapping(true);
    try {
      const res = await autoMapAnalyzer(filterAnalyzerId);
      tk(res.data?.message || `Đã ánh xạ tự động ${res.data?.mappedCount || 0} chỉ số`);
      load();
    } catch { tw('Lỗi khi tự động ánh xạ'); }
    finally { setAutoMapping(false); }
  };

  const analyzerOptions = useMemo(
    () => analyzers.map((a) => ({ value: a.id, label: `${a.name} (${a.model})` })),
    [analyzers],
  );
  const testParamOptions = useMemo(
    () => testParams.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
    [testParams],
  );

  const MAPPING_FIELDS: CrudFieldCfg[] = useMemo(() => [
    { key: 'analyzerId', label: 'Máy xét nghiệm', type: 'select', required: true, options: analyzerOptions },
    { key: 'analyzerTestCode', label: 'Mã chỉ số trên máy', required: true, placeholder: 'VD: WBC, RBC, HGB' },
    { key: 'hisTestParameterId', label: 'Chỉ số HIS tương ứng', type: 'select', required: true, options: testParamOptions },
    { key: 'isActive', label: 'Kích hoạt', type: 'switch' },
  ], [analyzerOptions, testParamOptions]);

  const cols: ColumnDef<AnalyzerMappingDto>[] = [
    { key: 'analyzer', label: 'Máy XN', render: (r) => r.analyzerName || '—' },
    { key: 'aCode', label: 'Mã chỉ số máy', code: true, render: (r) => r.analyzerTestCode },
    { key: 'hCode', label: 'Mã chỉ số HIS', code: true, render: (r) => r.hisTestCode || '—' },
    { key: 'hName', label: 'Tên chỉ số HIS', render: (r) => r.hisTestName || '—' },
    { key: 'active', label: 'Kích hoạt', render: (r) => r.isActive
      ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
      : <StatusBadge tone="warn" dot>Tắt</StatusBadge> },
  ];

  const totalPages = Math.max(1, Math.ceil(mappings.length / PER));
  const paged = mappings.slice(page * PER, (page + 1) * PER);

  return (
    <>
      <div className="ab-toolbar">
        <OptionsSelect
          value={filterAnalyzerId}
          onChange={(v) => { setFilterAnalyzerId(v); setPage(0); }}
          options={analyzerOptions}
          placeholder="Lọc theo máy XN"
          style={{ width: 260 }}
        />
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="zap" loading={autoMapping} disabled={!filterAnalyzerId} onClick={handleAutoMap}>
          Tự động ánh xạ
        </Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Thêm ánh xạ</Btn>
      </div>

      <DataTable<AnalyzerMappingDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={openEdit}
        actions={(r) => (
          <div className="ab-actions">
            <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
            <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => del(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : 'Chưa có ánh xạ nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={mappings.length} perPage={PER} />

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Sửa ánh xạ' : 'Thêm ánh xạ'}
        fields={MAPPING_FIELDS}
        initial={crudInit}
        size="md"
        onSubmit={async (v, editing) => {
          const dto = v as unknown as CreateAnalyzerMappingDto;
          if (editing && crudInit?.id) await updateAnalyzerMapping(crudInit.id as string, dto);
          else await createAnalyzerMapping(dto);
          tk(editing ? 'Cập nhật thành công' : 'Thêm ánh xạ thành công');
          load();
        }}
      />
    </>
  );
};

// ===========================
// Trang chính — Cấu hình hệ thống xét nghiệm (LIS)
// ===========================
type MainTab = 'analyzers' | 'testParams' | 'refRanges' | 'mappings';
const MAIN_TABS: TopTab<MainTab>[] = [
  { v: 'analyzers',  l: 'Máy XN',              ic: 'settings' },
  { v: 'testParams', l: 'Chỉ số XN',           ic: 'activity' },
  { v: 'refRanges',  l: 'Dải tham chiếu',      ic: 'chart' },
  { v: 'mappings',   l: 'Ánh xạ mã máy↔HIS',   ic: 'external' },
];

const LISConfigV2: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('analyzers');
  return (
    <div className="ab">
      <TopTabs<MainTab> tab={tab} setTab={setTab} tabs={MAIN_TABS} />
      {tab === 'analyzers' && <AnalyzerSection />}
      {tab === 'testParams' && <TestParamsSection />}
      {tab === 'refRanges' && <ReferenceRangesSection />}
      {tab === 'mappings' && <AnalyzerMappingSection />}
    </div>
  );
};

export default LISConfigV2;
