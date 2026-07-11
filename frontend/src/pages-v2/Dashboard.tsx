import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { App as AntdApp } from 'antd';
import { statisticsApi } from '../modules/system/api/system';
import type { HospitalDashboardDto, DepartmentStatisticsDto } from '../modules/system/api/system';
import * as receptionApi from '../modules/reception/api/reception';
import type { AdmissionDto } from '../modules/reception/api/reception';
import * as surgeryApi from '../modules/surgery/api/surgery';
import type { SurgeryScheduleDto } from '../modules/surgery/api/surgery';
import * as inpatientApi from '../modules/inpatient/api/inpatient';
import type { WardLayoutDto, BedLayoutDto } from '../modules/inpatient/api/inpatient';
import * as pharmacyApi from '../modules/pharmacy/api/pharmacy';
import type { PendingPrescription } from '../modules/pharmacy/api/pharmacy';
import * as warehouseApi from '../modules/pharmacy/api/warehouse';
import type { ExpiryWarningDto } from '../modules/pharmacy/api/warehouse';
import * as alertsApi from '../modules/patient/api/businessAlerts';
import type { BusinessAlertDto } from '../modules/patient/api/businessAlerts';
import * as hrApi from '../modules/hr/api/medicalHR';
import type { MedicalHRDashboardDto } from '../modules/hr/api/medicalHR';
import '../styles/Dashboard.css';

import type { Kpi } from './dashboard/_shared';
import { fmtDelta } from './dashboard/_shared';
import { KpiCard } from './dashboard/KpiCard';
import { ErSnapshot } from './dashboard/ErSnapshot';
import { OpdFlow } from './dashboard/OpdFlow';
import { BedMapMini } from './dashboard/BedMapMini';
import { OrBoard } from './dashboard/OrBoard';
import { PharmacyAlerts } from './dashboard/PharmacyAlerts';
import { ShiftBoard } from './dashboard/ShiftBoard';
import { AlertsPanel } from './dashboard/AlertsPanel';
import { BhytCard } from './dashboard/BhytCard';
import { ErPatientDrawer } from './dashboard/ErPatientDrawer';
import { BedDetailModal } from './dashboard/BedDetailModal';
import { OrCaseModal } from './dashboard/OrCaseModal';
import { StockReorderModal } from './dashboard/StockReorderModal';
import { AlertDetailModal } from './dashboard/AlertDetailModal';
import { AllAlertsDrawer } from './dashboard/AllAlertsDrawer';

/* ==========================================================================
   Main component — all data from real APIs.
   Sub-components (KPI/section cards + popups) live in ./dashboard/*
   (#205 FE-2 god-component split — behavior-preserving pure move).
   ========================================================================== */

