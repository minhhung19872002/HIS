import React from 'react';
import { Drawer } from 'antd';
import type { AdmissionDto } from '../../modules/reception/api/reception';
import { fmtTime, essFromPriority } from './_shared';

/* ==========================================================================
   ER patient drawer — vitals + triage detail
   ========================================================================== */

// Deterministic vitals from patient code so a patient always gets the same
// demo HA/SpO2/mạch/sốt reading.
const fakeVitals = (code: string) => {
  let h = 0;
  for (let i = 0; i < code.length; i += 1) h = (h * 31 + code.charCodeAt(i)) % 2147483647;
  const rnd = (mod: number) => {
    h = (h * 9301 + 49297) % 233280;
    return h % mod;
  };
  const bpSys = 90 + rnd(50);
  const bpDia = 55 + rnd(30);
  return {
    bp: `${bpSys}/${bpDia}`,
    spo2: 88 + rnd(12),
    hr: 65 + rnd(40),
    temp: (36 + rnd(30) / 10).toFixed(1),
  };
};

export const ErPatientDrawer: React.FC<{
  row: AdmissionDto | null;
  onClose: () => void;
  onAddOrder: () => void;
  onTransferIcu: () => void;
}> = ({ row, onClose, onAddOrder, onTransferIcu }) => {
  if (!row) return null;
  const v = fakeVitals(row.patientCode);
  const ess = essFromPriority(row);
  return (
    <Drawer
      open={!!row}
      onClose={onClose}
      size="large"
      title={
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{row.patientName}</div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
            {row.patientCode} · {ess} · {row.roomName || '—'}
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-8)' }}>
          <button type="button" className="btn ghost" onClick={onClose}>Đóng</button>
          <button type="button" className="btn ghost" onClick={onAddOrder}>Thêm y lệnh</button>
          <button type="button" className="btn primary" onClick={onTransferIcu}>Chuyển hồi sức</button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-10)', marginBottom: 'var(--space-14)' }}>
        <div style={{ padding: '8px 10px', background: 'var(--s-crit-bg)', border: '1px solid var(--s-crit-bd)', borderRadius: 'var(--r-2)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--s-crit-tx)', fontFamily: 'var(--font-mono)' }}>HA</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--s-crit)', fontVariantNumeric: 'tabular-nums' }}>{v.bp}</div>
        </div>
        <div style={{ padding: '8px 10px', background: v.spo2 < 95 ? 'var(--s-crit-bg)' : 'var(--s-ok-bg)', border: `1px solid ${v.spo2 < 95 ? 'var(--s-crit-bd)' : 'var(--s-ok-bd)'}`, borderRadius: 'var(--r-2)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', fontFamily: 'var(--font-mono)' }}>SpO₂</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: v.spo2 < 95 ? 'var(--s-crit)' : 'var(--s-ok)', fontVariantNumeric: 'tabular-nums' }}>{v.spo2}%</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>MẠCH</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v.hr}</div>
        </div>
        <div style={{ padding: '8px 10px', background: '#f8fafc', border: '1px solid var(--line)', borderRadius: 'var(--r-2)' }}>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>SỐT</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{v.temp}°</div>
        </div>
      </div>
      <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 'var(--space-6)' }}>TRIỆU CHỨNG</div>
      <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-md)', marginBottom: 'var(--space-14)' }}>
        {row.chiefComplaint || row.priorityName || '—'}
      </div>
      <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 'var(--space-6)' }}>THỜI GIAN</div>
      <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)' }}>
        Tiếp nhận {fmtTime(row.admissionDate)} · Đối tượng {row.patientTypeName}
      </div>
      {row.insuranceNumber && (
        <>
          <div style={{ fontSize: 'var(--fs-xxs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', margin: '14px 0 6px' }}>BHYT</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-1)', fontFamily: 'var(--font-mono)' }}>
            {row.insuranceNumber}
            {row.isInsuranceValid ? <span style={{ marginLeft: 'var(--space-6)', color: 'var(--s-ok)' }}>✓ Hợp lệ</span>
                                   : <span style={{ marginLeft: 'var(--space-6)', color: 'var(--s-warn)' }}>⚠ Hết hạn</span>}
          </div>
        </>
      )}
    </Drawer>
  );
};
