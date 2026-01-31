import React, { useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Tabs,
  Row,
  Col,
  Typography,
  Switch,
  DatePicker,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  KeyOutlined,
  SearchOutlined,
  UserOutlined,
  SafetyOutlined,
  SettingOutlined,
  FileTextOutlined,
  BellOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// User Management Interfaces
interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  phoneNumber?: string;
  employeeCode?: string;
  title?: string;
  departmentName?: string;
  isActive: boolean;
  lastLoginAt?: string;
  roles: Role[];
  createdAt: string;
}

interface Role {
  id: string;
  roleCode: string;
  roleName: string;
  description?: string;
  permissions: Permission[];
  userCount: number;
}

interface Permission {
  id: string;
  permissionCode: string;
  permissionName: string;
  module?: string;
  description?: string;
}

interface SystemConfig {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description?: string;
  isActive: boolean;
}

interface AuditLog {
  id: string;
  tableName: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  userId?: string;
  username?: string;
  userFullName?: string;
  createdAt: string;
}

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  notificationType: string;
  targetUserId?: string;
  targetRoleId?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// Mock Data
const mockUsers: User[] = [
  {
    id: '1',
    username: 'admin',
    fullName: 'Quản trị viên',
    email: 'admin@hospital.vn',
    phoneNumber: '0901234567',
    employeeCode: 'NV001',
    title: 'Giám đốc',
    departmentName: 'Ban Giám đốc',
    isActive: true,
    lastLoginAt: '2026-01-30T08:00:00',
    roles: [{ id: '1', roleCode: 'ADMIN', roleName: 'Quản trị viên', permissions: [], userCount: 1 }],
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: '2',
    username: 'bs.nguyenvana',
    fullName: 'BS. Nguyễn Văn A',
    email: 'nguyenvana@hospital.vn',
    phoneNumber: '0912345678',
    employeeCode: 'BS001',
    title: 'Bác sĩ',
    departmentName: 'Khoa Nội',
    isActive: true,
    lastLoginAt: '2026-01-30T07:30:00',
    roles: [{ id: '2', roleCode: 'DOCTOR', roleName: 'Bác sĩ', permissions: [], userCount: 5 }],
    createdAt: '2026-01-15T00:00:00',
  },
];

const mockRoles: Role[] = [
  {
    id: '1',
    roleCode: 'ADMIN',
    roleName: 'Quản trị viên',
    description: 'Toàn quyền hệ thống',
    permissions: [],
    userCount: 1,
  },
  {
    id: '2',
    roleCode: 'DOCTOR',
    roleName: 'Bác sĩ',
    description: 'Khám bệnh, kê đơn',
    permissions: [],
    userCount: 5,
  },
  {
    id: '3',
    roleCode: 'NURSE',
    roleName: 'Điều dưỡng',
    description: 'Tiếp đón, chăm sóc bệnh nhân',
    permissions: [],
    userCount: 10,
  },
  {
    id: '4',
    roleCode: 'PHARMACIST',
    roleName: 'Dược sĩ',
    description: 'Quản lý thuốc, cấp phát',
    permissions: [],
    userCount: 3,
  },
];

const mockPermissions: Permission[] = [
  { id: '1', permissionCode: 'USER_VIEW', permissionName: 'Xem người dùng', module: 'System' },
  { id: '2', permissionCode: 'USER_CREATE', permissionName: 'Tạo người dùng', module: 'System' },
  { id: '3', permissionCode: 'PATIENT_VIEW', permissionName: 'Xem bệnh nhân', module: 'Patient' },
  { id: '4', permissionCode: 'PATIENT_CREATE', permissionName: 'Tạo bệnh nhân', module: 'Patient' },
  { id: '5', permissionCode: 'OPD_VIEW', permissionName: 'Xem phòng khám', module: 'OPD' },
  { id: '6', permissionCode: 'OPD_EXAM', permissionName: 'Khám bệnh', module: 'OPD' },
  { id: '7', permissionCode: 'PHARMACY_VIEW', permissionName: 'Xem kho thuốc', module: 'Pharmacy' },
  { id: '8', permissionCode: 'PHARMACY_DISPENSE', permissionName: 'Cấp phát thuốc', module: 'Pharmacy' },
];

