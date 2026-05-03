import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp } from 'antd';
import { getAppointments, confirmAppointment, cancelAppointment } from '../api/telemedicine';
import type { TelemedicineAppointmentDto } from '../api/telemedicine';
import {
  KpiStrip, StatusTabs, SearchBox, DataTable, Pager,
  StatusBadge, ActBtn, DrawerShell,
  type ColumnDef, type StatusTab,
} from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

/* Khám từ xa v2 — port of design-system-v2/his/project/Telemedicine v2.html */

type StatusKey = 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'noshow' | 'cancelled';

const STATUS_TABS: StatusTab<StatusKey>[] = [
  { v: 'scheduled', l: 'Đã đặt',         tone: 'info' },
  { v: 'waiting',   l: 'Chờ vào phòng',  tone: 'warn' },
  { v: 'ongoing',   l: 'Đang khám',      tone: 'warn' },
  { v: 'completed', l: 'Hoàn tất',       tone: 'ok' },
  { v: 'noshow',    l: 'Không tham gia', tone: 'crit' },
  { v: 'cancelled', l: 'Đã huỷ',         tone: 'crit' },
];

const statusKey = (s: number): StatusKey => {
  if (s === 5) return 'noshow';
  if (s === 4) return 'cancelled';
  if (s === 3) return 'completed';
  if (s === 2) return 'ongoing';
  if (s === 1) return 'waiting';
  return 'scheduled';
};
const statusTone = (s: StatusKey) => STATUS_TABS.find((t) => t.v === s)?.tone || 'info';

const fmtHM = (iso?: string) => iso ? dayjs(iso).format('HH:mm') : '—';
const fmtDMY = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY') : '—';
const fmtDT = (iso?: string) => iso ? dayjs(iso).format('DD/MM/YYYY HH:mm') : '—';
const fmtVND = (n: number) => n ? `${n.toLocaleString('vi-VN')} ₫` : 'Miễn phí';

