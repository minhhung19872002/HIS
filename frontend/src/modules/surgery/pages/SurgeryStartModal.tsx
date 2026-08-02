/**
 * SurgeryStartModal — Bắt đầu ca phẫu thuật (port v1 pages/Surgery.tsx → v2, #409).
 *
 * Business logic VERBATIM từ v1 `handleStartSurgerySubmit`:
 * startSurgery({ surgeryId, startTime: dayjs(v).format('YYYY-MM-DDTHH:mm:ss') });
 * prefill thời gian bắt đầu = now; cảnh báo kiểm tra thông tin BN + ekip trước khi bắt đầu.
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { DatePicker } from 'antd';
import { ModalShell, Btn, tk, tw } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { Section, Row2 } from './surgery-modals/_shared';
import { startSurgery, type StartSurgeryDto, type SurgeryDto } from '../api/surgery';

export interface SurgeryStartModalProps {
  open: boolean;
  onClose: () => void;
  surgery: SurgeryDto | null;
  /** Gọi sau khi bắt đầu thành công để trang reload danh sách. */
  onStarted: () => void;
}

export const SurgeryStartModal: React.FC<SurgeryStartModalProps> = ({ open, onClose, surgery, onStarted }) => {
  const [actualStartTime, setActualStartTime] = useState<dayjs.Dayjs | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill verbatim v1 handleStartSurgery: actualStartTime = now
  useEffect(() => {
    if (open) setActualStartTime(dayjs());
  }, [open]);

  const handleSubmit = async () => {
    if (!surgery) return;
    if (!actualStartTime) { tw('Vui lòng chọn thời gian'); return; }

    setSaving(true);
    try {
      // VERBATIM v1 handleStartSurgerySubmit
      const startDto: StartSurgeryDto = {
        surgeryId: surgery.id,
        startTime: dayjs(actualStartTime).format('YYYY-MM-DDTHH:mm:ss'),
      };

      await startSurgery(startDto);
      tk('Bắt đầu phẫu thuật thành công');
      onStarted();
      onClose();
    } catch (error) {
      console.warn('Error starting surgery:', error);
      tw('Có lỗi xảy ra khi bắt đầu phẫu thuật');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="md"
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-8)' }}>
          <TermIcon name="play" size={14} />
          <span>Bắt đầu phẫu thuật</span>
        </span>
      }
      sub={surgery ? `${surgery.surgeryCode} · ${surgery.patientName}` : undefined}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
          <span style={{ flex: 1 }} />
          <Btn variant="primary" loading={saving} onClick={() => { void handleSubmit(); }}>
            <TermIcon name="play" size={12} /> Bắt đầu
          </Btn>
        </>
      }
    >
      {surgery && (
        <>
          <div style={{
            fontSize: 'var(--fs-sm)', color: 'var(--s-warn)', padding: '8px 10px',
            background: 'var(--s-warn-bg)', border: '1px solid var(--line)', borderRadius: 'var(--r-2)',
            marginBottom: 'var(--space-10)',
          }}>
            <TermIcon name="alert" size={11} /> Xác nhận bắt đầu phẫu thuật — Vui lòng kiểm tra kỹ thông tin bệnh nhân và ekip trước khi bắt đầu
          </div>

          <div className="rec-section" style={{ paddingTop: 0 }}>
            <div className="rec-kv">
              <span>Mã yêu cầu</span><span className="mono">{surgery.surgeryCode}</span>
              <span>Mã BN</span><span className="mono">{surgery.patientCode}</span>
              <span>Họ tên</span><b>{surgery.patientName}</b>
              <span>Phòng mổ</span><span>{surgery.operatingRoomName || '—'}</span>
              <span>Phương pháp PT</span><span>{surgery.surgeryMethod || surgery.surgeryServiceName}</span>
              <span>Phẫu thuật viên</span><span>{surgery.requestDoctorName || '—'}</span>
            </div>
          </div>

          <Section title="Thời gian">
            <Row2 label="Bắt đầu lúc *">
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                style={{ width: '100%' }}
                placeholder="Chọn thời gian"
                size="small"
                value={actualStartTime}
                onChange={(v) => setActualStartTime(v)}
              />
            </Row2>
          </Section>
        </>
      )}
    </ModalShell>
  );
};
