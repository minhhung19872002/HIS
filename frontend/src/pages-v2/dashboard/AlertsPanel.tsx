import React from 'react';
import type { BusinessAlertDto } from '../../api/businessAlerts';
import { fmtRelShort } from './_shared';

/* ==========================================================================
   Alerts Panel — business alerts
   ========================================================================== */

export const AlertsPanel: React.FC<{
  alerts: BusinessAlertDto[];
  onAlertClick?: (a: BusinessAlertDto) => void;
  onShowAll?: () => void;
}> = ({ alerts, onAlertClick, onShowAll }) => (
  <div className="panel">
    <div className="panel-h">
      <span className="title">Cảnh báo · <b>sự kiện</b></span>
      <div className="actions">
        <button type="button" className="btn sm ghost" onClick={onShowAll}>Xem hết</button>
      </div>
    </div>
    <div className="panel-body" style={{ padding: '4px 0' }}>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Không có cảnh báo mới
        </div>
      ) : (
        alerts.slice(0, 5).map((a) => {
          const tClass = a.severity === 1 ? 'crit' : a.severity === 2 ? 'warn' : a.severity === 3 ? 'info' : 'ok';
          return (
            <div
              key={a.id}
              className={'alert-row ' + tClass}
              onClick={() => onAlertClick?.(a)}
              style={{ cursor: onAlertClick ? 'pointer' : 'default' }}
            >
              <div className="alert-dt">{fmtRelShort(a.createdAt)}</div>
              <div>
                <div className="alert-who">
                  {a.patientName ? `${a.patientName} · ` : ''}{a.module?.toUpperCase() || a.title}
                </div>
                <div className="alert-msg">{a.message}</div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