const mockConfigs: SystemConfig[] = [
  { id: '1', configKey: 'HOSPITAL_NAME', configValue: 'Bệnh viện Đa khoa ABC', configType: 'String', description: 'Tên bệnh viện', isActive: true },
  { id: '2', configKey: 'HOSPITAL_ADDRESS', configValue: 'Số 123 Đường ABC, Quận XYZ, TP. HCM', configType: 'String', description: 'Địa chỉ bệnh viện', isActive: true },
  { id: '3', configKey: 'HOSPITAL_PHONE', configValue: '028.3xxx.xxxx', configType: 'String', description: 'Số điện thoại', isActive: true },
  { id: '4', configKey: 'SESSION_TIMEOUT', configValue: '30', configType: 'Number', description: 'Thời gian timeout phiên (phút)', isActive: true },
  { id: '5', configKey: 'ALLOW_DUPLICATE_PATIENT', configValue: 'false', configType: 'Boolean', description: 'Cho phép tạo bệnh nhân trùng', isActive: true },
];

const mockAuditLogs: AuditLog[] = [
  {
    id: '1',
    tableName: 'Users',
    action: 'UPDATE',
    oldValue: '{"isActive": true}',
    newValue: '{"isActive": false}',
    userId: '1',
    username: 'admin',
    userFullName: 'Quản trị viên',
    createdAt: '2026-01-30T08:00:00',
  },
  {
    id: '2',
    tableName: 'Patients',
    action: 'CREATE',
    newValue: '{"patientCode": "BN26000001", "fullName": "Nguyễn Văn A"}',
    userId: '2',
    username: 'bs.nguyenvana',
    userFullName: 'BS. Nguyễn Văn A',
    createdAt: '2026-01-30T07:30:00',
  },
];

const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    title: 'Bảo trì hệ thống',
    content: 'Hệ thống sẽ được bảo trì vào 23:00 ngày 31/01/2026',
    notificationType: 'Warning',
    isRead: false,
    createdAt: '2026-01-30T08:00:00',
  },
  {
    id: '2',
    title: 'Cập nhật phiên bản',
    content: 'Phiên bản mới v2.0.0 đã được cập nhật',
    notificationType: 'Info',
    isRead: true,
    readAt: '2026-01-30T08:30:00',
    createdAt: '2026-01-29T10:00:00',
  },
];

