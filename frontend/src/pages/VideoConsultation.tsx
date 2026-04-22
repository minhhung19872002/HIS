/**
 * Quản lý phòng hội chẩn video — Sprint 5 Item 1.4.
 * Tích hợp Jitsi Meet (meet.jit.si public hoặc self-host).
 * BS tạo phòng → invite link → join qua iframe trong tab viewer mới.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, Form, Input, Select, Switch,
  DatePicker, message, Drawer, Typography, Popconfirm, Divider, Badge,
} from 'antd';
import {
  VideoCameraOutlined, PlayCircleOutlined, StopOutlined, LinkOutlined,
  ReloadOutlined, PlusOutlined, TeamOutlined, CopyOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { QRCodeCanvas } from 'qrcode.react';
import {
  createRoom, searchRooms, startRoom, endRoom, cancelRoom, joinRoom, getParticipants,
  ROOM_TYPES, STATUS_LABELS, type RoomDto,
} from '../api/videoConsultation';

const { Title, Text } = Typography;

export default function VideoConsultation() {
  const [tab, setTab] = useState<'active' | 'scheduled' | 'ended' | 'all'>('active');
  const [rooms, setRooms] = useState<RoomDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm] = Form.useForm<{
    title: string;
    roomType: number;
    description?: string;
    scheduledAt?: Dayjs;
    isRecorded: boolean;
    usePassword: boolean;
    password?: string;
    inviteEmails?: string;
  }>();
  const [currentRoom, setCurrentRoom] = useState<RoomDto | null>(null);
  const [joinInfo, setJoinInfo] = useState<{ jitsiUrl: string; password?: string } | null>(null);
  const [endModal, setEndModal] = useState<RoomDto | null>(null);
  const [endForm] = Form.useForm<{ conclusionNote?: string }>();
  const [participantsDrawer, setParticipantsDrawer] = useState<RoomDto | null>(null);
  type ParticipantItem = { id: string; displayName: string; email?: string; role?: string; joinedAt?: string; userName?: string };
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const status = tab === 'active' ? 1 : tab === 'scheduled' ? 0 : tab === 'ended' ? 2 : undefined;
      const res = await searchRooms({ status });
      setRooms(res);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const invites = values.inviteEmails?.split(',').map(s => s.trim()).filter(Boolean);
      const room = await createRoom({
        title: values.title,
        roomType: values.roomType,
        description: values.description,
        scheduledAt: values.scheduledAt?.toISOString(),
        isRecorded: values.isRecorded,
        password: values.usePassword ? values.password : undefined,
        inviteEmails: invites,
      });
      message.success('Đã tạo phòng');
      setCreateOpen(false);
      createForm.resetFields();
      setCurrentRoom(room);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tạo phòng thất bại');
    }
  };

  const handleStart = async (r: RoomDto) => {
    try {
      await startRoom(r.id);
      message.success('Phòng đã bắt đầu');
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Không thể bắt đầu');
    }
  };

  const handleJoin = async (r: RoomDto) => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const info = await joinRoom(r.id, user.fullName || user.username || 'User', user.email, 'participant');
      setJoinInfo(info);
      // Mở Jitsi trong tab mới
      const url = new URL(info.jitsiUrl);
      if (info.password) url.hash = `password=${encodeURIComponent(info.password)}`;
      window.open(url.toString(), '_blank');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Không thể tham gia');
    }
  };

  const handleEnd = async () => {
    if (!endModal) return;
    const values = await endForm.validateFields();
    try {
      await endRoom(endModal.id, values.conclusionNote);
      message.success('Đã kết thúc phòng');
      setEndModal(null);
      load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Kết thúc thất bại');
    }
  };

  const handleCancel = async (r: RoomDto) => {
    await cancelRoom(r.id, 'Hủy bởi host');
    message.success('Đã hủy phòng');
    load();
  };

  const handleOpenParticipants = async (r: RoomDto) => {
    setParticipantsDrawer(r);
    const list = await getParticipants(r.id);
    setParticipants(list as ParticipantItem[]);
  };

  const handleCopyLink = (r: RoomDto) => {
    const url = `${window.location.origin}/consultation-join/${r.id}`;
    navigator.clipboard.writeText(url).then(() => message.success('Đã copy link mời'));
  };

  return (
    <div>
      <Card
        title={
          <Space>
            <VideoCameraOutlined />
            Hội chẩn video conference
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={load}>Làm mới</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => {
              createForm.resetFields();
              createForm.setFieldsValue({ roomType: 1, isRecorded: false, usePassword: true });
              setCreateOpen(true);
            }}>
              Tạo phòng hội chẩn
            </Button>
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }}>
          <Button.Group>
            {(['active', 'scheduled', 'ended', 'all'] as const).map(k => (
              <Button key={k} type={tab === k ? 'primary' : 'default'} onClick={() => setTab(k)}>
                {k === 'active' ? 'Đang diễn ra' : k === 'scheduled' ? 'Đã lên lịch' : k === 'ended' ? 'Đã kết thúc' : 'Tất cả'}
              </Button>
            ))}
          </Button.Group>
        </Space>

        <Table<RoomDto>
          rowKey="id"
          dataSource={rooms}
          loading={loading}
          pagination={{ pageSize: 20 }}
          columns={[
            { title: 'Tên phòng', dataIndex: 'title' },
            {
              title: 'Loại',
              dataIndex: 'roomType',
              width: 220,
              render: (t: number) => <Tag>{ROOM_TYPES[t]}</Tag>,
            },
            { title: 'BN', dataIndex: 'patientName' },
            { title: 'Host', dataIndex: 'hostName', width: 150 },
            {
              title: 'Lịch',
              dataIndex: 'scheduledAt',
              width: 140,
              render: (v: string) => dayjs(v).format('DD/MM HH:mm'),
            },
            {
              title: 'Trạng thái',
              dataIndex: 'status',
              width: 130,
              render: (s: number) => (
                <Tag color={s === 1 ? 'green' : s === 0 ? 'blue' : s === 2 ? 'default' : 'red'}>
                  {STATUS_LABELS[s]}
                </Tag>
              ),
            },
            {
              title: 'Tùy chọn',
              width: 100,
              render: (_, r) => (
                <Space size={2}>
                  {r.hasPassword && <Tag color="orange">🔒</Tag>}
                  {r.isRecorded && <Tag color="purple">REC</Tag>}
                </Space>
              ),
            },
            {
              title: 'Hành động',
              width: 340,
              render: (_, r) => (
                <Space size="small" wrap>
                  {r.status === 0 && (
                    <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => handleStart(r)}>
                      Bắt đầu
                    </Button>
                  )}
                  {r.status === 1 && (
                    <>
                      <Button size="small" type="primary" icon={<VideoCameraOutlined />} onClick={() => handleJoin(r)}>
                        Tham gia
                      </Button>
                      <Button size="small" danger icon={<StopOutlined />} onClick={() => {
                        endForm.resetFields();
                        setEndModal(r);
                      }}>
                        Kết thúc
                      </Button>
                    </>
                  )}
                  {(r.status === 0 || r.status === 1) && (
                    <Button size="small" icon={<LinkOutlined />} onClick={() => handleCopyLink(r)}>
                      Link mời
                    </Button>
                  )}
                  <Button size="small" icon={<TeamOutlined />} onClick={() => handleOpenParticipants(r)}>
                    Người tham gia
                  </Button>
                  {r.status === 0 && (
                    <Popconfirm title="Hủy phòng hội chẩn?" onConfirm={() => handleCancel(r)}>
                      <Button size="small" danger>Hủy</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Modal tạo phòng */}
      <Modal
        title="Tạo phòng hội chẩn"
        open={createOpen}
        onOk={handleCreate}
        onCancel={() => setCreateOpen(false)}
        okText="Tạo phòng"
        width={600}
        destroyOnHidden
      >
        <Form form={createForm} layout="vertical">
          <Form.Item name="title" label="Tên phòng / Chủ đề" rules={[{ required: true }]}>
            <Input placeholder="VD: Hội chẩn BN Nguyễn Văn A - CT ngực" />
          </Form.Item>
          <Form.Item name="roomType" label="Loại hội chẩn" rules={[{ required: true }]}>
            <Select options={Object.entries(ROOM_TYPES).map(([k, v]) => ({ value: Number(k), label: v }))} />
          </Form.Item>
          <Form.Item name="scheduledAt" label="Thời gian dự kiến">
            <DatePicker showTime format="DD/MM/YYYY HH:mm" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} placeholder="Nội dung cần bàn luận..." />
          </Form.Item>
          <Form.Item name="inviteEmails" label="Mời BS tham gia (email, cách nhau phẩy)">
            <Input placeholder="bs.a@bv.vn, bs.b@bv.vn" />
          </Form.Item>
          <Form.Item name="usePassword" valuePropName="checked">
            <Switch checkedChildren="Có mật khẩu" unCheckedChildren="Không mật khẩu" />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.usePassword !== c.usePassword}>
            {({ getFieldValue }) => getFieldValue('usePassword') && (
              <Form.Item name="password" label="Mật khẩu phòng" rules={[{ required: true, min: 4 }]}>
                <Input.Password placeholder="Mật khẩu (ít nhất 4 ký tự)" />
              </Form.Item>
            )}
          </Form.Item>
          <Form.Item name="isRecorded" valuePropName="checked">
            <Switch checkedChildren="Ghi hình phiên" unCheckedChildren="Không ghi hình" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal phòng vừa tạo → hiện QR + link */}
      <Modal
        title="Phòng hội chẩn đã tạo"
        open={currentRoom !== null}
        onCancel={() => setCurrentRoom(null)}
        footer={[<Button key="close" onClick={() => setCurrentRoom(null)}>Đóng</Button>]}
        width={520}
      >
        {currentRoom && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Text strong>Tên phòng:</Text> {currentRoom.title}<br />
              <Text strong>Jitsi URL:</Text>
              <Input.Group compact style={{ marginTop: 4 }}>
                <Input value={currentRoom.jitsiUrl} readOnly style={{ width: 'calc(100% - 100px)' }} />
                <Button icon={<CopyOutlined />} onClick={() => {
                  navigator.clipboard.writeText(currentRoom.jitsiUrl);
                  message.success('Đã copy');
                }}>Copy</Button>
              </Input.Group>
            </div>
            {currentRoom.hasPassword && <Tag color="orange">Có mật khẩu</Tag>}
            <Divider />
            <div style={{ textAlign: 'center' }}>
              <QRCodeCanvas value={currentRoom.jitsiUrl} size={200} level="M" />
              <div style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
                Quét QR bằng điện thoại để tham gia qua Jitsi mobile
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal kết thúc phòng → nhập kết luận */}
      <Modal
        title="Kết thúc phòng hội chẩn"
        open={endModal !== null}
        onOk={handleEnd}
        onCancel={() => setEndModal(null)}
        okText="Kết thúc"
        okButtonProps={{ danger: true }}
        destroyOnHidden
      >
        <Form form={endForm} layout="vertical">
          <Form.Item
            name="conclusionNote"
            label="Kết luận hội chẩn (bắt buộc)"
            rules={[{ required: true, min: 10, message: 'Ghi kết luận chi tiết' }]}
          >
            <Input.TextArea rows={5} placeholder="Nội dung đã bàn luận, ý kiến thống nhất, phương hướng xử trí..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Drawer người tham gia */}
      <Drawer
        title={`Người tham gia: ${participantsDrawer?.title || ''}`}
        open={participantsDrawer !== null}
        onClose={() => setParticipantsDrawer(null)}
        width={520}
      >
        <Table
          rowKey="id"
          dataSource={participants}
          pagination={false}
          columns={[
            { title: 'Tên hiển thị', dataIndex: 'displayName' },
            { title: 'User', dataIndex: 'userName' },
            { title: 'Email', dataIndex: 'email' },
            { title: 'Role', dataIndex: 'role' },
            {
              title: 'Tham gia',
              dataIndex: 'joinedAt',
              render: (v: string) => v ? dayjs(v).format('HH:mm DD/MM') : '-',
            },
          ]}
        />
      </Drawer>
    </div>
  );
}
