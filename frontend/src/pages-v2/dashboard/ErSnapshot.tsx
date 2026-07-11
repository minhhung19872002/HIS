import React from 'react';
import { Link } from 'react-router-dom';
import type { AdmissionDto } from '../../modules/reception/api/reception';
import { fmtTime, essFromPriority } from './_shared';

/* ==========================================================================
   ER Snapshot (real emergency admissions)
   ========================================================================== */

export const ErSnapshot: React.FC<{
  rows: AdmissionDto[];
  total: number;
  onRowClick?: (r: AdmissionDto) => void;
}> = ({ rows, total, onRowClick }) => {
  const esi1 = rows.filter((r) => essFromPriority(r) === 'ESI-1').length;
  const esi2 = rows.filter((r) => essFromPriority(r) === 'ESI-2').length;
  const esi3plus = rows.length - esi1 - esi2;
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Cấp cứu · <b>trực</b></span>
        <span className="sub">· {total} BN cấp cứu hôm nay</span>
        <div className="actions">
          <Link to="/v2/emergency-disaster" className="btn sm">Mở triage →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
            Không có bệnh nhân cấp cứu đang chờ
          </div>
        ) : (
          <>
            <div className="er-chips">
              <span className="er-chip"><b>{esi1}</b><span>ESI-1 Hồi sức</span></span>
              <span className="er-chip"><b>{esi2}</b><span>ESI-2 Khẩn</span></span>
              <span className="er-chip warn"><b>{esi3plus}</b><span>ESI 3–5</span></span>
            </div>
            <table className="tbl" style={{ marginTop: 'var(--space-10)' }}>
              <thead>
                <tr>
                  <th>ESI</th>
                  <th>Bệnh nhân</th>
                  <th>Triệu chứng</th>
                  <th>Phòng</th>
                  <th className="num">Đến</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((r) => {
                  const ess = essFromPriority(r);
                  const chipCls = ess === 'ESI-1' || ess === 'ESI-2' ? 'crit' : ess === 'ESI-3' ? 'warn' : 'info';
                  return (
                    <tr
                      key={r.id}
                      onClick={() => onRowClick?.(r)}
                      style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                    >
                      <td><span className={'chip ' + chipCls}>{ess}</span></td>
                      <td>
                        <b className="ab-u-b">{r.patientName}</b>
                        <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xxs)', fontFamily: 'var(--font-mono)' }}>
                          #{r.queueNumber} · {r.patientCode}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'normal', color: 'var(--t-1)', fontSize: 'var(--fs-sm)' }}>
                        {r.chiefComplaint || r.priorityName || '—'}
                      </td>
                      <td className="mono">{r.roomName || '—'}</td>
                      <td className="num mono">{fmtTime(r.admissionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
};
