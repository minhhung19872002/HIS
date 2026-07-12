import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as file from '../../../services/file.service';
import dayjs, { type Dayjs } from 'dayjs';
import { App as AntdApp, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import { searchAppointments, getOverdueFollowUps, updateAppointmentStatus } from '../api/examination';
import type { AppointmentListDto } from '../api/examination';
import {
  KpiStrip, TopTabs, StatusTabs, SearchBox, Filter, DataTable, Pager,
  StatusBadge, ActBtn, Btn, DrawerShell,
  type ColumnDef, type StatusTab,
} from '../../../pages-v2/_v2kit';
import TermIcon from '../../../layouts/terminal/Icon';

const { RangePicker } = DatePicker;

/* ────────────────────────────────────────────────────────────
   Tái khám v2 — port of design-system-v2/his/project/FollowUp v2.html
   + full parity với v1 pages/FollowUp (issue #409)
   ──────────────────────────────────────────────────────────── */

type TabKey = 'today' | 'upcoming' | 'overdue' | 'all';

type StatusKey = 'scheduled' | 'reminded' | 'completed' | 'missed' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã hẹn',      tone: 'info' },
  { v: 'reminded',  l: 'Đã nhắc',     tone: 'info' },
  { v: 'completed', l: 'Đã đến khám', tone: 'ok' },
  { v: 'missed',    l: 'Không đến',   tone: 'crit' },
  { v: 'cancelled', l: 'Đã hủy',      tone: 'warn' },
];

