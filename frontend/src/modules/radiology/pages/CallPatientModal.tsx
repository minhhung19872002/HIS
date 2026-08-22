import React, { useEffect, useState } from 'react';
import { App as AntdApp } from 'antd';
import * as risApi from '../api/ris';
import type { RadiologyOrderDto } from '../api/ris';
import { ModalShell, Btn, AbSelect } from '@/_v2kit';
import TermIcon from '../../../components/layout/terminal/Icon';
import { type ApiErr } from './_shared';
import { useModalForm } from '../../../hooks/useModalForm';
import { Field } from '../../../components/form/Field';

/** Gọi bệnh nhân vào phòng chụp CĐHA. roomId là bắt buộc theo CallPatientDto của backend. */
export const CallPatientModal: React.FC<{
  open: boolean;
  order: RadiologyOrderDto | null;
  rooms: { id: string; name: string }[];
  onClose: () => void;
  onCalled: () => void;
}> = ({ open, order, rooms, onClose, onCalled }) => {
  const { message } = AntdApp.useApp();
  const { errors, validate, clear } = useModalForm(
    { roomId: { required: true, message: 'Chọn phòng chụp để gọi bệnh nhân' } },
    open,
  );
  const [roomId, setRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setRoomId(rooms[0]?.id || '');
  }, [open, rooms]);

  const submit = async () => {
    if (!order) return;
    if (!validate({ roomId })) return;
    setBusy(true);
    try {
      const r = await risApi.callPatient({
        orderId: order.id,
        roomId,
        useSpeaker: true,
      });
      message.success(r.data?.message || 'Đã gọi bệnh nhân');
      onCalled();
      onClose();
    } catch (e) {
      message.error((e as ApiErr)?.response?.data?.message || 'Không gọi được bệnh nhân');
    } finally { setBusy(false); }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      size="sm"
      title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-10)' }}>
        <TermIcon name="user" size={14} /><span>Gọi bệnh nhân vào phòng</span>
      </span>}
      sub={order ? `${order.patientName} · ${order.orderCode}` : ''}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Hủy</Btn>
        <Btn variant="primary" onClick={submit} loading={busy} icon="check">Gọi</Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
        <Field label="Phòng chụp" required error={errors.roomId}>
          <AbSelect
            options={rooms}
            fieldNames={{ value: 'id', label: 'name' }}
            value={roomId}
            onChange={(v) => { setRoomId(v); clear('roomId'); }}
            placeholder="— Chọn phòng —"
          />
        </Field>
        {order && (
          <div style={{ fontSize: 12.5, color: 'var(--t-2)', padding: '6px 10px', background: 'var(--d-1)', borderRadius: 5 }}>
            <b style={{ color: 'var(--t-1)' }}>{order.patientName}</b>
            {' · '}
            {order.items?.[0]?.serviceName || '—'}
          </div>
        )}
      </div>
    </ModalShell>
  );
};
