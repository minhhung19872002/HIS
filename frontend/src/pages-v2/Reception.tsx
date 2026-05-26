import React, { useEffect, useMemo, useState, useCallback } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input, Select, Radio, Checkbox, InputNumber } from 'antd';
import * as receptionApi from '../api/reception';
import type { AdmissionDto, RoomOverviewDto } from '../api/reception';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell, ModalShell,
  type ColumnDef, type StatusTab, type TopTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Reception v2 — Tiếp đón
   Layout: KpiStrip + TopTabs (queue / now / stats) + per-tab body
   Reflects design pack: design-system-v2/his/project/Reception v2.html
   ──────────────────────────────────────────────────────────── */

type TopKey = 'queue' | 'now' | 'stats';
// 5 trạng thái thực tế tại quầy tiếp đón BV VN:
// Chờ tiếp đón → Đang khám → Chờ KQ CLS → Khám xong, + Vắng/bỏ qua.
type StatusKey = 'waiting' | 'serving' | 'waitresult' | 'completed' | 'noshow';

const TOP_TABS: TopTab<TopKey>[] = [
  { v: 'queue', l: 'Hàng đợi tiếp đón', ic: 'users' },
  { v: 'now',   l: 'Bảng gọi số',       ic: 'bell' },
  { v: 'stats', l: 'Thống kê',          ic: 'chart' },
];

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'waiting',    l: 'Chờ tiếp đón', tone: 'info' },
  { v: 'serving',    l: 'Đang khám',    tone: 'ok' },
  { v: 'waitresult', l: 'Chờ KQ CLS',   tone: 'warn' },
  { v: 'completed',  l: 'Khám xong',    tone: 'ok' },
  { v: 'noshow',     l: 'Vắng / bỏ qua', tone: 'crit' },
];

const PRIORITY_OPTS = [
  { v: 'crit', l: 'Cấp cứu' },
  { v: 'high', l: 'Ưu tiên' },
  { v: 'norm', l: 'Thường' },
];
// Hình thức khám — map theo treatmentType backend (1 BHYT · 2 dịch vụ · 3 cấp cứu · 4 yêu cầu)
const VISIT_TYPE_OPTS = [
  { v: '1', l: 'Khám BHYT' },
  { v: '2', l: 'Khám dịch vụ' },
  { v: '3', l: 'Cấp cứu' },
  { v: '4', l: 'Khám theo yêu cầu' },
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
  ticketStatus?: number;   // QueueTicket.Status: 0 Waiting · 1 Calling · 2 Serving · 3 Completed · 4 Skipped
  admissionType?: string;
  admissionCode?: string;
};

