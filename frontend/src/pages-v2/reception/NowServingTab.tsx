import React from 'react';
import type { RoomOverviewDto } from '../../api/reception';
import type { RawRow } from './shared';
import { statusKey, genderLabel, ageOf } from './shared';
export const NowServingTab: React.FC<{ rooms: RoomOverviewDto[]; rows: RawRow[] }> = ({ rooms, rows }) => {
  const now = new Date();
  const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="ab-stack" style={{ padding: '16px 14px', overflow: 'auto' }}>
      <div style={{
        fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontWeight: 600,
        letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
      }}>
        BẢNG GỌI SỐ THEO PHÒNG · {hm} · {rooms.length} phòng đang hoạt động
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        {rooms.length === 0 && (
          <div style={{ gridColumn: 'span 3', padding: 20, textAlign: 'center', color: 'var(--t-2)' }}>
            Chưa có phòng nào
          </div>
        )}
        {rooms.map((r) => {
          const current = rows.find((x) => x.roomId === r.roomId && statusKey(x) === 'serving');
          const next = rows.find((x) => x.roomId === r.roomId && statusKey(x) === 'waiting');
          return (
            <div key={r.roomId} style={{
              background: 'var(--d-2)', border: '1px solid var(--line)',
              borderRadius: 8, overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px', background: 'var(--d-1)',
                borderBottom: '1px solid var(--line)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <b style={{ fontSize: 'var(--fs-md)', color: 'var(--t-0)' }}>{r.departmentName}</b>
                  <span style={{
                    fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginLeft: 6,
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {r.roomCode} · {r.roomName}
                  </span>
                </div>
                {r.currentDoctorName && <span className="chip info">{r.currentDoctorName.split(' ').slice(-2).join(' ')}</span>}
              </div>
              <div style={{ padding: '14px 16px' }}>
                <div style={{
                  fontSize: 10.5, color: 'var(--t-2)',
                  textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 600,
                }}>Đang gọi</div>
                {current ? (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700,
                      color: 'var(--a-cy)', lineHeight: 1, margin: '4px 0',
                    }}>{current.queueCode || `#${current.queueNumber}`}</div>
                    <div style={{ fontSize: 'var(--fs-md)', fontWeight: 600, color: 'var(--t-0)' }}>{current.patientName}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>
                      {genderLabel(current)} · {ageOf(current)}t · {current.chiefComplaint || ''}
                    </div>
                  </>
                ) : (
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700,
                    color: 'var(--t-3)', lineHeight: 1, margin: '4px 0',
                  }}>—</div>
                )}
              </div>
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--line-soft)',
                background: 'var(--d-1)', display: 'flex', gap: 14, fontSize: 11.5,
              }}>
                <span><b style={{ color: 'var(--t-0)' }}>{r.waitingCount}</b> chờ</span>
                <span><b style={{ color: 'var(--t-0)' }}>{r.completedCount}</b> đã khám</span>
                <span style={{ flex: 1 }} />
                {next && (
                  <span style={{ color: 'var(--t-2)' }}>
                    Tiếp:&nbsp;
                    <b className="mono" style={{ color: 'var(--a-cy)' }}>
                      {next.queueCode || `#${next.queueNumber}`}
                    </b>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ────────────────────────────────────────────────────────────
   Stats tab — bar charts (theo giờ, theo khoa)
   ──────────────────────────────────────────────────────────── */

