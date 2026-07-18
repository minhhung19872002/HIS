import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, InputNumber, Select, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getInpatientList, getWardLayout, admitFromOpd, getPendingAdmissions, transferBed, assignBed, getDepositRequests, createDepositRequest, type PendingAdmissionDto, type TransferBedDto, type CreateBedAssignmentDto, type DepositRequestDto, type CreateDepositRequestDto } from '../api/inpatient';
import type { InpatientListDto, WardLayoutDto, BedLayoutDto } from '../api/inpatient';
import { getServiceOrders, type InpatientServiceOrderDto } from '../api/inpatient';
import { printBirthCertificate, type BirthCertificateData } from '../../patient/components/BirthCertificatePrint';
import TreatmentMonitorSection from './TreatmentMonitorSection';
import ConsultationSection from './ConsultationSection';
import NursingSection from './NursingSection';
import NewbornSection from './NewbornSection';
import HemodialysisSection from './HemodialysisSection';
import PatientFlagBanner from '../../patient/components/PatientFlagBanner';
import BusinessAlertPanel from '../../patient/components/BusinessAlertPanel';
import { catalogApi } from '../../system/api/system';
import type { DepartmentCatalogDto } from '../../system/api/system';
import {
  KpiStrip, TopTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell, ModalShell,
  type ColumnDef, type TopTab,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { fmtVND } from '../../../utils/format';
import { openPrintWindow, escapeHtml as esc } from '../../../utils/printWindow';
import { HOSPITAL_NAME } from '../../../constants/hospital';
import { buildMedicalRecordHtml } from '../../../pages/inpatient/printTemplates';
import { MEDICAL_RECORD_TYPES } from '../../../pages/inpatient/constants';

/* ────────────────────────────────────────────────────────────
   Nội trú v2 — bed-map (Sơ đồ giường) theo mock Ward v2.
   3 tab: Sơ đồ giường (grid card theo khoa) · Danh sách BN · Y lệnh.
   Dữ liệu thật: getWardLayout (rooms→beds) + getInpatientList.
   ──────────────────────────────────────────────────────────── */

type TopKey = 'grid' | 'list' | 'orders' | 'supplies' | 'consult' | 'nursing' | 'discharge';
const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'grid',      l: 'Sơ đồ giường',   ic: 'grid' },
  { v: 'list',      l: 'Danh sách BN',   ic: 'users' },
  { v: 'orders',    l: 'Y lệnh hôm nay', ic: 'clipboard' },
  { v: 'supplies',  l: 'Vật tư / DV',    ic: 'package' },
  { v: 'consult',   l: 'Hội chẩn',       ic: 'message-square' },
  { v: 'nursing',   l: 'Điều dưỡng',     ic: 'heart' },
  { v: 'discharge', l: 'Đã xuất viện',   ic: 'logout' },
];

// Bed status: 1 trống · 2 có BN · 3 bảo trì (khớp BedLayoutDto.status)
const BED_STATUS = [
  { v: '2', l: 'Có bệnh nhân' },
  { v: '1', l: 'Trống' },
  { v: '3', l: 'Bảo trì' },
];
const bedTone = (s: number): { bg: string; line: string } => {
  if (s === 2) return { bg: 'var(--a-cy-bg)', line: 'var(--a-cy-line)' };
  if (s === 3) return { bg: 'var(--a-or-bg)', line: 'var(--a-or-line)' };
  return { bg: 'var(--d-2)', line: 'var(--line)' };
};

const fmtDMY = (iso?: string) => (iso ? dayjs(iso).format('DD/MM/YYYY') : '—');
const genderLabel = (g?: number) => (g === 1 ? 'Nam' : g === 2 ? 'Nữ' : '—');

function buildInpatientRecordHtml(d: InpatientListDto): string {
  const row = (label: string, value: string) =>
    `<tr><td style="width:38%;font-weight:600;color:#555;padding:5px 8px;border:1px solid #ccc">${label}</td><td style="padding:5px 8px;border:1px solid #ccc">${esc(value || '—')}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Phiếu nội trú</title>
<style>body{font-family:'Times New Roman',serif;margin:18mm 15mm;font-size:13pt}
h2{text-align:center;font-size:15pt;margin:8px 0}h4{text-align:center;font-size:12pt;font-weight:normal;margin:4px 0 16px}
table{width:100%;border-collapse:collapse}.section{margin-top:14px}
.section h5{font-size:12pt;font-weight:700;border-bottom:1px solid #aaa;padding-bottom:3px;margin:0 0 6px}
</style></head><body>
<div style="text-align:center;font-weight:bold;font-size:11pt">${esc(HOSPITAL_NAME)}</div>
<h2>PHIẾU THEO DÕI ĐIỀU TRỊ NỘI TRÚ</h2>
<h4>Số hồ sơ: ${esc(d.medicalRecordCode)}</h4>
<div class="section"><h5>I. THÔNG TIN BỆNH NHÂN</h5>
<table>
${row('Họ và tên', d.patientName)}
${row('Mã bệnh nhân', d.patientCode)}
${row('Giới tính', genderLabel(d.gender))}
${row('Tuổi', d.age ? String(d.age) : '—')}
${row('Ngày sinh', fmtDMY(d.dateOfBirth))}
${row('Số BHYT', d.insuranceNumber || '—')}</table></div>
<div class="section"><h5>II. THÔNG TIN NHẬP VIỆN</h5>
<table>
${row('Khoa điều trị', d.departmentName)}
${row('Phòng / Giường', `${d.roomName}${d.bedName ? ' · ' + d.bedName : ''}`)}
${row('Bác sĩ điều trị', d.attendingDoctorName || '—')}
${row('Chẩn đoán', d.mainDiagnosis || '—')}
${row('Ngày nhập viện', fmtDMY(d.admissionDate))}
${row('Số ngày nằm viện', `${d.daysOfStay} ngày`)}
${row('Trạng thái', d.statusName || '—')}</table></div>
<div class="section"><h5>III. GHI CHÚ / Y LỆNH CHÍNH</h5>
<div style="border:1px solid #ccc;padding:6px 8px;min-height:80px"></div></div>
<div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr;gap:24px;text-align:center;font-size:12pt">
<div><b>Bác sĩ điều trị</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>${esc(d.attendingDoctorName || '................')}</b></div>
<div><b>Điều dưỡng trưởng</b><br/><span style="font-size:10pt;color:#888">(Ký và ghi rõ họ tên)</span><div style="height:60px"></div><b>................</b></div>
</div>
</body></html>`;
}

type IpStatusKey = 'admitted' | 'transferred' | 'discharged';
const ipStatusKey = (s: number): IpStatusKey => (s === 1 ? 'transferred' : s === 2 ? 'discharged' : 'admitted');
const IP_STATUS_LABEL: Record<IpStatusKey, string> = { admitted: 'Đang điều trị', transferred: 'Đã chuyển', discharged: 'Đã xuất viện' };

