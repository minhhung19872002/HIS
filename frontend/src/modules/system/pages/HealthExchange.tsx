import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import { Form, Input, Select, DatePicker } from 'antd';
import {
  getConnections, createConnection, updateConnection, testConnection, activateConnection, deactivateConnection,
  syncAll, getInsuranceSubmissions, getReferrals, getTeleconsultRequests, getDashboard,
  generateXML, submitToInsurance, createReferral, sendReferral, createTeleconsultRequest, startTeleconsult,
  printReferralLetter,
  type HIEConnectionDto, type CreateConnectionDto, type InsuranceSubmissionDto, type ElectronicReferralDto,
  type TeleconsultationRequestDto, type HIEDashboardDto, type CreateReferralDto, type CreateTeleconsultRequestDto,
  type GenerateXMLDto,
} from '../api/healthExchange';
import {
  getMetadata, searchResource, readResource, exportPatientBundle, fetchExternalMetadata,
  type FhirCapabilityStatement, type FhirBundle, type FhirResource,
} from '../../../api/fhir';
import * as nationalRxApi from '../../../api/nationalPrescription';
import type { NationalPrescriptionDto, NationalPrescriptionStatsDto } from '../../../api/nationalPrescription';
import * as provincialApi from '../../administration/api/provincialHealth';
import type { ProvincialReportDto, ProvincialStatsDto } from '../../administration/api/provincialHealth';
import { downloadBlob } from '../../../services/file.service';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { normalizeArrayResponse } from '../../../utils/apiNormalize';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal, ModalShell,
  StatusTabs, DrawerShell, DrSec, DrField, tk, ti, tw, te, Ico, useListData, useTabCounts,
  type ColumnDef, type CrudFieldCfg, type TopTab, type StatusTone, type KpiItem,
} from '@/_v2kit';

// ─────────────────────── Form value types (port từ v1 pages/health-exchange/types.ts) ───────────────────────

type ReferralFormValues = {
  patientId: string;
  destinationFacilityCode: string;
  destinationDepartment?: string;
  diagnosis: string;
  diagnosisIcd?: string;
  reason: string;
  clinicalSummary?: string;
  treatmentHistory?: string;
  currentMedications?: string;
  allergies?: string;
  specialInstructions?: string;
  urgency: number;
};

type ConsultationFormValues = {
  requestType?: string;
  patientId: string;
  consultingFacilityCode: string;
  specialty: string;
  chiefComplaint?: string;
  clinicalQuestion?: string;
  reason?: string;
  relevantHistory?: string;
  currentFindings?: string;
  urgency?: number;
  preferredDate?: Dayjs;
  preferredTime?: string;
};

type XMLFormValues = {
  xmlType: string;
  periodFrom?: Dayjs;
  periodTo?: Dayjs;
  departmentId?: string;
  patientId?: string;
};

// ─────────────────────── Kết nối HIE (giữ nguyên cấu hình v2) ───────────────────────

const CONN_FIELDS: CrudFieldCfg[] = [
  { key: 'connectionName', label: 'Tên kết nối', required: true },
  { key: 'connectionType', label: 'Loại kết nối', type: 'select', required: true, options: [
    { value: 'BHXH', label: 'BHXH' }, { value: 'MOH', label: 'Bộ Y tế (MOH)' }, { value: 'CDC', label: 'CDC' },
    { value: 'Hospital', label: 'Bệnh viện' }, { value: 'Lab', label: 'Xét nghiệm' }, { value: 'Pharmacy', label: 'Nhà thuốc' }] },
  { key: 'partnerCode', label: 'Mã đối tác', required: true },
  { key: 'partnerName', label: 'Tên đối tác', required: true },
  { key: 'endpoint', label: 'Endpoint URL', required: true, placeholder: 'https://...' },
  { key: 'protocol', label: 'Protocol', type: 'select', required: true, options: [
    { value: 'REST', label: 'REST' }, { value: 'SOAP', label: 'SOAP' }, { value: 'HL7', label: 'HL7' }, { value: 'FHIR', label: 'FHIR' }] },
  { key: 'dataExchangeFormat', label: 'Định dạng dữ liệu', type: 'select', required: true, options: [
    { value: 'JSON', label: 'JSON' }, { value: 'XML', label: 'XML' }, { value: 'HL7v2', label: 'HL7 v2' }] },
  { key: 'authType', label: 'Xác thực', type: 'select', required: true, options: [
    { value: 'OAuth2', label: 'OAuth2' }, { value: 'APIKey', label: 'API Key' }, { value: 'Certificate', label: 'Chứng thư số' }, { value: 'Basic', label: 'Basic Auth' }] },
  { key: 'supportedOperations', label: 'Hoạt động hỗ trợ', type: 'multiselect', options: [
    { value: 'Query', label: 'Query (tra cứu)' }, { value: 'Submit', label: 'Submit (gửi)' },
    { value: 'Subscribe', label: 'Subscribe (đăng ký)' }, { value: 'Notify', label: 'Notify (thông báo)' }] },
];

const PER = 18;

type StatusKey = 'active' | 'inactive' | 'error';
const STATUS_TABS = [
  { v: 'active' as StatusKey,   l: 'Hoạt động', tone: 'ok' as const },
  { v: 'inactive' as StatusKey, l: 'Tạm dừng',  tone: 'warn' as const },
  { v: 'error' as StatusKey,    l: 'Lỗi',       tone: 'crit' as const },
];

const statusKey = (n: number): StatusKey => n === 1 ? 'active' : n === 3 ? 'error' : 'inactive';

// ─────────────────────── Status maps (VERBATIM từ v1 — chỉ đổi Tag-color → StatusTone) ───────────────────────

// v1: 1 Nhập(default) 2 Đã xác minh(blue) 3 Đã gửi(processing) 4 Chấp nhận(success) 5 Từ chối 1 phần(warning) 6 Từ chối(error)
const SUB_LABELS: Record<number, string> = { 1: 'Nhập', 2: 'Đã xác minh', 3: 'Đã gửi', 4: 'Chấp nhận', 5: 'Từ chối 1 phần', 6: 'Từ chối' };
const subTone = (s: number): StatusTone => s === 4 ? 'ok' : s === 5 ? 'warn' : s === 6 ? 'crit' : s === 3 ? 'warn' : 'info';

// v1 referral urgency: 1 default, 2 orange, 3 red
const urgencyTone = (u: number): StatusTone => u === 3 ? 'crit' : u === 2 ? 'warn' : 'info';
// v1 referral status: 1 default, 2 processing, 3 blue, 4 success, 5 error, 6 green
const refTone = (s: number): StatusTone => (s === 4 || s === 6) ? 'ok' : s === 5 ? 'crit' : s === 2 ? 'warn' : 'info';
// v1 consultation status: 1 default, 2 blue, 3 processing, 4 success, 5 error
const consTone = (s: number): StatusTone => s === 4 ? 'ok' : s === 5 ? 'crit' : s === 3 ? 'warn' : 'info';
// v1 national-rx status: 0 default, 1 processing, 2 success, 3 error, 4 warning
const rxTone = (s: number): StatusTone => s === 2 ? 'ok' : s === 3 ? 'crit' : (s === 1 || s === 4) ? 'warn' : 'info';
// v1 provincial status: 0 default, 1 processing, 2 success, 3 error
const provTone = (s: number): StatusTone => s === 2 ? 'ok' : s === 3 ? 'crit' : s === 1 ? 'warn' : 'info';

// ─────────────────────── FHIR search-param definitions (VERBATIM từ v1) ───────────────────────

const fhirResourceSearchParams: Record<string, Array<{ name: string; label: string; placeholder: string }>> = {
  Patient: [
    { name: 'name', label: 'Tên', placeholder: 'Tìm theo tên...' },
    { name: 'identifier', label: 'Mã BN/CCCD/BHYT', placeholder: 'Mã định danh...' },
    { name: 'phone', label: 'SĐT', placeholder: 'Số điện thoại...' },
  ],
  Encounter: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    { name: 'status', label: 'Trạng thái', placeholder: 'planned|in-progress|finished' },
  ],
  Observation: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    { name: 'category', label: 'Loại', placeholder: 'vital-signs|laboratory' },
  ],
  MedicationRequest: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    { name: 'status', label: 'Trạng thái', placeholder: 'active|completed|cancelled' },
  ],
  DiagnosticReport: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    { name: 'category', label: 'Loại', placeholder: 'LAB|RAD' },
  ],
  Condition: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
    { name: 'code', label: 'Mã ICD', placeholder: 'ICD-10 code...' },
  ],
  AllergyIntolerance: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
  ],
  Procedure: [
    { name: 'patient', label: 'Patient ID', placeholder: 'GUID bệnh nhân...' },
  ],
};

// Helper to extract a human-readable summary from a FHIR resource (VERBATIM từ v1)
function extractResourceSummary(resource: FhirResource | undefined): string {
  if (!resource) return '';
  const r = resource as unknown as Record<string, unknown>;
  // Patient
  if (r.name && Array.isArray(r.name) && r.name.length > 0) {
    return (r.name[0] as Record<string, unknown>)?.text as string || '';
  }
  // Encounter
  if (r.subject && typeof r.subject === 'object') {
    return (r.subject as Record<string, unknown>)?.display as string || '';
  }
  // Observation
  if (r.code && typeof r.code === 'object') {
    return (r.code as Record<string, unknown>)?.text as string || '';
  }
  // MedicationRequest
  if (r.medicationCodeableConcept && typeof r.medicationCodeableConcept === 'object') {
    return (r.medicationCodeableConcept as Record<string, unknown>)?.text as string || '';
  }
  return r.id as string || '';
}

