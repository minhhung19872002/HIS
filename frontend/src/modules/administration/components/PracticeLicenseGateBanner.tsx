/**
 * v2 CCHN banner (port of the v1 OPD DoctorLicenseBanner, QA round 3).
 * Shows the server-side prescribing gate for the logged-in user:
 *  - Blocked  → red banner: the API refuses creating/issuing prescriptions and service orders.
 *  - Warning  → amber banner: allowed, but licence data is missing / out of sync / expiring soon.
 *  - Ok       → nothing.
 */
import React, { useEffect, useState } from 'react';
import TermIcon from '../../../components/layout/terminal/Icon';
import { getMyPrescribingGate, type PracticeLicenseGateDto } from '../api/doctorLicense';

interface Props {
  /** Called once the gate is known so the page can disable its order/prescribe buttons. */
  onGate?: (gate: PracticeLicenseGateDto) => void;
}

const PracticeLicenseGateBanner: React.FC<Props> = ({ onGate }) => {
  const [gate, setGate] = useState<PracticeLicenseGateDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMyPrescribingGate()
      .then((g) => { if (!cancelled) { setGate(g); onGate?.(g); } })
      .catch(() => { /* banner is advisory — the server still enforces the gate on save */ });
    return () => { cancelled = true; };
  }, [onGate]);

  if (!gate || gate.level === 'Ok') return null;
  const blocked = gate.blocked;
  return (
    <div
      role={blocked ? 'alert' : 'status'}
      data-testid="practice-license-gate-banner"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)',
        padding: '8px 10px', borderRadius: 'var(--r-2)', fontSize: 11.5,
        border: `1px solid ${blocked ? 'var(--s-crit-bd)' : 'var(--line)'}`,
        borderLeft: `3px solid ${blocked ? 'var(--s-crit)' : 'var(--s-warn)'}`,
        background: blocked ? 'var(--s-crit-bg)' : 'var(--d-0)',
      }}
    >
      <TermIcon name="alert" size={12} />
      <div>
        <strong style={{ color: blocked ? 'var(--s-crit-tx)' : undefined }}>
          {blocked ? 'CCHN không hợp lệ — KHÔNG được kê đơn/chỉ định' : 'Lưu ý CCHN'}
        </strong>
        <div style={{ color: 'var(--t-2)' }}>{gate.message}</div>
      </div>
    </div>
  );
};

export default PracticeLicenseGateBanner;
