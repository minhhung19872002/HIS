/**
 * SurgeryScheduleModal — Lên lịch phẫu thuật / xếp phòng mổ (port v1 pages/Surgery.tsx → v2, #409).
 *
 * Business logic VERBATIM từ v1 `handleScheduleSubmit`:
 * - scheduledDateTime = date.hour(time.hour()).minute(time.minute()) → 'YYYY-MM-DDTHH:mm:ss'
 * - Chỉ chọn được phòng mổ TRỐNG: v1 filter local status===1 vốn map từ BE status===0 (Trống)
 *   → ở đây dùng thẳng BE `room.status === 0`.
 * - Prefill: ngày mai · 08:00 · duration = durationMinutes || 60; date cấm quá khứ; giờ bước 15p;
 *   duration 15–480.
 *
 * Khác v1 (dọn nợ, ghi trong notes #409): bỏ 2 input surgeonName / anesthesiologistName —
 * v1 chỉ ghi local-state, KHÔNG BAO GIỜ gửi BE (ScheduleSurgeryDto không có field này) →
 * giữ lại sẽ tạo ảo giác đã phân công ekip.
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker, InputNumber, TimePicker } from 'antd';
import { ModalShell, Btn, AbSelect, tk, tw } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Section, Row2 } from './surgery-modals/_shared';
import {
  getOperatingRooms,
  scheduleSurgery,
  type OperatingRoomDto,
  type ScheduleSurgeryDto,
  type SurgeryDto,
} from '../api/surgery';

export interface SurgeryScheduleModalProps {
  open: boolean;
  onClose: () => void;
  surgery: SurgeryDto | null;
  /** Gọi sau khi lên lịch thành công để trang reload danh sách. */
  onScheduled: () => void;
}

export const SurgeryScheduleModal: React.FC<SurgeryScheduleModalProps> = ({ open, onClose, surgery, onScheduled }) => {
  const [rooms, setRooms] = useState<OperatingRoomDto[]>([]);
  const [saving, setSaving] = useState(false);

  const [scheduledDate, setScheduledDate] = useState<dayjs.Dayjs | null>(null);
  const [scheduledTime, setScheduledTime] = useState<dayjs.Dayjs | null>(null);
  const [operatingRoomId, setOperatingRoomId] = useState<string | undefined>(undefined);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);

  // Prefill verbatim v1 handleScheduleSurgery + tải danh sách phòng mổ khi mở
  useEffect(() => {
    if (!open || !surgery) return;
    setScheduledDate(dayjs().add(1, 'day'));
    setScheduledTime(dayjs('08:00', 'HH:mm'));
    setEstimatedDuration(surgery.durationMinutes || 60);
    setOperatingRoomId(undefined);
    getOperatingRooms()
      .then((response) => setRooms(response.data || []))
      .catch((error) => { console.warn('Error fetching operating rooms:', error); setRooms([]); });
  }, [open, surgery]);

  const handleSubmit = async () => {
    if (!surgery) return;
    if (!scheduledDate) { tw('Vui lòng chọn ngày'); return; }
    if (!scheduledTime) { tw('Vui lòng chọn giờ'); return; }
    if (!operatingRoomId) { tw('Vui lòng chọn phòng mổ'); return; }
    if (!estimatedDuration) { tw('Vui lòng nhập thời gian'); return; }

    setSaving(true);
    try {
      // VERBATIM v1 handleScheduleSubmit
      const scheduledDateTime = scheduledDate
        .hour(scheduledTime.hour())
        .minute(scheduledTime.minute());

      const scheduleDto: ScheduleSurgeryDto = {
        surgeryId: surgery.id,
        scheduledDate: scheduledDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        operatingRoomId,
        estimatedDurationMinutes: estimatedDuration,
      };

      await scheduleSurgery(scheduleDto);
      tk('Lên lịch phẫu thuật thành công');
      onScheduled();
      onClose();
    } catch (error) {
      console.warn('Error scheduling surgery:', error);
      tw('Có lỗi xảy ra khi lên lịch phẫu thuật');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="calendar" size={14} />
          <span>Lên lịch phẫu thuật</span>
        </span>
      }
      sub={surgery ? `${surgery.surgeryCode} · ${surgery.patientName}` : undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" loading={saving} onClick={() => { void handleSubmit(); }}>
            <TermIcon name="calendar" size={12} /> Lên lịch
          </Btn>
        </>
      }
    >
      {surgery && (
        <>
          <div className="rec-section" style={{ paddingTop: 0 }}>
            <div className="rec-kv">
              <span>Mã yêu cầu</span><span className="mono">{surgery.surgeryCode}</span>
              <span>Mã BN</span><span className="mono">{surgery.patientCode}</span>
              <span>Họ tên</span><b>{surgery.patientName}</b>
              <span>Loại PT</span><span>{surgery.surgeryTypeName}</span>
              <span>Phương pháp PT</span><span>{surgery.surgeryMethod || surgery.surgeryServiceName}</span>
              <span>Chẩn đoán</span><span>{surgery.preOperativeDiagnosis || '—'}</span>
            </div>
          </div>

          <Section title="Lịch mổ">
            <Row2 label="Ngày mổ *">
              <DatePicker
                format="DD/MM/YYYY"
                style={{ width: '100%' }}
                placeholder="Chọn ngày"
                size="small"
                value={scheduledDate}
                onChange={(d) => setScheduledDate(d)}
                disabledDate={(current) => current && current < dayjs().startOf('day')}
              />
            </Row2>
            <Row2 label="Giờ mổ *">
              <TimePicker
                format="HH:mm"
                style={{ width: '100%' }}
                placeholder="Chọn giờ"
                size="small"
                minuteStep={15}
                value={scheduledTime}
                onChange={(t) => setScheduledTime(t)}
              />
            </Row2>
            <Row2 label="Phòng mổ *">
              <AbSelect
                // Chỉ phòng TRỐNG (BE status 0) — verbatim điều kiện v1 (local status===1 ⇔ BE 0)
                options={rooms.filter((room) => room.status === 0).map((room) => ({ value: room.id, label: room.name }))}
                value={operatingRoomId ?? ''}
                onChange={(v) => setOperatingRoomId(v || undefined)}
                placeholder="Chọn phòng mổ"
              />
            </Row2>
            <Row2 label="Dự kiến (phút) *">
              <InputNumber
                min={15}
                max={480}
                style={{ width: '100%' }}
                size="small"
                value={estimatedDuration}
                onChange={(v) => setEstimatedDuration(v)}
              />
            </Row2>
          </Section>

          <div style={{
            fontSize: 'var(--fs-sm)', color: 'var(--t-2)', padding: '8px 10px',
            background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
          }}>
            <TermIcon name="alert" size={11} /> Lưu ý: Vui lòng kiểm tra lịch phòng mổ và ekip trước khi lên lịch
          </div>
        </>
      )}
    </ModalShell>
  );
};
