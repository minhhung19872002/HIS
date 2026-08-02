import React from 'react';
import { StatusBadge, ActBtn } from '@/_v2kit';
import type { RoomDto, RoomPatientListDto } from '../api/examination';

interface Props {
  leftOpen: boolean;
  rooms: RoomDto[];
  roomId: string;
  setRoomId: (id: string) => void;
  setSelPt: React.Dispatch<React.SetStateAction<RoomPatientListDto | null>>;
  setScanOpen: (v: boolean) => void;
  type: 'general' | 'yhct';
  setType: (v: 'general' | 'yhct') => void;
  queue: RoomPatientListDto[];
  selPt: RoomPatientListDto | null;
  selectPatient: (q: RoomPatientListDto) => void;
}

export const QueuePanel: React.FC<Props> = ({
  leftOpen, rooms, roomId, setRoomId, setSelPt, setScanOpen,
  type, setType, queue, selPt, selectPatient,
}) => (
  <aside className={'ed-left-panel ' + (leftOpen ? 'is-open' : '')} style={{ borderRight: '1px solid var(--line)', overflow: 'auto', padding: 'var(--space-10)', background: 'var(--d-1)' }}>
    <div style={{ display: 'flex', gap: 'var(--space-6)', marginBottom: 'var(--space-10)' }}>
      <select className="hui-inp hui-sel" value={roomId} onChange={(e) => { setRoomId(e.target.value); setSelPt(null); }} style={{ flex: 1, height: 30 }}>
        {rooms.length === 0 && <option value="">(Chưa có phòng)</option>}
        {rooms.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
      </select>
      <ActBtn ic="qr" title="Quét barcode BN" onClick={() => setScanOpen(true)} />
    </div>
    <div style={{ display: 'inline-flex', background: 'var(--d-0)', borderRadius: 4, padding: 'var(--space-2)', marginBottom: 'var(--space-10)', width: '100%' }}>
      {([{ v: 'general', l: 'Ngoại trú' }, { v: 'yhct', l: 'YHCT' }] as const).map((t) => (
        <button key={t.v} onClick={() => setType(t.v)} style={{ flex: 1, background: type === t.v ? 'var(--c-pri)' : 'transparent', color: type === t.v ? '#fff' : 'var(--t-1)', border: 0, padding: '4px 8px', borderRadius: 'var(--r-1)', cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: type === t.v ? 700 : 400 }}>{t.l}</button>
      ))}
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--t-2)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600, marginBottom: 'var(--space-6)' }}>Hàng đợi ({queue.length})</div>
    {queue.length === 0 && <div style={{ color: 'var(--t-3)', fontSize: 11.5, padding: 'var(--space-12)', textAlign: 'center' }}>Không có bệnh nhân trong phòng</div>}
    {queue.map((q) => {
      const sel = q.examinationId === selPt?.examinationId;
      const tone = q.status === 2 ? 'info' : q.status === 1 ? 'warn' : 'info';
      return (
        <div key={q.examinationId} onClick={() => selectPatient(q)} style={{ padding: 'var(--space-10)', marginBottom: 5, background: sel ? 'var(--c-pri-bg, rgba(37,99,235,.12))' : 'var(--d-0)', border: sel ? '1px solid var(--c-pri)' : '1px solid var(--line)', borderRadius: 'var(--r-2)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono" style={{ fontWeight: 700, fontSize: 14, color: 'var(--a-cy)' }}>{q.queueNumber}</span>
            {(q.isEmergency || q.isPriority) && <StatusBadge tone="crit">{q.isEmergency ? 'Cấp cứu' : 'Ưu tiên'}</StatusBadge>}
          </div>
          <div style={{ fontWeight: 600, fontSize: 12.5, marginTop: 'var(--space-3)' }}>{q.patientName}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>{q.age}T · {q.gender === 1 ? 'Nam' : 'Nữ'}</span>
            <StatusBadge tone={tone}>{q.statusName || (q.status === 2 ? 'Đang khám' : q.status === 1 ? 'Gọi' : 'Chờ')}</StatusBadge>
          </div>
        </div>
      );
    })}
  </aside>
);
