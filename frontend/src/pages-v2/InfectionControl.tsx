import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getHAICases, createHAICase, createIsolationOrder } from '../modules/infection-control/api/infectionControl';
import type { CreateHAISurveillanceDto, CreateIsolationOrderDto } from '../modules/infection-control/api/infectionControl';
import { getInpatientList } from '../modules/inpatient/api/inpatient';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, CrudModal, Btn,
  DrawerShell, DrSec, DrField, tk, ti,
  type ColumnDef, type CrudFieldCfg,
} from './_v2kit';

type Row = {
  id: string;
  caseCode?: string;
  patientName?: string;
  patientCode?: string;
  departmentName?: string;
  bedNumber?: string;
  infectionType?: string;
  infectionTypeName?: string;
  infectionSite?: string;
  onsetDate?: string;
  diagnosisDate?: string;
  organism?: string;
  isMDRO?: boolean;
  mdroType?: string;
  resistancePattern?: string;
  daysSinceAdmission?: number;
  hasCentralLine?: boolean;
  centralLineDays?: number | null;
  hasUrinaryCatheter?: boolean;
  catheterDays?: number | null;
  onVentilator?: boolean;
  ventilatorDays?: number | null;
  deviceAssociated?: boolean;
  deviceType?: string;
  deviceDays?: number;
  isOutbreakRelated?: boolean;
  status?: string | number;
  statusName?: string;
  severity?: string | number;
  severityName?: string;
  riskFactors?: string[];
  reportedBy?: string;
  reportedAt?: string;
  requiresIsolation?: boolean;
};

const SEVERITY_LABEL: Record<string, string> = { Mild: 'Nhẹ', Moderate: 'Vừa', Severe: 'Nặng' };
const SEVERITY_TONE: Record<string, 'ok' | 'warn' | 'crit'> = { Mild: 'ok', Moderate: 'warn', Severe: 'crit' };

type SKey = 'suspected' | 'confirmed' | 'resolved' | 'excluded';
const STATUS_TABS = [
  { v: 'suspected' as SKey, l: 'Nghi ngờ',  tone: 'warn' as const },
  { v: 'confirmed' as SKey, l: 'Xác định',  tone: 'crit' as const },
  { v: 'resolved' as SKey,  l: 'Đã giải quyết', tone: 'ok' as const },
  { v: 'excluded' as SKey,  l: 'Loại trừ',  tone: 'info' as const },
];

const sKey = (st: string | number | undefined): SKey => {
  const k = String(st || '').toLowerCase();
  if (k === 'confirmed' || k === '1') return 'confirmed';
  if (k === 'resolved' || k === '2') return 'resolved';
  if (k === 'excluded' || k === '3' || k === 'deceased') return 'excluded';
  return 'suspected';
};

const isDevice = (r: Row) => r.deviceAssociated || r.hasCentralLine || r.hasUrinaryCatheter || r.onVentilator;

const PER = 18;

