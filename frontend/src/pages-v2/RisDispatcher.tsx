import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, Select } from 'antd';
import dayjs from 'dayjs';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, Filter, DataTable, StatusBadge, ActBtn, ModalShell,
  Ico, tk, ti, tw, type ColumnDef,
} from './_v2kit';

interface PendingService {
  serviceRequestDetailId: string; patientId: string; patientName: string; patientCode: string;
  serviceName: string; serviceCode: string; createdAt: string; sampleBarcode?: string;
}
interface QueueItem {
  id: string; patientId: string; patientName: string; patientCode: string;
  serviceName: string; priority: number; isArrived: boolean;
  arrivedAt?: string; dispatchedAt: string; note?: string;
}
interface Room { id: string; roomName: string; code?: string; departmentName?: string; modalityType?: string }

type Tab = 'pending' | 'queue';

const RisDispatcherV2: React.FC = () => {
  const [pending, setPending] = useState<PendingService[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatchModal, setDispatchModal] = useState<PendingService | null>(null);
  const [tab, setTab] = useState<Tab>('pending');
  const [dispatchForm] = Form.useForm<{ roomId: string; priority: number; note?: string }>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        apiClient.get<PendingService[]>('/radiology-dispatch/pending'),
        apiClient.get<Room[]>('/RISComplete/rooms', { params: { roomType: 'radiology' } }).catch(() => ({ data: [] as Room[] })),
      ]);
      setPending(p.data); setRooms(r.data);
      if (selectedRoom) {
        const q = await apiClient.get<QueueItem[]>(`/radiology-dispatch/queue/${selectedRoom}`);
        setQueue(q.data);
      } else { setQueue([]); }
    } catch { ti('Tải dữ liệu thất bại'); }
    finally { setLoading(false); }
  }, [selectedRoom]);

  useEffect(() => { load(); }, [load]);

  const printTicket = (s: PendingService, room: Room) => {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Phiếu điều phối</title>
<style>body{font-family:Arial;padding:20px}h2{text-align:center}.info{margin:8px 0}.info strong{display:inline-block;width:140px}.room{border:2px solid #000;padding:20px;text-align:center;margin:20px 0;font-size:32px;font-weight:bold}@media print{button{display:none}}</style></head>
<body><button onclick="window.print()">In</button>
<h2>PHIẾU ĐIỀU PHỐI CHẨN ĐOÁN HÌNH ẢNH</h2>
<div class="info"><strong>Bệnh nhân:</strong> ${s.patientName} (${s.patientCode})</div>
<div class="info"><strong>Dịch vụ:</strong> ${s.serviceName}</div>
<div class="info"><strong>Thời gian:</strong> ${dayjs().format('HH:mm DD/MM/YYYY')}</div>
<div class="room">Phòng: ${room.roomName}${room.departmentName ? `<br/><small>${room.departmentName}</small>` : ''}</div>
<div style="text-align:center;margin-top:20px"><em>Vui lòng đến đúng phòng theo hướng dẫn</em></div>
</body></html>`;
    const w = window.open('', '_blank', 'width=600,height=700');
    w?.document.write(html); w?.document.close();
  };

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    try {
      const v = await dispatchForm.validateFields();
      await apiClient.post('/radiology-dispatch', {
        serviceRequestDetailId: dispatchModal.serviceRequestDetailId,
        roomId: v.roomId, priority: v.priority, note: v.note,
      });
      tk('Đã điều phối BN');
      const room = rooms.find((r) => r.id === v.roomId);
      if (room) printTicket(dispatchModal, room);
      setDispatchModal(null); dispatchForm.resetFields(); load();
    } catch { tw('Điều phối thất bại'); }
  };

  const markArrived = async (id: string) => {
    try { await apiClient.post(`/radiology-dispatch/${id}/mark-arrived`); tk('Đã đánh dấu BN đến'); load(); }
    catch { tw('Lỗi'); }
  };
  const markPerformed = async (id: string) => {
    try { await apiClient.post(`/radiology-dispatch/${id}/mark-performed`); tk('Đã đánh dấu chụp xong'); load(); }
    catch { tw('Lỗi'); }
  };
  const cancelDispatch = async (id: string) => {
    try { await apiClient.post(`/radiology-dispatch/${id}/cancel`); tk('Đã hủy điều phối'); load(); }
    catch { tw('Lỗi'); }
  };

  const TABS = [
    { v: 'pending' as Tab, l: `Chờ điều phối (${pending.length})`, ic: 'send' },
    { v: 'queue' as Tab,   l: `Hàng đợi (${queue.length})`, ic: 'list' },
  ];

  const pendingCols: ColumnDef<PendingService>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'svc', label: 'Dịch vụ', render: (r) => r.serviceName },
    { key: 'sc', label: 'Mã DV', code: true, render: (r) => r.serviceCode },
    { key: 'bar', label: 'Barcode', code: true, render: (r) => r.sampleBarcode || '—' },
    { key: 'time', label: 'Chỉ định lúc', mono: true, render: (r) => dayjs(r.createdAt).format('HH:mm DD/MM') },
  ];

  const queueCols: ColumnDef<QueueItem>[] = [
    { key: 'pt', label: 'Bệnh nhân', render: (r) => (
      <div>
        <div style={{ fontWeight: 600 }}>{r.patientName}</div>
        <div style={{ fontSize: 11, color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{r.patientCode}</div>
      </div>
    ) },
    { key: 'svc', label: 'Dịch vụ', render: (r) => r.serviceName },
    { key: 'pri', label: 'Ưu tiên', render: (r) =>
      r.priority === 3 ? <StatusBadge tone="crit" dot>Cấp cứu</StatusBadge>
      : r.priority === 2 ? <StatusBadge tone="warn" dot>Ưu tiên</StatusBadge>
      : <StatusBadge tone="info">Thường</StatusBadge>
    },
    { key: 'arrived', label: 'Đã đến', render: (r) => r.isArrived
      ? <StatusBadge tone="ok" dot>{dayjs(r.arrivedAt).format('HH:mm')}</StatusBadge>
      : <StatusBadge tone="warn">Chưa</StatusBadge>
    },
    { key: 'disp', label: 'Điều phối lúc', mono: true, render: (r) => dayjs(r.dispatchedAt).format('HH:mm') },
    { key: 'note', label: 'Ghi chú', render: (r) => r.note || '—' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Chờ điều phối', val: pending.length, sub: 'tất cả phòng', tone: 'warn' },
        { lbl: 'Hàng đợi', val: queue.length, sub: selectedRoom ? rooms.find((r) => r.id === selectedRoom)?.roomName || '—' : 'chưa chọn phòng', tone: 'info' },
        { lbl: 'Đã đến', val: queue.filter((q) => q.isArrived).length, sub: 'sẵn sàng', tone: 'ok' },
        { lbl: 'Cấp cứu', val: queue.filter((q) => q.priority === 3).length, sub: 'ưu tiên', tone: 'crit' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <Filter value={selectedRoom} onChange={setSelectedRoom}
            options={rooms.map((r) => ({ v: r.id, l: r.roomName }))} placeholder="▾ Phòng" />
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
        </>
      } />

      {tab === 'pending' && (
        <DataTable<PendingService>
          columns={pendingCols} data={pending} rowKey={(r) => r.serviceRequestDetailId}
          actions={(r) => (
            <div className="ab-actions">
              <ActBtn ic="send" title="Điều phối" onClick={() => {
                dispatchForm.setFieldsValue({ roomId: rooms[0]?.id, priority: 1 });
                setDispatchModal(r);
              }} />
            </div>
          )}
          empty={loading ? 'Đang tải…' : 'Không có BN chờ điều phối'}
        />
      )}

      {tab === 'queue' && (
        <DataTable<QueueItem>
          columns={queueCols} data={queue} rowKey={(r) => r.id}
          actions={(r) => (
            <div className="ab-actions">
              {!r.isArrived && <ActBtn ic="check" title="Đã đến" onClick={() => markArrived(r.id)} />}
              <ActBtn ic="check" title="Chụp xong" onClick={() => markPerformed(r.id)} />
              <ActBtn ic="x" title="Hủy" tone="crit" onClick={() => cancelDispatch(r.id)} />
            </div>
          )}
          empty={selectedRoom ? 'Hàng đợi trống' : 'Chọn phòng để xem hàng đợi'}
        />
      )}

      <ModalShell
        open={!!dispatchModal}
        onClose={() => setDispatchModal(null)}
        size="md"
        title={`Điều phối: ${dispatchModal?.patientName || ''}`}
        footer={<>
          <button type="button" className="ab-btn ghost" onClick={() => setDispatchModal(null)}>Hủy</button>
          <button type="button" className="ab-btn primary" onClick={handleDispatch}>
            <Ico name="send" size={12} /> Điều phối + In phiếu
          </button>
        </>}
      >
        <Form form={dispatchForm} layout="vertical">
          <Form.Item name="roomId" label="Phòng thực hiện" rules={[{ required: true }]}>
            <Select placeholder="Chọn phòng chụp"
              options={rooms.map((r) => ({ value: r.id, label: `${r.roomName}${r.departmentName ? ' — ' + r.departmentName : ''}` }))} />
          </Form.Item>
          <Form.Item name="priority" label="Ưu tiên" initialValue={1}>
            <Select options={[
              { value: 1, label: '1 — Thường' }, { value: 2, label: '2 — Ưu tiên' }, { value: 3, label: '3 — Cấp cứu' },
            ]} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="VD: BN di chuyển khó, cần hỗ trợ" />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default RisDispatcherV2;
