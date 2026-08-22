import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select, Checkbox } from 'antd';
import {
  saveAbbreviation, deleteAbbreviation, searchAbbreviations,
  ABBREVIATION_SCOPES, type AbbreviationDto,
} from '../../../api/abbreviation';
import {
  saveTemplate, deleteTemplate, searchTemplates, getTemplateById,
  TEMPLATE_TYPE_LABELS, type ClinicalTemplateDto,
} from '../../patient/api/clinicalTemplate';
import { invalidateAbbreviationCache } from '../../../hooks/useAbbreviationExpander';
import {
  getOccupations, saveOccupation, deleteOccupation, type OccupationDto,
  getGenders, saveGender, deleteGender, type GenderDto,
  getEthnics, saveEthnic, deleteEthnic, type EthnicDto,
  getNations, saveNation, deleteNation, type NationDto,
  getInitialFacilities, saveInitialFacility, deleteInitialFacility, type InitialFacilityDto,
} from '../api/masterCatalog';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, StatusBadge, ActBtn, Btn,
  ModalShell, Ico, tk, ti, tw, cf,
  type ColumnDef,
} from '@/_v2kit';
import { RefreshButton } from '../../../components/actions';
import { useTabState } from '../../../hooks/useTabState';

type Tab = 'abbr' | 'templates' | 'occupation' | 'gender' | 'ethnic' | 'nation' | 'facility';
const TABS = [
  { v: 'abbr' as Tab,       l: 'Viết tắt (F2)',      ic: 'edit' },
  { v: 'templates' as Tab,  l: 'Template lâm sàng',  ic: 'file-text' },
  { v: 'occupation' as Tab, l: 'Nghề nghiệp',        ic: 'briefcase' },
  { v: 'gender' as Tab,     l: 'Giới tính',          ic: 'users' },
  { v: 'ethnic' as Tab,     l: 'Dân tộc',            ic: 'globe' },
  { v: 'nation' as Tab,     l: 'Quốc gia',           ic: 'flag' },
  { v: 'facility' as Tab,   l: 'CSKCB ban đầu',      ic: 'home' },
];

const SCOPE_OPTIONS = [
  { v: String(ABBREVIATION_SCOPES.GENERAL),      l: 'Chung' },
  { v: String(ABBREVIATION_SCOPES.PRESCRIPTION), l: 'Ghi chú thuốc' },
  { v: String(ABBREVIATION_SCOPES.DIAGNOSIS),    l: 'Chẩn đoán / Triệu chứng' },
  { v: String(ABBREVIATION_SCOPES.LAB),          l: 'Kết quả XN' },
  { v: String(ABBREVIATION_SCOPES.RADIOLOGY),    l: 'CDHA' },
  { v: String(ABBREVIATION_SCOPES.APPOINTMENT),  l: 'Đặt hẹn' },
];

const LEVEL_OPTIONS = [
  { value: 1, label: 'Tuyến TW' },
  { value: 2, label: 'Tuyến tỉnh' },
  { value: 3, label: 'Tuyến huyện' },
  { value: 4, label: 'Tuyến xã' },
];

