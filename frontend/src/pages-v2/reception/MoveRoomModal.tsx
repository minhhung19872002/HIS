import React, { useEffect, useMemo, useState } from 'react';
import { App as AntdApp, Input, Select } from 'antd';
import * as receptionApi from '../../api/reception';
import type { RoomOverviewDto } from '../../api/reception';
import { ModalShell } from '../_v2kit';
import TermIcon from '../../layouts/terminal/Icon';
import type { RawRow } from './shared';
export const MoveRoomModal: React.FC<{
  row: RawRow | null;
  rooms: RoomOverviewDto[];
  onClose: () => void;
  onDone: () => void;
}> = ({ row, rooms, onClose, onDone }) => {
  const { message } = AntdApp.useApp();
  const [newRoomId, setNewRoomId] = useState<string | undefined>(undefined);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (row) { setNewRoomId(undefined); setReason(''); }
  }, [row]);

  const roomOpts = useMemo(
    () => rooms
      .filter((r) => r.roomId !== row?.roomId)
      .map((r) => ({ value: r.roomId, label: `${r.departmentName || '—'} · ${r.roomName || ''}` })),
    [rooms, row],
  );

  const submit = async () => {
    if (!row) return;
    if (!newRoomId) { message.warning('Chọn phòng mới'); return; }
    setBusy(true);
    try {
      await receptionApi.changeRoom(row.id, newRoomId, undefined, reason.trim() || undefined);
      message.success(`Đã đổi phòng · ${row.patientName}`);
      onDone();
    } catch {
      message.error('Đổi phòng thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      open={!!row}
      onClose={onClose}
      size="md"
      title="Đổi phòng khám"
      footer={(
        <>
          <button type="button" className="ab-btn ghost" onClick={onClose}>Hủy</button>
          <button type="button" className="ab-btn primary" disabled={busy} onClick={submit}>
            <TermIcon name="check" size={12} /> {busy ? 'Đang đổi…' : 'Đổi phòng'}
          </button>
        </>
      )}
    >
      {row && (
        <div style={{ padding: 0 }}>
          <div style={{
            padding: 'var(--space-12)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-14)',
            display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)',
          }}>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>{row.patientName} · {row.patientCode}</span>
            <span className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{row.queueCode || `#${row.queueNumber}`}</span>
            <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--t-2)' }}>Phòng hiện tại</span>
            <b>{row.departmentName || '—'} · {row.roomName || '—'}</b>
          </div>
          <div style={{ marginBottom: 'var(--space-12)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Phòng mới *</div>
            <Select
              value={newRoomId} onChange={setNewRoomId} showSearch optionFilterProp="label"
              placeholder="Chọn phòng khám" style={{ width: '100%' }} options={roomOpts}
            />
          </div>
          <div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginBottom: 'var(--space-4)', fontWeight: 600 }}>Lý do</div>
            <Input.TextArea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Lý do đổi phòng (tùy chọn)…" />
          </div>
        </div>
      )}
    </ModalShell>
  );
};

/* ────────────────────────────────────────────────────────────
   Thu phí modal — real createPayment (phí khám tại quầy)
   ──────────────────────────────────────────────────────────── */

