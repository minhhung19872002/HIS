import { StatusBadge, type ColumnDef } from '../_v2kit';
import type { LabRequest } from '../../api/laboratory';
import {
  STATUS_TABS, statusKey, statusTone, PRIO_LABEL, PRIO_TONE,
  abnormalCount, fmtHM,
} from './_shared';

export const LAB_COLUMNS: ColumnDef<LabRequest>[] = [
  {
    key: 'code', label: 'Mã XN', width: 140,
    render: (r) => (
      <span>
        <span className="mono">{r.requestCode}</span>
        {r.priority === 2 && (
          <span style={{
            marginLeft: 'var(--space-6)', padding: '1px 5px',
            background: 'var(--s-crit-bg)', border: '1px solid #fca5a5',
            color: 'var(--s-crit)', borderRadius: 'var(--r-1)',
            fontSize: 9, fontWeight: 700,
          }}>STAT</span>
        )}
      </span>
    ),
  },
  { key: 'time', label: 'CĐ lúc', mono: true, width: 70, render: (r) => fmtHM(r.requestDate) },
  {
    key: 'patient', label: 'Bệnh nhân',
    render: (r) => (
      <div className="cell-2l">
        <b>{r.patientName}</b>
        <i className="mono">{r.patientCode}</i>
      </div>
    ),
  },
  {
    key: 'panel', label: 'Xét nghiệm',
    render: (r) => {
      const names = (r.tests || []).map((t) => t.testName).filter(Boolean);
      const display = names.length === 0 ? (r.requestedTests?.join(' · ') || '—') :
        names.slice(0, 3).join(' · ') + (names.length > 3 ? ` +${names.length - 3}` : '');
      const groups = Array.from(new Set((r.tests || []).map((t) => t.testGroup).filter(Boolean))).slice(0, 2).join(', ');
      return (
        <div className="cell-2l">
          <b>{display}</b>
          {groups && <i className="mono">{groups}</i>}
        </div>
      );
    },
  },
  { key: 'sample', label: 'Mẫu', width: 110, render: (r) => r.sampleType || '—' },
  { key: 'collect', label: 'Lấy mẫu', mono: true, width: 80, render: (r) => fmtHM(r.collectionTime) },
  { key: 'machine', label: 'Máy', width: 110, mono: true, render: (r) => r.analyzer || '—' },
  {
    key: 'priority', label: 'Ưu tiên', width: 90,
    render: (r) => (
      <span className={`chip ${PRIO_TONE[r.priority] || 'info'}`}>{PRIO_LABEL[r.priority] || 'ROUTINE'}</span>
    ),
  },
  {
    key: 'status', label: 'Trạng thái', width: 130,
    render: (r) => {
      const sk = statusKey(r.status);
      return <StatusBadge tone={statusTone(sk)} dot>{STATUS_TABS.find((t) => t.v === sk)?.l}</StatusBadge>;
    },
  },
  {
    key: 'abnormal', label: 'BT', width: 60,
    render: (r) => {
      const ab = abnormalCount(r.tests);
      return ab > 0 ? (
        <span className="chip warn mono">{ab}</span>
      ) : (
        <span className="ab-u-faint">0</span>
      );
    },
  },
];
