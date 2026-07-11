import React from 'react';
import { Link } from 'react-router-dom';
import type { BedLayoutDto } from '../../modules/inpatient/api/inpatient';

/* ==========================================================================
   Bed Map Mini — real bed layout
   ========================================================================== */

export const BedMapMini: React.FC<{
  beds: BedLayoutDto[];
  totals: { total: number; occ: number; free: number; maint: number };
  onBedClick?: (b: BedLayoutDto) => void;
}> = ({ beds, totals, onBedClick }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Nội trú · <b>bed map</b></span>
      <span className="sub">· {totals.occ}/{totals.total} giường</span>
      <div className="actions">
        <Link to="/v2/ipd" className="btn sm">Mở ward →</Link>
      </div>
    </div>
    <div className="panel-body pad">
      {totals.total === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Chưa có dữ liệu giường
        </div>
      ) : (
        <>
          <div className="bed-grid">
            {beds.map((b) => {
              const cls = b.status === 1 ? 'free' : b.status === 3 ? 'clean' : 'occ';
              return (
                <div
                  key={b.bedId}
                  className={'bed ' + cls}
                  title={`${b.bedName} · ${b.statusName}${b.patientName ? ' · ' + b.patientName : ''}`}
                  onClick={() => onBedClick?.(b)}
                  style={{ cursor: onBedClick ? 'pointer' : 'default' }}
                />
              );
            })}
          </div>
          <div className="bed-legend">
            <span><span className="sw occ" />Có bệnh nhân <b>{totals.occ}</b></span>
            <span><span className="sw free" />Trống <b>{totals.free}</b></span>
            <span><span className="sw clean" />Bảo trì <b>{totals.maint}</b></span>
          </div>
        </>
      )}
    </div>
  </div>
);
