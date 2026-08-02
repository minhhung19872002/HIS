import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useRegisterCommands } from '@/contexts/CommandContext';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import * as receptionApi from '../api/reception';
import type { RoomOverviewDto } from '../api/reception';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell,
  type ColumnDef,
} from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Reception v2 — Tiếp đón
   Layout: KpiStrip + TopTabs (queue / now / stats) + per-tab body
   Reflects design pack: design-system-v2/his/project/Reception v2.html
   ──────────────────────────────────────────────────────────── */

import type { RawRow, TopKey, StatusKey } from './shared';
import { TOP_TABS, STATUS_TABS, PRIORITY_OPTS, VISIT_TYPE_OPTS, fmtHM, statusKey, statusTone, priorityKey, priorityLabel, genderLabel, ageOf, treatmentLabel, hasValidInsurance } from './shared';
import { NewVisitModal } from './NewVisitModal';
import { NowServingTab } from './NowServingTab';
import { StatsTab } from './StatsTab';
import { VisitDrawerBody } from './VisitDrawerBody';
import { BhytVerifyModal } from './BhytVerifyModal';
import { PatientLookupModal } from './PatientLookupModal';
import { MoveRoomModal } from './MoveRoomModal';
import { ReceptionPayModal } from './ReceptionPayModal';
import { PrintRequestFormModal, printBarcodeLabel } from './ReceptionPrintModals';
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
  const [moveFor, setMoveFor]   = useState<RawRow | null>(null);
  const [payFor, setPayFor]     = useState<RawRow | null>(null);
  const [ms03For, setMs03For]   = useState<RawRow | null>(null);
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
        // Không nuốt lỗi: hiện thông báo để phân biệt "tải phòng khám lỗi" với "thật sự 0 phòng".
        // (401/token hết hạn đã được interceptor đưa về /login.)
        setRooms([]);
        message.warning('Không tải được danh sách phòng khám. Vui lòng thử lại.');
      }
      setLoading(false);
    });
  }, [message]);

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

  // In nhãn mã vạch hồ sơ (backend Code128 PDF 60x30mm — NangCap18). Port verbatim
  // từ v1 detail-modal footer "In nhãn mã vạch".
  const onPrintMrBarcode = async (r: RawRow) => {
    try {
      const res = await receptionApi.printMedicalRecordBarcode(r.id);
      const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }));
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      message.error('Không in được nhãn mã vạch');
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

  // F2=đăng ký mới (save) · F3=gọi số (new) · F4=tìm BN (search) · F5=làm mới
  // Dùng command system thay raw useEffect để tránh double-fire với TerminalLayout shell.
  useRegisterCommands({
    save: () => setNewOpen(true),
    new: onCallNext,
    search: () => setLookupOpen(true),
    refresh: loadData,
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
        ? <span className="chip ok mono" style={{ fontSize: 'var(--fs-xs)' }}>{r.insuranceNumber.slice(0, 10)}…</span>
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
            <Btn variant="ghost" onClick={loadData}>
              <TermIcon name="refresh" size={12} /> Làm mới
            </Btn>
            <Btn variant="ghost" onClick={() => setBhytOpen(true)}>
              <TermIcon name="shield" size={12} /> Tra cứu BHYT
            </Btn>
            <Btn variant="ghost" onClick={() => setLookupOpen(true)}>
              <TermIcon name="search" size={12} /> Tìm BN cũ <kbd>F4</kbd>
            </Btn>
            <Btn variant="ok" onClick={onCallNext}>
              <TermIcon name="bell" size={12} /> Gọi số tiếp <kbd>F3</kbd>
            </Btn>
            <Btn variant="primary" onClick={() => setNewOpen(true)}>
              <TermIcon name="plus" size={12} /> Đăng ký mới <kbd>F2</kbd>
            </Btn>
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
            <Btn variant="ghost" onClick={onResetFilter}>
              <TermIcon name="refresh" size={12} /> Bỏ lọc
            </Btn>
            <span className="spacer" />
            <Btn variant="ghost" onClick={onExport}>
              <TermIcon name="download" size={12} /> Xuất
            </Btn>
          </div>

          {selRows.size > 0 && (
            <div className="ab-bulk">
              <TermIcon name="check" size={13} /> Đã chọn <b>{selRows.size}</b> phiên
              <span className="spacer" />
              <Btn variant="primary" onClick={onBulkPrint}>
                <TermIcon name="print" size={12} /> In hàng loạt
              </Btn>
              <Btn variant="ghost" onClick={() => setSelRows(new Set())}>
                Bỏ chọn
              </Btn>
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
                  {sk !== 'completed' && (
                    <ActBtn ic="dollar" title="Thu phí" onClick={() => setPayFor(r)} />
                  )}
                  {sk !== 'completed' && (
                    <ActBtn ic="refresh" title="Đổi phòng" onClick={() => setMoveFor(r)} />
                  )}
                  <ActBtn ic="print" title="In phiếu" onClick={() => onPrint(r)} />
                  <ActBtn ic="file" title="In giấy yêu cầu (MS 03/BV-02)" onClick={() => setMs03For(r)} />
                  <ActBtn ic="scan" title="In mã vạch BN" onClick={() => printBarcodeLabel(r)} />
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
                  <Btn variant="ghost" onClick={onResetFilter}>Bỏ lọc</Btn>
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
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>
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
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            <Btn onClick={() => onPrint(detail)}>
              <TermIcon name="print" size={12} /> In phiếu
            </Btn>
            <Btn variant="ghost" onClick={() => onPrintMrBarcode(detail)}>
              <TermIcon name="scan" size={12} /> Nhãn mã vạch
            </Btn>
            {(statusKey(detail) === 'waiting' || statusKey(detail) === 'noshow') && (
              <Btn variant="primary" onClick={() => { onCheckin(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> {statusKey(detail) === 'noshow' ? 'Gọi lại' : 'Bắt đầu khám'}
              </Btn>
            )}
            {(statusKey(detail) === 'serving' || statusKey(detail) === 'waitresult') && (
              <Btn variant="ok" onClick={() => { onComplete(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Hoàn thành
              </Btn>
            )}
          </>
        ) : null}
      >
        {detail && <VisitDrawerBody v={detail} rows={rows} />}
        {detail && <FingerprintPanel patientId={detail.patientId} />}
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

      {/* Đổi phòng */}
      <MoveRoomModal
        row={moveFor}
        rooms={rooms}
        onClose={() => setMoveFor(null)}
        onDone={() => { setMoveFor(null); loadData(); }}
      />

      {/* Thu phí */}
      <ReceptionPayModal
        row={payFor}
        onClose={() => setPayFor(null)}
        onDone={() => { setPayFor(null); loadData(); }}
      />

      {/* In Giấy khám chữa bệnh theo yêu cầu (MS: 03/BV-02) */}
      <PrintRequestFormModal row={ms03For} onClose={() => setMs03For(null)} />
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   F11.2 — Vân tay tiếp đón: lưu dấu vân tay (ảnh→base64) hoặc cờ
   "không thu thập được" cho hồ sơ bệnh nhân (api/reception.saveFingerprint).
   ──────────────────────────────────────────────────────────── */
const FingerprintPanel: React.FC<{ patientId?: string }> = ({ patientId }) => {
  const { message } = AntdApp.useApp();
  const [notCollected, setNotCollected] = useState(false);
  const [fpName, setFpName] = useState('');
  const [fpData, setFpData] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const onFile = (file?: File) => {
    if (!file) { setFpData(undefined); setFpName(''); return; }
    const reader = new FileReader();
    reader.onload = () => { setFpData(String(reader.result)); setFpName(file.name); };
    reader.readAsDataURL(file);
  };
  const save = async () => {
    if (!patientId) { message.warning('Không xác định được bệnh nhân để lưu vân tay'); return; }
    setSaving(true);
    try {
      await receptionApi.saveFingerprint(patientId, { fingerprintData: notCollected ? undefined : fpData, notCollected });
      message.success('Đã lưu vân tay tiếp đón');
    } catch { message.error('Lưu vân tay thất bại'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ marginTop: 'var(--space-14)', borderTop: '1px solid var(--line-soft)', paddingTop: 'var(--space-12)' }}>
      <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--t-1)', marginBottom: 'var(--space-8)' }}>
        <TermIcon name="user" size={12} /> Vân tay tiếp đón
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', fontSize: 12.5, marginBottom: 'var(--space-8)' }}>
        <input type="checkbox" checked={notCollected} onChange={(e) => setNotCollected(e.target.checked)} />
        Không thu thập được vân tay
      </label>
      {!notCollected && (
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} style={{ fontSize: 'var(--fs-sm)' }} />
          {fpName && <span style={{ fontSize: 11.5, color: 'var(--t-2)', marginLeft: 'var(--space-8)' }}>{fpName}</span>}
        </div>
      )}
      <Btn variant="primary" icon="check" loading={saving} onClick={save}>Lưu vân tay</Btn>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   New-visit registration modal — creates a real admission via
   registerFeePatient (viện phí/dịch vụ) or registerInsurancePatient (BHYT).
   A linked QueueTicket is created by the backend, so the new row's
   check-in/print actions work end-to-end.
   ──────────────────────────────────────────────────────────── */

// Hình thức khám (port mock VISIT_TYPES) — kèm icon, phí, serviceType, cờ BHYT.
export default ReceptionV2;
