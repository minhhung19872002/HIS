// K1 phiên 6c (2026-05-30): tách tab `integration` khỏi SystemAdmin.tsx god-file — TAB CUỐI.
// Behavior-preserve: pure mock data hardcoded, no state/API/timer → tách thuần JSX, 0 props.
// Khi sau này wire backend thật: thay 4 dataSource hardcoded bằng useState + fetch.
import React from 'react';
import { Button, Card, Col, Descriptions, Row, Space, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import {
  ApiOutlined, KeyOutlined, MobileOutlined, PlusOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

export const IntegrationTabLabel: React.FC = () => (
  <span><ApiOutlined /> Tích hợp APP</span>
);

const IntegrationTab: React.FC = () => (
  <div>
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={6}>
        <Card size="small">
          <Statistic title="API Keys" value={3} prefix={<KeyOutlined />} styles={{ content: { color: '#1890ff' } }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small">
          <Statistic title="Webhooks" value={5} prefix={<ApiOutlined />} styles={{ content: { color: '#52c41a' } }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small">
          <Statistic title="App kết nối" value={2} prefix={<MobileOutlined />} styles={{ content: { color: '#722ed1' } }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={6}>
        <Card size="small">
          <Statistic title="Gọi API hôm nay" value={1247} prefix={<ThunderboltOutlined />} styles={{ content: { color: '#faad14' } }} />
        </Card>
      </Col>
    </Row>
    <Tabs defaultActiveKey="apikeys" items={[
      {
        key: 'apikeys',
        label: 'API Keys',
        children: (
          <div>
            <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }}>Tạo API Key</Button>
            <Table size="small" rowKey="id" dataSource={[
              { id: '1', name: 'App Bác sĩ', key: 'his_dk_****_a1b2', created: '2026-02-01', lastUsed: '2026-03-11', status: 'active', scope: 'doctor-portal' },
              { id: '2', name: 'App Bệnh nhân', key: 'his_pt_****_c3d4', created: '2026-02-15', lastUsed: '2026-03-11', status: 'active', scope: 'patient-portal' },
              { id: '3', name: 'LIS Integration', key: 'his_lis_****_e5f6', created: '2026-01-10', lastUsed: '2026-03-10', status: 'active', scope: 'laboratory' },
            ]} columns={[
              { title: 'Tên', dataIndex: 'name', key: 'name' },
              { title: 'API Key', dataIndex: 'key', key: 'key', render: (v: string) => <Typography.Text copyable code>{v}</Typography.Text> },
              { title: 'Phạm vi', dataIndex: 'scope', key: 'scope', render: (v: string) => <Tag color="blue">{v}</Tag> },
              { title: 'Ngày tạo', dataIndex: 'created', key: 'created', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
              { title: 'Sử dụng cuối', dataIndex: 'lastUsed', key: 'lastUsed', render: (v: string) => dayjs(v).format('DD/MM/YYYY') },
              { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? 'Hoạt động' : 'Vô hiệu'}</Tag> },
              { title: 'Thao tác', key: 'action', render: () => <Space><Button size="small" type="link" danger>Thu hồi</Button></Space> },
            ]} pagination={false} />
          </div>
        ),
      },
      {
        key: 'webhooks',
        label: 'Webhooks',
        children: (
          <div>
            <Button type="primary" icon={<PlusOutlined />} style={{ marginBottom: 16 }}>Thêm Webhook</Button>
            <Table size="small" rowKey="id" dataSource={[
              { id: '1', event: 'patient.registered', url: 'https://app.his.vn/webhooks/patient', status: 'active', lastTriggered: '2026-03-11 10:30' },
              { id: '2', event: 'lab.result.approved', url: 'https://app.his.vn/webhooks/lab', status: 'active', lastTriggered: '2026-03-11 09:15' },
              { id: '3', event: 'appointment.created', url: 'https://app.his.vn/webhooks/appointment', status: 'active', lastTriggered: '2026-03-10 16:45' },
              { id: '4', event: 'prescription.signed', url: 'https://app.his.vn/webhooks/rx', status: 'active', lastTriggered: '2026-03-10 14:20' },
              { id: '5', event: 'discharge.completed', url: 'https://notification.his.vn/push', status: 'active', lastTriggered: '2026-03-09 11:00' },
            ]} columns={[
              { title: 'Sự kiện', dataIndex: 'event', key: 'event', render: (v: string) => <Tag>{v}</Tag> },
              { title: 'URL', dataIndex: 'url', key: 'url', ellipsis: true },
              { title: 'Trạng thái', dataIndex: 'status', key: 'status', render: (v: string) => <Tag color={v === 'active' ? 'green' : 'red'}>{v === 'active' ? 'Hoạt động' : 'Tạm dừng'}</Tag> },
              { title: 'Gọi cuối', dataIndex: 'lastTriggered', key: 'lastTriggered' },
              { title: 'Thao tác', key: 'action', render: () => <Space><Button size="small" type="link">Sửa</Button><Button size="small" type="link" danger>Xóa</Button></Space> },
            ]} pagination={false} />
          </div>
        ),
      },
      {
        key: 'apps',
        label: 'Ứng dụng kết nối',
        children: (
          <Row gutter={[16, 16]}>
            {[
              { name: 'App Bác sĩ', version: '2.1.0', platform: 'iOS + Android', users: 45, status: 'active', desc: 'Ứng dụng khám bệnh, ký số cho bác sĩ' },
              { name: 'App Bệnh nhân', version: '1.5.2', platform: 'iOS + Android', users: 1250, status: 'active', desc: 'Đặt lịch, xem KQ, thanh toán trực tuyến' },
            ].map((app) => (
              <Col span={12} key={app.name}>
                <Card size="small"
                  title={<Space><MobileOutlined />{app.name} <Tag color="blue">v{app.version}</Tag></Space>}
                  extra={<Tag color={app.status === 'active' ? 'green' : 'red'}>{app.status === 'active' ? 'Hoạt động' : 'Bảo trì'}</Tag>}>
                  <Descriptions size="small" column={1}>
                    <Descriptions.Item label="Mô tả">{app.desc}</Descriptions.Item>
                    <Descriptions.Item label="Nền tảng">{app.platform}</Descriptions.Item>
                    <Descriptions.Item label="Người dùng">{app.users}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            ))}
          </Row>
        ),
      },
      {
        key: 'push',
        label: 'Push Notification',
        children: (
          <div>
            <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Firebase Project">his-hospital-app</Descriptions.Item>
              <Descriptions.Item label="Trạng thái"><Tag color="green">Kết nối</Tag></Descriptions.Item>
              <Descriptions.Item label="Thiết bị đăng ký">1,295</Descriptions.Item>
              <Descriptions.Item label="Gửi hôm nay">342</Descriptions.Item>
            </Descriptions>
            <Table size="small" rowKey="id" dataSource={[
              { id: '1', type: 'lab_result', title: 'KQ xét nghiệm', template: 'Kết quả XN của bạn đã có. Tập vào để xem chi tiết.', enabled: true },
              { id: '2', type: 'appointment_reminder', title: 'Nhắc lịch hẹn', template: 'Bạn có lịch hẹn khám ngày {date} lúc {time} tại {dept}.', enabled: true },
              { id: '3', type: 'prescription_ready', title: 'Đơn thuốc sẵn sàng', template: 'Đơn thuốc của bạn đã sẵn sàng nhận tại quầy {counter}.', enabled: true },
              { id: '4', type: 'payment_due', title: 'Nhắc thanh toán', template: 'Bạn có hóa đơn {amount} chưa thanh toán.', enabled: false },
            ]} columns={[
              { title: 'Loại', dataIndex: 'type', key: 'type', render: (v: string) => <Tag>{v}</Tag> },
              { title: 'Tiêu đề', dataIndex: 'title', key: 'title' },
              { title: 'Mẫu nội dung', dataIndex: 'template', key: 'template', ellipsis: true },
              { title: 'Bật', dataIndex: 'enabled', key: 'enabled', render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Bật' : 'Tắt'}</Tag> },
            ]} pagination={false} />
          </div>
        ),
      },
    ]} />
  </div>
);

export default IntegrationTab;
