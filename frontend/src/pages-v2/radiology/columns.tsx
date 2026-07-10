import type { RadiologyOrderDto } from '../../modules/radiology/api/ris';
import { StatusBadge, type ColumnDef } from '../_v2kit';
import { detectModality, statusKey, statusTone, STATUS_TABS, fmtHM } from './_shared';

export const radiologyColumns: ColumnDef<RadiologyOrderDto>[] = [
  { key: 'code', label: 'Mã RIS', width: 130, mono: true, render: (r) => r.orderCode },
  { key: 'time', label: 'Giờ', mono: true, width: 70, render: (r) => fmtHM(r.orderDate) },
  {
    key: 'patient', label: 'Bệnh nhân',
    render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode} · {r.age || '—'}t · {r.gender || '—'}</i>
      </div>
    ),
  },
  {
    key: 'mod', label: 'Modality', width: 80,
    render: (r) => {
      const m = detectModality(r.items?.[0]);
      return (
        <span style={{
          display: 'inline-block', padding: '2px 8px',
          background: m.color, color: '#fff', borderRadius: 'var(--r-1)',
          fontSize: 'var(--fs-xs)', fontWeight: 700, fontFamily: 'var(--font-mono)',
        }}>{m.v}</span>
      );
    },
  },
  {
    key: 'proc', label: 'Kỹ thuật',
    render: (r) => {
      const items = r.items || [];
      const first = items[0];
      return (
        <div className="cell-2l">
          <b>{first?.serviceName || '—'}</b>
          <i className="mono">{first?.serviceCode || ''}{items.length > 1 && ` +${items.length - 1}`}</i>
        </div>
      );
    },
  },
  { key: 'reason', label: 'Lý do CĐ', render: (r) => r.diagnosis || r.clinicalInfo || '—' },
  { key: 'doctor', label: 'BS chỉ định', width: 150, render: (r) => r.orderDoctorName || '—' },
  {
    key: 'status', label: 'Trạng thái', width: 130,
    render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    },
  },
];
