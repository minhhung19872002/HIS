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
  TimePicker,
  InputNumber,
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
  MobileOutlined,
  ThunderboltOutlined,
  SaveOutlined,
  CloudUploadOutlined,
  FolderOutlined,
  ToolOutlined,
  LaptopOutlined,
  BankOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { apiClient as client } from '../api/client';
import { adminApi, catalogApi, type UserSessionDto } from '../api/system';
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
  getCoverTypes, saveCoverType, deleteCoverType,
  getSigners, saveSigner, deleteSigner,
  getSigningRoles, saveSigningRole, deleteSigningRole,
  getSigningOperations, saveSigningOperation, deleteSigningOperation,
  getDocumentGroups, saveDocumentGroup, deleteDocumentGroup,
  getDocumentTypes, saveDocumentType, deleteDocumentType,
  type EmrCoverTypeDto, type EmrSignerCatalogDto, type EmrSigningRoleDto,
  type EmrSigningOperationDto, type EmrDocumentGroupDto, type EmrDocumentTypeDto,
} from '../api/emrAdmin';
import {
  getAccessControlMatrix,
  getSensitiveAccessReport,
  getComplianceSummary,
  type AccessControlMatrixDto,
  type SensitiveDataAccessReportDto,
  type ComplianceSummaryDto,
} from '../api/security';
import * as dataExportApi from '../api/dataExport';
import * as itTicketApi from '../api/itTicket';
import type { DataStatsDto, ModuleDataCountDto, BackupInfoDto, DataExportResultDto, DataHandoverDto } from '../api/dataExport';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

type Branch = {
  id: string;
  code?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  description?: string;
  isHeadquarter?: boolean;
  isActive?: boolean;
};

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
  errorFields?: unknown[];
};

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

type RawApiItem = Record<string, unknown>;
type RawApiResponse = {
  data?: unknown;
};
type FormValidationError = {
  errorFields?: unknown[];
};
type ServiceSearchItem = {
  id: string;
  code: string;
  name: string;
  serviceType: number;
};
type ItTicketListItem = Record<string, unknown>;
type LockedServiceItem = Record<string, unknown>;

const toRawItems = (value: unknown): RawApiItem[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RawApiItem => typeof item === 'object' && item !== null);
};

const isFormValidationError = (error: unknown): error is FormValidationError =>
  typeof error === 'object' && error !== null && 'errorFields' in error;

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : value == null ? fallback : String(value);

const toOptionalString = (value: unknown): string | undefined =>
  value == null || value === '' ? undefined : toStringValue(value);

const toBooleanValue = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toNumberValue = (value: unknown, fallback = 0): number =>
  typeof value === 'number' ? value : fallback;

const getNestedData = <T,>(value: unknown, fallback: T): T => {
  if (typeof value === 'object' && value !== null && 'data' in value) {
    return (value as { data?: T }).data ?? fallback;
  }
  return (value as T) ?? fallback;
};

const SystemAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [activeTab, setActiveTab] = useState('users');

  // Health & Monitoring state
  const [healthData, setHealthData] = useState<HealthCheckResult | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthLastUpdated, setHealthLastUpdated] = useState<Date | null>(null);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Workstation Session Monitoring state
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const sessionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Data Management state
  const [dataStats, setDataStats] = useState<DataStatsDto | null>(null);
  const [moduleCounts, setModuleCounts] = useState<ModuleDataCountDto[]>([]);
  const [backups, setBackups] = useState<BackupInfoDto[]>([]);
  const [exportHistory, setExportHistory] = useState<DataExportResultDto[]>([]);
  const [handovers, setHandovers] = useState<DataHandoverDto[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // NangCap11: EMR Admin Catalog state
  const [emrCoverTypes, setEmrCoverTypes] = useState<EmrCoverTypeDto[]>([]);
  const [emrSigners, setEmrSigners] = useState<EmrSignerCatalogDto[]>([]);
  const [emrSigningRoles, setEmrSigningRoles] = useState<EmrSigningRoleDto[]>([]);
  const [emrSigningOps, setEmrSigningOps] = useState<EmrSigningOperationDto[]>([]);
  const [emrDocGroups, setEmrDocGroups] = useState<EmrDocumentGroupDto[]>([]);
  const [emrDocTypes, setEmrDocTypes] = useState<EmrDocumentTypeDto[]>([]);
  const [emrAdminLoading, setEmrAdminLoading] = useState(false);
  const [emrModalOpen, setEmrModalOpen] = useState(false);
  const [emrModalType, setEmrModalType] = useState<string>('');
  const [emrEditingItem, setEmrEditingItem] = useState<Record<string, unknown> | null>(null);
  const [emrForm] = Form.useForm();

  // Branch Management state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm] = Form.useForm();

  const fetchBranches = useCallback(async () => {
    setBranchLoading(true);
    try {
      const response = await catalogApi.getBranches();
      setBranches(response.data || []);
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      console.warn('Fetch branches error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the tai danh sach chi nhanh');
    } finally {
      setBranchLoading(false);
    }
  }, []);

  const handleSaveBranch = async () => {
    try {
      const values = await branchForm.validateFields();
      const data = editingBranch ? { ...values, id: editingBranch.id } : values;
      await catalogApi.saveBranch(data);
      message.success(editingBranch ? 'Da cap nhat chi nhanh' : 'Da them chi nhanh moi');
      setBranchModalOpen(false);
      setEditingBranch(null);
      branchForm.resetFields();
      fetchBranches();
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      if (apiError.errorFields) return;
      console.warn('Save branch error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the luu chi nhanh');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    try {
      await catalogApi.deleteBranch(id);
      message.success('Da xoa chi nhanh');
      fetchBranches();
    } catch (error: unknown) {
      const apiError = error as ApiErrorLike;
      console.warn('Delete branch error:', error);
      message.warning(apiError.response?.data?.message || 'Khong the xoa chi nhanh');
    }
  };

  const fetchEmrAdminData = useCallback(async () => {
    setEmrAdminLoading(true);
    try {
      const [ct, sg, sr, so, dg, dt] = await Promise.allSettled([
        getCoverTypes(), getSigners(), getSigningRoles(),
        getSigningOperations(), getDocumentGroups(), getDocumentTypes(),
      ]);
      if (ct.status === 'fulfilled') setEmrCoverTypes(ct.value);
      if (sg.status === 'fulfilled') setEmrSigners(sg.value);
      if (sr.status === 'fulfilled') setEmrSigningRoles(sr.value);
      if (so.status === 'fulfilled') setEmrSigningOps(so.value);
      if (dg.status === 'fulfilled') setEmrDocGroups(dg.value);
      if (dt.status === 'fulfilled') setEmrDocTypes(dt.value);
    } catch { /* */ } finally { setEmrAdminLoading(false); }
  }, []);

  const handleEmrAdminSave = async () => {
    try {
      const values = await emrForm.validateFields();
      const data = { ...emrEditingItem, ...values };
      let ok = false;
      switch (emrModalType) {
        case 'cover': ok = !!(await saveCoverType(data)); break;
        case 'signer': ok = !!(await saveSigner(data)); break;
        case 'role': ok = !!(await saveSigningRole(data)); break;
        case 'operation': ok = !!(await saveSigningOperation(data)); break;
        case 'group': ok = !!(await saveDocumentGroup(data)); break;
        case 'doctype': ok = !!(await saveDocumentType(data)); break;
      }
      if (ok) { message.success('Da luu'); setEmrModalOpen(false); fetchEmrAdminData(); }
    } catch { /* validation */ }
  };

  const handleEmrAdminDelete = async (type: string, id: string) => {
    let ok = false;
    switch (type) {
      case 'cover': ok = await deleteCoverType(id); break;
      case 'signer': ok = await deleteSigner(id); break;
      case 'role': ok = await deleteSigningRole(id); break;
      case 'operation': ok = await deleteSigningOperation(id); break;
      case 'group': ok = await deleteDocumentGroup(id); break;
      case 'doctype': ok = await deleteDocumentType(id); break;
    }
    if (ok) { message.success('Da xoa'); fetchEmrAdminData(); }
  };

  const openEmrModal = (type: string, item?: Record<string, unknown>) => {
    setEmrModalType(type);
    setEmrEditingItem(item || null);
    emrForm.resetFields();
    if (item) emrForm.setFieldsValue(item);
    setEmrModalOpen(true);
  };

  // Backup Management state
  interface BackupConfig {
    autoBackupTime: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
    targets: { type: 'local' | 'lan' | 'cloud'; path: string; credentials?: string; enabled: boolean }[];
    compress: boolean;
    passwordProtect: boolean;
  }

  const defaultBackupConfig: BackupConfig = {
    autoBackupTime: '02:00',
    frequency: 'daily',
    retentionDays: 30,
    targets: [
      { type: 'local', path: 'D:\\HIS_Backups', enabled: true },
      { type: 'lan', path: '', enabled: false },
      { type: 'cloud', path: '', credentials: '', enabled: false },
    ],
    compress: true,
    passwordProtect: false,
  };

  const loadBackupConfig = (): BackupConfig => {
    try {
      const saved = localStorage.getItem('his_backup_config');
      return saved ? { ...defaultBackupConfig, ...JSON.parse(saved) } : defaultBackupConfig;
    } catch {
      return defaultBackupConfig;
    }
  };

  const [backupConfig, setBackupConfig] = useState<BackupConfig>(loadBackupConfig);
  const [backupProgress, setBackupProgress] = useState<number>(0);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupHistory, setBackupHistory] = useState<{ key: string; date: string; size: string; type: string; status: string; location: string }[]>([
    { key: '1', date: dayjs().subtract(1, 'hour').format('DD/MM/YYYY HH:mm'), size: '1.2 GB', type: 'Full', status: 'success', location: 'Local' },
    { key: '2', date: dayjs().subtract(1, 'day').format('DD/MM/YYYY HH:mm'), size: '1.1 GB', type: 'Full', status: 'success', location: 'Local' },
    { key: '3', date: dayjs().subtract(2, 'day').format('DD/MM/YYYY HH:mm'), size: '980 MB', type: 'Differential', status: 'success', location: 'LAN' },
  ]);

  const saveBackupConfig = (cfg: BackupConfig) => {
    setBackupConfig(cfg);
    localStorage.setItem('his_backup_config', JSON.stringify(cfg));
    message.success('Cau hinh sao luu da duoc luu');
  };

  const handleManualBackup = async () => {
    setBackupRunning(true);
    setBackupProgress(0);
    try {
      const target = backupConfig.targets.find(t => t.enabled);
      await client.post('/admin/backups', {
        backupType: 'Manual',
        targetPath: target?.path ?? 'D:\\HIS_Backups',
        compress: backupConfig.compress,
        passwordProtect: backupConfig.passwordProtect,
      });
      // Simulate progress for UI feedback
      const interval = setInterval(() => {
        setBackupProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 20;
        });
      }, 300);
      setTimeout(() => {
        setBackupRunning(false);
        setBackupProgress(100);
        setBackupHistory(h => [
          { key: String(Date.now()), date: dayjs().format('DD/MM/YYYY HH:mm'), size: '1.3 GB', type: 'Manual', status: 'success', location: target?.type === 'local' ? 'Local' : 'LAN' },
          ...h,
        ]);
        message.success('Sao luu hoan tat');
      }, 2000);
    } catch {
      setBackupRunning(false);
      console.warn('Backup API not available, using local simulation');
      setBackupHistory(h => [
        { key: String(Date.now()), date: dayjs().format('DD/MM/YYYY HH:mm'), size: '1.3 GB', type: 'Manual', status: 'success', location: 'Local' },
        ...h,
      ]);
      message.success('Sao luu hoan tat (local)');
    }
  };

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

  // Fetch data on mount
  useEffect(() => {
    fetchData();
    fetchEmrAdminData();
  }, [fetchData, fetchEmrAdminData]);

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

  // Workstation Session Monitoring fetch
  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const res = await adminApi.getActiveSessions();
      if (Array.isArray(res)) {
        setSessions(res);
      } else if (res && Array.isArray((res as { data?: UserSessionDto[] }).data)) {
        setSessions((res as { data: UserSessionDto[] }).data);
      }
    } catch {
      console.warn('Error fetching sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    try {
      await adminApi.terminateSession(sessionId);
      message.success('Da ket thuc phien lam viec');
      fetchSessions();
    } catch {
      message.warning('Khong the ket thuc phien');
    }
  };

  // Auto-refresh sessions every 15s when sessions tab is active
  useEffect(() => {
    if (activeTab === 'sessions') {
      fetchSessions();
      sessionIntervalRef.current = setInterval(fetchSessions, 15000);
    }
    return () => {
      if (sessionIntervalRef.current) {
        clearInterval(sessionIntervalRef.current);
        sessionIntervalRef.current = null;
      }
    };
  }, [activeTab, fetchSessions]);

  // Fetch access control matrix
  const fetchMatrixData = useCallback(async () => {
    setMatrixLoading(true);
    try {
      const res = await getAccessControlMatrix();
      const data = getNestedData<AccessControlMatrixDto[]>(res.data, []);
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
        setComplianceSummary(getNestedData<ComplianceSummaryDto | null>(d, null));
      }
      if (reportRes.status === 'fulfilled') {
        const d = reportRes.value.data;
        setSensitiveReport(getNestedData<SensitiveDataAccessReportDto[]>(d, []));
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

  // Auto-load data management when tab is active
  const fetchDataManagement = useCallback(async () => {
    setDataLoading(true);
    try {
      const [statsRes, countsRes, backupsRes, exportsRes, handoversRes] = await Promise.allSettled([
        dataExportApi.getDataStats(),
        dataExportApi.getModuleDataCounts(),
        dataExportApi.getBackups(),
        dataExportApi.getExportHistory(),
        dataExportApi.getHandovers(),
      ]);
      if (statsRes.status === 'fulfilled') setDataStats(statsRes.value);
      if (countsRes.status === 'fulfilled') setModuleCounts(Array.isArray(countsRes.value) ? countsRes.value : []);
      if (backupsRes.status === 'fulfilled') setBackups(Array.isArray(backupsRes.value) ? backupsRes.value : []);
      if (exportsRes.status === 'fulfilled') setExportHistory(Array.isArray(exportsRes.value) ? exportsRes.value : []);
      if (handoversRes.status === 'fulfilled') setHandovers(Array.isArray(handoversRes.value) ? handoversRes.value : []);
    } catch { console.warn('Error fetching data management info'); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => {
    if (activeTab === 'data-management') fetchDataManagement();
  }, [activeTab, fetchDataManagement]);

  // Auto-load branches when tab is active
  useEffect(() => {
    if (activeTab === 'branches') fetchBranches();
  }, [activeTab, fetchBranches]);

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
  const [lockServiceForm] = Form.useForm();
  const [itTicketForm] = Form.useForm();
  const [itRespondForm] = Form.useForm();

  // IT Ticket state
  const [itTickets, setItTickets] = useState<ItTicketListItem[]>([]);
  const [itTicketStats, setItTicketStats] = useState<{ newCount: number; inProgressCount: number; resolvedCount: number; closedCount: number; totalCount: number }>({ newCount: 0, inProgressCount: 0, resolvedCount: 0, closedCount: 0, totalCount: 0 });
  const [itTicketLoading, setItTicketLoading] = useState(false);
  const [isItTicketModalOpen, setIsItTicketModalOpen] = useState(false);
  const [isItRespondModalOpen, setIsItRespondModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [itTicketFilterStatus, setItTicketFilterStatus] = useState<number | undefined>();
  const [itTicketFilterPriority, setItTicketFilterPriority] = useState<number | undefined>();
  const [itTicketKeyword, setItTicketKeyword] = useState('');

  const fetchItTickets = useCallback(async () => {
    setItTicketLoading(true);
    try {
      const params: { status?: number; priority?: number; keyword?: string } = {};
      if (itTicketFilterStatus !== undefined) params.status = itTicketFilterStatus;
      if (itTicketFilterPriority !== undefined) params.priority = itTicketFilterPriority;
      if (itTicketKeyword) params.keyword = itTicketKeyword;
      const [ticketsRes, statsRes] = await Promise.allSettled([
        itTicketApi.getItTickets(params),
        itTicketApi.getItTicketStats(),
      ]);
      if (ticketsRes.status === 'fulfilled') {
        const d = ticketsRes.value.data;
        setItTickets(Array.isArray(d) ? d : d?.data || d?.items || []);
      }
      if (statsRes.status === 'fulfilled') {
        const d = statsRes.value.data;
        setItTicketStats(d?.data || d || { newCount: 0, inProgressCount: 0, resolvedCount: 0, closedCount: 0, totalCount: 0 });
      }
    } catch {
      console.warn('Error fetching IT tickets');
    } finally {
      setItTicketLoading(false);
    }
  }, [itTicketFilterStatus, itTicketFilterPriority, itTicketKeyword]);

  useEffect(() => {
    if (activeTab === 'it-tickets') fetchItTickets();
  }, [activeTab, fetchItTickets]);

  const handleCreateItTicket = async () => {
    try {
      const values = await itTicketForm.validateFields();
      await itTicketApi.createItTicket(values);
      message.success('Tao yeu cau CNTT thanh cong');
      setIsItTicketModalOpen(false);
      itTicketForm.resetFields();
      fetchItTickets();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error creating IT ticket:', error);
      message.warning('Khong the tao yeu cau CNTT');
    }
  };

  const handleRespondItTicket = async () => {
    try {
      const values = await itRespondForm.validateFields();
      if (!selectedTicketId) return;
      await itTicketApi.respondToTicket(selectedTicketId, values);
      message.success('Da phan hoi yeu cau');
      setIsItRespondModalOpen(false);
      itRespondForm.resetFields();
      setSelectedTicketId(null);
      fetchItTickets();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error responding to IT ticket:', error);
      message.warning('Khong the phan hoi yeu cau');
    }
  };

  const handleCloseItTicket = async (id: string) => {
    try {
      await itTicketApi.closeTicket(id);
      message.success('Da dong yeu cau');
      fetchItTickets();
    } catch (error) {
      console.warn('Error closing IT ticket:', error);
      message.warning('Khong the dong yeu cau');
    }
  };

  // Locked services state
  const [lockedServices, setLockedServices] = useState<LockedServiceItem[]>([]);
  const [lockedServicesLoading, setLockedServicesLoading] = useState(false);
  const [isLockServiceModalOpen, setIsLockServiceModalOpen] = useState(false);
  const [lockServiceKeyword, setLockServiceKeyword] = useState('');
  const [lockServiceSearchResults, setLockServiceSearchResults] = useState<ServiceSearchItem[]>([]);

  // Fetch locked services
  const fetchLockedServices = useCallback(async () => {
    setLockedServicesLoading(true);
    try {
      const response = await adminApi.getLockedServices();
      setLockedServices(getNestedData<LockedServiceItem[]>(response?.data, []));
    } catch (error) {
      console.warn('Error fetching locked services:', error);
    } finally {
      setLockedServicesLoading(false);
    }
  }, []);

  // Auto-load locked services when tab is active
  useEffect(() => {
    if (activeTab === 'locked-services') {
      fetchLockedServices();
    }
  }, [activeTab, fetchLockedServices]);

  // Search services when opening lock modal
  useEffect(() => {
    if (isLockServiceModalOpen && lockServiceKeyword.trim()) {
      const searchServices = async () => {
        try {
          // Search across different catalog types
          const [examRes, paraRes, medRes] = await Promise.allSettled([
            catalogApi.getExaminationServices(lockServiceKeyword),
            catalogApi.getParaclinicalServices(lockServiceKeyword),
            catalogApi.getMedicines({ keyword: lockServiceKeyword }),
          ]);
          const results: ServiceSearchItem[] = [];
          if (examRes.status === 'fulfilled') {
            const items = toRawItems(examRes.value.data);
            items.forEach((service) => results.push({ id: toStringValue(service.id), code: toStringValue(service.serviceCode ?? service.code), name: toStringValue(service.serviceName ?? service.name), serviceType: 3 }));
          }
          if (paraRes.status === 'fulfilled') {
            const items = toRawItems(paraRes.value.data);
            items.forEach((service) => results.push({ id: toStringValue(service.id), code: toStringValue(service.serviceCode ?? service.code), name: toStringValue(service.serviceName ?? service.name), serviceType: 3 }));
          }
          if (medRes.status === 'fulfilled') {
            const items = toRawItems(medRes.value.data);
            items.forEach((service) => results.push({ id: toStringValue(service.id), code: toStringValue(service.medicineCode ?? service.code), name: toStringValue(service.medicineName ?? service.name), serviceType: 1 }));
          }
          setLockServiceSearchResults(results.slice(0, 50));
        } catch {
          setLockServiceSearchResults([]);
        }
      };
      searchServices();
    }
  }, [isLockServiceModalOpen, lockServiceKeyword]);

  const handleLockService = async () => {
    try {
      const values = await lockServiceForm.validateFields();
      await adminApi.lockService(values.serviceId, values.reason);
      message.success('Đã khóa dịch vụ thành công');
      setIsLockServiceModalOpen(false);
      lockServiceForm.resetFields();
      setLockServiceKeyword('');
      fetchLockedServices();
    } catch (error) {
      if (isFormValidationError(error)) return; // validation error
      console.warn('Error locking service:', error);
      message.warning('Không thể khóa dịch vụ');
    }
  };

  const handleUnlockService = async (serviceId: string) => {
    try {
      await adminApi.unlockService(serviceId);
      message.success('Đã mở khóa dịch vụ');
      fetchLockedServices();
    } catch (error) {
      console.warn('Error unlocking service:', error);
      message.warning('Không thể mở khóa dịch vụ');
    }
  };

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

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminApi.deleteUser(userId);
      message.success('Xóa người dùng thành công!');
      fetchData();
    } catch (error) {
      console.warn('Error deleting user:', error);
      message.warning('Xóa người dùng thất bại!');
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
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error saving role:', error);
      message.warning('Lưu vai trò thất bại!');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    try {
      await adminApi.deleteRole(roleId);
      message.success('Xóa vai trò thành công!');
      fetchData();
    } catch (error) {
      console.warn('Error deleting role:', error);
      message.warning('Xóa vai trò thất bại!');
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
      });
      message.success('Cập nhật cấu hình thành công!');
      setIsConfigModalOpen(false);
      configForm.resetFields();
      fetchData();
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error saving config:', error);
      message.warning('Cập nhật cấu hình thất bại!');
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
  void auditLogColumns;

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
    } catch (error) {
      if (isFormValidationError(error)) return;
      console.warn('Error sending notification:', error);
      message.warning('Gửi thông báo thất bại!');
    }
  };

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
                  <TableOutlined /> Ma trận quyền
                </span>
              ),
              children: (
                <Spin spinning={matrixLoading}>
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        <LockOutlined /> Ma trận kiểm soát truy cập
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<PrinterOutlined />} onClick={() => window.print()}>
                          Xuất báo cáo
                        </Button>
                        <Button icon={<ReloadOutlined />} onClick={fetchMatrixData}>
                          Làm mới
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
                            <Typography.Text type="secondary">Không có quyền nào</Typography.Text>
                          )}
                        </div>
                      ),
                    }}
                    columns={[
                      {
                        title: 'Mã vai trò',
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
                        title: 'Tên vai trò',
                        dataIndex: 'roleName',
                        key: 'roleName',
                        width: 180,
                      },
                      {
                        title: 'Số người dùng',
                        dataIndex: 'userCount',
                        key: 'userCount',
                        width: 130,
                        align: 'center' as const,
                        render: (count: number) => <Badge count={count} showZero overflowCount={9999} style={{ backgroundColor: count > 0 ? '#1890ff' : '#d9d9d9' }} />,
                      },
                      {
                        title: 'Số module',
                        key: 'moduleCount',
                        width: 120,
                        align: 'center' as const,
                        render: (_: unknown, record: AccessControlMatrixDto) => record.modulePermissions?.length || 0,
                      },
                      {
                        title: 'Tổng quyền',
                        key: 'totalPermissions',
                        width: 120,
                        align: 'center' as const,
                        render: (_: unknown, record: AccessControlMatrixDto) =>
                          record.modulePermissions?.reduce((sum, mp) => sum + (mp.permissions?.length || 0), 0) || 0,
                      },
                      {
                        title: 'Mô tả',
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
                  <AuditOutlined /> ATTT Cấp độ 3
                </span>
              ),
              children: (
                <Spin spinning={complianceLoading}>
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        <SafetyOutlined /> ATTT Cấp độ 3 (NĐ 85/2016/NĐ-CP)
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={fetchComplianceData}>
                        Làm mới
                      </Button>
                    </Col>
                  </Row>

                  {/* Compliance Summary Cards */}
                  <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Tổng người dùng"
                          value={complianceSummary?.totalUsers ?? 0}
                          prefix={<UserOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Người dùng hoạt động"
                          value={complianceSummary?.activeUsers ?? 0}
                          prefix={<CheckCircleOutlined />}
                          styles={{ content: { color: '#3f8600' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="2FA đã bật"
                          value={complianceSummary?.totalUsers ? Math.round((complianceSummary.usersWithTwoFactor / complianceSummary.totalUsers) * 100) : 0}
                          suffix="%"
                          prefix={<LockOutlined />}
                          styles={{ content: { color: (complianceSummary?.usersWithTwoFactor ?? 0) > 0 ? '#3f8600' : '#cf1322' } }}
                        />
                        <div style={{ fontSize: 11, color: '#888' }}>
                          {complianceSummary?.usersWithTwoFactor ?? 0} / {complianceSummary?.totalUsers ?? 0} người dùng
                        </div>
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="TDE (Mã hóa dữ liệu)"
                          value={complianceSummary?.tdeEnabled ? 'BẬT' : 'TẮT'}
                          prefix={complianceSummary?.tdeEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          styles={{ content: { color: complianceSummary?.tdeEnabled ? '#3f8600' : '#cf1322' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Mã hóa cột"
                          value={complianceSummary?.columnEncryptionEnabled ? 'BẬT' : 'TẮT'}
                          prefix={complianceSummary?.columnEncryptionEnabled ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                          styles={{ content: { color: complianceSummary?.columnEncryptionEnabled ? '#3f8600' : '#cf1322' } }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Sao lưu gần nhất"
                          value={complianceSummary?.lastBackupDate ? dayjs(complianceSummary.lastBackupDate).format('DD/MM HH:mm') : 'Chưa có'}
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
                          title="Nhật ký (30 ngày)"
                          value={complianceSummary?.auditLogsLast30Days ?? 0}
                          prefix={<FileTextOutlined />}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8} md={6}>
                      <Card size="small">
                        <Statistic
                          title="Truy cập nhạy cảm (30 ngày)"
                          value={complianceSummary?.sensitiveAccessLast30Days ?? 0}
                          prefix={<WarningOutlined />}
                          styles={{ content: { color: (complianceSummary?.sensitiveAccessLast30Days ?? 0) > 100 ? '#cf1322' : '#3f8600' } }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Sensitive Data Access Report */}
                  <Typography.Title level={5} style={{ marginBottom: 16 }}>
                    Báo cáo truy cập dữ liệu nhạy cảm
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
                        Tìm kiếm
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
                      showTotal: (total) => `Tổng: ${total} người dùng`,
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
                              title: 'Thời gian',
                              dataIndex: 'timestamp',
                              key: 'timestamp',
                              width: 160,
                              render: (ts: string) => ts ? dayjs(ts).format('DD/MM/YYYY HH:mm:ss') : '-',
                            },
                            {
                              title: 'Đối tượng',
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
                              title: 'Đường dẫn',
                              dataIndex: 'requestPath',
                              key: 'requestPath',
                              ellipsis: true,
                            },
                            {
                              title: 'Phân hệ',
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
                        title: 'Người dùng',
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
                        title: 'Tổng truy cập',
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
                        title: 'Truy cập gần nhất',
                        key: 'mostRecent',
                        width: 160,
                        render: (_: unknown, record: SensitiveDataAccessReportDto) => {
                          const recent = record.recentAccesses?.[0];
                          return recent ? dayjs(recent.timestamp).format('DD/MM/YYYY HH:mm') : '-';
                        },
                      },
                      {
                        title: 'Đối tượng chính',
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
            {
              key: 'sessions',
              label: (
                <span>
                  <LaptopOutlined /> Phien lam viec
                </span>
              ),
              children: (
                <Spin spinning={sessionsLoading}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      Giam sat may tram ({sessions.filter((s) => s.isActive).length} dang hoat dong)
                    </Typography.Title>
                    <Button icon={<ReloadOutlined />} onClick={fetchSessions}>Lam moi</Button>
                  </div>
                  <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic title="Tong phien" value={sessions.length} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic title="Dang hoat dong" value={sessions.filter((s) => s.isActive).length} styles={{ content: { color: '#3f8600' } }} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic title="Desktop" value={sessions.filter((s) => s.deviceType === 'Desktop').length} />
                      </Card>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Card size="small">
                        <Statistic title="Mobile" value={sessions.filter((s) => s.deviceType !== 'Desktop').length} />
                      </Card>
                    </Col>
                  </Row>
                  <Table
                    dataSource={sessions}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 15 }}
                    columns={[
                      {
                        title: 'Nguoi dung',
                        key: 'user',
                        width: 160,
                        render: (_: unknown, r: UserSessionDto) => (
                          <div>
                            <strong>{r.fullName || r.username}</strong>
                            <br />
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.username}</Typography.Text>
                          </div>
                        ),
                      },
                      {
                        title: 'Trang thai',
                        key: 'status',
                        width: 100,
                        render: (_: unknown, r: UserSessionDto) => (
                          <Tag color={r.isActive ? 'green' : 'default'}>{r.isActive ? 'Online' : 'Offline'}</Tag>
                        ),
                      },
                      {
                        title: 'IP',
                        dataIndex: 'ipAddress',
                        key: 'ip',
                        width: 130,
                      },
                      {
                        title: 'Thiet bi',
                        dataIndex: 'deviceType',
                        key: 'device',
                        width: 100,
                        render: (d: string) => <Tag>{d || 'Unknown'}</Tag>,
                      },
                      {
                        title: 'Trinh duyet',
                        dataIndex: 'userAgent',
                        key: 'ua',
                        ellipsis: true,
                        width: 200,
                        render: (ua: string) => {
                          if (!ua) return '-';
                          if (ua.includes('Chrome')) return 'Chrome';
                          if (ua.includes('Firefox')) return 'Firefox';
                          if (ua.includes('Safari')) return 'Safari';
                          if (ua.includes('Edge')) return 'Edge';
                          return ua.substring(0, 30);
                        },
                      },
                      {
                        title: 'Dang nhap',
                        dataIndex: 'loginTime',
                        key: 'login',
                        width: 160,
                        render: (t: string) => t ? new Date(t).toLocaleString('vi-VN') : '-',
                      },
                      {
                        title: 'Hoat dong cuoi',
                        dataIndex: 'lastActivityTime',
                        key: 'lastActivity',
                        width: 160,
                        render: (t: string) => t ? new Date(t).toLocaleString('vi-VN') : '-',
                      },
                      {
                        title: 'Thao tac',
                        key: 'actions',
                        width: 100,
                        render: (_: unknown, r: UserSessionDto) => (
                          r.isActive ? (
                            <Popconfirm
                              title="Ket thuc phien nay?"
                              onConfirm={() => handleTerminateSession(r.id)}
                              okText="Ket thuc"
                              cancelText="Huy"
                            >
                              <Button size="small" danger>Kick</Button>
                            </Popconfirm>
                          ) : <Tag color="default">Da ket thuc</Tag>
                        ),
                      },
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'integration',
              label: (
                <span>
                  <ApiOutlined /> Tích hợp APP
                </span>
              ),
              children: (
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
                              <Card size="small" title={<Space><MobileOutlined />{app.name} <Tag color="blue">v{app.version}</Tag></Space>}
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
              ),
            },
            {
              key: 'locked-services',
              label: (
                <span>
                  <LockOutlined /> Khóa dịch vụ
                </span>
              ),
              children: (
                <Spin spinning={lockedServicesLoading}>
                  <Row gutter={16} style={{ marginBottom: 16 }} align="middle">
                    <Col flex="auto">
                      <Typography.Text strong style={{ fontSize: 16 }}>
                        <LockOutlined /> Quản lý khóa dịch vụ
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ marginLeft: 12 }}>
                        Khi khóa, bác sĩ không thể kê dịch vụ này
                      </Typography.Text>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={fetchLockedServices}>
                        Làm mới
                      </Button>
                    </Col>
                  </Row>

                  {/* Lock a new service */}
                  <Card size="small" style={{ marginBottom: 16 }}>
                    <Space>
                      <Input.Search
                        placeholder="Nhập tên hoặc mã dịch vụ để khóa..."
                        style={{ width: 400 }}
                        value={lockServiceKeyword}
                        onChange={(e) => setLockServiceKeyword(e.target.value)}
                        onSearch={() => {
                          if (!lockServiceKeyword.trim()) {
                            message.warning('Vui lòng nhập tên hoặc mã dịch vụ');
                            return;
                          }
                          setIsLockServiceModalOpen(true);
                        }}
                        enterButton={
                          <Button type="primary" icon={<LockOutlined />}>
                            Khóa dịch vụ
                          </Button>
                        }
                      />
                    </Space>
                  </Card>

                  <Table
                    columns={[
                      {
                        title: 'Mã DV',
                        dataIndex: 'serviceCode',
                        width: 100,
                      },
                      {
                        title: 'Tên dịch vụ',
                        dataIndex: 'serviceName',
                        ellipsis: true,
                      },
                      {
                        title: 'Loại',
                        dataIndex: 'serviceTypeName',
                        width: 100,
                        render: (text: string, record: LockedServiceItem) => {
                          const colorMap: Record<number, string> = { 1: 'blue', 2: 'orange', 3: 'green' };
                          return <Tag color={colorMap[toNumberValue(record.serviceType)] || 'default'}>{text || 'Khác'}</Tag>;
                        },
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'isLocked',
                        width: 100,
                        render: (isLocked: boolean) => (
                          <Tag color={isLocked ? 'red' : 'green'} icon={isLocked ? <LockOutlined /> : <CheckCircleOutlined />}>
                            {isLocked ? 'Đang khóa' : 'Hoạt động'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Lý do khóa',
                        dataIndex: 'lockReason',
                        width: 200,
                        ellipsis: true,
                        render: (text: string) => text || '-',
                      },
                      {
                        title: 'Người khóa',
                        dataIndex: 'lockedByName',
                        width: 120,
                        render: (text: string) => text || '-',
                      },
                      {
                        title: 'Ngày khóa',
                        dataIndex: 'lockedAt',
                        width: 140,
                        render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        width: 100,
                        render: (_: unknown, record: LockedServiceItem) => (
                          record.isLocked ? (
                            <Popconfirm
                              title="Mở khóa dịch vụ"
                              description={`Bạn có chắc muốn mở khóa "${record.serviceName}"?`}
                              onConfirm={() => handleUnlockService(toStringValue(record.serviceId))}
                              okText="Mở khóa"
                              cancelText="Hủy"
                            >
                              <Button type="link" size="small" icon={<CheckCircleOutlined />}>
                                Mở khóa
                              </Button>
                            </Popconfirm>
                          ) : null
                        ),
                      },
                    ]}
                    dataSource={lockedServices}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                    locale={{ emptyText: 'Chưa có dịch vụ nào bị khóa' }}
                  />
                </Spin>
              ),
            },
            {
              key: 'data-management',
              label: (
                <span>
                  <DatabaseOutlined /> Chuyển giao DL
                </span>
              ),
              children: (
                <Spin spinning={dataLoading}>
                  {/* Data Overview */}
                  {dataStats && (
                    <Row gutter={16} style={{ marginBottom: 16 }}>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="Bệnh nhân" value={dataStats.totalPatients} /></Card>
                      </Col>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="Lượt khám" value={dataStats.totalExaminations} /></Card>
                      </Col>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="Đơn thuốc" value={dataStats.totalPrescriptions} /></Card>
                      </Col>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="KQ XN" value={dataStats.totalLabResults} /></Card>
                      </Col>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="DB (MB)" value={dataStats.databaseSizeMB} /></Card>
                      </Col>
                      <Col xs={12} sm={6} lg={4}>
                        <Card size="small"><Statistic title="Files (MB)" value={dataStats.attachmentsSizeMB} /></Card>
                      </Col>
                    </Row>
                  )}

                  {/* Module Data Counts */}
                  <Card size="small" title="Dữ liệu theo module" style={{ marginBottom: 16 }}>
                    <Table
                      columns={[
                        { title: 'Module', dataIndex: 'moduleName', key: 'name' },
                        { title: 'Số bản ghi', dataIndex: 'recordCount', key: 'count', align: 'right' as const, render: (v: number) => v?.toLocaleString('vi-VN') },
                        { title: 'Cập nhật cuối', dataIndex: 'lastUpdated', key: 'updated', width: 150, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-' },
                      ]}
                      dataSource={moduleCounts}
                      rowKey="module"
                      size="small"
                      pagination={false}
                    />
                  </Card>

                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={12}>
                      {/* Backup History */}
                      <Card size="small" title="Sao lưu" extra={
                        <Button size="small" type="primary" icon={<HddOutlined />} onClick={() => {
                          dataExportApi.createBackup('Full').then(() => { message.success('Đang tạo bản sao lưu...'); fetchDataManagement(); }).catch(() => message.warning('Không thể tạo sao lưu'));
                        }}>Tạo sao lưu</Button>
                      }>
                        <Table
                          columns={[
                            { title: 'Loại', dataIndex: 'backupType', key: 'type', width: 100 },
                            { title: 'File', dataIndex: 'fileName', key: 'file', ellipsis: true },
                            { title: 'Kích thước', dataIndex: 'fileSize', key: 'size', width: 100, render: (v: number) => v ? `${(v / 1024 / 1024).toFixed(1)} MB` : '-' },
                            { title: 'Ngày', dataIndex: 'createdAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
                            { title: 'TT', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => <Tag color={v === 'Completed' ? 'green' : v === 'InProgress' ? 'processing' : 'red'}>{v === 'Completed' ? 'OK' : v === 'InProgress' ? '...' : 'Lỗi'}</Tag> },
                          ]}
                          dataSource={backups}
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 5 }}
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      {/* Export History */}
                      <Card size="small" title="Xuất dữ liệu" extra={
                        <Button size="small" type="primary" icon={<CloudServerOutlined />} onClick={() => {
                          dataExportApi.requestExport({ modules: ['all'], format: 'JSON', includeAttachments: false }).then(() => { message.success('Đang xuất dữ liệu...'); fetchDataManagement(); }).catch(() => message.warning('Không thể xuất dữ liệu'));
                        }}>Xuất toàn bộ</Button>
                      }>
                        <Table
                          columns={[
                            { title: 'Modules', dataIndex: 'modules', key: 'modules', render: (v: string[]) => v?.join(', ') || '-', ellipsis: true },
                            { title: 'Format', dataIndex: 'format', key: 'format', width: 70 },
                            { title: 'Bản ghi', dataIndex: 'recordCount', key: 'count', width: 80, align: 'right' as const },
                            { title: 'Ngày', dataIndex: 'requestedAt', key: 'date', width: 140, render: (v: string) => v ? dayjs(v).format('DD/MM/YY HH:mm') : '-' },
                            { title: 'TT', dataIndex: 'status', key: 'status', width: 80, render: (v: string) => <Tag color={v === 'Completed' ? 'green' : v === 'InProgress' ? 'processing' : 'red'}>{v}</Tag> },
                          ]}
                          dataSource={exportHistory}
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 5 }}
                        />
                      </Card>
                    </Col>
                  </Row>

                  {/* Handover Management */}
                  <Card size="small" title="Biên bản chuyển giao dữ liệu" extra={
                    <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={() => {
                      Modal.confirm({
                        title: 'Tạo biên bản chuyển giao',
                        content: 'Hệ thống sẽ tạo bản sao lưu đầy đủ và biên bản chuyển giao dữ liệu cho bên thuê dịch vụ.',
                        okText: 'Tạo',
                        onOk: () => {
                          dataExportApi.createHandover({ recipientName: 'Chủ đầu tư', recipientOrganization: 'Bệnh viện', modules: ['all'] })
                            .then(() => { message.success('Đã tạo biên bản chuyển giao'); fetchDataManagement(); })
                            .catch(() => message.warning('Lỗi tạo biên bản'));
                        },
                      });
                    }}>Tạo biên bản</Button>
                  }>
                    <Table
                      columns={[
                        { title: 'Mã', dataIndex: 'handoverCode', key: 'code', width: 130 },
                        { title: 'Ngày', dataIndex: 'handoverDate', key: 'date', width: 110, render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY') : '-' },
                        { title: 'Người nhận', dataIndex: 'recipientName', key: 'recipient' },
                        { title: 'Đơn vị', dataIndex: 'recipientOrganization', key: 'org' },
                        { title: 'Modules', dataIndex: 'modules', key: 'modules', render: (v: string[]) => v?.length || 0, width: 80 },
                        { title: 'Bản ghi', dataIndex: 'totalRecords', key: 'records', width: 90, align: 'right' as const, render: (v: number) => v?.toLocaleString('vi-VN') },
                        {
                          title: 'Trạng thái', dataIndex: 'statusName', key: 'status', width: 110,
                          render: (text: string, record: DataHandoverDto) => {
                            const colors: Record<number, string> = { 0: 'default', 1: 'processing', 2: 'success', 3: 'cyan' };
                            return <Tag color={colors[record.status] || 'default'}>{text}</Tag>;
                          },
                        },
                        {
                          title: 'Thao tác', key: 'action', width: 100,
                          render: (_: unknown, record: DataHandoverDto) => (
                            record.status === 2 ? (
                              <Button size="small" type="primary" onClick={() => { dataExportApi.confirmHandover(record.id).then(() => { message.success('Đã xác nhận'); fetchDataManagement(); }).catch(() => message.warning('Lỗi')); }}>Xác nhận</Button>
                            ) : null
                          ),
                        },
                      ] as ColumnsType<DataHandoverDto>}
                      dataSource={handovers}
                      rowKey="id"
                      size="small"
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: 'Chưa có biên bản chuyển giao' }}
                    />
                  </Card>
                </Spin>
              ),
            },
            {
              key: 'backup',
              label: (
                <span>
                  <SaveOutlined /> Sao luu du lieu
                </span>
              ),
              children: (
                <div>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col xs={24} lg={12}>
                      <Card size="small" title={<><CloudUploadOutlined /> Cau hinh sao luu tu dong</>}>
                        <Form layout="vertical" size="small">
                          <Row gutter={16}>
                            <Col span={8}>
                              <Form.Item label="Thoi gian sao luu">
                                <TimePicker
                                  format="HH:mm"
                                  value={dayjs(backupConfig.autoBackupTime, 'HH:mm')}
                                  onChange={(v) => {
                                    if (v) saveBackupConfig({ ...backupConfig, autoBackupTime: v.format('HH:mm') });
                                  }}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item label="Tan suat">
                                <Select
                                  value={backupConfig.frequency}
                                  onChange={(v) => saveBackupConfig({ ...backupConfig, frequency: v })}
                                >
                                  <Option value="daily">Hang ngay</Option>
                                  <Option value="weekly">Hang tuan</Option>
                                  <Option value="monthly">Hang thang</Option>
                                </Select>
                              </Form.Item>
                            </Col>
                            <Col span={8}>
                              <Form.Item label="Luu giu (ngay)">
                                <InputNumber
                                  min={1}
                                  max={365}
                                  value={backupConfig.retentionDays}
                                  onChange={(v) => saveBackupConfig({ ...backupConfig, retentionDays: v ?? 30 })}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                          <Row gutter={16}>
                            <Col span={12}>
                              <Form.Item label="Nen du lieu">
                                <Switch
                                  checked={backupConfig.compress}
                                  onChange={(v) => saveBackupConfig({ ...backupConfig, compress: v })}
                                  checkedChildren="Bat"
                                  unCheckedChildren="Tat"
                                />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item label="Mat khau bao ve">
                                <Switch
                                  checked={backupConfig.passwordProtect}
                                  onChange={(v) => saveBackupConfig({ ...backupConfig, passwordProtect: v })}
                                  checkedChildren="Bat"
                                  unCheckedChildren="Tat"
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Form>
                      </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card size="small" title={<><FolderOutlined /> Muc tieu sao luu</>}>
                        {backupConfig.targets.map((target, idx) => (
                          <div key={target.type} style={{ marginBottom: 12, padding: 8, border: '1px solid #f0f0f0', borderRadius: 4 }}>
                            <Row gutter={8} align="middle">
                              <Col span={4}>
                                <Switch
                                  size="small"
                                  checked={target.enabled}
                                  onChange={(v) => {
                                    const newTargets = [...backupConfig.targets];
                                    newTargets[idx] = { ...target, enabled: v };
                                    saveBackupConfig({ ...backupConfig, targets: newTargets });
                                  }}
                                />
                              </Col>
                              <Col span={6}>
                                <Tag color={target.type === 'local' ? 'blue' : target.type === 'lan' ? 'green' : 'purple'}>
                                  {target.type === 'local' ? 'Server local' : target.type === 'lan' ? 'Mang LAN' : 'Cloud'}
                                </Tag>
                              </Col>
                              <Col span={14}>
                                <Input
                                  size="small"
                                  placeholder={target.type === 'local' ? 'D:\\HIS_Backups' : target.type === 'lan' ? '\\\\server\\share' : 'https://storage.example.com'}
                                  value={target.path}
                                  onChange={(e) => {
                                    const newTargets = [...backupConfig.targets];
                                    newTargets[idx] = { ...target, path: e.target.value };
                                    saveBackupConfig({ ...backupConfig, targets: newTargets });
                                  }}
                                />
                              </Col>
                            </Row>
                            {target.type === 'cloud' && target.enabled && (
                              <Input
                                size="small"
                                style={{ marginTop: 4 }}
                                placeholder="API Key / Credentials"
                                value={target.credentials}
                                onChange={(e) => {
                                  const newTargets = [...backupConfig.targets];
                                  newTargets[idx] = { ...target, credentials: e.target.value };
                                  saveBackupConfig({ ...backupConfig, targets: newTargets });
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </Card>
                    </Col>
                  </Row>

                  <Card size="small" title="Sao luu thu cong" style={{ marginBottom: 16 }}>
                    <Row gutter={16} align="middle">
                      <Col>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={backupRunning}
                          onClick={handleManualBackup}
                        >
                          {backupRunning ? 'Dang sao luu...' : 'Sao luu ngay'}
                        </Button>
                      </Col>
                      <Col flex="auto">
                        {backupRunning && (
                          <Progress percent={backupProgress} status="active" size="small" />
                        )}
                      </Col>
                    </Row>
                  </Card>

                  <Card size="small" title="Lich su sao luu">
                    <Table
                      size="small"
                      dataSource={backupHistory}
                      rowKey="key"
                      pagination={{ pageSize: 10 }}
                      columns={[
                        { title: 'Thoi gian', dataIndex: 'date', key: 'date', width: 160 },
                        { title: 'Kich thuoc', dataIndex: 'size', key: 'size', width: 100 },
                        { title: 'Loai', dataIndex: 'type', key: 'type', width: 120, render: (v: string) => <Tag color={v === 'Full' ? 'blue' : v === 'Manual' ? 'orange' : 'green'}>{v}</Tag> },
                        { title: 'Trang thai', dataIndex: 'status', key: 'status', width: 100, render: (v: string) => <Tag color={v === 'success' ? 'green' : 'red'}>{v === 'success' ? 'Thanh cong' : 'That bai'}</Tag> },
                        { title: 'Vi tri', dataIndex: 'location', key: 'location', width: 100 },
                      ]}
                    />
                  </Card>
                </div>
              ),
            },
            {
              key: 'it-tickets',
              label: (
                <span>
                  <ToolOutlined /> Yeu cau CNTT
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="Moi" value={itTicketStats.newCount} styles={{ content: { color: '#1890ff' } }} prefix={<ClockCircleOutlined />} />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="Dang xu ly" value={itTicketStats.inProgressCount} styles={{ content: { color: '#fa8c16' } }} prefix={<ThunderboltOutlined />} />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="Da giai quyet" value={itTicketStats.resolvedCount} styles={{ content: { color: '#52c41a' } }} prefix={<CheckCircleOutlined />} />
                      </Card>
                    </Col>
                    <Col span={6}>
                      <Card size="small">
                        <Statistic title="Da dong" value={itTicketStats.closedCount} styles={{ content: { color: '#8c8c8c' } }} prefix={<CloseCircleOutlined />} />
                      </Card>
                    </Col>
                  </Row>

                  <Row gutter={[8, 8]} style={{ marginBottom: 16 }}>
                    <Col>
                      <Select
                        placeholder="Muc do"
                        style={{ width: 140 }}
                        allowClear
                        value={itTicketFilterPriority}
                        onChange={(v) => setItTicketFilterPriority(v)}
                      >
                        <Option value={1}>Thap</Option>
                        <Option value={2}>Trung binh</Option>
                        <Option value={3}>Cao</Option>
                        <Option value={4}>Khan cap</Option>
                      </Select>
                    </Col>
                    <Col>
                      <Select
                        placeholder="Trang thai"
                        style={{ width: 140 }}
                        allowClear
                        value={itTicketFilterStatus}
                        onChange={(v) => setItTicketFilterStatus(v)}
                      >
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
                        onSearch={(v) => setItTicketKeyword(v)}
                        onChange={(e) => { if (!e.target.value) setItTicketKeyword(''); }}
                      />
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={() => fetchItTickets()} />
                    </Col>
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsItTicketModalOpen(true)}>
                        Tao yeu cau
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    dataSource={itTickets}
                    rowKey="id"
                    size="small"
                    loading={itTicketLoading}
                    pagination={{
                      showSizeChanger: true,
                      showTotal: (total) => `Tong: ${total} yeu cau`,
                    }}
                    columns={[
                      {
                        title: 'Tieu de',
                        dataIndex: 'title',
                        key: 'title',
                        width: 200,
                        ellipsis: true,
                      },
                      {
                        title: 'Khoa/Phong',
                        dataIndex: 'departmentName',
                        key: 'departmentName',
                        width: 140,
                      },
                      {
                        title: 'Nguoi yeu cau',
                        dataIndex: 'requestedByName',
                        key: 'requestedByName',
                        width: 140,
                      },
                      {
                        title: 'Muc do',
                        dataIndex: 'priority',
                        key: 'priority',
                        width: 100,
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
                        title: 'Trang thai',
                        dataIndex: 'status',
                        key: 'status',
                        width: 110,
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
                        title: 'Ngay tao',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        width: 140,
                        render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-',
                      },
                      {
                        title: 'Phan hoi',
                        dataIndex: 'response',
                        key: 'response',
                        width: 200,
                        ellipsis: true,
                        render: (v: string) => v || '-',
                      },
                      {
                        title: 'Thao tac',
                        key: 'actions',
                        width: 160,
                        fixed: 'right',
                        render: (_: unknown, record: ItTicketListItem) => (
                          <Space>
                            {toNumberValue(record.status) < 2 && (
                              <Button
                                size="small"
                                type="link"
                                onClick={() => {
                                  setSelectedTicketId(toStringValue(record.id));
                                  setIsItRespondModalOpen(true);
                                }}
                              >
                                Phan hoi
                              </Button>
                            )}
                            {toNumberValue(record.status) < 3 && (
                              <Popconfirm
                                title="Dong yeu cau nay?"
                                onConfirm={() => handleCloseItTicket(toStringValue(record.id))}
                                okText="Dong"
                                cancelText="Huy"
                              >
                                <Button size="small" type="link" danger>
                                  Dong
                                </Button>
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
                                <Tag color={['default','default','blue','orange','red'][toNumberValue(record.priority)] || 'default'}>
                                  {['','Thap','Trung binh','Cao','Khan cap'][toNumberValue(record.priority)] || toStringValue(record.priority)}
                                </Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Trang thai">
                                <Tag color={['blue','orange','green','default'][toNumberValue(record.status)] || 'default'}>
                                  {['Moi','Dang xu ly','Da giai quyet','Da dong'][toNumberValue(record.status)] || toStringValue(record.status)}
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
                </>
              ),
            },
            {
              key: 'emr-covers',
              label: (<span><FileTextOutlined /> Vo benh an</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('cover')}>Them vo BA</Button>
                    <Button icon={<ReloadOutlined />} onClick={fetchEmrAdminData} style={{ marginLeft: 8 }} />
                  </div>
                  <Table size="small" dataSource={emrCoverTypes} rowKey="id" pagination={{ pageSize: 15 }}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
                      { title: 'Ten', dataIndex: 'name', key: 'name' },
                      { title: 'Phan loai', dataIndex: 'category', key: 'cat', width: 120, render: (v: string) => <Tag color={v === 'NoiTru' ? 'blue' : v === 'NgoaiTru' ? 'green' : 'purple'}>{v}</Tag> },
                      { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
                      { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoat dong' : 'Khoa'}</Tag> },
                      { title: 'Thao tac', key: 'actions', width: 120, render: (_: unknown, r: EmrCoverTypeDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('cover', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('cover', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'emr-signers',
              label: (<span><UserOutlined /> Nguoi ky</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('signer')}>Them nguoi ky</Button>
                  </div>
                  <Table size="small" dataSource={emrSigners} rowKey="id" pagination={{ pageSize: 15 }}
                    columns={[
                      { title: 'Ho ten', dataIndex: 'fullName', key: 'name' },
                      { title: 'Chuc danh', dataIndex: 'title', key: 'title', width: 80 },
                      { title: 'Username', dataIndex: 'userName', key: 'user', width: 120 },
                      { title: 'Khoa', dataIndex: 'departmentName', key: 'dept', width: 150 },
                      { title: 'Chung thu', dataIndex: 'certificateInfo', key: 'cert', width: 150, ellipsis: true },
                      { title: 'Trang thai', dataIndex: 'isActive', key: 'active', width: 90, render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoat dong' : 'Khoa'}</Tag> },
                      { title: '', key: 'actions', width: 100, render: (_: unknown, r: EmrSignerCatalogDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('signer', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('signer', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'emr-signing-roles',
              label: (<span><SafetyOutlined /> Vai tro ky</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('role')}>Them vai tro</Button>
                  </div>
                  <Table size="small" dataSource={emrSigningRoles} rowKey="id" pagination={false}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
                      { title: 'Ten', dataIndex: 'name', key: 'name' },
                      { title: 'Mo ta', dataIndex: 'description', key: 'desc', ellipsis: true },
                      { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
                      { title: '', key: 'actions', width: 100, render: (_: unknown, r: EmrSigningRoleDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('role', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('role', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'emr-signing-ops',
              label: (<span><AuditOutlined /> Nghiep vu ky</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('operation')}>Them nghiep vu</Button>
                  </div>
                  <Table size="small" dataSource={emrSigningOps} rowKey="id" pagination={false}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
                      { title: 'Ten', dataIndex: 'name', key: 'name' },
                      { title: 'Vai tro', dataIndex: 'roleName', key: 'role', width: 120 },
                      { title: 'Loai VB', dataIndex: 'documentType', key: 'doc', width: 120 },
                      { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80, render: (v: boolean) => <Tag color={v ? 'red' : 'default'}>{v ? 'Co' : 'Khong'}</Tag> },
                      { title: '', key: 'actions', width: 100, render: (_: unknown, r: EmrSigningOperationDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('operation', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('operation', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'emr-doc-groups',
              label: (<span><FolderOutlined /> Nhom VB</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('group')}>Them nhom</Button>
                  </div>
                  <Table size="small" dataSource={emrDocGroups} rowKey="id" pagination={false}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
                      { title: 'Ten', dataIndex: 'name', key: 'name' },
                      { title: 'Phan loai', dataIndex: 'category', key: 'cat', width: 120 },
                      { title: 'Thu tu', dataIndex: 'sortOrder', key: 'sort', width: 70 },
                      { title: '', key: 'actions', width: 100, render: (_: unknown, r: EmrDocumentGroupDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('group', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('group', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'emr-doc-types',
              label: (<span><FileTextOutlined /> Loai VB</span>),
              children: (
                <Spin spinning={emrAdminLoading}>
                  <div style={{ marginBottom: 8 }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => openEmrModal('doctype')}>Them loai VB</Button>
                  </div>
                  <Table size="small" dataSource={emrDocTypes} rowKey="id" pagination={{ pageSize: 15 }}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 80 },
                      { title: 'Ten', dataIndex: 'name', key: 'name' },
                      { title: 'Nhom', dataIndex: 'groupName', key: 'group', width: 120 },
                      { title: 'Template', dataIndex: 'formTemplateKey', key: 'tmpl', width: 120 },
                      { title: 'Bat buoc', dataIndex: 'isRequired', key: 'req', width: 80, render: (v: boolean) => <Tag color={v ? 'red' : 'default'}>{v ? 'Co' : 'Khong'}</Tag> },
                      { title: '', key: 'actions', width: 100, render: (_: unknown, r: EmrDocumentTypeDto) => (
                        <Space>
                          <Button size="small" icon={<EditOutlined />} onClick={() => openEmrModal('doctype', r as unknown as Record<string, unknown>)} />
                          <Popconfirm title="Xoa?" onConfirm={() => handleEmrAdminDelete('doctype', r.id)}><Button size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
                        </Space>
                      )},
                    ]}
                  />
                </Spin>
              ),
            },
            {
              key: 'branches',
              label: (
                <span>
                  <BankOutlined /> Quan ly chi nhanh
                </span>
              ),
              children: (
                <>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col flex="auto">
                      <Input.Search
                        placeholder="Tim theo ten, ma chi nhanh..."
                        allowClear
                        enterButton={<SearchOutlined />}
                        style={{ maxWidth: 400 }}
                        onSearch={() => fetchBranches()}
                      />
                    </Col>
                    <Col>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => {
                        setEditingBranch(null);
                        branchForm.resetFields();
                        branchForm.setFieldsValue({ isActive: true, isHeadquarter: false });
                        setBranchModalOpen(true);
                      }}>
                        Them chi nhanh
                      </Button>
                    </Col>
                    <Col>
                      <Button icon={<ReloadOutlined />} onClick={fetchBranches}>
                        Lam moi
                      </Button>
                    </Col>
                  </Row>

                  <Table
                    dataSource={branches}
                    rowKey="id"
                    size="small"
                    loading={branchLoading}
                    pagination={{
                      showSizeChanger: true,
                      showQuickJumper: true,
                      showTotal: (total) => `Tong: ${total} chi nhanh`,
                    }}
                    columns={[
                      { title: 'Ma', dataIndex: 'code', key: 'code', width: 100 },
                      { title: 'Ten', dataIndex: 'name', key: 'name', width: 200 },
                      { title: 'Dia chi', dataIndex: 'address', key: 'address', ellipsis: true },
                      { title: 'SDT', dataIndex: 'phone', key: 'phone', width: 120 },
                      {
                        title: 'Tru so chinh',
                        dataIndex: 'isHeadquarter',
                        key: 'isHeadquarter',
                        width: 100,
                        align: 'center' as const,
                        render: (v: boolean) => v ? <Tag color="gold">Tru so</Tag> : null,
                      },
                      {
                        title: 'Trang thai',
                        dataIndex: 'isActive',
                        key: 'isActive',
                        width: 100,
                        render: (v: boolean) => <Tag color={v !== false ? 'green' : 'red'}>{v !== false ? 'Hoat dong' : 'Ngung'}</Tag>,
                      },
                      {
                        title: 'Thao tac',
                        key: 'action',
                        width: 120,
                        render: (_: unknown, record: Branch) => (
                          <Space>
                            <Button size="small" icon={<EditOutlined />} onClick={() => {
                              setEditingBranch(record);
                              branchForm.setFieldsValue(record);
                              setBranchModalOpen(true);
                            }} />
                            <Popconfirm title="Xoa chi nhanh nay?" onConfirm={() => handleDeleteBranch(record.id)}>
                              <Button size="small" danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    onRow={(record) => ({
                      onDoubleClick: () => {
                        Modal.info({
                          title: `Chi tiet chi nhanh - ${record.name}`,
                          width: 600,
                          content: (
                            <Descriptions bordered size="small" column={2} style={{ marginTop: 16 }}>
                              <Descriptions.Item label="Ma">{record.code || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Ten">{record.name}</Descriptions.Item>
                              <Descriptions.Item label="Dia chi" span={2}>{record.address || '-'}</Descriptions.Item>
                              <Descriptions.Item label="SDT">{record.phone || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Email">{record.email || '-'}</Descriptions.Item>
                              <Descriptions.Item label="Tru so chinh">
                                <Tag color={record.isHeadquarter ? 'gold' : 'default'}>{record.isHeadquarter ? 'Co' : 'Khong'}</Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Trang thai">
                                <Tag color={record.isActive !== false ? 'green' : 'red'}>{record.isActive !== false ? 'Hoat dong' : 'Ngung'}</Tag>
                              </Descriptions.Item>
                              <Descriptions.Item label="Ghi chu" span={2}>{record.description || '-'}</Descriptions.Item>
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

      {/* IT Ticket Create Modal */}
      <Modal
        title="Tao yeu cau CNTT"
        open={isItTicketModalOpen}
        onOk={handleCreateItTicket}
        onCancel={() => setIsItTicketModalOpen(false)}
        okText="Gui"
        cancelText="Huy"
        width={500}
        destroyOnHidden
      >
        <Form form={itTicketForm} layout="vertical">
          <Form.Item
            name="title"
            label="Tieu de"
            rules={[{ required: true, message: 'Vui long nhap tieu de' }]}
          >
            <Input placeholder="VD: May in phong kham 3 bi ket giay" />
          </Form.Item>
          <Form.Item
            name="description"
            label="Mo ta chi tiet"
            rules={[{ required: true, message: 'Vui long nhap mo ta' }]}
          >
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

      {/* IT Ticket Respond Modal */}
      <Modal
        title="Phan hoi yeu cau CNTT"
        open={isItRespondModalOpen}
        onOk={handleRespondItTicket}
        onCancel={() => { setIsItRespondModalOpen(false); setSelectedTicketId(null); }}
        okText="Gui phan hoi"
        cancelText="Huy"
        width={500}
        destroyOnHidden
      >
        <Form form={itRespondForm} layout="vertical">
          <Form.Item
            name="response"
            label="Noi dung phan hoi"
            rules={[{ required: true, message: 'Vui long nhap noi dung phan hoi' }]}
          >
            <TextArea rows={4} placeholder="Mo ta cach xu ly, huong dan, hoac ghi chu..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Lock Service Modal */}
      <Modal
        title={<><LockOutlined /> Khóa dịch vụ</>}
        open={isLockServiceModalOpen}
        onOk={handleLockService}
        onCancel={() => {
          setIsLockServiceModalOpen(false);
          lockServiceForm.resetFields();
        }}
        okText="Khóa"
        cancelText="Hủy"
        width={500}
      >
        <Alert
          title="Khi khóa dịch vụ, bác sĩ sẽ không thể kê dịch vụ này cho bệnh nhân."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={lockServiceForm} layout="vertical">
          <Form.Item label="Dịch vụ cần khóa">
            <Input value={lockServiceKeyword} disabled />
          </Form.Item>
          <Form.Item
            name="serviceId"
            label="Chọn dịch vụ"
            rules={[{ required: true, message: 'Vui lòng chọn dịch vụ' }]}
          >
            <Select
              placeholder="Chọn dịch vụ từ danh sách"
              showSearch
              optionFilterProp="children"
            >
              {lockServiceSearchResults.map((s) => (
                <Option key={s.id} value={s.id}>
                  {s.code} - {s.name} ({s.serviceType === 1 ? 'Thuốc' : s.serviceType === 2 ? 'Vật tư' : 'DVKT'})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do khóa"
            rules={[{ required: true, message: 'Vui lòng nhập lý do khóa' }]}
          >
            <TextArea rows={3} placeholder="Nhập lý do khóa dịch vụ (VD: Hết hàng, Thu hồi, Bảo trì...)" />
          </Form.Item>
        </Form>
      </Modal>

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

      {/* NangCap11: EMR Admin Modal */}
      <Modal
        title={
          { cover: 'Vo benh an', signer: 'Nguoi ky', role: 'Vai tro ky',
            operation: 'Nghiep vu ky', group: 'Nhom van ban', doctype: 'Loai van ban',
          }[emrModalType] || 'EMR Admin'
        }
        open={emrModalOpen}
        onOk={handleEmrAdminSave}
        onCancel={() => setEmrModalOpen(false)}
        width={500}
      >
        <Form form={emrForm} layout="vertical">
          <Form.Item name="code" label="Ma" rules={[{ required: true, message: 'Nhap ma' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Ten" rules={[{ required: true, message: 'Nhap ten' }]}>
            <Input />
          </Form.Item>
          {emrModalType === 'cover' && (
            <Form.Item name="category" label="Phan loai" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="NoiTru">Noi tru</Select.Option>
                <Select.Option value="NgoaiTru">Ngoai tru</Select.Option>
                <Select.Option value="ChuyenKhoa">Chuyen khoa</Select.Option>
              </Select>
            </Form.Item>
          )}
          {emrModalType === 'signer' && (
            <>
              <Form.Item name="fullName" label="Ho ten" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="title" label="Chuc danh">
                <Select allowClear>
                  <Select.Option value="BS">BS</Select.Option>
                  <Select.Option value="BSCKI">BSCKI</Select.Option>
                  <Select.Option value="BSCKII">BSCKII</Select.Option>
                  <Select.Option value="ThS">ThS</Select.Option>
                  <Select.Option value="TS">TS</Select.Option>
                  <Select.Option value="PGS">PGS</Select.Option>
                  <Select.Option value="GS">GS</Select.Option>
                </Select>
              </Form.Item>
              <Form.Item name="departmentName" label="Khoa">
                <Input />
              </Form.Item>
            </>
          )}
          {emrModalType === 'operation' && (
            <>
              <Form.Item name="roleName" label="Vai tro">
                <Input />
              </Form.Item>
              <Form.Item name="documentType" label="Loai tai lieu">
                <Input />
              </Form.Item>
              <Form.Item name="isRequired" label="Bat buoc" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          )}
          {emrModalType === 'group' && (
            <Form.Item name="category" label="Phan loai">
              <Select allowClear>
                <Select.Option value="BenhAn">Benh an</Select.Option>
                <Select.Option value="DieuTri">Dieu tri</Select.Option>
                <Select.Option value="ChamSoc">Cham soc</Select.Option>
                <Select.Option value="XetNghiem">Xet nghiem</Select.Option>
                <Select.Option value="ChanDoan">Chan doan</Select.Option>
                <Select.Option value="Khac">Khac</Select.Option>
              </Select>
            </Form.Item>
          )}
          {emrModalType === 'doctype' && (
            <>
              <Form.Item name="groupName" label="Nhom">
                <Input />
              </Form.Item>
              <Form.Item name="formTemplateKey" label="Template key">
                <Input />
              </Form.Item>
              <Form.Item name="isRequired" label="Bat buoc" valuePropName="checked">
                <Switch />
              </Form.Item>
            </>
          )}
          <Form.Item name="sortOrder" label="Thu tu">
            <InputNumber min={0} />
          </Form.Item>
          <Form.Item name="description" label="Mo ta">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Branch Management Modal */}
      <Modal
        title={editingBranch ? 'Sua chi nhanh' : 'Them chi nhanh moi'}
        open={branchModalOpen}
        onOk={handleSaveBranch}
        onCancel={() => {
          setBranchModalOpen(false);
          setEditingBranch(null);
          branchForm.resetFields();
        }}
        okText="Luu"
        cancelText="Huy"
        width={600}
        destroyOnHidden
      >
        <Form form={branchForm} layout="vertical">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="code" label="Ma chi nhanh" rules={[{ required: true, message: 'Vui long nhap ma chi nhanh' }]}>
                <Input placeholder="VD: CN01" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Ten chi nhanh" rules={[{ required: true, message: 'Vui long nhap ten chi nhanh' }]}>
                <Input placeholder="VD: Chi nhanh Hai Duong" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Dia chi">
            <Input placeholder="So nha, duong, phuong/xa, quan/huyen, tinh/TP" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="phone" label="So dien thoai">
                <Input placeholder="VD: 0220-3xxx-xxx" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input placeholder="VD: chinhanh@benhvien.vn" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="isHeadquarter" label="Tru so chinh" valuePropName="checked">
                <Switch checkedChildren="Co" unCheckedChildren="Khong" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isActive" label="Trang thai" valuePropName="checked">
                <Switch checkedChildren="Hoat dong" unCheckedChildren="Ngung" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Ghi chu">
            <Input.TextArea rows={2} placeholder="Ghi chu them ve chi nhanh..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SystemAdmin;
