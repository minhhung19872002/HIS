import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { getBookings, getBookingStats } from '../api/bookingManagement';
import type { BookingStatsDto } from '../api/bookingManagement';
import type { BookingStatusDto } from '../api/appointmentBooking';
import { GenericListPage } from './_GenericListPage';

const STATUS: Record<number, { text: string; cls: string }> = {
  0: { text: 'Chờ XN', cls: 'warn' },
  1: { text: 'Đã XN', cls: 'cy' },
  2: { text: 'Đã đến', cls: 'ok' },
  3: { text: 'Vắng', cls: 'crit' },
  4: { text: 'Hủy', cls: 'ghost' },
};

type Booking = BookingStatusDto & { id: string };

const BookingManagementV2: React.FC = () => {
  const [items, setItems] = useState<Booking[]>([]);
  const [stats, setStats] = useState<BookingStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [sel, setSel] = useState<Booking | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        getBookings({ keyword, pageSize: 100 }),
        getBookingStats(dayjs().format('YYYY-MM-DD')),
      ]);
      const list = (r.items || []).map((b) => ({ ...b, id: b.appointmentCode })) as Booking[];
      setItems(list);
      setStats(s);
      if (list.length > 0 && !sel) setSel(list[0]);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const statRows = useMemo(() => [
    { label: 'Tổng lịch', value: stats?.totalBookings ?? items.length },
    { label: 'Chờ', value: stats?.pending ?? items.filter((b) => b.status === 0).length, tone: 'warn' as const },
    { label: 'Đã đến', value: stats?.attended ?? items.filter((b) => b.status === 2).length, tone: 'ok' as const },
    { label: 'Vắng', value: stats?.noShow ?? items.filter((b) => b.status === 3).length, tone: 'crit' as const },
  ], [items, stats]);

  return (
    <GenericListPage<Booking>
      title="Quản lý đặt lịch" v1Path="/booking-management"
      items={items} loading={loading}
      keyword={keyword} onKeywordChange={setKeyword} onSearch={load}
      searchPlaceholder="Tìm BN / mã hẹn / SĐT..."
      selectedId={sel?.id} onSelect={setSel}
      stats={statRows}
      columns={[
        { key: 'code', label: 'Mã hẹn', render: (r) => <span className="mono">{r.appointmentCode}</span> },
        { key: 'pt', label: 'BN', render: (r) => (
          <><div style={{ fontWeight: 500 }}>{r.patientName}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--t-3)' }}>{r.phoneNumber || ''}</div></>
        ) },
        { key: 'date', label: 'Ngày', render: (r) => <span className="mono">{dayjs(r.appointmentDate).format('DD/MM')} {r.appointmentTime || ''}</span> },
        { key: 'dept', label: 'Khoa', render: (r) => <span className="muted">{r.departmentName || '—'}</span> },
        { key: 'doc', label: 'BS', render: (r) => <span className="muted">{r.doctorName || '—'}</span> },
        { key: 'status', label: 'TT', render: (r) => {
          const s = STATUS[r.status] || { text: '—', cls: 'ghost' };
          return <span className={`chip ${s.cls}`}>{s.text}</span>;
        } },
      ]}
      detailTitle={sel?.appointmentCode || 'Chọn lịch hẹn'}
      detailFields={!sel ? null : [
        { label: 'Mã hẹn', value: <span className="mono">{sel.appointmentCode}</span> },
        { label: 'BN', value: sel.patientName },
        { label: 'SĐT', value: <span className="mono">{sel.phoneNumber || '—'}</span> },
        { label: 'Ngày hẹn', value: <span className="mono">{dayjs(sel.appointmentDate).format('DD/MM/YYYY')}{sel.appointmentTime ? ' ' + sel.appointmentTime : ''}</span> },
        { label: 'Khoa', value: sel.departmentName || '—' },
        { label: 'Phòng', value: sel.roomName || '—' },
        { label: 'BS', value: sel.doctorName || '—' },
        { label: 'Lý do', value: sel.reason || '—' },
        { label: 'Loại', value: sel.appointmentTypeName || '—' },
        { label: 'Trạng thái', value: sel.statusName || '—' },
      ]}
    />
  );
};

export default BookingManagementV2;
