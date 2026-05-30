// K1 phiên 5a (2026-05-30): tách tab `notifications` khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy y nguyên column/handler/modal + props pass từ parent.
// Side-effects: KHÔNG có timer/subscription → không cần `active` prop.
import React, { useState } from 'react';
import { Button, Col, Descriptions, Form, Input, Modal, Row, Select, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { BellOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi } from '../../api/system';
import { isFormValidationError } from './helpers';

const { Option } = Select;
const { TextArea } = Input;

export interface NotificationItem {
  id: string;
  title: string;
  content: string;
  notificationType: string;
  targetUserId?: string;
  targetRoleId?: string;
  isRead: boolean;
  createdAt: string;
}

interface UserLite { id: string; fullName: string }
interface RoleLite { id: string; roleName: string }

interface Props {
  notifications: NotificationItem[];
  loading: boolean;
  onReload: () => void;
  users: UserLite[];
  roles: RoleLite[];
}

export const NotificationsTabLabel: React.FC = () => (
  <span><BellOutlined /> Thông báo</span>
);

const NotificationsTab: React.FC<Props> = ({ notifications, loading, onReload, users, roles }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns: ColumnsType<NotificationItem> = [
    {
      title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Tiêu đề', dataIndex: 'title', key: 'title', width: 250 },
    { title: 'Nội dung', dataIndex: 'content', key: 'content' },
    {
      title: 'Loại', dataIndex: 'notificationType', key: 'notificationType', width: 100,
      render: (type: string) => {
        let color = 'blue';
        if (type === 'Warning') color = 'orange';
        if (type === 'Error') color = 'red';
        if (type === 'Success') color = 'green';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Trạng thái', dataIndex: 'isRead', key: 'isRead', width: 100,
      render: (isRead: boolean) => (
        <Tag color={isRead ? 'default' : 'blue'}>{isRead ? 'Đã đọc' : 'Chưa đọc'}</Tag>
      ),
    },
  ];

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      await adminApi.saveSystemNotification({
        title: values.title,
        content: values.content,
        notificationType: values.notificationType || 'Info',
        priority: 'Normal',
        targetUsers: values.targetUserId ? [values.targetUserId] : undefined,
        targetRoles: values.targetRoleId ? [values.targetRoleId] : undefined,
        startDate: new Date().toISOString(),
        isActive: true,
      });
      message.success('Gửi thông báo thành công!');
      setModalOpen(false);
      form.resetFields();
      onReload();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error sending notification:', error);
      message.warning('Gửi thông báo thất bại!');
    }
  };

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto" />
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Gửi thông báo
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={notifications}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showTotal: (total) => `Tổng: ${total} thông báo`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: 'Chi tiết thông báo',
              width: 500,
              content: (
                <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Tiêu đề">{record.title}</Descriptions.Item>
                  <Descriptions.Item label="Nội dung">{record.content}</Descriptions.Item>
                  <Descriptions.Item label="Loại">{record.notificationType}</Descriptions.Item>
                  <Descriptions.Item label="Đối tượng">
                    {record.targetUserId || record.targetRoleId || 'Tất cả'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày gửi">{record.createdAt}</Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title="Gửi thông báo"
        open={modalOpen}
        onOk={handleSend}
        onCancel={() => setModalOpen(false)}
        width={600}
        okText="Gửi"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}>
            <Input placeholder="Nhập tiêu đề thông báo" />
          </Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}>
            <TextArea rows={4} placeholder="Nhập nội dung thông báo" />
          </Form.Item>
          <Form.Item name="notificationType" label="Loại thông báo" initialValue="Info">
            <Select>
              <Option value="Info">Thông tin</Option>
              <Option value="Warning">Cảnh báo</Option>
              <Option value="Error">Lỗi</Option>
              <Option value="Success">Thành công</Option>
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="targetUserId" label="Gửi đến người dùng">
                <Select placeholder="Chọn người dùng" allowClear>
                  {users.map((user) => (
                    <Option key={user.id} value={user.id}>{user.fullName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetRoleId" label="Gửi đến vai trò">
                <Select placeholder="Chọn vai trò" allowClear>
                  {roles.map((role) => (
                    <Option key={role.id} value={role.id}>{role.roleName}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default NotificationsTab;
