import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select, DatePicker } from 'antd';
import { getBookings, getBookingStats, confirmBooking, checkInBooking, markNoShow, updateBooking, cancelBooking } from '../api/bookingManagement';
import type { BookingStatsDto } from '../api/bookingManagement';
import type { BookingStatusDto } from '../api/appointmentBooking';
import {
  bookAppointment, getBookingDepartments, getBookingDoctors,
  type BookingDepartmentDto, type BookingDoctorDto,
} from '../api/appointmentBooking';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn, Btn,
  DrawerShell, DrSec, DrField, ModalShell, useTabCounts, tk, ti, te, cf, Ico,
  type ColumnDef,
} from './_v2kit';

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        getBookings({ keyword: search, pageSize: 200 }),
        getBookingStats(dayjs().format('YYYY-MM-DD')),
      ]);
      const list = (r.items || []).map((b) => ({ ...b, id: b.appointmentCode })) as Booking[];
      setItems(list);
      setStats(s);
    } catch { ti('Không tải được lịch hẹn'); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { load(); }, [load]);

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
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {canEdit(r) && (
        <ActBtn ic="edit" title="Sửa lịch" onClick={() => onEdit(r)} />
      )}
      {r.status === 0 && (
        <ActBtn ic="check" title="Xác nhận" onClick={() => onConfirm(r)} />
      )}
      {(r.status === 0 || r.status === 1) && (
        <ActBtn ic="arrow-right" title="BN đã đến" onClick={() => onCheckIn(r)} />
      )}
      {(r.status === 0 || r.status === 1) && (
        <ActBtn ic="alert" title="Vắng mặt" onClick={() => onNoShow(r)} tone="warn" />
      )}
      {canCancel(r) && (
        <ActBtn ic="x" title="Hủy lịch" onClick={() => onCancel(r)} tone="crit" />
      )}
    </div>
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
        <Btn variant="ghost" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </Btn>
        <span className="spacer" />
        <Btn variant="ghost" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </Btn>
        <Btn variant="primary" onClick={() => setNewOpen(true)}>
          <Ico name="plus" size={12} /> Đặt lịch
        </Btn>
      </div>

      <StatusTabs<SKey> value={stab} onChange={(v) => { setStab(v); setPage(0); }} tabs={STATUS_TABS} counts={counts} />

      <DataTable<Booking>
        columns={cols} data={paged} rowKey={(r) => r.id}
        onRowClick={setSel} actions={actions}
        empty={loading ? 'Đang tải…' : 'Chưa có lịch hẹn'}
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
    getBookingDepartments().then((d) => setDepts(Array.isArray(d) ? d : [])).catch(() => setDepts([]));
  }, [open, isEdit, initial]);

  // Tải bác sĩ theo khoa đã chọn.
  useEffect(() => {
    if (!form.departmentId) { setDoctors([]); return; }
    let alive = true;
    getBookingDoctors(form.departmentId)
      .then((d) => { if (alive) setDoctors(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) setDoctors([]); });
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
