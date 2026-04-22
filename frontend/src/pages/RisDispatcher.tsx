/**
 * RIS Điều phối — Sprint 4 Item 2.16.
 * Dispatcher chọn BN từ worklist → gán vào phòng/máy chụp + in phiếu điều phối.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Row, Col, Table, Tag, Button, Space, Select, Modal, Form, Input, InputNumber,
  message, Drawer, Badge, Tabs, Typography,
} from 'antd';
import {
  SendOutlined, PrinterOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, EnvironmentOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import apiClient from '../api/client';

const { Text } = Typography;

interface PendingService {
  serviceRequestDetailId: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  serviceCode: string;
  createdAt: string;
  sampleBarcode?: string;
}

interface QueueItem {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  serviceName: string;
  priority: number;
  isArrived: boolean;
  arrivedAt?: string;
  dispatchedAt: string;
  note?: string;
}

interface Room { id: string; roomName: string; code?: string; departmentName?: string; modalityType?: string }

export default function RisDispatcher() {
  const [pending, setPending] = useState<PendingService[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [dispatchModal, setDispatchModal] = useState<PendingService | null>(null);
  const [dispatchForm] = Form.useForm<{ roomId: string; priority: number; note?: string }>();
  const [tab, setTab] = useState<'pending' | 'queue'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRes, roomsRes] = await Promise.all([
        apiClient.get<PendingService[]>('/radiology-dispatch/pending'),
        apiClient.get<Room[]>('/system/rooms', { params: { type: 'radiology' } }).catch(() => ({ data: [] as Room[] })),
      ]);
      setPending(pendingRes.data);
      setRooms(roomsRes.data);
      if (selectedRoom) {
        const qRes = await apiClient.get<QueueItem[]>(`/radiology-dispatch/queue/${selectedRoom}`);
        setQueue(qRes.data);
      }
    } catch (e) {
      console.warn('Load dispatch data failed', e);
    } finally {
      setLoading(false);
    }
  }, [selectedRoom]);

  useEffect(() => { load(); }, [load]);

  const handleDispatch = async () => {
    if (!dispatchModal) return;
    try {
      const values = await dispatchForm.validateFields();
      await apiClient.post('/radiology-dispatch', {
        serviceRequestDetailId: dispatchModal.serviceRequestDetailId,
        roomId: values.roomId,
        priority: values.priority,
        note: values.note,
      });
      message.success('Đã điều phối BN vào phòng');
      const room = rooms.find(r => r.id === values.roomId);
      if (room) printDispatchTicket(dispatchModal, room);
      setDispatchModal(null);
      dispatchForm.resetFields();
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Điều phối thất bại');
    }
  };

  const handleMarkArrived = async (id: string) => {
    await apiClient.post(`/radiology-dispatch/${id}/mark-arrived`);
    message.success('Đã đánh dấu BN đến');
    load();
  };

  const handleMarkPerformed = async (id: string) => {
    await apiClient.post(`/radiology-dispatch/${id}/mark-performed`);
    message.success('Đã đánh dấu BN chụp xong');
    load();
  };

  const handleCancelDispatch = async (id: string) => {
    await apiClient.post(`/radiology-dispatch/${id}/cancel`);
    message.success('Đã hủy điều phối');
    load();
  };

  const printDispatchTicket = (service: PendingService, room: Room) => {
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Phiếu điều phối</title>
<style>
  body { font-family: Arial, sans-serif; padding: 20px; }
  h2 { text-align: center; }
  .info { margin: 8px 0; }
  .info strong { display: inline-block; width: 140px; }
  .room-highlight { border: 2px solid #000; padding: 20px; text-align: center; margin: 20px 0; font-size: 32px; font-weight: bold; }
  @media print { button { display: none; } }
</style></head>
<body>
  <button onclick="window.print()">In</button>
  <h2>PHIẾU ĐIỀU PHỐI CHẨN ĐOÁN HÌNH ẢNH</h2>
  <div class="info"><strong>Bệnh nhân:</strong> ${service.patientName} (${service.patientCode})</div>
  <div class="info"><strong>Dịch vụ:</strong> ${service.serviceName}</div>
  <div class="info"><strong>Thời gian:</strong> ${dayjs().format('HH:mm DD/MM/YYYY')}</div>
  <div class="room-highlight">
    Phòng: ${room.roomName}
    ${room.departmentName ? `<br/><small>${room.departmentName}</small>` : ''}
  </div>
  <div style="text-align: center; margin-top: 20px;">
    <em>Vui lòng đến đúng phòng theo hướng dẫn</em>
  </div>
</body></html>`;
    const w = window.open('', '_blank', 'width=600,height=700');
    w?.document.write(html);
    w?.document.close();
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <EnvironmentOutlined />
            RIS Điều phối
          </Space>
        }
        extra={
          <Space>
            <Text strong>Phòng:</Text>
            <Select
              placeholder="Chọn phòng xem hàng đợi"
              value={selectedRoom}
              onChange={setSelectedRoom}
              style={{ width: 240 }}
              allowClear
              options={rooms.map(r => ({ value: r.id, label: r.roomName }))}
            />
            <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
          </Space>
        }
      >
        <Tabs activeKey={tab} onChange={(k) => setTab(k as 'pending' | 'queue')}
          items={[
            {
              key: 'pending',
              label: <Badge count={pending.length} offset={[10, 0]}>Chờ điều phối</Badge>,
            },
            {
              key: 'queue',
              label: selectedRoom
                ? <Badge count={queue.length} offset={[10, 0]}>Hàng đợi phòng</Badge>
                : 'Hàng đợi phòng',
            },
          ]}
        />

        {tab === 'pending' ? (
          <Table<PendingService>
            rowKey="serviceRequestDetailId"
            dataSource={pending}
            loading={loading}
            pagination={{ pageSize: 20 }}
            columns={[
              { title: 'Mã BN', dataIndex: 'patientCode', width: 110 },
              { title: 'Họ tên', dataIndex: 'patientName' },
              { title: 'Dịch vụ', dataIndex: 'serviceName' },
              { title: 'Mã DV', dataIndex: 'serviceCode', width: 110 },
              { title: 'Barcode', dataIndex: 'sampleBarcode', width: 140 },
              {
                title: 'Chỉ định lúc',
                dataIndex: 'createdAt',
                width: 160,
                render: (v: string) => dayjs(v).format('HH:mm DD/MM'),
              },
              {
                title: 'Hành động',
                width: 140,
                render: (_, row) => (
                  <Button
                    type="primary"
                    size="small"
                    icon={<SendOutlined />}
                    onClick={() => {
                      dispatchForm.setFieldsValue({
                        roomId: rooms[0]?.id,
                        priority: 1,
                      });
                      setDispatchModal(row);
                    }}
                  >
                    Điều phối
                  </Button>
                ),
              },
            ]}
          />
        ) : (
          <Table<QueueItem>
            rowKey="id"
            dataSource={queue}
            loading={loading}
            pagination={false}
            columns={[
              { title: 'Mã BN', dataIndex: 'patientCode', width: 110 },
              { title: 'Họ tên', dataIndex: 'patientName' },
              { title: 'Dịch vụ', dataIndex: 'serviceName' },
              {
                title: 'Ưu tiên',
                dataIndex: 'priority',
                width: 90,
                render: (p: number) => p === 3 ? <Tag color="red">Cấp cứu</Tag> : p === 2 ? <Tag color="orange">Ưu tiên</Tag> : <Tag>Thường</Tag>,
              },
              {
                title: 'Đã đến',
                dataIndex: 'isArrived',
                width: 100,
                render: (v: boolean, r) => v ? <Tag color="green">{dayjs(r.arrivedAt).format('HH:mm')}</Tag> : <Tag color="default">Chưa</Tag>,
              },
              { title: 'Điều phối lúc', dataIndex: 'dispatchedAt', width: 130, render: (v: string) => dayjs(v).format('HH:mm') },
              { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
              {
                title: 'Hành động',
                width: 260,
                render: (_, row) => (
                  <Space size="small">
                    {!row.isArrived && (
                      <Button size="small" onClick={() => handleMarkArrived(row.id)}>Đến</Button>
                    )}
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleMarkPerformed(row.id)}>
                      Xong
                    </Button>
                    <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleCancelDispatch(row.id)}>
                      Hủy
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title={`Điều phối: ${dispatchModal?.patientName} — ${dispatchModal?.serviceName}`}
        open={dispatchModal !== null}
        onOk={handleDispatch}
        onCancel={() => setDispatchModal(null)}
        okText="Điều phối + In phiếu"
        width={560}
        destroyOnHidden
      >
        <Form form={dispatchForm} layout="vertical">
          <Form.Item name="roomId" label="Phòng thực hiện" rules={[{ required: true }]}>
            <Select
              placeholder="Chọn phòng chụp"
              options={rooms.map(r => ({ value: r.id, label: `${r.roomName}${r.departmentName ? ' - ' + r.departmentName : ''}` }))}
            />
          </Form.Item>
          <Form.Item name="priority" label="Ưu tiên" initialValue={1}>
            <Select options={[
              { value: 1, label: '1 - Thường' },
              { value: 2, label: '2 - Ưu tiên' },
              { value: 3, label: '3 - Cấp cứu' },
            ]} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} placeholder="VD: BN di chuyển khó, cần hỗ trợ" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
