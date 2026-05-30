// Tab yêu cầu CNTT — tách từ pages/SystemAdmin.tsx (K1 refactor 2026-05-30).
// Behavior-preserving: state + handlers + JSX y nguyên, chỉ self-contained.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Button, Card, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic,
  Table, Tag, message,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, PlusOutlined, ReloadOutlined,
  SearchOutlined, ThunderboltOutlined, ToolOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import * as itTicketApi from '../../api/itTicket';

const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

type ItTicketListItem = Record<string, unknown>;

// Helpers local (3 helpers copy từ main SystemAdmin.tsx — sau này extract khi có >2 tab dùng)
const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);
const toNumberValue = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const isFormValidationError = (e: unknown): boolean =>
  typeof e === 'object' && e !== null && 'errorFields' in e;

interface ItTicketStats {
  newCount: number; inProgressCount: number; resolvedCount: number;
  closedCount: number; totalCount: number;
}
const EMPTY_STATS: ItTicketStats = { newCount: 0, inProgressCount: 0, resolvedCount: 0, closedCount: 0, totalCount: 0 };

const ItTicketsTab: React.FC = () => {
  const [itTicketForm] = Form.useForm();
  const [itRespondForm] = Form.useForm();
  const [tickets, setTickets] = useState<ItTicketListItem[]>([]);
  const [stats, setStats] = useState<ItTicketStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isRespondModalOpen, setIsRespondModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<number | undefined>();
  const [filterPriority, setFilterPriority] = useState<number | undefined>();
  const [keyword, setKeyword] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: number; priority?: number; keyword?: string } = {};
      if (filterStatus !== undefined) params.status = filterStatus;
      if (filterPriority !== undefined) params.priority = filterPriority;
      if (keyword) params.keyword = keyword;
      const [ticketsRes, statsRes] = await Promise.allSettled([
        itTicketApi.getItTickets(params),
        itTicketApi.getItTicketStats(),
      ]);
      if (ticketsRes.status === 'fulfilled') {
        const d = ticketsRes.value.data;
        setTickets(Array.isArray(d) ? d : d?.data || d?.items || []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data;
        setStats(d?.data || d || EMPTY_STATS);
      }
    } catch {
      console.warn('Error fetching IT tickets');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, keyword]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    try {
      const values = await itTicketForm.validateFields();
      await itTicketApi.createItTicket(values);
      message.success('Tao yeu cau CNTT thanh cong');
      setIsTicketModalOpen(false);
      itTicketForm.resetFields();
      fetchTickets();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error creating IT ticket:', error);
      message.warning('Khong the tao yeu cau CNTT');
    }
  };

  const handleRespond = async () => {
    try {
      const values = await itRespondForm.validateFields();
      if (!selectedTicketId) return;
      await itTicketApi.respondToTicket(selectedTicketId, values);
      message.success('Da phan hoi yeu cau');
      setIsRespondModalOpen(false);
      itRespondForm.resetFields();
      setSelectedTicketId(null);
      fetchTickets();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error responding to IT ticket:', error);
      message.warning('Khong the phan hoi yeu cau');
    }
  };

  const handleClose = async (id: string) => {
    try {
      await itTicketApi.closeTicket(id);
      message.success('Da dong yeu cau');
      fetchTickets();
    } catch (error) {
      console.warn('Error closing IT ticket:', error);
      message.warning('Khong the dong yeu cau');
    }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Moi" value={stats.newCount} styles={{ content: { color: '#1890ff' } }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Dang xu ly" value={stats.inProgressCount} styles={{ content: { color: '#fa8c16' } }} prefix={<ThunderboltOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Da giai quyet" value={stats.resolvedCount} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Da dong" value={stats.closedCount} styles={{ content: { color: '#8c8c8c' } }} prefix={<CloseCircleOutlined />} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
        <Col>
          <Select placeholder="Muc do" style={{ width: 140 }} allowClear value={filterPriority} onChange={(v) => setFilterPriority(v)}>
            <Option value={1}>Thap</Option>
            <Option value={2}>Trung binh</Option>
            <Option value={3}>Cao</Option>
            <Option value={4}>Khan cap</Option>
          </Select>
        </Col>
        <Col>
          <Select placeholder="Trang thai" style={{ width: 140 }} allowClear value={filterStatus} onChange={(v) => setFilterStatus(v)}>
            <Option value={0}>Moi</Option>
            <Option value={1}>Dang xu ly</Option>
            <Option value={2}>Da giai quyet</Option>
            <Option value={3}>Da dong</Option>
          </Select>
        </Col>
        <Col flex="auto">
          <Search
            placeholder="Tim kiem yeu cau..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ maxWidth: 300 }}
            onSearch={(v) => setKeyword(v)}
            onChange={(e) => { if (!e.target.value) setKeyword(''); }}
          />
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => fetchTickets()} />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsTicketModalOpen(true)}>
            Tao yeu cau
          </Button>
        </Col>
      </Row>

      <Table
        dataSource={tickets}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ showSizeChanger: true, showTotal: (total) => `Tong: ${total} yeu cau` }}
        columns={[
          { title: 'Tieu de', dataIndex: 'title', key: 'title', width: 200, ellipsis: true },
          { title: 'Khoa/Phong', dataIndex: 'departmentName', key: 'departmentName', width: 140 },
          { title: 'Nguoi yeu cau', dataIndex: 'requestedByName', key: 'requestedByName', width: 140 },
          {
            title: 'Muc do', dataIndex: 'priority', key: 'priority', width: 100,
            render: (v: number) => {
              const map: Record<number, { color: string; text: string }> = {
                1: { color: 'default', text: 'Thap' },
                2: { color: 'blue', text: 'Trung binh' },
                3: { color: 'orange', text: 'Cao' },
                4: { color: 'red', text: 'Khan cap' },
              };
              const item = map[v] || { color: 'default', text: `${v}` };
              return <Tag color={item.color}>{item.text}</Tag>;
            },
          },
          {
            title: 'Trang thai', dataIndex: 'status', key: 'status', width: 110,
            render: (v: number) => {
              const map: Record<number, { color: string; text: string }> = {
                0: { color: 'blue', text: 'Moi' },
                1: { color: 'orange', text: 'Dang xu ly' },
                2: { color: 'green', text: 'Da giai quyet' },
                3: { color: 'default', text: 'Da dong' },
              };
              const item = map[v] || { color: 'default', text: `${v}` };
              return <Tag color={item.color}>{item.text}</Tag>;
            },
          },
          {
            title: 'Ngay tao', dataIndex: 'createdAt', key: 'createdAt', width: 140,
            render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-',
          },
          { title: 'Phan hoi', dataIndex: 'response', key: 'response', width: 200, ellipsis: true, render: (v: string) => v || '-' },
          {
            title: 'Thao tac', key: 'actions', width: 160, fixed: 'right',
            render: (_: unknown, record: ItTicketListItem) => (
              <Space>
                {toNumberValue(record.status) < 2 && (
                  <Button
                    size="small" type="link"
                    onClick={() => {
                      setSelectedTicketId(toStringValue(record.id));
                      setIsRespondModalOpen(true);
                    }}
                  >Phan hoi</Button>
                )}
                {toNumberValue(record.status) < 3 && (
                  <Popconfirm title="Dong yeu cau nay?" onConfirm={() => handleClose(toStringValue(record.id))} okText="Dong" cancelText="Huy">
                    <Button size="small" type="link" danger>Dong</Button>
                  </Popconfirm>
                )}
              </Space>
            ),
          },
        ]}
        scroll={{ x: 1200 }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: `Chi tiet yeu cau - ${toStringValue(record.title)}`,
              width: 600,
              content: (
                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Tieu de">{toStringValue(record.title)}</Descriptions.Item>
                  <Descriptions.Item label="Mo ta">{toStringValue(record.description, '-')}</Descriptions.Item>
                  <Descriptions.Item label="Khoa/Phong">{toStringValue(record.departmentName, '-')}</Descriptions.Item>
                  <Descriptions.Item label="Nguoi yeu cau">{toStringValue(record.requestedByName, '-')}</Descriptions.Item>
                  <Descriptions.Item label="Muc do">
                    <Tag color={['default', 'default', 'blue', 'orange', 'red'][toNumberValue(record.priority)] || 'default'}>
                      {['', 'Thap', 'Trung binh', 'Cao', 'Khan cap'][toNumberValue(record.priority)] || toStringValue(record.priority)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Trang thai">
                    <Tag color={['blue', 'orange', 'green', 'default'][toNumberValue(record.status)] || 'default'}>
                      {['Moi', 'Dang xu ly', 'Da giai quyet', 'Da dong'][toNumberValue(record.status)] || toStringValue(record.status)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Phan hoi">{toStringValue(record.response, '-')}</Descriptions.Item>
                  <Descriptions.Item label="Nguoi xu ly">{toStringValue(record.assignedToName, '-')}</Descriptions.Item>
                  <Descriptions.Item label="Ngay tao">{record.createdAt ? dayjs(toStringValue(record.createdAt)).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Ngay xu ly">{record.resolvedAt ? dayjs(toStringValue(record.resolvedAt)).format('DD/MM/YYYY HH:mm') : '-'}</Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      {/* Modal tạo yêu cầu */}
      <Modal
        title="Tao yeu cau CNTT"
        open={isTicketModalOpen}
        onOk={handleCreate}
        onCancel={() => setIsTicketModalOpen(false)}
        okText="Gui"
        cancelText="Huy"
        width={500}
        destroyOnHidden
      >
        <Form form={itTicketForm} layout="vertical">
          <Form.Item name="title" label="Tieu de" rules={[{ required: true, message: 'Vui long nhap tieu de' }]}>
            <Input placeholder="VD: May in phong kham 3 bi ket giay" />
          </Form.Item>
          <Form.Item name="description" label="Mo ta chi tiet" rules={[{ required: true, message: 'Vui long nhap mo ta' }]}>
            <TextArea rows={4} placeholder="Mo ta chi tiet van de gap phai..." />
          </Form.Item>
          <Form.Item name="priority" label="Muc do uu tien" initialValue={2}>
            <Select>
              <Option value={1}>Thap - Khong gap</Option>
              <Option value={2}>Trung binh - Can xu ly</Option>
              <Option value={3}>Cao - Anh huong cong viec</Option>
              <Option value={4}>Khan cap - Ngung hoat dong</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal phản hồi yêu cầu */}
      <Modal
        title="Phan hoi yeu cau CNTT"
        open={isRespondModalOpen}
        onOk={handleRespond}
        onCancel={() => { setIsRespondModalOpen(false); setSelectedTicketId(null); }}
        okText="Gui phan hoi"
        cancelText="Huy"
        width={500}
        destroyOnHidden
      >
        <Form form={itRespondForm} layout="vertical">
          <Form.Item name="response" label="Noi dung phan hoi" rules={[{ required: true, message: 'Vui long nhap noi dung phan hoi' }]}>
            <TextArea rows={4} placeholder="Mo ta cach xu ly, huong dan, hoac ghi chu..." />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export const ItTicketsTabIcon = <ToolOutlined />;
export const ItTicketsTabLabel = 'Yeu cau CNTT';
export const ItTicketsTabKey = 'it-tickets';

export default ItTicketsTab;
