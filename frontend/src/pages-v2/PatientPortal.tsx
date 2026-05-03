import React from 'react';
import dayjs from 'dayjs';
import { getMyAppointments } from '../api/patientPortal';
import type { OnlineAppointmentDto } from '../api/patientPortal';
import { SimpleV2Page, StatusBadge, type ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';

const fmtDT = (d?: string, t?: string) => {
  if (!d) return '—';
  return `${dayjs(d).format('DD/MM/YYYY')}${t ? ` ${t.slice(0, 5)}` : ''}`;
};

const PatientPortalV2: React.FC = () => {
  const columns: ColumnDef<OnlineAppointmentDto>[] = [
    { key: 'code', label: 'Mã hẹn', mono: true, width: 130, render: (r) => r.appointmentCode },
    { key: 'patient', label: 'Bệnh nhân', render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i>{r.appointmentTypeName}{r.isFirstVisit ? ' · BN mới' : ''}</i>
      </div>
    )},
    { key: 'dept', label: 'Khoa · BS', render: (r) => (
      <div className="cell-2l"><b>{r.departmentName}</b><i>{r.doctorName || 'Chưa chọn'}</i></div>
    )},
    { key: 'preferred', label: 'Hẹn mong muốn', mono: true, width: 130, render: (r) => fmtDT(r.preferredDate, r.preferredTime) },
    { key: 'scheduled', label: 'Đã xếp', mono: true, width: 130, render: (r) => fmtDT(r.scheduledDate, r.scheduledTime) },
    { key: 'fee', label: 'Phí dự kiến', mono: true, width: 110, render: (r) => r.estimatedFee ? `${r.estimatedFee.toLocaleString('vi-VN')} ₫` : '—' },
    { key: 'paid', label: 'Thanh toán', width: 110, render: (r) =>
      r.paymentStatus === 1 ? <span className="chip ok">Đã trả</span> : <span className="chip warn">Chưa</span>
    },
    { key: 'status', label: 'TT', width: 130, render: (r) =>
      <StatusBadge tone="info" dot>{r.paymentStatusName || 'Đã đặt'}</StatusBadge>
    },
  ];

  return (
    <SimpleV2Page<OnlineAppointmentDto>
      title="Cổng bệnh nhân"
      load={async () => (await getMyAppointments(undefined,
        dayjs().subtract(30, 'day').format('YYYY-MM-DD'),
        dayjs().add(60, 'day').format('YYYY-MM-DD'),
      )).data}
      rowKey={(r) => r.id}
      columns={columns}
      searchPlaceholder="Tìm tên BN / mã hẹn…"
      searchOf={(r) => `${r.patientName} ${r.appointmentCode} ${r.departmentName} ${r.doctorName || ''}`}
      kpis={(rows) => {
        const today = dayjs().startOf('day');
        const upcoming = rows.filter((r) => r.scheduledDate && dayjs(r.scheduledDate).isAfter(today)).length;
        const tele = rows.filter((r) => r.appointmentType === 'Telemedicine').length;
        const paid = rows.filter((r) => r.paymentStatus === 1).length;
        return [
          { lbl: 'Tổng đặt', val: rows.length },
          { lbl: 'Sắp đến', val: upcoming, tone: 'info' },
          { lbl: 'Telemedicine', val: tele, sub: 'khám từ xa' },
          { lbl: 'Đã thanh toán', val: paid, tone: 'ok' },
          { lbl: 'BN mới', val: rows.filter((r) => r.isFirstVisit).length },
          { lbl: 'BHYT', val: rows.filter((r) => r.insuranceUsed).length, sub: 'sử dụng' },
        ];
      }}
      drawer={(r) => (
        <>
          <div className="rec-section">
            <h5><TermIcon name="user" size={11} /> CUỘC HẸN</h5>
            <div className="rec-kv">
              <span>Mã hẹn</span><span className="mono" style={{ color: 'var(--a-cy)' }}>{r.appointmentCode}</span>
              <span>Bệnh nhân</span><b>{r.patientName}</b>
              <span>Loại</span><span>{r.appointmentTypeName}</span>
              <span>Khoa</span><span>{r.departmentName}</span>
              <span>Bác sĩ</span><span>{r.doctorName || 'Chưa chọn'}</span>
              {r.specialtyName && (<><span>Chuyên khoa</span><span>{r.specialtyName}</span></>)}
            </div>
          </div>
          <div className="rec-section">
            <h5><TermIcon name="calendar" size={11} /> THỜI GIAN</h5>
            <div className="rec-kv">
              <span>Hẹn mong muốn</span><span>{fmtDT(r.preferredDate, r.preferredTime)}</span>
              <span>Đã xếp</span><span>{fmtDT(r.scheduledDate, r.scheduledTime)}</span>
              {r.estimatedDuration && (<><span>Thời lượng</span><span>{r.estimatedDuration} phút</span></>)}
            </div>
          </div>
          {r.chiefComplaint && (
            <div className="rec-section">
              <h5><TermIcon name="info" size={11} /> LÝ DO KHÁM</h5>
              <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{r.chiefComplaint}</div>
              {r.symptoms && r.symptoms.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {r.symptoms.map((s, i) => <span key={i} className="chip warn">{s}</span>)}
                </div>
              )}
            </div>
          )}
          <div className="rec-section">
            <h5><TermIcon name="dollar" size={11} /> THANH TOÁN</h5>
            <div className="rec-kv">
              <span>Phí dự kiến</span><b className="mono">{r.estimatedFee ? `${r.estimatedFee.toLocaleString('vi-VN')} ₫` : '—'}</b>
              <span>BHYT</span><span>{r.insuranceUsed ? <span className="chip ok">Có sử dụng</span> : 'Không'}</span>
              <span>Trạng thái TT</span><span className={`chip ${r.paymentStatus === 1 ? 'ok' : 'warn'}`}>{r.paymentStatusName}</span>
            </div>
          </div>
        </>
      )}
      drawerTitle={(r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ color: 'var(--a-cy)', fontSize: 13 }}>{r.appointmentCode}</span>
          <span style={{ fontSize: 14 }}>{r.patientName}</span>
        </span>
      )}
      drawerSub={(r) => `${r.appointmentTypeName} · ${r.departmentName}`}
    />
  );
};

export default PatientPortalV2;
