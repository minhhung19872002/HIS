import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select, Switch, Form, DatePicker, Checkbox } from 'antd';
import type { AxiosError } from 'axios';
import { adminApi, catalogApi } from '../api/system';
import type {
  SystemUserDto, RoleDto, SystemConfigDto, UserSessionDto, CreateUserDto, UpdateUserDto,
  RoleAssignmentDto, SystemNotificationDto, LockedServiceDto, PermissionDto,
} from '../api/system';
import { getAuditLogs, exportAuditLogs } from '../api/audit';
import type { AuditLogDto, AuditLogSearchDto } from '../api/audit';
import { applyServerErrors, type ServerValidationError } from '../../../utils/formError';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  ModalShell, ActBtn, Btn, Pager, tk, te, cf,
  type ColumnDef, type TopTab,
} from '@/_v2kit';
import ItTicketsPanel from './ItTicketsPanel';
import AccessMatrixPanel from './AccessMatrixPanel';
import CompliancePanel from './CompliancePanel';
import DataManagementPanel from './DataManagementPanel';
import HealthPanel from './HealthPanel';
import EmrAdminPanel from './EmrAdminPanel';
import DelegationPanel from './DelegationPanel';
import DataPermissionPanel from './DataPermissionPanel'; // NangCap26 I.15/I.16

// Department có 2 shape (id|departmentId, name|departmentName) khi đến từ catalog API khác nhau
interface RawDepartmentLite { id?: string; departmentId?: string; name?: string; departmentName?: string }
// Chi nhánh từ /catalog/branches (R3 đa cơ sở)
interface RawBranchLite { id?: string; branchName?: string }
// Chi nhánh đầy đủ cho tab Branches
interface BranchRecord { id: string; code?: string; name: string; address?: string; phone?: string; email?: string; isHeadquarter?: boolean; isActive?: boolean; description?: string }
// Dịch vụ tìm kiếm khi khóa
interface ServiceSearchItem { id: string; code: string; name: string; stype: number }

type AdminTab = 'users' | 'roles' | 'audit' | 'config' | 'sessions' | 'notifications' | 'locked-services' | 'branches'
  | 'it-tickets' | 'access-matrix' | 'compliance' | 'data-management' | 'health' | 'emr-admin' | 'delegation'
  | 'data-permission'; // NangCap26 I.15/I.16 — quyền dữ liệu row-level
const TABS: TopTab<AdminTab>[] = [
  { v: 'users',           l: 'Người dùng',         ic: 'users' },
  { v: 'roles',           l: 'Vai trò & quyền',     ic: 'shield' },
  { v: 'data-permission', l: 'Quyền dữ liệu',        ic: 'lock' },
  { v: 'sessions',        l: 'Phiên đăng nhập',     ic: 'list' },
  { v: 'notifications',   l: 'Thông báo',            ic: 'bell' },
  { v: 'locked-services', l: 'Khóa dịch vụ',        ic: 'lock' },
  { v: 'branches',        l: 'Chi nhánh',            ic: 'external' },
  { v: 'audit',           l: 'Audit log',            ic: 'list' },
  { v: 'config',          l: 'Cấu hình HT',          ic: 'settings' },
  { v: 'it-tickets',      l: 'Yêu cầu CNTT',        ic: 'message-square' },
  { v: 'access-matrix',   l: 'Ma trận quyền',       ic: 'grid' },
  { v: 'compliance',      l: 'ATTT/Tuân thủ',       ic: 'check' },
  { v: 'data-management', l: 'Dữ liệu',              ic: 'download' },
  { v: 'health',          l: 'Giám sát HT',          ic: 'heart' },
  { v: 'emr-admin',       l: 'EMR Admin',            ic: 'file-text' },
  { v: 'delegation',      l: 'Ủy quyền tạm',         ic: 'share' },
];

function roleList(u: SystemUserDto): (string | RoleDto)[] { return (u.roles ?? []) as unknown as (string | RoleDto)[]; }
function roleNames(u: SystemUserDto): string {
  const names = roleList(u).map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean) as string[];
  return names.length ? names.join(', ') : '—';
}
function isAdminUser(u: SystemUserDto): boolean {
  return roleList(u).some((r) => {
    const n = (typeof r === 'string' ? r : (r?.name || r?.code || '')).toLowerCase();
    return n.includes('admin') || n.includes('quản trị') || n.includes('quan tri');
  });
}

