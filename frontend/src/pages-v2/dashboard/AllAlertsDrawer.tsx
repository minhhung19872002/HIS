import React from 'react';
import { Drawer } from 'antd';
import type { BusinessAlertDto } from '../../api/businessAlerts';
import { fmtRelShort } from './_shared';

/* ==========================================================================
   All-alerts drawer
   ========================================================================== */

export const AllAlertsDrawer: React.FC<{
  open: boolean;
  alerts: BusinessAlertDto[];
  onClose: () => void;
  onAlertClick: (a: BusinessAlertDto) => void;
  onAckAll: () => void;
}> = ({ open, alerts, onClose, onAlertClick, onAckAll }) => (
  <Drawer
    open={open}
    onClose={onClose}
    size="large"
    title={
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Tất cả cảnh báo</div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>Hôm nay · {alerts.length} cảnh báo</div>
      </div>
    }
    footer={
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn primary" onClick={onAckAll}>ACK tất cả</button>
      </div>
    }
  >
    <div style={{ padding: '0 4px' }}>
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>
          Không có cảnh báo
        </div>
      ) : (
        alerts.map((a) => {
          const tClass = a.severity === 1 ? 'crit' : a.severity === 2 ? 'warn' : a.severity === 3 ? 'info' : 'ok';
          return (
            <div
              key={a.id}
              className={'alert-row ' + tClass}
              onClick={() => onAlertClick(a)}
              style={{ cursor: 'pointer' }}
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
  </Drawer>
);
