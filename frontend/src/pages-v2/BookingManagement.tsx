import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getBookings, getBookingStats } from '../api/bookingManagement';
import type { BookingStatsDto } from '../api/bookingManagement';
import type { BookingStatusDto } from '../api/appointmentBooking';
import {
  KpiStrip, StatusTabs, SearchBox, Filter, DataTable, Pager, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField, tk, ti, Ico,
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

  const load = async () => {
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
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const depts = useMemo(() => {
    const set = new Set(items.map((r) => r.departmentName).filter(Boolean) as string[]);
    return Array.from(set).map((v) => ({ v, l: v }));
  }, [items]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    STATUS_TABS.forEach((s) => { c[s.v] = items.filter((r) => sKey(r.status) === s.v).length; });
    return c;
  }, [items]);

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
        {r.phoneNumber && <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>📞 {r.phoneNumber}</div>}
      </div>
    ) },
    { key: 'date', label: 'Ngày · Giờ', mono: true, render: (r) => (
      <div>
        <div>{dayjs(r.appointmentDate).format('DD/MM/YYYY')}</div>
        {r.appointmentTime && <div style={{ fontSize: 11, color: 'var(--t-2)' }}>{r.appointmentTime}</div>}
      </div>
    ) },
    { key: 'dept', label: 'Khoa', render: (r) => r.departmentName || '—' },
    { key: 'doc', label: 'BS', render: (r) => r.doctorName || '—' },
    { key: 'reason', label: 'Lý do', render: (r) => <span style={{ fontSize: 12 }}>{r.reason || '—'}</span> },
    { key: 'st', label: 'Trạng thái', render: (r) => {
      const t = STATUS_TABS.find((x) => x.v === sKey(r.status));
      return <StatusBadge tone={t?.tone || 'info'} dot>{STATUS_LABEL[r.status] || '—'}</StatusBadge>;
    } },
  ];

  const actions = (r: Booking) => (
    <div className="ab-actions">
      <ActBtn ic="eye" title="Chi tiết" onClick={() => setSel(r)} />
      {r.status === 0 && (
        <ActBtn ic="check" title="Xác nhận" onClick={() => tk(`Đã xác nhận ${r.appointmentCode}`)} />
      )}
      {(r.status === 0 || r.status === 1) && (
        <ActBtn ic="phone" title="Nhắc lịch" onClick={() => tk(`Gọi nhắc ${r.phoneNumber}`)} />
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
        <button className="ab-btn ghost" type="button" onClick={() => { setSearch(''); setFDept(''); setStab('all'); }}>
          <Ico name="x" size={12} /> Bỏ lọc
        </button>
        <span className="spacer" />
        <button className="ab-btn ghost" type="button" onClick={load}>
          <Ico name="refresh" size={12} /> Làm mới
        </button>
        <button className="ab-btn ghost" type="button" onClick={() => tk('Mở SMS hàng loạt')}>
          <Ico name="message-square" size={12} /> Nhắc SMS
        </button>
        <button className="ab-btn primary" type="button" onClick={() => tk('Mở đặt lịch mới')}>
          <Ico name="plus" size={12} /> Đặt lịch
        </button>
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
          <button type="button" className="ab-btn ghost" onClick={() => setSel(null)}>Đóng</button>
          {sel && sel.status === 0 && (
            <button type="button" className="ab-btn primary" onClick={() => { tk('Đã xác nhận'); setSel(null); }}>
              <Ico name="check" size={12} /> Xác nhận
            </button>
          )}
          {sel && (sel.status === 0 || sel.status === 1) && (
            <button type="button" className="ab-btn" onClick={() => tk(`Gọi ${sel.phoneNumber}`)}>
              <Ico name="phone" size={12} /> Gọi BN
            </button>
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
    </div>
  );
};

export default BookingManagementV2;
