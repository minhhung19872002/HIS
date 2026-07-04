import React from 'react';
import { Link } from 'react-router-dom';
import { fmtDelta } from './_shared';

/* ==========================================================================
   BHYT / Revenue card — real revenue from dashboard
   ========================================================================== */

export const BhytCard: React.FC<{ revenue: number; revenueChange: number }> = ({ revenue, revenueChange }) => {
  const revM = (revenue / 1_000_000);
  return (
    <div className="panel">
      <div className="panel-h">
        <span className="title">Doanh thu · <b>hôm nay</b></span>
        <div className="actions">
          <Link to="/v2/billing" className="btn sm">Viện phí →</Link>
        </div>
      </div>
      <div className="panel-body pad">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>TỔNG THU</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t-0)', fontVariantNumeric: 'tabular-nums' }}>
              {revM >= 1000 ? (revM / 1000).toFixed(1) + 'B' : revM.toFixed(1) + 'M'}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-2)' }}>
              {revenue.toLocaleString('vi-VN')} đ
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>SO HÔM QUA</div>
            <div style={{
              fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
              color: revenueChange > 0 ? 'var(--s-ok)' : revenueChange < 0 ? 'var(--s-crit)' : 'var(--t-2)',
            }}>
              {fmtDelta(revenueChange, '%')}
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 'var(--space-6)', padding: '10px 12px',
          background: 'var(--a-cy-bg)', border: '1px solid var(--a-cy-line)', borderRadius: 'var(--r-2)',
          fontSize: 'var(--fs-sm)', color: 'var(--a-cy-dim)',
        }}>
          <b>Chi tiết giám định BHYT</b> · xem trong <Link to="/v2/bhxh-audit" style={{ color: 'var(--a-cy-dim)', textDecoration: 'underline' }}>BHXH Audit</Link>
        </div>
      </div>
    </div>
  );
};