const InfectionControlV2: React.FC = () => {
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fInfType, setFInfType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Row | null>(null);
  const [admissionOpts, setAdmissionOpts] = useState<{ value: string; label: string }[]>([]);
  const [isoOpen, setIsoOpen] = useState(false);
  const [isoInit, setIsoInit] = useState<Record<string, unknown> | null>(null);

  const isoFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true },
    { key: 'isolationType', label: 'Loại cách ly', type: 'select', required: true, options: [
      { value: 'Contact',    label: 'Cách ly tiếp xúc' },
      { value: 'Droplet',   label: 'Cách ly giọt bắn' },
      { value: 'Airborne',  label: 'Cách ly không khí' },
      { value: 'Protective', label: 'Cách ly bảo vệ' }] },
    { key: 'precautions', label: 'Biện pháp phòng ngừa', type: 'multiselect', options: [
      { value: 'Gloves',  label: 'Găng tay' },
      { value: 'Gown',    label: 'Áo choàng' },
      { value: 'Mask',    label: 'Khẩu trang thường' },
      { value: 'N95',     label: 'Khẩu trang N95' },
      { value: 'Goggles', label: 'Kính bảo hộ' },
      { value: 'PrivateRoom', label: 'Phòng riêng' }] },
    { key: 'reason', label: 'Lý do cách ly', required: true, type: 'textarea' },
    { key: 'organism', label: 'Mầm bệnh' },
    { key: 'isMDRO', label: 'Kháng đa thuốc (MDRO)', type: 'switch' },
    { key: 'ppeRequirements', label: 'Yêu cầu PPE', type: 'multiselect', options: [
      { value: 'Gloves',  label: 'Găng tay' },
      { value: 'Gown',    label: 'Áo choàng' },
      { value: 'Mask',    label: 'Khẩu trang' },
      { value: 'N95',     label: 'N95' },
      { value: 'FaceShield', label: 'Tấm che mặt' }] },
    { key: 'visitorRestrictions', label: 'Hạn chế thăm bệnh', type: 'textarea' },
    { key: 'specialInstructions', label: 'Hướng dẫn đặc biệt', type: 'textarea' },
  ], [admissionOpts]);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ isMDRO: false, onsetDate: dayjs().format('YYYY-MM-DD') }); setCrudOpen(true); };

  // Form theo đúng contract backend ReportHAIDto (POST hai-reports). Backend không có
  // endpoint update/investigate/close cho HAI → trang chỉ hỗ trợ tạo mới.
  const haiFields: CrudFieldCfg[] = useMemo(() => [
    { key: 'admissionId', label: 'Bệnh nhân (nội trú)', type: 'select', required: true, options: admissionOpts, showSearch: true },
    { key: 'infectionType', label: 'Loại nhiễm khuẩn', type: 'select', required: true, options: [
      { value: 'CLABSI', label: 'NK huyết do catheter (CLABSI)' },
      { value: 'CAUTI', label: 'NK tiết niệu do sonde (CAUTI)' },
      { value: 'VAP', label: 'Viêm phổi thở máy (VAP)' },
      { value: 'SSI', label: 'NK vết mổ (SSI)' },
      { value: 'BSI', label: 'NK huyết (BSI)' },
      { value: 'Other', label: 'Khác' }] },
    { key: 'infectionSite', label: 'Vị trí nhiễm khuẩn' },
    { key: 'onsetDate', label: 'Ngày khởi phát', type: 'date', required: true },
    { key: 'organism', label: 'Mầm bệnh' },
    { key: 'isMDRO', label: 'Kháng đa thuốc (MDRO)', type: 'switch' },
    { key: 'criteriaUsed', label: 'Tiêu chuẩn CDC áp dụng', type: 'textarea' },
    { key: 'initialNotes', label: 'Ghi chú ban đầu', type: 'textarea' },
  ], [admissionOpts]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await getHAICases({ keyword: search, pageSize: 200 });
      const body = r.data as unknown;
      const list = (Array.isArray(body) ? body : ((body as { items?: Row[] })?.items || [])) as Row[];
      setItems(list);
    } catch { ti('Không tải được ca HAI'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    (async () => {
      try {
        const ip = await getInpatientList({ pageSize: 300 });
        setAdmissionOpts((ip.data?.items || []).map((p) => ({ value: p.admissionId, label: `${p.patientName} · ${p.bedName || p.roomName || p.departmentName}` })));
      } catch { /* options optional */ }
    })();
  }, []);

  const infTypes = useMemo(() => {
    const set = new Set(items.map((r) => r.infectionTypeName || r.infectionType).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      const t = r.infectionTypeName || r.infectionType;
      if (fInfType && t !== fInfType) return false;
      if (!k) return true;
      return [r.caseCode, r.patientName, r.patientCode, r.organism, r.departmentName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fInfType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Row>[] = [
    { key: 'code', label: 'Mã ca', code: true, render: (r) => r.caseCode || '—' },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName || '—'}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.patientCode || '—'}</div>
      </div>
    ) },
    { key: 'loc', label: 'Khoa · Giường', render: (r) => (
      <div>
        <div>{r.departmentName || '—'}</div>
        {r.bedNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>G {r.bedNumber}</div>}
      </div>
    ) },
    { key: 'inf', label: 'Loại NK', render: (r) => r.infectionTypeName || r.infectionType || '—' },
    { key: 'org', label: 'Mầm bệnh', render: (r) => (
      <div>
        <div style={{ fontSize: 'var(--fs-sm)' }}>{r.organism || '—'}</div>
        {r.isMDRO && <StatusBadge tone="crit" dot>MDRO</StatusBadge>}
      </div>
    ) },
    { key: 'days', label: 'Ngày NV', mono: true, render: (r) => r.daysSinceAdmission ?? '—' },
    { key: 'dev', label: 'Thiết bị', render: (r) => isDevice(r)
      ? <StatusBadge tone="warn" dot>{r.hasCentralLine ? 'CL' : r.hasUrinaryCatheter ? 'UC' : r.onVentilator ? 'Vent' : 'TB'}</StatusBadge>
      : <span style={{ color: 'var(--t-2)' }}>—</span>
    },
    { key: 'sev', label: 'Mức', render: (r) => {
      const s = String(r.severity || '');
      const t = SEVERITY_TONE[s] || 'info';
      return <StatusBadge tone={t} dot>{r.severityName || SEVERITY_LABEL[s] || '—'}</StatusBadge>;
    } },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{r.statusName || t?.l || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Row) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
    </div>
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Tổng ca HAI', val: items.length, sub: 'tất cả' },
        { lbl: 'MDRO', val: items.filter((c) => c.isMDRO).length, sub: 'kháng đa thuốc', tone: 'crit' },
        { lbl: 'Liên quan TB', val: items.filter(isDevice).length, sub: 'CLABSI/CAUTI/VAP', tone: 'warn' },
        { lbl: 'Ổ dịch', val: items.filter((c) => c.isOutbreakRelated).length, sub: 'cluster', tone: 'info' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã ca / mầm bệnh…" />
        <Filter value={fInfType} onChange={setFInfType} options={infTypes} placeholder="▾ Loại NK" />
        <Btn variant="ghost" icon="x" onClick={() => { setSearch(''); setFInfType(''); setStab('all'); }}>Bỏ lọc</Btn>
        <span className="spacer" />
        <Btn variant="ghost" icon="refresh" onClick={load}>Làm mới</Btn>
        <Btn variant="ghost" icon="alert" onClick={() => { setIsoInit({ isMDRO: false }); setIsoOpen(true); }}>Cách ly</Btn>
        <Btn variant="primary" icon="plus" onClick={openCreate}>Báo cáo HAI</Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Row>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có ca HAI'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Ca HAI ${sel.caseCode || '—'}` : ''}
        sub={sel ? `${sel.patientName || '—'} · ${sel.organism || sel.infectionTypeName || '—'}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn icon="print" onClick={() => window.print()}>In báo cáo</Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Bệnh nhân & vị trí">
            <DrField lbl="Mã ca"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.caseCode || '—'}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} · {sel.patientCode}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Giường">{sel.bedNumber || '—'}</DrField>
          </DrSec>
          <DrSec title="Nhiễm khuẩn">
            <DrField lbl="Loại NK">{sel.infectionTypeName || sel.infectionType || '—'}</DrField>
            <DrField lbl="Vị trí">{sel.infectionSite || '—'}</DrField>
            {sel.onsetDate && <DrField lbl="Khởi phát">{dayjs(sel.onsetDate).format('DD/MM/YYYY')}</DrField>}
            {sel.diagnosisDate && <DrField lbl="Chẩn đoán">{dayjs(sel.diagnosisDate).format('DD/MM/YYYY')}</DrField>}
            <DrField lbl="Ngày sau NV"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.daysSinceAdmission ?? '—'}</span></DrField>
            <DrField lbl="Mầm bệnh">{sel.organism || '—'}</DrField>
            <DrField lbl="MDRO">
              {sel.isMDRO
                ? <StatusBadge tone="crit" dot>{sel.mdroType || 'Có'}</StatusBadge>
                : <span style={{ color: 'var(--t-2)' }}>Không</span>}
            </DrField>
            {sel.resistancePattern && <DrField lbl="Kháng">{sel.resistancePattern}</DrField>}
          </DrSec>
          {(sel.hasCentralLine || sel.hasUrinaryCatheter || sel.onVentilator || sel.deviceAssociated) && (
            <DrSec title="Thiết bị xâm lấn">
              {sel.hasCentralLine && <DrField lbl="Catheter TMTT">{sel.centralLineDays ?? '?'} ngày</DrField>}
              {sel.hasUrinaryCatheter && <DrField lbl="Sonde tiểu">{sel.catheterDays ?? '?'} ngày</DrField>}
              {sel.onVentilator && <DrField lbl="Thở máy">{sel.ventilatorDays ?? '?'} ngày</DrField>}
              {sel.deviceAssociated && sel.deviceType && (
                <DrField lbl="TB khác">{sel.deviceType}{sel.deviceDays ? ` · ${sel.deviceDays} ngày` : ''}</DrField>
              )}
            </DrSec>
          )}
          <DrSec title="Đánh giá">
            <DrField lbl="Mức độ">
              <StatusBadge tone={SEVERITY_TONE[String(sel.severity || '')] || 'info'} dot>
                {sel.severityName || SEVERITY_LABEL[String(sel.severity || '')] || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === sKey(sel.status))?.l || '—'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Liên quan ổ dịch">{sel.isOutbreakRelated ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Cách ly">{sel.requiresIsolation ? 'Có' : 'Không'}</DrField>
            {sel.riskFactors && sel.riskFactors.length > 0 && (
              <DrField lbl="Yếu tố nguy cơ">{sel.riskFactors.join(', ')}</DrField>
            )}
            <DrField lbl="Người báo cáo">{sel.reportedBy || '—'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title="Báo cáo ca nhiễm khuẩn bệnh viện (HAI)"
        fields={haiFields}
        initial={crudInit}
        size="lg"
        onSubmit={async (v) => {
          await createHAICase(v as unknown as CreateHAISurveillanceDto);
          tk('Đã tạo báo cáo HAI');
          load();
        }}
      />

      <CrudModal
        open={isoOpen}
        onClose={() => setIsoOpen(false)}
        title="Lệnh cách ly bệnh nhân"
        fields={isoFields}
        initial={isoInit}
        size="lg"
        onSubmit={async (v) => {
          const dto: CreateIsolationOrderDto = {
            admissionId: v.admissionId as string,
            isolationType: v.isolationType as string,
            precautions: (v.precautions as string[]) || [],
            reason: v.reason as string,
            organism: v.organism as string | undefined,
            isMDRO: !!(v.isMDRO),
            roomId: v.roomId as string | undefined,
            ppeRequirements: (v.ppeRequirements as string[]) || [],
            visitorRestrictions: v.visitorRestrictions as string | undefined,
            specialInstructions: v.specialInstructions as string | undefined,
          };
          await createIsolationOrder(dto);
          tk('Đã tạo lệnh cách ly');
          load();
        }}
      />
    </div>
  );
};

export default InfectionControlV2;
