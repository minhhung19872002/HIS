import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select, DatePicker } from 'antd';
import {
  getBookings, getBookingStats, confirmBooking, checkInBooking, markNoShow, updateBooking, cancelBooking,
  getDoctorSchedules, saveDoctorSchedule, deleteDoctorSchedule,
} from '../api/bookingManagement';
import type { BookingStatsDto, DoctorScheduleListDto } from '../api/bookingManagement';
import type { BookingStatusDto } from '../api/appointmentBooking';
import {
  bookAppointment, getBookingDepartments, getBookingDoctors,
  type BookingDepartmentDto, type BookingDoctorDto,
} from '../api/appointmentBooking';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn, CrudModal,
  DrawerShell, DrSec, DrField, ModalShell, useTabCounts, tk, ti, tw, te, cf, Ico,
  type ColumnDef, type CrudFieldCfg,
} from '@/_v2kit';
import { RowActions } from '../../../components/actions';

const STATUS_LABEL: Record<number, string> = {
  0: 'Chờ xác nhận', 1: 'Đã xác nhận', 2: 'Đã đến', 3: 'Vắng mặt', 4: 'Hủy',
};

type SKey = 'pending' | 'confirmed' | 'attended' | 'noshow' | 'cancelled';
const STATUS_TABS = [
  { v: 'pending' as SKey,   l: 'Chờ XN',   tone: 'warn' as const },
  { v: 'confirmed' as SKey, l: 'Đã XN',    tone: 'info' as const },
  { v: 'attended' as SKey,  l: 'Đã đến',   tone: 'ok' as const },
  { v: 'noshow' as SKey,    l: 'Vắng',     tone: 'crit' as const },
  { v: 'cancelled' as SKey, l: 'Hủy',      tone: 'warn' as const },
];

const sKey = (n: number): SKey =>
  n === 0 ? 'pending' : n === 1 ? 'confirmed' : n === 2 ? 'attended' : n === 3 ? 'noshow' : 'cancelled';

type Booking = BookingStatusDto & { id: string };

const PER = 18;