const CatalogsAdminV2: React.FC = () => {
  const [tab, setTab] = useTabState<Tab>('abbr');
  // #467: guard double-submit — chi 1 modal/drawer mo tai mot thoi diem nen dung chung 1 state
  const [saving, setSaving] = useState(false);
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

  // Admin catalogs — occupation / gender / ethnic / nation / facility
  const [occList, setOccList] = useState<OccupationDto[]>([]);
  const [occLoading, setOccLoading] = useState(false);
  const [occKeyword, setOccKeyword] = useState('');
  const [occEditing, setOccEditing] = useState<OccupationDto | null>(null);
  const [occModal, setOccModal] = useState(false);
  const [occForm] = Form.useForm<{ code: string; name: string; note?: string; sortOrder: number; isActive: boolean }>();

  const [genList, setGenList] = useState<GenderDto[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [genKeyword, setGenKeyword] = useState('');
  const [genEditing, setGenEditing] = useState<GenderDto | null>(null);
  const [genModal, setGenModal] = useState(false);
  const [genForm] = Form.useForm<{ code: string; name: string; note?: string; sortOrder: number; isActive: boolean }>();

  const [ethList, setEthList] = useState<EthnicDto[]>([]);
  const [ethLoading, setEthLoading] = useState(false);
  const [ethKeyword, setEthKeyword] = useState('');
  const [ethEditing, setEthEditing] = useState<EthnicDto | null>(null);
  const [ethModal, setEthModal] = useState(false);
  const [ethForm] = Form.useForm<{ code: string; name: string; note?: string; sortOrder: number; isActive: boolean }>();

  const [natList, setNatList] = useState<NationDto[]>([]);
  const [natLoading, setNatLoading] = useState(false);
  const [natKeyword, setNatKeyword] = useState('');
  const [natEditing, setNatEditing] = useState<NationDto | null>(null);
  const [natModal, setNatModal] = useState(false);
  const [natForm] = Form.useForm<{ code: string; name: string; note?: string; sortOrder: number; isActive: boolean }>();

  const [facList, setFacList] = useState<InitialFacilityDto[]>([]);
  const [facLoading, setFacLoading] = useState(false);
  const [facKeyword, setFacKeyword] = useState('');
  const [facEditing, setFacEditing] = useState<InitialFacilityDto | null>(null);
  const [facModal, setFacModal] = useState(false);
  const [facForm] = Form.useForm<{ code: string; name: string; province?: string; level?: number; bhxhCode?: string; note?: string; sortOrder: number; isActive: boolean }>();

  const loadAbbrs = useCallback(async () => {
    setAbbrLoading(true);
    try { setAbbrs(await searchAbbreviations(abbrScope ? Number(abbrScope) : undefined)); }
    catch { setAbbrs([]); ti('Tai viet tat that bai'); }
    finally { setAbbrLoading(false); }
  }, [abbrScope]);

  const loadTpls = useCallback(async () => {
    setTplLoading(true);
    try { setTpls(await searchTemplates({ templateType: tplType ? Number(tplType) : undefined, keyword: tplKeyword, pageSize: 100, onlyActive: true })); }
    catch { setTpls([]); ti('Tải template thất bại'); }
    finally { setTplLoading(false); }
  }, [tplType, tplKeyword]);

  const loadOcc = useCallback(async () => {
    setOccLoading(true);
    try { setOccList(await getOccupations(occKeyword || undefined)); }
    catch { setOccList([]); ti('Tải nghề nghiệp thất bại'); }
    finally { setOccLoading(false); }
  }, [occKeyword]);

  const loadGen = useCallback(async () => {
    setGenLoading(true);
    try { setGenList(await getGenders(genKeyword || undefined)); }
    catch { setGenList([]); ti('Tải giới tính thất bại'); }
    finally { setGenLoading(false); }
  }, [genKeyword]);

  const loadEth = useCallback(async () => {
    setEthLoading(true);
    try { setEthList(await getEthnics(ethKeyword || undefined)); }
    catch { setEthList([]); ti('Tải dân tộc thất bại'); }
    finally { setEthLoading(false); }
  }, [ethKeyword]);

  const loadNat = useCallback(async () => {
    setNatLoading(true);
    try { setNatList(await getNations(natKeyword || undefined)); }
    catch { setNatList([]); ti('Tải quốc gia thất bại'); }
    finally { setNatLoading(false); }
  }, [natKeyword]);

  const loadFac = useCallback(async () => {
    setFacLoading(true);
    try { setFacList(await getInitialFacilities(facKeyword || undefined)); }
    catch { setFacList([]); ti('Tải CSKCB thất bại'); }
    finally { setFacLoading(false); }
  }, [facKeyword]);

  useEffect(() => {
    if (tab === 'abbr') loadAbbrs();
    else if (tab === 'templates') loadTpls();
    else if (tab === 'occupation') loadOcc();
    else if (tab === 'gender') loadGen();
    else if (tab === 'ethnic') loadEth();
    else if (tab === 'nation') loadNat();
    else if (tab === 'facility') loadFac();
  }, [tab, loadAbbrs, loadTpls, loadOcc, loadGen, loadEth, loadNat, loadFac]);

  // ── Abbr handlers ──
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
    if (saving) return;
    setSaving(true);
    try {
      const v = await abbrForm.validateFields();
      await saveAbbreviation({ id: abbrEditing?.id, ...v });
      tk('Đã lưu'); setAbbrModal(false); invalidateAbbreviationCache(); loadAbbrs();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };
  const deleteAbbr = (r: AbbreviationDto) => cf(`Xóa viết tắt "${r.code}"?`, async () => {
    await deleteAbbreviation(r.id); tk('Đã xóa'); invalidateAbbreviationCache(); loadAbbrs();
  }, { tone: 'crit', confirm: 'Xóa' });

  // ── Template handlers ──
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
    if (saving) return;
    setSaving(true);
    try {
      const v = await tplForm.validateFields();
      await saveTemplate({ id: tplEditing?.id, ...v });
      tk('Đã lưu template'); setTplDrawer(false); loadTpls();
    } catch { tw('Lưu thất bại'); }
    finally { setSaving(false); }
  };
  const deleteTpl = (r: ClinicalTemplateDto) => cf(`Xóa template "${r.templateName}"?`, async () => {
    await deleteTemplate(r.id); tk('Đã xóa'); loadTpls();
  }, { tone: 'crit', confirm: 'Xóa' });

  // ── Generic simple-catalog helpers ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openSimpleAdd(form: any, setEditing: (v: null) => void, setModal: (v: boolean) => void) {
    setEditing(null); form.resetFields();
    form.setFieldsValue({ sortOrder: 0, isActive: true });
    setModal(true);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function openSimpleEdit(r: any, form: any, setEditing: (v: any) => void, setModal: (v: boolean) => void) {
    setEditing(r); form.setFieldsValue(r); setModal(true);
  }

  // ── Column defs for simple catalogs ──
  const simpleCols = <T extends { code: string; name: string; isActive: boolean; note?: string }>(
  ): ColumnDef<T>[] => [
    { key: 'code', label: 'Mã', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'name', label: 'Tên', render: (r) => r.name },
    { key: 'note', label: 'Ghi chú', render: (r) => r.note || '' },
    { key: 'active', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
      : <StatusBadge tone="warn">Ngừng</StatusBadge>
    },
  ];

  const facilityLevelLabel = (lvl?: number) =>
    LEVEL_OPTIONS.find((l) => l.value === lvl)?.label || '';

  const facilityCols: ColumnDef<InitialFacilityDto>[] = [
    { key: 'code',   label: 'Mã CSKCB', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'name',   label: 'Tên cơ sở', render: (r) => r.name },
    { key: 'bhxh',  label: 'Mã BHXH', code: true, render: (r) => r.bhxhCode || '' },
    { key: 'prov',  label: 'Tỉnh/TP', render: (r) => r.province || '' },
    { key: 'level', label: 'Tuyến', render: (r) => facilityLevelLabel(r.level) },
    { key: 'active', label: 'Trạng thái', render: (r) => r.isActive
      ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
      : <StatusBadge tone="warn">Ngừng</StatusBadge>
    },
  ];

  // ── Simple catalog submit/delete factories ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeSubmit = (editing: any, form: any, saveFn: (dto: any) => Promise<any>, setModal: (v: boolean) => void, reload: () => void) =>
    async () => {
      if (saving) return;
      setSaving(true);
      try {
        const v = await form.validateFields();
        await saveFn({ id: editing?.id, ...v });
        tk('Đã lưu'); setModal(false); reload();
      } catch { tw('Lưu thất bại'); }
      finally { setSaving(false); }
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeDelete = (deleteFn: (id: string) => Promise<unknown>, reload: () => void) =>
    (r: { id: string; name: string }) => cf(`Xóa "${r.name}"?`, async () => {
      await deleteFn(r.id); tk('Đã xóa'); reload();
    }, { tone: 'crit', confirm: 'Xóa' });

  const totalCount = occList.length + genList.length + ethList.length + natList.length + facList.length;

  const abbrCols: ColumnDef<AbbreviationDto>[] = [
    { key: 'code', label: 'Code', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'exp', label: 'Cụm từ đầy đủ', render: (r) => r.expansion },
    { key: 'scope', label: 'Scope', render: (r) => r.scopeName || '' },
    { key: 'owner', label: 'Quyền', render: (r) => r.ownerUserId
      ? <StatusBadge tone="warn">Cá nhân</StatusBadge>
      : <StatusBadge tone="ok">Chung</StatusBadge>
    },
    { key: 'usage', label: 'Sử dụng', mono: true, render: (r) => r.usageCount },
  ];

  const tplCols: ColumnDef<ClinicalTemplateDto>[] = [
    { key: 'name', label: 'Tên template', render: (r) => <b>{r.templateName}</b> },
    { key: 'type', label: 'Loại', render: (r) => <StatusBadge tone="info">{r.templateTypeName}</StatusBadge> },
    { key: 'icd', label: 'ICD', code: true, render: (r) => r.icdCode || '' },
    { key: 'gender', label: 'Giới tính', render: (r) => r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : 'ất cả' },
    { key: 'age', label: 'Tuổi', mono: true, render: (r) =>
      (r.minAgeYears != null || r.maxAgeYears != null)
        ? `${r.minAgeYears ?? 0}-${r.maxAgeYears ?? '?'}`
        : ''
    },
    { key: 'public', label: 'Quyền', render: (r) => r.isPublic
      ? <StatusBadge tone="ok">Công khai</StatusBadge>
      : <StatusBadge tone="warn">Cá nhân</StatusBadge>
    },
    { key: 'usage', label: 'Sử dụng', mono: true, render: (r) => r.usageCount },
  ];

  const currentLoad = () => {
    if (tab === 'abbr') loadAbbrs();
    else if (tab === 'templates') loadTpls();
    else if (tab === 'occupation') loadOcc();
    else if (tab === 'gender') loadGen();
    else if (tab === 'ethnic') loadEth();
    else if (tab === 'nation') loadNat();
    else if (tab === 'facility') loadFac();
  };

  const openAdd = () => {
    if (tab === 'abbr') openAbbrAdd();
    else if (tab === 'templates') openTplAdd();
    else if (tab === 'occupation') openSimpleAdd(occForm, setOccEditing, setOccModal);
    else if (tab === 'gender') openSimpleAdd(genForm, setGenEditing, setGenModal);
    else if (tab === 'ethnic') openSimpleAdd(ethForm, setEthEditing, setEthModal);
    else if (tab === 'nation') openSimpleAdd(natForm, setNatEditing, setNatModal);
    else if (tab === 'facility') openSimpleAdd(facForm, setFacEditing, setFacModal);
  };

  const addLabel = () => {
    const labels: Record<Tab, string> = {
      abbr: 'Thêm viết tắt', templates: 'Thêm template',
      occupation: 'Thêm nghề nghiệp', gender: 'Thêm giới tính',
      ethnic: 'Thêm dân tộc', nation: 'Thêm quốc gia',
      facility: 'Thêm CSKCB',
    };
    return labels[tab];
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Viết tắt', val: abbrs.length, sub: 'tổng số', tone: 'info' },
        { lbl: 'Template', val: tpls.length, sub: 'tổng số', tone: 'ok' },
        { lbl: 'Danh mục hành chính', val: totalCount, sub: 'nghề nghiệp/giới tính/dân tộc/quốc gia/CSKCB', tone: 'warn' },
        { lbl: 'CSKCB', val: facList.length, sub: 'cơ sở đăng ký', tone: 'info' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <RefreshButton
            onRefresh={currentLoad}
            loading={tab === 'abbr' ? abbrLoading : tab === 'templates' ? tplLoading : tab === 'occupation' ? occLoading : tab === 'gender' ? genLoading : tab === 'ethnic' ? ethLoading : tab === 'nation' ? natLoading : facLoading}
            label="Làm mới"
          />
          <Btn variant="primary" onClick={openAdd}>
            <Ico name="plus" size={12} /> {addLabel()}
          </Btn>
        </>
      } />

      {/* Abbr */}
      {tab === 'abbr' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={abbrScope} onChange={setAbbrScope} options={SCOPE_OPTIONS} placeholder="Lọc scope" />
          <Btn variant="ghost" onClick={() => setAbbrScope('')}>
            <Ico name="x" size={12} /> Bộ lọc
          </Btn>
          <span className="spacer" />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Go code trong textarea roi bam F2 de tu dong thay the</span>
        </div>
        <DataTable<AbbreviationDto>
          columns={abbrCols} data={abbrs} loading={abbrLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openAbbrEdit(r)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => deleteAbbr(r)} />
            </div>
          )}
          empty={'Chưa có viết tắt'}
        />
      </>}

      {/* Templates */}
      {tab === 'templates' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={tplType} onChange={setTplType}
            options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ v: k, l: v as string }))}
            placeholder="Loại template" />
          <SearchBox value={tplKeyword} onChange={setTplKeyword} placeholder="Tìm theo tên / ICD..." />
          <Btn variant="ghost" onClick={() => { setTplKeyword(''); setTplType(''); }}>
            <Ico name="x" size={12} /> Bộ lọc
          </Btn>
        </div>
        <DataTable<ClinicalTemplateDto>
          columns={tplCols} data={tpls} loading={tplLoading} rowKey={(r) => r.id}
          onRowClick={openTplEdit}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openTplEdit(r)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => deleteTpl(r)} />
            </div>
          )}
          empty={'Chưa có template'}
        />
      </>}

      {/* Occupation */}
      {tab === 'occupation' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={occKeyword} onChange={setOccKeyword} placeholder="Tìm theo mã / tên..." />
          <Btn variant="ghost" onClick={() => setOccKeyword('')}><Ico name="x" size={12} /> Bộ lọc</Btn>
        </div>
        <DataTable<OccupationDto>
          columns={simpleCols<OccupationDto>()} data={occList} loading={occLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openSimpleEdit(r, occForm, setOccEditing, setOccModal)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => makeDelete(deleteOccupation, loadOcc)(r)} />
            </div>
          )}
          empty={'Chưa có nghề nghiệp'}
        />
      </>}

      {/* Gender */}
      {tab === 'gender' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={genKeyword} onChange={setGenKeyword} placeholder="Tìm theo mã / tên..." />
          <Btn variant="ghost" onClick={() => setGenKeyword('')}><Ico name="x" size={12} /> Bộ lọc</Btn>
        </div>
        <DataTable<GenderDto>
          columns={simpleCols<GenderDto>()} data={genList} loading={genLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openSimpleEdit(r, genForm, setGenEditing, setGenModal)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => makeDelete(deleteGender, loadGen)(r)} />
            </div>
          )}
          empty={'Chưa có giới tính'}
        />
      </>}

      {/* Ethnic */}
      {tab === 'ethnic' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={ethKeyword} onChange={setEthKeyword} placeholder="Tìm theo mã / tên..." />
          <Btn variant="ghost" onClick={() => setEthKeyword('')}><Ico name="x" size={12} /> Bộ lọc</Btn>
        </div>
        <DataTable<EthnicDto>
          columns={simpleCols<EthnicDto>()} data={ethList} loading={ethLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openSimpleEdit(r, ethForm, setEthEditing, setEthModal)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => makeDelete(deleteEthnic, loadEth)(r)} />
            </div>
          )}
          empty={'Chưa có dân tộc'}
        />
      </>}

      {/* Nation */}
      {tab === 'nation' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={natKeyword} onChange={setNatKeyword} placeholder="Tìm theo mã / tên..." />
          <Btn variant="ghost" onClick={() => setNatKeyword('')}><Ico name="x" size={12} /> Bộ lọc</Btn>
        </div>
        <DataTable<NationDto>
          columns={simpleCols<NationDto>()} data={natList} loading={natLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => openSimpleEdit(r, natForm, setNatEditing, setNatModal)} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => makeDelete(deleteNation, loadNat)(r)} />
            </div>
          )}
          empty={'Chưa có quốc gia'}
        />
      </>}

      {/* InitialFacility */}
      {tab === 'facility' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={facKeyword} onChange={setFacKeyword} placeholder="Tìm theo mã / tên / mã BHXH..." />
          <Btn variant="ghost" onClick={() => setFacKeyword('')}><Ico name="x" size={12} /> Bộ lọc</Btn>
        </div>
        <DataTable<InitialFacilityDto>
          columns={facilityCols} data={facList} loading={facLoading} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sửa" onClick={() => {
                setFacEditing(r);
                facForm.setFieldsValue(r);
                setFacModal(true);
              }} />
              <ActBtn ic="trash" title="Xóa" tone="crit" onClick={() => makeDelete(deleteInitialFacility, loadFac)(r)} />
            </div>
          )}
          empty={'Chưa có CSKCB'}
        />
      </>}

      {/* ── Modals abbr / template (existing) ── */}
      <ModalShell
        open={abbrModal}
        onClose={() => setAbbrModal(false)}
        size="md"
        title={abbrEditing ? 'Sửa viết tắt' : 'Thêm viết tắt'}
        footer={<>
          <Btn variant="ghost" onClick={() => setAbbrModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={submitAbbr} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}
      >
        <Form form={abbrForm} layout="vertical" scrollToFirstError>
          <Form.Item name="code" label="Code (ngắn, lowercase, không dấu)"
            rules={[{ required: true, pattern: /^[a-z0-9]+$/, message: 'Chỉ chứa chữ thường + số' }]}>
            <Input placeholder="VD: ha, nth, kbt" maxLength={20} />
          </Form.Item>
          <Form.Item name="expansion" label="Cụm từ đầy đủ" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="VD: Không bất thường" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select options={SCOPE_OPTIONS.map((s) => ({ value: Number(s.v), label: s.l }))} />
          </Form.Item>
          <Form.Item name="scopeKey" label="Scope key (tùy chọn, cho CDHA theo kỹ thuật)">
            <Input placeholder="VD: CT, MRI, XQ, nội soi" />
          </Form.Item>
          <Form.Item name="ownerOnly" valuePropName="checked">
            <Checkbox>Chi minh toi dung duoc</Checkbox>
          </Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự sắp xếp"><InputNumber min={0} /></Form.Item>
        </Form>
      </ModalShell>

      {/* Template drawer kept as-is (large form) */}
      {tplDrawer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 1000 }}
          onClick={() => setTplDrawer(false)}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 680,
            background: 'var(--bg-card)', padding: 'var(--space-24)', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-16)' }}>
              <b style={{ fontSize: 16 }}>{tplEditing ? 'Sửa template' : 'Thêm template mới'}</b>
              <Btn variant="ghost" onClick={() => setTplDrawer(false)}><Ico name="x" size={14} /></Btn>
            </div>
            <Form form={tplForm} layout="vertical" scrollToFirstError>
              <Form.Item name="templateName" label="Tên template" rules={[{ required: true }]}>
                <Input placeholder="VD: Kết luận X-quang ngực bình thường" />
              </Form.Item>
              <Form.Item name="templateType" label="Loại" rules={[{ required: true }]}>
                <Select options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))} />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-12)' }}>
                <Form.Item name="icdCode" label="Mã ICD-10"><Input placeholder="VD: J18.9" maxLength={20} /></Form.Item>
                <Form.Item name="icdName" label="Tên chẩn đoán"><Input placeholder="Viêm phổi không xác định" /></Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 120px 120px 1fr', gap: 'var(--space-12)' }}>
                <Form.Item name="gender" label="Giới tính">
                  <Select options={[{ value: 0, label: 'Tất cả' }, { value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]} />
                </Form.Item>
                <Form.Item name="minAgeYears" label="Tuổi tối thiểu"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="maxAgeYears" label="Tuổi tối đa"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
              </div>
              <Form.Item name="content" label="Nội dung template" rules={[{ required: true }]}>
                <Input.TextArea rows={12} placeholder="Nội dung mẫu..." />
              </Form.Item>
              <Form.Item name="isPublic" valuePropName="checked">
                <Checkbox>Công khai cho tất cả BS</Checkbox>
              </Form.Item>
              <Form.Item name="sortOrder" label="Thứ tự sắp xếp"><InputNumber min={0} /></Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end', marginTop: 'var(--space-16)' }}>
              <Btn variant="ghost" onClick={() => setTplDrawer(false)}>Hủy</Btn>
              <Btn variant="primary" onClick={submitTpl} loading={saving}>
                <Ico name="check" size={12} /> Lưu
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Simple catalog modals ── */}
      <ModalShell open={occModal} onClose={() => setOccModal(false)} size="sm"
        title={occEditing ? 'Sửa nghề nghiệp' : 'Thêm nghề nghiệp'}
        footer={<>
          <Btn variant="ghost" onClick={() => setOccModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={makeSubmit(occEditing, occForm, saveOccupation, setOccModal, loadOcc)} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}>
        <Form form={occForm} layout="vertical" scrollToFirstError>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input maxLength={50} /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoạt động</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={genModal} onClose={() => setGenModal(false)} size="sm"
        title={genEditing ? 'Sửa giới tính' : 'Thêm giới tính'}
        footer={<>
          <Btn variant="ghost" onClick={() => setGenModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={makeSubmit(genEditing, genForm, saveGender, setGenModal, loadGen)} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}>
        <Form form={genForm} layout="vertical" scrollToFirstError>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="name" label="ên" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoạt động</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={ethModal} onClose={() => setEthModal(false)} size="sm"
        title={ethEditing ? 'Sửa dân tộc' : 'Thêm dân tộc'}
        footer={<>
          <Btn variant="ghost" onClick={() => setEthModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={makeSubmit(ethEditing, ethForm, saveEthnic, setEthModal, loadEth)} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}>
        <Form form={ethForm} layout="vertical" scrollToFirstError>
          <Form.Item name="code" label="Mã" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoạt động</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={natModal} onClose={() => setNatModal(false)} size="sm"
        title={natEditing ? 'Sửa quốc gia' : 'Thêm quốc gia'}
        footer={<>
          <Btn variant="ghost" onClick={() => setNatModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={makeSubmit(natEditing, natForm, saveNation, setNatModal, loadNat)} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}>
        <Form form={natForm} layout="vertical" scrollToFirstError>
          <Form.Item name="code" label="Mã quốc gia" rules={[{ required: true }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="name" label="Tên quốc gia" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoạt động</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={facModal} onClose={() => setFacModal(false)} size="md"
        title={facEditing ? 'Sửa CSKCB' : 'Thêm CSKCB ban đầu'}
        footer={<>
          <Btn variant="ghost" onClick={() => setFacModal(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={makeSubmit(facEditing, facForm, saveInitialFacility, setFacModal, loadFac)} loading={saving}>
            <Ico name="check" size={12} /> Lưu
          </Btn>
        </>}>
        <Form form={facForm} layout="vertical" scrollToFirstError>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <Form.Item name="code" label="Mã CSKCB" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item>
            <Form.Item name="bhxhCode" label="Mã BHXH"><Input maxLength={20} /></Form.Item>
          </div>
          <Form.Item name="name" label="Tên cơ sở" rules={[{ required: true }]}><Input maxLength={500} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <Form.Item name="province" label="Tỉnh/Thành phố"><Input maxLength={100} /></Form.Item>
            <Form.Item name="level" label="Tuyến khám">
              <Select allowClear options={LEVEL_OPTIONS} placeholder="Chọn tuyến" />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoạt động</Checkbox></Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default CatalogsAdminV2;