// ─────────────────────── Section box (thay antd Card, theo design ab-*) ───────────────────────

const Sect: React.FC<{ title: React.ReactNode; extra?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }> =
  ({ title, extra, children, style }) => (
    <div style={{ border: '1px solid var(--line)', borderRadius: 6, background: 'var(--d-2)', ...style }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--line)', fontSize: 'var(--fs-sm)',
        fontWeight: 600, color: 'var(--t-1)', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ flex: 1 }}>{title}</span>
        {extra}
      </div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );

// ═══════════════════════════════ Main page — 7 tab (port đủ từ v1) ═══════════════════════════════

type TabKey = 'connections' | 'submissions' | 'referrals' | 'consultations' | 'fhir' | 'national-rx' | 'provincial';

const HealthExchangeV2: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('connections');
  const [dashboard, setDashboard] = useState<HIEDashboardDto | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await getDashboard();
      setDashboard(res.data || null);
    } catch (err) {
      console.warn('Failed to fetch dashboard:', err);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const topTabs: TopTab<TabKey>[] = useMemo(() => [
    { v: 'connections',   l: dashboard ? `Kết nối (${dashboard.activeConnections}/${dashboard.totalConnections})` : 'Kết nối', ic: 'cloud' },
    { v: 'submissions',   l: dashboard ? `Gửi dữ liệu (${dashboard.pendingSubmissions} chờ)` : 'Gửi dữ liệu', ic: 'upload' },
    { v: 'referrals',     l: dashboard ? `Chuyển viện (${dashboard.outboundReferralsPending})` : 'Chuyển viện', ic: 'send' },
    { v: 'consultations', l: 'Hội chẩn từ xa', ic: 'users' },
    { v: 'fhir',          l: 'FHIR R4', ic: 'activity' },
    { v: 'national-rx',   l: 'Cổng đơn thuốc QG', ic: 'pill' },
    { v: 'provincial',    l: 'Sở Y tế', ic: 'shield' },
  ], [dashboard]);

  return (
    <div className="ab">
      {dashboard?.alerts && dashboard.alerts.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          borderBottom: '1px solid var(--line)', color: 'var(--s-warn)', fontSize: 'var(--fs-sm)',
        }}>
          <Ico name="alert" size={14} />
          <b>{dashboard.alerts.length} cảnh báo</b>
          <span style={{ color: 'var(--t-2)' }}>{dashboard.alerts.map((a) => a.message).join('; ')}</span>
        </div>
      )}
      <TopTabs<TabKey> tab={tab} setTab={setTab} tabs={topTabs} />
      {tab === 'connections' && <ConnectionsPanel />}
      {tab === 'submissions' && <SubmissionsPanel dashboard={dashboard} />}
      {tab === 'referrals' && <ReferralsPanel dashboard={dashboard} />}
      {tab === 'consultations' && <ConsultationsPanel />}
      {tab === 'fhir' && <FhirPanel />}
      {tab === 'national-rx' && <NationalRxPanel />}
      {tab === 'provincial' && <ProvincialPanel />}
    </div>
  );
};

// ═══════════════════════════════ Tab 1 — Kết nối (giữ nguyên tính năng v2) ═══════════════════════════════

