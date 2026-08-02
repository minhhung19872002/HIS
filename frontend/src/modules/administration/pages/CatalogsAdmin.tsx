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

type Tab = 'abbr' | 'templates' | 'occupation' | 'gender' | 'ethnic' | 'nation' | 'facility';
const TABS = [
  { v: 'abbr' as Tab,       l: 'Viet tat (F2)',      ic: 'edit' },
  { v: 'templates' as Tab,  l: 'Template lam sang',  ic: 'file-text' },
  { v: 'occupation' as Tab, l: 'Nghe nghiep',        ic: 'briefcase' },
  { v: 'gender' as Tab,     l: 'Gioi tinh',          ic: 'users' },
  { v: 'ethnic' as Tab,     l: 'Dan toc',            ic: 'globe' },
  { v: 'nation' as Tab,     l: 'Quoc gia',           ic: 'flag' },
  { v: 'facility' as Tab,   l: 'CSKCB ban dau',      ic: 'home' },
];

const SCOPE_OPTIONS = [
  { v: String(ABBREVIATION_SCOPES.GENERAL),      l: 'Chung' },
  { v: String(ABBREVIATION_SCOPES.PRESCRIPTION), l: 'Ghi chu thuoc' },
  { v: String(ABBREVIATION_SCOPES.DIAGNOSIS),    l: 'Chan doan / Trieu chung' },
  { v: String(ABBREVIATION_SCOPES.LAB),          l: 'Ket qua XN' },
  { v: String(ABBREVIATION_SCOPES.RADIOLOGY),    l: 'CDHA' },
  { v: String(ABBREVIATION_SCOPES.APPOINTMENT),  l: 'Hen' },
];

