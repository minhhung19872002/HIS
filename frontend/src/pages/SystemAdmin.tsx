import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Statistic,
  Progress,
  Badge,
  Spin,
  Alert,
  Tooltip,
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
  HeartOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  CloudServerOutlined,
  ApiOutlined,
  HddOutlined,
  LockOutlined,
  AuditOutlined,
  TableOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminApi, catalogApi } from '../api/system';
import {
  getHealthDetails,
  getMetrics,
  type HealthCheckResult,
  type MetricsSnapshot,
  type ComponentHealth,
} from '../api/health';
import {
  getAuditLogs as fetchAuditLogsApi,
  type AuditLogDto as AuditLogLevel6,
  type AuditLogSearchDto as AuditLogLevel6Search,
  type AuditLogPagedResult,
} from '../api/audit';
import {
  getAccessControlMatrix,
  getSensitiveAccessReport,
  getComplianceSummary,
  type AccessControlMatrixDto,
  type SensitiveDataAccessReportDto,
  type ComplianceSummaryDto,
} from '../api/security';

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
  // Level 6 fields
  entityType?: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: string;
  module?: string;
  requestPath?: string;
  requestMethod?: string;
  responseStatusCode?: number;
  changes?: string;
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

  // Health & Monitoring state
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthLastUpdated, setHealthLastUpdated] = useState<Date | null>(null);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Access Control Matrix & Compliance state
  const [matrixData, setMatrixData] = useState<AccessControlMatrixDto[]>([]);
  const [matrixLoading, setMatrixLoading] = useState(false);
  const [complianceSummary, setComplianceSummary] = useState<ComplianceSummaryDto | null>(null);
  const [sensitiveReport, setSensitiveReport] = useState<SensitiveDataAccessReportDto[]>([]);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [sensitiveReportDateRange, setSensitiveReportDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

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

  // Health & Monitoring fetch
  const fetchHealthData = useCallback(async () => {
    setHealthLoading(true);
    try {
      const [healthRes, metricsRes] = await Promise.allSettled([
        getHealthDetails(),
        getMetrics(),
      ]);
      if (healthRes.status === 'fulfilled' && healthRes.value.data && typeof healthRes.value.data === 'object' && healthRes.value.data.status) {
        setHealthData(healthRes.value.data);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetricsData(metricsRes.value.data);
      }
      setHealthLastUpdated(new Date());
    } catch (error) {
      console.warn('Error fetching health data:', error);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Auto-refresh health data every 30s when health tab is active
  useEffect(() => {
    if (activeTab === 'health') {
      fetchHealthData();
      healthIntervalRef.current = setInterval(fetchHealthData, 30000);
    }
    return () => {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    };
  }, [activeTab, fetchHealthData]);

  // Fetch access control matrix
  const fetchMatrixData = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const res = await getAccessControlMatrix();
      const data = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
      setMatrixData(data);
    } catch (error) {
      console.warn('Error fetching access control matrix:', error);
    } finally {
      setMatrixLoading(false);
    }
  }, []);

  // Fetch compliance summary + sensitive access report
  const fetchComplianceData = useCallback(async () => {
    setComplianceLoading(true);
    try {
      const [summaryRes, reportRes] = await Promise.allSettled([
        getComplianceSummary(),
        getSensitiveAccessReport(
          sensitiveReportDateRange[0].format('YYYY-MM-DD'),
          sensitiveReportDateRange[1].format('YYYY-MM-DD'),
          50
        ),
      ]);
      if (summaryRes.status === 'fulfilled') {
        const d = summaryRes.value.data;
        setComplianceSummary((d as any)?.data || d);
      }
      if (reportRes.status === 'fulfilled') {
        const d = reportRes.value.data;
        setSensitiveReport(Array.isArray(d) ? d : (d as any)?.data || []);
      }
    } catch (error) {
      console.warn('Error fetching compliance data:', error);
    } finally {
      setComplianceLoading(false);
    }
  }, [sensitiveReportDateRange]);

  // Auto-load matrix data when tab is active
  useEffect(() => {
    if (activeTab === 'access-matrix') {
      fetchMatrixData();
    }
  }, [activeTab, fetchMatrixData]);

  // Auto-load compliance data when tab is active
  useEffect(() => {
    if (activeTab === 'compliance') {
      fetchComplianceData();
    }
  }, [activeTab, fetchComplianceData]);

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
  const [auditModule, setAuditModule] = useState<string | undefined>();
  const [auditKeyword, setAuditKeyword] = useState<string>('');
  const [auditLogsLevel6, setAuditLogsLevel6] = useState<AuditLogLevel6[]>([]);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditPageIndex, setAuditPageIndex] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(50);
  const [auditLoading, setAuditLoading] = useState(false);

  const [userForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [configForm] = Form.useForm();
  const [notificationForm] = Form.useForm();

  // Fetch audit logs from Level 6 API
  const fetchAuditLogsLevel6 = useCallback(async (pageIdx?: number) => {
    setAuditLoading(true);
    try {
      const params: AuditLogLevel6Search = {
        pageIndex: pageIdx ?? auditPageIndex,
        pageSize: auditPageSize,
      };
      if (auditAction) params.action = auditAction;
      if (auditEntityType) params.entityType = auditEntityType;
      if (auditModule) params.module = auditModule;
      if (auditKeyword) params.keyword = auditKeyword;
      if (auditDateRange?.[0]) params.fromDate = auditDateRange[0].format('YYYY-MM-DD');
      if (auditDateRange?.[1]) params.toDate = auditDateRange[1].format('YYYY-MM-DD');

      const res = await fetchAuditLogsApi(params);
      const data = res.data as AuditLogPagedResult;
      if (data && Array.isArray(data.items)) {
        setAuditLogsLevel6(data.items);
        setAuditTotalCount(data.totalCount);
      } else if (Array.isArray(res.data)) {
        setAuditLogsLevel6(res.data as unknown as AuditLogLevel6[]);
        setAuditTotalCount((res.data as unknown as AuditLogLevel6[]).length);
      }
    } catch (error) {
      console.warn('Error fetching audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  }, [auditPageIndex, auditPageSize, auditAction, auditEntityType, auditModule, auditKeyword, auditDateRange]);

  // Fetch audit logs when tab becomes active or filters change
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogsLevel6();
    }
  }, [activeTab, fetchAuditLogsLevel6]);

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
                              <Descriptions.Item label="Đăng nhập cuối">{record.lastLoginAt || '-'}</Descriptions.Item>
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
                          title: `Chi tiết vai trò - ${record.roleName}`,
                          width: 500,
                          content: (
                            <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Tên vai trò">{record.roleName}</Descriptions.Item>
                              <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Số người dùng">{record.userCount || 0}</Descriptions.Item>
                              <Descriptions.Item label="Quyền">
                                {record.permissions?.map((p) => <Tag key={p.id}>{p.permissionName}</Tag>) || '-'}
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
                        title: `Chi tiết cấu hình - ${record.configKey}`,
                        width: 500,
                        content: (
                          <Descriptions bordered size="small" column={1} style={{ marginTop: 16 }}>
                            <Descriptions.Item label="Khóa">{record.configKey}</Descriptions.Item>
                            <Descriptions.Item label="Giá trị">{record.configValue}</Descriptions.Item>
                            <Descriptions.Item label="Mô tả">{record.description || '-'}</Descriptions.Item>
                            <Descriptions.Item label="Nhóm">{record.configType || '-'}</Descriptions.Item>
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
                  <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select placeholder="Phân hệ" style={{ width: 160 }} allowClear onChange={(v) => { setAuditModule(v); setAuditPageIndex(0); }}>
                        <Option value="Reception">Tiếp đón</Option>
                        <Option value="OPD">Khám bệnh</Option>
                        <Option value="Inpatient">Nội trú</Option>
                        <Option value="Pharmacy">Nhà thuốc</Option>
                        <Option value="Warehouse">Kho dược</Option>
                        <Option value="Billing">Thu ngân</Option>
                        <Option value="Laboratory">Xét nghiệm</Option>
                        <Option value="Radiology">CĐHA</Option>
                        <Option value="EMR">Hồ sơ BA</Option>
                        <Option value="Prescription">Kê đơn</Option>
                        <Option value="Surgery">Phẫu thuật</Option>
                        <Option value="BloodBank">Ngân hàng máu</Option>
                        <Option value="SystemAdmin">Quản trị</Option>
                        <Option value="Auth">Đăng nhập</Option>
                        <Option value="MasterData">Danh mục</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select placeholder="Đối tượng" style={{ width: 160 }} allowClear onChange={(v) => { setAuditEntityType(v); setAuditPageIndex(0); }}>
                        <Option value="patients">Bệnh nhân</Option>
                        <Option value="examination">Lượt khám</Option>
                        <Option value="prescription">Đơn thuốc</Option>
                        <Option value="inpatient">Nội trú</Option>
                        <Option value="billing">Viện phí</Option>
                        <Option value="admin">Quản trị</Option>
                        <Option value="auth">Xác thực</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select placeholder="Hành động" style={{ width: 130 }} allowClear onChange={(v) => { setAuditAction(v); setAuditPageIndex(0); }}>
                        <Option value="Create">Tạo mới</Option>
                        <Option value="Update">Cập nhật</Option>
                        <Option value="Delete">Xóa</Option>
                        <Option value="Print">In</Option>
                        <Option value="Export">Xuất</Option>
                        <Option value="Auth">Đăng nhập</Option>
                        <Option value="Approve">Duyệt</Option>
                        <Option value="Cancel">Hủy</Option>
                      </Select>
                    </Col>
                    <Col>
                      <RangePicker
                        format="DD/MM/YYYY"
                        onChange={(dates) => { setAuditDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null); setAuditPageIndex(0); }}
                      />
                    </Col>
                    <Col>
                      <Search
                        placeholder="Tìm theo tên, IP, đường dẫn..."
                        allowClear
                        style={{ width: 250 }}
                        enterButton={<SearchOutlined />}
                        onSearch={(v) => { setAuditKeyword(v); setAuditPageIndex(0); }}
                      />
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={() => fetchAuditLogsLevel6()}>Làm mới</Button>
                    </Col>
                  </Row>

                  <Table
                    columns={[
                      {
                        title: 'Thời gian',
                        dataIndex: 'timestamp',
                        key: 'timestamp',
                        width: 160,
                        render: (ts: string) => ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : '-',
                      },
                      {
                        title: 'Người dùng',
                        key: 'user',
                        width: 180,
                        render: (_: unknown, record: AuditLogLevel6) => (
                          <>
                            <div>{record.userFullName || record.userName || '-'}</div>
                            {record.userName && (
                              <div style={{ fontSize: 11, color: '#888' }}>@{record.userName}</div>
                            )}
                          </>
                        ),
                      },
                      {
                        title: 'Phân hệ',
                        dataIndex: 'module',
                        key: 'module',
                        width: 110,
                        render: (mod: string) => mod ? <Tag color="blue">{mod}</Tag> : '-',
                      },
                      {
                        title: 'Hành động',
                        dataIndex: 'action',
                        key: 'action',
                        width: 100,
                        render: (action: string) => {
                          const colorMap: Record<string, string> = {
                            Create: 'green', Update: 'orange', Delete: 'red',
                            Print: 'purple', Export: 'cyan', Auth: 'geekblue',
                            Approve: 'lime', Cancel: 'volcano',
                          };
                          return <Tag color={colorMap[action] || 'default'}>{action}</Tag>;
                        },
                      },
                      {
                        title: 'Đối tượng',
                        dataIndex: 'entityType',
                        key: 'entityType',
                        width: 120,
                      },
                      {
                        title: 'Đường dẫn',
                        dataIndex: 'requestPath',
                        key: 'requestPath',
                        width: 250,
                        ellipsis: true,
                        render: (path: string, record: AuditLogLevel6) => (
                          <Tooltip title={path}>
                            <Tag color={record.requestMethod === 'DELETE' ? 'red' : record.requestMethod === 'PUT' ? 'orange' : 'blue'} style={{ marginRight: 4 }}>
                              {record.requestMethod}
                            </Tag>
                            <span style={{ fontSize: 12 }}>{path}</span>
                          </Tooltip>
                        ),
                      },
                      {
                        title: 'Status',
                        dataIndex: 'responseStatusCode',
                        key: 'responseStatusCode',
                        width: 70,
                        align: 'center' as const,
                        render: (code: number) => {
                          if (!code) return '-';
                          const color = code < 300 ? 'green' : code < 400 ? 'blue' : code < 500 ? 'orange' : 'red';
                          return <Tag color={color}>{code}</Tag>;
                        },
                      },
                      {
                        title: 'IP',
                        dataIndex: 'ipAddress',
                        key: 'ipAddress',
                        width: 120,
                        ellipsis: true,
                      },
                    ] as ColumnsType<AuditLogLevel6>}
                    dataSource={auditLogsLevel6}
                    rowKey="id"
                    size="small"
                    scroll={{ x: 1400 }}
                    loading={auditLoading}
                    pagination={{
                      current: auditPageIndex + 1,
                      pageSize: auditPageSize,
                      total: auditTotalCount,
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tổng: ${total} bản ghi`,
                      onChange: (page, size) => {
                        setAuditPageIndex(page - 1);
                        setAuditPageSize(size);
                      },
                    }}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: 'Chi tiết nhật ký kiểm toán',
                          width: 700,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Thời gian">{record.timestamp ? dayjs(record.timestamp).format('DD/MM/YYYY HH:mm:ss') : '-'}</Descriptions.Item>
                              <Descriptions.Item label="Người thực hiện">{record.userFullName || record.userName || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Phân hệ">{record.module || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Hành động">{record.action}</Descriptions.Item>
                              <Descriptions.Item label="Đối tượng">{record.entityType || '-'}</Descriptions.Item>
                              <Descriptions.Item label="ID bản ghi">{record.entityId || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Phương thức">{record.requestMethod || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Mã trạng thái">{record.responseStatusCode || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Đường dẫn" span={2}>{record.requestPath || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Địa chỉ IP">{record.ipAddress || '-'}</Descriptions.Item>
                              <Descriptions.Item label="User Agent">{record.userAgent || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Chi tiết" span={2}>
                                <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                                  {record.details || '-'}
                                </pre>
                              </Descriptions.Item>
                              {(record.oldValues || record.newValues) && (
                                <>
                                  <Descriptions.Item label="Giá trị cũ" span={2}>
                                    <pre style={{ maxHeight: 150, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                                      {record.oldValues || '-'}
                                    </pre>
                                  </Descriptions.Item>
                                  <Descriptions.Item label="Giá trị mới" span={2}>
                                    <pre style={{ maxHeight: 150, overflow: 'auto', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
                                      {record.newValues || '-'}
                                    </pre>
                                  </Descriptions.Item>
                                </>
                              )}
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
                              <Descriptions.Item label="Loại">{record.notificationType}</Descriptions.Item>
                              <Descriptions.Item label="Đối tượng">{record.targetUserId || record.targetRoleId || 'Tất cả'}</Descriptions.Item>
                              <Descriptions.Item label="Ngày gửi">{record.createdAt}</Descriptions.Item>
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
              key: 'health',
              label: (
                <span>
                  <HeartOutlined /> Giám sát hệ thống
                </span>
              ),
              children: (
                <Spin spinning={healthLoading}>
                  {/* Header with refresh controls */}
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      {healthData && (
                        <Space>
                          <Badge
                            status={healthData.status === 'Healthy' ? 'success' : healthData.status === 'Degraded' ? 'warning' : 'error'}
                            text={
                              <Typography.Text strong style={{ fontSize: 16 }}>
                                {healthData.status === 'Healthy' ? 'Hệ thống hoạt động bình thường' :
                                 healthData.status === 'Degraded' ? 'Hệ thống hoạt động hạn chế' :
                                 'Hệ thống gặp sự cố'}
                              </Typography.Text>
                            }
                          />
                          <Tag color={healthData.status === 'Healthy' ? 'green' : healthData.status === 'Degraded' ? 'orange' : 'red'}>
                            {healthData.status}
                          </Tag>
                        </Space>
                      )}
                    </Col>
                    <Col>
                      <Space>
                        {healthLastUpdated && (
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            <ClockCircleOutlined /> Cập nhật: {dayjs(healthLastUpdated).format('HH:mm:ss')}
                          </Typography.Text>
                        )}
                        <Tooltip title="Tự động làm mới mỗi 30 giây">
                          <Button icon={<ReloadOutlined />} onClick={fetchHealthData} loading={healthLoading}>
                            Làm mới
                          </Button>
                        </Tooltip>
                      </Space>
                    </Col>
                  </Row>

                  {!healthData && !healthLoading && (
                    <Alert title="Không thể kết nối đến máy chủ" type="warning" showIcon
                      description={`Vui lòng kiểm tra backend API đang chạy tại ${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5106'}`}
                    />
                  )}

                  {healthData && (
                    <>
                      {/* Overview metrics row */}
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic title="Phiên bản" value={healthData.version} prefix={<ApiOutlined />} />
                          </Card>
                        </Col>
                        <Col xs={12} sm={6}>
                          <Card size="small">
                            <Statistic title="Uptime" value={healthData.uptime} prefix={<ClockCircleOutlined />} />
                          </Card>
                        </Col>
                        {metricsData && (
                          <>
                            <Col xs={12} sm={6}>
                              <Card size="small">
                                <Statistic title="Tổng requests" value={metricsData.totalRequests} />
                              </Card>
                            </Col>
                            <Col xs={12} sm={6}>
                              <Card size="small">
                                <Statistic
                                  title="Requests/phút"
                                  value={metricsData.requestsPerMinute}
                                  precision={1}
                                />
                              </Card>
                            </Col>
                          </>
                        )}
                      </Row>

                      {metricsData && (
                        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic
                                title="Active requests"
                                value={metricsData.activeRequests}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic
                                title="Thời gian phản hồi TB"
                                value={metricsData.averageResponseTimeMs}
                                precision={1}
                                suffix="ms"
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic
                                title="Lỗi"
                                value={metricsData.errorCount}
                                styles={{ content: { color: metricsData.errorCount > 0 ? '#cf1322' : '#3f8600' } }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={6}>
                            <Card size="small">
                              <Statistic
                                title="Tỷ lệ lỗi"
                                value={metricsData.errorRate}
                                precision={2}
                                suffix="%"
                                styles={{ content: { color: metricsData.errorRate > 5 ? '#cf1322' : '#3f8600' } }}
                              />
                            </Card>
                          </Col>
                        </Row>
                      )}

                      {/* Component health cards */}
                      <Typography.Title level={5} style={{ marginBottom: 16 }}>
                        Trạng thái thành phần
                      </Typography.Title>
                      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                        {(healthData.checks ? Object.entries(healthData.checks) : []).map(([key, check]: [string, ComponentHealth]) => {
                          const labels: Record<string, { name: string; icon: React.ReactNode }> = {
                            sqlServer: { name: 'SQL Server', icon: <DatabaseOutlined /> },
                            redis: { name: 'Redis Cache', icon: <CloudServerOutlined /> },
                            orthancPacs: { name: 'Orthanc PACS', icon: <HddOutlined /> },
                            hl7Listener: { name: 'HL7 Listener', icon: <ApiOutlined /> },
                            diskSpace: { name: 'Ổ đĩa', icon: <HddOutlined /> },
                            memory: { name: 'Bộ nhớ', icon: <CloudServerOutlined /> },
                          };
                          const label = labels[key] || { name: key, icon: <SettingOutlined /> };
                          const statusColor = check.status === 'Healthy' ? '#52c41a' : check.status === 'Degraded' ? '#faad14' : '#ff4d4f';
                          const statusIcon = check.status === 'Healthy' ? <CheckCircleOutlined style={{ color: statusColor }} /> :
                            check.status === 'Degraded' ? <WarningOutlined style={{ color: statusColor }} /> :
                            <CloseCircleOutlined style={{ color: statusColor }} />;

                          return (
                            <Col xs={24} sm={12} md={8} key={key}>
                              <Card
                                size="small"
                                title={
                                  <Space>
                                    {label.icon}
                                    {label.name}
                                    {statusIcon}
                                  </Space>
                                }
                                style={{ borderLeft: `3px solid ${statusColor}` }}
                              >
                                <Row gutter={8}>
                                  <Col span={12}>
                                    <Typography.Text type="secondary">Trạng thái</Typography.Text>
                                    <div>
                                      <Tag color={check.status === 'Healthy' ? 'green' : check.status === 'Degraded' ? 'orange' : 'red'}>
                                        {check.status}
                                      </Tag>
                                    </div>
                                  </Col>
                                  {check.responseTime && (
                                    <Col span={12}>
                                      <Typography.Text type="secondary">Phản hồi</Typography.Text>
                                      <div><Typography.Text strong>{check.responseTime}</Typography.Text></div>
                                    </Col>
                                  )}
                                </Row>
                                {check.error && (
                                  <div style={{ marginTop: 8 }}>
                                    <Typography.Text type="danger" style={{ fontSize: 12 }}>{check.error}</Typography.Text>
                                  </div>
                                )}
                                {key === 'diskSpace' && check.freeGb !== undefined && (
                                  <div style={{ marginTop: 8 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      Trống: {check.freeGb} GB / {check.totalGb} GB
                                    </Typography.Text>
                                    <Progress
                                      percent={check.usagePercent || 0}
                                      size="small"
                                      status={check.status === 'Healthy' ? 'normal' : 'exception'}
                                    />
                                  </div>
                                )}
                                {key === 'memory' && check.usedMb !== undefined && (
                                  <div style={{ marginTop: 8 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      Sử dụng: {check.usedMb} MB / {check.totalMb} MB
                                    </Typography.Text>
                                    <Progress
                                      percent={check.usagePercent || 0}
                                      size="small"
                                      status={check.status === 'Healthy' ? 'normal' : 'exception'}
                                    />
                                  </div>
                                )}
                                {key === 'hl7Listener' && check.port && (
                                  <div style={{ marginTop: 8 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      Port: {check.port}
                                    </Typography.Text>
                                  </div>
                                )}
                              </Card>
                            </Col>
                          );
                        })}
                      </Row>

                      {/* Metrics details */}
                      {metricsData && (
                        <>
                          {/* Status code distribution */}
                          {Object.keys(metricsData.statusCodeDistribution).length > 0 && (
                            <>
                              <Typography.Title level={5} style={{ marginBottom: 16 }}>
                                Phân bố mã trạng thái HTTP
                              </Typography.Title>
                              <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                                {Object.entries(metricsData.statusCodeDistribution).map(([code, count]) => {
                                  const numCode = parseInt(code);
                                  const color = numCode < 300 ? '#52c41a' : numCode < 400 ? '#1890ff' : numCode < 500 ? '#faad14' : '#ff4d4f';
                                  return (
                                    <Col xs={8} sm={4} key={code}>
                                      <Card size="small">
                                        <Statistic
                                          title={`HTTP ${code}`}
                                          value={count}
                                          styles={{ content: { color, fontSize: 20 } }}
                                        />
                                      </Card>
                                    </Col>
                                  );
                                })}
                              </Row>
                            </>
                          )}

                          {/* Top endpoints */}
                          {Object.keys(metricsData.topEndpoints).length > 0 && (
                            <>
                              <Typography.Title level={5} style={{ marginBottom: 16 }}>
                                Endpoint phổ biến
                              </Typography.Title>
                              <Table
                                dataSource={Object.entries(metricsData.topEndpoints).map(([path, count]) => ({
                                  key: path,
                                  path,
                                  count,
                                }))}
                                columns={[
                                  {
                                    title: 'Endpoint',
                                    dataIndex: 'path',
                                    key: 'path',
                                  },
                                  {
                                    title: 'Số lượng',
                                    dataIndex: 'count',
                                    key: 'count',
                                    width: 120,
                                    align: 'right' as const,
                                    sorter: (a: { count: number }, b: { count: number }) => a.count - b.count,
                                    defaultSortOrder: 'descend' as const,
                                  },
                                ]}
                                size="small"
                                pagination={false}
                              />
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </Spin>
              ),
            },
            {
              key: 'access-matrix',
              label: (
                <span>
                  <TableOutlined /> Ma tran quyen
                </span>
              ),
              children: (
                <Spin spinning={matrixLoading}>
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        <LockOutlined /> Ma tran kiem soat truy cap
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                          Xuat bao cao
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchMatrixData}>
                          Lam moi
                        </Button>
                      </Space>
                    </Col>
                  </Row>

                  <Table
                    dataSource={matrixData}
                    rowKey="roleCode"
                    size="small"
                    scroll={{ x: 1200 }}
                    pagination={false}
                    expandable={{
                      expandedRowRender: (record: AccessControlMatrixDto) => (
                        <div style={{ padding: '8px 16px' }}>
                          {record.modulePermissions?.map((mp) => (
                            <div key={mp.module} style={{ marginBottom: 12 }}>
                              <Typography.Text strong>{mp.module}</Typography.Text>
                              <div style={{ marginTop: 4 }}>
                                {mp.permissions?.map((p) => (
                                  <Tag key={p.permissionCode} color="blue" style={{ marginBottom: 4 }}>
                                    {p.permissionName}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                          ))}
                          {(!record.modulePermissions || record.modulePermissions.length === 0) && (
                            <Typography.Text type="secondary">Khong co quyen nao</Typography.Text>
                          )}
                        </div>
                      ),
                    }}
                    columns={[
                      {
                        title: 'Ma vai tro',
                        dataIndex: 'roleCode',
                        key: 'roleCode',
                        width: 130,
                        render: (code: string) => {
                          const color = code === 'ADMIN' ? 'blue' :
                            ['DOCTOR', 'NURSE', 'PHARMACIST', 'LAB_TECH'].includes(code) ? 'green' : 'default';
                          return <Tag color={color}>{code}</Tag>;
                        },
                      },
                      {
                        title: 'Ten vai tro',
                        dataIndex: 'roleName',
                        key: 'roleName',
                        width: 180,
                      },
                      {
                        title: 'So nguoi dung',
                        dataIndex: 'userCount',
                        key: 'userCount',
                        width: 130,
                        align: 'center' as const,
                        render: (count: number) => <Badge count={count} showZero overflowCount={9999} style={{ backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9' }} />,
                      },
                      {
                        title: 'So module',
                        key: 'moduleCount',
                        width: 120,
                        align: 'center' as const,
                        render: (_: unknown, record: AccessControlMatrixDto) => record.modulePermissions?.length || 0,
                      },
                      {
                        title: 'Tong quyen',
                        key: 'totalPermissions',
                        width: 120,
                        align: 'center' as const,
                        render: (_: unknown, record: AccessControlMatrixDto) =>
                          record.modulePermissions?.reduce((sum, mp) => sum + (mp.permissions?.length || 0), 0) || 0,
                      },
                      {
                        title: 'Mo ta',
                        dataIndex: 'description',
                        key: 'description',
                        ellipsis: true,
                      },
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'compliance',
              label: (
                <span>
                  <AuditOutlined /> Tuan thu
                </span>
              ),
              children: (
                <Spin spinning={complianceLoading}>
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        <SafetyOutlined /> Dashboard tuan thu bao mat
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={fetchComplianceData}>
                        Lam moi
                      </Button>
                    </Col>
                  </Row>

                  {/* Compliance Summary Cards */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Tong nguoi dung"
                          value={complianceSummary?.totalUsers ?? 0}
                          prefix={<UserOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Nguoi dung hoat dong"
                          value={complianceSummary?.activeUsers ?? 0}
                          prefix={<CheckCircleOutlined />}
                          styles={{ content: { color: '#3f8600' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="2FA da bat"
                          value={complianceSummary?.totalUsers ? Math.round((complianceSummary.usersWithTwoFactor / complianceSummary.totalUsers) * 100) : 0}
                          suffix="%"
                          prefix={<LockOutlined />}
                          styles={{ content: { color: (complianceSummary?.usersWithTwoFactor ?? 0) > 0 ? '#3f8600' : '#cf1322' } }}
                        />
                        <div style={{ fontSize: 11, color: '#888' }}>
                          {complianceSummary?.usersWithTwoFactor ?? 0} / {complianceSummary?.totalUsers ?? 0} nguoi dung
                        </div>
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="TDE (Ma hoa du lieu)"
                          value={complianceSummary?.tdeEnabled ? 'BAT' : 'TAT'}
                          prefix={complianceSummary?.tdeEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          styles={{ content: { color: complianceSummary?.tdeEnabled ? '#3f8600' : '#cf1322' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Ma hoa cot"
                          value={complianceSummary?.columnEncryptionEnabled ? 'BAT' : 'TAT'}
                          prefix={complianceSummary?.columnEncryptionEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          styles={{ content: { color: complianceSummary?.columnEncryptionEnabled ? '#3f8600' : '#cf1322' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Sao luu gan nhat"
                          value={complianceSummary?.lastBackupDate ? dayjs(complianceSummary.lastBackupDate).format('DD/MM HH:mm') : 'Chua co'}
                          prefix={(() => {
                            if (!complianceSummary?.lastBackupDate) return <WarningOutlined style={{ color: '#ff4d4f' }} />;
                            const hoursAgo = dayjs().diff(dayjs(complianceSummary.lastBackupDate), 'hour');
                            return hoursAgo > 24 ? <WarningOutlined style={{ color: '#faad14' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />;
                          })()}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Nhat ky (30 ngay)"
                          value={complianceSummary?.auditLogsLast30Days ?? 0}
                          prefix={<FileTextOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Truy cap nhay cam (30 ngay)"
                          value={complianceSummary?.sensitiveAccessLast30Days ?? 0}
                          prefix={<WarningOutlined />}
                          styles={{ content: { color: (complianceSummary?.sensitiveAccessLast30Days ?? 0) > 100 ? '#cf1322' : '#3f8600' } }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Sensitive Data Access Report */}
                  <Typography.Title level={5} style={{ marginBottom: 16 }}>
                    Bao cao truy cap du lieu nhay cam
                  </Typography.Title>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col>
                      <RangePicker
                        format="DD/MM/YYYY"
                        value={sensitiveReportDateRange}
                        onChange={(dates) => {
                          if (dates && dates[0] && dates[1]) {
                            setSensitiveReportDateRange([dates[0], dates[1]]);
                          }
                        }}
                      />
                    </Col>
                    <Col>
                      <Button icon={<SearchOutlined />} onClick={fetchComplianceData}>
                        Tim kiem
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    dataSource={sensitiveReport}
                    rowKey="userId"
                    size="small"
                    scroll={{ x: 800 }}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tong: ${total} nguoi dung`,
                    }}
                    expandable={{
                      expandedRowRender: (record: SensitiveDataAccessReportDto) => (
                        <Table
                          dataSource={record.recentAccesses}
                          rowKey={(item) => `${item.timestamp}-${item.entityId}`}
                          size="small"
                          pagination={false}
                          columns={[
                            {
                              title: 'Thoi gian',
                              dataIndex: 'timestamp',
                              key: 'timestamp',
                              width: 160,
                              render: (ts: string) => ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : '-',
                            },
                            {
                              title: 'Doi tuong',
                              dataIndex: 'entityType',
                              key: 'entityType',
                              width: 120,
                            },
                            {
                              title: 'ID',
                              dataIndex: 'entityId',
                              key: 'entityId',
                              width: 250,
                              ellipsis: true,
                            },
                            {
                              title: 'Duong dan',
                              dataIndex: 'requestPath',
                              key: 'requestPath',
                              ellipsis: true,
                            },
                            {
                              title: 'Phan he',
                              dataIndex: 'module',
                              key: 'module',
                              width: 110,
                              render: (mod: string) => mod ? <Tag color="blue">{mod}</Tag> : '-',
                            },
                          ]}
                        />
                      ),
                    }}
                    columns={[
                      {
                        title: 'Nguoi dung',
                        key: 'user',
                        width: 200,
                        render: (_: unknown, record: SensitiveDataAccessReportDto) => (
                          <>
                            <div>{record.userFullName || record.userName}</div>
                            {record.userName && (
                              <div style={{ fontSize: 11, color: '#888' }}>@{record.userName}</div>
                            )}
                          </>
                        ),
                      },
                      {
                        title: 'Tong truy cap',
                        dataIndex: 'totalAccesses',
                        key: 'totalAccesses',
                        width: 130,
                        align: 'center' as const,
                        sorter: (a: SensitiveDataAccessReportDto, b: SensitiveDataAccessReportDto) => a.totalAccesses - b.totalAccesses,
                        defaultSortOrder: 'descend' as const,
                        render: (count: number) => (
                          <Tag color={count > 50 ? 'red' : count > 20 ? 'orange' : 'green'}>{count}</Tag>
                        ),
                      },
                      {
                        title: 'Truy cap gan nhat',
                        key: 'mostRecent',
                        width: 160,
                        render: (_: unknown, record: SensitiveDataAccessReportDto) => {
                          const recent = record.recentAccesses?.[0];
                          return recent ? dayjs(recent.timestamp).format('DD/MM/YYYY HH:mm') : '-';
                        },
                      },
                      {
                        title: 'Doi tuong chinh',
                        key: 'mainEntityType',
                        render: (_: unknown, record: SensitiveDataAccessReportDto) => {
                          const types = [...new Set(record.recentAccesses?.map((a) => a.entityType) || [])];
                          return types.map((t) => <Tag key={t}>{t}</Tag>);
                        },
                      },
                    ]}
                  />
                </Spin>
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