const TelemedicineV2: React.FC = () => {
  const { message } = AntdApp.useApp();
  const [rows, setRows] = useState<TelemedicineAppointmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [stab, setStab] = useState<StatusKey | 'all'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<TelemedicineAppointmentDto | null>(null);
  const PAGE_SIZE = 16;

  const reload = () => {
    setLoading(true);
    getAppointments({
      fromDate: dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
      toDate:   dayjs().add(60, 'day').format('YYYY-MM-DD'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any).then((r) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const arr = ((r as any)?.data?.items || (r as any)?.data || []) as TelemedicineAppointmentDto[];
      setRows(Array.isArray(arr) ? arr : []);
    }).catch(() => setRows([])).finally(() => setLoading(false));
  };
  useEffect(reload, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    STATUS_TABS.forEach((s) => { c[s.v] = rows.filter((r) => statusKey(r.status) === s.v).length; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (stab !== 'all' && statusKey(r.status) !== stab) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = [r.appointmentCode, r.patientName, r.patientCode, r.doctorName, r.chiefComplaint]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, stab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const today = dayjs().startOf('day');
  const kpis = useMemo(() => ({
    today: rows.filter((r) => dayjs(r.scheduledDate).isSame(today, 'day')).length,
    ongoing: counts.ongoing || 0,
    waiting: counts.waiting || 0,
    completed7d: rows.filter((r) =>
      statusKey(r.status) === 'completed' &&
      dayjs(r.scheduledDate).isAfter(today.subtract(7, 'day'))).length,
    noshow: counts.noshow || 0,
    total: rows.length,
  }), [rows, counts, today]);

  const onConfirm = async (r: TelemedicineAppointmentDto) => {
    try { await confirmAppointment(r.id); message.success(`Đã xác nhận · ${r.patientName}`); reload(); }
    catch { message.error('Xác nhận thất bại'); }
  };

  const onCancel = async (r: TelemedicineAppointmentDto) => {
    try { await cancelAppointment(r.id, 'Hủy từ giao diện quản trị'); message.warning(`Đã hủy · ${r.patientName}`); reload(); }
    catch { message.error('Hủy thất bại'); }
  };

  const onJoin = (r: TelemedicineAppointmentDto) => {
    if (r.videoRoomUrl) window.open(r.videoRoomUrl, '_blank');
    else message.info('Phòng họp chưa được tạo');
  };

  const columns: ColumnDef<TelemedicineAppointmentDto>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 130, render: (r) => r.appointmentCode },
    {
      key: 'patient', label: 'Bệnh nhân',
      render: (r) => (
        <div className="cell-2l">
          <b>{r.patientName}</b>
          <i className="mono">{r.patientCode} · {r.phone || '—'}</i>
        </div>
      ),
    },
    {
      key: 'doctor', label: 'Bác sĩ', width: 200,
      render: (r) => (
        <div className="cell-2l">
          <b>{r.doctorName}</b>
          <i>{r.doctorSpecialty || r.departmentName || '—'}</i>
        </div>
      ),
    },
    { key: 'subject', label: 'Lý do khám', render: (r) => r.chiefComplaint || r.appointmentTypeName || '—' },
    {
      key: 'when', label: 'Lịch hẹn', width: 130, mono: true,
      render: (r) => (
        <div className="cell-2l">
          <b>{fmtDMY(r.scheduledDate)}</b>
          <i>{r.scheduledTime?.slice(0, 5) || fmtHM(r.scheduledDate)} · {r.durationMinutes || 30}p</i>
        </div>
      ),
    },
    { key: 'fee', label: 'Phí', mono: true, width: 110, render: (r) => fmtVND(r.fee) },
    {
      key: 'paid', label: 'Thanh toán', width: 110,
      render: (r) => r.paymentStatus === 1 ? <span className="chip ok">Đã trả</span> : <span className="chip warn">Chưa</span>,
    },
    {
      key: 'status', label: 'Trạng thái', width: 130,
      render: (r) => {
        const sk = statusKey(r.status);
        return <StatusBadge tone={statusTone(sk)} dot>{r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="ab">
      <KpiStrip
        items={[
          { lbl: 'Hôm nay', val: kpis.today, sub: 'lịch hẹn', tone: 'info' },
          { lbl: 'Đang khám', val: kpis.ongoing, sub: 'live', tone: 'warn' },
          { lbl: 'Chờ vào phòng', val: kpis.waiting, sub: 'sẵn sàng', tone: 'warn' },
          { lbl: 'Hoàn tất 7 ngày', val: kpis.completed7d, sub: 'tuần qua', tone: 'ok' },
          { lbl: 'Không tham gia', val: kpis.noshow, sub: 'no-show', tone: 'crit' },
          { lbl: 'Tổng cộng', val: kpis.total },
        ]}
      />

      <div className="ab-tools">
        <SearchBox value={search} onChange={setSearch} placeholder="Tìm BN / BS / mã hẹn / lý do…" />
        <button type="button" className="ab-btn ghost" onClick={() => { setSearch(''); setStab('all'); }}>
          <TermIcon name="refresh" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={reload}>
          <TermIcon name="refresh" size={12} /> Làm mới
        </button>
        <button type="button" className="ab-btn ghost" onClick={() => message.success(`Đã xuất ${filtered.length} dòng`)}>
          <TermIcon name="download" size={12} /> Xuất Excel
        </button>
        <button type="button" className="ab-btn primary" onClick={() => message.info('TODO: Đặt lịch khám từ xa')}>
          <TermIcon name="plus" size={12} /> Đặt lịch
        </button>
      </div>

      <StatusTabs<StatusKey> value={stab} onChange={setStab} tabs={STATUS_TABS} counts={counts} />

      <DataTable<TelemedicineAppointmentDto>
        columns={columns}
        data={paged}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r)}
        actions={(r) => (
          <div className="ab-actions">
            {[0, 1].includes(r.status) && r.videoRoomUrl && (
              <ActBtn ic="play" title="Vào phòng" onClick={() => onJoin(r)} />
            )}
            {r.status === 0 && <ActBtn ic="check" title="Xác nhận" onClick={() => onConfirm(r)} />}
            <ActBtn ic="eye" title="Chi tiết" onClick={() => setDetail(r)} />
          </div>
        )}
        empty={loading ? 'Đang tải…' : (
          <div className="ab-empty">
            <TermIcon name="search" size={20} />
            <div>Không có lịch khám từ xa nào</div>
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
        sub={detail ? `${detail.doctorName} · ${fmtDT(detail.scheduledDate)}` : ''}
        size="lg"
        footer={detail ? (
          <>
            <button type="button" className="ab-btn ghost" onClick={() => setDetail(null)}>Đóng</button>
            <span style={{ flex: 1 }} />
            {detail.status === 0 && (
              <button type="button" className="ab-btn ok" onClick={() => { onConfirm(detail); setDetail(null); }}>
                <TermIcon name="check" size={12} /> Xác nhận
              </button>
            )}
            {![3, 4, 5].includes(detail.status) && (
              <button type="button" className="ab-btn" onClick={() => { onCancel(detail); setDetail(null); }} style={{ color: 'var(--s-crit)' }}>
                <TermIcon name="x" size={12} /> Huỷ
              </button>
            )}
            {detail.videoRoomUrl && (
              <button type="button" className="ab-btn primary" onClick={() => onJoin(detail)}>
                <TermIcon name="play" size={12} /> Vào phòng
              </button>
            )}
          </>
        ) : null}
      >
        {detail && <TelemedicineDrawerBody r={detail} />}
      </DrawerShell>
    </div>
  );
};

const TelemedicineDrawerBody: React.FC<{ r: TelemedicineAppointmentDto }> = ({ r }) => {
  const sk = statusKey(r.status);
  const tone = statusTone(sk);
  const lbl = r.statusName || STATUS_TABS.find((t) => t.v === sk)?.l || '';
  return (
    <>
      <div className="rec-section">
        <h5><TermIcon name="check" size={11} /> TRẠNG THÁI</h5>
        <div className={`rec-status-banner ${tone}`}>
          <StatusBadge tone={tone} dot>{lbl}</StatusBadge>
          <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
            {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
          </span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="user" size={11} /> BỆNH NHÂN</h5>
        <div className="rec-kv">
          <span>Họ tên</span><b>{r.patientName}</b>
          <span>Mã BN</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.patientCode}</span>
          <span>Điện thoại</span><span className="mono">{r.phone || '—'}</span>
          {r.email && (<><span>Email</span><span className="mono">{r.email}</span></>)}
          {r.dateOfBirth && (<><span>Ngày sinh</span><span>{fmtDMY(r.dateOfBirth)}</span></>)}
          {r.gender && (<><span>Giới tính</span><span>{r.gender}</span></>)}
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="stethoscope" size={11} /> BÁC SĨ & LỊCH</h5>
        <div className="rec-kv">
          <span>Bác sĩ</span><b>{r.doctorName}</b>
          <span>Chuyên khoa</span><span>{r.doctorSpecialty || r.departmentName}</span>
          <span>Loại khám</span><span>{r.appointmentTypeName}</span>
          {r.chiefComplaint && (<><span>Lý do</span><span>{r.chiefComplaint}</span></>)}
          <span>Lịch hẹn</span><span className="mono">{fmtDT(r.scheduledDate)}</span>
          <span>Thời lượng</span><span>{r.durationMinutes || 30} phút</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="play" size={11} /> PHIÊN VIDEO</h5>
        <div className="rec-kv">
          <span>Meeting URL</span>
          {r.videoRoomUrl
            ? <a className="mono" href={r.videoRoomUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--a-cy)' }}>{r.videoRoomUrl}</a>
            : <span style={{ color: 'var(--t-3)' }}>Chưa tạo</span>}
          <span>Session ID</span><span className="mono">{r.sessionId || '—'}</span>
        </div>
      </div>

      <div className="rec-section">
        <h5><TermIcon name="dollar" size={11} /> THANH TOÁN</h5>
        <div className="rec-kv">
          <span>Phí khám</span><b className="mono" style={{ color: 'var(--a-cy)' }}>{fmtVND(r.fee)}</b>
          <span>Trạng thái</span>
          <span>
            <span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>
              {r.paymentStatusName || (r.paymentStatus === 1 ? 'Đã thanh toán' : 'Chưa thanh toán')}
            </span>
          </span>
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

export default TelemedicineV2;