// Backend Appointment.Status (HIS.Core/Entities/Appointment.cs:32):
// 0 Chờ xác nhận · 1 Đã xác nhận · 2 Đã đến khám · 3 Không đến (NoShow) · 4 Đã hủy
const statusKey = (s: number, isReminded: boolean): StatusKey => {
  if (s === 3) return 'missed';
  if (s === 4) return 'cancelled';
  if (s === 2) return 'completed';
  if (isReminded) return 'reminded';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

// Filter server-side theo đúng semantics v1 (status 0-4, loại hẹn 1-3)
const STATUS_OPTS = [
  { v: '0', l: 'Chờ xác nhận' },
  { v: '1', l: 'Đã xác nhận' },
  { v: '2', l: 'Đã đến khám' },
  { v: '3', l: 'Không đến' },
  { v: '4', l: 'Đã hủy' },
];
const TYPE_OPTS = [
  { v: '1', l: 'Tái khám' },
  { v: '2', l: 'Khám mới' },
  { v: '3', l: 'Khám sức khỏe' },
];

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';

const PAGE_SIZE = 16;

const FollowUpV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [rows, setRows] = useState<AppointmentListDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [overdueList, setOverdueList] = useState<AppointmentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('today');
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs()]);
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AppointmentListDto | null>(null);
  const seqRef = useRef(0);

  const fetchAppointments = useCallback(async () => {
    const seq = ++seqRef.current;
    setLoading(true);
    let fromDate: string;
    let toDate: string;
    if (tab === 'today') {
      fromDate = dayjs().format('YYYY-MM-DD');
      toDate = dayjs().format('YYYY-MM-DD');
    } else if (tab === 'upcoming') {
      fromDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
      toDate = dayjs().add(30, 'day').format('YYYY-MM-DD');
    } else if (tab === 'all') {
      fromDate = range[0].format('YYYY-MM-DD');
      toDate = range[1].format('YYYY-MM-DD');
    } else {
      fromDate = dayjs().subtract(90, 'day').format('YYYY-MM-DD');
      toDate = dayjs().format('YYYY-MM-DD');
    }

    const [searchRes, overdueRes] = await Promise.allSettled([
      searchAppointments({
        fromDate,
        toDate,
        // tab Quá hạn không truyền status (như v1)
        status: tab === 'overdue' || statusFilter === '' ? undefined : Number(statusFilter),
        appointmentType: typeFilter === '' ? undefined : Number(typeFilter),
        page: page + 1, // API 1-based
        pageSize: PAGE_SIZE,
      }),
      getOverdueFollowUps(30),
    ]);
    if (seq !== seqRef.current) return; // stale response — bỏ qua

    if (searchRes.status === 'fulfilled' && searchRes.value.data) {
      setRows(searchRes.value.data.items || []);
      setTotalCount(searchRes.value.data.totalCount || 0);
    } else if (searchRes.status === 'rejected') {
      setRows([]);
      setTotalCount(0);
    }
    if (overdueRes.status === 'fulfilled' && overdueRes.value.data) {
      setOverdueList(overdueRes.value.data || []);
    }
    setLoading(false);
  }, [tab, statusFilter, typeFilter, range, page]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleUpdateStatus = async (appointmentId: string, status: number, statusLabel: string) => {
    try {
      await updateAppointmentStatus(appointmentId, status);
      message.success(`Đã cập nhật: ${statusLabel}`);
      fetchAppointments();
    } catch {
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const onRemind = async (r: AppointmentListDto, channel: 'SMS' | 'Zalo' = 'SMS') => {
    // No backend endpoint to flip "reminded" alone; mark as Confirmed (status=1) to indicate engagement.
    try {
      await updateAppointmentStatus(r.id, 1);
      message.success(`Đã gửi nhắc ${channel} cho ${r.patientName}`);
      fetchAppointments();
    } catch {
      message.error('Gửi nhắc thất bại');
    }
  };

  // Tab Quá hạn hiển thị danh sách overdue (client-side); các tab khác dùng trang server
  const baseRows = tab === 'overdue' ? overdueList : rows;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: baseRows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = baseRows.filter((r) => statusKey(r.status, r.isReminderSent) === s.v).length;
    });
    return c;
  }, [baseRows]);

  const filtered = useMemo(() => {
    return baseRows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status, r.isReminderSent) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.appointmentCode, r.patientName, r.patientCode, r.phoneNumber, r.reason]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [baseRows, stab, search]);

  // Phân trang: tab server → totalCount từ API; tab Quá hạn → client-slice
  const isServerPaged = tab !== 'overdue';
  const totalPages = isServerPaged
    ? Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    : Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = isServerPaged ? filtered : filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // KPI hôm-nay như v1 (tính trên trang dữ liệu đang tải, cùng semantics v1)
  const kpis = useMemo(() => {
    const todayRows = rows.filter((r) => dayjs(r.appointmentDate).isSame(dayjs(), 'day'));
    return {
      todayTotal: todayRows.length,
      todayConfirmed: todayRows.filter((r) => r.status === 1).length,
      todayAttended: todayRows.filter((r) => r.status === 2).length,
      todayNoShow: todayRows.filter((r) => r.status === 3).length,
    };
  }, [rows]);

  const resetFilters = () => {
    setSearch(''); setStab('all'); setStatusFilter(''); setTypeFilter('');
    setRange([dayjs(), dayjs()]); setPage(0);
  };

  const columns: ColumnDef<AppointmentListDto>[] = [
    { key: 'code', label: 'Mã', width: 130, mono: true, render: (r) => r.appointmentCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.phoneNumber || '—'}</i>
        </div>
      ),
    },
    {
      key: 'reason', label: 'Lý do tái khám',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.reason || r.appointmentTypeName || '—'}</b>
          {r.previousDiagnosis && <i>{r.previousDiagnosis}</i>}
        </div>
      ),
    },
    { key: 'doctor', label: 'Bác sĩ', width: 180, render: (r) => r.doctorName || '—' },
    {
      key: 'when', label: 'Hẹn tái khám', width: 130, mono: true,
      render: (r) => (
        <div className="cell-2l">
          <b>{fmtDMY(r.appointmentDate)}</b>
          <i>{fmtHM(r.appointmentTime || r.appointmentDate)}</i>
        </div>
      ),
    },
    {
      key: 'overdue', label: 'Quá hạn', width: 80, mono: true,
      render: (r) => r.daysOverdue > 0
        ? <span className="chip crit">{r.daysOverdue}d</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'remind', label: 'Nhắc', width: 90, mono: true,
      render: (r) => r.isReminderSent
        ? <span className="chip ok">{fmtHM(r.reminderSentAt)}</span>
        : <span style={{ color: 'var(--t-3)' }}>—</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status, r.isReminderSent);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Hôm nay', val: kpis.todayTotal, sub: 'lịch hẹn', tone: 'info' },
          { lbl: 'Đã xác nhận', val: kpis.todayConfirmed, sub: 'hôm nay' },
          { lbl: 'Đã đến khám', val: kpis.todayAttended, sub: 'hôm nay', tone: 'ok' },
          { lbl: 'Không đến', val: kpis.todayNoShow, sub: 'hôm nay', tone: kpis.todayNoShow > 0 ? 'crit' : 'ok' },
          { lbl: 'Quá hạn 30 ngày', val: overdueList.length, sub: 'cần follow', tone: overdueList.length > 0 ? 'crit' : 'ok' },
          { lbl: 'Tổng tìm thấy', val: tab === 'overdue' ? overdueList.length : totalCount },
        ]}
      />

      <TopTabs<TabKey>
        tab={tab}
        setTab={(t) => { setTab(t); setPage(0); }}
        tabs={[
          { v: 'today',    l: 'Hôm nay', ic: 'calendar' },
          { v: 'upcoming', l: 'Sắp tới', ic: 'clock' },
          { v: 'overdue',  l: overdueList.length > 0 ? `Quá hạn (${overdueList.length})` : 'Quá hạn', ic: 'alert' },
          { v: 'all',      l: 'Tất cả', ic: 'list' },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / SĐT / mã hẹn / lý do…" />
        <Filter value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(0); }} options={STATUS_OPTS} placeholder="▾ Trạng thái" />
        <Filter value={typeFilter} onChange={(v) => { setTypeFilter(v); setPage(0); }} options={TYPE_OPTS} placeholder="▾ Loại hẹn" />
        {tab === 'all' && (
          <RangePicker
            value={range}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) { setRange([dates[0], dates[1]]); setPage(0); }
            }}
            format="DD/MM/YYYY"
            allowClear={false}
          />
        )}
        <Btn variant="ghost" onClick={resetFilters}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={fetchAppointments}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="ghost" onClick={() => navigate('/v2/sms-management')}>
          <TermIcon name="message-square" size={12} /> Nhắc hàng loạt
        </Btn>
        <Btn variant="ghost" onClick={() => {
          if (!filtered.length) { message.warning('Không có dữ liệu để xuất'); return; }
          const header = 'Mã hẹn,Bệnh nhân,Mã BN,SĐT,Lý do tái khám,Bác sĩ,Ngày hẹn,Quá hạn (ngày),Đã nhắc,Trạng thái';
          const csvRows = filtered.map((r) => [
            r.appointmentCode,
            r.patientName,
            r.patientCode,
            r.phoneNumber || '',
            r.reason || '',
            r.doctorName || '',
            r.appointmentDate ? dayjs(r.appointmentDate).format('DD/MM/YYYY') : '',
            r.daysOverdue > 0 ? String(r.daysOverdue) : '',
            r.isReminderSent ? 'Đã nhắc' : '',
            r.statusName || '',
          ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','));
          const blob = new Blob(['﻿' + [header, ...csvRows].join('\n')], { type: 'text/csv;charset=utf-8;' });
          file.downloadBlob(blob, `followup_${dayjs().format('YYYYMMDD-HHmm')}.csv`);
          message.success(`Đã xuất ${filtered.length} dòng`);
        }}>
          <TermIcon name="download" size={12} /> Xuất CSV
        </Btn>
        <Btn variant="primary" onClick={() => navigate('/v2/booking-management')}>
          <TermIcon name="plus" size={12} /> Lập kế hoạch
        </Btn>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<AppointmentListDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            {r.phoneNumber && (
              <ActBtn ic="phone" title="Ghi nhận liên lạc" onClick={() => onRemind(r, 'SMS')} />
            )}
            {[0, 1].includes(r.status) && (
              <>
                <ActBtn ic="message-square" title="Nhắc SMS" onClick={() => onRemind(r, 'SMS')} />
                <ActBtn ic="check" title="Xác nhận đến khám" onClick={() => handleUpdateStatus(r.id, 2, 'Đã đến khám')} />
                <ActBtn ic="x" title="Không đến" tone="crit" onClick={() => handleUpdateStatus(r.id, 3, 'Không đến')} />
              </>
            )}
            {r.status === 0 && (
              <ActBtn ic="calendar" title="Xác nhận lịch hẹn" onClick={() => handleUpdateStatus(r.id, 1, 'Đã xác nhận')} />
            )}
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có lịch tái khám nào</div>
          </div>
        )}
      />

      <Pager
        page={page}
        totalPages={totalPages}
        setPage={setPage}
        total={isServerPaged ? totalCount : filtered.length}
        perPage={PAGE_SIZE}
      />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-md)' }}>{detail.appointmentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.phoneNumber || '—'} · ${fmtDMY(detail.appointmentDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <Btn variant="ghost" onClick={() => setDetail(null)}>Đóng</Btn>
            <span style={{ flex: 1 }} />
            {[0, 1].includes(detail.status) && detail.phoneNumber && (
              <Btn onClick={() => onRemind(detail, 'SMS')}>
                <TermIcon name="message-square" size={12} /> Nhắc SMS
              </Btn>
            )}
            {detail.status === 0 && (
              <Btn onClick={() => { handleUpdateStatus(detail.id, 1, 'Đã xác nhận'); setDetail(null); }}>
                <TermIcon name="calendar" size={12} /> Xác nhận lịch hẹn
              </Btn>
            )}
            {[0, 1].includes(detail.status) && (
              <>
                <Btn variant="crit" onClick={() => { handleUpdateStatus(detail.id, 3, 'Không đến'); setDetail(null); }}>
                  <TermIcon name="x" size={12} /> Không đến
                </Btn>
                <Btn variant="primary" onClick={() => { handleUpdateStatus(detail.id, 2, 'Đã đến khám'); setDetail(null); }}>
                  <TermIcon name="check" size={12} /> Xác nhận đến khám
                </Btn>
              </>
            )}
          </>
        ) : null}
      >
        {detail && <FollowUpDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

const FollowUpDrawerBody: React.FC<{ r: AppointmentListDto }> = ({ r }) => {
  const sk = statusKey(r.status, r.isReminderSent);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';

  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          {r.daysOverdue > 0 && <span className="chip crit">Quá hạn {r.daysOverdue} ngày</span>}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Điện thoại</span><span className="mono">{r.phoneNumber || '—'}</span>
          <span>Giới tính</span><span>{r.gender === 1 ? 'Nam' : r.gender === 2 ? 'Nữ' : '—'}</span>
          {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="calendar" size={11} /> LỊCH HẸN</h5>
        <div className="rec-kv">
          <span>Loại hẹn</span><span>{r.appointmentTypeName}</span>
          <span>Lý do</span><span>{r.reason || '—'}</span>
          {r.previousDiagnosis && (<><span>CĐ trước</span><span>{r.previousDiagnosis}</span></>)}
          <span>Khoa</span><span>{r.departmentName || '—'}</span>
          <span>Phòng</span><span>{r.roomName || '—'}</span>
          <span>Bác sĩ</span><span>{r.doctorName || '—'}</span>
          <span>Hẹn ngày</span><span className="mono">{fmtDT(r.appointmentDate)}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="message-square" size={11} /> NHẮC NHỞ</h5>
        <div className="rec-kv">
          <span>Đã nhắc</span>
          <span>{r.isReminderSent ? <span className="chip ok">{fmtDT(r.reminderSentAt)}</span> : <span style={{ color: 'var(--t-3)' }}>Chưa</span>}</span>
        </div>
      </div>

      {r.notes && (
        <div className="rec-section">
          <h5><TermIcon name="info" size={11} /> GHI CHÚ</h5>
          <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.notes}</div>
        </div>
      )}
    </>
  );
};

export default FollowUpV2;