const DashboardV2: React.FC = () => {
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  const [loading, setLoading]       = useState(true);
  const [history, setHistory]       = useState<(HospitalDashboardDto | null)[]>([]);
  const [deptStats, setDeptStats]   = useState<DepartmentStatisticsDto[]>([]);
  const [admissions, setAdmissions] = useState<AdmissionDto[]>([]);
  const [surgeries, setSurgeries]   = useState<SurgeryScheduleDto[]>([]);
  const [wards, setWards]           = useState<WardLayoutDto[]>([]);
  const [expiry, setExpiry]         = useState<ExpiryWarningDto[]>([]);
  const [pendingRx, setPendingRx]   = useState<PendingPrescription[]>([]);
  const [alerts, setAlerts]         = useState<BusinessAlertDto[]>([]);
  const [hr, setHr]                 = useState<MedicalHRDashboardDto | null>(null);

  // Popup state — ER row drawer, bed modal, OR case modal, stock PO modal,
  // alert detail modal, all-alerts drawer.
  const [erPt, setErPt]             = useState<AdmissionDto | null>(null);
  const [bedIt, setBedIt]           = useState<BedLayoutDto | null>(null);
  const [orIt, setOrIt]             = useState<{ surgery: NonNullable<SurgeryScheduleDto['surgeries']>[number]; orName: string } | null>(null);
  const [stockIt, setStockIt]       = useState<ExpiryWarningDto | null>(null);
  const [alertIt, setAlertIt]       = useState<BusinessAlertDto | null>(null);
  const [showAllAlerts, setShowAllAlerts] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        // 7-day history for sparklines: today + 6 days back (parallel)
        const days = Array.from({ length: 7 }, (_, i) =>
          dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD'),
        );
        const historyPromises = days.map((d) =>
          statisticsApi.getHospitalDashboard(d).then((r) => r.data).catch(() => null),
        );

        const [
          historyRes,
          deptRes,
          admRes,
          surgRes,
          expiryRes,
          rxRes,
          alertsRes,
          hrRes,
        ] = await Promise.all([
          Promise.all(historyPromises),
          statisticsApi.getDepartmentStatistics(today, today).then((r) => r.data).catch(() => [] as DepartmentStatisticsDto[]),
          receptionApi.getTodayAdmissions(undefined, today).catch(() => ({ data: [] as AdmissionDto[] })),
          surgeryApi.getSurgerySchedule(today).catch(() => ({ data: [] as SurgeryScheduleDto[] })),
          warehouseApi.getExpiryWarnings(undefined, 3).catch(() => ({ data: [] as ExpiryWarningDto[] })),
          pharmacyApi.getPendingPrescriptions().catch(() => ({ data: [] as PendingPrescription[] })),
          alertsApi.getActiveAlerts({ pageIndex: 0, pageSize: 5, status: 0 }).catch(() => ({ data: { items: [] as BusinessAlertDto[], totalCount: 0, pageIndex: 0, pageSize: 0 } })),
          hrApi.getDashboard(today).catch(() => ({ data: null as MedicalHRDashboardDto | null })),
        ]);

        if (cancelled) return;

        const effectiveHistory = (historyRes.filter(Boolean) as HospitalDashboardDto[]);
        setHistory(effectiveHistory);

        const depts = Array.isArray(deptRes) ? deptRes : [];
        setDeptStats(depts);

        setAdmissions(Array.isArray(admRes.data) ? admRes.data : []);
        setSurgeries(Array.isArray(surgRes.data) ? surgRes.data : []);
        setExpiry(Array.isArray(expiryRes.data) ? expiryRes.data : []);
        setPendingRx(Array.isArray(rxRes.data) ? rxRes.data : []);
        setAlerts(Array.isArray(alertsRes.data?.items) ? alertsRes.data.items : []);

        const hrData = hrRes.data as MedicalHRDashboardDto | null;
        setHr(hrData && typeof hrData.totalStaff === 'number' ? hrData : null);

        // Bed map: fetch ward layout for each department that has inpatients
        const inpatientDepts = depts.filter((d) => (d.inpatientCount ?? 0) > 0).slice(0, 8);
        if (inpatientDepts.length) {
          const wardPromises = inpatientDepts
            .map((d) =>
              inpatientApi.getWardLayout(d.departmentId).then((r) => r.data).catch(() => null),
            );
          const wardResults = await Promise.all(wardPromises);
          if (!cancelled) {
            setWards(wardResults.filter((w): w is WardLayoutDto => w !== null));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [today]);

  /* --------- derived: KPIs + sparklines from 7-day history --------- */
  const latest = history[history.length - 1] ?? null;
  const prev = history.length >= 2 ? history[history.length - 2] : null;

  // Real /statistics/dashboard field names, with legacy *Count aliases as fallback.
  const gOut  = (d: HospitalDashboardDto | null) => Number(d?.todayOutpatients ?? d?.outpatientCount ?? 0);
  const gInp  = (d: HospitalDashboardDto | null) => Number(d?.currentInpatients ?? d?.inpatientCount ?? 0);
  const gSurg = (d: HospitalDashboardDto | null) => Number(d?.todaySurgeries ?? d?.surgeryCount ?? 0);
  const gEmer = (d: HospitalDashboardDto | null) => Number(d?.todayEmergencies ?? d?.emergencyCount ?? 0);
  const gRev  = (d: HospitalDashboardDto | null) => Number(d?.todayRevenue ?? d?.totalRevenue ?? 0);
  const gOcc  = (d: HospitalDashboardDto | null) => {
    const inp = gInp(d);
    const avail = Number(d?.availableBeds ?? 0);
    return inp + avail > 0 ? (inp / (inp + avail)) * 100 : 0;
  };

  const sparkOf = (get: (d: HospitalDashboardDto | null) => number): number[] => {
    const arr = history.map((d) => get(d));
    return arr.length ? arr : [0, 0, 0, 0, 0, 0, 0];
  };

  const deltaOf = (get: (d: HospitalDashboardDto | null) => number): number | undefined =>
    latest && prev ? get(latest) - get(prev) : undefined;

  const revPct: number | undefined =
    latest && prev && gRev(prev) > 0 ? Math.round(((gRev(latest) - gRev(prev)) / gRev(prev)) * 100) : undefined;

  const kpis: Kpi[] = useMemo(() => ([
    { k: 'Khám ngoại trú', v: String(gOut(latest)),  delta: fmtDelta(deltaOf(gOut)),                  spark: sparkOf(gOut) },
    { k: 'Đang nội trú',   v: String(gInp(latest)),  delta: fmtDelta(deltaOf(gInp)),                  spark: sparkOf(gInp) },
    { k: 'Phẫu thuật',     v: String(gSurg(latest)), delta: fmtDelta(deltaOf(gSurg)),                 spark: sparkOf(gSurg) },
    { k: 'Cấp cứu 24h',    v: String(gEmer(latest)), delta: fmtDelta(deltaOf(gEmer)), negSpark: true, spark: sparkOf(gEmer) },
    { k: 'Tỷ lệ giường',   v: `${Math.round(gOcc(latest))}%`, delta: '—',                             spark: sparkOf(gOcc) },
    { k: 'Doanh thu',      v: (gRev(latest) ? Math.round(gRev(latest) / 1_000_000) + 'M' : '0'), delta: fmtDelta(revPct, '%'), spark: sparkOf(gRev) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ]), [latest, prev, history]);

  /* --------- OPD by department from department-statistics --------- */
  const opdByDept = useMemo(() =>
    deptStats
      .map((d) => ({ departmentId: d.departmentId, departmentName: d.departmentName, count: d.outpatientCount ?? 0 }))
      .filter((d) => d.count > 0)
      .sort((a, b) => b.count - a.count),
    [deptStats]);

  /* --------- ER rows: real admissions filtered by isEmergency --------- */
  const erRows = useMemo(() =>
    admissions
      .filter((a) => a.isEmergency || a.priority >= 2)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, 6),
    [admissions]);

  /* --------- OPD flow status counts from real admissions --------- */
  const opdFlow = useMemo(() => {
    const s = (v: number) => admissions.filter((a) => a.status === v).length;
    return { waiting: s(1), inprog: s(2), done: s(3), skipped: s(4) };
  }, [admissions]);

  /* --------- All beds flattened across loaded wards --------- */
  const allBeds = useMemo<BedLayoutDto[]>(
    () => wards.flatMap((w) => w.rooms?.flatMap((r) => r.beds ?? []) ?? []),
    [wards],
  );

  const bedTotals = useMemo(() => {
    const total = allBeds.length;
    const occ = allBeds.filter((b) => b.status === 2).length;
    const free = allBeds.filter((b) => b.status === 1).length;
    const maint = allBeds.filter((b) => b.status === 3).length;
    return { total, occ, free, maint };
  }, [allBeds]);

  return (
    <div className="dash-root">
      {/* ============== KPI STRIP ============== */}
      <div className="dash-top">
        {kpis.map((k, i) => <KpiCard key={i} k={k} />)}
      </div>

      {/* ============== MAIN 3-COL GRID ============== */}
      <div className="dash-grid">
        {/* ---------- COL 1 ---------- */}
        <div className="dash-col">
          <ErSnapshot
            rows={erRows}
            total={admissions.filter((a) => a.isEmergency).length}
            onRowClick={setErPt}
          />
          <OpdFlow
            flow={opdFlow}
            byDept={opdByDept}
          />
        </div>

        {/* ---------- COL 2 ---------- */}
        <div className="dash-col">
          <BedMapMini beds={allBeds} totals={bedTotals} onBedClick={setBedIt} />
          <OrBoard schedule={surgeries} onSlotClick={(s, orName) => setOrIt({ surgery: s, orName })} />
          <PharmacyAlerts
            items={expiry.slice(0, 3)}
            pendingCount={pendingRx.filter((r) => r.status === 'pending').length}
            onStockClick={setStockIt}
          />
        </div>

        {/* ---------- COL 3 ---------- */}
        <div className="dash-col">
          <ShiftBoard hr={hr} />
          <AlertsPanel
            alerts={alerts}
            onAlertClick={setAlertIt}
            onShowAll={() => setShowAllAlerts(true)}
          />
          <BhytCard revenue={gRev(latest)} revenueChange={revPct ?? 0} />
        </div>
      </div>

      {loading && admissions.length === 0 && history.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 'var(--fs-sm)', color: 'var(--t-2)', marginTop: 'var(--space-14)' }}>
          Đang tải dữ liệu ca trực…
        </div>
      )}

      {/* ============== POPUPS ============== */}
      <ErPatientDrawer
        row={erPt}
        onClose={() => setErPt(null)}
        onAddOrder={() => message.success('Đã gửi y lệnh CT ngực STAT')}
        onTransferIcu={() => {
          message.success(`Đã chuyển ${erPt?.patientName ?? 'BN'} → HS-1`);
          setErPt(null);
        }}
      />
      <BedDetailModal
        bed={bedIt}
        onClose={() => setBedIt(null)}
        onReserve={() => {
          // "Đặt giường" cần thông tin BN/phòng ban — không thể thực hiện từ dashboard
          message.warning('Vui lòng đặt giường từ màn hình Nội trú');
          setBedIt(null);
        }}
        onOpenRecord={() => {
          navigate('/v2/ipd');
          setBedIt(null);
        }}
      />
      <OrCaseModal
        data={orIt}
        onClose={() => setOrIt(null)}
        onPrint={() => message.info('Đã gửi phiếu mổ tới máy in')}
        onMarkDone={async () => {
          if (!orIt) return;
          try {
            await surgeryApi.completeSurgery({
              surgeryId: orIt.surgery.surgeryId,
              endTime: dayjs().toISOString(),
            });
            message.success(`Đã hoàn tất ca ${orIt.surgery.surgeryServiceName ?? ''}`);
          } catch {
            message.error('Đánh dấu hoàn tất thất bại');
          } finally {
            setOrIt(null);
          }
        }}
      />
      <StockReorderModal
        item={stockIt}
        onClose={() => setStockIt(null)}
        onCreatePO={(_qty) => {
          // Tạo PO cần nghiệp vụ Mua sắm — chuyển sang trang Mua sắm
          message.info('Vui lòng tạo PO từ trang Mua sắm');
          setStockIt(null);
          navigate('/v2/procurement');
        }}
      />
      <AlertDetailModal
        alert={alertIt}
        onClose={() => setAlertIt(null)}
        onAck={() => {
          message.success('Đã xác nhận cảnh báo');
          setAlertIt(null);
        }}
      />
      <AllAlertsDrawer
        open={showAllAlerts}
        alerts={alerts}
        onClose={() => setShowAllAlerts(false)}
        onAlertClick={(a) => setAlertIt(a)}
        onAckAll={() => {
          message.success('Đã xác nhận tất cả cảnh báo');
          setShowAllAlerts(false);
        }}
      />
    </div>
  );
};

export default DashboardV2;
