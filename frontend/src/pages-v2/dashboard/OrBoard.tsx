import React from 'react';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import type { SurgeryScheduleDto } from '../../modules/surgery/api/surgery';

/* ==========================================================================
   OR Board — real surgery schedule
   ========================================================================== */

export const OrBoard: React.FC<{
  schedule: SurgeryScheduleDto[];
  onSlotClick?: (s: NonNullable<SurgeryScheduleDto['surgeries']>[number], orName: string) => void;
}> = ({ schedule, onSlotClick }) => {
  const totalItems = schedule.reduce((a, s) => a + (s.surgeries?.length ?? 0), 0);
  const doing = schedule.reduce(
    (a, s) => a + (s.surgeries?.filter((x) => x.status === 1).length ?? 0),
    0,
  );

  // Track window: 07:00 → 17:00 (10 hours = 600 min)
  const startHour = 7;
  const totalM = 10 * 60;

  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Phòng mổ · <b>hôm nay</b></span>
        <span className="sub">· {doing}/{schedule.length} đang mổ · {totalItems} ca</span>
        <div className="actions">
          <Link to="/v2/surgery" className="btn sm">Mở lịch →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        {schedule.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Chưa có lịch mổ hôm nay
          </div>
        ) : (
          <>
            {schedule.map((or) => (
              <div key={or.operatingRoomId} className="or-row">
                <div className="or-lbl">{or.operatingRoomName}</div>
                <div className="or-track">
                  {(or.surgeries ?? []).map((it) => {
                    if (!it.scheduledTime) return null;
                    const start = dayjs(it.scheduledTime);
                    const end = start.add(it.estimatedDuration || 60, 'minute');
                    const startM = (start.hour() - startHour) * 60 + start.minute();
                    const endM   = (end.hour()   - startHour) * 60 + end.minute();
                    if (endM <= 0 || startM >= totalM) return null;
                    const left   = (Math.max(0, startM) / totalM) * 100;
                    const width  = ((Math.min(totalM, endM) - Math.max(0, startM)) / totalM) * 100;
                    // status: 0=Scheduled, 1=InProgress, 2=Completed, 3=Cancelled
                    const st = it.status;
                    const stColor  = st === 2 ? 'var(--d-3)' : st === 1 ? 'var(--a-cy-bg)' : st === 3 ? 'var(--s-crit-bg)' : 'var(--s-warn-bg)';
                    const stBorder = st === 2 ? 'var(--line)' : st === 1 ? 'var(--a-cy-line)' : st === 3 ? 'var(--s-crit-bd)' : 'var(--s-warn-bd)';
                    const stText   = st === 2 ? 'var(--t-2)' : st === 1 ? 'var(--a-cy-dim)' : st === 3 ? 'var(--s-crit-tx)' : '#a16207';
                    return (
                      <div
                        key={it.surgeryId}
                        className="or-slot"
                        onClick={() => onSlotClick?.(it, or.operatingRoomName)}
                        style={{ left: `${left}%`, width: `${width}%`, background: stColor, borderColor: stBorder, color: stText, cursor: onSlotClick ? 'pointer' : 'default' }}
                        title={`${it.surgeryServiceName} · ${it.patientName} · ${it.statusName}`}
                      >
                        <span className="mono" style={{ fontSize: 9 }}>{start.format('HH:mm')}</span>
                        <span style={{ fontSize: 'var(--fs-xxs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {it.surgeryServiceName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="or-axis">
              {['7','8','9','10','11','12','13','14','15','16','17'].map((h) => <span key={h}>{h}h</span>)}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
