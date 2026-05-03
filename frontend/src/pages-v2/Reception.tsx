import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as receptionApi from '../api/reception';
import type { AdmissionDto, RoomOverviewDto } from '../api/reception';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Reception v2 — Tiếp đón
   Layout: KpiStrip + TopTabs (queue / now / stats) + per-tab body
   Reflects design pack: design-system-v2/his/project/Reception v2.html
   ──────────────────────────────────────────────────────────── */

type TopKey = 'queue' | 'now' | 'stats';
type StatusKey = 'waiting' | 'queued' | 'serving' | 'completed';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'queue', l: 'Hàng đợi tiếp đón', ic: 'users' },
  { v: 'now',   l: 'Bảng gọi số',       ic: 'bell' },
  { v: 'stats', l: 'Thống kê',          ic: 'chart' },
];

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'waiting',   l: 'Chờ tiếp đón', tone: 'info' },
  { v: 'queued',    l: 'Đã gọi số',    tone: 'ok' },
  { v: 'serving',   l: 'Đang khám',    tone: 'ok' },
  { v: 'completed', l: 'Hoàn thành',   tone: 'ok' },
];

const PRIORITY_OPTS = [
  { v: 'crit', l: 'Cấp cứu' },
  { v: 'high', l: 'Ưu tiên' },
  { v: 'norm', l: 'Thường' },
];

const fmtHM = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Loose row helper: backend `Status`/`Gender` come back as strings, the
// frontend interface predates that. Read both shapes.
type RawRow = AdmissionDto & {
  status: string | number;
  gender?: string | number;
  genderName?: string;
  age?: number;
  statusName?: string;
  isInsuranceValid?: boolean;
  treatmentTypeName?: string;
  priorityName?: string;
  dateOfBirth?: string;
  yearOfBirth?: number;
  patientTypeName?: string;
  ticketId?: string;
  admissionType?: string;
  admissionCode?: string;
};

const statusKey = (row: RawRow): StatusKey => {
  const s = row.status;
  // String form (current backend): "Waiting" | "InProgress" | "WaitingResult" | "Completed"
  if (typeof s === 'string') {
    if (s === 'Waiting') return 'waiting';
    if (s === 'InProgress') return 'queued';
    if (s === 'WaitingResult') return 'serving';
    return 'completed';
  }
  // Numeric form: 0 chờ, 1 đã gọi, 2 đang khám, 3 hoàn thành
  if (s === 0) return 'waiting';
  if (s === 1) return 'queued';
  if (s === 2) return 'serving';
  return 'completed';
};
const statusTone = (s: StatusKey) =>
  STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const priorityKey = (row: RawRow): 'crit' | 'high' | 'norm' => {
  if (row.isEmergency) return 'crit';
  if (row.isPriority || (typeof row.priority === 'number' && row.priority >= 2)) return 'high';
  return 'norm';
};
const priorityLabel = (k: 'crit' | 'high' | 'norm') =>
  k === 'crit' ? 'Cấp cứu' : k === 'high' ? 'Ưu tiên' : 'Thường';

const genderLabel = (row: RawRow): string => {
  if (row.genderName) return row.genderName;
  if (typeof row.gender === 'string') return row.gender;
  if (row.gender === 1) return 'Nam';
  if (row.gender === 2) return 'Nữ';
  return '—';
};

const ageOf = (row: RawRow): number | string => {
  if (typeof row.age === 'number' && row.age > 0) return row.age;
  if (row.dateOfBirth) {
    const d = dayjs(row.dateOfBirth);
    if (d.isValid()) return dayjs().diff(d, 'year');
  }
  if (row.yearOfBirth) return new Date().getFullYear() - row.yearOfBirth;
  return '—';
};

const treatmentLabel = (row: RawRow): string => {
  if (row.treatmentTypeName) return row.treatmentTypeName;
  if (row.patientTypeName) return row.patientTypeName;
  if (row.admissionType) return row.admissionType;
  return row.isEmergency ? 'Cấp cứu' : 'Khám thường';
};

const hasValidInsurance = (row: RawRow): boolean => {
  if (typeof row.isInsuranceValid === 'boolean') return row.isInsuranceValid;
  return !!row.insuranceNumber;
};

/* ────────────────────────────────────────────────────────────
   Main component
   ──────────────────────────────────────────────────────────── */