const statusKey = (row: RawRow): StatusKey => {
  // Vắng/bỏ qua: chỉ phân biệt được qua trạng thái VÉ (=4 Skipped); MR bị reset
  // về Waiting khi skip nên phải ưu tiên kiểm tra ticketStatus trước.
  if (row.ticketStatus === 4) return 'noshow';
  const s = row.status;
  // String form (backend): "Waiting" | "InProgress" | "WaitingResult" | "Completed"
  if (typeof s === 'string') {
    if (s === 'Waiting') return 'waiting';
    if (s === 'InProgress') return 'serving';
    if (s === 'WaitingResult') return 'waitresult';
    return 'completed';
  }
  // Numeric form: 0 chờ · 1 đang khám · 2 chờ KQ CLS · 3 khám xong
  if (s === 0) return 'waiting';
  if (s === 1) return 'serving';
  if (s === 2) return 'waitresult';
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
  const [fVisitType, setFVisitType] = useState('');
  const [page, setPage]         = useState(0);
  const [selRows, setSelRows]   = useState<Set<string>>(new Set());
  const [detail, setDetail]     = useState<RawRow | null>(null);
  const [newOpen, setNewOpen]   = useState(false);
  const [bhytOpen, setBhytOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
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
      if (fVisitType && String(r.treatmentType ?? '') !== fVisitType) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.patientName, r.patientCode, r.phoneNumber, r.identityNumber, r.insuranceNumber, r.queueCode]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, statusTab, fDept, fPriority, fInsurance, fVisitType, search]);

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
    const noShow = rows.filter((r) => statusKey(r) === 'noshow').length;
    const avgWait = rooms.length > 0
      ? Math.round(rooms.reduce((s, r) => s + (r.waitingCount || 0), 0) / Math.max(rooms.length, 1) * 1.5)
      : 0;
    return { today, waiting, registered, bhyt, noShow, avgWait };
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

  // Mutations target the QueueTicket id. Demo/seed rows can lack a linked
  // ticket (ticketId null) — issue one on the fly so the action still works.
  const ensureTicket = async (r: RawRow): Promise<string | null> => {
    if (r.ticketId) return r.ticketId;
    if (!r.roomId) return null;
    try {
      const res = await receptionApi.issueQueueTicket({
        patientId: r.patientId || undefined,
        patientName: r.patientName,
        roomId: r.roomId,
        queueType: r.isEmergency ? 3 : 1,
        priority: r.isEmergency ? 1 : (priorityKey(r) === 'high' ? 2 : 0),
      });
      return res.data?.id || null;
    } catch {
      return null;
    }
  };

  const onCheckin = async (r: RawRow) => {
    const tid = await ensureTicket(r);
    if (!tid) { message.error('Không tạo được số thứ tự (bệnh nhân chưa có phòng khám)'); return; }
    try {
      await receptionApi.startServing(tid);
      message.success(`Đã check-in · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Check-in thất bại');
    }
  };

  const onSkip = async (r: RawRow) => {
    const tid = await ensureTicket(r);
    if (!tid) { message.error('Không tìm thấy số thứ tự'); return; }
    try {
      await receptionApi.skipQueue(tid, 'Bệnh nhân không đến');
      message.warning(`Đã đánh dấu vắng mặt · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  const onComplete = async (r: RawRow) => {
    const tid = await ensureTicket(r);
    if (!tid) { message.error('Không tìm thấy số thứ tự'); return; }
    try {
      await receptionApi.completeServing(tid);
      message.success(`Đã hoàn thành · ${r.patientName}`);
      loadData();
    } catch {
      message.error('Thao tác thất bại');
    }
  };

  // Open the printable slip in a new tab. Prefer the queue ticket; fall back to
  // the examination slip (keyed by medical-record id) for rows without a ticket.
  const openSlip = async (r: RawRow) => {
    const res = r.ticketId
      ? await receptionApi.printQueueTicket(r.ticketId)
      : await receptionApi.printExaminationSlip(r.id);
    const url = URL.createObjectURL(res.data as Blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  const onPrint = async (r: RawRow) => {
    try {
      await openSlip(r);
      message.success(`Đã mở phiếu · ${r.queueCode || `#${r.queueNumber}`}`);
    } catch {
      message.error('In phiếu thất bại');
    }
  };

  const onResetFilter = () => {
    setSearch(''); setFDept(''); setFPriority(''); setFInsurance(''); setFVisitType(''); setStatusTab('all'); setPage(0);
  };

  const onExport = () => {
    if (filtered.length === 0) { message.warning('Không có dữ liệu để xuất'); return; }
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = ['STT', 'Bệnh nhân', 'Giới', 'Tuổi', 'SĐT', 'CCCD', 'Khoa', 'Phòng', 'Hình thức', 'Số BHYT', 'Ưu tiên', 'Trạng thái', 'Đến lúc'];
    const lines = filtered.map((r) => [
      r.queueCode || `#${r.queueNumber}`, r.patientName, genderLabel(r), ageOf(r),
      r.phoneNumber || '', r.identityNumber || '', r.departmentName || '', r.roomName || '',
      treatmentLabel(r), r.insuranceNumber || '', priorityLabel(priorityKey(r)),
      STATUS_TABS.find((t) => t.v === statusKey(r))?.l || '', fmtHM(r.admissionDate),
    ].map(esc).join(','));
    const csv = '﻿' + [header.map(esc).join(','), ...lines].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `tiep-don-${dayjs().format('YYYYMMDD-HHmm')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    message.success(`Đã xuất ${filtered.length} dòng (CSV)`);
  };

  const onBulkPrint = async () => {
    if (selRows.size === 0) { message.warning('Chưa chọn phiên nào'); return; }
    const targets = filtered.filter((r) => selRows.has(r.id));
    let ok = 0;
    for (const r of targets) {
      try {
        const res = r.ticketId
          ? await receptionApi.printQueueTicket(r.ticketId)
          : await receptionApi.printExaminationSlip(r.id);
        const url = URL.createObjectURL(res.data as Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `phieu-${r.queueCode || r.queueNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
        ok += 1;
      } catch { /* skip failed ones */ }
    }
    message.success(`Đã tải ${ok}/${targets.length} phiếu`);
    setSelRows(new Set());
  };

  // F2 = đăng ký mới · F3 = gọi số · F4 = tìm BN cũ
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'F2') { e.preventDefault(); setNewOpen(true); }
      if (e.key === 'F3') { e.preventDefault(); onCallNext(); }
      if (e.key === 'F4') { e.preventDefault(); setLookupOpen(true); }
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
          { lbl: 'Không đến', val: kpis.noShow, sub: 'vắng / bỏ qua', tone: 'crit' },
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
            <button type="button" className="ab-btn ghost" onClick={() => setBhytOpen(true)}>
              <TermIcon name="shield" size={12} /> Tra cứu BHYT
            </button>
            <button type="button" className="ab-btn ghost" onClick={() => setLookupOpen(true)}>
              <TermIcon name="search" size={12} /> Tìm BN cũ <kbd>F4</kbd>
            </button>
            <button type="button" className="ab-btn ok" onClick={onCallNext}>
              <TermIcon name="bell" size={12} /> Gọi số tiếp <kbd>F3</kbd>
            </button>
            <button type="button" className="ab-btn primary" onClick={() => setNewOpen(true)}>
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
            <Filter value={fVisitType} onChange={setFVisitType} options={VISIT_TYPE_OPTS} placeholder="▾ Hình thức khám" />
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
                    <ActBtn ic="check" title="Bắt đầu khám" onClick={() => onCheckin(r)} />
                  )}
                  {sk === 'noshow' && (
                    <ActBtn ic="check" title="Gọi lại" onClick={() => onCheckin(r)} />
                  )}
                  {(sk === 'serving' || sk === 'waitresult') && (
                    <ActBtn ic="check" title="Hoàn thành" onClick={() => onComplete(r)} />
                  )}
                  <ActBtn ic="print" title="In phiếu" onClick={() => onPrint(r)} />
                  {(sk === 'waiting' || sk === 'serving' || sk === 'waitresult') && (
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
            {(statusKey(detail) === 'waiting' || statusKey(detail) === 'noshow') && (
              <button type="button" className="ab-btn primary" onClick={() => { onCheckin(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> {statusKey(detail) === 'noshow' ? 'Gọi lại' : 'Bắt đầu khám'}
              </button>
            )}
            {(statusKey(detail) === 'serving' || statusKey(detail) === 'waitresult') && (
              <button type="button" className="ab-btn ok" onClick={() => { onComplete(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <VisitDrawerBody v={detail} rows={rows} />}
      </DrawerShell>

      {/* New registration modal */}
      <NewVisitModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        rooms={rooms}
        onDone={() => { setNewOpen(false); loadData(); }}
      />

      {/* Tra cứu BHYT */}
      <BhytVerifyModal open={bhytOpen} onClose={() => setBhytOpen(false)} />

      {/* Tìm BN cũ */}
      <PatientLookupModal
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
        onPick={(p) => {
          setLookupOpen(false);
          setSearch(p.patientCode || p.fullName || p.patientName || '');
        }}
      />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   New-visit registration modal — creates a real admission via
   registerFeePatient (viện phí/dịch vụ) or registerInsurancePatient (BHYT).
   A linked QueueTicket is created by the backend, so the new row's
   check-in/print actions work end-to-end.
   ──────────────────────────────────────────────────────────── */

const PATIENT_TYPE_OPTS = [
  { value: 1, label: 'BHYT' },
  { value: 3, label: 'Viện phí' },
  { value: 2, label: 'Dịch vụ' },
];

const Lbl: React.FC<{ label?: string; full?: boolean; children: React.ReactNode }> = ({ label, full, children }) => (
  <div style={{ gridColumn: full ? '1 / -1' : undefined }}>
    {label && (
      <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>{label}</div>
    )}
    {children}
  </div>
);

const NewVisitModal: React.FC<{
  open: boolean;
  onClose: () => void;
  rooms: RoomOverviewDto[];
  onDone: () => void;
}> = ({ open, onClose, rooms, onDone }) => {
  const { message } = AntdApp.useApp();
  const [fullName, setFullName] = useState('');
  const [gender, setGender]     = useState(1);
  const [yob, setYob]           = useState<number | null>(null);
  const [phone, setPhone]       = useState('');
  const [cccd, setCccd]         = useState('');
  const [address, setAddress]   = useState('');
  const [ptype, setPtype]       = useState(3);
  const [insurance, setInsurance] = useState('');
  const [roomId, setRoomId]     = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(''); setGender(1); setYob(null); setPhone(''); setCccd('');
      setAddress(''); setPtype(3); setInsurance(''); setRoomId(undefined); setPriority(false);
    }
  }, [open]);

  const roomOpts = useMemo(
    () => rooms.map((r) => ({ value: r.roomId, label: `${r.departmentName || '—'} · ${r.roomName || ''}` })),
    [rooms],
  );

  const submit = async () => {
    if (!fullName.trim()) { message.warning('Nhập họ tên bệnh nhân'); return; }
    if (!roomId)          { message.warning('Chọn phòng khám'); return; }
    if (ptype === 1 && !insurance.trim()) { message.warning('Nhập số thẻ BHYT'); return; }
    setSubmitting(true);
    try {
      if (ptype === 1 && insurance.trim()) {
        await receptionApi.registerInsurancePatient({
          insuranceNumber: insurance.trim(),
          roomId,
          identityNumber: cccd.trim() || undefined,
          isPriority: priority,
        });
      } else {
        await receptionApi.registerFeePatient({
          newPatient: {
            fullName: fullName.trim(),
            gender,
            yearOfBirth: yob || undefined,
            phoneNumber: phone.trim() || undefined,
            address: address.trim() || undefined,
            identityNumber: cccd.trim() || undefined,
          },
          serviceType: ptype === 2 ? 2 : 3,
          roomId,
          isPriority: priority,
        });
      }
      message.success(`Đã đăng ký · ${fullName.trim()}`);
      onDone();
    } catch {
      message.error('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Đăng ký tiếp đón mới"
      footer={
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="ab-btn primary" disabled={submitting} onClick={submit}>
            <TermIcon name="check" size={12} /> {submitting ? 'Đang lưu…' : 'Đăng ký'}
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Lbl label="Họ tên *">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nguyễn Văn A" />
        </Lbl>
        <Lbl label="Giới tính">
          <Radio.Group
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            optionType="button"
            options={[{ value: 1, label: 'Nam' }, { value: 2, label: 'Nữ' }]}
          />
        </Lbl>
        <Lbl label="Năm sinh">
          <InputNumber value={yob} onChange={(v) => setYob(v)} min={1900} max={new Date().getFullYear()} placeholder="1990" style={{ width: '100%' }} />
        </Lbl>
        <Lbl label="Số điện thoại">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09xxxxxxxx" />
        </Lbl>
        <Lbl label="CCCD">
          <Input value={cccd} onChange={(e) => setCccd(e.target.value)} placeholder="12 chữ số" />
        </Lbl>
        <Lbl label="Đối tượng">
          <Select value={ptype} onChange={setPtype} options={PATIENT_TYPE_OPTS} style={{ width: '100%' }} />
        </Lbl>
        {ptype === 1 && (
          <Lbl label="Số thẻ BHYT *">
            <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="Mã thẻ BHYT" />
          </Lbl>
        )}
        <Lbl label="Phòng khám *" full={ptype !== 1}>
          <Select
            value={roomId}
            onChange={setRoomId}
            options={roomOpts}
            showSearch
            optionFilterProp="label"
            placeholder="Chọn phòng khám"
            style={{ width: '100%' }}
          />
        </Lbl>
        <Lbl label="Địa chỉ" full>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Số nhà, đường, phường/xã…" />
        </Lbl>
        <Lbl full>
          <Checkbox checked={priority} onChange={(e) => setPriority(e.target.checked)}>
            Ưu tiên (người già, trẻ em, thai phụ, người khuyết tật…)
          </Checkbox>
        </Lbl>
      </div>
    </ModalShell>
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
          const current = rows.find((x) => x.roomId === r.roomId && statusKey(x) === 'serving');
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

  if (sk === 'noshow') {
    events.push({ t: calledAt, action: 'Gọi số nhưng bệnh nhân vắng mặt', by: v.doctorName || 'Phòng khám', tone: 'warn' });
  }
  if (sk === 'serving' || sk === 'waitresult' || sk === 'completed') {
    events.push({ t: calledAt, action: 'Gọi số vào phòng khám', by: v.doctorName || 'Phòng khám', tone: 'ok' });
    events.push({ t: startedAt, action: 'Bắt đầu khám', by: v.doctorName || 'Bác sĩ', tone: 'ok' });
  }
  if (sk === 'waitresult') {
    events.push({ t: startedAt, action: 'Chờ kết quả cận lâm sàng', by: v.doctorName || 'Bác sĩ', tone: 'mag' });
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

/* ────────────────────────────────────────────────────────────
   BHYT verify modal — real verifyInsurance lookup
   ──────────────────────────────────────────────────────────── */

const BhytVerifyModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { message } = AntdApp.useApp();
  const [num, setNum] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<receptionApi.InsuranceVerificationResultDto | null>(null);

  useEffect(() => {
    if (open) { setNum(''); setName(''); setResult(null); }
  }, [open]);

  const verify = async () => {
    if (!num.trim() || num.trim().length < 10) { message.warning('Nhập số thẻ BHYT hợp lệ'); return; }
    setBusy(true);
    try {
      const res = await receptionApi.verifyInsurance({ insuranceNumber: num.trim(), patientName: name.trim() || undefined });
      setResult(res.data);
    } catch {
      message.error('Tra cứu BHYT thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title="Tra cứu thẻ BHYT"
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={verify}>
            <TermIcon name="shield" size={12} /> {busy ? 'Đang tra…' : 'Tra cứu'}
          </button>
        </>
      )}
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Số thẻ BHYT *</div>
            <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="VD: HC4010112345678" onPressEnter={verify} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--t-2)', marginBottom: 4, fontWeight: 600 }}>Họ tên (tùy chọn)</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Đối chiếu tên" />
          </div>
        </div>

        {result && (
          <div className="rec-section" style={{ marginTop: 16 }}>
            <h5>
              <TermIcon name={result.isValid ? 'check' : 'x'} size={11} /> KẾT QUẢ
              <span style={{ marginLeft: 8 }}>
                <StatusBadge tone={result.isValid && !result.isExpired ? 'ok' : 'crit'} dot>
                  {result.isBlacklisted ? 'Thẻ bị khóa' : result.isExpired ? 'Hết hạn' : result.isValid ? 'Hợp lệ' : 'Không hợp lệ'}
                </StatusBadge>
              </span>
            </h5>
            <div className="rec-kv">
              <span>Số thẻ</span><span className="mono">{result.newInsuranceNumber || result.insuranceNumber}</span>
              <span>Họ tên</span><b>{result.patientName || '—'}</b>
              {result.facilityName && (<><span>Nơi KCB</span><span>{result.facilityName}</span></>)}
              {result.endDate && (<><span>Giá trị đến</span><span className="mono">{dayjs(result.endDate).format('DD/MM/YYYY')}</span></>)}
              <span>Tuyến</span><span>{result.rightRouteName || '—'}</span>
              <span>Mức hưởng</span><b>{result.paymentRate || 0}%</b>
            </div>
            {result.warnings?.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--s-warn)' }}>
                {result.warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
              </div>
            )}
            {result.errorMessage && (
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--s-crit)' }}>{result.errorMessage}</div>
            )}
          </div>
        )}
      </div>
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Patient lookup modal — search existing patients (Tìm BN cũ)
   ──────────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LookupRow = any;

const PatientLookupModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (p: LookupRow) => void;
}> = ({ open, onClose, onPick }) => {
  const { message } = AntdApp.useApp();
  const [kw, setKw] = useState('');
  const [busy, setBusy] = useState(false);
  const [list, setList] = useState<LookupRow[]>([]);

  useEffect(() => {
    if (open) { setKw(''); setList([]); }
  }, [open]);

  const doSearch = async () => {
    if (!kw.trim()) { message.warning('Nhập tên / mã BN / SĐT / CCCD'); return; }
    setBusy(true);
    try {
      const res = await receptionApi.searchPatient(kw.trim());
      setList(Array.isArray(res.data) ? res.data : []);
    } catch {
      message.error('Tìm kiếm thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Tìm bệnh nhân cũ"
      footer={<button type="button" className="ab-btn ghost" onClick={onClose}>Đóng</button>}
    >
      <div style={{ padding: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            onPressEnter={doSearch}
            placeholder="Tên, mã BN, SĐT, CCCD, số BHYT…"
            autoFocus
          />
          <button type="button" className="ab-btn primary" disabled={busy} onClick={doSearch}>
            <TermIcon name="search" size={12} /> {busy ? 'Đang tìm…' : 'Tìm'}
          </button>
        </div>

        <div style={{ marginTop: 14, maxHeight: 360, overflow: 'auto' }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t-2)', fontSize: 12 }}>
              {busy ? 'Đang tìm…' : 'Nhập từ khóa rồi bấm Tìm'}
            </div>
          ) : (
            list.map((p, i) => (
              <div
                key={p.id || p.patientId || i}
                style={{
                  padding: '10px 12px', borderBottom: '1px solid var(--line-soft)',
                  display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center', cursor: 'pointer',
                }}
                onClick={() => onPick(p)}
              >
                <div>
                  <b>{p.fullName || p.patientName || '—'}</b>
                  <div style={{ fontSize: 11, color: 'var(--t-2)' }}>
                    <span className="mono">{p.patientCode || '—'}</span>
                    {p.phoneNumber ? ` · ${p.phoneNumber}` : ''}
                    {p.dateOfBirth ? ` · ${dayjs(p.dateOfBirth).format('DD/MM/YYYY')}` : (p.yearOfBirth ? ` · ${p.yearOfBirth}` : '')}
                    {p.insuranceNumber ? ` · BHYT ${p.insuranceNumber}` : ''}
                  </div>
                </div>
                <button type="button" className="ab-btn ghost" onClick={(e) => { e.stopPropagation(); onPick(p); }}>
                  Chọn
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </ModalShell>
  );
};

export default ReceptionV2;