const ConnectionsPanel: React.FC = () => {
  const { rows: items, loading, reload } = useListData<HIEConnectionDto>(
    useCallback(() => getConnections().then((r) => normalizeArrayResponse<HIEConnectionDto>(r.data)), []),
    useCallback(() => ti('Không tải được kết nối HIE'), []),
  );
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [fType, setFType] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<HIEConnectionDto | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [crudOpen, setCrudOpen] = useState(false);
  const [crudInit, setCrudInit] = useState<Record<string, unknown> | null>(null);

  const openCreate = () => { setCrudInit({ protocol: 'REST', dataExchangeFormat: 'JSON', authType: 'APIKey', connectionType: 'BHXH', supportedOperations: [] }); setCrudOpen(true); };
  const openEdit = (r: HIEConnectionDto) => { setCrudInit({ ...r } as Record<string, unknown>); setCrudOpen(true); };
  const doTest = async (r: HIEConnectionDto) => {
    try {
      const res = await testConnection(r.id);
      const d = res.data as { success?: boolean; message?: string } | undefined;
      const ok = d?.success !== false;
      (ok ? tk : tw)(d?.message || (ok ? `Kết nối ${r.connectionName} OK` : 'Kết nối thất bại'));
      reload();
    } catch { te('Test kết nối thất bại'); }
  };
  const toggleActive = async (r: HIEConnectionDto) => {
    try {
      if (r.status === 1) { await deactivateConnection(r.id); tk('Đã tạm dừng kết nối'); }
      else { await activateConnection(r.id); tk('Đã kích hoạt kết nối'); }
      reload();
    } catch { te('Đổi trạng thái thất bại'); }
  };


  const types = useMemo(() => {
    const set = new Set(items.map((r) => r.connectionType).filter(Boolean));
    return Array.from(set).map((t) => ({ v: t, l: t }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => statusKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (fType && r.connectionType !== fType) return false;
      if (!k) return true;
      return [r.connectionName, r.connectionCode, r.partnerName].some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const totalErr = items.reduce((s, r) => s + (r.errorCount || 0), 0);

  const cols: ColumnDef<HIEConnectionDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.connectionCode || '—' },
    { key: 'name', label: 'Tên kết nối', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.connectionName}</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.partnerName}</div>
      </div>
    ) },
    { key: 'type', label: 'Loại', render: (r) => r.connectionTypeName || r.connectionType },
    { key: 'protocol', label: 'Protocol', mono: true, render: (r) => `${r.protocol} · ${r.dataExchangeFormat}` },
    { key: 'last', label: 'Đồng bộ cuối', mono: true, render: (r) => r.lastSyncAt ? dayjs(r.lastSyncAt).fromNow() : '—' },
    { key: 'err', label: 'Lỗi', mono: true, render: (r) => (r.errorCount || 0) > 0
      ? <span style={{ color: 'var(--a-rd-text)' }}>{r.errorCount}</span>
      : <span style={{ color: 'var(--t-3)' }}>0</span>
    },
    { key: 'status', label: 'Trạng thái', render: (r) => {
      const s = statusKey(r.status);
      const tone = s === 'active' ? 'ok' : s === 'error' ? 'crit' : 'warn';
      return <StatusBadge tone={tone} dot>{r.statusName || STATUS_TABS.find((x) => x.v === s)?.l}</StatusBadge>;
    } },
  ];

  const actions = (r: HIEConnectionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      <ActBtn ic="refresh" title="Test kết nối" onClick={() => doTest(r)} />
      <ActBtn ic="edit" title="Sửa" onClick={() => openEdit(r)} />
      <ActBtn ic={r.status === 1 ? 'x' : 'check'} title={r.status === 1 ? 'Tạm dừng' : 'Kích hoạt'} tone={r.status === 1 ? 'crit' : undefined} onClick={() => toggleActive(r)} />
    </div>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng kết nối', val: items.length, sub: `${types.length} loại` },
        { lbl: 'Hoạt động', val: counts.active || 0, sub: 'đang chạy', tone: 'ok' },
        { lbl: 'Tạm dừng', val: counts.inactive || 0, sub: 'inactive', tone: 'warn' },
        { lbl: 'Lỗi', val: counts.error || 0, sub: 'cần xử lý', tone: 'crit' },
        { lbl: 'Tổng lỗi 24h', val: totalErr, sub: 'sự cố', tone: totalErr > 0 ? 'warn' : 'ok' },
        { lbl: 'Đối tác', val: new Set(items.map((r) => r.partnerCode)).size, sub: 'BHXH/MOH/Lab' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / đối tác…" />
        <Filter value={fType} onChange={setFType} options={types} placeholder="▾ Loại kết nối" />
        <Btn variant="ghost" onClick={() => { setSearch(''); setFType(''); setStab('all'); }}>
          <Ico name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" disabled={syncing} onClick={async () => {
          setSyncing(true);
          try {
            const res = await syncAll();
            const d = res.data as { synced?: number; failed?: number; message?: string } | undefined;
            if (d?.failed && d.failed > 0) {
              tw(`Đồng bộ xong: ${d.synced ?? 0} thành công, ${d.failed} thất bại`);
            } else {
              tk(d?.message || `Đồng bộ hoàn tất${d?.synced != null ? ` (${d.synced} kết nối)` : ''}`);
            }
            reload();
          } catch { te('Đồng bộ thất bại'); }
          finally { setSyncing(false); }
        }}>
          <Ico name="cloud" size={12} /> {syncing ? 'Đang đồng bộ…' : 'Đồng bộ tất cả'}
        </Btn>
        <Btn variant="primary" onClick={openCreate}>
          <Ico name="plus" size={12} /> Thêm kết nối
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<HIEConnectionDto>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có kết nối HIE nào'}
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel?.connectionName ?? ''}
        sub={sel ? `${sel.connectionCode} · ${sel.partnerName}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          <Btn onClick={() => { if (sel) doTest(sel); }}>
            <Ico name="refresh" size={12} /> Test kết nối
          </Btn>
          <Btn variant="primary" onClick={() => { if (sel) { openEdit(sel); setSel(null); } }}>
            <Ico name="edit" size={12} /> Chỉnh sửa
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin chung">
            <DrField lbl="Mã">{sel.connectionCode}</DrField>
            <DrField lbl="Tên">{sel.connectionName}</DrField>
            <DrField lbl="Loại">{sel.connectionTypeName || sel.connectionType}</DrField>
            <DrField lbl="Đối tác">{sel.partnerCode} — {sel.partnerName}</DrField>
            <DrField lbl="Endpoint"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)' }}>{sel.endpoint}</span></DrField>
            <DrField lbl="Protocol"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.protocol} · {sel.dataExchangeFormat}</span></DrField>
            <DrField lbl="Auth">{sel.authType}</DrField>
          </DrSec>
          <DrSec title="Trạng thái & lịch sử">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={statusKey(sel.status) === 'active' ? 'ok' : statusKey(sel.status) === 'error' ? 'crit' : 'warn'} dot>
                {sel.statusName || STATUS_TABS.find((x) => x.v === statusKey(sel.status))?.l}
              </StatusBadge>
            </DrField>
            <DrField lbl="Kết nối cuối">{sel.lastConnectedAt ? dayjs(sel.lastConnectedAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Đồng bộ cuối">{sel.lastSyncAt ? dayjs(sel.lastSyncAt).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="Số lỗi"><span style={{ color: (sel.errorCount || 0) > 0 ? 'var(--a-rd-text)' : 'var(--t-2)' }}>{sel.errorCount}</span></DrField>
            <DrField lbl="Lỗi gần nhất">{sel.lastError || '—'}</DrField>
          </DrSec>
          <DrSec title="Hoạt động hỗ trợ">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)' }}>
              {(sel.supportedOperations || []).map((op, i) => (
                <span key={i} className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 'var(--fs-xs)' }}>{op}</span>
              ))}
              {(!sel.supportedOperations || sel.supportedOperations.length === 0) && (
                <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>—</span>
              )}
            </div>
          </DrSec>
          {sel.certificateExpiry && (
            <DrSec title="Chứng thư">
              <DrField lbl="Hết hạn">{dayjs(sel.certificateExpiry).format('DD/MM/YYYY')}</DrField>
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <CrudModal
        open={crudOpen}
        onClose={() => setCrudOpen(false)}
        title={crudInit?.id ? 'Cập nhật kết nối HIE' : 'Thêm kết nối HIE'}
        fields={CONN_FIELDS}
        initial={crudInit}
        size="lg"
        onSubmit={async (v, editing) => {
          const dto = { credentials: {}, ...v, supportedOperations: (v.supportedOperations as string[]) || [] } as unknown as CreateConnectionDto;
          if (editing && crudInit?.id) await updateConnection(crudInit.id as string, dto);
          else await createConnection(dto);
          tk(editing ? 'Đã cập nhật kết nối' : 'Đã thêm kết nối');
          reload();
        }}
      />
    </>
  );
};

// ═══════════════════════════════ Tab 2 — Gửi dữ liệu BHXH (port từ v1) ═══════════════════════════════

const SubmissionsPanel: React.FC<{ dashboard: HIEDashboardDto | null }> = ({ dashboard }) => {
  const { rows: submissions, loading, reload } = useListData<InsuranceSubmissionDto>(
    useCallback(() => getInsuranceSubmissions().then((r) => normalizeArrayResponse<InsuranceSubmissionDto>(r.data)), []),
    useCallback(() => ti('Không thể tải dữ liệu liên thông y tế'), []),
  );
  const [sel, setSel] = useState<InsuranceSubmissionDto | null>(null);
  const [xmlOpen, setXmlOpen] = useState(false);
  const [xmlForm] = Form.useForm<XMLFormValues>();

  // v1: pendingSubmissions = dashboard?.pendingSubmissions ?? submissions.filter(s => s.status === 1 || s.status === 2).length
  const pendingSubmissions = dashboard?.pendingSubmissions ?? submissions.filter((s) => s.status === 1 || s.status === 2).length;

  const handleResubmit = async (record: InsuranceSubmissionDto) => {
    try {
      await submitToInsurance({ submissionId: record.id, signatureRequired: false });
      tk('Đã gửi lại thành công');
      reload();
    } catch (err) {
      console.warn('Resubmit failed:', err);
      tw('Gửi lại thất bại');
    }
  };

  // VERBATIM logic từ v1 handleSubmitXML
  const handleSubmitXML = async (values: XMLFormValues) => {
    try {
      const dto: GenerateXMLDto = {
        xmlType: values.xmlType,
        periodFrom: values.periodFrom?.format?.('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD'),
        periodTo: values.periodTo?.format?.('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'),
        departmentId: values.departmentId,
        patientIds: values.patientId ? [values.patientId] : undefined,
      };
      const result = await generateXML(dto);
      if (result.data?.success) {
        tk(`Tạo XML thành công! ${result.data.totalRecords} bản ghi, ${result.data.validRecords} hợp lệ`);
        if (result.data.invalidRecords > 0) {
          tw(`${result.data.invalidRecords} bản ghi lỗi - vui lòng kiểm tra lại`);
        }
      } else {
        tw('Tạo XML thất bại');
      }
      setXmlOpen(false);
      xmlForm.resetFields();
      reload();
    } catch (err) {
      console.warn('Generate XML failed:', err);
      tw('Gửi dữ liệu XML thất bại');
    }
  };

  const cols: ColumnDef<InsuranceSubmissionDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.submissionCode },
    { key: 'type', label: 'Loại', render: (r) => r.submissionTypeName || r.submissionType },
    { key: 'records', label: 'Số bản ghi', mono: true, render: (r) => r.totalRecords },
    { key: 'amount', label: 'Số tiền BHXH', mono: true, render: (r) => r.totalClaimAmount ? r.totalClaimAmount.toLocaleString('vi-VN') + ' VND' : '-' },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={subTone(r.status)} dot>{r.statusName || SUB_LABELS[r.status] || String(r.status)}</StatusBadge>
    ) },
    { key: 'submittedAt', label: 'Thời gian gửi', mono: true, render: (r) => r.submittedAt ? dayjs(r.submittedAt).format('YYYY-MM-DD HH:mm') : '-' },
    { key: 'bhxh', label: 'BHXH phản hồi', render: (r) => r.bhxhStatusName || '-' },
  ];

  const actions = (r: InsuranceSubmissionDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Xem" onClick={() => setSel(r)} />
      {(r.status === 6 || r.status === 5) && (
        <ActBtn ic="refresh" title="Gửi lại" onClick={() => handleResubmit(r)} />
      )}
    </div>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng đợt gửi', val: submissions.length },
        { lbl: 'Chờ xử lý', val: pendingSubmissions, sub: 'nhập + đã xác minh', tone: 'warn' },
        { lbl: 'Đã gửi', val: submissions.filter((s) => s.status === 3).length, sub: 'chờ BHXH' },
        { lbl: 'Chấp nhận', val: submissions.filter((s) => s.status === 4).length, tone: 'ok' },
        { lbl: 'Từ chối', val: submissions.filter((s) => s.status === 5 || s.status === 6).length, tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <Ico name="refresh" size={12} /> Đồng bộ tất cả
        </Btn>
        <Btn variant="primary" onClick={() => setXmlOpen(true)}>
          <Ico name="plus" size={12} /> Gửi XML BHXH
        </Btn>
      </div>

      <DataTable<InsuranceSubmissionDto>
        columns={cols} data={submissions} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có đợt gửi dữ liệu nào'}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Chi tiết gửi dữ liệu — ${sel.submissionCode}` : ''}
        sub={sel ? (sel.submissionTypeName || sel.submissionType) : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && (sel.status === 6 || sel.status === 5) && (
            <Btn variant="primary" onClick={() => { handleResubmit(sel); setSel(null); }}>
              <Ico name="refresh" size={12} /> Gửi lại
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin đợt gửi">
            <DrField lbl="Mã">{sel.submissionCode}</DrField>
            <DrField lbl="Loại">{sel.submissionTypeName || sel.submissionType}</DrField>
            <DrField lbl="Kỳ từ">{sel.periodFrom}</DrField>
            <DrField lbl="Kỳ đến">{sel.periodTo}</DrField>
            <DrField lbl="Khoa">{sel.departmentName || '-'}</DrField>
            <DrField lbl="Người gửi">{sel.submittedByName}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={subTone(sel.status)} dot>{sel.statusName || SUB_LABELS[sel.status] || String(sel.status)}</StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Bản ghi & số tiền">
            <DrField lbl="Tổng bản ghi">{sel.totalRecords}</DrField>
            <DrField lbl="Hợp lệ">{sel.validRecords}</DrField>
            <DrField lbl="Không hợp lệ">{sel.invalidRecords}</DrField>
            <DrField lbl="Số tiền">{sel.totalClaimAmount?.toLocaleString('vi-VN')} VND</DrField>
          </DrSec>
          <DrSec title="BHXH phản hồi">
            <DrField lbl="BHXH duyệt">{sel.bhxhApprovedAmount?.toLocaleString('vi-VN') || '-'} VND</DrField>
            <DrField lbl="BHXH từ chối">{sel.bhxhRejectedAmount?.toLocaleString('vi-VN') || '-'} VND</DrField>
            <DrField lbl="BHXH trạng thái">{sel.bhxhStatusName || '-'}</DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell
        open={xmlOpen}
        onClose={() => setXmlOpen(false)}
        title="Gửi dữ liệu XML BHXH"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setXmlOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => xmlForm.submit()}><Ico name="send" size={12} /> Gửi</Btn>
        </>}
      >
        <Form form={xmlForm} layout="vertical" onFinish={handleSubmitXML}>
          <Form.Item name="xmlType" label="Loại XML" rules={[{ required: true }]}>
            <Select placeholder="Chọn loại XML" options={[
              { value: 'XML130', label: 'XML 130 - Thuoc, VTYT' },
              { value: 'XML131', label: 'XML 131 - DVKT' },
              { value: 'XML4210', label: 'XML 4210 - Ho so BHYT' },
              { value: 'XML7900', label: 'XML 7900 - Bao cao' },
            ]} />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="periodFrom" label="Từ ngày" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="periodTo" label="Đến ngày" rules={[{ required: true }]} style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="departmentId" label="Khoa (tùy chọn)">
            <Input placeholder="Mã khoa (để trống để gửi tất cả)" />
          </Form.Item>
          <Form.Item name="patientId" label="Mã bệnh nhân (tùy chọn)">
            <Input placeholder="Mã BN (để trống để gửi tất cả BN trong kỳ)" />
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