const SystemAdminV2: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('users');
  const [keyword, setKeyword] = useState('');
  // ─── Users/Roles/Config/Audit ───
  const [users, setUsers] = useState<SystemUserDto[]>([]);
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [audit, setAudit] = useState<AuditLogDto[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditFilters, setAuditFilters] = useState<Pick<AuditLogSearchDto, 'module' | 'action' | 'entityType' | 'fromDate' | 'toDate'>>({
    fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    toDate: dayjs().format('YYYY-MM-DD'),
  });
  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  // ─── New tab data ───
  const [notifications, setNotifications] = useState<SystemNotificationDto[]>([]);
  const [lockedServices, setLockedServices] = useState<LockedServiceDto[]>([]);
  const [branchFull, setBranchFull] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<SystemUserDto | null>(null);
  const [selBranch, setSelBranch] = useState<BranchRecord | null>(null);
  const [selAudit, setSelAudit] = useState<AuditLogDto | null>(null);

  // ─── User modal ───
  const [userModal, setUserModal] = useState<'new' | 'edit' | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  // ─── Role modal + permissions ───
  const [roleModal, setRoleModal] = useState<'new' | 'edit' | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDto[]>([]);
  const [rolePermIds, setRolePermIds] = useState<string[]>([]);
  // ─── Config modal ───
  const [cfgModal, setCfgModal] = useState<SystemConfigDto | null>(null);
  // ─── Notification modal ───
  const [notifModal, setNotifModal] = useState(false);
  // ─── Lock service modal ───
  const [lockModal, setLockModal] = useState(false);
  const [lockKw, setLockKw] = useState('');
  const [lockResults, setLockResults] = useState<ServiceSearchItem[]>([]);
  const [lockSearching, setLockSearching] = useState(false);
  // ─── Branch modal ───
  const [branchModal, setBranchModal] = useState<'new' | 'edit' | null>(null);
  const [editingBranch, setEditingBranch] = useState<BranchRecord | null>(null);

  const [saving, setSaving] = useState(false);
  const [permSearch, setPermSearch] = useState('');
  const [userF] = Form.useForm();
  const [roleF] = Form.useForm();
  const [cfgF] = Form.useForm();
  const [notifF] = Form.useForm();
  const [lockF] = Form.useForm();
  const [branchF] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const [u, s, r, d, b] = await Promise.allSettled([
          adminApi.getUsers(), adminApi.getActiveSessions(), adminApi.getRoles(true), catalogApi.getDepartments(),
          catalogApi.getBranches({ isActive: true }),
        ]);
        if (u.status === 'fulfilled') setUsers(Array.isArray(u.value.data) ? u.value.data : []);
        if (s.status === 'fulfilled') setSessions(Array.isArray(s.value.data) ? s.value.data : []);
        if (r.status === 'fulfilled') setRoles(Array.isArray(r.value.data) ? r.value.data : []);
        if (d.status === 'fulfilled') {
          const arr: RawDepartmentLite[] = Array.isArray(d.value.data) ? d.value.data : [];
          setDepts(
            arr
              .map((x) => ({ id: x.id || x.departmentId, name: x.name || x.departmentName }))
              .filter((x): x is { id: string; name: string } => !!x.id)
          );
        }
        if (b.status === 'fulfilled') {
          const arr: RawBranchLite[] = Array.isArray(b.value.data) ? b.value.data : [];
          setBranches(
            arr
              .map((x) => ({ id: x.id, name: x.branchName || '' }))
              .filter((x): x is { id: string; name: string } => !!x.id)
          );
        }
      } catch { /* keep current */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') { const r = await adminApi.getUsers(); setUsers(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'roles') { const r = await adminApi.getRoles(true); setRoles(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'config') { const r = await adminApi.getSystemConfigs(); setConfigs(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'sessions') { const r = await adminApi.getActiveSessions(); setSessions(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'notifications') { const r = await adminApi.getSystemNotifications(); setNotifications(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'locked-services') { const r = await adminApi.getLockedServices(); setLockedServices(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'branches') { const r = await catalogApi.getBranches(); setBranchFull((Array.isArray(r.data) ? r.data : []) as BranchRecord[]); }
      else if (tab === 'audit') {
        const r = await getAuditLogs({ ...auditFilters, keyword: keyword || undefined, pageIndex: auditPage - 1, pageSize: 50 });
        setAudit(Array.isArray(r.data?.items) ? r.data.items : []);
        setAuditTotal(r.data?.totalCount ?? 0);
      }
      // else: it-tickets / access-matrix / compliance / data-management / health / emr-admin = self-loading panels, no-op
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [tab, keyword, auditFilters, auditPage]);
  useEffect(() => { load(); }, [load]);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id || r.code, label: r.name })), [roles]);
  const deptOptions = useMemo(() => depts.map((d) => ({ value: d.id, label: d.name })), [depts]);
  const branchOptions = useMemo(() => branches.map((b) => ({ value: b.id, label: b.name })), [branches]);

  // ─── User CRUD ───
  const openNewUser = () => { setEditUserId(null); userF.resetFields(); userF.setFieldsValue({ isActive: true, roleIds: [] }); setUserModal('new'); };
  const openEditUser = (u: SystemUserDto) => {
    const ids = roleList(u).map((r) => {
      if (typeof r !== 'string') return r.id || r.code;
      const m = roles.find((x) => x.name === r || x.code === r); return m?.id || m?.code;
    }).filter(Boolean) as string[];
    setEditUserId(u.id || null);
    userF.setFieldsValue({
      username: u.username, fullName: u.fullName, email: u.email || '', phoneNumber: u.phone || u.phoneNumber || '',
      employeeId: u.employeeCode || '', departmentId: u.departmentId || undefined, branchId: u.branchId || undefined,
      roleIds: ids, isActive: u.isActive !== false,
    });
    setUserModal('edit');
  };
  const submitUser = async () => {
    let v: Record<string, unknown>;
    try { v = await userF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const roleIds = v.roleIds as string[];
      const scopeType = (v.scopeType as RoleAssignmentDto['scopeType']) || 'ORG';
      const validTo = v.validTo ? (v.validTo as import('dayjs').Dayjs).toISOString() : undefined;
      const grantReason = (v.grantReason as string) || undefined;
      const roleAssignments: RoleAssignmentDto[] = roleIds.map((id) => ({
        roleId: id, scopeType, validTo, grantReason,
      }));

      if (userModal === 'new') {
        const dto: CreateUserDto = {
          username: (v.username as string).trim(), fullName: (v.fullName as string).trim(),
          email: (v.email as string) || undefined, phoneNumber: (v.phoneNumber as string) || undefined,
          employeeId: (v.employeeId as string) || undefined, departmentId: (v.departmentId as string) || undefined,
          branchId: (v.branchId as string) || undefined,
          roleIds, roleAssignments, initialPassword: (v.initialPassword as string) || undefined,
        };
        await adminApi.createUser(dto); tk('Đã tạo người dùng');
      } else {
        const dto: UpdateUserDto = {
          fullName: (v.fullName as string).trim(), email: (v.email as string) || undefined,
          phoneNumber: (v.phoneNumber as string) || undefined, employeeId: (v.employeeId as string) || undefined,
          departmentId: (v.departmentId as string) || undefined, branchId: (v.branchId as string) || undefined,
          roleIds, roleAssignments, isActive: v.isActive as boolean,
        };
        await adminApi.updateUser(editUserId!, dto); tk('Đã cập nhật người dùng');
      }
      setUserModal(null); load();
    } catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      if (!applyServerErrors(userF, e)) te(ax?.response?.data?.message || 'Lưu thất bại');
    }
    finally { setSaving(false); }
  };
  const lockToggle = (u: SystemUserDto) => {
    if (u.isLocked) cf(`Mở khoá tài khoản "${u.username}"?`, async () => { try { await adminApi.unlockUser(u.id!); tk('Đã mở khoá'); load(); } catch { te('Thất bại'); } }, { confirm: 'Mở khoá' });
    else cf(`Khoá tài khoản "${u.username}"?`, async () => { try { await adminApi.lockUser(u.id!, 'Khoá bởi quản trị viên'); tk('Đã khoá'); load(); } catch { te('Thất bại'); } }, { tone: 'crit', confirm: 'Khoá' });
  };
  const resetPw = (u: SystemUserDto) => cf(`Đặt lại mật khẩu cho "${u.username}"?`, async () => { try { await adminApi.resetPassword(u.id!); tk('Đã đặt lại mật khẩu (gửi cho người dùng)'); } catch { te('Thất bại'); } }, { confirm: 'Reset' });
  const deleteUser = (u: SystemUserDto) => {
    if (isAdminUser(u)) { te('Không thể xoá tài khoản quản trị viên'); return; }
    cf(`Xoá tài khoản "${u.username}"? Thao tác không thể hoàn tác.`, async () => {
      try { await adminApi.deleteUser(u.id!); tk('Đã xoá tài khoản'); load(); } catch { te('Xoá thất bại'); }
    }, { tone: 'crit', confirm: 'Xoá' });
  };

  // ─── Role CRUD ───
  const ensurePermissions = () => {
    if (!allPermissions.length)
      adminApi.getPermissions().then((r) => {
        const data: PermissionDto[] = Array.isArray(r) ? r : (r as { data?: PermissionDto[] })?.data ?? [];
        setAllPermissions(data);
      }).catch(() => {});
  };
  const openNewRole = () => {
    setEditRoleId(null); setRolePermIds([]); setPermSearch('');
    roleF.resetFields(); roleF.setFieldsValue({ isActive: true, isSystemRole: false });
    ensurePermissions(); setRoleModal('new');
  };
  const openEditRole = (r: RoleDto) => {
    setEditRoleId(r.id || null); setRolePermIds([]); setPermSearch('');
    roleF.setFieldsValue({ code: r.code, name: r.name, description: r.description || '', isSystemRole: r.isSystemRole, isActive: r.isActive });
    if (r.id) adminApi.getRolePermissions(r.id).then((raw) => {
      const ps: PermissionDto[] = Array.isArray(raw) ? raw : (raw as { data?: PermissionDto[] })?.data ?? [];
      setRolePermIds(ps.map(p => p.id!).filter(Boolean));
    }).catch(() => {});
    ensurePermissions(); setRoleModal('edit');
  };
  const submitRole = async () => {
    let v: Record<string, unknown>;
    try { v = await roleF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const res = await adminApi.saveRole({ id: editRoleId || undefined, code: (v.code as string).trim(), name: (v.name as string).trim(), description: (v.description as string) || '', isSystemRole: !!v.isSystemRole, isActive: v.isActive !== false } as RoleDto);
      const savedId = editRoleId || (res?.data as RoleDto | null)?.id;
      if (savedId && rolePermIds.length >= 0)
        await adminApi.updateRolePermissions(savedId, rolePermIds).catch(() => {});
      tk('Đã lưu vai trò'); setRoleModal(null); load();
    } catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      if (!applyServerErrors(roleF, e)) te(ax?.response?.data?.message || 'Lưu thất bại');
    }
    finally { setSaving(false); }
  };
  const delRole = (r: RoleDto) => {
    if (r.isSystemRole) { te('Không thể xoá vai trò hệ thống'); return; }
    cf(`Xoá vai trò "${r.name}"?`, async () => { try { await adminApi.deleteRole(r.id!); tk('Đã xoá'); load(); } catch { te('Xoá thất bại'); } }, { tone: 'crit', confirm: 'Xoá' });
  };

  // ─── Config update ───
  const openCfg = (c: SystemConfigDto) => { setCfgModal(c); cfgF.setFieldsValue({ configValue: c.configValue || '' }); };
  const submitCfg = async () => {
    if (!cfgModal) return;
    let v: Record<string, unknown>;
    try { v = await cfgF.validateFields(); } catch { return; }
    setSaving(true);
    try { await adminApi.saveSystemConfig({ ...cfgModal, configValue: v.configValue as string }); tk('Đã lưu cấu hình'); setCfgModal(null); load(); }
    catch (e: unknown) {
      const ax = e as AxiosError<ServerValidationError>;
      if (!applyServerErrors(cfgF, e)) te(ax?.response?.data?.message || 'Lưu thất bại');
    }
    finally { setSaving(false); }
  };

  // ─── Sessions: terminate ───
  const kickSession = (s: UserSessionDto) => cf(`Kết thúc phiên của "${s.fullName || s.username}"?`, async () => {
    try { await adminApi.terminateSession(s.id!); tk('Đã kết thúc phiên'); load(); } catch { te('Thất bại'); }
  }, { tone: 'crit', confirm: 'Kick' });

  // ─── Notifications: send ───
  const submitNotif = async () => {
    let v: Record<string, unknown>;
    try { v = await notifF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await adminApi.saveSystemNotification({
        title: v.title as string, content: v.content as string,
        notificationType: (v.notificationType as string) || 'Info',
        priority: 'Normal', isActive: true,
        targetUsers: v.targetUserId ? [v.targetUserId as string] : undefined,
        targetRoles: v.targetRoleId ? [v.targetRoleId as string] : undefined,
        startDate: new Date().toISOString(),
      } as SystemNotificationDto);
      tk('Đã gửi thông báo'); setNotifModal(false); notifF.resetFields(); load();
    } catch { te('Gửi thất bại'); }
    finally { setSaving(false); }
  };

  // ─── Locked services: search + lock/unlock ───
  const searchLockServices = async (kw: string) => {
    if (!kw.trim()) { setLockResults([]); return; }
    setLockSearching(true);
    try {
      const [ex, para, med] = await Promise.allSettled([
        catalogApi.getExaminationServices(kw), catalogApi.getParaclinicalServices(kw), catalogApi.getMedicines({ keyword: kw }),
      ]);
      const res: ServiceSearchItem[] = [];
      if (ex.status === 'fulfilled') { const arr = Array.isArray(ex.value.data) ? ex.value.data : (ex.value.data as { items?: unknown[] })?.items ?? []; (arr as Record<string, unknown>[]).forEach((s) => res.push({ id: String(s.id || ''), code: String(s.serviceCode || s.code || ''), name: String(s.serviceName || s.name || ''), stype: 3 })); }
      if (para.status === 'fulfilled') { const arr = Array.isArray(para.value.data) ? para.value.data : (para.value.data as { items?: unknown[] })?.items ?? []; (arr as Record<string, unknown>[]).forEach((s) => res.push({ id: String(s.id || ''), code: String(s.serviceCode || s.code || ''), name: String(s.serviceName || s.name || ''), stype: 3 })); }
      if (med.status === 'fulfilled') { const arr = Array.isArray(med.value.data) ? med.value.data : (med.value.data as { items?: unknown[] })?.items ?? []; (arr as Record<string, unknown>[]).forEach((s) => res.push({ id: String(s.id || ''), code: String(s.medicineCode || s.code || ''), name: String(s.medicineName || s.name || ''), stype: 1 })); }
      setLockResults(res.slice(0, 50));
    } catch { setLockResults([]); }
    finally { setLockSearching(false); }
  };
  const submitLock = async () => {
    let v: Record<string, unknown>;
    try { v = await lockF.validateFields(); } catch { return; }
    setSaving(true);
    try { await adminApi.lockService(v.serviceId as string, v.reason as string); tk('Đã khóa dịch vụ'); setLockModal(false); lockF.resetFields(); setLockKw(''); setLockResults([]); load(); }
    catch { te('Khóa thất bại'); }
    finally { setSaving(false); }
  };
  const unlockSvc = (s: LockedServiceDto) => cf(`Mở khóa dịch vụ "${(s as unknown as Record<string, unknown>).serviceName || s.id}"?`, async () => {
    try { await adminApi.unlockService(String((s as unknown as Record<string, unknown>).serviceId || s.id)); tk('Đã mở khóa'); load(); } catch { te('Thất bại'); }
  }, { confirm: 'Mở khóa' });

  // ─── Branches CRUD ───
  const openNewBranch = () => { setEditingBranch(null); branchF.resetFields(); branchF.setFieldsValue({ isActive: true, isHeadquarter: false }); setBranchModal('new'); };
  const openEditBranch = (b: BranchRecord) => { setEditingBranch(b); branchF.setFieldsValue(b); setBranchModal('edit'); };
  const submitBranch = async () => {
    let v: Record<string, unknown>;
    try { v = await branchF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const data = editingBranch ? { ...v, id: editingBranch.id } : v;
      await catalogApi.saveBranch(data); tk(editingBranch ? 'Đã cập nhật chi nhánh' : 'Đã thêm chi nhánh');
      setBranchModal(null); setEditingBranch(null); branchF.resetFields(); load();
    } catch { te('Lưu thất bại'); }
    finally { setSaving(false); }
  };
  const delBranch = (b: BranchRecord) => cf(`Xoá chi nhánh "${b.name}"?`, async () => {
    try { await catalogApi.deleteBranch(b.id); tk('Đã xoá chi nhánh'); load(); } catch { te('Xoá thất bại'); }
  }, { tone: 'crit', confirm: 'Xoá' });

  // ─── Filter ───
  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) return users;
    const q = keyword.toLowerCase();
    return users.filter((u) => u.username.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || roleNames(u).toLowerCase().includes(q));
  }, [users, keyword]);
  const filteredRoles = useMemo(() => {
    if (!keyword.trim()) return roles;
    const q = keyword.toLowerCase();
    return roles.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [roles, keyword]);
  const filteredConfigs = useMemo(() => {
    if (!keyword.trim()) return configs;
    const q = keyword.toLowerCase();
    return configs.filter((c) => c.configKey.toLowerCase().includes(q) || (c.category || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [configs, keyword]);
  const filteredBranches = useMemo(() => {
    if (!keyword.trim()) return branchFull;
    const q = keyword.toLowerCase();
    return branchFull.filter((b) => (b.code || '').toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || (b.address || '').toLowerCase().includes(q));
  }, [branchFull, keyword]);

  const permsByModule = useMemo(() => {
    const map: Record<string, PermissionDto[]> = {};
    allPermissions.forEach(p => { (map[p.module] ??= []).push(p); });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [allPermissions]);

  const kpis = useMemo(() => [
    { lbl: 'Tổng tài khoản', val: users.length },
    { lbl: 'Đang online', val: sessions.filter((s) => s.isActive).length, tone: 'ok' as const },
    { lbl: 'Bị khoá', val: users.filter((u) => u.isLocked).length, tone: 'crit' as const },
    { lbl: 'Bật 2FA', val: users.filter((u) => u.isTwoFactorEnabled).length, tone: 'info' as const },
    { lbl: 'Chi nhánh', val: branchFull.length || branches.length },
  ], [users, sessions, branchFull, branches]);

  // ─── Column defs ───
  const userColumns: ColumnDef<SystemUserDto>[] = [
    { key: 'username', label: 'Tài khoản', mono: true, code: true, render: (u) => u.username },
    { key: 'fullName', label: 'Họ tên', render: (u) => u.fullName },
    { key: 'roles', label: 'Vai trò', render: (u) => roleNames(u) },
    { key: 'departmentName', label: 'Khoa', render: (u) => u.departmentName || '—' },
    { key: 'lastLoginDate', label: 'Đăng nhập gần nhất', mono: true, render: (u) => u.lastLoginDate ? dayjs(u.lastLoginDate).format('DD/MM HH:mm') : '—' },
    { key: 'twofa', label: '2FA', width: 80, render: (u) => u.isTwoFactorEnabled ? <StatusBadge tone="ok" dot>Bật</StatusBadge> : <StatusBadge tone="warn" dot>Tắt</StatusBadge> },
    { key: 'status', label: 'Trạng thái', width: 110, render: (u) => u.isLocked ? <StatusBadge tone="crit">Khoá</StatusBadge> : u.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge> : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];
  const roleColumns: ColumnDef<RoleDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên vai trò', render: (r) => r.name },
    { key: 'description', label: 'Mô tả', render: (r) => r.description || '—' },
    { key: 'userCount', label: 'Người dùng', mono: true, width: 100, render: (r) => r.userCount ?? '—' },
    { key: 'isSystemRole', label: 'Hệ thống', width: 90, render: (r) => r.isSystemRole ? <StatusBadge tone="info">Hệ thống</StatusBadge> : '—' },
    { key: 'isActive', label: 'Trạng thái', width: 110, render: (r) => r.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge> : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];
  const auditColumns: ColumnDef<AuditLogDto>[] = [
    { key: 'timestamp', label: 'Thời gian', mono: true, render: (a) => dayjs(a.timestamp).format('DD/MM HH:mm:ss') },
    { key: 'userFullName', label: 'User', render: (a) => a.userFullName || a.userName || '—' },
    { key: 'module', label: 'Module', render: (a) => a.module || '—' },
    { key: 'action', label: 'Hành động', render: (a) => a.action },
    { key: 'entityType', label: 'Đối tượng', render: (a) => a.entityType ? `${a.entityType} ${(a.entityId || '').toString().slice(0, 8)}` : '—' },
    { key: 'responseStatusCode', label: 'HTTP', render: (a) => { const code = a.responseStatusCode ?? 0; const tone = code >= 400 ? 'crit' : code >= 300 ? 'warn' : 'ok'; return <StatusBadge tone={tone}>{code || '—'}</StatusBadge>; } },
  ];
  const configColumns: ColumnDef<SystemConfigDto>[] = [
    { key: 'configKey', label: 'Khoá', mono: true, code: true, render: (c) => c.configKey },
    { key: 'configValue', label: 'Giá trị', mono: true, render: (c) => c.isEncrypted ? '••••••••' : (c.configValue || '—') },
    { key: 'category', label: 'Nhóm', render: (c) => c.category || '—' },
    { key: 'description', label: 'Mô tả', render: (c) => c.description || '—' },
    { key: 'dataType', label: 'Kiểu', width: 100, render: (c) => c.dataType || '—' },
  ];
  type SessionRow = UserSessionDto & { id: string };
  const sessionColumns: ColumnDef<SessionRow>[] = [
    { key: 'user', label: 'Người dùng', render: (s) => `${s.fullName || ''} (@${s.username || ''})` },
    { key: 'status', label: 'Trạng thái', width: 100, render: (s) => s.isActive ? <StatusBadge tone="ok" dot>Online</StatusBadge> : <StatusBadge dot>Offline</StatusBadge> },
    { key: 'ip', label: 'IP', mono: true, width: 130, render: (s) => (s as unknown as Record<string, string>).ipAddress || '—' },
    { key: 'device', label: 'Thiết bị', width: 100, render: (s) => (s as unknown as Record<string, string>).deviceType || '—' },
    { key: 'login', label: 'Đăng nhập', mono: true, width: 140, render: (s) => (s as unknown as Record<string, string>).loginTime ? dayjs((s as unknown as Record<string, string>).loginTime).format('DD/MM HH:mm') : '—' },
    { key: 'last', label: 'Hoạt động cuối', mono: true, width: 140, render: (s) => (s as unknown as Record<string, string>).lastActivityTime ? dayjs((s as unknown as Record<string, string>).lastActivityTime).format('DD/MM HH:mm') : '—' },
  ];
  type NotifRow = SystemNotificationDto & { id: string };
  const notifColumns: ColumnDef<NotifRow>[] = [
    { key: 'createdAt', label: 'Thời gian', mono: true, width: 140, render: (n) => n.startDate ? dayjs(n.startDate).format('DD/MM HH:mm') : '—' },
    { key: 'title', label: 'Tiêu đề', render: (n) => n.title },
    { key: 'content', label: 'Nội dung', render: (n) => n.content },
    { key: 'type', label: 'Loại', width: 100, render: (n) => { const tone = n.notificationType === 'Error' ? 'crit' : n.notificationType === 'Warning' ? 'warn' : n.notificationType === 'Success' ? 'ok' : 'info'; return <StatusBadge tone={tone}>{n.notificationType || 'Info'}</StatusBadge>; } },
    { key: 'isActive', label: 'Trạng thái', width: 100, render: (n) => n.isActive ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge> : <StatusBadge dot>Đã tắt</StatusBadge> },
  ];
  type LockRow = LockedServiceDto & { id: string };
  const lockColumns: ColumnDef<LockRow>[] = [
    { key: 'code', label: 'Mã DV', mono: true, width: 100, render: (s) => (s as unknown as Record<string, string>).serviceCode || '—' },
    { key: 'name', label: 'Tên dịch vụ', render: (s) => (s as unknown as Record<string, string>).serviceName || '—' },
    { key: 'reason', label: 'Lý do khóa', render: (s) => (s as unknown as Record<string, string>).lockReason || '—' },
    { key: 'lockedBy', label: 'Người khóa', width: 120, render: (s) => (s as unknown as Record<string, string>).lockedByName || '—' },
    { key: 'lockedAt', label: 'Ngày khóa', mono: true, width: 130, render: (s) => (s as unknown as Record<string, string>).lockedAt ? dayjs((s as unknown as Record<string, string>).lockedAt).format('DD/MM HH:mm') : '—' },
    { key: 'status', label: 'Trạng thái', width: 100, render: (s) => (s as unknown as Record<string, boolean>).isLocked ? <StatusBadge tone="crit">Đang khoá</StatusBadge> : <StatusBadge tone="ok">Hoạt động</StatusBadge> },
  ];
  const branchColumns: ColumnDef<BranchRecord>[] = [
    { key: 'code', label: 'Mã', mono: true, width: 80, render: (b) => b.code || '—' },
    { key: 'name', label: 'Tên chi nhánh', render: (b) => b.name },
    { key: 'address', label: 'Địa chỉ', render: (b) => b.address || '—' },
    { key: 'phone', label: 'SĐT', width: 120, render: (b) => b.phone || '—' },
    { key: 'hq', label: 'Trụ sở', width: 90, render: (b) => b.isHeadquarter ? <StatusBadge tone="warn">Trụ sở</StatusBadge> : '—' },
    { key: 'status', label: 'Trạng thái', width: 110, render: (b) => b.isActive !== false ? <StatusBadge tone="ok">Hoạt động</StatusBadge> : <StatusBadge tone="warn">Ngừng</StatusBadge> },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={(t) => { setKeyword(''); setTab(t); }} tabs={TABS} />
        <SearchBox value={keyword} onChange={setKeyword}
          placeholder={
            tab === 'users' ? 'Tìm tài khoản / họ tên / vai trò…' :
            tab === 'roles' ? 'Tìm vai trò…' :
            tab === 'config' ? 'Tìm khoá / nhóm cấu hình…' :
            tab === 'branches' ? 'Tìm tên / mã / địa chỉ chi nhánh…' :
            'Tìm theo username / module…'
          } />
        <span className="spacer" />
        {tab === 'users' && <Btn variant="primary" onClick={openNewUser}>+ Thêm người dùng</Btn>}
        {tab === 'roles' && <Btn variant="primary" onClick={openNewRole}>+ Thêm vai trò</Btn>}
        {tab === 'notifications' && <Btn variant="primary" onClick={() => setNotifModal(true)}>+ Gửi thông báo</Btn>}
        {tab === 'locked-services' && <Btn variant="primary" onClick={() => { setLockModal(true); setLockResults([]); setLockKw(''); }}>+ Khóa dịch vụ</Btn>}
        {tab === 'branches' && <Btn variant="primary" onClick={openNewBranch}>+ Thêm chi nhánh</Btn>}
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      {tab === 'users' && (
        <DataTable<SystemUserDto> columns={userColumns} data={filteredUsers} rowKey={(u) => u.id || u.username}
          onRowClick={(u) => setSelUser(u)}
          actions={(u) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openEditUser(u)} />
            <ActBtn ic="lock" title={u.isLocked ? 'Mở khoá' : 'Khoá'} tone={u.isLocked ? 'warn' : 'crit'} onClick={() => lockToggle(u)} />
            <ActBtn ic="refresh" title="Reset mật khẩu" onClick={() => resetPw(u)} />
            {!isAdminUser(u) && <ActBtn ic="trash" title="Xoá tài khoản" tone="crit" onClick={() => deleteUser(u)} />}
          </>)}
          empty={loading ? 'Đang tải…' : 'Không có người dùng'} />
      )}
      {tab === 'roles' && (
        <DataTable<RoleDto> columns={roleColumns} data={filteredRoles} rowKey={(r) => r.id || r.code}
          actions={(r) => (<><ActBtn ic="edit" title="Sửa" onClick={() => openEditRole(r)} /><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delRole(r)} /></>)}
          empty={loading ? 'Đang tải…' : 'Không có vai trò'} />
      )}
      {tab === 'sessions' && (
        <DataTable<SessionRow> columns={sessionColumns} data={sessions as SessionRow[]} rowKey={(s) => s.id || s.username || ''}
          actions={(s) => s.isActive ? <ActBtn ic="trash" title="Kick" tone="crit" onClick={() => kickSession(s)} /> : null}
          empty={loading ? 'Đang tải…' : 'Không có phiên đăng nhập'} />
      )}
      {tab === 'notifications' && (
        <DataTable<NotifRow> columns={notifColumns} data={notifications as NotifRow[]} rowKey={(n) => String((n as unknown as Record<string, unknown>).id ?? n.title ?? '')}
          empty={loading ? 'Đang tải…' : 'Chưa có thông báo'} />
      )}
      {tab === 'locked-services' && (
        <DataTable<LockRow> columns={lockColumns} data={lockedServices as LockRow[]} rowKey={(s) => String((s as unknown as Record<string, unknown>).id ?? '')}
          actions={(s) => (s as unknown as Record<string, boolean>).isLocked ? <ActBtn ic="check" title="Mở khóa" tone="warn" onClick={() => unlockSvc(s)} /> : null}
          empty={loading ? 'Đang tải…' : 'Chưa có dịch vụ nào bị khóa'} />
      )}
      {tab === 'branches' && (
        <DataTable<BranchRecord> columns={branchColumns} data={filteredBranches} rowKey={(b) => b.id}
          onRowClick={(b) => setSelBranch(b)}
          actions={(b) => (<><ActBtn ic="edit" title="Sửa" onClick={() => openEditBranch(b)} /><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delBranch(b)} /></>)}
          empty={loading ? 'Đang tải…' : 'Chưa có chi nhánh'} />
      )}
      {tab === 'audit' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 16px', alignItems: 'center', borderBottom: '1px solid var(--ab-border)' }}>
            <Select allowClear placeholder="Phân hệ" style={{ width: 150 }} value={auditFilters.module || undefined}
              onChange={(v) => { setAuditPage(1); setAuditFilters(f => ({ ...f, module: v ?? undefined })); }}
              options={[
                { value: 'Reception', label: 'Tiếp đón' },
                { value: 'Examination', label: 'Khám bệnh' },
                { value: 'Inpatient', label: 'Nội trú' },
                { value: 'Pharmacy', label: 'Dược' },
                { value: 'Laboratory', label: 'Xét nghiệm' },
                { value: 'Radiology', label: 'CĐHA' },
                { value: 'Billing', label: 'Viện phí' },
                { value: 'Insurance', label: 'BHYT' },
                { value: 'System', label: 'Hệ thống' },
                { value: 'Auth', label: 'Xác thực' },
              ]} />
            <Select allowClear placeholder="Hành động" style={{ width: 140 }} value={auditFilters.action || undefined}
              onChange={(v) => { setAuditPage(1); setAuditFilters(f => ({ ...f, action: v ?? undefined })); }}
              options={[
                { value: 'Create', label: 'Tạo mới' },
                { value: 'Update', label: 'Cập nhật' },
                { value: 'Delete', label: 'Xóa' },
                { value: 'Read', label: 'Đọc' },
                { value: 'Login', label: 'Đăng nhập' },
                { value: 'Logout', label: 'Đăng xuất' },
                { value: 'Export', label: 'Xuất dữ liệu' },
                { value: 'Approve', label: 'Duyệt' },
              ]} />
            <Select allowClear placeholder="Loại đối tượng" style={{ width: 160 }} value={auditFilters.entityType || undefined}
              onChange={(v) => { setAuditPage(1); setAuditFilters(f => ({ ...f, entityType: v ?? undefined })); }}
              options={[
                { value: 'Patient', label: 'Bệnh nhân' },
                { value: 'MedicalRecord', label: 'Hồ sơ bệnh án' },
                { value: 'Prescription', label: 'Đơn thuốc' },
                { value: 'User', label: 'Người dùng' },
                { value: 'Role', label: 'Vai trò' },
                { value: 'SystemConfig', label: 'Cấu hình' },
              ]} />
            <DatePicker format="DD/MM/YYYY" placeholder="Từ ngày" style={{ width: 130 }}
              value={auditFilters.fromDate ? dayjs(auditFilters.fromDate) : null}
              onChange={(d) => { setAuditPage(1); setAuditFilters(f => ({ ...f, fromDate: d ? d.format('YYYY-MM-DD') : undefined })); }} />
            <DatePicker format="DD/MM/YYYY" placeholder="Đến ngày" style={{ width: 130 }}
              value={auditFilters.toDate ? dayjs(auditFilters.toDate) : null}
              onChange={(d) => { setAuditPage(1); setAuditFilters(f => ({ ...f, toDate: d ? d.format('YYYY-MM-DD') : undefined })); }} />
            <span style={{ flex: 1 }} />
            <Btn variant="ghost" onClick={() => exportAuditLogs({ ...auditFilters, keyword: keyword || undefined })}>
              Xuất Excel
            </Btn>
          </div>
          <DataTable<AuditLogDto> columns={auditColumns} data={audit} rowKey={(a) => String(a.id ?? '')}
            onRowClick={(a) => setSelAudit(a)} empty={loading ? 'Đang tải…' : 'Chưa có nhật ký'} />
          <Pager page={auditPage} totalPages={Math.max(1, Math.ceil(auditTotal / 50))} setPage={setAuditPage} total={auditTotal} perPage={50} />
        </>
      )}
      {tab === 'config' && (
        <DataTable<SystemConfigDto> columns={configColumns} data={filteredConfigs} rowKey={(c) => c.configKey}
          actions={(c) => <ActBtn ic="edit" title="Sửa giá trị" onClick={() => openCfg(c)} />}
          empty={loading ? 'Đang tải…' : 'Chưa có cấu hình'} />
      )}
      {tab === 'it-tickets' && <ItTicketsPanel />}
      {tab === 'access-matrix' && <AccessMatrixPanel />}
      {tab === 'compliance' && <CompliancePanel />}
      {tab === 'data-management' && <DataManagementPanel />}
      {tab === 'health' && <HealthPanel />}
      {tab === 'emr-admin' && <EmrAdminPanel />}
      {tab === 'delegation' && <DelegationPanel />}
      {/* NangCap26 I.15/I.16 — quyền DỮ LIỆU (row-level), khác quyền chức năng ở tab Vai trò */}
      {tab === 'data-permission' && <DataPermissionPanel departments={depts} />}

      {/* ─── Audit log detail drawer (request/IP/UA + old→new diff, parity v1 AuditTab) ─── */}
      <DrawerShell open={!!selAudit} onClose={() => setSelAudit(null)} size="md"
        title={selAudit ? `${selAudit.action}${selAudit.entityType ? ` · ${selAudit.entityType}` : ''}` : ''}
        sub={selAudit ? dayjs(selAudit.timestamp).format('DD/MM/YYYY HH:mm:ss') : ''}>
        {selAudit && (() => {
          const pretty = (s?: string) => {
            if (!s) return null;
            try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
          };
          const mono: React.CSSProperties = {
            fontFamily: 'var(--font-mono)', fontSize: 11.5, whiteSpace: 'pre-wrap',
            background: 'var(--bg-1)', border: '1px solid var(--line-soft)',
            borderRadius: 'var(--r-2)', padding: '6px 8px', maxHeight: 240, overflow: 'auto',
          };
          const oldV = pretty(selAudit.oldValues); const newV = pretty(selAudit.newValues);
          return (<>
            <DrSec title="Sự kiện">
              <DrField lbl="Người dùng"><b>{selAudit.userFullName || selAudit.userName || '—'}</b></DrField>
              <DrField lbl="Hành động">{selAudit.action}</DrField>
              <DrField lbl="Phân hệ">{selAudit.module || '—'}</DrField>
              <DrField lbl="Đối tượng">{selAudit.entityType || '—'}{selAudit.entityId ? <span className="mono"> · {selAudit.entityId}</span> : null}</DrField>
              {selAudit.responseStatusCode != null && <DrField lbl="HTTP status"><span className="mono">{selAudit.responseStatusCode}</span></DrField>}
            </DrSec>
            <DrSec title="Request">
              <DrField lbl="Endpoint"><span className="mono">{selAudit.requestMethod || '—'} {selAudit.requestPath || ''}</span></DrField>
              <DrField lbl="Địa chỉ IP"><span className="mono">{selAudit.ipAddress || '—'}</span></DrField>
              {selAudit.userAgent && <DrField lbl="User-Agent"><span style={{ fontSize: 11.5, wordBreak: 'break-all' }}>{selAudit.userAgent}</span></DrField>}
            </DrSec>
            {selAudit.details && (
              <DrSec title="Chi tiết">
                <div style={{ fontSize: 12.5, color: 'var(--t-1)', whiteSpace: 'pre-wrap' }}>{selAudit.details}</div>
              </DrSec>
            )}
            {(oldV || newV) && (
              <DrSec title="Thay đổi dữ liệu (old → new)">
                {oldV && (<><div style={{ fontSize: 11, color: 'var(--s-crit)', margin: '2px 0' }}>Giá trị cũ</div><div style={mono}>{oldV}</div></>)}
                {newV && (<><div style={{ fontSize: 11, color: 'var(--s-ok)', margin: '6px 0 2px' }}>Giá trị mới</div><div style={mono}>{newV}</div></>)}
              </DrSec>
            )}
          </>);
        })()}
      </DrawerShell>

      {/* ─── User detail drawer ─── */}
      <DrawerShell open={!!selUser} onClose={() => setSelUser(null)} title={selUser?.fullName || ''} sub={selUser ? `@${selUser.username}` : ''} size="md">
        {selUser && (<>
          <DrSec title="Định danh">
            <DrField lbl="Tài khoản">{selUser.username}</DrField>
            <DrField lbl="Họ tên">{selUser.fullName}</DrField>
            <DrField lbl="Email">{selUser.email || '—'}</DrField>
            <DrField lbl="SĐT">{selUser.phone || selUser.phoneNumber || '—'}</DrField>
            <DrField lbl="Mã NV">{selUser.employeeCode || '—'}</DrField>
          </DrSec>
          <DrSec title="Tổ chức & quyền">
            <DrField lbl="Khoa">{selUser.departmentName || '—'}</DrField>
            <DrField lbl="Vai trò">{roleNames(selUser)}</DrField>
          </DrSec>
          <DrSec title="Bảo mật & đăng nhập">
            <DrField lbl="2FA">{selUser.isTwoFactorEnabled ? 'Đã bật' : 'Chưa bật'}</DrField>
            <DrField lbl="Lần cuối">{selUser.lastLoginDate ? dayjs(selUser.lastLoginDate).format('DD/MM/YYYY HH:mm') : '—'}</DrField>
            <DrField lbl="IP">{selUser.lastLoginIP || '—'}</DrField>
            <DrField lbl="Trạng thái">{selUser.isLocked ? 'Khoá' : selUser.isActive ? 'Hoạt động' : 'Tạm dừng'}</DrField>
          </DrSec>
          <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-12)' }}>
            <Btn variant="primary" onClick={() => { setSelUser(null); openEditUser(selUser); }}>Sửa</Btn>
            <Btn onClick={() => lockToggle(selUser)}>{selUser.isLocked ? 'Mở khoá' : 'Khoá'}</Btn>
            <Btn onClick={() => resetPw(selUser)}>Reset mật khẩu</Btn>
          </div>
        </>)}
      </DrawerShell>

      {/* ─── Branch detail drawer ─── */}
      <DrawerShell open={!!selBranch} onClose={() => setSelBranch(null)} title={selBranch?.name || ''} sub={selBranch?.code || ''} size="md">
        {selBranch && (<>
          <DrSec title="Thông tin">
            <DrField lbl="Mã">{selBranch.code || '—'}</DrField>
            <DrField lbl="Địa chỉ">{selBranch.address || '—'}</DrField>
            <DrField lbl="SĐT">{selBranch.phone || '—'}</DrField>
            <DrField lbl="Email">{selBranch.email || '—'}</DrField>
            <DrField lbl="Trụ sở chính">{selBranch.isHeadquarter ? 'Có' : 'Không'}</DrField>
            <DrField lbl="Ghi chú">{selBranch.description || '—'}</DrField>
          </DrSec>
          <div style={{ display: 'flex', gap: 'var(--space-6)', marginTop: 'var(--space-12)' }}>
            <Btn variant="primary" onClick={() => { setSelBranch(null); openEditBranch(selBranch); }}>Sửa</Btn>
            <Btn variant="crit" onClick={() => { setSelBranch(null); delBranch(selBranch); }}>Xoá</Btn>
          </div>
        </>)}
      </DrawerShell>

      {/* ─── User create/edit modal ─── */}
      <ModalShell open={!!userModal} onClose={() => setUserModal(null)}
        title={userModal === 'new' ? 'Thêm người dùng' : 'Sửa người dùng'} size="md"
        footer={<><Btn onClick={() => setUserModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitUser}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={userF} layout="vertical" scrollToFirstError requiredMark>
          <Form.Item name="username" label="Tài khoản" rules={[{ required: true, message: 'Nhập tài khoản' }]}>
            <Input disabled={userModal === 'edit'} placeholder="vd: bs.nguyenvana" />
          </Form.Item>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input placeholder="Nguyễn Văn A" /></Form.Item>
          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ' }]}><Input /></Form.Item>
          <Form.Item name="phoneNumber" label="SĐT" rules={[{ pattern: /^0\d{9,10}$/, message: 'SĐT 10-11 số, bắt đầu 0' }]}><Input /></Form.Item>
          <Form.Item name="employeeId" label="Mã NV"><Input /></Form.Item>
          <Form.Item name="departmentId" label="Khoa"><Select allowClear showSearch optionFilterProp="label" options={deptOptions} placeholder="Chọn khoa" /></Form.Item>
          <Form.Item name="branchId" label="Chi nhánh" extra="Để trống = toàn viện (không giới hạn cơ sở)"><Select allowClear showSearch optionFilterProp="label" options={branchOptions} placeholder="Chọn chi nhánh" /></Form.Item>
          <Form.Item name="roleIds" label="Vai trò" rules={[{ required: true, message: 'Chọn ít nhất 1 vai trò' }]}><Select mode="multiple" optionFilterProp="label" options={roleOptions} placeholder="Chọn vai trò" /></Form.Item>
          <Form.Item name="scopeType" label="Phạm vi quyền" initialValue="ORG" extra="Áp dụng cho tất cả vai trò được chọn">
            <Select options={[{ value: 'ORG', label: 'ORG — Toàn viện' }, { value: 'BRANCH', label: 'BRANCH — Toàn cơ sở' }, { value: 'DEPT', label: 'DEPT — Toàn khoa' }, { value: 'OWN', label: 'OWN — Dữ liệu của bản thân' }]} />
          </Form.Item>
          <Form.Item name="validTo" label="Hiệu lực đến" extra="Để trống = vĩnh viễn"><DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="grantReason" label="Lý do gán quyền"><Input placeholder="vd: Quyết định phân công ngày..." /></Form.Item>
          {userModal === 'new'
            ? <Form.Item name="initialPassword" label="Mật khẩu khởi tạo" extra="Để trống = mật khẩu mặc định hệ thống"><Input.Password /></Form.Item>
            : <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </ModalShell>

      {/* ─── Role create/edit modal ─── */}
      <ModalShell open={!!roleModal} onClose={() => setRoleModal(null)}
        title={roleModal === 'new' ? 'Thêm vai trò' : 'Sửa vai trò'} size="lg"
        footer={<><Btn onClick={() => setRoleModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitRole}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={roleF} layout="vertical" scrollToFirstError requiredMark>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <Form.Item name="code" label="Mã vai trò" rules={[{ required: true, message: 'Nhập mã' }]}><Input disabled={roleModal === 'edit'} placeholder="vd: Nurse" /></Form.Item>
            <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="Điều dưỡng" /></Form.Item>
          </div>
          <Form.Item name="description" label="Mô tả"><Input /></Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>
          <Form.Item label={`Quyền hạn${allPermissions.length ? ` — ${rolePermIds.length} / ${allPermissions.length} đã chọn` : ''}`}>
            <Input
              value={permSearch}
              onChange={(e) => setPermSearch(e.target.value)}
              placeholder="Tìm quyền theo tên hoặc mã module…"
              allowClear
              style={{ marginBottom: 8 }}
            />
            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--ab-border)', borderRadius: 6 }}>
              {allPermissions.length === 0
                ? <div style={{ padding: 16, color: 'var(--t-2)', textAlign: 'center' }}>Đang tải danh sách quyền…</div>
                : permsByModule.map(([mod, ps]) => {
                    const pq = permSearch.toLowerCase();
                    const filtered = permSearch ? ps.filter(p => p.name.toLowerCase().includes(pq) || p.code.toLowerCase().includes(pq)) : ps;
                    if (filtered.length === 0) return null;
                    const modIds = filtered.map(p => p.id!).filter(Boolean);
                    const checkedCnt = modIds.filter(id => rolePermIds.includes(id)).length;
                    const allChk = modIds.length > 0 && checkedCnt === modIds.length;
                    const halfChk = checkedCnt > 0 && !allChk;
                    const toggleMod = () => {
                      if (allChk) setRolePermIds(prev => prev.filter(id => !modIds.includes(id)));
                      else setRolePermIds(prev => [...new Set([...prev, ...modIds])]);
                    };
                    return (
                      <div key={mod} style={{ borderBottom: '1px solid var(--ab-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--ab-bg-2)', userSelect: 'none' }}>
                          <Checkbox checked={allChk} indeterminate={halfChk} onChange={toggleMod} />
                          <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', flex: 1 }}>{mod}</span>
                          <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}>{checkedCnt}/{filtered.length}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2, padding: '4px 12px 8px 36px' }}>
                          {filtered.map(p => (
                            <Checkbox
                              key={p.id}
                              checked={rolePermIds.includes(p.id!)}
                              onChange={(e) => {
                                if (e.target.checked) setRolePermIds(prev => [...new Set([...prev, p.id!])]);
                                else setRolePermIds(prev => prev.filter(id => id !== p.id));
                              }}
                            >
                              <span title={p.description || p.code} style={{ fontSize: 'var(--fs-sm)' }}>{p.name}</span>
                            </Checkbox>
                          ))}
                        </div>
                      </div>
                    );
                  })
              }
            </div>
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ─── Config edit modal ─── */}
      <ModalShell open={!!cfgModal} onClose={() => setCfgModal(null)} title="Sửa cấu hình" sub={cfgModal?.configKey} size="sm"
        footer={<><Btn onClick={() => setCfgModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitCfg}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={cfgF} layout="vertical" scrollToFirstError>
          <div style={{ color: 'var(--t-2)', fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-8)' }}>{cfgModal?.description || cfgModal?.category}</div>
          <Form.Item name="configValue" label="Giá trị" rules={[{ required: true, message: 'Nhập giá trị' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </ModalShell>

      {/* ─── Notification send modal ─── */}
      <ModalShell open={notifModal} onClose={() => { setNotifModal(false); notifF.resetFields(); }} title="Gửi thông báo hệ thống" size="md"
        footer={<><Btn onClick={() => { setNotifModal(false); notifF.resetFields(); }}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitNotif}>{saving ? 'Đang gửi…' : 'Gửi'}</Btn></>}>
        <Form form={notifF} layout="vertical" requiredMark>
          <Form.Item name="title" label="Tiêu đề" rules={[{ required: true, message: 'Nhập tiêu đề' }]}><Input placeholder="Thông báo bảo trì hệ thống..." /></Form.Item>
          <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}><Input.TextArea rows={4} /></Form.Item>
          <Form.Item name="notificationType" label="Loại thông báo" initialValue="Info">
            <Select options={[{ value: 'Info', label: 'Thông tin' }, { value: 'Warning', label: 'Cảnh báo' }, { value: 'Error', label: 'Lỗi' }, { value: 'Success', label: 'Thành công' }]} />
          </Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <Form.Item name="targetUserId" label="Gửi đến người dùng">
              <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả" options={users.map((u) => ({ value: u.id, label: u.fullName || u.username }))} />
            </Form.Item>
            <Form.Item name="targetRoleId" label="Gửi đến vai trò">
              <Select allowClear showSearch optionFilterProp="label" placeholder="Tất cả" options={roleOptions} />
            </Form.Item>
          </div>
        </Form>
      </ModalShell>

      {/* ─── Lock service modal ─── */}
      <ModalShell open={lockModal} onClose={() => { setLockModal(false); lockF.resetFields(); setLockKw(''); setLockResults([]); }} title="Khóa dịch vụ" size="md"
        footer={<><Btn onClick={() => { setLockModal(false); lockF.resetFields(); setLockKw(''); setLockResults([]); }}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitLock}>{saving ? 'Đang khóa…' : 'Khóa'}</Btn></>}>
        <Form form={lockF} layout="vertical" requiredMark>
          <Form.Item label="Tìm dịch vụ">
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={lockKw} onChange={(e) => setLockKw(e.target.value)} placeholder="Nhập tên hoặc mã dịch vụ..." style={{ flex: 1 }} onPressEnter={() => searchLockServices(lockKw)} />
              <Btn onClick={() => searchLockServices(lockKw)} disabled={lockSearching}>{lockSearching ? 'Tìm…' : 'Tìm'}</Btn>
            </div>
          </Form.Item>
          <Form.Item name="serviceId" label="Chọn dịch vụ cần khóa" rules={[{ required: true, message: 'Chọn dịch vụ' }]}>
            <Select showSearch optionFilterProp="label" placeholder="Chọn từ kết quả tìm kiếm"
              options={lockResults.map((s) => ({ value: s.id, label: `${s.code} — ${s.name} (${s.stype === 1 ? 'Thuốc' : 'DVKT'})` }))} />
          </Form.Item>
          <Form.Item name="reason" label="Lý do khóa" rules={[{ required: true, message: 'Nhập lý do' }]}>
            <Input.TextArea rows={3} placeholder="VD: Hết hàng, Thu hồi, Bảo trì..." />
          </Form.Item>
        </Form>
      </ModalShell>

      {/* ─── Branch create/edit modal ─── */}
      <ModalShell open={!!branchModal} onClose={() => { setBranchModal(null); setEditingBranch(null); branchF.resetFields(); }}
        title={branchModal === 'new' ? 'Thêm chi nhánh' : 'Sửa chi nhánh'} size="md"
        footer={<><Btn onClick={() => { setBranchModal(null); setEditingBranch(null); branchF.resetFields(); }}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitBranch}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={branchF} layout="vertical" requiredMark>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 'var(--space-8)' }}>
            <Form.Item name="code" label="Mã chi nhánh" rules={[{ required: true, message: 'Nhập mã' }]}><Input placeholder="CN01" /></Form.Item>
            <Form.Item name="name" label="Tên chi nhánh" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="Chi nhánh Hải Dương" /></Form.Item>
          </div>
          <Form.Item name="address" label="Địa chỉ"><Input placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" /></Form.Item>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <Form.Item name="phone" label="SĐT"><Input placeholder="0220-3xxx-xxx" /></Form.Item>
            <Form.Item name="email" label="Email"><Input placeholder="chinhanh@benhvien.vn" /></Form.Item>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
            <Form.Item name="isHeadquarter" label="Trụ sở chính" valuePropName="checked"><Switch checkedChildren="Có" unCheckedChildren="Không" /></Form.Item>
            <Form.Item name="isActive" label="Trạng thái" valuePropName="checked"><Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng" /></Form.Item>
          </div>
          <Form.Item name="description" label="Ghi chú"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default SystemAdminV2;
