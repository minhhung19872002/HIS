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
  InputNumber,
  Popconfirm,
  Descriptions,
  Statistic,
  Spin,
  Alert,
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
  DatabaseOutlined,
  ApiOutlined,
  LockOutlined,
  AuditOutlined,
  TableOutlined,
  MobileOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  FolderOutlined,
  ToolOutlined,
  LaptopOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import BranchesTab from './system-admin/BranchesTab';
import { getNestedData, isFormValidationError } from './system-admin/helpers';
import ItTicketsTab from './system-admin/ItTicketsTab';
import NotificationsTab, { type NotificationItem } from './system-admin/NotificationsTab';
import ConfigsTab, { type SystemConfig } from './system-admin/ConfigsTab';
import RolesTab, { type Role, type Permission } from './system-admin/RolesTab';
import UsersTab, { type User, type DepartmentOption } from './system-admin/UsersTab';
import SessionsTab from './system-admin/SessionsTab';
import LockedServicesTab from './system-admin/LockedServicesTab';
import IntegrationTab from './system-admin/IntegrationTab';
import HealthTab from './system-admin/HealthTab';
import AccessMatrixTab from './system-admin/AccessMatrixTab';
import ComplianceTab from './system-admin/ComplianceTab';
import DataManagementTab from './system-admin/DataManagementTab';
import BackupTab from './system-admin/BackupTab';
import AuditTab from './system-admin/AuditTab';
import { useEmrAdminTabs } from './system-admin/EmrAdminTabs';
import { adminApi, catalogApi, type UserSessionDto } from '../api/system';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

// Branch + ApiErrorLike đã move sang pages/system-admin/types.ts (K1 refactor)

// User Management Interfaces (mapped from API DTOs)
// User interface → moved to pages/system-admin/UsersTab.tsx (K1 phiên 5d)

// Role + Permission interface → moved to pages/system-admin/RolesTab.tsx (K1 phiên 5c)
// SystemConfig interface → moved to pages/system-admin/ConfigsTab.tsx (K1 phiên 5b)

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

// NotificationItem interface → moved to pages/system-admin/NotificationsTab.tsx (K1 phiên 5a)

// DepartmentOption interface → moved to pages/system-admin/UsersTab.tsx (K1 phiên 5d)

type RawApiItem = Record<string, unknown>;
type RawApiResponse = {
  data?: unknown;
};
// FormValidationError + isFormValidationError → moved to pages/system-admin/helpers.ts (K1 phiên 5a, DRY 4 tab + EmrAdminTabs)
type ServiceSearchItem = {
  id: string;
  code: string;
  name: string;
  serviceType: number;
};
// ItTicketListItem đã move sang pages/system-admin/ItTicketsTab.tsx (K1 refactor)
type LockedServiceItem = Record<string, unknown>;

const toRawItems = (value: unknown): RawApiItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RawApiItem => typeof item === 'object' && item !== null);
};

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const toOptionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : toStringValue(value);

const toBooleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toNumberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

// getNestedData đã move sang pages/system-admin/helpers.ts (DRY — 3+ chỗ dùng)

const SystemAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [activeTab, setActiveTab] = useState('users');

  // Health & Monitoring state + handlers → moved to pages/system-admin/HealthTab.tsx (K1 refactor)

  // Workstation Session state + fetch + interval → moved to pages/system-admin/SessionsTab.tsx (K1 phiên 6a)
  // Pattern `active` prop preserve pause-on-leave behavior (Antd Tabs giữ mount default).

  // AccessMatrix + Compliance state + handlers → moved to pages/system-admin/{AccessMatrixTab,ComplianceTab}.tsx (K1)

  // DataManagement state → moved to pages/system-admin/DataManagementTab.tsx (K1 phiên 3)

  // EMR Admin state + handlers + modal → moved to pages/system-admin/EmrAdminTabs.tsx (K1 phiên 4)
  const { items: emrTabItems } = useEmrAdminTabs();

  // Branches tab state + handlers → moved to pages/system-admin/BranchesTab.tsx (K1 refactor)
  // Backup state + handlers → moved to pages/system-admin/BackupTab.tsx (K1 phiên 3)

  // Helper to extract array data from API response (handles both direct array and { data: [...] } wrapper)
  const extractData = (response: RawApiResponse): RawApiItem[] => {
    const d = response?.data;
    if (Array.isArray(d)) return toRawItems(d);
    if (typeof d === 'object' && d !== null) {
      const wrappedData = (d as { data?: unknown }).data;
      if (Array.isArray(wrappedData)) return toRawItems(wrappedData);
      const wrappedItems = (d as { items?: unknown }).items;
      if (Array.isArray(wrappedItems)) return toRawItems(wrappedItems);
    }
    return [];
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, permissionsData, configsData, notificationsData, departmentsData] = await Promise.all([
        adminApi.getUsers().catch(() => ({ data: [] })),
        adminApi.getRoles().catch(() => ({ data: [] })),
        adminApi.getPermissions().catch(() => ({ data: [] })),
        adminApi.getSystemConfigs().catch(() => ({ data: [] })),
        adminApi.getSystemNotifications().catch(() => ({ data: [] })),
        catalogApi.getDepartments().catch(() => ({ data: [] })),
      ]);

      // Map API DTOs to local interfaces
      setUsers(extractData(usersData).map((u) => ({
        id: toStringValue(u.id),
        username: toStringValue(u.username),
        fullName: toStringValue(u.fullName),
        email: toOptionalString(u.email),
        phoneNumber: toOptionalString(u.phoneNumber),
        employeeCode: toOptionalString(u.employeeCode ?? u.employeeId),
        title: toOptionalString(u.title),
        departmentId: toOptionalString(u.departmentId),
        departmentName: toOptionalString(u.departmentName),
        isActive: toBooleanValue(u.isActive, true),
        lastLoginAt: toOptionalString(u.lastLoginDate),
        roles: toRawItems(u.roles).map((r) => ({
          id: toStringValue(r.id),
          roleCode: toStringValue(r.code ?? r.roleCode),
          roleName: toStringValue(r.name ?? r.roleName),
          description: toOptionalString(r.description),
          permissions: [],
          userCount: toNumberValue(r.userCount),
        })),
        createdAt: toStringValue(u.createdDate),
      })));

      setRoles(extractData(rolesData).map((r) => ({
        id: toStringValue(r.id),
        roleCode: toStringValue(r.code ?? r.roleCode),
        roleName: toStringValue(r.name ?? r.roleName),
        description: toOptionalString(r.description),
        permissions: toRawItems(r.permissions).map((p) => ({
          id: toStringValue(p.id),
          permissionCode: toStringValue(p.code ?? p.permissionCode),
          permissionName: toStringValue(p.name ?? p.permissionName),
          module: toOptionalString(p.module),
          description: toOptionalString(p.description),
        })),
        userCount: toNumberValue(r.userCount),
      })));

      setPermissions(extractData(permissionsData).map((p) => ({
        id: toStringValue(p.id),
        permissionCode: toStringValue(p.code ?? p.permissionCode),
        permissionName: toStringValue(p.name ?? p.permissionName),
        module: toOptionalString(p.module),
        description: toOptionalString(p.description),
      })));

      setConfigs(extractData(configsData).map((c) => ({
        id: toStringValue(c.configKey ?? c.id),
        configKey: toStringValue(c.configKey),
        configValue: toStringValue(c.configValue),
        configType: toStringValue(c.dataType ?? c.configType, 'String'),
        description: toOptionalString(c.description),
        isActive: c.isActive !== false,
      })));

      setNotifications(extractData(notificationsData).map((n) => ({
        id: toStringValue(n.id),
        title: toStringValue(n.title),
        content: toStringValue(n.content),
        notificationType: toStringValue(n.notificationType),
        targetUserId: toOptionalString(toRawItems(n.targetUsers)[0]?.id ?? (Array.isArray(n.targetUsers) ? n.targetUsers[0] : undefined)),
        targetRoleId: toOptionalString(toRawItems(n.targetRoles)[0]?.id ?? (Array.isArray(n.targetRoles) ? n.targetRoles[0] : undefined)),
        isRead: toBooleanValue(n.isRead),
        readAt: toOptionalString(n.readAt),
        createdAt: toStringValue(n.createdDate ?? n.createdAt),
      })));

      setDepartments(extractData(departmentsData).map((d) => ({
        id: toStringValue(d.id),
        code: toStringValue(d.code ?? d.departmentCode),
        name: toStringValue(d.name ?? d.departmentName),
      })));
    } catch (error) {
      console.warn('Error fetching data:', error);
      message.warning('Không thể tải dữ liệu!');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount (EMR admin fetch moved into useEmrAdminTabs hook — K1 phiên 4)
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Health fetch + interval → moved to pages/system-admin/HealthTab.tsx (K1 refactor)

  // Workstation Session Monitoring fetch
  // fetchSessions + handleTerminateSession + interval effect → moved to SessionsTab.tsx (K1 phiên 6a)

  // AccessMatrix + Compliance fetch/interval → moved to sub-components (K1)

  // DataManagement fetch + interval → moved to sub-component (K1 phiên 3)

  // Branches tab tự load qua useEffect trong BranchesTab.tsx (K1 refactor)

  // isUserModalOpen + userForm + selectedUser + userSearchKeyword + filteredUsers → moved to UsersTab.tsx (K1 phiên 5d)
  // isRoleModalOpen + roleForm + selectedRole → moved to RolesTab.tsx (K1 phiên 5c)
  // isConfigModalOpen + configForm + selectedConfig → moved to ConfigsTab.tsx (K1 phiên 5b)
  // isNotificationModalOpen + notificationForm → moved to NotificationsTab.tsx (K1 phiên 5a)
  // Audit filter state → moved to pages/system-admin/AuditTab.tsx (K1 phiên 3)

  // IT Tickets state + handlers → moved to pages/system-admin/ItTicketsTab.tsx (K1 refactor)
  // Locked services state + fetch + search + handlers → moved to LockedServicesTab.tsx (K1 phiên 6b)

  // Audit fetch + filters → moved to pages/system-admin/AuditTab.tsx (K1 phiên 3)

  // userColumns + filteredUsers + handleCreate/Edit/Save/ResetPassword/Delete User → moved to UsersTab.tsx (K1 phiên 5d)

  // Role Management
  // roleColumns + handleCreateRole/EditRole/SaveRole/DeleteRole → moved to RolesTab.tsx (K1 phiên 5c)

  // System Config
  // configColumns + handleEditConfig + handleSaveConfig → moved to ConfigsTab.tsx (K1 phiên 5b)

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
  void auditLogColumns;

  // Notification column + handleSendNotification → moved to NotificationsTab.tsx (K1 phiên 5a)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Quản trị hệ thống</Title>
        <Button icon={<ReloadOutlined />} onClick={() => fetchData()} size="small">Làm mới</Button>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: (<span><UserOutlined /> Quản lý người dùng</span>),
              // Body + Modal → moved to pages/system-admin/UsersTab.tsx (K1 phiên 5d)
              children: (
                <UsersTab
                  users={users}
                  roles={roles}
                  departments={departments}
                  loading={loading}
                  onReload={fetchData}
                />
              ),
            },
            {
              key: 'roles',
              label: (<span><SafetyOutlined /> Vai trò &amp; Phân quyền</span>),
              // Body + Modal → moved to pages/system-admin/RolesTab.tsx (K1 phiên 5c)
              children: (
                <RolesTab
                  roles={roles}
                  permissions={permissions}
                  loading={loading}
                  onReload={fetchData}
                />
              ),
            },
            {
              key: 'configs',
              label: (<span><SettingOutlined /> Cấu hình hệ thống</span>),
              // Body + Modal → moved to pages/system-admin/ConfigsTab.tsx (K1 phiên 5b)
              children: <ConfigsTab configs={configs} loading={loading} onReload={fetchData} />,
            },
            {
              key: 'audit',
              label: (
                <span>
                  <FileTextOutlined /> Nhật ký hệ thống
                </span>
              ),
              children: <AuditTab />,
            },
            {
              key: 'notifications',
              label: (<span><BellOutlined /> Thông báo</span>),
              // Body + Modal → moved to pages/system-admin/NotificationsTab.tsx (K1 phiên 5a)
              children: (
                <NotificationsTab
                  notifications={notifications}
                  loading={loading}
                  onReload={fetchData}
                  users={users}
                  roles={roles}
                />
              ),
            },
            {
              key: 'health',
              label: (
                <span>
                  <HeartOutlined /> Giám sát hệ thống
                </span>
              ),
              children: <HealthTab active={activeTab === 'health'} />,
            },
            {
              key: 'access-matrix',
              label: (
                <span>
                  <TableOutlined /> Ma trận quyền
                </span>
              ),
              children: <AccessMatrixTab />,
            },
            {
              key: 'compliance',
              label: (
                <span>
                  <AuditOutlined /> ATTT Cấp độ 3
                </span>
              ),
              children: <ComplianceTab />,
            },
            {
              key: 'sessions',
              label: (<span><LaptopOutlined /> Phien lam viec</span>),
              // Body + interval timer → moved to SessionsTab.tsx với `active` prop pause-on-leave (K1 phiên 6a)
              children: <SessionsTab active={activeTab === 'sessions'} />,
            },
            {
              key: 'integration',
              label: (<span><ApiOutlined /> Tích hợp APP</span>),
              // Body → moved to pages/system-admin/IntegrationTab.tsx (K1 phiên 6c) — TAB CUỐI
              children: <IntegrationTab />,
            },
            {
              key: 'locked-services',
              label: (<span><LockOutlined /> Khóa dịch vụ</span>),
              // Body + search + modal → moved to LockedServicesTab.tsx với `active` prop (K1 phiên 6b)
              children: <LockedServicesTab active={activeTab === 'locked-services'} />,
            },
            {
              key: 'data-management',
              label: (
                <span>
                  <DatabaseOutlined /> Chuyển giao DL
                </span>
              ),
              children: <DataManagementTab />,
            },
            {
              key: 'backup',
              label: (
                <span>
                  <SaveOutlined /> Sao luu du lieu
                </span>
              ),
              children: <BackupTab />,
            },
            {
              key: 'it-tickets',
              label: (
                <span>
                  <ToolOutlined /> Yeu cau CNTT
                </span>
              ),
              children: <ItTicketsTab />,
            },
            // 6 EMR admin tab → moved to pages/system-admin/EmrAdminTabs.tsx (K1 phiên 4)
            ...emrTabItems,
            {
              key: 'branches',
              label: (
                <span>
                  <BankOutlined /> Quan ly chi nhanh
                </span>
              ),
              children: <BranchesTab />,
            },
          ]}
        />
      </Card>

      {/* IT Ticket modals đã move sang pages/system-admin/ItTicketsTab.tsx (K1 refactor) */}

      {/* Lock Service Modal đã move sang pages/system-admin/LockedServicesTab.tsx (K1 phiên 6b) */}
      {/* User Modal đã move sang pages/system-admin/UsersTab.tsx (K1 phiên 5d) */}
      {/* Role Modal đã move sang pages/system-admin/RolesTab.tsx (K1 phiên 5c) */}

      {/* Config Modal đã move sang pages/system-admin/ConfigsTab.tsx (K1 phiên 5b) */}
      {/* Notification Modal đã move sang pages/system-admin/NotificationsTab.tsx (K1 phiên 5a) */}
      {/* EMR Admin Modal đã move sang pages/system-admin/EmrAdminTabs.tsx (K1 phiên 4) */}
      {/* Branch Management Modal đã move sang pages/system-admin/BranchesTab.tsx (K1 refactor) */}
    </div>
  );
};

export default SystemAdmin;
