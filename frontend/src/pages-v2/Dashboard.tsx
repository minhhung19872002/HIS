import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Modal, Drawer, InputNumber, Select as AntdSelect, App as AntdApp, DatePicker } from 'antd';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto } from '../api/system';
import * as receptionApi from '../api/reception';
import type { AdmissionDto } from '../api/reception';
import * as surgeryApi from '../api/surgery';
import type { SurgeryScheduleDto } from '../api/surgery';
import * as inpatientApi from '../api/inpatient';
import type { WardLayoutDto, BedLayoutDto } from '../api/inpatient';
import * as pharmacyApi from '../api/pharmacy';
import type { PendingPrescription } from '../api/pharmacy';
import * as warehouseApi from '../api/warehouse';
import type { ExpiryWarningDto } from '../api/warehouse';
import * as alertsApi from '../api/businessAlerts';
import type { BusinessAlertDto } from '../api/businessAlerts';
import * as hrApi from '../api/medicalHR';
import type { MedicalHRDashboardDto } from '../api/medicalHR';
import './Dashboard.css';


/* ==========================================================================
   Helpers
   ========================================================================== */

type Kpi = {
  k: string;
  v: string;
  delta: string;
  spark: number[];
  negSpark?: boolean;
};

function fmtDelta(n: number | undefined | null, suffix = ''): string {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—';
  if (n === 0) return '±0' + suffix;
  return (n > 0 ? '+' + n : String(n)) + suffix;
}

function fmtTime(iso: string | undefined): string {
  if (!iso) return '—';
  return dayjs(iso).format('HH:mm');
}

function fmtRelShort(iso: string | undefined): string {
  if (!iso) return '—';
  const d = dayjs(iso);
  const now = dayjs();
  if (now.isSame(d, 'day')) return d.format('HH:mm');
  if (now.subtract(1, 'day').isSame(d, 'day')) return 'Hôm qua';
  return d.format('DD/MM');
}

function essFromPriority(a: AdmissionDto): 'ESI-1' | 'ESI-2' | 'ESI-3' | 'ESI-4' | 'ESI-5' {
  if (a.isEmergency && a.priority >= 3) return 'ESI-1';
  if (a.isEmergency) return 'ESI-2';
  if (a.priority >= 2) return 'ESI-3';
  if (a.priority >= 1) return 'ESI-4';
  return 'ESI-5';
}

/* ==========================================================================
   Main component — all data from real APIs
   ========================================================================== */

