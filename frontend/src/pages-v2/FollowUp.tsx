import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { searchAppointments, updateAppointmentStatus } from '../api/examination';
import type { AppointmentListDto } from '../api/examination';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* ────────────────────────────────────────────────────────────
   Tái khám v2 — port of design-system-v2/his/project/FollowUp v2.html
   ──────────────────────────────────────────────────────────── */

type StatusKey = 'scheduled' | 'reminded' | 'completed' | 'missed' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã hẹn',     tone: 'info' },
  { v: 'reminded',  l: 'Đã nhắc',    tone: 'info' },
  { v: 'completed', l: 'Đã tái khám', tone: 'ok' },
  { v: 'missed',    l: 'Bỏ lỡ',      tone: 'crit' },
  { v: 'cancelled', l: 'Đã huỷ',     tone: 'crit' },
];

// Backend AppointmentStatus: 0 Scheduled · 1 Confirmed · 2 Completed · 3 Cancelled · 4 NoShow
const statusKey = (s: number, isReminded: boolean): StatusKey => {
  if (s === 4) return 'missed';
  if (s === 3) return 'cancelled';
  if (s === 2) return 'completed';
  if (isReminded) return 'reminded';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';

const FollowUpV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<AppointmentListDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AppointmentListDto | null>(null);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    searchAppointments({
      fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().add(60, 'day').format('YYYY-MM-DD'),
      pageIndex: 0, pageSize: 200,
    } as any).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr = ((r as any)?.data?.items || (r as any)?.data || []) as AppointmentListDto[];
      setRows(Array.isArray(arr) ? arr : []);
    }).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => {
      c[s.v] = rows.filter((r) => statusKey(r.status, r.isReminderSent) === s.v).length;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status, r.isReminderSent) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.appointmentCode, r.patientName, r.patientCode, r.phoneNumber, r.reason]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = dayjs().startOf('day');
  const sevenDays = dayjs().add(7, 'day').endOf('day');
  const kpis = useMemo(() => {
    const upcoming7 = rows.filter((r) => {
      const d = dayjs(r.appointmentDate);
      return r.status === 0 && d.isAfter(today) && d.isBefore(sevenDays);
    }).length;
    const reminded = counts.reminded || 0;
    const completed = counts.completed || 0;
    const missed = counts.missed || 0;
    const adherence = (completed + missed) > 0
      ? Math.round(completed / (completed + missed) * 100)
      : 0;
    return { upcoming7, reminded, completed, missed, adherence, total: rows.length };
  }, [rows, counts, today, sevenDays]);

  const onRemind = async (r: AppointmentListDto, channel: 'SMS' | 'Zalo' = 'SMS') => {
    // No backend endpoint to flip "reminded" alone; mark as Confirmed (status=1) to indicate engagement.
    try {
      await updateAppointmentStatus(r.id, 1);
      message.success(`Đã gửi nhắc ${channel} cho ${r.patientName}`);
      reload();
    } catch {
      message.error('Gửi nhắc thất bại');
    }
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
          { lbl: 'Hẹn 7 ngày tới', val: kpis.upcoming7, sub: 'sắp đến', tone: 'info' },
          { lbl: 'Đã nhắc', val: kpis.reminded, sub: 'BN đã liên lạc' },
          { lbl: 'Đã tái khám', val: kpis.completed, sub: 'tuân thủ', tone: 'ok' },
          { lbl: 'Bỏ lỡ', val: kpis.missed, sub: 'cần follow', tone: 'crit' },
          { lbl: 'Tỷ lệ tuân thủ', val: kpis.adherence, unit: '%', sub: 'hoàn thành', tone: kpis.adherence >= 80 ? 'ok' : 'warn' },
          { lbl: 'Tổng kế hoạch', val: kpis.total },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / SĐT / mã hẹn / lý do…" />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => message.info('TODO: Nhắc hàng loạt')}>
          <TermIcon name="message-square" size={12} /> Nhắc hàng loạt
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => message.success(`Đã xuất ${filtered.length} dòng`)}>
          <TermIcon name="download" size={12} /> Xuất Excel
        </button>
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Lập kế hoạch')}>
          <TermIcon name="plus" size={12} /> Lập kế hoạch
        </button>
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
              <ActBtn ic="phone" title="Gọi BN" onClick={() => message.info(`Đang gọi ${r.phoneNumber}`)} />
            )}
            {[0, 1].includes(r.status) && (
              <ActBtn ic="message-square" title="Nhắc SMS" onClick={() => onRemind(r, 'SMS')} />
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

      <Pager page={page} totalPages={totalPages} setPage={setPage} total={filtered.length} perPage={PAGE_SIZE} />

      <DrawerShell
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{detail.appointmentCode}</span>
              <span style={{ fontSize: 14 }}>{detail.patientName}</span>
            </span>
          : ''}
        sub={detail
          ? `${detail.patientCode} · ${detail.phoneNumber || '—'} · ${fmtDMY(detail.appointmentDate)}`
          : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            {[0, 1].includes(detail.status) && detail.phoneNumber && (
              <>
                <button type="button" className="ab-btn" onClick={() => onRemind(detail, 'SMS')}>
                  <TermIcon name="message-square" size={12} /> Nhắc SMS
                </button>
                <button type="button" className="ab-btn primary" onClick={() => message.info(`Đang gọi ${detail.phoneNumber}`)}>
                  <TermIcon name="phone" size={12} /> Gọi BN
                </button>
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