const SystemAdmin: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);

  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [notificationForm] = Form.useForm();

  // User Management
  const userColumns: ColumnsType<User> = [
    {
      title: 'Tên đăng nhập',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 180,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      width: 100,
    },
    {
      title: 'Chức danh',
      dataIndex: 'title',
      key: 'title',
      width: 120,
    },
    {
      title: 'Khoa/Phòng',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 150,
    },
    {
      title: 'Vai trò',
      key: 'roles',
      width: 150,
      render: (_, record) => (
        <>
          {record.roles.map((role) => (
            <Tag key={role.id} color="blue">
              {role.roleName}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Hoạt động' : 'Khóa'}
        </Tag>
      ),
    },
    {
      title: 'Đăng nhập cuối',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      width: 150,
      render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditUser(record)}
          >
            Sửa
          </Button>
          <Button
            size="small"
            icon={<KeyOutlined />}
            onClick={() => handleResetPassword(record)}
          >
            Đặt lại MK
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa người dùng này?"
            onConfirm={() => handleDeleteUser(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreateUser = () => {
    setSelectedUser(null);
    userForm.resetFields();
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    userForm.setFieldsValue({
      ...user,
      roleIds: user.roles.map((r) => r.id),
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      await userForm.validateFields();
      message.success(selectedUser ? 'Cập nhật người dùng thành công!' : 'Tạo người dùng thành công!');
      setIsUserModalOpen(false);
      userForm.resetFields();
    } catch (error) {
      message.error('Vui lòng kiểm tra lại thông tin!');
    }
  };

  const handleResetPassword = (user: User) => {
    Modal.confirm({
      title: 'Đặt lại mật khẩu',
      content: `Bạn có chắc muốn đặt lại mật khẩu cho người dùng "${user.fullName}"?`,
      onOk() {
        message.success('Đặt lại mật khẩu thành công!');
      },
    });
  };

  const handleDeleteUser = (_userId: string) => {
    message.success('Xóa người dùng thành công!');
  };

  // Role Management
  const roleColumns: ColumnsType<Role> = [
    {
      title: 'Mã vai trò',
      dataIndex: 'roleCode',
      key: 'roleCode',
      width: 150,
    },
    {
      title: 'Tên vai trò',
      dataIndex: 'roleName',
      key: 'roleName',
      width: 200,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Số người dùng',
      dataIndex: 'userCount',
      key: 'userCount',
      width: 120,
      align: 'center',
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditRole(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa vai trò này?"
            onConfirm={() => handleDeleteRole(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleCreateRole = () => {
    setSelectedRole(null);
    roleForm.resetFields();
    setIsRoleModalOpen(true);
  };

  const handleEditRole = (role: Role) => {
    setSelectedRole(role);
    roleForm.setFieldsValue({
      ...role,
      permissionIds: role.permissions.map((p) => p.id),
    });
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      await roleForm.validateFields();
      message.success(selectedRole ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
      setIsRoleModalOpen(false);
      roleForm.resetFields();
    } catch (error) {
      message.error('Vui lòng kiểm tra lại thông tin!');
    }
  };

  const handleDeleteRole = (_roleId: string) => {
    message.success('Xóa vai trò thành công!');
  };

  // System Config
  const configColumns: ColumnsType<SystemConfig> = [
    {
      title: 'Khóa cấu hình',
      dataIndex: 'configKey',
      key: 'configKey',
      width: 250,
    },
    {
      title: 'Giá trị',
      dataIndex: 'configValue',
      key: 'configValue',
      width: 300,
    },
    {
      title: 'Kiểu dữ liệu',
      dataIndex: 'configType',
      key: 'configType',
      width: 120,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>
          {isActive ? 'Kích hoạt' : 'Vô hiệu'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEditConfig(record)}
        >
          Sửa
        </Button>
      ),
    },
  ];

  const handleEditConfig = (config: SystemConfig) => {
    setSelectedConfig(config);
    configForm.setFieldsValue(config);
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      await configForm.validateFields();
      message.success('Cập nhật cấu hình thành công!');
      setIsConfigModalOpen(false);
      configForm.resetFields();
    } catch (error) {
      message.error('Vui lòng kiểm tra lại thông tin!');
    }
  };

  // Audit Logs
  const auditLogColumns: ColumnsType<AuditLog> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
    },
    {
      title: 'Người dùng',
      key: 'user',
      width: 180,
      render: (_, record) => (
        <>
          <div>{record.userFullName}</div>
          <div style={{ fontSize: '12px', color: '#888' }}>@{record.username}</div>
        </>
      ),
    },
    {
      title: 'Bảng',
      dataIndex: 'tableName',
      key: 'tableName',
      width: 150,
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => {
        let color = 'blue';
        if (action === 'CREATE') color = 'green';
        if (action === 'UPDATE') color = 'orange';
        if (action === 'DELETE') color = 'red';
        return <Tag color={color}>{action}</Tag>;
      },
    },
    {
      title: 'Giá trị cũ',
      dataIndex: 'oldValue',
      key: 'oldValue',
      ellipsis: true,
    },
    {
      title: 'Giá trị mới',
      dataIndex: 'newValue',
      key: 'newValue',
      ellipsis: true,
    },
  ];

  // Notifications
  const notificationColumns: ColumnsType<NotificationItem> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: 'Nội dung',
      dataIndex: 'content',
      key: 'content',
    },
    {
      title: 'Loại',
      dataIndex: 'notificationType',
      key: 'notificationType',
      width: 100,
      render: (type) => {
        let color = 'blue';
        if (type === 'Warning') color = 'orange';
        if (type === 'Error') color = 'red';
        if (type === 'Success') color = 'green';
        return <Tag color={color}>{type}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 100,
      render: (isRead) => (
        <Tag color={isRead ? 'default' : 'blue'}>
          {isRead ? 'Đã đọc' : 'Chưa đọc'}
        </Tag>
      ),
    },
  ];

  const handleSendNotification = async () => {
    try {
      await notificationForm.validateFields();
      message.success('Gửi thông báo thành công!');
      setIsNotificationModalOpen(false);
      notificationForm.resetFields();
    } catch (error) {
      message.error('Vui lòng kiểm tra lại thông tin!');
    }
  };

  return (
    <div>
      <Title level={4}>Quản trị hệ thống</Title>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (
                <span>
                  <UserOutlined /> Quản lý người dùng
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Search
                        placeholder="Tìm theo tên, email, mã nhân viên..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                      />
                    </Col>
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateUser}>
                        Thêm người dùng
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={userColumns}
                    dataSource={mockUsers}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1500 }}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} người dùng`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'roles',
              label: (
                <span>
                  <SafetyOutlined /> Vai trò & Phân quyền
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto" />
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateRole}>
                        Thêm vai trò
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={roleColumns}
                    dataSource={mockRoles}
                    rowKey="id"
                    size="small"
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng: ${total} vai trò`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'configs',
              label: (
                <span>
                  <SettingOutlined /> Cấu hình hệ thống
                </span>
              ),
              children: (
                <Table
                  columns={configColumns}
                  dataSource={mockConfigs}
                  rowKey="id"
                  size="small"
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng: ${total} cấu hình`,
                  }}
                />
              ),
            },
            {
              key: 'audit',
              label: (
                <span>
                  <FileTextOutlined /> Nhật ký hệ thống
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select placeholder="Chọn bảng" style={{ width: 200 }} allowClear>
                        <Option value="Users">Users</Option>
                        <Option value="Patients">Patients</Option>
                        <Option value="Examinations">Examinations</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select placeholder="Hành động" style={{ width: 150 }} allowClear>
                        <Option value="CREATE">CREATE</Option>
                        <Option value="UPDATE">UPDATE</Option>
                        <Option value="DELETE">DELETE</Option>
                      </Select>
                    </Col>
                    <Col>
                      <RangePicker format="DD/MM/YYYY" />
                    </Col>
                  </Row>

                  <Table
                    columns={auditLogColumns}
                    dataSource={mockAuditLogs}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
                  />
                </>
              ),
            },
            {
              key: 'notifications',
              label: (
                <span>
                  <BellOutlined /> Thông báo
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto" />
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsNotificationModalOpen(true)}>
                        Gửi thông báo
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    columns={notificationColumns}
                    dataSource={mockNotifications}
                    rowKey="id"
                    size="small"
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng: ${total} thông báo`,
                    }}
                  />
                </>
              ),
            },
          ]}
        />
      </Card>

      {/* User Modal */}
      <Modal
        title={selectedUser ? 'Cập nhật người dùng' : 'Thêm người dùng'}
        open={isUserModalOpen}
        onOk={handleSaveUser}
        onCancel={() => setIsUserModalOpen(false)}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={userForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="username"
                label="Tên đăng nhập"
                rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
              >
                <Input placeholder="Nhập tên đăng nhập" disabled={!!selectedUser} />
              </Form.Item>
            </Col>
            {!selectedUser && (
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
                <Select placeholder="Chọn khoa/phòng">
                  <Option value="1">Khoa Nội</Option>
                  <Option value="2">Khoa Ngoại</Option>
                  <Option value="3">Khoa Nhi</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="roleIds" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <Select mode="multiple" placeholder="Chọn vai trò">
              {mockRoles.map((role) => (
                <Option key={role.id} value={role.id}>
                  {role.roleName}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked" initialValue={true}>
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Role Modal */}
      <Modal
        title={selectedRole ? 'Cập nhật vai trò' : 'Thêm vai trò'}
        open={isRoleModalOpen}
        onOk={handleSaveRole}
        onCancel={() => setIsRoleModalOpen(false)}
        width={800}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={roleForm} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="roleCode"
                label="Mã vai trò"
                rules={[{ required: true, message: 'Vui lòng nhập mã vai trò' }]}
              >
                <Input placeholder="Nhập mã vai trò (VD: ADMIN, DOCTOR)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="roleName"
                label="Tên vai trò"
                rules={[{ required: true, message: 'Vui lòng nhập tên vai trò' }]}
              >
                <Input placeholder="Nhập tên vai trò" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={3} placeholder="Nhập mô tả vai trò" />
          </Form.Item>

          <Form.Item name="permissionIds" label="Phân quyền">
            <Select mode="multiple" placeholder="Chọn quyền">
              {mockPermissions.map((permission) => (
                <Option key={permission.id} value={permission.id}>
                  [{permission.module}] {permission.permissionName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Config Modal */}
      <Modal
        title="Cập nhật cấu hình"
        open={isConfigModalOpen}
        onOk={handleSaveConfig}
        onCancel={() => setIsConfigModalOpen(false)}
        width={600}
        okText="Lưu"
        cancelText="Hủy"
      >
        <Form form={configForm} layout="vertical">
          <Form.Item label="Khóa cấu hình">
            <Input disabled value={selectedConfig?.configKey} />
          </Form.Item>

          <Form.Item
            name="configValue"
            label="Giá trị"
            rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
          >
            <Input placeholder="Nhập giá trị" />
          </Form.Item>

          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Kích hoạt" unCheckedChildren="Vô hiệu" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Notification Modal */}
      <Modal
        title="Gửi thông báo"
        open={isNotificationModalOpen}
        onOk={handleSendNotification}
        onCancel={() => setIsNotificationModalOpen(false)}
        width={600}
        okText="Gửi"
        cancelText="Hủy"
      >
        <Form form={notificationForm} layout="vertical">
          <Form.Item
            name="title"
            label="Tiêu đề"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
          >
            <Input placeholder="Nhập tiêu đề thông báo" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung"
            rules={[{ required: true, message: 'Vui lòng nhập nội dung' }]}
          >
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
                  {mockUsers.map((user) => (
                    <Option key={user.id} value={user.id}>
                      {user.fullName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="targetRoleId" label="Gửi đến vai trò">
                <Select placeholder="Chọn vai trò" allowClear>
                  {mockRoles.map((role) => (
                    <Option key={role.id} value={role.id}>
                      {role.roleName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemAdmin;