const InpatientV2: React.FC = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState<TopKey>('grid');
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<WardLayoutDto[]>([]);
  const [inpatients, setInpatients] = useState<InpatientListDto[]>([]);
  const [search, setSearch] = useState('');
  const [fWard, setFWard] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [page, setPage] = useState(0);
  const [bed, setBed] = useState<(BedLayoutDto & { wardName?: string ; wardId?: string; roomId?: string; roomName?: string }) | null>(null);
  const [detail, setDetail] = useState<InpatientListDto | null>(null);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [admitPrefill, setAdmitPrefill] = useState<AdmitPrefill | null>(null);
  // Quick-win states
  const [transferBedOpen, setTransferBedOpen] = useState(false);
  const [assignBedOpen, setAssignBedOpen] = useState(false);
  const [medRecordType, setMedRecordType] = useState<string>(MEDICAL_RECORD_TYPES[0].value);
  const [birthCertOpen, setBirthCertOpen] = useState(false);
  // Discharge tab date range
  const [dischargeFrom, setDischargeFrom] = useState<dayjs.Dayjs | null>(null);
  const [dischargeTo, setDischargeTo] = useState<dayjs.Dayjs | null>(null);
  // Deposit (tạm ứng)
  const [depositModal, setDepositModal] = useState(false);
  const [depositAdmissionId, setDepositAdmissionId] = useState('');
  // Supplies tab — selected patient for service-order drill-down
  const [supplyPatient, setSupplyPatient] = useState<InpatientListDto | null>(null);
  const [supplyOrders, setSupplyOrders] = useState<InpatientServiceOrderDto[]>([]);
  const [supplyLoading, setSupplyLoading] = useState(false);
  const LIST_PAGE = 16;

  const loadData = useCallback(() => {
    setLoading(true);
    (async () => {
      // 1) inpatient list (list tab + KPIs)
      let ip: InpatientListDto[] = [];
      try {
        // InpatientSearchDto dùng `page` (1-based), không phải `pageIndex` (0-based)
        const r = await getInpatientList({ page: 1, pageSize: 300 });
        ip = r.data?.items || [];
      } catch { ip = []; }
      setInpatients(ip);

      // 2) ward layouts for clinical departments with beds
      try {
        const depts = (await catalogApi.getDepartments(undefined, undefined, true)).data || [];
        const layouts = await Promise.allSettled(
          depts.slice(0, 40).map((d) => getWardLayout(d.id!).then((res) => res.data)),
        );
        const ws = layouts
          .filter((l): l is PromiseFulfilledResult<WardLayoutDto> => l.status === 'fulfilled' && !!l.value)
          .map((l) => l.value)
          .filter((w) => (w.totalBeds ?? 0) > 0);
        setWards(ws);
      } catch { setWards([]); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadSupplyOrders = useCallback(async (p: InpatientListDto) => {
    setSupplyPatient(p); setSupplyOrders([]); setSupplyLoading(true);
    try {
      const today = dayjs().format('YYYY-MM-DD');
      const res = await getServiceOrders(p.admissionId, today, today);
      setSupplyOrders(Array.isArray(res.data) ? res.data as InpatientServiceOrderDto[] : []);
    } catch { setSupplyOrders([]); }
    finally { setSupplyLoading(false); }
  }, []);

  // All beds flattened (with ward name) for grid + filtering.
  const allBeds = useMemo(
    () => wards.flatMap((w) => (w.rooms ?? []).flatMap((r) => (r.beds ?? []).map((b) => ({ ...b, wardId: w.departmentId, wardName: w.departmentName, roomId: r.roomId, roomName: r.roomName })))),
    [wards],
  );

  const wardOpts = useMemo(
    () => wards.map((w) => ({ v: w.departmentId, l: w.departmentName })),
    [wards],
  );

  const filteredBeds = useMemo(() => allBeds.filter((b) => {
    if (fWard && b.wardId !== fWard) return false;
    if (fStatus && String(b.status) !== fStatus) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [b.patientName, b.patientCode, b.bedName, b.bedCode].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [allBeds, fWard, fStatus, search]);

  // KPIs (match mock: Tổng giường / Có BN / Trống / Cảnh báo / TB ngày nằm / Bàn giao ca)
  const kpis = useMemo(() => {
    const total = allBeds.length;
    const occupied = allBeds.filter((b) => b.status === 2).length;
    const empty = allBeds.filter((b) => b.status === 1).length;
    const occupancy = total > 0 ? Math.round(occupied / total * 100) : 0;
    const alerts = inpatients.filter((r) => r.hasPendingOrders || r.hasPendingLabResults || r.hasUnclaimedMedicine || r.isDebtWarning).length;
    const avgLos = inpatients.length > 0 ? Math.round(inpatients.reduce((s, r) => s + (r.daysOfStay || 0), 0) / inpatients.length * 10) / 10 : 0;
    return [
      { lbl: 'Tổng giường', val: total, sub: `${wards.length} khoa` },
      { lbl: 'Có BN', val: occupied, sub: `${occupancy}% công suất`, tone: 'info' as const },
      { lbl: 'Trống', val: empty, sub: 'sẵn sàng', tone: 'ok' as const },
      { lbl: 'Cảnh báo', val: alerts, sub: 'BN cần theo dõi', tone: 'crit' as const },
      { lbl: 'TB ngày nằm', val: avgLos, unit: 'ngày', sub: '/ ca' },
      { lbl: 'Bàn giao ca', val: '07:00', sub: 'ca sáng' },
    ];
  }, [allBeds, inpatients, wards]);

  // ─── List tab data (filtered inpatients) ───
  const listFiltered = useMemo(() => inpatients.filter((r) => {
    if (fWard) {
      const w = wards.find((x) => x.departmentId === fWard);
      if (w && r.departmentName !== w.departmentName) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.patientName, r.patientCode, r.medicalRecordCode, r.mainDiagnosis].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [inpatients, fWard, wards, search]);
  const listTotalPages = Math.max(1, Math.ceil(listFiltered.length / LIST_PAGE));
  const listPaged = listFiltered.slice(page * LIST_PAGE, (page + 1) * LIST_PAGE);

  const ordersList = useMemo(() => inpatients.filter((r) => r.hasPendingOrders || r.hasUnclaimedMedicine || r.hasPendingLabResults), [inpatients]);

  // Tab "Đã xuất viện" — filter status=2 + optional date range + search
  const dischargeList = useMemo(() => inpatients.filter((r) => {
    if (r.status !== 2) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [r.patientName, r.patientCode, r.medicalRecordCode].filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (dischargeFrom && r.admissionDate && dayjs(r.admissionDate).isBefore(dischargeFrom, 'day')) return false;
    if (dischargeTo && r.admissionDate && dayjs(r.admissionDate).isAfter(dischargeTo, 'day')) return false;
    return true;
  }), [inpatients, search, dischargeFrom, dischargeTo]);

  const listColumns: ColumnDef<InpatientListDto>[] = [
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode} · {genderLabel(r.gender)} · {r.age || '—'}t</i></div>
      ),
    },
    { key: 'ward', label: 'Khoa · Phòng · Giường', render: (r) => (
      <div className="cell-2l"><b>{r.departmentName}</b><i>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</i></div>
    ) },
    { key: 'dx', label: 'Chẩn đoán', render: (r) => r.mainDiagnosis || '—' },
    { key: 'doctor', label: 'BS điều trị', width: 170, render: (r) => r.attendingDoctorName || '—' },
    { key: 'los', label: 'Ngày nằm', mono: true, width: 90, render: (r) => `${r.daysOfStay} ngày` },
    { key: 'flags', label: 'Cảnh báo', width: 180, render: (r) => (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        {r.hasPendingOrders && <span className="chip warn">Y lệnh</span>}
        {r.hasPendingLabResults && <span className="chip warn">CLS</span>}
        {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc</span>}
        {r.isDebtWarning && <span className="chip crit">Nợ</span>}
        {!r.hasPendingOrders && !r.hasPendingLabResults && !r.hasUnclaimedMedicine && !r.isDebtWarning && <span style={{ color: 'var(--t-3)' }}>—</span>}
      </div>
    ) },
    { key: 'status', label: 'TT', width: 120, render: (r) => {
      const sk = ipStatusKey(r.status);
      return <StatusBadge tone={sk === 'admitted' ? 'ok' : 'info'} dot>{r.statusName || IP_STATUS_LABEL[sk]}</StatusBadge>;
    } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <TopTabs<TopKey>
        tab={tab}
        setTab={(t) => { setTab(t); setPage(0); }}
        tabs={TOP_TABS}
        actions={
          <>
            <Btn variant="ghost" onClick={loadData}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => navigate('/v2/hr')}>
              <TermIcon name="users" size={12} /> Bàn giao ca <kbd>F4</kbd>
            </Btn>
            <Btn variant="ghost" onClick={() => { setAdmitPrefill(null); setAdmitOpen(true); }}>
              <TermIcon name="plus" size={12} /> Nhập viện
            </Btn>
            <Btn variant="primary" onClick={() => navigate('/v2/inpatient-dispensing')}>
              <TermIcon name="clipboard" size={12} /> Y lệnh mới <kbd>F2</kbd>
            </Btn>
          </>
        }
      />

      {/* Tab Hội chẩn có toolbar riêng trong ConsultationSection */}
      {tab !== 'consult' && tab !== 'nursing' && tab !== 'discharge' && tab !== 'supplies' && (
        <div className="ab-tools">
          <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm tên BN, mã BN, mã giường…" />
          <Filter value={fWard} onChange={(v) => { setFWard(v); setPage(0); }} options={wardOpts} placeholder="▾ Khoa" />
          {tab === 'grid' && <Filter value={fStatus} onChange={setFStatus} options={BED_STATUS} placeholder="▾ Trạng thái" />}
          <Btn variant="ghost" onClick={() => { setSearch(''); setFWard(''); setFStatus(''); setPage(0); }}>
            <TermIcon name="refresh" size={12} /> Bỏ lọc
          </Btn>
          <span className="spacer" />
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
            {tab === 'grid' ? `${filteredBeds.length} giường` : tab === 'list' ? `${listFiltered.length} BN` : `${ordersList.length} BN có y lệnh`}
          </span>
        </div>
      )}

      {/* ── Tab: Sơ đồ giường ── */}
      {tab === 'grid' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-18)', background: 'var(--d-1)' }}>
          {loading && <div style={{ textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)', padding: 'var(--space-20)' }}>Đang tải sơ đồ giường…</div>}
          {!loading && filteredBeds.length === 0 && (
            <div className="ab-empty" style={{ padding: 'var(--space-40)' }}><TermIcon name="grid" size={20} /><div>Không có giường phù hợp</div></div>
          )}
          {wards.map((w) => {
            const wardBeds = filteredBeds.filter((b) => b.wardId === w.departmentId);
            if (wardBeds.length === 0) return null;
            const occ = wardBeds.filter((b) => b.status === 2).length;
            return (
              <div key={w.departmentId} style={{ marginBottom: 'var(--space-24)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
                  <h3 style={{ margin: 0, fontSize: 14 }}>{w.departmentName}</h3>
                  <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{occ}/{wardBeds.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 'var(--space-8)' }}>
                  {wardBeds.map((b) => {
                    const t = bedTone(b.status);
                    return (
                      <div
                        key={b.bedId}
                        onClick={() => setBed(b)}
                        style={{ padding: 'var(--space-10)', background: t.bg, border: `1px solid ${t.line}`, borderRadius: 'var(--r-2)', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-6)' }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--t-0)' }}>{b.bedName || b.bedCode}</span>
                        </div>
                        {b.patientName ? (
                          <>
                            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-0)', lineHeight: 1.2, marginBottom: 'var(--space-2)' }}>{b.patientName}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t-2)', marginBottom: 'var(--space-4)' }}>{b.age || '—'}T · {genderLabel(b.gender)}{b.daysOfStay != null ? ` · ${b.daysOfStay} ngày` : ''}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t-1)', lineHeight: 1.3 }}>{b.mainDiagnosis || '—'}</div>
                          </>
                        ) : (
                          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', padding: '14px 0', textAlign: 'center' }}>{b.statusName || BED_STATUS.find((s) => s.v === String(b.status))?.l}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Tab: Danh sách BN ── */}
      {tab === 'list' && (
        <div className="ab-stack">
          <DataTable<InpatientListDto>
            columns={listColumns}
            data={listPaged}
            rowKey={(r) => r.admissionId}
            onRowClick={setDetail}
            actions={(r) => (
              <div className="ab-actions">
                <ActBtn ic="eye" title="Hồ sơ" onClick={() => setDetail(r)} />
                <ActBtn ic="clipboard" title="Y lệnh" onClick={() => navigate('/v2/inpatient-dispensing')} />
              </div>
            )}
            empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="users" size={20} /><div>Không có bệnh nhân nội trú</div></div>}
          />
          <div className="ab-tbl-ft">
            <span>Tổng <b>{listFiltered.length}</b> BN · trang <b>{page + 1}/{listTotalPages}</b></span>
            <span className="spacer" />
            <Pager page={page} totalPages={listTotalPages} setPage={setPage} total={listFiltered.length} perPage={LIST_PAGE} />
          </div>
        </div>
      )}

      {/* ── Tab: Y lệnh hôm nay ── */}
      {tab === 'orders' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-18)', background: 'var(--d-1)' }}>
          <div style={{ background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
            {ordersList.length === 0 && <div style={{ padding: 28, textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>Không có bệnh nhân cần xử lý y lệnh</div>}
            {ordersList.map((r) => (
              <div key={r.admissionId} style={{ padding: '14px 18px', borderBottom: '1px solid var(--line-soft)', display: 'flex', alignItems: 'center', gap: 'var(--space-10)', cursor: 'pointer' }} onClick={() => setDetail(r)}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--t-0)', minWidth: 90 }}>{r.bedName || r.roomName}</span>
                <span style={{ fontWeight: 600 }}>{r.patientName}</span>
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.mainDiagnosis || '—'}</span>
                <span className="spacer" />
                {r.hasPendingOrders && <span className="chip warn">Y lệnh chờ</span>}
                {r.hasPendingLabResults && <span className="chip warn">CLS</span>}
                {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc</span>}
                <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.attendingDoctorName || ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Vật tư / Dịch vụ ── */}
      {tab === 'supplies' && (
        <>
          <div className="ab-tools">
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm BN có đặt vật tư / dịch vụ…" />
            <Filter value={fWard} onChange={(v) => { setFWard(v); setPage(0); }} options={wardOpts} placeholder="▾ Khoa" />
            <Btn variant="ghost" onClick={() => { setSearch(''); setFWard(''); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
              {inpatients.filter((r) => r.hasPendingOrders).length} BN có y lệnh
            </span>
          </div>
          <div className="ab-stack">
            <DataTable<InpatientListDto>
              columns={[
                { key: 'patient', label: 'Bệnh nhân',
                  render: (r) => <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode}</i></div> },
                { key: 'ward', label: 'Khoa · Giường',
                  render: (r) => <div className="cell-2l"><b>{r.departmentName}</b><i>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</i></div> },
                { key: 'doctor', label: 'BS điều trị', width: 160, render: (r) => r.attendingDoctorName || '—' },
                { key: 'flags', label: 'Trạng thái', width: 200,
                  render: (r) => (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                      {r.hasPendingOrders && <span className="chip warn">Y lệnh chờ</span>}
                      {r.hasUnclaimedMedicine && <span className="chip warn">Thuốc chưa lấy</span>}
                      {r.hasPendingLabResults && <span className="chip info">CLS</span>}
                    </div>
                  ) },
              ]}
              data={listFiltered.filter((r) => r.hasPendingOrders || r.hasUnclaimedMedicine)}
              rowKey={(r) => r.admissionId}
              onRowClick={(r) => void loadSupplyOrders(r)}
              empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="package" size={20} /><div>Không có BN cần xử lý vật tư / dịch vụ</div></div>}
            />
          </div>

          {/* Drawer: service orders của BN được chọn */}
          <DrawerShell
            open={!!supplyPatient} onClose={() => setSupplyPatient(null)} size="lg"
            title={supplyPatient ? `${supplyPatient.patientName} — Vật tư / Dịch vụ` : ''}
            sub={supplyPatient ? `${supplyPatient.departmentName} · ${supplyPatient.roomName}${supplyPatient.bedName ? ` · ${supplyPatient.bedName}` : ''}` : ''}
          >
            {supplyPatient && (
              <div style={{ padding: 'var(--space-18)' }}>
                {supplyLoading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-2)' }}>Đang tải y lệnh…</div>}
                {!supplyLoading && supplyOrders.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--t-2)' }}>Không có y lệnh dịch vụ hôm nay</div>
                )}
                {supplyOrders.map((order, i) => (
                  <div key={order.id || i} style={{ marginBottom: 'var(--space-16)', background: 'var(--d-2)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', padding: 'var(--space-12)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                        Y lệnh #{i + 1} · {order.orderingDoctorName || ''}
                      </span>
                      <StatusBadge tone={(order.status === 2 ? 'ok' : order.status === 3 ? 'crit' : 'warn')}>
                        {order.status === 0 ? 'Chờ' : order.status === 1 ? 'Đang thực hiện' : order.status === 2 ? 'Hoàn thành' : 'Hủy'}
                      </StatusBadge>
                    </div>
                    {(order.services || []).map((item, j) => (
                      <div key={item.id || j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: j > 0 ? '1px solid var(--line-soft)' : undefined }}>
                        <span>{item.serviceName || item.serviceCode}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </DrawerShell>
        </>
      )}

      {/* ── Tab: Hội chẩn (issue #2 — list/tạo/hoàn thành/in, BE mig 99) ── */}
      {tab === 'consult' && <ConsultationSection inpatients={inpatients} active={tab === 'consult'} />}

      {/* ── Tab: Điều dưỡng ── */}
      {tab === 'nursing' && <NursingSection inpatients={inpatients} active={tab === 'nursing'} />}

      {/* ── Tab: Đã xuất viện ── */}
      {tab === 'discharge' && (
        <>
          <div className="ab-tools">
            <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Tìm tên BN, mã BN, mã hồ sơ…" />
            <Filter value={fWard} onChange={(v) => { setFWard(v); setPage(0); }} options={wardOpts} placeholder="▾ Khoa" />
            <DatePicker
              placeholder="Từ ngày"
              value={dischargeFrom}
              onChange={setDischargeFrom}
              format="DD/MM/YYYY"
              style={{ height: 28, fontSize: 'var(--fs-xs)' }}
              allowClear
            />
            <DatePicker
              placeholder="Đến ngày"
              value={dischargeTo}
              onChange={setDischargeTo}
              format="DD/MM/YYYY"
              style={{ height: 28, fontSize: 'var(--fs-xs)' }}
              allowClear
            />
            <Btn variant="ghost" onClick={() => { setSearch(''); setFWard(''); setDischargeFrom(null); setDischargeTo(null); setPage(0); }}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
              {dischargeList.length} BN đã xuất
            </span>
          </div>
          <div className="ab-stack">
            <DataTable<InpatientListDto>
              columns={[
                {
                  key: 'patient', label: 'Bệnh nhân',
                  render: (r) => (
                    <div className="cell-2l"><b>{r.patientName}</b><i className="mono">{r.patientCode} · {genderLabel(r.gender)} · {r.age || '—'}t</i></div>
                  ),
                },
                { key: 'ward', label: 'Khoa điều trị', render: (r) => (
                  <div className="cell-2l"><b>{r.departmentName}</b><i>{r.roomName}{r.bedName ? ` · ${r.bedName}` : ''}</i></div>
                ) },
                { key: 'dx', label: 'Chẩn đoán ra viện', render: (r) => r.mainDiagnosis || '—' },
                { key: 'doctor', label: 'BS điều trị', width: 170, render: (r) => r.attendingDoctorName || '—' },
                { key: 'admit', label: 'Vào viện', mono: true, width: 110, render: (r) => fmtDMY(r.admissionDate) },
                { key: 'los', label: 'Ngày nằm', mono: true, width: 90, render: (r) => `${r.daysOfStay} ngày` },
              ]}
              data={dischargeList.slice(page * LIST_PAGE, (page + 1) * LIST_PAGE)}
              rowKey={(r) => r.admissionId}
              onRowClick={setDetail}
              actions={(r) => (
                <div className="ab-actions">
                  <ActBtn ic="eye" title="Hồ sơ" onClick={() => setDetail(r)} />
                </div>
              )}
              empty={loading ? 'Đang tải…' : <div className="ab-empty"><TermIcon name="logout" size={20} /><div>Không có bệnh nhân đã xuất viện</div></div>}
            />
            <div className="ab-tbl-ft">
              <span>Tổng <b>{dischargeList.length}</b> BN · trang <b>{page + 1}/{Math.max(1, Math.ceil(dischargeList.length / LIST_PAGE))}</b></span>
              <span className="spacer" />
              <Pager page={page} totalPages={Math.max(1, Math.ceil(dischargeList.length / LIST_PAGE))} setPage={setPage} total={dischargeList.length} perPage={LIST_PAGE} />
            </div>
          </div>
        </>
      )}

      {/* Bed drawer */}
      <DrawerShell
        open={!!bed}
        onClose={() => setBed(null)}
        size="md"
        title={bed ? `Giường ${bed.bedName || bed.bedCode}` : ''}
        sub={bed?.wardName}
        footer={bed ? (
          bed.patientName ? (
            <>
              <Btn variant="ghost" onClick={() => setBed(null)}>Đóng</Btn>
              <Btn variant="ghost" onClick={() => setTransferBedOpen(true)}>
                <TermIcon name="arrow-right" size={12} /> Chuyển giường
              </Btn>
              <Btn variant="primary" onClick={() => { setBed(null); navigate('/v2/inpatient-dispensing'); }}>
                <TermIcon name="clipboard" size={12} /> Y lệnh
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => setBed(null)}>Đóng</Btn>
              <Btn variant="ghost" onClick={() => setAssignBedOpen(true)}>
                <TermIcon name="users" size={12} /> Phân giường
              </Btn>
              <Btn variant="primary" onClick={() => { setAdmitPrefill({ departmentId: bed.wardId, roomId: bed.roomId, bedId: bed.bedId }); setBed(null); setAdmitOpen(true); }}>Nhập viện vào giường này</Btn>
            </>
          )
        ) : null}
      >
        {bed && (bed.patientName ? (
          <div style={{ padding: 'var(--space-18)' }}>
            <div className="rec-section">
              <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
              <div className="rec-kv">
                <span>Họ tên</span><b>{bed.patientName}</b>
                <span>Mã BN</span><span className="mono">{bed.patientCode || '—'}</span>
                <span>Giới · Tuổi</span><span>{genderLabel(bed.gender)} · {bed.age || '—'}t</span>
                <span>BHYT</span><span>{bed.isInsurance ? <span className="chip ok">Có</span> : <span className="chip">Không</span>}</span>
              </div>
            </div>
            <div className="rec-section">
              <h5><TermIcon name="activity" size={11} /> GIƯỜNG · ĐIỀU TRỊ</h5>
              <div className="rec-kv">
                <span>Giường</span><span className="mono">{bed.bedName || bed.bedCode}</span>
                <span>Khoa</span><b>{bed.wardName}</b>
                <span>Chẩn đoán</span><span>{bed.mainDiagnosis || '—'}</span>
                <span>Vào viện</span><span>{fmtDMY(bed.admissionDate)}</span>
                <span>Ngày nằm</span><b>{bed.daysOfStay ?? 0} ngày</b>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ color: 'var(--t-3)', marginBottom: 'var(--space-8)' }}><TermIcon name="grid" size={40} /></div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 'var(--space-4)' }}>Giường trống</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Trạng thái: {bed.statusName || BED_STATUS.find((s) => s.v === String(bed.status))?.l}</div>
          </div>
        ))}
      </DrawerShell>

      {/* Patient (list) drawer */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        size="lg"
        title={detail ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
            <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.medicalRecordCode}</span>
            <span style={{ fontSize: 14 }}>{detail.patientName}</span>
          </span>
        ) : ''}
        sub={detail ? `${detail.departmentName} · ${detail.roomName}${detail.bedName ? ` · ${detail.bedName}` : ''} · ${detail.daysOfStay} ngày` : ''}
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <Btn variant="ghost" onClick={() => openPrintWindow(buildInpatientRecordHtml(detail), { focus: true, print: { delayMs: 500 } })}>
              <TermIcon name="printer" size={12} /> In phiếu
            </Btn>
            <Select
              size="small"
              value={medRecordType}
              onChange={setMedRecordType}
              style={{ width: 190, fontSize: 'var(--fs-xs)' }}
              options={MEDICAL_RECORD_TYPES.map((t) => ({ value: t.value, label: `${t.code} ${t.label.replace('Bệnh án ', '')}` }))}
            />
            <Btn variant="ghost" onClick={() => openPrintWindow(
              buildMedicalRecordHtml(
                {
                  hospitalName: HOSPITAL_NAME,
                  departmentName: detail.departmentName,
                  bedNumber: detail.bedName || '',
                  patientName: detail.patientName,
                  dateOfBirth: detail.dateOfBirth ? fmtDMY(detail.dateOfBirth) : '',
                  age: detail.age || '',
                  gender: genderLabel(detail.gender),
                  patientType: detail.isInsurance ? 'bhyt' : 'fee',
                  insuranceNumber: detail.insuranceNumber || '',
                  insuranceValidDate: detail.insuranceExpiry ? fmtDMY(detail.insuranceExpiry) : '',
                  admissionDate: detail.admissionDate,
                  mainDiagnosis: detail.mainDiagnosis || '',
                  medicalCode: detail.patientCode,
                  doctorName: detail.attendingDoctorName || '',
                },
                MEDICAL_RECORD_TYPES.find((t) => t.value === medRecordType) ?? MEDICAL_RECORD_TYPES[0],
                false,
              ),
              { focus: true, print: { delayMs: 500 } },
            )}>
              <TermIcon name="printer" size={12} /> In bệnh án
            </Btn>
            <Btn variant="ghost" onClick={() => setBirthCertOpen(true)}>
              <TermIcon name="printer" size={12} /> Giấy chứng sinh
            </Btn>
            <Btn variant="primary" onClick={() => { setDetail(null); navigate('/v2/inpatient-dispensing'); }}>
              <TermIcon name="clipboard" size={12} /> Y lệnh
            </Btn>
          </>
        ) : null}
      >
        {detail && (
          <div style={{ padding: 'var(--space-18)' }}>
            {/* #357 patient-safety: khôi phục cờ cảnh báo BN + cảnh báo nghiệp vụ (parity v1 Inpatient) */}
            <PatientFlagBanner patientId={detail.patientId} patientName={detail.patientName} />
            <BusinessAlertPanel patientId={detail.patientId} admissionId={detail.admissionId} module="Inpatient" />
            <div className="rec-section">
              <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
              <div className="rec-kv">
                <span>Họ tên</span><b>{detail.patientName}</b>
                <span>Mã BN</span><span className="mono">{detail.patientCode}</span>
                <span>Giới · Tuổi</span><span>{genderLabel(detail.gender)} · {detail.age || '—'}t</span>
                {detail.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(detail.dateOfBirth)}</span></>)}
              </div>
            </div>
            <div className="rec-section">
              <h5><TermIcon name="activity" size={11} /> ĐIỀU TRỊ</h5>
              <div className="rec-kv">
                <span>Khoa</span><b>{detail.departmentName}</b>
                <span>Phòng / Giường</span><span>{detail.roomName}{detail.bedName ? ` · ${detail.bedName}` : ''}</span>
                <span>BS điều trị</span><span>{detail.attendingDoctorName || 'Chưa phân'}</span>
                <span>Chẩn đoán</span><span>{detail.mainDiagnosis || '—'}</span>
                <span>Vào viện</span><span>{fmtDMY(detail.admissionDate)}</span>
                <span>Ngày nằm</span><b>{detail.daysOfStay} ngày</b>
              </div>
            </div>
            {(detail.hasPendingOrders || detail.hasPendingLabResults || detail.hasUnclaimedMedicine || detail.isDebtWarning || detail.isInsuranceExpiring) && (
              <div className="rec-section">
                <h5><TermIcon name="alert" size={11} /> CẢNH BÁO</h5>
                <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                  {detail.hasPendingOrders && <span className="chip warn">Y lệnh đang chờ</span>}
                  {detail.hasPendingLabResults && <span className="chip warn">Kết quả CLS chưa về</span>}
                  {detail.hasUnclaimedMedicine && <span className="chip warn">Thuốc chưa lấy</span>}
                  {detail.isDebtWarning && <span className="chip crit">Nợ {fmtVND(detail.totalDebt || 0)}</span>}
                  {detail.isInsuranceExpiring && <span className="chip crit">BHYT hết hạn</span>}
                </div>
              </div>
            )}
            <TreatmentMonitorSection patient={detail} onRefresh={loadData} />
            {/* Tab so sinh — hien thi khi admission la san khoa (luon hien thi, BS tu quyet dinh nhap) */}
            <NewbornSection admissionId={detail.admissionId} />
            {/* Phieu theo doi chay than nhan tao (#148) — luon hien thi, BS khoa Than tu quyet dinh nhap */}
            <HemodialysisSection
              admissionId={detail.admissionId}
              header={{
                patientName: detail.patientName,
                patientCode: detail.patientCode,
                departmentName: detail.departmentName,
                roomBed: `${detail.roomName || ''}${detail.bedName ? ' · ' + detail.bedName : ''}`,
                diagnosis: detail.mainDiagnosis,
              }}
            />
            {/* ── Tạm ứng ── */}
            <DepositSection
              admissionId={detail.admissionId}
              onRequest={() => { setDepositAdmissionId(detail.admissionId); setDepositModal(true); }}
            />
          </div>
        )}
      </DrawerShell>

      {/* Yêu cầu tạm ứng modal */}
      <DepositRequestModal
        open={depositModal}
        admissionId={depositAdmissionId}
        onClose={() => setDepositModal(false)}
        onDone={() => { setDepositModal(false); loadData(); }}
      />

      <AdmitModal
        open={admitOpen}
        prefill={admitPrefill}
        onClose={() => setAdmitOpen(false)}
        onDone={() => { setAdmitOpen(false); loadData(); }}
      />

      {/* Chuyển giường — mở từ bed drawer (giường đang có BN) */}
      {bed && (
        <TransferBedModal
          open={transferBedOpen}
          admissionId={bed.currentAdmissionId || ''}
          fromBedName={bed.bedName || bed.bedCode}
          onClose={() => setTransferBedOpen(false)}
          onDone={() => { setTransferBedOpen(false); setBed(null); loadData(); }}
        />
      )}

      {/* Phân giường — mở từ bed drawer (giường trống) */}
      {bed && (
        <AssignBedModal
          open={assignBedOpen}
          bedId={bed.bedId}
          bedName={bed.bedName || bed.bedCode}
          inpatients={inpatients.filter((r) => !r.bedName && r.status !== 2)}
          onClose={() => setAssignBedOpen(false)}
          onDone={() => { setAssignBedOpen(false); setBed(null); loadData(); }}
        />
      )}

      {/* In giấy chứng sinh */}
      {detail && (
        <BirthCertFormModal
          open={birthCertOpen}
          patientName={detail.patientName}
          departmentName={detail.departmentName}
          doctorName={detail.attendingDoctorName || ''}
          onClose={() => setBirthCertOpen(false)}
        />
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   Admit (Nhập viện) modal — port MINIMAL từ v1 (pages/Inpatient.tsx).
   Skip OPD context lookup + patient search async (phase 2 enhance).
   8 field theo AdmitFromOpdDto: medicalRecordId, departmentId,
   roomId, bedId?, admissionType, diagnosisOnAdmission, reasonForAdmission,
   attendingDoctorId. API: admitFromOpd (đã có).
   Pattern raw useState theo BloodReceiveModal.
   ────────────────────────────────────────────────────────── */

type AdmitPrefill = { departmentId?: string; roomId?: string; bedId?: string };

const ADMISSION_TYPES = [
  { value: 1, label: 'Cấp cứu' },
  { value: 2, label: 'Chuyển từ OPD' },
  { value: 3, label: 'Theo lịch' },
  { value: 4, label: 'Khác' },
];

const AdmitModal: React.FC<{
  open: boolean;
  prefill?: AdmitPrefill | null;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, prefill, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [depts, setDepts] = useState<DepartmentCatalogDto[]>([]);
  const [medicalRecordId, setMedicalRecordId] = useState('');
  const [departmentId, setDepartmentId] = useState<string | undefined>(undefined);
  const [roomId, setRoomId] = useState('');
  const [bedId, setBedId] = useState('');
  const [admissionType, setAdmissionType] = useState<number>(2);
  const [diagnosisOnAdmission, setDiagnosisOnAdmission] = useState('');
  const [reasonForAdmission, setReasonForAdmission] = useState('');
  const [attendingDoctorId, setAttendingDoctorId] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingAdmissionDto[]>([]);
  const [pendingId, setPendingId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setMedicalRecordId('');
      setDepartmentId(prefill?.departmentId);
      setRoomId(prefill?.roomId || '');
      setBedId(prefill?.bedId || '');
      setAdmissionType(2);
      setDiagnosisOnAdmission(''); setReasonForAdmission('');
      setAttendingDoctorId('');
      setPendingId(undefined);
      catalogApi.getDepartments(undefined, undefined, true).then((r) => {
        setDepts(r.data || []);
      }).catch(() => setDepts([]));
      getPendingAdmissions().then((r) => setPending(r.data || [])).catch(() => setPending([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!medicalRecordId.trim()) { message.warning('Nhập mã HSBA'); return; }
    if (!departmentId) { message.warning('Chọn khoa nhập viện'); return; }
    if (!roomId.trim()) { message.warning('Nhập mã phòng'); return; }
    if (!attendingDoctorId.trim()) { message.warning('Nhập mã BS điều trị'); return; }
    setBusy(true);
    try {
      await admitFromOpd({
        medicalRecordId: medicalRecordId.trim(),
        departmentId,
        roomId: roomId.trim(),
        bedId: bedId.trim() || undefined,
        admissionType,
        diagnosisOnAdmission: diagnosisOnAdmission.trim() || undefined,
        reasonForAdmission: reasonForAdmission.trim() || undefined,
        attendingDoctorId: attendingDoctorId.trim(),
      });
      message.success('Đã nhập viện thành công');
      onDone();
    } catch {
      message.error('Nhập viện thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Nhập viện"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Nhập viện'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <IpFld label="Chọn BN chờ nhập viện (từ phòng khám)" full>
          <Select
            value={pendingId}
            onChange={(v) => {
              setPendingId(v);
              const p = pending.find((x) => x.examinationId === v);
              if (p) {
                setMedicalRecordId(p.medicalRecordId);
                if (p.departmentId) setDepartmentId(p.departmentId);
                setDiagnosisOnAdmission([p.diagnosisCode, p.diagnosisName].filter(Boolean).join(' - '));
                setReasonForAdmission(p.reason || '');
                setAdmissionType(p.isEmergency ? 1 : 2);
              }
            }}
            allowClear showSearch optionFilterProp="label"
            placeholder={pending.length ? 'Chọn bệnh nhân đã chỉ định nhập viện' : 'Không có BN chờ nhập viện — nhập tay bên dưới'}
            style={{ width: '100%' }}
            options={pending.map((p) => ({
              value: p.examinationId,
              label: `${p.patientName} (${p.patientCode}) · ${p.medicalRecordCode}${p.departmentName ? ' · ' + p.departmentName : ''}${p.isEmergency ? ' · CẤP CỨU' : ''}`,
            }))}
          />
        </IpFld>
        <IpFld label="Mã hồ sơ bệnh án *" full>
          <Input value={medicalRecordId} onChange={(e) => setMedicalRecordId(e.target.value)} placeholder="Mã HSBA hoặc UUID" />
        </IpFld>
        <IpFld label="Khoa nhập viện *" full>
          <Select
            value={departmentId} onChange={setDepartmentId} showSearch optionFilterProp="label"
            placeholder="Chọn khoa" style={{ width: '100%' }}
            options={depts.map((d) => ({ value: d.id!, label: d.name }))}
          />
        </IpFld>
        <IpFld label="Mã phòng *">
          <Input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Mã phòng / UUID" />
        </IpFld>
        <IpFld label="Mã giường">
          <Input value={bedId} onChange={(e) => setBedId(e.target.value)} placeholder="Mã giường (tùy chọn)" />
        </IpFld>
        <IpFld label="Loại nhập viện *" full>
          <Select<number>
            value={admissionType} onChange={setAdmissionType} style={{ width: '100%' }}
            options={ADMISSION_TYPES}
          />
        </IpFld>
        <IpFld label="Chẩn đoán vào viện" full>
          <Input value={diagnosisOnAdmission} onChange={(e) => setDiagnosisOnAdmission(e.target.value)} placeholder="VD: J18.9 - Viêm phổi" />
        </IpFld>
        <IpFld label="Mã BS điều trị *" full>
          <Input value={attendingDoctorId} onChange={(e) => setAttendingDoctorId(e.target.value)} placeholder="Mã BS / UUID" />
        </IpFld>
        <IpFld label="Lý do nhập viện" full>
          <Input.TextArea value={reasonForAdmission} onChange={(e) => setReasonForAdmission(e.target.value)} rows={2} placeholder="Mô tả lý do nhập viện…" />
        </IpFld>
      </div>
    </ModalShell>
  );
};

const IpFld: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>{label}</div>}
    {children}
  </div>
);

/* ──────────────────────────────────────────────────────────
   TransferBedModal — Chuyển giường cho BN đang nằm
   API: transferBed({ admissionId, newBedId, reason? })
   ────────────────────────────────────────────────────────── */
const TransferBedModal: React.FC<{
  open: boolean;
  admissionId: string;
  fromBedName: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, fromBedName, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [newBedId, setNewBedId] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setNewBedId(''); setReason(''); }
  }, [open]);

  const submit = async () => {
    if (!newBedId.trim()) { message.warning('Nhập mã / UUID giường mới'); return; }
    if (!admissionId) { message.warning('Không tìm thấy ID nhập viện'); return; }
    setBusy(true);
    try {
      const dto: TransferBedDto = { admissionId, newBedId: newBedId.trim(), reason: reason.trim() || undefined };
      await transferBed(dto);
      message.success('Chuyển giường thành công');
      onDone();
    } catch {
      message.error('Chuyển giường thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title="Chuyển giường"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Xác nhận chuyển'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <IpFld label="Giường hiện tại">
          <Input value={fromBedName} disabled />
        </IpFld>
        <IpFld label="Giường mới (mã hoặc UUID) *">
          <Input value={newBedId} onChange={(e) => setNewBedId(e.target.value)} placeholder="Nhập mã giường / UUID giường đích" autoFocus />
        </IpFld>
        <IpFld label="Lý do chuyển giường">
          <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="VD: Yêu cầu của gia đình, gần nhà vệ sinh…" />
        </IpFld>
      </div>
    </ModalShell>
  );
};

/* ──────────────────────────────────────────────────────────
   AssignBedModal — Phân giường cho BN đã nhập viện chưa có giường
   API: assignBed({ admissionId, bedId })
   ────────────────────────────────────────────────────────── */
const AssignBedModal: React.FC<{
  open: boolean;
  bedId: string;
  bedName: string;
  inpatients: InpatientListDto[];
  onClose: () => void;
  onDone: () => void;
}> = ({ open, bedId, bedName, inpatients: noBedPatients, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [selectedAdmissionId, setSelectedAdmissionId] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setSelectedAdmissionId(undefined);
  }, [open]);

  const submit = async () => {
    if (!selectedAdmissionId) { message.warning('Chọn bệnh nhân cần phân giường'); return; }
    setBusy(true);
    try {
      const dto: CreateBedAssignmentDto = { admissionId: selectedAdmissionId, bedId };
      await assignBed(dto);
      message.success('Phân giường thành công');
      onDone();
    } catch {
      message.error('Phân giường thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title="Phân giường nhanh"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang lưu…' : 'Xác nhận phân giường'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <IpFld label="Giường được phân">
          <Input value={bedName} disabled />
        </IpFld>
        <IpFld label="Bệnh nhân cần phân giường *">
          <Select
            value={selectedAdmissionId}
            onChange={setSelectedAdmissionId}
            showSearch
            optionFilterProp="label"
            placeholder={noBedPatients.length ? 'Chọn BN đã nhập viện chưa có giường' : 'Không có BN chưa có giường'}
            style={{ width: '100%' }}
            options={noBedPatients.map((p) => ({
              value: p.admissionId,
              label: `${p.patientName} (${p.patientCode}) · ${p.departmentName}`,
            }))}
          />
        </IpFld>
      </div>
    </ModalShell>
  );
};

/* ──────────────────────────────────────────────────────────
   BirthCertFormModal — In giấy chứng sinh (Giấy chứng sinh)
   Sử dụng printBirthCertificate(BirthCertificateData) đã có sẵn.
   ────────────────────────────────────────────────────────── */
const DELIVERY_METHODS = [
  { value: 'normal', label: 'Đẻ thường' },
  { value: 'c-section', label: 'Mổ lấy thai' },
  { value: 'forceps', label: 'Forceps' },
  { value: 'vacuum', label: 'Giác hút' },
];

const BirthCertFormModal: React.FC<{
  open: boolean;
  patientName: string; // mother
  departmentName: string;
  doctorName: string;
  onClose: () => void;
}> = ({ open, patientName, departmentName, doctorName, onClose }) => {
  const [babyFullName, setBabyFullName] = useState('');
  const [babyGender, setBabyGender] = useState<'Nam' | 'Nu'>('Nam');
  const [dateOfBirth, setDateOfBirth] = useState<dayjs.Dayjs | null>(dayjs());
  const [timeOfBirth, setTimeOfBirth] = useState('');
  const [birthWeight, setBirthWeight] = useState<number | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState('normal');
  const [motherFullName, setMotherFullName] = useState(patientName);
  const [fatherFullName, setFatherFullName] = useState('');
  const [motherAddress, setMotherAddress] = useState('');
  const [certNumber, setCertNumber] = useState('');

  useEffect(() => {
    if (open) {
      setBabyFullName(''); setBabyGender('Nam');
      setDateOfBirth(dayjs()); setTimeOfBirth('');
      setBirthWeight(null); setDeliveryMethod('normal');
      setMotherFullName(patientName);
      setFatherFullName(''); setMotherAddress(''); setCertNumber('');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const doPrint = () => {
    const data: BirthCertificateData = {
      certificateNumber: certNumber || undefined,
      babyFullName: babyFullName || undefined,
      babyGender: babyGender,
      dateOfBirth: dateOfBirth ? dateOfBirth.toISOString() : undefined,
      timeOfBirth: timeOfBirth || undefined,
      birthWeight: birthWeight ?? undefined,
      deliveryMethod,
      motherFullName: motherFullName || undefined,
      motherAddress: motherAddress || undefined,
      fatherFullName: fatherFullName || undefined,
      doctorName: doctorName || undefined,
      departmentName: departmentName || undefined,
    };
    printBirthCertificate(data);
    onClose();
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="In giấy chứng sinh"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" onClick={doPrint}>
            <TermIcon name="printer" size={12} /> In giấy chứng sinh
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
        <IpFld label="Số giấy chứng sinh" full>
          <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} placeholder="Số phát hành (tùy chọn)" />
        </IpFld>
        <IpFld label="Họ tên trẻ" full>
          <Input value={babyFullName} onChange={(e) => setBabyFullName(e.target.value)} placeholder="Họ và tên trẻ sơ sinh" />
        </IpFld>
        <IpFld label="Giới tính trẻ">
          <Select<'Nam' | 'Nu'>
            value={babyGender}
            onChange={setBabyGender}
            style={{ width: '100%' }}
            options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nu', label: 'Nữ' }]}
          />
        </IpFld>
        <IpFld label="Hình thức sinh">
          <Select
            value={deliveryMethod}
            onChange={setDeliveryMethod}
            style={{ width: '100%' }}
            options={DELIVERY_METHODS}
          />
        </IpFld>
        <IpFld label="Ngày sinh">
          <DatePicker value={dateOfBirth} onChange={setDateOfBirth} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </IpFld>
        <IpFld label="Giờ sinh">
          <Input value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} placeholder="VD: 08:30" />
        </IpFld>
        <IpFld label="Cân nặng (gram)" full>
          <InputNumber value={birthWeight} onChange={(v) => setBirthWeight(v)} style={{ width: '100%' }} placeholder="VD: 3200" min={500} max={6000} />
        </IpFld>
        <IpFld label="Họ tên mẹ" full>
          <Input value={motherFullName} onChange={(e) => setMotherFullName(e.target.value)} />
        </IpFld>
        <IpFld label="Địa chỉ mẹ" full>
          <Input value={motherAddress} onChange={(e) => setMotherAddress(e.target.value)} placeholder="Địa chỉ thường trú" />
        </IpFld>
        <IpFld label="Họ tên cha" full>
          <Input value={fatherFullName} onChange={(e) => setFatherFullName(e.target.value)} />
        </IpFld>
      </div>
    </ModalShell>
  );
};

/* ──────────────────────────────────────────────────────────
   DepositSection — hiển thị danh sách tạm ứng của đợt điều trị
   Load lazy khi mount. Nút "Yêu cầu tạm ứng" → mở DepositRequestModal.
   ────────────────────────────────────────────────────────── */
const DepositSection: React.FC<{ admissionId: string; onRequest: () => void }> = ({ admissionId, onRequest }) => {
  const [deposits, setDeposits] = useState<DepositRequestDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!admissionId) return;
    setLoading(true);
    getDepositRequests()
      .then((r) => {
        const all = Array.isArray(r) ? r : (Array.isArray((r as { data?: unknown[] }).data) ? (r as { data: DepositRequestDto[] }).data : []);
        setDeposits(all.filter((d: DepositRequestDto) => d.admissionId === admissionId));
      })
      .catch(() => setDeposits([]))
      .finally(() => setLoading(false));
  }, [admissionId]);

  const total = deposits.reduce((s, d) => s + (d.requestedAmount || 0), 0);

  return (
    <div style={{ margin: 'var(--space-16) 0 0', border: '1px solid var(--line)', borderRadius: 'var(--r-2)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-10) var(--space-14)', background: 'var(--d-2)', borderBottom: deposits.length ? '1px solid var(--line)' : undefined }}>
        <span style={{ fontWeight: 700, fontSize: 'var(--fs-sm)' }}>Tạm ứng</span>
        <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
          {total > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', color: 'var(--a-gr)' }}>{fmtVND(total)}</span>}
          <ActBtn ic="plus" title="Yêu cầu tạm ứng" onClick={onRequest} />
        </div>
      </div>
      {loading && <div style={{ padding: 12, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Đang tải…</div>}
      {!loading && deposits.length === 0 && (
        <div style={{ padding: 12, color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>Chưa có tạm ứng</div>
      )}
      {deposits.map((d) => (
        <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-8) var(--space-14)', borderTop: '1px solid var(--line-soft)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)' }}>{fmtVND(d.requestedAmount)}</div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{d.reason || 'Tạm ứng viện phí'} · {fmtDMY(d.requestDate)}</div>
          </div>
          <StatusBadge tone={d.status === 1 ? 'ok' : d.status === 2 ? 'crit' : 'warn'}>
            {d.statusName || (d.status === 0 ? 'Chờ duyệt' : d.status === 1 ? 'Đã thu' : 'Từ chối')}
          </StatusBadge>
        </div>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────
   DepositRequestModal — Tạo yêu cầu tạm ứng
   API: createDepositRequest({ admissionId, requestedAmount, reason? })
   ────────────────────────────────────────────────────────── */
const DepositRequestModal: React.FC<{
  open: boolean;
  admissionId: string;
  onClose: () => void;
  onDone: () => void;
}> = ({ open, admissionId, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setAmount(null); setReason(''); }
  }, [open]);

  const submit = async () => {
    if (!amount || amount <= 0) { message.warning('Nhập số tiền tạm ứng'); return; }
    if (!admissionId) { message.warning('Không tìm thấy đợt điều trị'); return; }
    setBusy(true);
    try {
      const dto: CreateDepositRequestDto = { admissionId, requestedAmount: amount, reason: reason.trim() || undefined };
      await createDepositRequest(dto);
      message.success('Đã gửi yêu cầu tạm ứng');
      onDone();
    } catch {
      message.error('Gửi yêu cầu thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title="Yêu cầu tạm ứng"
      footer={(
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <Btn variant="primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </Btn>
        </>
      )}
    >
      <div style={{ padding: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <IpFld label="Số tiền tạm ứng (VND) *">
          <InputNumber
            value={amount}
            onChange={(v) => setAmount(v)}
            style={{ width: '100%' }}
            placeholder="VD: 2000000"
            min={0}
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => Number((v || '').replace(/,/g, ''))}
          />
        </IpFld>
        <IpFld label="Lý do / ghi chú">
          <Input.TextArea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="VD: Tạm ứng chi phí phẫu thuật, thuốc đặc trị…"
          />
        </IpFld>
      </div>
    </ModalShell>
  );
};

export default InpatientV2;
