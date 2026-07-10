// K1 phiên 5d (2026-05-30): tách tab `users` khỏi SystemAdmin.tsx god-file.
// Behavior-preserve: copy 1-1 column/handler/modal + local search filter.
// Side-effects: KHÔNG có timer → không cần `active` prop.
// Local state: `searchKeyword` + `filteredUsers` derive (moved khỏi parent).
import React, { useMemo, useState } from 'react';
import {
  Button, Col, Descriptions, Form, Input, Modal, Popconfirm, Row, Select, Space,
  Switch, Table, Tag, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, SearchOutlined, UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminApi } from '../../modules/system/api/system';
import { isFormValidationError } from './helpers';
import type { Role } from './RolesTab';

const { Option } = Select;
const { Search } = Input;

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeCode?: string;
  title?: string;
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  roles: Role[];
  createdAt: string;
}

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

interface Props {
  users: User[];
  roles: Role[];
  departments: DepartmentOption[];
  loading: boolean;
  onReload: () => void;
}

export const UsersTabLabel: React.FC = () => (
  <span><UserOutlined /> Quản lý người dùng</span>
);

const UsersTab: React.FC<Props> = ({ users, roles, departments, loading, onReload }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [form] = Form.useForm();

  const filteredUsers = useMemo(() => {
    if (!searchKeyword) return users;
    const kw = searchKeyword.toLowerCase();
    return users.filter(u =>
      (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
      (u.username && u.username.toLowerCase().includes(kw)) ||
      (u.email && u.email.toLowerCase().includes(kw)) ||
      (u.employeeCode && u.employeeCode.toLowerCase().includes(kw))
    );
  }, [users, searchKeyword]);

  const handleCreate = () => {
    setSelected(null);
    form.resetFields();
    setModalOpen(true);
  };

  const handleEdit = (user: User) => {
    setSelected(user);
    form.setFieldsValue({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      employeeCode: user.employeeCode,
      title: user.title,
      departmentId: user.departmentId,
      isActive: user.isActive,
      roleIds: user.roles.map((r) => r.id),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (selected) {
        await adminApi.updateUser(selected.id, {
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          employeeId: values.employeeCode,
          departmentId: values.departmentId,
          roleIds: values.roleIds || [],
          isActive: values.isActive !== false,
        });
        message.success('Cập nhật người dùng thành công!');
      } else {
        await adminApi.createUser({
          username: values.username,
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          employeeId: values.employeeCode,
          departmentId: values.departmentId,
          roleIds: values.roleIds || [],
          initialPassword: values.password,
        });
        message.success('Tạo người dùng thành công!');
      }
      setModalOpen(false);
      form.resetFields();
      onReload();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error saving user:', error);
      message.warning('Lưu người dùng thất bại!');
    }
  };

  const handleResetPassword = (user: User) => {
    Modal.confirm({
      title: 'Đặt lại mật khẩu',
      content: `Bạn có chắc muốn đặt lại mật khẩu cho người dùng "${user.fullName}"?`,
      async onOk() {
        try {
          await adminApi.resetPassword(user.id);
          message.success('Đặt lại mật khẩu thành công!');
        } catch (error) {
          console.warn('Error resetting password:', error);
          message.warning('Đặt lại mật khẩu thất bại!');
        }
      },
    });
  };

  const handleDelete = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      message.success('Xóa người dùng thành công!');
      onReload();
    } catch (error) {
      console.warn('Error deleting user:', error);
      message.warning('Xóa người dùng thất bại!');
    }
  };

  const columns: ColumnsType<User> = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', width: 150 },
    { title: 'Họ tên', dataIndex: 'fullName', key: 'fullName', width: 180 },
    { title: 'Email', dataIndex: 'email', key: 'email', width: 200 },
    { title: 'Mã NV', dataIndex: 'employeeCode', key: 'employeeCode', width: 100 },
    { title: 'Chức danh', dataIndex: 'title', key: 'title', width: 120 },
    { title: 'Khoa/Phòng', dataIndex: 'departmentName', key: 'departmentName', width: 150 },
    {
      title: 'Vai trò', key: 'roles', width: 150,
      render: (_: unknown, record: User) => (
        <>{record.roles.map((role) => <Tag key={role.id} color="blue">{role.roleName}</Tag>)}</>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'isActive', key: 'isActive', width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Hoạt động' : 'Khóa'}</Tag>
      ),
    },
    {
      title: 'Đăng nhập cuối', dataIndex: 'lastLoginAt', key: 'lastLoginAt', width: 150,
      render: (date: string) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Thao tác', key: 'action', width: 150, fixed: 'right',
      render: (_: unknown, record: User) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Sửa</Button>
          <Button size="small" icon={<KeyOutlined />} onClick={() => handleResetPassword(record)}>Đặt lại MK</Button>
          <Popconfirm title="Bạn có chắc muốn xóa người dùng này?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<DeleteOutlined />}>Xóa</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col flex="auto">
          <Search
            placeholder="Tìm theo tên, email, mã nhân viên..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ maxWidth: 400 }}
            onSearch={(value) => setSearchKeyword(value)}
            onChange={(e) => { if (!e.target.value) setSearchKeyword(''); }}
          />
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm người dùng
          </Button>
        </Col>
      </Row>
      <Table
        columns={columns}
        dataSource={filteredUsers}
        rowKey="id"
        size="small"
        scroll={{ x: 1500 }}
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Tổng: ${total} người dùng`,
        }}
        onRow={(record) => ({
          onDoubleClick: () => {
            Modal.info({
              title: `Chi tiết người dùng - ${record.fullName}`,
              width: 600,
              content: (
                <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                  <Descriptions.Item label="Tên đăng nhập">{record.username}</Descriptions.Item>
                  <Descriptions.Item label="Họ tên">{record.fullName}</Descriptions.Item>
                  <Descriptions.Item label="Email">{record.email}</Descriptions.Item>
                  <Descriptions.Item label="Mã nhân viên">{record.employeeCode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Chức danh">{record.title || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Khoa/Phòng">{record.departmentName || '-'}</Descriptions.Item>
                  <Descriptions.Item label="Vai trò" span={2}>
                    {record.roles?.map((role) => <Tag key={role.id} color="blue">{role.roleName}</Tag>)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">
                    <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Hoạt động' : 'Khóa'}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Đăng nhập cuối">{record.lastLoginAt || '-'}</Descriptions.Item>
                </Descriptions>
              ),
            });
          },
          style: { cursor: 'pointer' },
        })}
      />

      <Modal
        title={selected ? 'Cập nhật người dùng' : 'Thêm người dùng'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              >
                <Input placeholder="Nhập tên đăng nhập" disabled={!!selected} />
              </Form.Item>
            </Col>
            {!selected && (
              <Col span={12}>
                <Form.Item
                  name="password"
                  label="Mật khẩu"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
                >
                  <Input.Password placeholder="Nhập mật khẩu" />
                </Form.Item>
              </Col>
            )}
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="fullName"
                label="Họ tên"
                rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
              >
                <Input placeholder="Nhập họ tên" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="Nhập email" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phoneNumber" label="Số điện thoại">
                <Input placeholder="Nhập số điện thoại" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="employeeCode" label="Mã nhân viên">
                <Input placeholder="Nhập mã nhân viên" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="title" label="Chức danh">
                <Input placeholder="Nhập chức danh" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="departmentId" label="Khoa/Phòng">
                <Select placeholder="Chọn khoa/phòng" allowClear showSearch optionFilterProp="children">
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>{dept.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="roleIds" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <Select mode="multiple" placeholder="Chọn vai trò">
              {roles.map((role) => (
                <Option key={role.id} value={role.id}>{role.roleName}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default UsersTab;