// ═══════════════════════════════ Tab 3 — Chuyển viện điện tử (port từ v1) ═══════════════════════════════

const ReferralsPanel: React.FC<{ dashboard: HIEDashboardDto | null }> = ({ dashboard }) => {
  const { rows: referrals, loading, reload } = useListData<ElectronicReferralDto>(
    useCallback(() => getReferrals().then((r) => normalizeArrayResponse<ElectronicReferralDto>(r.data)), []),
    useCallback(() => ti('Không thể tải dữ liệu liên thông y tế'), []),
  );
  const [sel, setSel] = useState<ElectronicReferralDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [referralForm] = Form.useForm<ReferralFormValues>();

  // v1: activeReferrals = dashboard?.outboundReferralsPending ?? referrals.filter(r => r.status === 2).length
  const activeReferrals = dashboard?.outboundReferralsPending ?? referrals.filter((r) => r.status === 2).length;

  // VERBATIM logic từ v1 handleCreateReferral
  const handleCreateReferral = async (values: ReferralFormValues) => {
    try {
      const dto: CreateReferralDto = {
        patientId: values.patientId,
        destinationFacilityCode: values.destinationFacilityCode,
        destinationDepartment: values.destinationDepartment,
        diagnosis: values.diagnosis,
        diagnosisIcd: values.diagnosisIcd || '',
        reasonForReferral: values.reason,
        clinicalSummary: values.clinicalSummary || '',
        treatmentHistory: values.treatmentHistory,
        currentMedications: values.currentMedications,
        allergies: values.allergies,
        specialInstructions: values.specialInstructions,
        urgency: values.urgency,
      };
      await createReferral(dto);
      setCreateOpen(false);
      referralForm.resetFields();
      tk('Tạo phiếu chuyển viện thành công!');
      reload();
    } catch (err) {
      console.warn('Create referral failed:', err);
      tw('Tạo phiếu chuyển viện thất bại');
    }
  };

  const handleSend = async (record: ElectronicReferralDto) => {
    try {
      await sendReferral(record.id);
      tk('Đã gửi phiếu chuyển viện');
      reload();
    } catch (err) {
      console.warn('Send referral failed:', err);
      tw('Gửi phiếu thất bại');
    }
  };

  const handlePrint = async (record: ElectronicReferralDto) => {
    try {
      const res = await printReferralLetter(record.id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.warn('Print referral failed:', err);
      tw('Không thể in phiếu chuyển viện');
    }
  };

  // VERBATIM từ v1 handlePrintReferral (in mẫu trống)
  const handlePrintBlank = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Phiếu Chuyển viện</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              h1 { text-align: center; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; text-align: left; }
              .header { text-align: center; margin-bottom: 20px; }
              .footer { margin-top: 30px; }
              .signature { display: flex; justify-content: space-between; margin-top: 50px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>${HOSPITAL_NAME}</h2>
              <h1>PHIẾU CHUYỂN VIỆN</h1>
            </div>
            <table>
              <tr><td><strong>Họ tên BN:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Mã bệnh nhân:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Chẩn đoán:</strong></td><td>_________________</td></tr>
              <tr><td><strong>BV tiếp nhận:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Lý do chuyển:</strong></td><td>_________________</td></tr>
              <tr><td><strong>Tóm tắt điều trị:</strong></td><td>_________________</td></tr>
            </table>
            <div class="signature">
              <div style="text-align: center;">
                <p>Bác sĩ điều trị</p>
                <br/><br/>
                <p>_______________</p>
              </div>
              <div style="text-align: center;">
                <p>Giám đốc bệnh viện</p>
                <br/><br/>
                <p>_______________</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const cols: ColumnDef<ElectronicReferralDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.referralCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName },
    { key: 'source', label: 'Từ BV', render: (r) => r.sourceFacilityName },
    { key: 'dest', label: 'Đến BV', render: (r) => r.destinationFacilityName },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosis },
    { key: 'urgency', label: 'Mức độ', render: (r) => (
      <StatusBadge tone={urgencyTone(r.urgency)}>{r.urgencyName || String(r.urgency)}</StatusBadge>
    ) },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={refTone(r.status)} dot>{r.statusName || String(r.status)}</StatusBadge>
    ) },
  ];

  const actions = (r: ElectronicReferralDto) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 1 && <ActBtn ic="send" title="Gửi" onClick={() => handleSend(r)} />}
      <ActBtn ic="printer" title="In" onClick={() => handlePrint(r)} />
    </div>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng phiếu', val: referrals.length },
        { lbl: 'Chuyển viện chờ', val: activeReferrals, sub: `/ ${referrals.length} phiếu`, tone: 'warn' },
        { lbl: 'Hoàn tất', val: referrals.filter((r) => r.status === 6).length, tone: 'ok' },
        { lbl: 'Từ chối', val: referrals.filter((r) => r.status === 5).length, tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={handlePrintBlank}>
          <Ico name="printer" size={12} /> In mẫu
        </Btn>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Tạo phiếu chuyển
        </Btn>
      </div>

      <DataTable<ElectronicReferralDto>
        columns={cols} data={referrals} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có phiếu chuyển viện nào'}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Chi tiết chuyển viện — ${sel.referralCode}` : ''}
        sub={sel ? `${sel.patientName} (${sel.patientCode})` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && sel.status === 1 && (
            <Btn variant="primary" onClick={() => { handleSend(sel); setSel(null); }}>
              <Ico name="send" size={12} /> Gửi
            </Btn>
          )}
          <Btn onClick={() => { if (sel) handlePrint(sel); }}>
            <Ico name="printer" size={12} /> In
          </Btn>
        </>}
      >
        {sel && <>
          <DrSec title="Hành chính">
            <DrField lbl="Mã phiếu">{sel.referralCode}</DrField>
            <DrField lbl="Loại">{sel.referralTypeName || sel.referralType}</DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} ({sel.patientCode})</DrField>
            <DrField lbl="Ngày sinh">{sel.dateOfBirth}</DrField>
            <DrField lbl="Số BHYT">{sel.insuranceNumber || '-'}</DrField>
            <DrField lbl="Mức độ">
              <StatusBadge tone={urgencyTone(sel.urgency)}>{sel.urgencyName}</StatusBadge>
            </DrField>
          </DrSec>
          <DrSec title="Nơi chuyển / nơi nhận">
            <DrField lbl="Nơi chuyển">{sel.sourceFacilityName}</DrField>
            <DrField lbl="Khoa chuyển">{sel.sourceDepartment}</DrField>
            <DrField lbl="Nơi nhận">{sel.destinationFacilityName}</DrField>
            <DrField lbl="Khoa nhận">{sel.destinationDepartment || '-'}</DrField>
          </DrSec>
          <DrSec title="Lâm sàng">
            <DrField lbl="Chẩn đoán">{sel.diagnosis} ({sel.diagnosisIcd})</DrField>
            <DrField lbl="Lý do">{sel.reasonForReferral}</DrField>
            <DrField lbl="Tóm tắt lâm sàng">{sel.clinicalSummary || '-'}</DrField>
            {sel.treatmentHistory && <DrField lbl="Tiền sử điều trị">{sel.treatmentHistory}</DrField>}
            {sel.currentMedications && <DrField lbl="Thuốc hiện tại">{sel.currentMedications}</DrField>}
          </DrSec>
          <DrSec title="Trạng thái">
            <DrField lbl="Trạng thái">
              <StatusBadge tone={refTone(sel.status)} dot>{sel.statusName}</StatusBadge>
            </DrField>
            <DrField lbl="Ngày tạo">{dayjs(sel.createdAt).format('YYYY-MM-DD HH:mm')}</DrField>
            {sel.sentAt && <DrField lbl="Ngày gửi">{dayjs(sel.sentAt).format('YYYY-MM-DD HH:mm')}</DrField>}
            {sel.acceptedDate && <DrField lbl="Ngày chấp nhận">{dayjs(sel.acceptedDate).format('YYYY-MM-DD HH:mm')}</DrField>}
            {sel.rejectionReason && <DrField lbl="Lý do từ chối">{sel.rejectionReason}</DrField>}
            {sel.outcome && <DrField lbl="Kết quả">{sel.outcome}</DrField>}
          </DrSec>
        </>}
      </DrawerShell>

      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo phiếu chuyển viện điện tử"
        size="lg"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => referralForm.submit()}><Ico name="check" size={12} /> Tạo phiếu</Btn>
        </>}
      >
        <Form form={referralForm} layout="vertical" onFinish={handleCreateReferral}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="patientId" label="Mã bệnh nhân" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Nhập mã bệnh nhân" />
            </Form.Item>
            <Form.Item name="destinationFacilityCode" label="Mã BV tiếp nhận" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Mã cơ sở tiếp nhận" />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="destinationDepartment" label="Khoa tiếp nhận" style={{ flex: 1 }}>
              <Input placeholder="Khoa tiếp nhận (tùy chọn)" />
            </Form.Item>
            <Form.Item name="urgency" label="Mức độ khẩn cấp" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Chọn mức độ" options={[
                { value: 1, label: 'Thường quy' },
                { value: 2, label: 'Khẩn cấp' },
                { value: 3, label: 'Cấp cứu' },
              ]} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="diagnosis" label="Chẩn đoán" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Chẩn đoán chính" />
            </Form.Item>
            <Form.Item name="diagnosisIcd" label="Mã ICD" style={{ flex: 1 }}>
              <Input placeholder="VD: J18.9" />
            </Form.Item>
          </div>
          <Form.Item name="reason" label="Lý do chuyển viện" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Lý do chuyển viện" />
          </Form.Item>
          <Form.Item name="clinicalSummary" label="Tóm tắt lâm sàng">
            <Input.TextArea rows={3} placeholder="Tóm tắt tình trạng lâm sàng, điều trị đã thực hiện" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="currentMedications" label="Thuốc đang dùng" style={{ flex: 1 }}>
              <Input.TextArea rows={2} placeholder="Danh sách thuốc hiện tại" />
            </Form.Item>
            <Form.Item name="allergies" label="Dị ứng" style={{ flex: 1 }}>
              <Input.TextArea rows={2} placeholder="Tiền sử dị ứng (nếu có)" />
            </Form.Item>
          </div>
          <Form.Item name="specialInstructions" label="Chỉ dẫn đặc biệt">
            <Input.TextArea rows={2} placeholder="Hướng dẫn đặc biệt cho cơ sở tiếp nhận" />
          </Form.Item>
        </Form>
      </ModalShell>
    </>
  );
};