const LEVEL_OPTIONS = [
  { value: 1, label: 'Tuyen TW' },
  { value: 2, label: 'Tuyen tinh' },
  { value: 3, label: 'Tuyen huyen' },
  { value: 4, label: 'Tuyen xa' },
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
    catch { setTpls([]); ti('Tai template that bai'); }
    finally { setTplLoading(false); }
  }, [tplType, tplKeyword]);

  const loadOcc = useCallback(async () => {
    setOccLoading(true);
    try { setOccList(await getOccupations(occKeyword || undefined)); }
    catch { setOccList([]); ti('Tai nghe nghiep that bai'); }
    finally { setOccLoading(false); }
  }, [occKeyword]);

  const loadGen = useCallback(async () => {
    setGenLoading(true);
    try { setGenList(await getGenders(genKeyword || undefined)); }
    catch { setGenList([]); ti('Tai gioi tinh that bai'); }
    finally { setGenLoading(false); }
  }, [genKeyword]);

  const loadEth = useCallback(async () => {
    setEthLoading(true);
    try { setEthList(await getEthnics(ethKeyword || undefined)); }
    catch { setEthList([]); ti('Tai dan toc that bai'); }
    finally { setEthLoading(false); }
  }, [ethKeyword]);

  const loadNat = useCallback(async () => {
    setNatLoading(true);
    try { setNatList(await getNations(natKeyword || undefined)); }
    catch { setNatList([]); ti('Tai quoc gia that bai'); }
    finally { setNatLoading(false); }
  }, [natKeyword]);

  const loadFac = useCallback(async () => {
    setFacLoading(true);
    try { setFacList(await getInitialFacilities(facKeyword || undefined)); }
    catch { setFacList([]); ti('Tai CSKCB that bai'); }
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
    try {
      const v = await abbrForm.validateFields();
      await saveAbbreviation({ id: abbrEditing?.id, ...v });
      tk('Da luu'); setAbbrModal(false); invalidateAbbreviationCache(); loadAbbrs();
    } catch { tw('Luu that bai'); }
  };
  const deleteAbbr = (r: AbbreviationDto) => cf(`Xoa viet tat "${r.code}"?`, async () => {
    await deleteAbbreviation(r.id); tk('Da xoa'); invalidateAbbreviationCache(); loadAbbrs();
  }, { tone: 'crit', confirm: 'Xoa' });

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
    try {
      const v = await tplForm.validateFields();
      await saveTemplate({ id: tplEditing?.id, ...v });
      tk('Da luu template'); setTplDrawer(false); loadTpls();
    } catch { tw('Luu that bai'); }
  };
  const deleteTpl = (r: ClinicalTemplateDto) => cf(`Xoa template "${r.templateName}"?`, async () => {
    await deleteTemplate(r.id); tk('Da xoa'); loadTpls();
  }, { tone: 'crit', confirm: 'Xoa' });

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
    { key: 'code', label: 'Ma', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'name', label: 'Ten', render: (r) => r.name },
    { key: 'note', label: 'Ghi chu', render: (r) => r.note || '' },
    { key: 'active', label: 'Trang thai', render: (r) => r.isActive
      ? <StatusBadge tone="ok">Hoat dong</StatusBadge>
      : <StatusBadge tone="warn">Ngung</StatusBadge>
    },
  ];

  const facilityLevelLabel = (lvl?: number) =>
    LEVEL_OPTIONS.find((l) => l.value === lvl)?.label || '';

  const facilityCols: ColumnDef<InitialFacilityDto>[] = [
    { key: 'code',   label: 'Ma CSKCB', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'name',   label: 'Ten co so', render: (r) => r.name },
    { key: 'bhxh',  label: 'Ma BHXH', code: true, render: (r) => r.bhxhCode || '' },
    { key: 'prov',  label: 'Tinh/TP', render: (r) => r.province || '' },
    { key: 'level', label: 'Tuyen', render: (r) => facilityLevelLabel(r.level) },
    { key: 'active', label: 'Trang thai', render: (r) => r.isActive
      ? <StatusBadge tone="ok">Hoat dong</StatusBadge>
      : <StatusBadge tone="warn">Ngung</StatusBadge>
    },
  ];

  // ── Simple catalog submit/delete factories ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeSubmit = (editing: any, form: any, saveFn: (dto: any) => Promise<any>, setModal: (v: boolean) => void, reload: () => void) =>
    async () => {
      try {
        const v = await form.validateFields();
        await saveFn({ id: editing?.id, ...v });
        tk('Da luu'); setModal(false); reload();
      } catch { tw('Luu that bai'); }
    };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const makeDelete = (deleteFn: (id: string) => Promise<unknown>, reload: () => void) =>
    (r: { id: string; name: string }) => cf(`Xoa "${r.name}"?`, async () => {
      await deleteFn(r.id); tk('Da xoa'); reload();
    }, { tone: 'crit', confirm: 'Xoa' });

  const totalCount = occList.length + genList.length + ethList.length + natList.length + facList.length;

  const abbrCols: ColumnDef<AbbreviationDto>[] = [
    { key: 'code', label: 'Code', render: (r) => <StatusBadge tone="info">{r.code}</StatusBadge> },
    { key: 'exp', label: 'Cum tu day du', render: (r) => r.expansion },
    { key: 'scope', label: 'Scope', render: (r) => r.scopeName || '' },
    { key: 'owner', label: 'Quyen', render: (r) => r.ownerUserId
      ? <StatusBadge tone="warn">Ca nhan</StatusBadge>
      : <StatusBadge tone="ok">Chung</StatusBadge>
    },
    { key: 'usage', label: 'Da dung', mono: true, render: (r) => r.usageCount },
  ];

  const tplCols: ColumnDef<ClinicalTemplateDto>[] = [
    { key: 'name', label: 'Ten template', render: (r) => <b>{r.templateName}</b> },
    { key: 'type', label: 'Loai', render: (r) => <StatusBadge tone="info">{r.templateTypeName}</StatusBadge> },
    { key: 'icd', label: 'ICD', code: true, render: (r) => r.icdCode || '' },
    { key: 'gender', label: 'Gioi', render: (r) => r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nu' : 'Tat ca' },
    { key: 'age', label: 'Tuoi', mono: true, render: (r) =>
      (r.minAgeYears != null || r.maxAgeYears != null)
        ? `${r.minAgeYears ?? 0}-${r.maxAgeYears ?? '?'}`
        : ''
    },
    { key: 'public', label: 'Quyen', render: (r) => r.isPublic
      ? <StatusBadge tone="ok">Cong khai</StatusBadge>
      : <StatusBadge tone="warn">Ca nhan</StatusBadge>
    },
    { key: 'usage', label: 'Da dung', mono: true, render: (r) => r.usageCount },
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
      abbr: 'Them viet tat', templates: 'Them template',
      occupation: 'Them nghe nghiep', gender: 'Them gioi tinh',
      ethnic: 'Them dan toc', nation: 'Them quoc gia',
      facility: 'Them CSKCB',
    };
    return labels[tab];
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Viet tat', val: abbrs.length, sub: 'tong so', tone: 'info' },
        { lbl: 'Template', val: tpls.length, sub: 'tong so', tone: 'ok' },
        { lbl: 'DM hanh chinh', val: totalCount, sub: 'nghe/gioi/toc/nuoc/cskcb', tone: 'warn' },
        { lbl: 'CSKCB', val: facList.length, sub: 'co so dang ky', tone: 'info' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <Btn variant="ghost" onClick={currentLoad}>
            <Ico name="refresh" size={12} /> Lam moi
          </Btn>
          <Btn variant="primary" onClick={openAdd}>
            <Ico name="plus" size={12} /> {addLabel()}
          </Btn>
        </>
      } />

      {/* Abbr */}
      {tab === 'abbr' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={abbrScope} onChange={setAbbrScope} options={SCOPE_OPTIONS} placeholder="Loc scope" />
          <Btn variant="ghost" onClick={() => setAbbrScope('')}>
            <Ico name="x" size={12} /> Bo loc
          </Btn>
          <span className="spacer" />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>Go code trong textarea roi bam F2 de tu dong thay the</span>
        </div>
        <DataTable<AbbreviationDto>
          columns={abbrCols} data={abbrs} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openAbbrEdit(r)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => deleteAbbr(r)} />
            </div>
          )}
          empty={abbrLoading ? 'Dang tai...' : 'Chua co viet tat'}
        />
      </>}

      {/* Templates */}
      {tab === 'templates' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <Filter value={tplType} onChange={setTplType}
            options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ v: k, l: v as string }))}
            placeholder="Loai template" />
          <SearchBox value={tplKeyword} onChange={setTplKeyword} placeholder="Tim theo ten / ICD..." />
          <Btn variant="ghost" onClick={() => { setTplKeyword(''); setTplType(''); }}>
            <Ico name="x" size={12} /> Bo loc
          </Btn>
        </div>
        <DataTable<ClinicalTemplateDto>
          columns={tplCols} data={tpls} rowKey={(r) => r.id}
          onRowClick={openTplEdit}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openTplEdit(r)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => deleteTpl(r)} />
            </div>
          )}
          empty={tplLoading ? 'Dang tai...' : 'Chua co template'}
        />
      </>}

      {/* Occupation */}
      {tab === 'occupation' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={occKeyword} onChange={setOccKeyword} placeholder="Tim theo ma / ten..." />
          <Btn variant="ghost" onClick={() => setOccKeyword('')}><Ico name="x" size={12} /> Bo loc</Btn>
        </div>
        <DataTable<OccupationDto>
          columns={simpleCols<OccupationDto>()} data={occList} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openSimpleEdit(r, occForm, setOccEditing, setOccModal)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => makeDelete(deleteOccupation, loadOcc)(r)} />
            </div>
          )}
          empty={occLoading ? 'Dang tai...' : 'Chua co nghe nghiep'}
        />
      </>}

      {/* Gender */}
      {tab === 'gender' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={genKeyword} onChange={setGenKeyword} placeholder="Tim theo ma / ten..." />
          <Btn variant="ghost" onClick={() => setGenKeyword('')}><Ico name="x" size={12} /> Bo loc</Btn>
        </div>
        <DataTable<GenderDto>
          columns={simpleCols<GenderDto>()} data={genList} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openSimpleEdit(r, genForm, setGenEditing, setGenModal)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => makeDelete(deleteGender, loadGen)(r)} />
            </div>
          )}
          empty={genLoading ? 'Dang tai...' : 'Chua co gioi tinh'}
        />
      </>}

      {/* Ethnic */}
      {tab === 'ethnic' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={ethKeyword} onChange={setEthKeyword} placeholder="Tim theo ma / ten..." />
          <Btn variant="ghost" onClick={() => setEthKeyword('')}><Ico name="x" size={12} /> Bo loc</Btn>
        </div>
        <DataTable<EthnicDto>
          columns={simpleCols<EthnicDto>()} data={ethList} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openSimpleEdit(r, ethForm, setEthEditing, setEthModal)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => makeDelete(deleteEthnic, loadEth)(r)} />
            </div>
          )}
          empty={ethLoading ? 'Dang tai...' : 'Chua co dan toc'}
        />
      </>}

      {/* Nation */}
      {tab === 'nation' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={natKeyword} onChange={setNatKeyword} placeholder="Tim theo ma / ten..." />
          <Btn variant="ghost" onClick={() => setNatKeyword('')}><Ico name="x" size={12} /> Bo loc</Btn>
        </div>
        <DataTable<NationDto>
          columns={simpleCols<NationDto>()} data={natList} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => openSimpleEdit(r, natForm, setNatEditing, setNatModal)} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => makeDelete(deleteNation, loadNat)(r)} />
            </div>
          )}
          empty={natLoading ? 'Dang tai...' : 'Chua co quoc gia'}
        />
      </>}

      {/* InitialFacility */}
      {tab === 'facility' && <>
        <div className="ab-toolbar" style={{ borderTop: 'none' }}>
          <SearchBox value={facKeyword} onChange={setFacKeyword} placeholder="Tim theo ma / ten / ma BHXH..." />
          <Btn variant="ghost" onClick={() => setFacKeyword('')}><Ico name="x" size={12} /> Bo loc</Btn>
        </div>
        <DataTable<InitialFacilityDto>
          columns={facilityCols} data={facList} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="edit" title="Sua" onClick={() => {
                setFacEditing(r);
                facForm.setFieldsValue(r);
                setFacModal(true);
              }} />
              <ActBtn ic="trash" title="Xoa" tone="crit" onClick={() => makeDelete(deleteInitialFacility, loadFac)(r)} />
            </div>
          )}
          empty={facLoading ? 'Dang tai...' : 'Chua co CSKCB'}
        />
      </>}

      {/* ── Modals abbr / template (existing) ── */}
      <ModalShell
        open={abbrModal}
        onClose={() => setAbbrModal(false)}
        size="md"
        title={abbrEditing ? 'Sua viet tat' : 'Them viet tat'}
        footer={<>
          <Btn variant="ghost" onClick={() => setAbbrModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={submitAbbr}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}
      >
        <Form form={abbrForm} layout="vertical">
          <Form.Item name="code" label="Code (ngan, lowercase, khong dau)"
            rules={[{ required: true, pattern: /^[a-z0-9]+$/, message: 'Chi chu thuong + so' }]}>
            <Input placeholder="VD: ha, nth, kbt" maxLength={20} />
          </Form.Item>
          <Form.Item name="expansion" label="Cum tu day du" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="VD: Khong bat thuong" />
          </Form.Item>
          <Form.Item name="scope" label="Scope" rules={[{ required: true }]}>
            <Select options={SCOPE_OPTIONS.map((s) => ({ value: Number(s.v), label: s.l }))} />
          </Form.Item>
          <Form.Item name="scopeKey" label="Scope key (tuy chon, cho CDHA theo ky thuat)">
            <Input placeholder="VD: CT, MRI, XQ, noi soi" />
          </Form.Item>
          <Form.Item name="ownerOnly" valuePropName="checked">
            <Checkbox>Chi minh toi dung duoc</Checkbox>
          </Form.Item>
          <Form.Item name="sortOrder" label="Thu tu sap xep"><InputNumber min={0} /></Form.Item>
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
              <b style={{ fontSize: 16 }}>{tplEditing ? 'Sua template' : 'Them template moi'}</b>
              <Btn variant="ghost" onClick={() => setTplDrawer(false)}><Ico name="x" size={14} /></Btn>
            </div>
            <Form form={tplForm} layout="vertical">
              <Form.Item name="templateName" label="Ten template" rules={[{ required: true }]}>
                <Input placeholder="VD: Ket luan X-quang nguc binh thuong" />
              </Form.Item>
              <Form.Item name="templateType" label="Loai" rules={[{ required: true }]}>
                <Select options={Object.entries(TEMPLATE_TYPE_LABELS).map(([k, v]) => ({ value: Number(k), label: v }))} />
              </Form.Item>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-12)' }}>
                <Form.Item name="icdCode" label="Ma ICD-10"><Input placeholder="VD: J18.9" maxLength={20} /></Form.Item>
                <Form.Item name="icdName" label="Ten chan doan"><Input placeholder="Viem phoi khong xac dinh" /></Form.Item>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 120px 120px 1fr', gap: 'var(--space-12)' }}>
                <Form.Item name="gender" label="Gioi tinh">
                  <Select options={[{ value: 0, label: 'Tat ca' }, { value: 1, label: 'Nam' }, { value: 2, label: 'Nu' }]} />
                </Form.Item>
                <Form.Item name="minAgeYears" label="Tuoi toi thieu"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
                <Form.Item name="maxAgeYears" label="Tuoi toi da"><InputNumber min={0} max={120} style={{ width: '100%' }} /></Form.Item>
              </div>
              <Form.Item name="content" label="Noi dung template" rules={[{ required: true }]}>
                <Input.TextArea rows={12} placeholder="Noi dung mau..." />
              </Form.Item>
              <Form.Item name="isPublic" valuePropName="checked">
                <Checkbox>Cong khai cho tat ca BS</Checkbox>
              </Form.Item>
              <Form.Item name="sortOrder" label="Thu tu sap xep"><InputNumber min={0} /></Form.Item>
            </Form>
            <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'flex-end', marginTop: 'var(--space-16)' }}>
              <Btn variant="ghost" onClick={() => setTplDrawer(false)}>Huy</Btn>
              <Btn variant="primary" onClick={submitTpl}><Ico name="check" size={12} /> Luu</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Simple catalog modals ── */}
      <ModalShell open={occModal} onClose={() => setOccModal(false)} size="sm"
        title={occEditing ? 'Sua nghe nghiep' : 'Them nghe nghiep'}
        footer={<>
          <Btn variant="ghost" onClick={() => setOccModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={makeSubmit(occEditing, occForm, saveOccupation, setOccModal, loadOcc)}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}>
        <Form form={occForm} layout="vertical">
          <Form.Item name="code" label="Ma" rules={[{ required: true }]}><Input maxLength={50} /></Form.Item>
          <Form.Item name="name" label="Ten" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chu"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thu tu"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoat dong</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={genModal} onClose={() => setGenModal(false)} size="sm"
        title={genEditing ? 'Sua gioi tinh' : 'Them gioi tinh'}
        footer={<>
          <Btn variant="ghost" onClick={() => setGenModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={makeSubmit(genEditing, genForm, saveGender, setGenModal, loadGen)}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}>
        <Form form={genForm} layout="vertical">
          <Form.Item name="code" label="Ma" rules={[{ required: true }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="name" label="Ten" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="note" label="Ghi chu"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thu tu"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoat dong</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={ethModal} onClose={() => setEthModal(false)} size="sm"
        title={ethEditing ? 'Sua dan toc' : 'Them dan toc'}
        footer={<>
          <Btn variant="ghost" onClick={() => setEthModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={makeSubmit(ethEditing, ethForm, saveEthnic, setEthModal, loadEth)}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}>
        <Form form={ethForm} layout="vertical">
          <Form.Item name="code" label="Ma" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item>
          <Form.Item name="name" label="Ten" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chu"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thu tu"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoat dong</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={natModal} onClose={() => setNatModal(false)} size="sm"
        title={natEditing ? 'Sua quoc gia' : 'Them quoc gia'}
        footer={<>
          <Btn variant="ghost" onClick={() => setNatModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={makeSubmit(natEditing, natForm, saveNation, setNatModal, loadNat)}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}>
        <Form form={natForm} layout="vertical">
          <Form.Item name="code" label="Ma quoc gia" rules={[{ required: true }]}><Input maxLength={10} /></Form.Item>
          <Form.Item name="name" label="Ten quoc gia" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="note" label="Ghi chu"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thu tu"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoat dong</Checkbox></Form.Item>
        </Form>
      </ModalShell>

      <ModalShell open={facModal} onClose={() => setFacModal(false)} size="md"
        title={facEditing ? 'Sua CSKCB' : 'Them CSKCB ban dau'}
        footer={<>
          <Btn variant="ghost" onClick={() => setFacModal(false)}>Huy</Btn>
          <Btn variant="primary" onClick={makeSubmit(facEditing, facForm, saveInitialFacility, setFacModal, loadFac)}>
            <Ico name="check" size={12} /> Luu
          </Btn>
        </>}>
        <Form form={facForm} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <Form.Item name="code" label="Ma CSKCB" rules={[{ required: true }]}><Input maxLength={20} /></Form.Item>
            <Form.Item name="bhxhCode" label="Ma BHXH"><Input maxLength={20} /></Form.Item>
          </div>
          <Form.Item name="name" label="Ten co so" rules={[{ required: true }]}><Input maxLength={500} /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <Form.Item name="province" label="Tinh/Thanh pho"><Input maxLength={100} /></Form.Item>
            <Form.Item name="level" label="Tuyen kham">
              <Select allowClear options={LEVEL_OPTIONS} placeholder="Chon tuyen" />
            </Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chu"><Input maxLength={500} /></Form.Item>
          <Form.Item name="sortOrder" label="Thu tu"><InputNumber min={0} /></Form.Item>
          <Form.Item name="isActive" valuePropName="checked"><Checkbox>Hoat dong</Checkbox></Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default CatalogsAdminV2;
