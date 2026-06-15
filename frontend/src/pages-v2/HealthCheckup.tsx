import React, { useEffect, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { searchHealthCheckups, getHealthCheckupStats, createHealthCheckup, updateHealthCheckup, getCheckupTypes } from '../api/healthCheckup';
import type { HealthCheckup, HealthCheckupStats, CheckupType } from '../api/healthCheckup';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, CrudModal, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';
import { DriverCheckupPrint, VsattpCheckupPrint, StudentCheckupPrint } from '../components/HealthCheckupPrintTemplates';

// ---- Static base fields (common to all KSK types) ----
const BASE_FIELDS: CrudFieldCfg[] = [
  { key: 'patientName', label: 'Ho ten doi tuong', required: true, placeholder: 'Nguyen Van A' },
  { key: 'patientCode', label: 'Ma/CCCD', placeholder: 'tuy chon' },
  { key: 'gender', label: 'Gioi tinh', type: 'select', required: true, options: [{ value: 1, label: 'Nam' }, { value: 2, label: 'Nu' }] },
  { key: 'dateOfBirth', label: 'Ngay sinh', type: 'date' },
  { key: 'checkupDate', label: 'Ngay kham', type: 'date', required: true },
  { key: 'examDoctor', label: 'BS kham' },
  { key: 'conclusion', label: 'Ket luan', type: 'select', options: [
    { value: 'pass', label: 'Dat' }, { value: 'conditional', label: 'Co dieu kien' }, { value: 'fail', label: 'Khong dat' }] },
  { key: 'status', label: 'Trang thai', type: 'select', options: [
    { value: 0, label: 'Cho' }, { value: 1, label: 'Dang kham' }, { value: 2, label: 'Hoan thanh' }, { value: 3, label: 'Da chung nhan' }] },
  { key: 'notes', label: 'Ghi chu', type: 'textarea' },
];

const DRIVER_FIELDS: CrudFieldCfg[] = [
  { key: 'driverLicenseClass', label: 'Hang lai xe', placeholder: 'B1, B2, C, D, E...' },
  { key: 'driverReactionTest', label: 'Thu phan xa', placeholder: 'KQ thu phan xa thi giac - van dong' },
  { key: 'driverColorVision', label: 'Thi giac mau sac', placeholder: 'Phan biet mau binh thuong / khieu sac' },
];

const VSATTP_FIELDS: CrudFieldCfg[] = [
  { key: 'foodHandlerRole', label: 'Vai tro tiep xuc thuc pham', placeholder: 'Nau an / phuc vu / che bien...' },
  { key: 'foodSafetyConclusion', label: 'Ket luan VSATTP', type: 'textarea', placeholder: 'Du/Khong du dieu kien SK tham gia che bien, kinh doanh thuc pham' },
];

const CHILD_FIELDS: CrudFieldCfg[] = [
  { key: 'ageMonths', label: 'Tuoi (thang)', placeholder: 'So thang tuoi' },
  { key: 'developmentAssessment', label: 'Danh gia phat trien', placeholder: 'Binh thuong / Cham phat trien' },
  { key: 'nutritionStatus', label: 'Tinh trang dinh duong', placeholder: 'Binh thuong / Suy dinh duong / Thua can' },
  { key: 'vaccinationStatus', label: 'Tinh trang tiem chung', placeholder: 'Day du / Chua day du / Khong ro' },
];

const STATUS_LABEL: Record<number, string> = {
  0: 'Cho', 1: 'Dang kham', 2: 'Hoan thanh', 3: 'Da chung nhan',
};

type SKey = 'pending' | 'progress' | 'done' | 'certified';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Cho',          tone: 'warn' as const },
  { v: 'progress' as SKey,  l: 'Dang kham',    tone: 'info' as const },
  { v: 'done' as SKey,      l: 'Hoan thanh',   tone: 'info' as const },
  { v: 'certified' as SKey, l: 'Da chung nhan', tone: 'ok' as const },
];

const sKey = (n: number): SKey => n === 0 ? 'pending' : n === 1 ? 'progress' : n === 2 ? 'done' : 'certified';

const CONCL_LABEL: Record<string, string> = {
  pass: 'Dat', fail: 'Khong dat', conditional: 'Co dieu kien',
};
const CONCL_TONE: Record<string, 'ok' | 'warn' | 'crit'> = {
  pass: 'ok', conditional: 'warn', fail: 'crit',
};

const PER = 18;

// Map checkupType code -> which speciality fields to show
const TYPE_EXTRA_FIELDS: Record<string, CrudFieldCfg[]> = {
  Driver: DRIVER_FIELDS,
  FoodSafety: VSATTP_FIELDS,
  Student: CHILD_FIELDS,
  ChildUnder24m: CHILD_FIELDS,
};

// Print component map: checkupType -> component key
type PrintKey = 'ksk-driver' | 'ksk-vsattp' | 'ksk-student' | null;
const TYPE_PRINT_KEY: Record<string, PrintKey> = {
  Driver: 'ksk-driver',
  FoodSafety: 'ksk-vsattp',
  Student: 'ksk-student',
  ChildUnder24m: 'ksk-student',
};

