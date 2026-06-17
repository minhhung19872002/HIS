import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App as AntdApp, Input } from 'antd';
import { ModalShell } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import { getBookings } from '../../api/bookingManagement';
import type { BookingStatusDto } from '../../api/appointmentBooking';
import { quickRegisterByAppointment } from '../../api/reception';

/* ────────────────────────────────────────────────────────────
   Danh sách đặt khám — chọn 1 lịch hẹn (Chờ XN / Đã XN) rồi check-in
   thẳng vào tiếp đón qua quickRegisterByAppointment
   (POST /reception/register/quick/appointment) → tạo phiên + số thứ tự.
   ──────────────────────────────────────────────────────────── */

// Trích lỗi thật từ axios error để hiện cho user thay vì "thất bại" chung chung.
function extractApiError(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: unknown; status?: number }; message?: string };
  const d = ax?.response?.data;
  if (typeof d === 'string' && d.trim()) return d.trim();
  if (d && typeof d === 'object') {
    const o = d as Record<string, unknown>;
    if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
    if (typeof o.title === 'string' && o.title.trim()) return o.title.trim();
  }
  const status = ax?.response?.status;
  if (status) return `${fallback} (HTTP ${status})`;
  return ax?.message || fallback;
}

type PickBooking = BookingStatusDto & { _key: string };

const BOOKING_STATUS_LABEL: Record<number, string> = {
  0: 'Chờ xác nhận', 1: 'Đã xác nhận', 2: 'Đã đến', 3: 'Vắng mặt', 4: 'Hủy',
};

export const BookingPickerModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onCheckedIn: () => void;
}> = ({ open, onClose, onCheckedIn }) => {
  const { message } = AntdApp.useApp();
  const [list, setList] = useState<PickBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState('');
  const [busyCode, setBusyCode] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setKw('');
    setLoading(true);
    const today = dayjs().format('YYYY-MM-DD');
    // Lịch hôm nay, ưu tiên trạng thái chưa đến (Chờ XN / Đã XN).
    getBookings({ fromDate: today, toDate: today, pageSize: 200 })
      .then((r) => {
        const items = (r.items || [])
          .filter((b) => b.status === 0 || b.status === 1)
          .map((b) => ({ ...b, _key: b.appointmentCode }));
        setList(items);
      })
      .catch(() => { setList([]); message.warning('Không tải được danh sách đặt khám'); })
      .finally(() => setLoading(false));
  }, [open, message]);

  const filtered = list.filter((b) => {
    const q = kw.trim().toLowerCase();
    if (!q) return true;
    return [b.patientName, b.appointmentCode, b.phoneNumber, b.doctorName, b.departmentName]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  const checkIn = async (b: PickBooking) => {
    setBusyCode(b.appointmentCode);
    try {
      await quickRegisterByAppointment(b.appointmentCode);
      message.success(`Đã tiếp đón từ lịch hẹn · ${b.patientName}`);
      onCheckedIn();
    } catch (err) {
      message.error(extractApiError(err, 'Check-in từ lịch hẹn thất bại'));
    } finally {
      setBusyCode(null);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title="Danh sách đặt khám hôm nay"
      sub="Chọn bệnh nhân đã đặt lịch để tiếp đón nhanh"
      footer={<button type="button" className="ab-btn" onClick={onClose}>Đóng</button>}
    >
      <div style={{ marginBottom: 'var(--space-10)' }}>
        <Input
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          placeholder="Tìm theo tên, mã hẹn, SĐT, bác sĩ…"
          allowClear
        />
      </div>
      {loading && <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '20px 0', textAlign: 'center' }}>Đang tải…</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '24px 0', textAlign: 'center' }}>
          Không có lịch đặt khám chờ tiếp đón hôm nay.
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxHeight: 420, overflow: 'auto' }}>
          {filtered.map((b) => (
            <div
              key={b._key}
              style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-8)', alignItems: 'center',
                padding: '8px 10px', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
              }}
            >
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-0)' }}>
                  {b.patientName}
                  <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 'var(--fs-xs)', marginLeft: 'var(--space-8)' }}>{b.appointmentCode}</span>
                </div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                  {b.appointmentTime ? `${b.appointmentTime} · ` : ''}
                  {b.departmentName || '—'}{b.doctorName ? ` · ${b.doctorName}` : ''}
                  {b.phoneNumber ? ` · ${b.phoneNumber}` : ''}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>
                  {BOOKING_STATUS_LABEL[b.status] || b.statusName}
                  {b.reason ? ` · ${b.reason}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="ab-btn primary sm"
                disabled={busyCode === b.appointmentCode}
                onClick={() => checkIn(b)}
              >
                <TermIcon name="check" size={11} /> {busyCode === b.appointmentCode ? 'Đang…' : 'Tiếp đón'}
              </button>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
};
