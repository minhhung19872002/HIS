import React from 'react';
import { Link } from 'react-router-dom';
import type { MedicalHRDashboardDto } from '../../../hr/api/medicalHR';

/* ==========================================================================
   Shift Board — totals + alerts from HR dashboard API.
   ========================================================================== */

export const ShiftBoard: React.FC<{ hr: MedicalHRDashboardDto | null }> = ({ hr }) => {
  if (!hr) {
    return (
      <div className="panel">
        <div className="panel-h">
          <span className="title">Ca trực</span>
          <div className="actions">
            <Link to="/v2/hr" className="btn sm">Rota →</Link>
          </div>
        </div>
        <div className="panel-body" style={{ padding: '14px 0', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
          Chưa có dữ liệu nhân sự
        </div>
      </div>
    );
  }
  // Backend returns onDutyToday / openShiftsThisWeek / onLeave (the *Shifts /
  // onLeaveStaff fields on the DTO are legacy and absent at runtime).
  const onDuty = hr.onDutyToday ?? hr.clinicSessionsToday ?? 0;
  const openSh = hr.openShiftsThisWeek ?? hr.openShifts ?? 0;
  const onLeave = hr.onLeave ?? hr.onLeaveStaff ?? 0;
  const items: { label: string; value: string; tone?: 'ok' | 'warn' | 'crit' }[] = [
    { label: 'Đang trực hôm nay', value: String(hr.activeStaff), tone: 'ok' },
    { label: 'Bác sĩ / Điều dưỡng / KTV', value: `${hr.doctors} / ${hr.nurses} / ${hr.technicians}` },
    { label: 'Phiên trực hôm nay', value: String(onDuty) },
    { label: 'Ca trống tuần', value: String(openSh), tone: openSh === 0 ? 'ok' : 'warn' },
    { label: 'Đang nghỉ', value: String(onLeave) },
    { label: 'Sắp hết hạn CCHN (30 ngày)', value: String(hr.expiringLicenses30Days), tone: hr.expiringLicenses30Days > 0 ? 'warn' : 'ok' },
    { label: 'CME chưa đạt', value: String(hr.cmeNonCompliant), tone: hr.cmeNonCompliant > 0 ? 'warn' : 'ok' },
  ];
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Ca trực · <b>hôm nay</b></span>
        <span className="sub">· {hr.activeStaff}/{hr.totalStaff} người</span>
        <div className="actions">
          <Link to="/v2/hr" className="btn sm">Rota →</Link>
        </div>
      </div>
      <div className="panel-body" style={{ padding: '4px 0' }}>
        {items.map((it, i) => (
          <div key={i} className="staff-row">
            <div className="staff-nm ab-u-flex1">
              <div className="staff-n" style={{ fontSize: 'var(--fs-sm)' }}>{it.label}</div>
            </div>
            <span className={'chip ' + (it.tone || '')} style={{ fontFamily: 'var(--font-mono)' }}>{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