const BookingManagementV2: React.FC = () => {
  const [items, setItems] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stab, setStab] = useState<SKey | 'all'>('all');
  const [fDept, setFDept] = useState('');
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<Booking | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [acting, setActing] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Doctor schedule management drawer (parity với tab "Lịch bác sĩ" ở v1)
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [schedules, setSchedules] = useState<DoctorScheduleListDto[]>([]);
  const [schDepts, setSchDepts] = useState<BookingDepartmentDto[]>([]);
  const [schDoctors, setSchDoctors] = useState<BookingDoctorDto[]>([]);
  const [scheduleCrudOpen, setScheduleCrudOpen] = useState(false);
  const [scheduleCrudInit, setScheduleCrudInit] = useState<Record<string, unknown> | null>(null);

  // Stats drawer (parity với tab "Thống kê" ở v1 — theo ngày + phân bổ theo khoa)
  // #352: khoảng ngày xem lịch hẹn (mặc định hôm nay → +7 ngày, phủ ca "gọi xác nhận ngày mai")
  const [dFrom, setDFrom] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [dTo, setDTo] = useState<string>(dayjs().add(7, 'day').format('YYYY-MM-DD'));
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsDate, setStatsDate] = useState<dayjs.Dayjs>(dayjs());
  const [fullStats, setFullStats] = useState<BookingStatsDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        // #352: truyền fromDate/toDate — backend đã hỗ trợ (BookingManagementService.cs:231-234),
        // trước đây FE không có UI ngày nên không xem được lịch của một ngày cụ thể
        // (vd danh sách ngày mai để gọi xác nhận).
        getBookings({ keyword: search, fromDate: dFrom, toDate: dTo, pageSize: 200 }),
        getBookingStats(dayjs().format('YYYY-MM-DD')),
      ]);
      const list = (r.items || []).map((b) => ({ ...b, id: b.appointmentCode })) as Booking[];
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được lịch hẹn'); }
    finally { setLoading(false); }
  }, [search, dFrom, dTo]);
  useEffect(() => {
    setPage(0);
    const t = setTimeout(load, 300); // debounce gõ phím → tránh spam API
    return () => clearTimeout(t);
  }, [load]);

  // Gọi 1 action quản lý lịch (confirm / checkin / no-show) rồi refetch.
  const runAction = useCallback(async (
    fn: () => Promise<unknown>, okMsg: string, errMsg: string,
  ) => {
    setActing(true);
    try {
      await fn();
      tk(okMsg);
      setSel(null);
      load();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      te(ax?.response?.data?.message || errMsg);
    } finally {
      setActing(false);
    }
  }, [load]);

  const onConfirm = (r: Booking) =>
    runAction(() => confirmBooking(r.appointmentCode), `Đã xác nhận ${r.appointmentCode}`, 'Xác nhận thất bại');
  const onCheckIn = (r: Booking) =>
    runAction(() => checkInBooking(r.appointmentCode), `Đã ghi nhận BN đến · ${r.patientName}`, 'Check-in thất bại');
  const onNoShow = (r: Booking) =>
    cf(`Đánh dấu vắng mặt lịch ${r.appointmentCode}?`, () =>
      void runAction(() => markNoShow(r.appointmentCode), `Đã đánh dấu vắng · ${r.appointmentCode}`, 'Thao tác thất bại'),
    { tone: 'warn', confirm: 'Vắng mặt' });
  // Mở sửa lịch — chỉ cho phép khi chưa đến khám / chưa hủy (status 0 hoặc 1).
  const onEdit = (r: Booking) => { setSel(null); setEditTarget(r); };
  const canEdit = (r: Booking) => r.status === 0 || r.status === 1;

  // Hủy lịch — không cho phép khi đã check-in (status 2) hoặc đã kết thúc (status >= 3).
  const canCancel = (r: Booking) => r.status === 0 || r.status === 1;
  const onCancel = (r: Booking) => { setSel(null); setCancelTarget(r); setCancelReason(''); };
  const doCancel = async () => {
    if (!cancelTarget) return;
    setActing(true);
    try {
      await cancelBooking(cancelTarget.appointmentCode, cancelReason.trim() || undefined);
      tk(`Đã hủy lịch hẹn · ${cancelTarget.appointmentCode}`);
      setCancelTarget(null);
      setCancelReason('');
      load();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      te(ax?.response?.data?.message || 'Hủy lịch hẹn thất bại');
    } finally {
      setActing(false);
    }
  };

  // Lịch bác sĩ: load 14 ngày tới (giống mặc định v1 fetchSchedules).
  const loadSchedules = async () => {
    setScheduleLoading(true);
    try {
      const data = await getDoctorSchedules({ fromDate: dayjs().format('YYYY-MM-DD'), toDate: dayjs().add(14, 'day').format('YYYY-MM-DD') });
      setSchedules(Array.isArray(data) ? data : []);
    } catch { te('Không tải được lịch bác sĩ'); }
    finally { setScheduleLoading(false); }
  };
  const openSchedules = () => {
    setScheduleOpen(true);
    loadSchedules();
    getBookingDepartments().then((d) => setSchDepts(Array.isArray(d) ? d : []))
      .catch(() => { tw('Không tải được danh sách khoa cho lịch bác sĩ.'); setSchDepts([]); });
    getBookingDoctors().then((d) => setSchDoctors(Array.isArray(d) ? d : []))
      .catch(() => { tw('Không tải được danh sách bác sĩ cho lịch bác sĩ.'); setSchDoctors([]); });
  };
  const openScheduleCreate = () => { setScheduleCrudInit({}); setScheduleCrudOpen(true); };
  const openScheduleEdit = (s: DoctorScheduleListDto) => {
    setScheduleCrudInit({
      id: s.id, doctorId: s.doctorId, departmentId: s.departmentId, roomId: s.roomId,
      scheduleDate: s.scheduleDate, startTime: s.startTime.substring(0, 5), endTime: s.endTime.substring(0, 5),
      maxPatients: s.maxPatients, slotDurationMinutes: s.slotDurationMinutes,
      scheduleType: s.scheduleType, note: s.note, isRecurring: s.isRecurring,
    });
    setScheduleCrudOpen(true);
  };
  const delSchedule = (s: DoctorScheduleListDto) => cf(`Xoá lịch ${s.doctorName} ngày ${dayjs(s.scheduleDate).format('DD/MM')}?`, async () => {
    try { await deleteDoctorSchedule(s.id); tk('Đã xoá lịch'); loadSchedules(); } catch { te('Xoá lịch thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  const scheduleFields: CrudFieldCfg[] = [
    { key: 'doctorId', label: 'Bác sĩ', type: 'select', required: true,
      options: schDoctors.map((d) => ({ value: d.id, label: `${d.title ? d.title + ' ' : ''}${d.fullName}` })) },
    { key: 'departmentId', label: 'Khoa', type: 'select', required: true,
      options: schDepts.map((d) => ({ value: d.id, label: d.name })) },
    { key: 'scheduleDate', label: 'Ngày', type: 'date', required: true },
    { key: 'scheduleType', label: 'Loại ca', type: 'select', options: [
      { value: 1, label: 'Thường' }, { value: 2, label: 'Trực' }, { value: 3, label: 'Hẹn trước' }] },
    { key: 'startTime', label: 'Giờ bắt đầu (HH:mm)', required: true, placeholder: 'VD: 07:30',
      rules: [{ required: true, message: 'Nhập giờ bắt đầu' }, { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'Định dạng HH:mm, vd 07:30' }] },
    { key: 'endTime', label: 'Giờ kết thúc (HH:mm)', required: true, placeholder: 'VD: 11:30',
      rules: [{ required: true, message: 'Nhập giờ kết thúc' }, { pattern: /^([01]\d|2[0-3]):[0-5]\d$/, message: 'Định dạng HH:mm, vd 07:30' }] },
    { key: 'maxPatients', label: 'Số BN tối đa', type: 'number' },
    { key: 'slotDurationMinutes', label: 'Thời gian slot (phút)', type: 'select', options: [
      { value: 15, label: '15 phút' }, { value: 20, label: '20 phút' }, { value: 30, label: '30 phút' },
      { value: 45, label: '45 phút' }, { value: 60, label: '60 phút' }] },
    { key: 'note', label: 'Ghi chú', type: 'textarea' },
    { key: 'isRecurring', label: 'Lặp lại hàng tuần', type: 'switch' },
  ];

  // Thống kê: tải theo ngày được chọn (giống v1 fetchStats theo statsDate).
  const loadFullStats = async (d: dayjs.Dayjs) => {
    setStatsLoading(true);
    try {
      const data = await getBookingStats(d.format('YYYY-MM-DD'));
      setFullStats(data);
    } catch { te('Không tải được thống kê'); }
    finally { setStatsLoading(false); }
  };
  const openStats = () => { setStatsOpen(true); loadFullStats(statsDate); };

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useTabCounts(items, STATUS_TABS, (r) => sKey(r.status));

  const filtered = useMemo(() => {
    const k = search.trim().toLowerCase();
    return items.filter((r) => {
      if (stab !== 'all' && sKey(r.status) !== stab) return false;
      if (fDept && r.departmentName !== fDept) return false;
      if (!k) return true;
      return [r.patientName, r.appointmentCode, r.phoneNumber, r.doctorName]
        .some((v) => (v || '').toLowerCase().includes(k));
    });
  }, [items, search, stab, fDept]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER));
  const paged = filtered.slice(page * PER, (page + 1) * PER);

  const cols: ColumnDef<Booking>[] = [
    { key: 'code', label: 'Mã hẹn', code: true, render: (r) => r.appointmentCode },
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--t-0)' }}>{r.patientName}</div>
        {r.phoneNumber && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>📞 {r.phoneNumber}</div>}
      </div>
    ) },
    { key: 'date', label: 'Ngày · Giờ', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.appointmentDate).format('DD/MM/YYYY')}</div>
        {r.appointmentTime && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{r.appointmentTime}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => <span style={{ fontSize: 'var(--fs-sm)' }}>{r.reason || '—'}</span> },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Booking) => (
    <RowActions actions={[
      { key: 'view', icon: 'eye', label: 'Chi tiết', primary: true, onClick: () => setSel(r) },
      { key: 'edit', icon: 'edit', label: 'Sửa lịch', primary: true, hidden: !canEdit(r), onClick: () => onEdit(r) },
      { key: 'confirm', icon: 'check', label: 'Xác nhận', hidden: r.status !== 0, disabled: acting, onClick: () => onConfirm(r) },
      { key: 'checkin', icon: 'arrow-right', label: 'BN đã đến', hidden: !(r.status === 0 || r.status === 1), disabled: acting, onClick: () => onCheckIn(r) },
      // onNoShow/onCancel tự mở confirm/modal riêng — confirm:false để tránh RowActions hỏi lại lần 2.
      { key: 'noshow', icon: 'alert', label: 'Vắng mặt', tone: 'danger', confirm: false,
        hidden: !(r.status === 0 || r.status === 1), disabled: acting, onClick: () => onNoShow(r) },
      { key: 'cancel', icon: 'x', label: 'Hủy lịch', tone: 'danger', confirm: false,
        hidden: !canCancel(r), onClick: () => onCancel(r) },
    ]} />
  );

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Lịch hôm nay', val: stats?.totalBookings ?? items.length, sub: 'tổng' },
        { lbl: 'Chờ XN', val: stats?.pending ?? counts.pending, sub: 'cần liên hệ', tone: 'warn' },
        { lbl: 'Đã đến', val: stats?.attended ?? counts.attended, sub: `${Math.round(((counts.attended || 0) / Math.max(1, items.length)) * 100)}%`, tone: 'ok' },
        { lbl: 'Vắng', val: stats?.noShow ?? counts.noshow, sub: 'no-show', tone: 'crit' },
      ]} />

      <div className="ab-toolbar" style={{ borderTop: '1px solid var(--line)' }}>
        <SearchBox value={search} onChange={(v) => { setSearch(v); setPage(0); }}
          placeholder="Tìm BN / mã hẹn / SĐT…" />
        <Filter value={fDept} onChange={setFDept} options={depts} placeholder="▾ Khoa" />
        {/* #352: lọc theo khoảng ngày hẹn */}
        <Input type="date" value={dFrom} onChange={(e) => { setDFrom(e.target.value); setPage(0); }}
          style={{ width: 150 }} title="Từ ngày hẹn" />
        <span style={{ fontSize: 12.5, color: 'var(--t-2)' }}>→</span>
        <Input type="date" value={dTo} onChange={(e) => { setDTo(e.target.value); setPage(0); }}
          style={{ width: 150 }} title="Đến ngày hẹn" />
        <Btn variant="ghost" onClick={() => {
          setSearch(''); setFDept(''); setStab('all');
          setDFrom(dayjs().format('YYYY-MM-DD'));
          setDTo(dayjs().add(7, 'day').format('YYYY-MM-DD'));
        }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load} loading={loading} icon="refresh">Làm mới</Btn>
        <Btn variant="ghost" onClick={openSchedules}>
          <Ico name="calendar" size={12} /> Lịch bác sĩ
        </Btn>
        <Btn variant="ghost" onClick={openStats}>
          <Ico name="chart" size={12} /> Thống kê
        </Btn>
        <Btn variant="primary" onClick={() => setNewOpen(true)}>
          <Ico name="plus" size={12} /> Đặt lịch
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Booking>
        columns={cols} data={paged} rowKey={(r) => r.id} loading={loading}
        onRowClick={setSel} actions={actions}
        empty="Chưa có lịch hẹn"
      />
      <Pager page={page} setPage={setPage} totalPages={totalPages} total={filtered.length} perPage={PER} />

      <DrawerShell
        open={!!sel}
        onClose={() => setSel(null)}
        size="md"
        title={sel ? sel.patientName : ''}
        sub={sel ? `${sel.appointmentCode} · ${dayjs(sel.appointmentDate).format('DD/MM/YYYY')}` : ''}
        footer={<>
          <Btn variant="ghost" onClick={() => setSel(null)}>Đóng</Btn>
          {sel && canEdit(sel) && (
            <Btn variant="ghost" onClick={() => onEdit(sel)}>
              <Ico name="edit" size={12} /> Sửa
            </Btn>
          )}
          <span style={{ flex: 1 }} />
          {sel && canCancel(sel) && (
            <Btn variant="crit" disabled={acting} onClick={() => onCancel(sel)}>
              <Ico name="x" size={12} /> Hủy lịch
            </Btn>
          )}
          {sel && (sel.status === 0 || sel.status === 1) && (
            <Btn variant="crit" disabled={acting} onClick={() => onNoShow(sel)}>
              <Ico name="alert" size={12} /> Vắng mặt
            </Btn>
          )}
          {sel && sel.status === 0 && (
            <Btn variant="primary" disabled={acting} onClick={() => onConfirm(sel)}>
              <Ico name="check" size={12} /> Xác nhận
            </Btn>
          )}
          {sel && (sel.status === 0 || sel.status === 1) && (
            <Btn variant="ok" disabled={acting} onClick={() => onCheckIn(sel)}>
              <Ico name="arrow-right" size={12} /> BN đã đến
            </Btn>
          )}
        </>}
      >
        {sel && <>
          <DrSec title="Lịch hẹn">
            <DrField lbl="Mã hẹn"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.appointmentCode}</span></DrField>
            <DrField lbl="Bệnh nhân">{sel.patientName}</DrField>
            <DrField lbl="SĐT"><span style={{ fontFamily: 'var(--font-mono)' }}>{sel.phoneNumber || '—'}</span></DrField>
            <DrField lbl="Ngày · Giờ">
              {dayjs(sel.appointmentDate).format('DD/MM/YYYY')}
              {sel.appointmentTime && ` · ${sel.appointmentTime}`}
            </DrField>
          </DrSec>
          <DrSec title="Phòng khám">
            <DrField lbl="Khoa">{sel.departmentName || '—'}</DrField>
            <DrField lbl="Phòng">{sel.roomName || '—'}</DrField>
            <DrField lbl="Bác sĩ">{sel.doctorName || '—'}</DrField>
            <DrField lbl="Loại lịch">{sel.appointmentTypeName || '—'}</DrField>
            <DrField lbl="Lý do">{sel.reason || '—'}</DrField>
            <DrField lbl="Trạng thái">
              <StatusBadge tone={STATUS_TABS.find((x) => x.v === sKey(sel.status))?.tone || 'info'} dot>
                {STATUS_LABEL[sel.status] || sel.statusName || '—'}
              </StatusBadge>
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>

      <BookingModal mode="create" initial={null} open={newOpen}
        onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); load(); }} />
      <BookingModal mode="edit" initial={editTarget} open={!!editTarget}
        onClose={() => setEditTarget(null)} onDone={() => { setEditTarget(null); load(); }} />

      <ModalShell
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelReason(''); }}
        title="Xác nhận hủy lịch hẹn"
        sub={cancelTarget ? `${cancelTarget.appointmentCode} · ${cancelTarget.patientName}` : ''}
        size="sm"
        tone="danger"
        footer={<>
          <Btn variant="ghost" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Không</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="crit" disabled={acting} onClick={() => void doCancel()}>
            <Ico name="x" size={12} /> Hủy lịch
          </Btn>
        </>}
      >
        <p style={{ marginBottom: 'var(--space-12)', color: 'var(--t-1)' }}>
          Lịch hẹn sẽ chuyển sang trạng thái <strong>Đã hủy</strong> và không thể khôi phục.
        </p>
        <label style={{ display: 'block', marginBottom: 'var(--space-4)', fontSize: 'var(--fs-md)', color: 'var(--t-2)' }}>
          Lý do hủy (tùy chọn)
        </label>
        <Input
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          placeholder="VD: BN xin đổi lịch, nhầm ngày…"
          maxLength={200}
          onPressEnter={() => void doCancel()}
        />
      </ModalShell>

      {/* Drawer Lịch bác sĩ — parity với tab "Lịch bác sĩ" ở v1 */}
      <DrawerShell
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        size="lg"
        title="Lịch bác sĩ"
        sub={scheduleLoading ? 'Đang tải…' : `${schedules.length} ca · 14 ngày tới`}
        footer={<Btn variant="ghost" onClick={() => setScheduleOpen(false)}>Đóng</Btn>}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)', marginBottom: 'var(--space-8)' }}>
          <Btn variant="ghost" onClick={loadSchedules} loading={scheduleLoading} icon="refresh">Làm mới</Btn>
          <Btn variant="primary" onClick={openScheduleCreate}><Ico name="plus" size={12} /> Thêm lịch làm việc</Btn>
        </div>
        {scheduleLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải lịch bác sĩ…</div>}
        {!scheduleLoading && schedules.length === 0 && (
          <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Chưa có ca làm việc nào</div>
        )}
        {!scheduleLoading && schedules.length > 0 && (
          <table className="ab-tbl" style={{ width: '100%', fontSize: 'var(--fs-sm)' }}>
            <thead>
              <tr>
                <th>Ngày</th><th>Bác sĩ</th><th>Khoa</th><th>Phòng</th><th>Ca</th><th>Đã đặt/Tối đa</th><th>Trạng thái</th><th></th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{dayjs(s.scheduleDate).format('DD/MM (ddd)')}</td>
                  <td>{s.title ? `${s.title} ` : ''}{s.doctorName}</td>
                  <td>{s.departmentName}</td>
                  <td>{s.roomName || '—'}</td>
                  <td className="mono">{s.startTime.substring(0, 5)} - {s.endTime.substring(0, 5)}</td>
                  <td>
                    <span style={{ color: s.bookedCount >= s.maxPatients ? 'var(--s-crit)' : 'var(--t-1)' }}>
                      {s.bookedCount}/{s.maxPatients}
                    </span>
                  </td>
                  <td>
                    {s.isActive ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge tone="crit" dot>Nghỉ</StatusBadge>}
                    {s.isRecurring && <StatusBadge tone="info" dot>Lặp</StatusBadge>}
                  </td>
                  <td>
                    <div className="ab-actions">
                      <ActBtn ic="edit" title="Sửa" onClick={() => openScheduleEdit(s)} />
                      <ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delSchedule(s)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </DrawerShell>

      <CrudModal
        open={scheduleCrudOpen}
        onClose={() => setScheduleCrudOpen(false)}
        title={scheduleCrudInit?.id ? 'Sửa lịch làm việc' : 'Thêm lịch làm việc'}
        fields={scheduleFields}
        initial={scheduleCrudInit}
        size="md"
        onSubmit={async (v, isEdit) => {
          await saveDoctorSchedule({
            id: isEdit ? (scheduleCrudInit?.id as string) : undefined,
            doctorId: v.doctorId as string,
            departmentId: v.departmentId as string,
            roomId: v.roomId as string | undefined,
            scheduleDate: v.scheduleDate as string,
            startTime: `${v.startTime}:00`,
            endTime: `${v.endTime}:00`,
            maxPatients: (v.maxPatients as number) || 30,
            slotDurationMinutes: (v.slotDurationMinutes as number) || 30,
            scheduleType: (v.scheduleType as number) || 1,
            note: v.note as string | undefined,
            isRecurring: (v.isRecurring as boolean) || false,
          });
          tk(isEdit ? 'Đã cập nhật lịch' : 'Đã tạo lịch');
          loadSchedules();
        }}
      />

      {/* Drawer Thống kê — parity với tab "Thống kê" ở v1 */}
      <DrawerShell
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        size="md"
        title="Thống kê đặt lịch"
        sub={statsLoading ? 'Đang tải…' : statsDate.format('DD/MM/YYYY')}
        footer={<Btn variant="ghost" onClick={() => setStatsOpen(false)}>Đóng</Btn>}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
          <DatePicker
            value={statsDate}
            format="DD/MM/YYYY"
            onChange={(d) => { if (d) { setStatsDate(d); loadFullStats(d); } }}
          />
          <Btn variant="ghost" onClick={() => loadFullStats(statsDate)} loading={statsLoading} icon="refresh">Làm mới</Btn>
        </div>
        {statsLoading && <div style={{ padding: 'var(--space-32)', textAlign: 'center', color: 'var(--t-2)' }}>Đang tải thống kê…</div>}
        {!statsLoading && fullStats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-8)', marginBottom: 'var(--space-16)' }}>
              <DrField lbl="Tổng lịch hẹn">{fullStats.totalBookings}</DrField>
              <DrField lbl="Chờ xác nhận"><span style={{ color: 'var(--s-warn)' }}>{fullStats.pending}</span></DrField>
              <DrField lbl="Đã xác nhận"><span style={{ color: 'var(--a-cy)' }}>{fullStats.confirmed}</span></DrField>
              <DrField lbl="Đã đến khám"><span style={{ color: 'var(--s-ok)' }}>{fullStats.attended}</span></DrField>
              <DrField lbl="Không đến"><span style={{ color: 'var(--s-crit)' }}>{fullStats.noShow}</span></DrField>
              <DrField lbl="Tỷ lệ vắng"><span style={{ color: fullStats.noShowRate > 20 ? 'var(--s-crit)' : 'var(--t-1)' }}>{fullStats.noShowRate}%</span></DrField>
            </div>
            <DrSec title="Phân bổ theo khoa">
              {fullStats.byDepartment.length === 0 && <span style={{ color: 'var(--t-2)' }}>Không có dữ liệu</span>}
              {fullStats.byDepartment.map((d) => {
                const pct = fullStats.totalBookings > 0 ? Math.round((d.count / fullStats.totalBookings) * 100) : 0;
                return (
                  <div key={d.departmentName} style={{ marginBottom: 'var(--space-8)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', marginBottom: 2 }}>
                      <span>{d.departmentName}</span><span className="mono">{d.count}</span>
                    </div>
                    <div style={{ background: 'var(--line)', height: 6, borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, background: 'var(--a-cy)', height: '100%', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Modal đặt / sửa lịch khám tại quầy.
   - mode="create": tái dùng endpoint công khai POST /booking/book
     (AppointmentBookingController.BookAppointment), tạo lịch ở trạng thái
     "Chờ xác nhận" (status 0).
   - mode="edit": gọi PUT /booking-management/bookings/{code}
     (BookingManagementController.UpdateBooking) — chỉ cho sửa khi lịch
     chưa đến khám / chưa hủy (status 0 hoặc 1).
   ──────────────────────────────────────────────────────────── */

interface NewBookingState {
  patientName: string;
  phoneNumber: string;
  appointmentDate: dayjs.Dayjs | null;
  appointmentTime: string;
  departmentId: string;
  doctorId: string;
  reason: string;
  appointmentType: number;
}

const EMPTY_BOOKING: NewBookingState = {
  patientName: '', phoneNumber: '', appointmentDate: dayjs(), appointmentTime: '',
  departmentId: '', doctorId: '', reason: '', appointmentType: 1,
};

// Map một lịch hẹn (Booking) -> state form khi mở chế độ Sửa.
const toFormState = (b: Booking): NewBookingState => ({
  patientName: b.patientName || '',
  phoneNumber: b.phoneNumber || '',
  appointmentDate: b.appointmentDate ? dayjs(b.appointmentDate) : dayjs(),
  appointmentTime: b.appointmentTime ? String(b.appointmentTime).slice(0, 5) : '',
  departmentId: b.departmentId || '',
  doctorId: b.doctorId || '',
  reason: b.reason || '',
  appointmentType: b.appointmentType || 1,
});

const BookingModal: React.FC<{
  mode: 'create' | 'edit';
  initial: Booking | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ mode, initial, open, onClose, onDone }) => {
  const isEdit = mode === 'edit';
  const [form, setForm] = useState<NewBookingState>(EMPTY_BOOKING);
  const [depts, setDepts] = useState<BookingDepartmentDto[]>([]);
  const [doctors, setDoctors] = useState<BookingDoctorDto[]>([]);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof NewBookingState>(k: K, v: NewBookingState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    if (!open) return;
    setForm(isEdit && initial ? toFormState(initial) : EMPTY_BOOKING);
    setDoctors([]);
    getBookingDepartments().then((d) => setDepts(Array.isArray(d) ? d : [])).catch(() => { tw('Không tải được danh sách khoa.'); setDepts([]); });
  }, [open, isEdit, initial]);

  // Tải bác sĩ theo khoa đã chọn.
  useEffect(() => {
    if (!form.departmentId) { setDoctors([]); return; }
    let alive = true;
    getBookingDoctors(form.departmentId)
      .then((d) => { if (alive) setDoctors(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) { tw('Không tải được danh sách bác sĩ.'); setDoctors([]); } });
    return () => { alive = false; };
  }, [form.departmentId]);

  const submit = async () => {
    if (!form.patientName.trim()) { te('Nhập họ tên bệnh nhân'); return; }
    if (!/^0\d{9,10}$/.test(form.phoneNumber.trim())) { te('Số điện thoại không hợp lệ'); return; }
    if (!form.appointmentDate) { te('Chọn ngày hẹn'); return; }
    setSaving(true);
    try {
      if (isEdit && initial) {
        await updateBooking(initial.appointmentCode, {
          patientName: form.patientName.trim(),
          phoneNumber: form.phoneNumber.trim(),
          appointmentDate: form.appointmentDate.format('YYYY-MM-DD'),
          appointmentTime: form.appointmentTime ? `${form.appointmentTime}:00` : undefined,
          departmentId: form.departmentId || undefined,
          doctorId: form.doctorId || undefined,
          appointmentType: form.appointmentType,
          reason: form.reason.trim() || undefined,
        });
        tk(`Đã cập nhật lịch · ${initial.appointmentCode}`);
        onDone();
        return;
      }
      const res = await bookAppointment({
        patientName: form.patientName.trim(),
        phoneNumber: form.phoneNumber.trim(),
        appointmentDate: form.appointmentDate.format('YYYY-MM-DD'),
        appointmentTime: form.appointmentTime ? `${form.appointmentTime}:00` : undefined,
        departmentId: form.departmentId || undefined,
        doctorId: form.doctorId || undefined,
        appointmentType: form.appointmentType,
        reason: form.reason.trim() || undefined,
      });
      if (res?.success === false) { te(res.message || 'Đặt lịch thất bại'); return; }
      tk(`Đã đặt lịch · ${res.appointmentCode}`);
      onDone();
    } catch (e: unknown) {
      const ax = e as { response?: { data?: { message?: string } } };
      te(ax?.response?.data?.message || (isEdit ? 'Cập nhật thất bại' : 'Đặt lịch thất bại'));
    } finally {
      setSaving(false);
    }
  };

  const lblStyle: React.CSSProperties = { fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Sửa lịch hẹn' : 'Đặt lịch khám tại quầy'}
      footer={
        <>
          <button type="button" className="ab-btn" onClick={onClose}>Huỷ</button>
          <span style={{ flex: 1 }} />
          <button type="button" className="ab-btn primary" disabled={saving} onClick={submit}>
            <Ico name="check" size={12} /> {saving ? 'Đang lưu…' : (isEdit ? 'Lưu thay đổi' : 'Đặt lịch')}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <div>
            <div style={lblStyle}>Họ và tên <span style={{ color: 'var(--s-crit)' }}>*</span></div>
            <Input value={form.patientName} onChange={(e) => setField('patientName', e.target.value)} placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <div style={lblStyle}>Số điện thoại <span style={{ color: 'var(--s-crit)' }}>*</span></div>
            <Input value={form.phoneNumber} onChange={(e) => setField('phoneNumber', e.target.value)} placeholder="0912345678" />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
          <div>
            <div style={lblStyle}>Ngày hẹn <span style={{ color: 'var(--s-crit)' }}>*</span></div>
            <DatePicker
              style={{ width: '100%' }}
              format="DD/MM/YYYY"
              value={form.appointmentDate}
              onChange={(d) => setField('appointmentDate', d)}
              disabledDate={(d) => !!d && d.isBefore(dayjs().startOf('day'))}
            />
          </div>
          <div>
            <div style={lblStyle}>Giờ hẹn (HH:mm)</div>
            <Input value={form.appointmentTime} onChange={(e) => setField('appointmentTime', e.target.value)} placeholder="09:30" />
          </div>
        </div>
        <div>
          <div style={lblStyle}>Khoa khám</div>
          <Select
            style={{ width: '100%' }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Chọn khoa"
            value={form.departmentId || undefined}
            onChange={(v) => setForm((s) => ({ ...s, departmentId: v || '', doctorId: '' }))}
            options={depts.map((d) => ({ value: d.id, label: d.name }))}
          />
        </div>
        <div>
          <div style={lblStyle}>Bác sĩ (tùy chọn)</div>
          <Select
            style={{ width: '100%' }}
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder={form.departmentId ? 'Chọn bác sĩ' : 'Chọn khoa trước'}
            disabled={!form.departmentId}
            value={form.doctorId || undefined}
            onChange={(v) => setField('doctorId', v || '')}
            options={doctors.map((d) => ({ value: d.id, label: d.fullName }))}
          />
        </div>
        <div>
          <div style={lblStyle}>Lý do khám</div>
          <Input.TextArea rows={2} value={form.reason} onChange={(e) => setField('reason', e.target.value)} placeholder="Triệu chứng chính…" />
        </div>
      </div>
    </ModalShell>
  );
};

export default BookingManagementV2;