// ═══════════════════════════════ Tab 4 — Hội chẩn từ xa (port từ v1) ═══════════════════════════════

const ConsultationsPanel: React.FC = () => {
  const { rows: consultations, loading, reload } = useListData<TeleconsultationRequestDto>(
    useCallback(() => getTeleconsultRequests().then((r) => normalizeArrayResponse<TeleconsultationRequestDto>(r.data)), []),
    useCallback(() => ti('Không thể tải dữ liệu liên thông y tế'), []),
  );
  const [sel, setSel] = useState<TeleconsultationRequestDto | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [consultationForm] = Form.useForm<ConsultationFormValues>();

  // v1: activeConsultations = consultations.filter(c => c.status !== 5 && c.status !== 6).length
  const activeConsultations = consultations.filter((c) => c.status !== 5 && c.status !== 6).length;

  // VERBATIM logic từ v1 handleCreateConsultation
  const handleCreateConsultation = async (values: ConsultationFormValues) => {
    try {
      const dto: CreateTeleconsultRequestDto = {
        requestType: values.requestType || 'Consultation',
        patientId: values.patientId,
        consultingFacilityCode: values.consultingFacilityCode,
        consultingSpecialty: values.specialty,
        chiefComplaint: values.chiefComplaint || '',
        clinicalQuestion: values.clinicalQuestion || values.reason || '',
        relevantHistory: values.relevantHistory || '',
        currentFindings: values.currentFindings || '',
        urgency: values.urgency || 1,
        preferredDate: values.preferredDate?.format?.('YYYY-MM-DD'),
        preferredTime: values.preferredTime,
      };
      await createTeleconsultRequest(dto);
      setCreateOpen(false);
      consultationForm.resetFields();
      tk('Gửi yêu cầu hội chẩn thành công!');
      reload();
    } catch (err) {
      console.warn('Create teleconsult failed:', err);
      tw('Gửi yêu cầu hội chẩn thất bại');
    }
  };

  // VERBATIM logic từ v1 (nút "Vào phòng")
  const handleJoinRoom = async (record: TeleconsultationRequestDto) => {
    try {
      const res = await startTeleconsult(record.id);
      const roomUrl = res.data?.roomUrl || record.videoRoomUrl;
      if (roomUrl) {
        window.open(roomUrl, '_blank');
      }
    } catch (err) {
      console.warn('Start teleconsult failed:', err);
      if (record.videoRoomUrl) {
        window.open(record.videoRoomUrl, '_blank');
      } else {
        tw('Không thể vào phòng hội chẩn');
      }
    }
  };

  const cols: ColumnDef<TeleconsultationRequestDto>[] = [
    { key: 'code', label: 'Mã', code: true, render: (r) => r.requestCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => r.patientName },
    { key: 'doctor', label: 'BS yêu cầu', render: (r) => r.requestingDoctorName },
    { key: 'facility', label: 'BV hội chẩn', render: (r) => r.consultingFacilityName },
    { key: 'specialty', label: 'Chuyên khoa', render: (r) => r.consultingSpecialty },
    { key: 'schedule', label: 'Lịch hẹn', mono: true, render: (r) => {
      if (r.scheduledDate && r.scheduledTime) return `${r.scheduledDate} ${r.scheduledTime}`;
      if (r.scheduledDate) return r.scheduledDate;
      return '-';
    } },
    { key: 'status', label: 'Trạng thái', render: (r) => (
      <StatusBadge tone={consTone(r.status)} dot>{r.statusName || String(r.status)}</StatusBadge>
    ) },
  ];

  const actions = (r: TeleconsultationRequestDto) => (
    <div className="ab-actions">
      {r.status === 2 && r.videoRoomUrl && (
        <ActBtn ic="play" title="Vào phòng" onClick={() => handleJoinRoom(r)} />
      )}
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
    </div>
  );

  return (
    <>
      <KpiStrip items={[
        { lbl: 'Tổng yêu cầu', val: consultations.length },
        { lbl: 'Đang hoạt động', val: activeConsultations, sub: 'chưa hoàn tất/hủy', tone: 'warn' },
        { lbl: 'Hoàn tất', val: consultations.filter((c) => c.status === 4).length, tone: 'ok' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <span className="spacer" />
        <Btn variant="ghost" onClick={reload}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="primary" onClick={() => setCreateOpen(true)}>
          <Ico name="plus" size={12} /> Yêu cầu hội chẩn
        </Btn>
      </div>

      <DataTable<TeleconsultationRequestDto>
        columns={cols} data={consultations} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có yêu cầu hội chẩn nào'}
      />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="lg"
        title={sel ? `Chi tiết hội chẩn — ${sel.requestCode}` : ''}
        sub={sel ? `${sel.patientName} (${sel.patientCode})` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && sel.status === 2 && sel.videoRoomUrl && (
            <Btn variant="primary" onClick={() => handleJoinRoom(sel)}>
              <Ico name="play" size={12} /> Vào phòng
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Thông tin yêu cầu">
            <DrField lbl="Mã">{sel.requestCode}</DrField>
            <DrField lbl="Loại">{sel.requestTypeName || sel.requestType}</DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName} ({sel.patientCode})</DrField>
            <DrField lbl="Mức độ">{sel.urgencyName}</DrField>
            <DrField lbl="BV yêu cầu">{sel.requestingFacilityName}</DrField>
            <DrField lbl="BS yêu cầu">{sel.requestingDoctorName}</DrField>
            <DrField lbl="BV hội chẩn">{sel.consultingFacilityName}</DrField>
            <DrField lbl="Chuyên khoa">{sel.consultingSpecialty}</DrField>
            {sel.consultingDoctorName && <DrField lbl="Chuyên gia">{sel.consultingDoctorName}</DrField>}
          </DrSec>
          <DrSec title="Lâm sàng">
            <DrField lbl="Lý do chính">{sel.chiefComplaint}</DrField>
            <DrField lbl="Câu hỏi lâm sàng">{sel.clinicalQuestion}</DrField>
          </DrSec>
          <DrSec title="Lịch & trạng thái">
            {sel.scheduledDate && <DrField lbl="Lịch hẹn">{sel.scheduledDate} {sel.scheduledTime || ''}</DrField>}
            {sel.duration && <DrField lbl="Thời lượng">{sel.duration} phút</DrField>}
            <DrField lbl="Trạng thái">
              <StatusBadge tone={consTone(sel.status)} dot>{sel.statusName}</StatusBadge>
            </DrField>
            <DrField lbl="Ngày tạo">{dayjs(sel.createdAt).format('YYYY-MM-DD HH:mm')}</DrField>
          </DrSec>
          {(sel.consultationNotes || sel.recommendations || sel.followUpNeeded) && (
            <DrSec title="Kết quả hội chẩn">
              {sel.consultationNotes && <DrField lbl="Ghi chú hội chẩn">{sel.consultationNotes}</DrField>}
              {sel.recommendations && <DrField lbl="Khuyến nghị">{sel.recommendations}</DrField>}
              {sel.followUpNeeded && <DrField lbl="Theo dõi">{sel.followUpInstructions || 'Cần theo dõi'}</DrField>}
            </DrSec>
          )}
        </>}
      </DrawerShell>

      <ModalShell
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Yêu cầu hội chẩn từ xa"
        size="md"
        footer={<>
          <Btn variant="ghost" onClick={() => setCreateOpen(false)}>Hủy</Btn>
          <Btn variant="primary" onClick={() => consultationForm.submit()}><Ico name="send" size={12} /> Gửi yêu cầu</Btn>
        </>}
      >
        <Form form={consultationForm} layout="vertical" onFinish={handleCreateConsultation}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="patientId" label="Mã bệnh nhân" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Nhập mã bệnh nhân" />
            </Form.Item>
            <Form.Item name="requestType" label="Loại yêu cầu" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Chọn loại" options={[
                { value: 'SecondOpinion', label: 'Ý kiến thứ hai' },
                { value: 'Consultation', label: 'Hội chẩn' },
                { value: 'EmergencyConsult', label: 'Hội chẩn cấp cứu' },
              ]} />
            </Form.Item>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="consultingFacilityCode" label="Mã BV hội chẩn" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="Mã cơ sở hội chẩn" />
            </Form.Item>
            <Form.Item name="specialty" label="Chuyên khoa" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Select placeholder="Chọn chuyên khoa" options={[
                { value: 'Tim mạch', label: 'Tim mạch' },
                { value: 'Thần kinh', label: 'Thần kinh' },
                { value: 'Ung bướu', label: 'Ung bướu' },
                { value: 'Nhi khoa', label: 'Nhi khoa' },
                { value: 'Sản phụ khoa', label: 'Sản phụ khoa' },
                { value: 'Chỉnh hình', label: 'Chỉnh hình' },
                { value: 'Mắt', label: 'Mắt' },
                { value: 'Tai Mũi Họng', label: 'Tai Mũi Họng' },
              ]} />
            </Form.Item>
          </div>
          <Form.Item name="chiefComplaint" label="Lý do chính" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Lý do yêu cầu hội chẩn" />
          </Form.Item>
          <Form.Item name="clinicalQuestion" label="Câu hỏi lâm sàng" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="Câu hỏi cần tư vấn" />
          </Form.Item>
          <Form.Item name="relevantHistory" label="Tiền sử liên quan">
            <Input.TextArea rows={2} placeholder="Tiền sử bệnh, điều trị" />
          </Form.Item>
          <Form.Item name="currentFindings" label="Kết quả hiện tại">
            <Input.TextArea rows={2} placeholder="Kết quả khám, xét nghiệm hiện tại" />
          </Form.Item>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="preferredDate" label="Ngày mong muốn" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="urgency" label="Mức độ" initialValue={1} style={{ flex: 1 }}>
              <Select options={[
                { value: 1, label: 'Thường' },
                { value: 2, label: 'Khẩn cấp' },
                { value: 3, label: 'Cấp cứu' },
              ]} />
            </Form.Item>
          </div>
        </Form>
      </ModalShell>
    </>
  );
};

// ═══════════════════════════════ Tab 5 — FHIR R4 (port từ v1) ═══════════════════════════════

type FhirRow = {
  key: string;
  fullUrl: string;
  resourceType: string;
  id: string;
  lastUpdated: string;
  summary: string;
};

const FhirPanel: React.FC = () => {
  const [fhirMetadata, setFhirMetadata] = useState<FhirCapabilityStatement | null>(null);
  const [fhirSearchType, setFhirSearchType] = useState<string>('Patient');
  const [fhirSearchParams, setFhirSearchParams] = useState<Record<string, string>>({});
  const [fhirSearchResults, setFhirSearchResults] = useState<FhirBundle | null>(null);
  const [fhirSearchLoading, setFhirSearchLoading] = useState(false);
  const [fhirJsonDrawerOpen, setFhirJsonDrawerOpen] = useState(false);
  const [fhirJsonContent, setFhirJsonContent] = useState<string>('');
  const [fhirJsonTitle, setFhirJsonTitle] = useState<string>('');
  const [fhirExportPatientId, setFhirExportPatientId] = useState<string>('');
  const [fhirExternalUrl, setFhirExternalUrl] = useState<string>('');
  const [fhirExternalStatus, setFhirExternalStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleFhirLoadMetadata = useCallback(async () => {
    try {
      const metadata = await getMetadata();
      setFhirMetadata(metadata);
    } catch {
      console.warn('Failed to fetch FHIR metadata');
    }
  }, []);

  useEffect(() => {
    handleFhirLoadMetadata();
  }, [handleFhirLoadMetadata]);

  const handleFhirSearch = async () => {
    setFhirSearchLoading(true);
    try {
      const results = await searchResource(fhirSearchType, { ...fhirSearchParams, _count: 20 });
      setFhirSearchResults(results);
    } catch (err) {
      console.warn('FHIR search failed:', err);
      tw('Tìm kiếm FHIR thất bại');
    } finally {
      setFhirSearchLoading(false);
    }
  };

  const handleFhirViewJson = async (resourceType: string, resourceId: string) => {
    try {
      const resource = await readResource(resourceType, resourceId);
      setFhirJsonContent(JSON.stringify(resource, null, 2));
      setFhirJsonTitle(`${resourceType}/${resourceId}`);
      setFhirJsonDrawerOpen(true);
    } catch (err) {
      console.warn('Failed to read FHIR resource:', err);
      tw('Không thể đọc tài nguyên FHIR');
    }
  };

  const handleFhirExportPatient = async () => {
    if (!fhirExportPatientId) {
      tw('Vui lòng nhập Patient ID');
      return;
    }
    try {
      setFhirSearchLoading(true);
      const bundle = await exportPatientBundle(fhirExportPatientId);
      setFhirJsonContent(JSON.stringify(bundle, null, 2));
      setFhirJsonTitle(`Patient Bundle - ${fhirExportPatientId}`);
      setFhirJsonDrawerOpen(true);
    } catch (err) {
      console.warn('Failed to export patient bundle:', err);
      tw('Xuất dữ liệu FHIR thất bại');
    } finally {
      setFhirSearchLoading(false);
    }
  };

  const handleFhirTestExternal = async () => {
    if (!fhirExternalUrl) {
      tw('Vui lòng nhập URL máy chủ FHIR');
      return;
    }
    setFhirExternalStatus('loading');
    try {
      const result = await fetchExternalMetadata(fhirExternalUrl);
      if (result) {
        setFhirExternalStatus('success');
        tk(`Kết nối thành công: ${result.software?.name || 'FHIR Server'} v${result.fhirVersion}`);
      } else {
        setFhirExternalStatus('error');
        tw('Không thể kết nối đến máy chủ FHIR');
      }
    } catch {
      setFhirExternalStatus('error');
      tw('Kết nối FHIR thất bại');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(fhirJsonContent).then(() => {
      tk('Đã sao chép JSON');
    });
  };

  const handleDownloadJson = () => {
    const blob = new Blob([fhirJsonContent], { type: 'application/fhir+json' });
    downloadBlob(blob, `${fhirJsonTitle.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
  };

  const fhirRows: FhirRow[] = (fhirSearchResults?.entry || []).map((e, i) => ({
    key: e.fullUrl || `entry-${i}`,
    fullUrl: e.fullUrl || '',
    resourceType: (e.resource as FhirResource)?.resourceType || '',
    id: (e.resource as FhirResource)?.id || '',
    lastUpdated: (e.resource as FhirResource)?.meta?.lastUpdated || '',
    summary: extractResourceSummary(e.resource),
  }));

  const fhirCols: ColumnDef<FhirRow>[] = [
    { key: 'id', label: 'ID', mono: true, width: 220, render: (r) => r.id },
    { key: 'type', label: 'Type', width: 150, render: (r) => r.resourceType },
    { key: 'summary', label: 'Tóm tắt', render: (r) => r.summary },
    { key: 'updated', label: 'Cập nhật', mono: true, width: 150, render: (r) => r.lastUpdated ? dayjs(r.lastUpdated).format('YYYY-MM-DD HH:mm') : '-' },
  ];

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      {/* FHIR Server Status */}
      <Sect
        title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge tone={fhirMetadata ? 'ok' : 'info'} dot>HL7 FHIR R4 Server</StatusBadge>
          <span style={{ fontWeight: 400, color: 'var(--t-2)' }}>
            {fhirMetadata
              ? `${fhirMetadata.software?.name || 'HIS FHIR'} v${fhirMetadata.software?.version || '1.0'} - FHIR ${fhirMetadata.fhirVersion} - ${fhirMetadata.rest?.[0]?.resource?.length || 0} resource types`
              : 'Đang kết nối...'}
          </span>
        </span>}
        extra={<Btn size="sm" variant="ghost" onClick={handleFhirLoadMetadata}><Ico name="refresh" size={12} /> Kiểm tra</Btn>}
      >
        {/* Supported Resources */}
        {fhirMetadata?.rest?.[0]?.resource ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {fhirMetadata.rest[0].resource.map((r) => (
              <span key={r.type} className="ab-stat info" style={{ height: 22, padding: '0 8px', fontSize: 'var(--fs-xs)' }}>
                {r.type} ({r.interaction?.map((i) => i.code).join(', ')})
              </span>
            ))}
          </div>
        ) : (
          <span style={{ color: 'var(--t-3)', fontSize: 'var(--fs-sm)' }}>Chưa có thông tin tài nguyên</span>
        )}
      </Sect>

      {/* Search Section */}
      <Sect title="Tìm kiếm FHIR Resources">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start' }}>
          <Select
            value={fhirSearchType}
            onChange={(val) => { setFhirSearchType(val); setFhirSearchParams({}); }}
            style={{ width: 200 }}
            options={Object.keys(fhirResourceSearchParams).map((rt) => ({ value: rt, label: rt }))}
          />
          {fhirResourceSearchParams[fhirSearchType]?.map((param) => (
            <Input
              key={param.name}
              placeholder={param.placeholder}
              value={fhirSearchParams[param.name] || ''}
              onChange={(e) => setFhirSearchParams((prev) => ({ ...prev, [param.name]: e.target.value }))}
              onPressEnter={handleFhirSearch}
              style={{ width: 220 }}
            />
          ))}
          <Btn variant="primary" loading={fhirSearchLoading} onClick={handleFhirSearch}>
            <Ico name="search" size={12} /> Tìm kiếm
          </Btn>
        </div>
        {/* Search Results */}
        {fhirSearchResults && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginBottom: 6 }}>
              Kết quả: <b style={{ color: 'var(--t-0)' }}>{fhirSearchResults.total}</b> {fhirSearchType}
            </div>
            <DataTable<FhirRow>
              columns={fhirCols} data={fhirRows} rowKey={(r) => r.key}
              actions={(r) => (
                <div className="ab-actions">
                  <ActBtn ic="eye" title="Xem JSON" onClick={() => handleFhirViewJson(r.resourceType, r.id)} />
                </div>
              )}
              empty="Không có kết quả"
            />
          </div>
        )}
      </Sect>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {/* Export Patient Bundle */}
        <Sect title="Xuất dữ liệu FHIR Bundle" style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="Patient ID (GUID)"
              value={fhirExportPatientId}
              onChange={(e) => setFhirExportPatientId(e.target.value)}
              style={{ flex: 1 }}
            />
            <Btn variant="primary" loading={fhirSearchLoading} onClick={handleFhirExportPatient}>
              <Ico name="download" size={12} /> Xuất Bundle
            </Btn>
          </div>
          <div style={{ marginTop: 8, fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
            Thu thap tat ca Patient, Encounter, Observation, MedicationRequest, Condition, AllergyIntolerance, Procedure, DiagnosticReport
          </div>
        </Sect>
        {/* External FHIR server */}
        <Sect title="Kết nối FHIR Server ngoài" style={{ flex: 1, minWidth: 320 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Input
              placeholder="https://other-hospital.vn/fhir"
              value={fhirExternalUrl}
              onChange={(e) => setFhirExternalUrl(e.target.value)}
              style={{ flex: 1 }}
            />
            <Btn loading={fhirExternalStatus === 'loading'} onClick={handleFhirTestExternal}>
              <Ico name="cloud" size={12} /> Test
            </Btn>
          </div>
          {fhirExternalStatus === 'success' && (
            <div style={{ marginTop: 8 }}><StatusBadge tone="ok" dot>Kết nối thành công</StatusBadge></div>
          )}
          {fhirExternalStatus === 'error' && (
            <div style={{ marginTop: 8 }}><StatusBadge tone="crit" dot>Kết nối thất bại</StatusBadge></div>
          )}
        </Sect>
      </div>

      {/* FHIR JSON Drawer */}
      <DrawerShell
        open={fhirJsonDrawerOpen}
        onClose={() => setFhirJsonDrawerOpen(false)}
        size="lg"
        title={`FHIR JSON - ${fhirJsonTitle}`}
        footer={<>
          <Btn variant="ghost" onClick={() => setFhirJsonDrawerOpen(false)}>Đóng</Btn>
          <Btn onClick={handleCopyJson}><Ico name="file" size={12} /> Sao chép</Btn>
          <Btn variant="primary" onClick={handleDownloadJson}><Ico name="download" size={12} /> Tải xuống</Btn>
        </>}
      >
        <pre style={{
          background: 'var(--d-3)',
          padding: 16,
          borderRadius: 8,
          fontSize: 12,
          lineHeight: 1.5,
          maxHeight: 'calc(100vh - 200px)',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {fhirJsonContent}
        </pre>
      </DrawerShell>
    </div>
  );
};

// ═══════════════════════════════ Tab 6 — Cổng đơn thuốc quốc gia (port từ v1) ═══════════════════════════════

const RX_PAGE_SIZE = 20;

const NationalRxPanel: React.FC = () => {
  const [nationalRxList, setNationalRxList] = useState<NationalPrescriptionDto[]>([]);
  const [nationalRxStats, setNationalRxStats] = useState<NationalPrescriptionStatsDto | null>(null);
  const [nationalRxTotal, setNationalRxTotal] = useState(0);
  const [nationalRxLoading, setNationalRxLoading] = useState(false);
  const [nationalRxSearch, setNationalRxSearch] = useState<{ status?: number; keyword?: string; pageIndex: number }>({ pageIndex: 0 });
  const [selectedNationalRxIds, setSelectedNationalRxIds] = useState<string[]>([]);

  // VERBATIM logic từ v1 fetchNationalRx
  const fetchNationalRx = useCallback(async () => {
    setNationalRxLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        nationalRxApi.searchPrescriptions({ ...nationalRxSearch, pageSize: RX_PAGE_SIZE }),
        nationalRxApi.getStats(),
      ]);
      if (listRes.status === 'fulfilled') {
        setNationalRxList(listRes.value?.items || []);
        setNationalRxTotal(listRes.value?.totalCount || 0);
      }
      if (statsRes.status === 'fulfilled') setNationalRxStats(statsRes.value || null);
    } catch { console.warn('Failed to fetch national prescription data'); }
    finally { setNationalRxLoading(false); }
  }, [nationalRxSearch]);

  useEffect(() => { fetchNationalRx(); }, [fetchNationalRx]);

  const handleSubmitNationalRx = async (id: string) => {
    try {
      await nationalRxApi.submitPrescription(id);
      tk('Đã gửi đơn thuốc lên Cổng quốc gia');
      fetchNationalRx();
    } catch (err) { console.warn('Submit national prescription:', err); tw('Không thể gửi đơn thuốc'); }
  };

  const handleBatchSubmitNationalRx = async () => {
    if (selectedNationalRxIds.length === 0) { tw('Vui lòng chọn đơn thuốc'); return; }
    try {
      const result = await nationalRxApi.submitBatch(selectedNationalRxIds);
      tk(`Gửi thành công ${result.successCount}/${selectedNationalRxIds.length} đơn thuốc`);
      setSelectedNationalRxIds([]);
      fetchNationalRx();
    } catch (err) { console.warn('Batch submit national prescriptions:', err); tw('Không thể gửi hàng loạt'); }
  };

  const handleRetryNationalRx = (id: string) => {
    nationalRxApi.retrySubmission(id)
      .then(() => { tk('Đã gửi lại'); fetchNationalRx(); })
      .catch(() => tw('Lỗi'));
  };

  const handleTestRxConnection = () => {
    nationalRxApi.testConnection()
      .then((r) => { ti(`Kết nối: ${r.connected ? 'OK' : 'Lỗi'} (${r.latencyMs}ms)`); })
      .catch(() => tw('Không thể kết nối'));
  };

  // v1: checkbox disabled khi status !== 0 (chỉ đơn Nháp được chọn gửi hàng loạt)
  const draftIds = nationalRxList.filter((r) => r.status === 0).map((r) => r.id);
  const selectedSet = new Set(selectedNationalRxIds);
  const toggleRx = (k: string) => {
    const row = nationalRxList.find((r) => r.id === k);
    if (!row || row.status !== 0) return;
    setSelectedNationalRxIds((prev) => prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]);
  };
  const toggleAllRx = () => {
    setSelectedNationalRxIds((prev) => (draftIds.length > 0 && prev.length === draftIds.length) ? [] : draftIds);
  };

  const totalPages = Math.max(1, Math.ceil(nationalRxTotal / RX_PAGE_SIZE));
  const setRxPage = (next: number | ((p: number) => number)) =>
    setNationalRxSearch((s) => ({ ...s, pageIndex: typeof next === 'function' ? next(s.pageIndex) : next }));

  const cols: ColumnDef<NationalPrescriptionDto>[] = [
    { key: 'code', label: 'Mã đơn', code: true, width: 130, render: (r) => r.prescriptionCode },
    { key: 'patient', label: 'Bệnh nhân', width: 150, render: (r) => r.patientName },
    { key: 'doctor', label: 'Bác sĩ', width: 130, render: (r) => r.doctorName },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.diagnosisName },
    { key: 'date', label: 'Ngày kê', mono: true, width: 100, render: (r) => r.prescriptionDate ? dayjs(r.prescriptionDate).format('DD/MM/YYYY') : '-' },
    { key: 'amount', label: 'Tổng tiền', mono: true, width: 120, render: (r) => r.totalAmount?.toLocaleString('vi-VN') + ' đ' },
    { key: 'status', label: 'Trạng thái', width: 110, render: (r) => (
      <StatusBadge tone={rxTone(r.status)} dot>{r.statusName}</StatusBadge>
    ) },
  ];

  const actions = (r: NationalPrescriptionDto) => (
    <div className="ab-actions">
      {r.status === 0 && <ActBtn ic="send" title="Gửi" onClick={() => handleSubmitNationalRx(r.id)} />}
      {r.status === 3 && <ActBtn ic="refresh" title="Gửi lại" onClick={() => handleRetryNationalRx(r.id)} />}
    </div>
  );

  const kpis: KpiItem[] = nationalRxStats ? [
    { lbl: 'Đã gửi', val: nationalRxStats.totalSubmitted },
    { lbl: 'Chấp nhận', val: nationalRxStats.totalAccepted, tone: 'ok' },
    { lbl: 'Từ chối', val: nationalRxStats.totalRejected, tone: 'crit' },
    { lbl: 'Chờ xử lý', val: nationalRxStats.totalPending, tone: 'warn' },
  ] : [];

  return (
    <>
      {kpis.length > 0 && <KpiStrip items={kpis} />}

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Filter
          value={nationalRxSearch.status != null ? String(nationalRxSearch.status) : ''}
          onChange={(v) => setNationalRxSearch((s) => ({ ...s, status: v === '' ? undefined : Number(v), pageIndex: 0 }))}
          options={[
            { v: '0', l: 'Nháp' },
            { v: '1', l: 'Đã gửi' },
            { v: '2', l: 'Chấp nhận' },
            { v: '3', l: 'Từ chối' },
          ]}
          placeholder="▾ Trạng thái"
        />
        <Input.Search
          placeholder="Tìm đơn thuốc..."
          allowClear
          style={{ width: 250 }}
          onSearch={(v) => setNationalRxSearch((s) => ({ ...s, keyword: v || undefined, pageIndex: 0 }))}
        />
        <span className="spacer" />
        <Btn variant="ghost" onClick={handleTestRxConnection}>
          <Ico name="refresh" size={12} /> Test kết nối
        </Btn>
        <Btn variant="primary" disabled={selectedNationalRxIds.length === 0} onClick={handleBatchSubmitNationalRx}>
          <Ico name="send" size={12} /> Gửi hàng loạt ({selectedNationalRxIds.length})
        </Btn>
      </div>

      <DataTable<NationalPrescriptionDto>
        columns={cols} data={nationalRxList} rowKey={(r) => r.id}
        selected={selectedSet} onToggle={toggleRx} onToggleAll={toggleAllRx}
        actions={actions}
        empty={nationalRxLoading ? 'Đang tải…' : 'Chưa có đơn thuốc nào'}
      />
      <Pager page={nationalRxSearch.pageIndex} setPage={setRxPage} totalPages={totalPages} total={nationalRxTotal} perPage={RX_PAGE_SIZE} />
    </>
  );
};

// ═══════════════════════════════ Tab 7 — Sở Y tế (port từ v1) ═══════════════════════════════

const PROV_PAGE_SIZE = 20;

const ProvincialPanel: React.FC = () => {
  const [provReports, setProvReports] = useState<ProvincialReportDto[]>([]);
  const [provStats, setProvStats] = useState<ProvincialStatsDto | null>(null);
  const [provTotal, setProvTotal] = useState(0);
  const [provLoading, setProvLoading] = useState(false);
  const [provSearch, setProvSearch] = useState<{ reportType?: number; status?: number; pageIndex: number }>({ pageIndex: 0 });

  // VERBATIM logic từ v1 fetchProvReports
  const fetchProvReports = useCallback(async () => {
    setProvLoading(true);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        provincialApi.searchReports({ ...provSearch, pageSize: PROV_PAGE_SIZE }),
        provincialApi.getStats(),
      ]);
      if (listRes.status === 'fulfilled') {
        setProvReports(listRes.value?.items || []);
        setProvTotal(listRes.value?.totalCount || 0);
      }
      if (statsRes.status === 'fulfilled') setProvStats(statsRes.value || null);
    } catch { console.warn('Failed to fetch provincial health data'); }
    finally { setProvLoading(false); }
  }, [provSearch]);

  useEffect(() => { fetchProvReports(); }, [fetchProvReports]);

  const handleGenerateProvReport = async (reportType: number) => {
    try {
      const period = dayjs().format('YYYY-MM');
      await provincialApi.generateReport(reportType, period);
      tk('Đã tạo báo cáo');
      fetchProvReports();
    } catch (err) { console.warn('Generate provincial report:', err); tw('Không thể tạo báo cáo'); }
  };

  const handleSubmitProvReport = async (id: string) => {
    try {
      await provincialApi.submitReport(id);
      tk('Đã gửi báo cáo lên Sở Y tế');
      fetchProvReports();
    } catch (err) { console.warn('Submit provincial report:', err); tw('Không thể gửi báo cáo'); }
  };

  const handleTestProvConnection = () => {
    provincialApi.testConnection()
      .then((r) => { ti(`Kết nối Sở Y tế: ${r.connected ? 'OK' : 'Lỗi'} (${r.latencyMs}ms)`); })
      .catch(() => tw('Không thể kết nối'));
  };

  const totalPages = Math.max(1, Math.ceil(provTotal / PROV_PAGE_SIZE));
  const setProvPage = (next: number | ((p: number) => number)) =>
    setProvSearch((s) => ({ ...s, pageIndex: typeof next === 'function' ? next(s.pageIndex) : next }));

  const cols: ColumnDef<ProvincialReportDto>[] = [
    { key: 'code', label: 'Mã BC', code: true, width: 120, render: (r) => r.reportCode },
    { key: 'type', label: 'Loại', width: 100, render: (r) => r.reportTypeName },
    { key: 'period', label: 'Kỳ BC', mono: true, width: 100, render: (r) => r.reportPeriod },
    { key: 'opd', label: 'Ngoại trú', mono: true, width: 80, render: (r) => r.totalOutpatients },
    { key: 'ipd', label: 'Nội trú', mono: true, width: 80, render: (r) => r.totalInpatients },
    { key: 'er', label: 'Cấp cứu', mono: true, width: 80, render: (r) => r.totalEmergencies },
    { key: 'lab', label: 'XN', mono: true, width: 70, render: (r) => r.totalLabTests },
    { key: 'rad', label: 'CĐHA', mono: true, width: 70, render: (r) => r.totalRadiologyExams },
    { key: 'bed', label: 'Công suất giường', mono: true, width: 120, render: (r) => r.bedOccupancyRate ? `${(r.bedOccupancyRate * 100).toFixed(1)}%` : '-' },
    { key: 'status', label: 'Trạng thái', width: 100, render: (r) => (
      <StatusBadge tone={provTone(r.status)} dot>{r.statusName}</StatusBadge>
    ) },
  ];

  const actions = (r: ProvincialReportDto) => (
    <div className="ab-actions">
      {r.status === 0 && <ActBtn ic="send" title="Gửi" onClick={() => handleSubmitProvReport(r.id)} />}
    </div>
  );

  const kpis: KpiItem[] = provStats ? [
    { lbl: 'BC tháng này', val: provStats.totalReportsThisMonth },
    { lbl: 'Đã gửi', val: provStats.totalSubmitted, tone: 'ok' },
    { lbl: 'Chờ xử lý', val: provStats.totalPending, tone: 'warn' },
    { lbl: 'Bệnh truyền nhiễm', val: provStats.infectiousDiseaseAlerts, tone: provStats.infectiousDiseaseAlerts > 0 ? 'crit' : 'ok' },
  ] : [];

  return (
    <>
      {kpis.length > 0 && <KpiStrip items={kpis} />}

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <Filter
          value={provSearch.reportType != null ? String(provSearch.reportType) : ''}
          onChange={(v) => setProvSearch((s) => ({ ...s, reportType: v === '' ? undefined : Number(v), pageIndex: 0 }))}
          options={[
            { v: '1', l: 'Hàng ngày' },
            { v: '2', l: 'Hàng tuần' },
            { v: '3', l: 'Hàng tháng' },
            { v: '4', l: 'Hàng quý' },
            { v: '5', l: 'Hàng năm' },
          ]}
          placeholder="▾ Loại báo cáo"
        />
        <Filter
          value={provSearch.status != null ? String(provSearch.status) : ''}
          onChange={(v) => setProvSearch((s) => ({ ...s, status: v === '' ? undefined : Number(v), pageIndex: 0 }))}
          options={[
            { v: '0', l: 'Nháp' },
            { v: '1', l: 'Đã gửi' },
            { v: '2', l: 'Đã nhận' },
            { v: '3', l: 'Từ chối' },
          ]}
          placeholder="▾ Trạng thái"
        />
        <span className="spacer" />
        <Btn variant="ghost" onClick={handleTestProvConnection}>
          <Ico name="refresh" size={12} /> Test kết nối
        </Btn>
        <Btn variant="ghost" onClick={() => handleGenerateProvReport(1)}>
          <Ico name="file-text" size={12} /> Tạo BC ngày
        </Btn>
        <Btn variant="primary" onClick={() => handleGenerateProvReport(3)}>
          <Ico name="file-text" size={12} /> Tạo BC tháng
        </Btn>
      </div>

      <DataTable<ProvincialReportDto>
        columns={cols} data={provReports} rowKey={(r) => r.id}
        actions={actions}
        empty={provLoading ? 'Đang tải…' : 'Chưa có báo cáo nào'}
      />
      <Pager page={provSearch.pageIndex} setPage={setProvPage} totalPages={totalPages} total={provTotal} perPage={PROV_PAGE_SIZE} />
    </>
  );
};

export default HealthExchangeV2;