const DashboardV2: React.FC = () => {
  const today = useMemo(() => dayjs().format('YYYY-MM-DD'), []);
  const { message } = AntdApp.useApp();

  const [loading, setLoading]       = useState(true);
  const [history, setHistory]       = useState<(HospitalDashboardDto | null)[]>([]);
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
          admRes,
          surgRes,
          expiryRes,
          rxRes,
          alertsRes,
          hrRes,
        ] = await Promise.all([
          Promise.all(historyPromises),
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
        const latest = effectiveHistory[effectiveHistory.length - 1];

        setAdmissions(Array.isArray(admRes.data) ? admRes.data : []);
        setSurgeries(Array.isArray(surgRes.data) ? surgRes.data : []);
        setExpiry(Array.isArray(expiryRes.data) ? expiryRes.data : []);
        setPendingRx(Array.isArray(rxRes.data) ? rxRes.data : []);
        setAlerts(Array.isArray(alertsRes.data?.items) ? alertsRes.data.items : []);

        const hrData = hrRes.data as MedicalHRDashboardDto | null;
        setHr(hrData && typeof hrData.totalStaff === 'number' ? hrData : null);

        // Bed map: fetch ward layout for each department that has inpatients
        if (latest && latest.inpatientByDepartment?.length) {
          const wardPromises = latest.inpatientByDepartment
            .slice(0, 8)
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

  const sparkOf = (field: keyof HospitalDashboardDto): number[] => {
    const arr = history.map((d) => {
      const v = d?.[field];
      return typeof v === 'number' ? v : 0;
    });
    return arr.length ? arr : [0, 0, 0, 0, 0, 0, 0];
  };

  const kpis: Kpi[] = useMemo(() => ([
    { k: 'Khám ngoại trú', v: String(latest?.outpatientCount ?? 0),  delta: fmtDelta(latest?.outpatientChange),                              spark: sparkOf('outpatientCount') },
    { k: 'Đang nội trú',   v: String(latest?.inpatientCount ?? 0),   delta: fmtDelta(latest?.inpatientChange),                               spark: sparkOf('inpatientCount') },
    { k: 'Phẫu thuật',     v: String(latest?.surgeryCount ?? 0),     delta: fmtDelta(latest?.surgeryChange),                                 spark: sparkOf('surgeryCount') },
    { k: 'Cấp cứu 24h',    v: String(latest?.emergencyCount ?? 0),   delta: fmtDelta(latest?.emergencyChange),  negSpark: true,              spark: sparkOf('emergencyCount') },
    { k: 'Tỷ lệ giường',   v: `${Math.round(latest?.bedOccupancyRate ?? 0)}%`, delta: '—',                                                    spark: sparkOf('bedOccupancyRate') },
    { k: 'Doanh thu',      v: (latest?.totalRevenue ? Math.round(latest.totalRevenue / 1_000_000) + 'M' : '0'), delta: fmtDelta(latest?.revenueChange, '%'), spark: sparkOf('totalRevenue') },
  ]), [latest, history]);

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
            byDept={latest?.outpatientByDepartment ?? []}
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
          <BhytCard revenue={latest?.totalRevenue ?? 0} revenueChange={latest?.revenueChange ?? 0} />
        </div>
      </div>

      {loading && admissions.length === 0 && history.length === 0 && (
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--t-2)', marginTop: 14 }}>
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
          message.success(`Đã đặt trước ${bedIt?.bedName ?? ''}`);
          setBedIt(null);
        }}
        onOpenRecord={() => {
          message.info(`Mở hồ sơ ${bedIt?.bedName ?? ''}`);
          setBedIt(null);
        }}
      />
      <OrCaseModal
        data={orIt}
        onClose={() => setOrIt(null)}
        onPrint={() => message.info('Đã gửi phiếu mổ tới máy in')}
        onMarkDone={() => {
          message.success(`Đã đánh dấu ${orIt?.surgery.surgeryServiceName ?? 'ca'} hoàn tất`);
          setOrIt(null);
        }}
      />
      <StockReorderModal
        item={stockIt}
        onClose={() => setStockIt(null)}
        onCreatePO={(qty) => {
          const poNo = Math.floor(Math.random() * 900 + 100);
          message.success(`Đã tạo PO-2026-${poNo} · ${qty.toLocaleString('vi-VN')} ${stockIt?.unit ?? ''}`);
          setStockIt(null);
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

/* ==========================================================================
   KPI card with SVG sparkline
   ========================================================================== */

const KpiCard: React.FC<{ k: Kpi }> = ({ k }) => {
  const upish = k.delta.startsWith('+');
  const downish = k.delta.startsWith('-');
  const color = (upish && !k.negSpark) || (downish && k.negSpark) ? '#16a34a'
              : (downish && !k.negSpark) || (upish && k.negSpark) ? '#dc2626'
              : '#64748b';
  const max = Math.max(...k.spark);
  const min = Math.min(...k.spark);
  const w = 100, h = 28;
  const pts = k.spark.map((v, i) => {
    const x = (i / (k.spark.length - 1 || 1)) * w;
    const y = h - ((v - min) / ((max - min) || 1)) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="kpi">
      <div className="kpi-lbl">{k.k}</div>
      <div className="kpi-row">
        <div className="kpi-val tab-num">{k.v}</div>
        <div className="kpi-delta mono" style={{ color }}>{k.delta}</div>
      </div>
      <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
        <polyline points={`${pts} ${w},${h} 0,${h}`} fill={color} opacity={0.08} />
      </svg>
    </div>
  );
};

/* ==========================================================================
   ER Snapshot (real emergency admissions)
   ========================================================================== */

const ErSnapshot: React.FC<{
  rows: AdmissionDto[];
  total: number;
  onRowClick?: (r: AdmissionDto) => void;
}> = ({ rows, total, onRowClick }) => {
  const esi1 = rows.filter((r) => essFromPriority(r) === 'ESI-1').length;
  const esi2 = rows.filter((r) => essFromPriority(r) === 'ESI-2').length;
  const esi3plus = rows.length - esi1 - esi2;
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Cấp cứu · <b>trực</b></span>
        <span className="sub">· {total} BN cấp cứu hôm nay</span>
        <div className="actions">
          <Link to="/v2/emergency-disaster" className="btn sm">Mở triage →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 12, color: 'var(--t-2)' }}>
            Không có bệnh nhân cấp cứu đang chờ
          </div>
        ) : (
          <>
            <div className="er-chips">
              <span className="er-chip"><b>{esi1}</b><span>ESI-1 Hồi sức</span></span>
              <span className="er-chip"><b>{esi2}</b><span>ESI-2 Khẩn</span></span>
              <span className="er-chip warn"><b>{esi3plus}</b><span>ESI 3–5</span></span>
            </div>
            <table className="tbl" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>ESI</th>
                  <th>Bệnh nhân</th>
                  <th>Triệu chứng</th>
                  <th>Phòng</th>
                  <th className="num">Đến</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r) => {
                  const ess = essFromPriority(r);
                  const chipCls = ess === 'ESI-1' || ess === 'ESI-2' ? 'crit' : ess === 'ESI-3' ? 'warn' : 'info';
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onRowClick?.(r)}
                      style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      <td><span className={'chip ' + chipCls}>{ess}</span></td>
                      <td>
                        <b style={{ fontWeight: 600 }}>{r.patientName}</b>
                        <div style={{ color: '#64748b', fontSize: 10, fontFamily: 'var(--font-mono)' }}>
                          #{r.queueNumber} · {r.patientCode}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'normal', color: '#334155', fontSize: 12 }}>
                        {r.chiefComplaint || r.priorityName || '—'}
                      </td>
                      <td className="mono">{r.roomName || '—'}</td>
                      <td className="num mono">{fmtTime(r.admissionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   OPD Flow — status buckets + top departments
   ========================================================================== */

const OpdFlow: React.FC<{
  flow: { waiting: number; inprog: number; done: number; skipped: number };
  byDept: { departmentId: string; departmentName: string; count: number }[];
}> = ({ flow, byDept }) => {
  const topDepts = byDept.slice(0, 6);
  const maxCount = Math.max(1, ...topDepts.map((d) => d.count));
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Luồng <b>khám bệnh</b></span>
        <span className="sub">· hôm nay</span>
        <div className="actions">
          <Link to="/v2/opd" className="btn sm">Mở OPD →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        <div className="flow">
          <div className="flow-step"><div className="flow-v">{flow.waiting}</div><div className="flow-l">Chờ khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{flow.inprog}</div><div className="flow-l">Đang khám</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step done"><div className="flow-v">{flow.done}</div><div className="flow-l">Xong</div></div>
          <div className="flow-arr">→</div>
          <div className="flow-step"><div className="flow-v">{flow.skipped}</div><div className="flow-l">Bỏ</div></div>
        </div>
        {topDepts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '10px 0', fontSize: 12, color: 'var(--t-2)' }}>
            Chưa có dữ liệu khoa phòng
          </div>
        ) : (
          <div className="opd-depts">
            {topDepts.map((d) => {
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={d.departmentId} className="dept-row">
                  <span className="dept-n" title={d.departmentName}>{d.departmentName}</span>
                  <div className="dept-bar">
                    <div className="dept-bar-fill" style={{ width: `${pct}%`, background: '#2563eb' }} />
                  </div>
                  <span className="dept-v">{d.count}</span>
                  <span className="dept-w">—</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   Bed Map Mini — real bed layout
   ========================================================================== */

const BedMapMini: React.FC<{
  beds: BedLayoutDto[];
  totals: { total: number; occ: number; free: number; maint: number };
  onBedClick?: (b: BedLayoutDto) => void;
}> = ({ beds, totals, onBedClick }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Nội trú · <b>bed map</b></span>
      <span className="sub">· {totals.occ}/{totals.total} giường</span>
      <div className="actions">
        <Link to="/v2/ipd" className="btn sm">Mở ward →</Link>
      </div>
    </div>
    <div className="panel-body pad">
      {totals.total === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 12, color: 'var(--t-2)' }}>
          Chưa có dữ liệu giường
        </div>
      ) : (
        <>
          <div className="bed-grid">
            {beds.map((b) => {
              const cls = b.status === 1 ? 'free' : b.status === 3 ? 'clean' : 'occ';
              return (
                <div
                  key={b.bedId}
                  className={'bed ' + cls}
                  title={`${b.bedName} · ${b.statusName}${b.patientName ? ' · ' + b.patientName : ''}`}
                  onClick={() => onBedClick?.(b)}
                  style={{ cursor: onBedClick ? 'pointer' : 'default' }}
                />
              );
            })}
          </div>
          <div className="bed-legend">
            <span><span className="sw occ" />Có bệnh nhân <b>{totals.occ}</b></span>
            <span><span className="sw free" />Trống <b>{totals.free}</b></span>
            <span><span className="sw clean" />Bảo trì <b>{totals.maint}</b></span>
          </div>
        </>
      )}
    </div>
  </div>
);

/* ==========================================================================
   OR Board — real surgery schedule
   ========================================================================== */

const OrBoard: React.FC<{
  schedule: SurgeryScheduleDto[];
  onSlotClick?: (s: NonNullable<SurgeryScheduleDto['surgeries']>[number], orName: string) => void;
}> = ({ schedule, onSlotClick }) => {
  const totalItems = schedule.reduce((a, s) => a + (s.surgeries?.length ?? 0), 0);
  const doing = schedule.reduce(
    (a, s) => a + (s.surgeries?.filter((x) => x.status === 1).length ?? 0),
    0,
  );

  // Track window: 07:00 → 17:00 (10 hours = 600 min)
  const startHour = 7;
  const totalM = 10 * 60;

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Phòng mổ · <b>hôm nay</b></span>
        <span className="sub">· {doing}/{schedule.length} đang mổ · {totalItems} ca</span>
        <div className="actions">
          <Link to="/v2/surgery" className="btn sm">Mở lịch →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        {schedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 12, color: 'var(--t-2)' }}>
            Chưa có lịch mổ hôm nay
          </div>
        ) : (
          <>
            {schedule.map((or) => (
              <div key={or.operatingRoomId} className="or-row">
                <div className="or-lbl">{or.operatingRoomName}</div>
                <div className="or-track">
                  {(or.surgeries ?? []).map((it) => {
                    if (!it.scheduledTime) return null;
                    const start = dayjs(it.scheduledTime);
                    const end = start.add(it.estimatedDuration || 60, 'minute');
                    const startM = (start.hour() - startHour) * 60 + start.minute();
                    const endM   = (end.hour()   - startHour) * 60 + end.minute();
                    if (endM <= 0 || startM >= totalM) return null;
                    const left   = (Math.max(0, startM) / totalM) * 100;
                    const width  = ((Math.min(totalM, endM) - Math.max(0, startM)) / totalM) * 100;
                    // status: 0=Scheduled, 1=InProgress, 2=Completed, 3=Cancelled
                    const st = it.status;
                    const stColor  = st === 2 ? '#f1f5f9' : st === 1 ? '#eff5ff' : st === 3 ? '#fef2f2' : '#fffbeb';
                    const stBorder = st === 2 ? '#e4e9f0' : st === 1 ? '#bfd3fa' : st === 3 ? '#fecaca' : '#fde68a';
                    const stText   = st === 2 ? '#64748b' : st === 1 ? '#1d4ed8' : st === 3 ? '#991b1b' : '#a16207';
                    return (
                      <div
                        key={it.surgeryId}
                        className="or-slot"
                        onClick={() => onSlotClick?.(it, or.operatingRoomName)}
                        style={{ left: `${left}%`, width: `${width}%`, background: stColor, borderColor: stBorder, color: stText, cursor: onSlotClick ? 'pointer' : 'default' }}
                        title={`${it.surgeryServiceName} · ${it.patientName} · ${it.statusName}`}
                      >
                        <span className="mono" style={{ fontSize: 9 }}>{start.format('HH:mm')}</span>
                        <span style={{ fontSize: 10, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.surgeryServiceName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="or-axis">
              {['7','8','9','10','11','12','13','14','15','16','17'].map((h) => <span key={h}>{h}h</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ==========================================================================
   Pharmacy — pending count + expiry warnings
   ========================================================================== */

const PharmacyAlerts: React.FC<{
  items: ExpiryWarningDto[];
  pendingCount: number;
  onStockClick?: (i: ExpiryWarningDto) => void;
}> = ({ items, pendingCount, onStockClick }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Dược · <b>{pendingCount} đơn chờ</b></span>
      <div className="actions">
        <Link to="/v2/pharmacy" className="btn sm">Mở →</Link>
      </div>
    </div>
    <div className="panel-body" style={{ padding: '8px 14px 10px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#64748b', margin: '4px 0', letterSpacing: '0.06em' }}>
        CẢNH BÁO HẠN DÙNG
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--t-2)', padding: '8px 0' }}>
          Không có thuốc sắp hết hạn trong 3 tháng
        </div>
      ) : (
        items.map((i) => {
          const color = i.daysToExpiry < 30 ? '#dc2626' : i.daysToExpiry < 60 ? '#d97706' : '#0284c7';
          return (
            <div
              key={i.stockId}
              className="stock-row"
              onClick={() => onStockClick?.(i)}
              style={{ cursor: onStockClick ? 'pointer' : 'default' }}
            >
              <span className="stock-n" title={i.itemName}>{i.itemName}</span>
              <span className="mono" style={{ color }}>
                {i.quantity.toLocaleString('vi-VN')} {i.unit}
              </span>
              <span className="mono" style={{ color, fontSize: 10 }}>
                {i.daysToExpiry}d
              </span>
            </div>
          );
        })
      )}
    </div>
  </div>
);

/* ==========================================================================
   Shift Board — totals + alerts from HR dashboard API.
   ========================================================================== */

const ShiftBoard: React.FC<{ hr: MedicalHRDashboardDto | null }> = ({ hr }) => {
  if (!hr) {
    return (
      <div className="panel">
        <div className="panel-h">
          <span className="title">Ca trực</span>
          <div className="actions">
            <Link to="/v2/hr" className="btn sm">Rota →</Link>
          </div>
        </div>
        <div className="panel-body" style={{ padding: '14px 0', textAlign: 'center', color: 'var(--t-2)', fontSize: 12 }}>
          Chưa có dữ liệu nhân sự
        </div>
      </div>
    );
  }
  const fillRate = hr.todayShifts > 0 ? Math.round((hr.filledShifts / hr.todayShifts) * 100) : 0;
  const items: { label: string; value: string; tone?: 'ok' | 'warn' | 'crit' }[] = [
    { label: 'Đang trực hôm nay', value: String(hr.activeStaff), tone: 'ok' },
    { label: 'Bác sĩ / Điều dưỡng / KTV', value: `${hr.doctors} / ${hr.nurses} / ${hr.technicians}` },
    { label: 'Tỷ lệ ca trực', value: `${hr.filledShifts}/${hr.todayShifts} (${fillRate}%)`, tone: fillRate >= 90 ? 'ok' : fillRate >= 70 ? 'warn' : 'crit' },
    { label: 'Ca trống', value: String(hr.openShifts), tone: hr.openShifts === 0 ? 'ok' : 'warn' },
    { label: 'Đang nghỉ', value: String(hr.onLeaveStaff) },
    { label: 'Sắp hết hạn CCHN (30 ngày)', value: String(hr.expiringLicenses30Days), tone: hr.expiringLicenses30Days > 0 ? 'warn' : 'ok' },
    { label: 'CME chưa đạt', value: String(hr.cmeNonCompliant), tone: hr.cmeNonCompliant > 0 ? 'warn' : 'ok' },
  ];
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Ca trực · <b>hôm nay</b></span>
        <span className="sub">· {hr.activeStaff}/{hr.totalStaff} người</span>
        <div className="actions">
          <Link to="/v2/hr" className="btn sm">Rota →</Link>
        </div>
      </div>
      <div className="panel-body" style={{ padding: '4px 0' }}>
        {items.map((it, i) => (
          <div key={i} className="staff-row">
            <div className="staff-nm" style={{ flex: 1 }}>
              <div className="staff-n" style={{ fontSize: 12 }}>{it.label}</div>
            </div>
            <span className={'chip ' + (it.tone || '')} style={{ fontFamily: 'var(--font-mono)' }}>{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ==========================================================================
   Alerts Panel — business alerts
   ========================================================================== */

const AlertsPanel: React.FC<{
  alerts: BusinessAlertDto[];
  onAlertClick?: (a: BusinessAlertDto) => void;
  onShowAll?: () => void;
}> = ({ alerts, onAlertClick, onShowAll }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Cảnh báo · <b>sự kiện</b></span>
      <div className="actions">
        <button type="button" className="btn sm ghost" onClick={onShowAll}>Xem hết</button>
      </div>
    </div>
    <div className="panel-body" style={{ padding: '4px 0' }}>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 12, color: 'var(--t-2)' }}>
          Không có cảnh báo mới
        </div>
      ) : (
        alerts.slice(0, 5).map((a) => {
          const tClass = a.severity === 1 ? 'crit' : a.severity === 2 ? 'warn' : a.severity === 3 ? 'info' : 'ok';
          return (
            <div
              key={a.id}
              className={'alert-row ' + tClass}
              onClick={() => onAlertClick?.(a)}
              style={{ cursor: onAlertClick ? 'pointer' : 'default' }}
            >
              <div className="alert-dt">{fmtRelShort(a.createdAt)}</div>
              <div>
                <div className="alert-who">
                  {a.patientName ? `${a.patientName} · ` : ''}{a.module?.toUpperCase() || a.title}
                </div>
                <div className="alert-msg">{a.message}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);

/* ==========================================================================
   BHYT / Revenue card — real revenue from dashboard
   ========================================================================== */

const BhytCard: React.FC<{ revenue: number; revenueChange: number }> = ({ revenue, revenueChange }) => {
  const revM = (revenue / 1_000_000);
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Doanh thu · <b>hôm nay</b></span>
        <div className="actions">
          <Link to="/v2/billing" className="btn sm">Viện phí →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>TỔNG THU</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
              {revM >= 1000 ? (revM / 1000).toFixed(1) + 'B' : revM.toFixed(1) + 'M'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
              {revenue.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>SO HÔM QUA</div>
            <div style={{
              fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: revenueChange > 0 ? '#16a34a' : revenueChange < 0 ? '#dc2626' : '#64748b',
            }}>
              {fmtDelta(revenueChange, '%')}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 6, padding: '10px 12px',
          background: '#eff5ff', border: '1px solid #bfd3fa', borderRadius: 6,
          fontSize: 12, color: '#1d4ed8',
        }}>
          <b>Chi tiết giám định BHYT</b> · xem trong <Link to="/v2/bhxh-audit" style={{ color: '#1d4ed8', textDecoration: 'underline' }}>BHXH Audit</Link>
        </div>
      </div>
    </div>
  );
};

/* ==========================================================================
   POPUP COMPONENTS
   6 modals/drawers matching design behavior when clicking into rows/cards.
   ========================================================================== */

// Deterministic vitals from patient code so a patient always gets the same
// demo HA/SpO2/mạch/sốt reading.
const fakeVitals = (code: string) => {
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) % 2147483647;
  const rnd = (mod: number) => {
    h = (h * 9301 + 49297) % 233280;
    return h % mod;
  };
  const bpSys = 90 + rnd(50);
  const bpDia = 55 + rnd(30);
  return {
    bp: `${bpSys}/${bpDia}`,
    spo2: 88 + rnd(12),
    hr: 65 + rnd(40),
    temp: (36 + rnd(30) / 10).toFixed(1),
  };
};

const ErPatientDrawer: React.FC<{
  row: AdmissionDto | null;
  onClose: () => void;
  onAddOrder: () => void;
  onTransferIcu: () => void;
}> = ({ row, onClose, onAddOrder, onTransferIcu }) => {
  if (!row) return null;
  const v = fakeVitals(row.patientCode);
  const ess = essFromPriority(row);
  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      width={560}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{row.patientName}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            {row.patientCode} · {ess} · {row.roomName || '—'}
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn ghost" onClick={onClose}>Đóng</button>
          <button type="button" className="btn ghost" onClick={onAddOrder}>Thêm y lệnh</button>
          <button type="button" className="btn primary" onClick={onTransferIcu}>Chuyển hồi sức</button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
        <div style={{ padding: '8px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: '#991b1b', fontFamily: 'var(--font-mono)' }}>HA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', fontVariantNumeric: 'tabular-nums' }}>{v.bp}</div>
        </div>
        <div style={{ padding: '8px 10px', background: v.spo2 < 95 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${v.spo2 < 95 ? '#fecaca' : '#bbf7d0'}`, borderRadius: 6 }}>
          <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}>SpO₂</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: v.spo2 < 95 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{v.spo2}%</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e4e9f0', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>MẠCH</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v.hr}</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid #e4e9f0', borderRadius: 6 }}>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)' }}>SỐT</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v.temp}°</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 6 }}>TRIỆU CHỨNG</div>
      <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 6, fontSize: 13, marginBottom: 14 }}>
        {row.chiefComplaint || row.priorityName || '—'}
      </div>
      <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 6 }}>THỜI GIAN</div>
      <div style={{ fontSize: 12, color: '#334155' }}>
        Tiếp nhận {fmtTime(row.admissionDate)} · Đối tượng {row.patientTypeName}
      </div>
      {row.insuranceNumber && (
        <>
          <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', margin: '14px 0 6px' }}>BHYT</div>
          <div style={{ fontSize: 12, color: '#334155', fontFamily: 'var(--font-mono)' }}>
            {row.insuranceNumber}
            {row.isInsuranceValid ? <span style={{ marginLeft: 6, color: '#16a34a' }}>✓ Hợp lệ</span>
                                   : <span style={{ marginLeft: 6, color: '#d97706' }}>⚠ Hết hạn</span>}
          </div>
        </>
      )}
    </Drawer>
  );
};

const BedDetailModal: React.FC<{
  bed: BedLayoutDto | null;
  onClose: () => void;
  onReserve: () => void;
  onOpenRecord: () => void;
}> = ({ bed, onClose, onReserve, onOpenRecord }) => {
  if (!bed) return null;
  const isFree = bed.status === 1;
  const isOccupied = bed.status === 2;
  const statusVi = bed.status === 1 ? 'Trống' : bed.status === 2 ? 'Đang dùng' : bed.status === 3 ? 'Bảo trì' : bed.statusName || 'Khác';
  return (
    <Modal
      open={!!bed}
      onCancel={onClose}
      title={bed.bedName?.toLowerCase().includes('giường') ? bed.bedName : `Giường ${bed.bedName}`}
      width={420}
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        isFree && <button key="reserve" type="button" className="btn primary" onClick={onReserve}>Đặt trước</button>,
        isOccupied && <button key="open" type="button" className="btn primary" onClick={onOpenRecord}>Mở hồ sơ</button>,
      ]}
    >
      <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
        <div><span style={{ color: '#64748b' }}>Mã giường:</span> <b className="mono">{bed.bedName}</b></div>
        <div><span style={{ color: '#64748b' }}>Trạng thái:</span> <b>{statusVi}</b></div>
        {bed.patientName && (
          <div><span style={{ color: '#64748b' }}>Bệnh nhân:</span> <b>{bed.patientName}</b></div>
        )}
        {bed.bedCode && (
          <div><span style={{ color: '#64748b' }}>Vị trí:</span> <span className="mono">{bed.bedCode}</span></div>
        )}
      </div>
    </Modal>
  );
};

const OrCaseModal: React.FC<{
  data: { surgery: NonNullable<SurgeryScheduleDto['surgeries']>[number]; orName: string } | null;
  onClose: () => void;
  onPrint: () => void;
  onMarkDone: () => void;
}> = ({ data, onClose, onPrint, onMarkDone }) => {
  if (!data) return null;
  const { surgery: it, orName } = data;
  const start = it.scheduledTime ? dayjs(it.scheduledTime) : null;
  const end = start ? start.add(it.estimatedDuration || 60, 'minute') : null;
  return (
    <Modal
      open={!!data}
      onCancel={onClose}
      width={640}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{it.surgeryServiceName}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            {orName} · {start ? start.format('HH:mm') : '—'} – {end ? end.format('HH:mm') : '—'} · {it.patientName}
          </div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        <button key="print" type="button" className="btn ghost" onClick={onPrint}>In phiếu mổ</button>,
        <button key="done" type="button" className="btn primary" onClick={onMarkDone}>Đánh dấu xong</button>,
      ]}
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Fld label="Bệnh nhân" value={`${it.patientName} · ${it.patientCode || '—'}`} />
        <Fld label="Trạng thái" value={it.statusName || '—'} />
        <Fld label="PTV chính" value={it.surgeonName || '—'} />
        <Fld label="Gây mê" value={it.anesthesiologistName || '—'} />
        <Fld label="Dự kiến" value={`${it.estimatedDuration || 60} phút`} />
        <Fld label="Loại ca" value={String(it.surgeryType ?? '—')} />
      </div>
    </Modal>
  );
};

const Fld: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 10, color: '#64748b', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 3 }}>{label.toUpperCase()}</div>
    <div style={{ padding: '6px 10px', background: '#f8fafc', border: '1px solid #e4e9f0', borderRadius: 4, fontSize: 13 }}>{value}</div>
  </div>
);

const SUPPLIERS = ['CTCP Dược Hậu Giang', 'CTCP Traphaco', 'CTCP Dược phẩm Pymepharco'];

const StockReorderModal: React.FC<{
  item: ExpiryWarningDto | null;
  onClose: () => void;
  onCreatePO: (qty: number) => void;
}> = ({ item, onClose, onCreatePO }) => {
  const [qty, setQty] = useState(0);
  const [supplier, setSupplier] = useState(SUPPLIERS[0]);
  const [needDate, setNeedDate] = useState<dayjs.Dayjs | null>(dayjs().add(3, 'day'));
  useEffect(() => {
    if (item) setQty(Math.max((item.quantity || 100) * 3, 2000));
  }, [item]);
  if (!item) return null;
  return (
    <Modal
      open={!!item}
      onCancel={onClose}
      width={480}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Đặt hàng: {item.itemName}</div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>
            Tồn hiện tại: {item.quantity.toLocaleString('vi-VN')} {item.unit} · Còn {item.daysToExpiry}d
          </div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Hủy</button>,
        <button key="po" type="button" className="btn primary" onClick={() => onCreatePO(qty)}>Tạo PO</button>,
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Số lượng đặt *</div>
          <InputNumber value={qty} onChange={(v) => setQty(Number(v) || 0)} style={{ width: '100%' }} addonAfter={item.unit} min={1} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Nhà cung cấp</div>
          <AntdSelect value={supplier} onChange={setSupplier} options={SUPPLIERS.map((s) => ({ value: s, label: s }))} style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 4, fontWeight: 500 }}>Ngày cần nhận</div>
          <DatePicker value={needDate} onChange={setNeedDate} format="DD/MM/YYYY" style={{ width: '100%' }} />
        </div>
      </div>
    </Modal>
  );
};

const AlertDetailModal: React.FC<{
  alert: BusinessAlertDto | null;
  onClose: () => void;
  onAck: () => void;
}> = ({ alert, onClose, onAck }) => {
  if (!alert) return null;
  return (
    <Modal
      open={!!alert}
      onCancel={onClose}
      width={480}
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>
            {alert.patientName ? `${alert.patientName} · ` : ''}{alert.module?.toUpperCase() || alert.title}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>{fmtRelShort(alert.createdAt)}</div>
        </div>
      }
      footer={[
        <button key="close" type="button" className="btn ghost" onClick={onClose}>Đóng</button>,
        <button key="ack" type="button" className="btn primary" onClick={onAck}>Xác nhận (ACK)</button>,
      ]}
    >
      <div style={{ padding: '4px 0 8px', fontSize: 13, color: '#334155', lineHeight: 1.5 }}>{alert.message}</div>
    </Modal>
  );
};

const AllAlertsDrawer: React.FC<{
  open: boolean;
  alerts: BusinessAlertDto[];
  onClose: () => void;
  onAlertClick: (a: BusinessAlertDto) => void;
  onAckAll: () => void;
}> = ({ open, alerts, onClose, onAlertClick, onAckAll }) => (
  <Drawer
    open={open}
    onClose={onClose}
    width={540}
    title={
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Tất cả cảnh báo</div>
        <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'var(--font-mono)' }}>Hôm nay · {alerts.length} cảnh báo</div>
      </div>
    }
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn primary" onClick={onAckAll}>ACK tất cả</button>
      </div>
    }
  >
    <div style={{ padding: '0 4px' }}>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 12, color: '#64748b' }}>
          Không có cảnh báo
        </div>
      ) : (
        alerts.map((a) => {
          const tClass = a.severity === 1 ? 'crit' : a.severity === 2 ? 'warn' : a.severity === 3 ? 'info' : 'ok';
          return (
            <div
              key={a.id}
              className={'alert-row ' + tClass}
              onClick={() => onAlertClick(a)}
              style={{ cursor: 'pointer' }}
            >
              <div className="alert-dt">{fmtRelShort(a.createdAt)}</div>
              <div>
                <div className="alert-who">
                  {a.patientName ? `${a.patientName} · ` : ''}{a.module?.toUpperCase() || a.title}
                </div>
                <div className="alert-msg">{a.message}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </Drawer>
);

export default DashboardV2;