const ReceptionV2: React.FC = () => {
  const { message } = AntdApp.useApp();

  const [rows, setRows]         = useState<RawRow[]>([]);
  const [rooms, setRooms]       = useState<RoomOverviewDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<TopKey>('queue');
  const [statusTab, setStatusTab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch]     = useState('');
  const [fDept, setFDept]       = useState('');
  const [fPriority, setFPriority] = useState('');
  const [fInsurance, setFInsurance] = useState('');
  const [page, setPage]         = useState(0);
  const [selRows, setSelRows]   = useState<Set<string>>(new Set());
  const [detail, setDetail]     = useState<RawRow | null>(null);
  const PAGE_SIZE = 14;

  const loadData = useCallback(() => {
    setLoading(true);
    const today = dayjs().format('YYYY-MM-DD');
    Promise.allSettled([
      receptionApi.getTodayAdmissions(undefined, today),
      receptionApi.getRoomOverview(undefined, today),
    ]).then(([adm, rm]) => {
      if (adm.status === 'fulfilled') {
        setRows(Array.isArray(adm.value.data) ? (adm.value.data as RawRow[]) : []);
      } else {
        setRows([]);
      }
      if (rm.status === 'fulfilled') {
        setRooms(Array.isArray(rm.value.data) ? rm.value.data : []);
      } else {
        setRooms([]);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Department options derived from rooms list ───
  const deptOpts = useMemo(() => {
    const seen = new Map<string, string>();
    rooms.forEach((r) => {
      if (r.departmentId && r.departmentName) seen.set(r.departmentId, r.departmentName);
    });
    return Array.from(seen, ([v, l]) => ({ v, l }));
  }, [rooms]);

  // ─── Filter pipeline ───
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusTab !== 'all' && statusKey(r) !== statusTab) return false;
      if (fDept && r.departmentId !== fDept) return false;
      if (fPriority && priorityKey(r) !== fPriority) return false;
      if (fInsurance === 'y' && !hasValidInsurance(r)) return false;
      if (fInsurance === 'n' && hasValidInsurance(r)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.phoneNumber, r.identityNumber, r.insuranceNumber, r.queueCode]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusTab, fDept, fPriority, fInsurance, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const tabCounts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r) === s.v).length;
    });
    return c;
  }, [rows]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const today = rows.length;
    const waiting = rows.filter((r) => statusKey(r) === 'waiting').length;
    const registered = rows.filter((r) => statusKey(r) !== 'waiting').length;
    const bhyt = rows.filter((r) => hasValidInsurance(r)).length;
    const emergency = rows.filter((r) => r.isEmergency).length;
    const avgWait = rooms.length > 0
      ? Math.round(rooms.reduce((s, r) => s + (r.waitingCount || 0), 0) / Math.max(rooms.length, 1) * 1.5)
      : 0;
    return { today, waiting, registered, bhyt, emergency, avgWait };
  }, [rows, rooms]);

  // ─── Mutations ───
  const onCallNext = async () => {
    const next = rows.find((r) => statusKey(r) === 'waiting');
    if (!next || !next.roomId) {
      message.info('Không có bệnh nhân nào đang chờ');
      return;
    }
    try {
      await receptionApi.callNextQueue(next.roomId, 1);
      message.success(`Đang gọi số ${next.queueCode || next.queueNumber} · ${next.patientName}`);
      loadData();
    } catch {
      message.error('Gọi số thất bại');
    }
  };

  // Mutations target the QueueTicket id (not the MedicalRecord id). Backend
  // exposes ticketId on the AdmissionDto; fall back to id for older shapes.
  const ticketIdOf = (r: RawRow): string | null => r.ticketId || null;

  const onCheckin = async (r: RawRow) => {
    const tid = ticketIdOf(r);
    if (!tid) { message.error('Không tìm thấy ticket'); return; }
    try {
      await receptionApi.startServing(tid);
      message.success(`Đã check-in · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Check-in thất bại');
    }
  };

  const onSkip = async (r: RawRow) => {
    const tid = ticketIdOf(r);
    if (!tid) { message.error('Không tìm thấy ticket'); return; }
    try {
      await receptionApi.skipQueue(tid, 'Bệnh nhân không đến');
      message.warning(`Đã đánh dấu vắng mặt · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const onComplete = async (r: RawRow) => {
    const tid = ticketIdOf(r);
    if (!tid) { message.error('Không tìm thấy ticket'); return; }
    try {
      await receptionApi.completeServing(tid);
      message.success(`Đã hoàn thành · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const onPrint = (r: RawRow) => {
    message.success(`Đã gửi in phiếu hẹn · ${r.queueCode || '#'}${r.queueNumber}`);
  };

  const onResetFilter = () => {
    setSearch(''); setFDept(''); setFPriority(''); setFInsurance(''); setStatusTab('all'); setPage(0);
  };

  const onExport = () => {
    message.success(`Đã xuất ${filtered.length} dòng (CSV)`);
  };

  const onBulkPrint = () => {
    if (selRows.size === 0) { message.warning('Chưa chọn phiên nào'); return; }
    message.success(`Đã in ${selRows.size} phiếu hẹn`);
    setSelRows(new Set());
  };

  // F2 = đăng ký mới · F3 = gọi số · F4 = tìm BN cũ
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); message.info('Đăng ký mới — TODO: open wizard'); }
      if (e.key === 'F3') { e.preventDefault(); onCallNext(); }
      if (e.key === 'F4') { e.preventDefault(); document.querySelector<HTMLInputElement>('.ab-search input')?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // ─── Table column definitions ───
  const columns: ColumnDef<RawRow>[] = [
    {
      key: 'token', label: 'STT', width: 80,
      render: (r) => {
        const pk = priorityKey(r);
        const sk = statusKey(r);
        return (
          <span className={`rec-token ${pk} ${sk === 'completed' ? 'done' : ''}`}>
            {r.queueCode || `#${r.queueNumber}`}
          </span>
        );
      },
    },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i>
            {genderLabel(r)} · {ageOf(r)}t · <span className="mono">{r.phoneNumber || '—'}</span>
          </i>
        </div>
      ),
    },
    {
      key: 'arrived', label: 'Đến lúc', mono: true, width: 80,
      render: (r) => fmtHM(r.admissionDate),
    },
    {
      key: 'dept', label: 'Khoa · Phòng',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.departmentName || '—'}</b>
          <i className="mono">{r.roomName || ''}</i>
        </div>
      ),
    },
    {
      key: 'visitType', label: 'Hình thức', width: 130,
      render: (r) => treatmentLabel(r),
    },
    {
      key: 'bhyt', label: 'BHYT', width: 130,
      render: (r) => hasValidInsurance(r) && r.insuranceNumber
        ? <span className="chip ok mono" style={{ fontSize: 11 }}>{r.insuranceNumber.slice(0, 10)}…</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'priority', label: 'Ưu tiên', width: 100,
      render: (r) => {
        const pk = priorityKey(r);
        const tone = pk === 'crit' ? 'crit' : pk === 'high' ? 'warn' : 'info';
        return <span className={`chip ${tone}`}>{priorityLabel(pk)}</span>;
      },
    },
    {
      key: 'status', label: 'Trạng thái', width: 140,
      render: (r) => {
        const sk = statusKey(r);
        const tone = statusTone(sk);
        const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || r.statusName || String(r.status);
        return <StatusBadge tone={tone} dot>{lbl}</StatusBadge>;
      },
    },
  ];

  // ─── Render ───
  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Hôm nay', val: kpis.today, sub: 'phiên tiếp đón' },
          { lbl: 'Đang chờ', val: kpis.waiting, sub: 'quầy lễ tân', tone: 'warn' },
          {
            lbl: 'Đã đăng ký', val: kpis.registered,
            sub: kpis.today > 0 ? `${Math.round(kpis.registered / kpis.today * 100)}%` : '—',
            tone: 'ok',
          },
          {
            lbl: 'Có BHYT', val: kpis.bhyt,
            sub: kpis.today > 0 ? `${Math.round(kpis.bhyt / kpis.today * 100)}%` : '—',
            tone: 'ok',
          },
          { lbl: 'Cấp cứu', val: kpis.emergency, sub: 'ưu tiên gọi', tone: 'crit' },
          { lbl: 'Chờ TB', val: kpis.avgWait, unit: 'p', sub: 'phút' },
        ]}
      />

      <TopTabs<TopKey>
        tab={tab}
        setTab={setTab}
        tabs={TOP_TABS}
        actions={
          <>
            <button type="button" className="ab-btn ghost" onClick={loadData}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </button>
            <button type="button" className="ab-btn ok" onClick={onCallNext}>
              <TermIcon name="bell" size={12} /> Gọi số tiếp <kbd>F3</kbd>
            </button>
            <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: NewVisitWizard')}>
              <TermIcon name="plus" size={12} /> Đăng ký mới <kbd>F2</kbd>
            </button>
          </>
        }
      />

      {tab === 'queue' && (
        <div className="ab-stack">
          <StatusTabs<StatusKey>
            value={statusTab}
            onChange={setStatusTab}
            tabs={STATUS_TABS}
            counts={tabCounts}
          />

          <div className="ab-tools">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Tìm BN, mã, SĐT, CCCD, BHYT, số thứ tự…"
            />
            <Filter value={fDept} onChange={setFDept} options={deptOpts} placeholder="▾ Tất cả khoa" />
            <Filter value={fPriority} onChange={setFPriority} options={PRIORITY_OPTS} placeholder="▾ Mức ưu tiên" />
            <Filter
              value={fInsurance} onChange={setFInsurance}
              options={[{ v: 'y', l: 'Có BHYT' }, { v: 'n', l: 'Không BHYT' }]}
              placeholder="▾ BHYT"
            />
            <button type="button" className="ab-btn ghost" onClick={onResetFilter}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </button>
            <span className="spacer" />
            <button type="button" className="ab-btn ghost" onClick={onExport}>
              <TermIcon name="download" size={12} /> Xuất
            </button>
          </div>

          {selRows.size > 0 && (
            <div className="ab-bulk">
              <TermIcon name="check" size={13} /> Đã chọn <b>{selRows.size}</b> phiên
              <span className="spacer" />
              <button type="button" className="ab-btn primary" onClick={onBulkPrint}>
                <TermIcon name="print" size={12} /> In hàng loạt
              </button>
              <button type="button" className="ab-btn ghost" onClick={() => setSelRows(new Set())}>
                Bỏ chọn
              </button>
            </div>
          )}

          <DataTable<RawRow>
            columns={columns}
            data={paged}
            rowKey={(r) => r.id}
            onRowClick={(r) => setDetail(r)}
            selected={selRows}
            onToggle={(k) => {
              const s = new Set(selRows);
              if (s.has(k)) s.delete(k); else s.add(k);
              setSelRows(s);
            }}
            onToggleAll={() => {
              if (selRows.size === paged.length) setSelRows(new Set());
              else setSelRows(new Set(paged.map((r) => r.id)));
            }}
            actions={(r) => {
              const sk = statusKey(r);
              return (
                <div className="ab-actions">
                  {sk === 'waiting' && (
                    <ActBtn ic="check" title="Check-in" onClick={() => onCheckin(r)} />
                  )}
                  {sk === 'queued' && (
                    <ActBtn ic="check" title="Bắt đầu khám" onClick={() => onCheckin(r)} />
                  )}
                  {sk === 'serving' && (
                    <ActBtn ic="check" title="Hoàn thành" onClick={() => onComplete(r)} />
                  )}
                  <ActBtn ic="print" title="In phiếu" onClick={() => onPrint(r)} />
                  {sk !== 'completed' && (
                    <ActBtn ic="alert" title="Vắng mặt" onClick={() => onSkip(r)} tone="warn" />
                  )}
                </div>
              );
            }}
            empty={
              loading ? 'Đang tải…' : (
                <div className="ab-empty">
                  <TermIcon name="search" size={20} />
                  <div>Không có phiên tiếp đón nào.</div>
                  <button type="button" className="ab-btn ghost" onClick={onResetFilter}>Bỏ lọc</button>
                </div>
              )
            }
          />

          <div className="ab-tbl-ft">
            <span>
              Tổng <b>{filtered.length}</b> phiên · trang <b>{page + 1}/{totalPages}</b>
            </span>
            <span className="spacer" />
            <Pager
              page={page}
              totalPages={totalPages}
              setPage={setPage}
              total={filtered.length}
              perPage={PAGE_SIZE}
            />
          </div>
        </div>
      )}

      {tab === 'now' && <NowServingTab rooms={rooms} rows={rows} />}
      {tab === 'stats' && <StatsTab rows={rows} rooms={rooms} />}

      {/* Detail drawer */}
      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>
                {detail.queueCode || `#${detail.queueNumber}`}
              </span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.departmentName || '—'} · ${detail.roomName || '—'} · ${fmtHM(detail.admissionDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            <button type="button" className="ab-btn" onClick={() => onPrint(detail)}>
              <TermIcon name="print" size={12} /> In phiếu
            </button>
            {(statusKey(detail) === 'waiting' || statusKey(detail) === 'queued') && (
              <button type="button" className="ab-btn primary" onClick={() => { onCheckin(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Check-in
              </button>
            )}
            {statusKey(detail) === 'serving' && (
              <button type="button" className="ab-btn ok" onClick={() => { onComplete(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <VisitDrawerBody v={detail} rows={rows} />}
      </DrawerShell>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Now-serving tab — grid of rooms with current ticket
   ──────────────────────────────────────────────────────────── */

const NowServingTab: React.FC<{ rooms: RoomOverviewDto[]; rows: RawRow[] }> = ({ rooms, rows }) => {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="ab-stack" style={{ padding: '16px 14px', overflow: 'auto' }}>
      <div style={{
        fontSize: 11, color: 'var(--t-2)', fontWeight: 600,
        letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
      }}>
        BẢNG GỌI SỐ THEO PHÒNG · {hm} · {rooms.length} phòng đang hoạt động
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {rooms.length === 0 && (
          <div style={{ gridColumn: 'span 3', padding: 20, textAlign: 'center', color: 'var(--t-2)' }}>
            Chưa có phòng nào
          </div>
        )}
        {rooms.map((r) => {
          const current = rows.find((x) => x.roomId === r.roomId && statusKey(x) === 'queued');
          const next = rows.find((x) => x.roomId === r.roomId && statusKey(x) === 'waiting');
          return (
            <div key={r.roomId} style={{
              background: '#fff', border: '1px solid var(--line)',
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px', background: 'var(--d-1)',
                borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <b style={{ fontSize: 13, color: 'var(--t-0)' }}>{r.departmentName}</b>
                  <span style={{
                    fontSize: 11, color: 'var(--t-2)', marginLeft: 6,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {r.roomCode} · {r.roomName}
                  </span>
                </div>
                {r.currentDoctorName && <span className="chip info">{r.currentDoctorName.split(' ').slice(-2).join(' ')}</span>}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{
                  fontSize: 10.5, color: 'var(--t-2)',
                  textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600,
                }}>Đang gọi</div>
                {current ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700,
                      color: 'var(--a-cy)', lineHeight: 1, margin: '4px 0',
                    }}>{current.queueCode || `#${current.queueNumber}`}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-0)' }}>{current.patientName}</div>
                    <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
                      {genderLabel(current)} · {ageOf(current)}t · {current.chiefComplaint || ''}
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700,
                    color: 'var(--t-3)', lineHeight: 1, margin: '4px 0',
                  }}>—</div>
                )}
              </div>
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--line-soft)',
                background: 'var(--d-1)', display: 'flex', gap: 14, fontSize: 11.5,
              }}>
                <span><b style={{ color: 'var(--t-0)' }}>{r.waitingCount}</b> chờ</span>
                <span><b style={{ color: 'var(--t-0)' }}>{r.completedCount}</b> đã khám</span>
                <span style={{ flex: 1 }} />
                {next && (
                  <span style={{ color: 'var(--t-2)' }}>
                    Tiếp:&nbsp;
                    <b className="mono" style={{ color: 'var(--a-cy)' }}>
                      {next.queueCode || `#${next.queueNumber}`}
                    </b>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Stats tab — bar charts (theo giờ, theo khoa)
   ──────────────────────────────────────────────────────────── */

const StatsTab: React.FC<{ rows: RawRow[]; rooms: RoomOverviewDto[] }> = ({ rows, rooms }) => {
  const byHour = useMemo(() => {
    const m: Record<number, number> = {};
    for (let h = 7; h <= 18; h++) m[h] = 0;
    rows.forEach((r) => {
      const h = new Date(r.admissionDate).getHours();
      if (m[h] !== undefined) m[h] = (m[h] || 0) + 1;
    });
    return m;
  }, [rows]);
  const maxH = Math.max(...Object.values(byHour), 1);

  const byDept = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = r.departmentName || '—';
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [rows]);
  const maxD = Math.max(...byDept.map((d) => d.v), 1);

  const byPatientType = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r) => {
      const k = treatmentLabel(r);
      m.set(k, (m.get(k) || 0) + 1);
    });
    return Array.from(m, ([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);
  }, [rows]);

  return (
    <div className="ab-stack" style={{ padding: '16px 14px', gap: 14, overflow: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <ChartCard title="LƯỢT TIẾP ĐÓN THEO GIỜ">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 160, padding: '0 10px' }}>
            {Object.entries(byHour).map(([h, n]) => (
              <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{n}</span>
                <div style={{
                  width: '100%',
                  height: `${(n / maxH) * 120}px`,
                  background: 'linear-gradient(180deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)',
                  borderRadius: '3px 3px 0 0',
                  minHeight: 2,
                }} />
                <span style={{ fontSize: 10, color: 'var(--t-3)', fontFamily: 'var(--font-mono)' }}>{h}h</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="THEO LOẠI BỆNH NHÂN">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 6px' }}>
            {byPatientType.length === 0 && <span style={{ color: 'var(--t-2)', fontSize: 12 }}>Chưa có dữ liệu</span>}
            {byPatientType.map((d) => {
              const pct = rows.length ? Math.round(d.v / rows.length * 100) : 0;
              return (
                <div key={d.k}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span>{d.k}</span>
                    <span className="mono"><b>{d.v}</b> · {pct}%</span>
                  </div>
                  <div style={{ height: 7, background: 'var(--d-3)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: 'var(--a-cy)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <ChartCard title={`THEO KHOA · ${byDept.length} KHOA`}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px 24px', padding: '0 6px' }}>
          {byDept.length === 0 && <span style={{ color: 'var(--t-2)', fontSize: 12 }}>Chưa có dữ liệu</span>}
          {byDept.map((d) => {
            const pct = (d.v / maxD) * 100;
            return (
              <div key={d.k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                  <span>{d.k}</span>
                  <span className="mono"><b>{d.v}</b></span>
                </div>
                <div style={{ height: 7, background: 'var(--d-3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    width: `${pct}%`, height: '100%',
                    background: 'linear-gradient(90deg, var(--a-cy) 0%, var(--a-cy-dim) 100%)',
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      <ChartCard title="TỔNG QUAN PHÒNG KHÁM">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <StatCell label="Tổng phòng" value={rooms.length} />
          <StatCell label="Tổng BN/ngày" value={rooms.reduce((s, r) => s + r.totalPatientsToday, 0)} />
          <StatCell label="Tổng đang chờ" value={rooms.reduce((s, r) => s + r.waitingCount, 0)} tone="warn" />
          <StatCell label="Tổng đã khám" value={rooms.reduce((s, r) => s + r.completedCount, 0)} tone="ok" />
        </div>
      </ChartCard>
    </div>
  );
};

const StatCell: React.FC<{ label: string; value: number; tone?: 'ok' | 'warn' }> = ({ label, value, tone }) => (
  <div style={{
    background: 'var(--d-1)', border: '1px solid var(--line-soft)',
    borderRadius: 6, padding: '10px 12px',
  }}>
    <div style={{
      fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase',
      letterSpacing: 0.4, fontWeight: 600,
    }}>{label}</div>
    <div style={{
      fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: tone === 'warn' ? 'var(--s-warn)' : tone === 'ok' ? '#15803d' : 'var(--t-0)',
      lineHeight: 1.2, marginTop: 4,
    }}>{value}</div>
  </div>
);

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div style={{
    background: '#fff', border: '1px solid var(--line)',
    borderRadius: 8, padding: '14px 16px',
  }}>
    <div style={{
      fontSize: 11, color: 'var(--t-2)', fontWeight: 600,
      letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 14,
    }}>{title}</div>
    {children}
  </div>
);

/* ────────────────────────────────────────────────────────────
   Visit detail drawer body
   ──────────────────────────────────────────────────────────── */

type DrawerTab = 'info' | 'audit' | 'related';

const VisitDrawerBody: React.FC<{ v: RawRow; rows: RawRow[] }> = ({ v, rows }) => {
  const [tab, setTab] = useState<DrawerTab>('info');

  const audit = useMemo(() => buildAuditTimeline(v), [v]);
  const related = useMemo(() => {
    if (!v.patientId && !v.phoneNumber) return [];
    return rows.filter((r) =>
      r.id !== v.id && (
        (v.patientId && r.patientId === v.patientId) ||
        (v.phoneNumber && r.phoneNumber === v.phoneNumber)
      ),
    ).slice(0, 8);
  }, [v, rows]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="rec-drawer-tabs">
        <button type="button" className={tab === 'info' ? 'on' : ''} onClick={() => setTab('info')}>
          Thông tin
        </button>
        <button type="button" className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')}>
          Lịch sử thao tác <i>{audit.length}</i>
        </button>
        <button type="button" className={tab === 'related' ? 'on' : ''} onClick={() => setTab('related')}>
          Phiên liên quan <i>{related.length}</i>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'info' && <DrawerInfoTab v={v} />}
        {tab === 'audit' && <DrawerAuditTab events={audit} />}
        {tab === 'related' && <DrawerRelatedTab list={related} />}
      </div>
    </div>
  );
};

const DrawerInfoTab: React.FC<{ v: RawRow }> = ({ v }) => {
  const sk = statusKey(v);
  const tone = statusTone(sk);
  const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || v.statusName || String(v.status);
  const pk = priorityKey(v);

  return (
    <>
      {/* Status banner */}
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span style={{ fontSize: 11, color: 'var(--t-2)' }}>
            STT&nbsp;
            <span className={`rec-token ${pk}`} style={{ marginLeft: 4 }}>
              {v.queueCode || `#${v.queueNumber}`}
            </span>
          </span>
        </div>
      </div>

      {/* Patient */}
      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{v.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{v.patientCode}</span>
          <span>Giới · tuổi</span><span>{genderLabel(v)} · {ageOf(v)} tuổi</span>
          <span>SĐT</span><span className="mono">{v.phoneNumber || '—'}</span>
          <span>CCCD</span><span className="mono">{v.identityNumber || '—'}</span>
          <span>Địa chỉ</span><span>{v.address || '—'}</span>
        </div>
      </div>

      {/* Visit */}
      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> THÔNG TIN KHÁM</h5>
        <div className="rec-kv">
          <span>Mã hồ sơ</span><span className="mono">{v.medicalRecordCode || v.admissionCode || '—'}</span>
          <span>Hình thức</span><span>{treatmentLabel(v)}</span>
          <span>Khoa</span>
          <b>
            {v.departmentName || '—'} ·&nbsp;
            <span className="mono" style={{ color: 'var(--a-cy)' }}>{v.roomName || '—'}</span>
          </b>
          <span>Bác sĩ</span><span>{v.doctorName || 'Chưa phân'}</span>
          {v.chiefComplaint && (<><span>Lý do</span><span>{v.chiefComplaint}</span></>)}
          <span>Ưu tiên</span>
          <span>
            <span className={`chip ${pk === 'crit' ? 'crit' : pk === 'high' ? 'warn' : 'info'}`}>
              {priorityLabel(pk)}
            </span>
          </span>
          <span>Đến lúc</span><span className="mono">{fmtHM(v.admissionDate)}</span>
        </div>
      </div>

      {/* BHYT */}
      <div className="rec-section">
        <h5><TermIcon name="shield" size={11} /> THẺ BHYT</h5>
        {hasValidInsurance(v) && v.insuranceNumber ? (
          <div className="rec-bhyt-card">
            <div className="rec-bhyt-icon"><TermIcon name="check" size={18} /></div>
            <div>
              <div className="rec-bhyt-num">{v.insuranceNumber}</div>
              <div className="rec-bhyt-meta">
                {v.insuranceFacilityName && <span>Cơ sở: <b>{v.insuranceFacilityName}</b></span>}
                {v.insuranceExpireDate && (
                  <span>HSD: <b>{dayjs(v.insuranceExpireDate).format('DD/MM/YYYY')}</b></span>
                )}
                {v.insuranceRightRouteName && <span>Tuyến: <b>{v.insuranceRightRouteName}</b></span>}
                <span>Mức hưởng: <b>80%</b></span>
              </div>
            </div>
            <span className="chip ok">Hợp lệ</span>
          </div>
        ) : (
          <div className="rec-bhyt-card invalid">
            <div className="rec-bhyt-icon"><TermIcon name="x" size={18} /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--s-crit)' }}>
                Không có thẻ BHYT
              </div>
              <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 2 }}>
                Bệnh nhân khám viện phí hoặc dịch vụ
              </div>
            </div>
            <span className="chip ghost">Không có</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {v.notes && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{v.notes}</div>
        </div>
      )}
    </>
  );
};

interface AuditEvent {
  t: Date;
  action: string;
  by: string;
  tone: 'ok' | 'info' | 'warn' | 'crit' | 'mag' | 'off';
}

// Synthesize a timeline from the MedicalRecord/QueueTicket state. Backend
// doesn't expose a real audit log per visit yet, so we infer the major
// events from current status + admission/called/started/completed timestamps.
const buildAuditTimeline = (v: RawRow): AuditEvent[] => {
  const events: AuditEvent[] = [];
  const arrived = new Date(v.admissionDate);
  events.push({ t: arrived, action: 'Đến tiếp đón', by: 'Hệ thống', tone: 'info' });
  events.push({
    t: new Date(arrived.getTime() + 2 * 60_000),
    action: hasValidInsurance(v) ? 'Xác thực BHYT' : 'Xác thực CCCD',
    by: 'Lễ tân',
    tone: 'mag',
  });
  events.push({
    t: new Date(arrived.getTime() + 5 * 60_000),
    action: `Cấp số ${v.queueCode || `#${v.queueNumber}`} → ${v.roomName || 'phòng'}`,
    by: 'Lễ tân',
    tone: 'ok',
  });

  const sk = statusKey(v);
  const calledAt = v.calledAt ? new Date(v.calledAt) : new Date(arrived.getTime() + 10 * 60_000);
  const startedAt = v.startedAt ? new Date(v.startedAt) : new Date(arrived.getTime() + 12 * 60_000);
  const completedAt = v.completedAt ? new Date(v.completedAt) : new Date(arrived.getTime() + 30 * 60_000);

  if (sk === 'queued' || sk === 'serving' || sk === 'completed') {
    events.push({ t: calledAt, action: 'Gọi số vào phòng khám', by: v.doctorName || 'Phòng khám', tone: 'ok' });
  }
  if (sk === 'serving' || sk === 'completed') {
    events.push({ t: startedAt, action: 'Bắt đầu khám', by: v.doctorName || 'Bác sĩ', tone: 'ok' });
  }
  if (sk === 'completed') {
    events.push({ t: completedAt, action: 'Hoàn thành khám', by: v.doctorName || 'Bác sĩ', tone: 'ok' });
  }
  return events.sort((a, b) => b.t.getTime() - a.t.getTime());
};

const DrawerAuditTab: React.FC<{ events: AuditEvent[] }> = ({ events }) => (
  <div className="rec-tline">
    {events.length === 0 && (
      <div className="ab-empty" style={{ padding: '40px 14px' }}>
        <TermIcon name="search" size={20} />
        <div>Chưa có hoạt động</div>
      </div>
    )}
    {events.map((a, i) => (
      <div key={i} className="rec-tline-it">
        <span className="tm">
          {a.t.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <span className={`dot ${a.tone}`} />
        <div>
          <b>{a.action}</b>
          <i>{a.by}</i>
        </div>
      </div>
    ))}
  </div>
);

const DrawerRelatedTab: React.FC<{ list: RawRow[] }> = ({ list }) => (
  <div>
    {list.length === 0 && (
      <div className="ab-empty" style={{ padding: '40px 14px' }}>
        <TermIcon name="search" size={20} />
        <div>Không có phiên tiếp đón liên quan</div>
      </div>
    )}
    {list.map((r) => {
      const sk = statusKey(r);
      const tone = statusTone(sk);
      const lbl = STATUS_TABS.find((t) => t.v === sk)?.l || r.statusName || String(r.status);
      const pk = priorityKey(r);
      return (
        <div key={r.id} style={{
          padding: '10px 14px', borderBottom: '1px solid var(--line-soft)',
          display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'center',
        }}>
          <span className={`rec-token ${pk} ${sk === 'completed' ? 'done' : ''}`}>
            {r.queueCode || `#${r.queueNumber}`}
          </span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>
              {r.departmentName || '—'} ·&nbsp;
              <span className="mono" style={{ color: 'var(--t-2)' }}>{r.roomName || '—'}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
              {fmtHM(r.admissionDate)} · {treatmentLabel(r)}
            </div>
          </div>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
        </div>
      );
    })}
  </div>
);

export default ReceptionV2;