const HealthCheckupV2: React.FC = () => {
  const [items, setItems] = useState<HealthCheckup[]>([]);
  const [stats, setStats] = useState<HealthCheckupStats | null>(null);
  const [checkupTypes, setCheckupTypes] = useState<CheckupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HealthCheckup | null>(null);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);
  const [selectedType, setSelectedType] = useState('');
  const printRef = useRef<HTMLDivElement | null>(null);

  const handlePrintKsk = () => {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write('<html><head><title>Giay KSK</title></head><body>');
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  const openCreate = () => { setSelectedType(''); setCrudInit({}); setCrudOpen(true); };
  const openEdit = (r: HealthCheckup) => { setSelectedType(r.checkupType || ''); setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };

  const load = async () => {
    setLoading(true);
    try {
      const [list, s, types] = await Promise.all([
        searchHealthCheckups({ keyword: search, pageSize: 200 }),
        getHealthCheckupStats(),
        getCheckupTypes(),
      ]);
      setItems(list);
      setStats(s);
      setCheckupTypes(types);
    } catch { ti('Khong tai duoc KSK'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const typeOptions = useMemo(() => checkupTypes.map((t) => ({ v: t.code, l: t.name })), [checkupTypes]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fType && r.checkupType !== fType) return false;
      if (!k) return true;
      return [r.patientName, r.patientCode, r.checkupCode, r.companyName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  // Dynamic fields: show type selector + base fields + specialty fields based on selectedType.
  // selectedType is updated when user opens edit (from record.checkupType) or when selecting type in form.
  const crudFields = useMemo<CrudFieldCfg[]>(() => {
    const typeField: CrudFieldCfg = {
      key: 'checkupType',
      label: 'Loai KSK',
      type: 'select',
      required: true,
      options: checkupTypes.map((t) => ({ value: t.code, label: t.name })),
    };
    const extra = TYPE_EXTRA_FIELDS[selectedType] ?? [];
    return [typeField, ...BASE_FIELDS, ...extra];
  }, [selectedType, checkupTypes]);

  // Watch crudInit.checkupType to update extra fields when editing an existing record
  useEffect(() => {
    if (crudInit?.checkupType && typeof crudInit.checkupType === 'string') {
      setSelectedType(crudInit.checkupType);
    }
  }, [crudInit]);

  const printKey = sel ? (TYPE_PRINT_KEY[sel.checkupType] ?? null) : null;

  const cols: ColumnDef<HealthCheckup>[] = [
    { key: 'code', label: 'Ma KSK', code: true, render: (r) => r.checkupCode },
    { key: 'pt', label: 'Doi tuong', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.gender === 1 ? 'Nam' : 'Nu'} · {r.patientCode}</div>
      </div>
    ) },
    { key: 'date', label: 'Ngay', mono: true, render: (r) => dayjs(r.checkupDate).format('DD/MM/YYYY') },
    { key: 'type', label: 'Loai', render: (r) => {
      const t = checkupTypes.find((x) => x.code === r.checkupType);
      return t ? t.name : r.checkupType;
    } },
    { key: 'doc', label: 'BS kham', render: (r) => r.examDoctor },
    { key: 'concl', label: 'Ket luan', render: (r) => r.conclusion ? (
      <StatusBadge tone={CONCL_TONE[r.conclusion] || 'info'} dot>{CONCL_LABEL[r.conclusion] || r.conclusion}</StatusBadge>
    ) : <span style={{ color: 'var(--t-2)' }}>—</span> },
    { key: 'st', label: 'Trang thai', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: HealthCheckup) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiet" onClick={() => setSel(r)} />
      <ActBtn ic="edit" title="Sua" onClick={() => openEdit(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tong KSK', val: stats?.totalCheckups ?? items.length, sub: 'tat ca' },
        { lbl: 'Hom nay', val: stats?.todayCount ?? 0, sub: 'da kham', tone: 'info' },
        { lbl: 'Dat', val: stats?.passCount ?? items.filter((c) => c.conclusion === 'pass').length, sub: `${Math.round(((stats?.passCount ?? 0) / Math.max(1, stats?.totalCheckups ?? items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Khong dat', val: stats?.failCount ?? items.filter((c) => c.conclusion === 'fail').length, sub: 'can dieu tri', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tim BN / ma KSK..." />
        <Filter value={fType} onChange={setFType} options={typeOptions} placeholder="Loai KSK" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>Bo loc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Lam moi</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>KSK moi</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HealthCheckup>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Dang tai...' : 'Chua co kham SK'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.checkupCode} · ${sel.checkupType}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Dong</Btn>
          {printKey && <Btn icon="print" onClick={handlePrintKsk}>In giay CN</Btn>}
          <Btn variant="primary" icon="edit" onClick={() => { if (sel) openEdit(sel); setSel(null); }}>Cap nhat</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Doi tuong">
            <DrField lbl="Ma KSK"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.checkupCode}</span></DrField>
            <DrField lbl="Ho ten">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Gioi tinh">{sel.gender === 1 ? 'Nam' : 'Nu'}</DrField>
            <DrField lbl="Ngay sinh">{dayjs(sel.dateOfBirth).format('DD/MM/YYYY')}</DrField>
            {sel.companyName && <DrField lbl="Cong ty">{sel.companyName}</DrField>}
          </DrSec>
          <DrSec title="Kham">
            <DrField lbl="Loai">{checkupTypes.find((t) => t.code === sel.checkupType)?.name ?? sel.checkupType}</DrField>
            <DrField lbl="Ngay kham">{dayjs(sel.checkupDate).format('DD/MM/YYYY')}</DrField>
            <DrField lbl="BS kham">{sel.examDoctor}</DrField>
            <DrField lbl="Trang thai">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Kham chuyen khoa">
            {sel.internalMedicine && <DrField lbl="Noi khoa">{sel.internalMedicine}</DrField>}
            {sel.surgery && <DrField lbl="Ngoai khoa">{sel.surgery}</DrField>}
            {sel.ophthalmology && <DrField lbl="Mat">{sel.ophthalmology}</DrField>}
            {sel.entExam && <DrField lbl="TMH">{sel.entExam}</DrField>}
            {sel.dentalExam && <DrField lbl="RHM">{sel.dentalExam}</DrField>}
            {sel.dermatology && <DrField lbl="Da lieu">{sel.dermatology}</DrField>}
            {sel.gynecology && <DrField lbl="Phu khoa">{sel.gynecology}</DrField>}
            {sel.psychiatry && <DrField lbl="Tam than">{sel.psychiatry}</DrField>}
          </DrSec>
          {sel.checkupType === 'Driver' && (
            <DrSec title="KSK Lai xe (TT36)">
              {sel.driverLicenseClass && <DrField lbl="Hang lai xe">{sel.driverLicenseClass}</DrField>}
              {sel.driverReactionTest && <DrField lbl="Thu phan xa">{sel.driverReactionTest}</DrField>}
              {sel.driverColorVision && <DrField lbl="Thi giac mau">{sel.driverColorVision}</DrField>}
            </DrSec>
          )}
          {sel.checkupType === 'FoodSafety' && (
            <DrSec title="KSK VSATTP (TT15)">
              {sel.foodHandlerRole && <DrField lbl="Vai tro">{sel.foodHandlerRole}</DrField>}
              {sel.foodSafetyConclusion && <DrField lbl="Ket luan VSATTP">{sel.foodSafetyConclusion}</DrField>}
            </DrSec>
          )}
          {(sel.checkupType === 'Student' || sel.checkupType === 'ChildUnder24m') && (
            <DrSec title="KSK Tre em / Di hoc">
              {sel.ageMonths != null && <DrField lbl="Tuoi (thang)">{sel.ageMonths}</DrField>}
              {sel.developmentAssessment && <DrField lbl="Phat trien">{sel.developmentAssessment}</DrField>}
              {sel.nutritionStatus && <DrField lbl="Dinh duong">{sel.nutritionStatus}</DrField>}
              {sel.vaccinationStatus && <DrField lbl="Tiem chung">{sel.vaccinationStatus}</DrField>}
            </DrSec>
          )}
          <DrSec title="Ket luan">
            {sel.labResults && <DrField lbl="KQ XN">{sel.labResults}</DrField>}
            {sel.xrayResults && <DrField lbl="X-quang">{sel.xrayResults}</DrField>}
            <DrField lbl="Ket luan">
              {sel.conclusion ? (
                <StatusBadge tone={CONCL_TONE[sel.conclusion] || 'info'} dot>{CONCL_LABEL[sel.conclusion] || sel.conclusion}</StatusBadge>
              ) : '—'}
            </DrField>
            {sel.notes && <DrField lbl="Ghi chu">{sel.notes}</DrField>}
          </DrSec>

          {/* Hidden print area */}
          {printKey === 'ksk-driver' && <div style={{ display: 'none' }}><DriverCheckupPrint ref={printRef} record={sel} /></div>}
          {printKey === 'ksk-vsattp' && <div style={{ display: 'none' }}><VsattpCheckupPrint ref={printRef} record={sel} /></div>}
          {printKey === 'ksk-student' && <div style={{ display: 'none' }}><StudentCheckupPrint ref={printRef} record={sel} /></div>}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cap nhat KSK' : 'Kham suc khoe moi'}
        sub="KSK chuyen biet: lai xe / VSATTP / di hoc / tong quat"
        fields={crudFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          if (editing && crudInit?.id) await updateHealthCheckup(String(crudInit.id), v);
          else await createHealthCheckup(v);
          tk(editing ? 'Da cap nhat KSK' : 'Da tao KSK');
          load();
        }}
      />
    </div>
  );
};

export default HealthCheckupV2;
