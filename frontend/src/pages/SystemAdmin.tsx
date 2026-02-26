import React, { useState, useEffect } from 'react';
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
  Descriptions,
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
import { adminApi, catalogApi } from '../api/system';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// User Management Interfaces (mapped from API DTOs)
interface User {
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

interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

const SystemAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [activeTab, setActiveTab] = useState('users');

  // Helper to extract array data from API response (handles both direct array and { data: [...] } wrapper)
  const extractData = (response: any): any[] => {
    const d = response?.data;
    if (Array.isArray(d)) return d;
    if (d && Array.isArray(d.data)) return d.data;
    if (d && Array.isArray(d.items)) return d.items;
    return [];
  };

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, permissionsData, configsData, auditLogsData, notificationsData, departmentsData] = await Promise.all([
        adminApi.getUsers().catch(() => ({ data: [] })),
        adminApi.getRoles().catch(() => ({ data: [] })),
        adminApi.getPermissions().catch(() => ({ data: [] })),
        adminApi.getSystemConfigs().catch(() => ({ data: [] })),
        adminApi.getAuditLogs({}).catch(() => ({ data: [] })),
        adminApi.getSystemNotifications().catch(() => ({ data: [] })),
        catalogApi.getDepartments().catch(() => ({ data: [] })),
      ]);

      // Map API DTOs to local interfaces
      setUsers(extractData(usersData).map((u: any) => ({
        id: u.id || '',
        username: u.username,
        fullName: u.fullName,
        email: u.email,
        phoneNumber: u.phoneNumber,
        employeeCode: u.employeeCode || u.employeeId,
        title: u.title || '',
        departmentId: u.departmentId,
        departmentName: u.departmentName,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginDate,
        roles: (u.roles || []).map((r: any) => ({
          id: r.id || '',
          roleCode: r.code || r.roleCode,
          roleName: r.name || r.roleName,
          description: r.description,
          permissions: r.permissions || [],
          userCount: r.userCount || 0,
        })),
        createdAt: u.createdDate,
      })));

      setRoles(extractData(rolesData).map((r: any) => ({
        id: r.id || '',
        roleCode: r.code || r.roleCode,
        roleName: r.name || r.roleName,
        description: r.description,
        permissions: (r.permissions || []).map((p: any) => ({
          id: p.id || '',
          permissionCode: p.code || p.permissionCode,
          permissionName: p.name || p.permissionName,
          module: p.module,
          description: p.description,
        })),
        userCount: r.userCount || 0,
      })));

      setPermissions(extractData(permissionsData).map((p: any) => ({
        id: p.id || '',
        permissionCode: p.code || p.permissionCode,
        permissionName: p.name || p.permissionName,
        module: p.module,
        description: p.description,
      })));

      setConfigs(extractData(configsData).map((c: any) => ({
        id: c.configKey || c.id,
        configKey: c.configKey,
        configValue: c.configValue,
        configType: c.dataType || c.configType || 'String',
        description: c.description,
        isActive: c.isActive !== false,
      })));

      setAuditLogs(extractData(auditLogsData).map((a: any) => ({
        id: a.id,
        tableName: a.entityType || a.tableName || '',
        action: a.action,
        oldValue: a.oldValues || a.oldValue,
        newValue: a.newValues || a.newValue,
        userId: a.userId,
        username: a.username,
        userFullName: a.fullName || a.userFullName,
        createdAt: a.timestamp || a.createdAt,
      })));

      setNotifications(extractData(notificationsData).map((n: any) => ({
        id: n.id || '',
        title: n.title,
        content: n.content,
        notificationType: n.notificationType,
        targetUserId: n.targetUsers?.[0],
        targetRoleId: n.targetRoles?.[0],
        isRead: n.isRead ?? false,
        readAt: n.readAt,
        createdAt: n.createdDate || n.createdAt,
      })));

      setDepartments(extractData(departmentsData).map((d: any) => ({
        id: d.id,
        code: d.code || d.departmentCode,
        name: d.name || d.departmentName,
      })));
    } catch (error) {
      console.warn('Error fetching data:', error);
      message.error('Không thể tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  };
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<SystemConfig | null>(null);

  const [userSearchKeyword, setUserSearchKeyword] = useState('');
  const [auditEntityType, setAuditEntityType] = useState<string | undefined>();
  const [auditAction, setAuditAction] = useState<string | undefined>();
  const [auditDateRange, setAuditDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [notificationForm] = Form.useForm();

  const filteredUsers = userSearchKeyword
    ? users.filter(u => {
        const kw = userSearchKeyword.toLowerCase();
        return (u.fullName && u.fullName.toLowerCase().includes(kw)) ||
          (u.username && u.username.toLowerCase().includes(kw)) ||
          (u.email && u.email.toLowerCase().includes(kw)) ||
          (u.employeeCode && u.employeeCode.toLowerCase().includes(kw));
      })
    : users;

  const filteredAuditLogs = auditLogs.filter(log => {
    if (auditEntityType && log.tableName !== auditEntityType) return false;
    if (auditAction && log.action !== auditAction) return false;
    if (auditDateRange && auditDateRange[0] && auditDateRange[1]) {
      const logDate = dayjs(log.createdAt);
      if (logDate.isBefore(auditDateRange[0], 'day') || logDate.isAfter(auditDateRange[1], 'day')) {
        return false;
      }
    }
    return true;
  });

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
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      const values = await userForm.validateFields();
      if (selectedUser) {
        await adminApi.updateUser(selectedUser.id, {
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
      setIsUserModalOpen(false);
      userForm.resetFields();
      fetchData();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.warn('Error saving user:', error);
      message.error('Lưu người dùng thất bại!');
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
          message.error('Đặt lại mật khẩu thất bại!');
        }
      },
    });
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      message.success('Xóa người dùng thành công!');
      fetchData();
    } catch (error) {
      console.warn('Error deleting user:', error);
      message.error('Xóa người dùng thất bại!');
    }
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
      const values = await roleForm.validateFields();
      await adminApi.saveRole({
        id: selectedRole?.id,
        code: values.roleCode,
        name: values.roleName,
        description: values.description,
        isSystemRole: false,
        isActive: true,
        permissions: values.permissionIds?.map((id: string) => ({ id })),
      });
      message.success(selectedRole ? 'Cập nhật vai trò thành công!' : 'Tạo vai trò thành công!');
      setIsRoleModalOpen(false);
      roleForm.resetFields();
      fetchData();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.warn('Error saving role:', error);
      message.error('Lưu vai trò thất bại!');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await adminApi.deleteRole(roleId);
      message.success('Xóa vai trò thành công!');
      fetchData();
    } catch (error) {
      console.warn('Error deleting role:', error);
      message.error('Xóa vai trò thất bại!');
    }
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
      const values = await configForm.validateFields();
      await adminApi.saveSystemConfig({
        configKey: selectedConfig?.configKey || '',
        configValue: values.configValue,
        category: values.category || selectedConfig?.configType || 'General',
        description: values.description ?? selectedConfig?.description,
        dataType: selectedConfig?.configType || 'String',
        isEncrypted: false,
        isEditable: true,
        isActive: values.isActive !== undefined ? values.isActive : selectedConfig?.isActive !== false,
      } as any);
      message.success('Cập nhật cấu hình thành công!');
      setIsConfigModalOpen(false);
      configForm.resetFields();
      fetchData();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.warn('Error saving config:', error);
      message.error('Cập nhật cấu hình thất bại!');
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
      const values = await notificationForm.validateFields();
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
      setIsNotificationModalOpen(false);
      notificationForm.resetFields();
      fetchData();
    } catch (error: any) {
      if (error?.errorFields) return;
      console.warn('Error sending notification:', error);
      message.error('Gửi thông báo thất bại!');
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
                        onSearch={(value) => setUserSearchKeyword(value)}
                        onChange={(e) => { if (!e.target.value) setUserSearchKeyword(''); }}
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
                                {record.roles?.map((r: any) => <Tag key={r.id} color="blue">{r.name}</Tag>)}
                              </Descriptions.Item>
                              <Descriptions.Item label="Trạng thái">
                                <Tag color={record.isActive ? 'green' : 'red'}>{record.isActive ? 'Hoạt động' : 'Khóa'}</Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Đăng nhập cuối">{record.lastLogin || '-'}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
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
                    dataSource={roles}
                    rowKey="id"
                    size="small"
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng: ${total} vai trò`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiết vai trò - ${record.name}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Tên vai trò">{record.name}</Descriptions.Item>
                              <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Số người dùng">{record.userCount || 0}</Descriptions.Item>
                              <Descriptions.Item label="Quyền">
                                {record.permissions?.map((p: string) => <Tag key={p}>{p}</Tag>) || '-'}
                              </Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
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
                  dataSource={configs}
                  rowKey="id"
                  size="small"
                  loading={loading}
                  pagination={{
                    showSizeChanger: true,
                    showTotal: (total) => `Tổng: ${total} cấu hình`,
                  }}
                  onRow={(record) => ({
                    onDoubleClick: () => {
                      Modal.info({
                        title: `Chi tiết cấu hình - ${record.key}`,
                        width: 500,
                        content: (
                          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                            <Descriptions.Item label="Khóa">{record.key}</Descriptions.Item>
                            <Descriptions.Item label="Giá trị">{record.value}</Descriptions.Item>
                            <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Nhóm">{record.group || '-'}</Descriptions.Item>
                          </Descriptions>
                        ),
                      });
                    },
                    style: { cursor: 'pointer' },
                  })}
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
                      <Select placeholder="Chọn bảng" style={{ width: 200 }} allowClear onChange={(v) => setAuditEntityType(v)}>
                        <Option value="Users">Users</Option>
                        <Option value="Patients">Patients</Option>
                        <Option value="Examinations">Examinations</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select placeholder="Hành động" style={{ width: 150 }} allowClear onChange={(v) => setAuditAction(v)}>
                        <Option value="CREATE">CREATE</Option>
                        <Option value="UPDATE">UPDATE</Option>
                        <Option value="DELETE">DELETE</Option>
                      </Select>
                    </Col>
                    <Col>
                      <RangePicker
                        format="DD/MM/YYYY"
                        onChange={(dates) => setAuditDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
                      />
                    </Col>
                  </Row>

                  <Table
                    columns={auditLogColumns}
                    dataSource={filteredAuditLogs}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1200 }}
                    loading={loading}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: 'Chi tiết nhật ký',
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Thời gian">{record.timestamp}</Descriptions.Item>
                              <Descriptions.Item label="Người thực hiện">{record.userName}</Descriptions.Item>
                              <Descriptions.Item label="Hành động">{record.action}</Descriptions.Item>
                              <Descriptions.Item label="Bảng">{record.entityType}</Descriptions.Item>
                              <Descriptions.Item label="ID bản ghi">{record.entityId || '-'}</Descriptions.Item>
                              <Descriptions.Item label="IP">{record.ipAddress || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Chi tiết" span={2}>
                                <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                                  {record.changes || record.details || '-'}
                                </pre>
                              </Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
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
                              <Descriptions.Item label="Loại">{record.type}</Descriptions.Item>
                              <Descriptions.Item label="Đối tượng">{record.target || 'Tất cả'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày gửi">{record.sentDate}</Descriptions.Item>
                            </Descriptions>
                          ),
                        });
                      },
                      style: { cursor: 'pointer' },
                    })}
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
                <Select placeholder="Chọn khoa/phòng" allowClear showSearch optionFilterProp="children">
                  {departments.map((dept) => (
                    <Option key={dept.id} value={dept.id}>
                      {dept.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="roleIds" label="Vai trò" rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}>
            <Select mode="multiple" placeholder="Chọn vai trò">
              {roles.map((role) => (
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
              {permissions.map((permission) => (
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
          <Form.Item name="configKey" label="Khóa cấu hình">
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="configValue"
            label="Giá trị"
            rules={[{ required: true, message: 'Vui lòng nhập giá trị' }]}
          >
            <Input placeholder="Nhập giá trị" />
          </Form.Item>

          <Form.Item name="category" label="Danh mục">
            <Select placeholder="Chọn danh mục">
              <Option value="General">Chung</Option>
              <Option value="Security">Bảo mật</Option>
              <Option value="Email">Email</Option>
              <Option value="Integration">Tích hợp</Option>
              <Option value="Notification">Thông báo</Option>
              <Option value="Report">Báo cáo</Option>
            </Select>
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={2} placeholder="Nhập mô tả cấu hình" />
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
                  {users.map((user) => (
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
                  {roles.map((role) => (
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
