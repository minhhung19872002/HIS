import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Input, Select, Switch, Form } from 'antd';
import type { AxiosError } from 'axios';
import { adminApi, catalogApi } from '../api/system';
import type { SystemUserDto, RoleDto, SystemConfigDto, UserSessionDto, CreateUserDto, UpdateUserDto } from '../api/system';
import { getAuditLogs } from '../api/audit';
import type { AuditLogDto } from '../api/audit';
import { applyServerErrors, type ServerValidationError } from '../utils/formError';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  ModalShell, ActBtn, Btn, tk, te, cf,
  type ColumnDef, type TopTab,
} from './_v2kit';

// Department có 2 shape (id|departmentId, name|departmentName) khi đến từ catalog API khác nhau
interface RawDepartmentLite { id?: string; departmentId?: string; name?: string; departmentName?: string }

type AdminTab = 'users' | 'roles' | 'audit' | 'config';
const TABS: TopTab<AdminTab>[] = [
  { v: 'users',  l: 'Người dùng',      ic: 'users' },
  { v: 'roles',  l: 'Vai trò & quyền', ic: 'shield' },
  { v: 'audit',  l: 'Audit log',       ic: 'list' },
  { v: 'config', l: 'Cấu hình HT',     ic: 'settings' },
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
  const [users, setUsers] = useState<SystemUserDto[]>([]);
  const [sessions, setSessions] = useState<UserSessionDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [audit, setAudit] = useState<AuditLogDto[]>([]);
  const [configs, setConfigs] = useState<SystemConfigDto[]>([]);
  const [depts, setDepts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<SystemUserDto | null>(null);

  // Modal mode + Antd Form (validate + scrollToFirstError + lỗi inline)
  const [userModal, setUserModal] = useState<'new' | 'edit' | null>(null);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [roleModal, setRoleModal] = useState<'new' | 'edit' | null>(null);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [cfgModal, setCfgModal] = useState<SystemConfigDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [userF] = Form.useForm();
  const [roleF] = Form.useForm();
  const [cfgF] = Form.useForm();

  useEffect(() => {
    (async () => {
      try {
        const [u, s, r, d] = await Promise.allSettled([
          adminApi.getUsers(), adminApi.getActiveSessions(), adminApi.getRoles(true), catalogApi.getDepartments(),
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
      } catch { /* keep current */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') { const r = await adminApi.getUsers(); setUsers(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'roles') { const r = await adminApi.getRoles(true); setRoles(Array.isArray(r.data) ? r.data : []); }
      else if (tab === 'config') { const r = await adminApi.getSystemConfigs(); setConfigs(Array.isArray(r.data) ? r.data : []); }
      else {
        const r = await getAuditLogs({ fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'), toDate: dayjs().format('YYYY-MM-DD'), keyword: keyword || undefined, pageIndex: 1, pageSize: 100 });
        setAudit(Array.isArray(r.data?.items) ? r.data.items : []);
      }
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [tab, keyword]);
  useEffect(() => { load(); }, [load]);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id || r.code, label: r.name })), [roles]);
  const deptOptions = useMemo(() => depts.map((d) => ({ value: d.id, label: d.name })), [depts]);

  // ─── User CRUD (Antd Form validate) ───
  const openNewUser = () => { setEditUserId(null); userF.resetFields(); userF.setFieldsValue({ isActive: true, roleIds: [] }); setUserModal('new'); };
  const openEditUser = (u: SystemUserDto) => {
    const ids = roleList(u).map((r) => {
      if (typeof r !== 'string') return r.id || r.code;
      const m = roles.find((x) => x.name === r || x.code === r); return m?.id || m?.code;
    }).filter(Boolean) as string[];
    setEditUserId(u.id || null);
    userF.setFieldsValue({
      username: u.username, fullName: u.fullName, email: u.email || '', phoneNumber: u.phone || u.phoneNumber || '',
      employeeId: u.employeeCode || '', departmentId: u.departmentId || undefined, roleIds: ids, isActive: u.isActive !== false,
    });
    setUserModal('edit');
  };
  const submitUser = async () => {
    let v: Record<string, unknown>;
    try { v = await userF.validateFields(); } catch { return; } // Antd tự focus/scroll field lỗi + hiện msg inline
    setSaving(true);
    try {
      if (userModal === 'new') {
        const dto: CreateUserDto = {
          username: (v.username as string).trim(), fullName: (v.fullName as string).trim(),
          email: (v.email as string) || undefined, phoneNumber: (v.phoneNumber as string) || undefined,
          employeeId: (v.employeeId as string) || undefined, departmentId: (v.departmentId as string) || undefined,
          roleIds: v.roleIds as string[], initialPassword: (v.initialPassword as string) || undefined,
        };
        await adminApi.createUser(dto); tk('Đã tạo người dùng');
      } else {
        const dto: UpdateUserDto = {
          fullName: (v.fullName as string).trim(), email: (v.email as string) || undefined,
          phoneNumber: (v.phoneNumber as string) || undefined, employeeId: (v.employeeId as string) || undefined,
          departmentId: (v.departmentId as string) || undefined, roleIds: v.roleIds as string[], isActive: v.isActive as boolean,
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

  // ─── Role CRUD ───
  const openNewRole = () => { setEditRoleId(null); roleF.resetFields(); roleF.setFieldsValue({ isActive: true, isSystemRole: false }); setRoleModal('new'); };
  const openEditRole = (r: RoleDto) => { setEditRoleId(r.id || null); roleF.setFieldsValue({ code: r.code, name: r.name, description: r.description || '', isSystemRole: r.isSystemRole, isActive: r.isActive }); setRoleModal('edit'); };
  const submitRole = async () => {
    let v: Record<string, unknown>;
    try { v = await roleF.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await adminApi.saveRole({ id: editRoleId || undefined, code: (v.code as string).trim(), name: (v.name as string).trim(), description: (v.description as string) || '', isSystemRole: !!v.isSystemRole, isActive: v.isActive !== false } as RoleDto);
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

  const kpis = useMemo(() => [
    { lbl: 'Tổng tài khoản', val: users.length },
    { lbl: 'Đang online', val: sessions.filter((s) => s.isActive).length, tone: 'ok' as const },
    { lbl: 'Bị khoá', val: users.filter((u) => u.isLocked).length, tone: 'crit' as const },
    { lbl: 'Bật 2FA', val: users.filter((u) => u.isTwoFactorEnabled).length, tone: 'info' as const },
    { lbl: 'Quản trị', val: users.filter(isAdminUser).length, tone: 'warn' as const },
  ], [users, sessions]);

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

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <SearchBox value={keyword} onChange={setKeyword}
          placeholder={tab === 'users' ? 'Tìm tài khoản / họ tên / vai trò…' : tab === 'roles' ? 'Tìm vai trò…' : tab === 'config' ? 'Tìm khoá / nhóm cấu hình…' : 'Tìm theo username / module…'} />
        <span className="spacer" />
        {tab === 'users' && <Btn variant="primary" onClick={openNewUser}>+ Thêm người dùng</Btn>}
        {tab === 'roles' && <Btn variant="primary" onClick={openNewRole}>+ Thêm vai trò</Btn>}
        <Btn variant="ghost" onClick={load}>Làm mới</Btn>
      </div>

      {tab === 'users' && (
        <DataTable<SystemUserDto> columns={userColumns} data={filteredUsers} rowKey={(u) => u.id || u.username}
          onRowClick={(u) => setSelUser(u)}
          actions={(u) => (<>
            <ActBtn ic="edit" title="Sửa" onClick={() => openEditUser(u)} />
            <ActBtn ic="lock" title={u.isLocked ? 'Mở khoá' : 'Khoá'} tone={u.isLocked ? 'warn' : 'crit'} onClick={() => lockToggle(u)} />
            <ActBtn ic="refresh" title="Reset mật khẩu" onClick={() => resetPw(u)} />
          </>)}
          empty={loading ? 'Đang tải…' : 'Không có người dùng'} />
      )}
      {tab === 'roles' && (
        <DataTable<RoleDto> columns={roleColumns} data={filteredRoles} rowKey={(r) => r.id || r.code}
          actions={(r) => (<><ActBtn ic="edit" title="Sửa" onClick={() => openEditRole(r)} /><ActBtn ic="trash" title="Xoá" tone="crit" onClick={() => delRole(r)} /></>)}
          empty={loading ? 'Đang tải…' : 'Không có vai trò'} />
      )}
      {tab === 'audit' && (
        <DataTable<AuditLogDto> columns={auditColumns} data={audit} rowKey={(a) => String(a.id ?? '')} empty={loading ? 'Đang tải…' : 'Chưa có nhật ký 7 ngày'} />
      )}
      {tab === 'config' && (
        <DataTable<SystemConfigDto> columns={configColumns} data={filteredConfigs} rowKey={(c) => c.configKey}
          actions={(c) => <ActBtn ic="edit" title="Sửa giá trị" onClick={() => openCfg(c)} />}
          empty={loading ? 'Đang tải…' : 'Chưa có cấu hình'} />
      )}

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
          <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
            <Btn variant="primary" onClick={() => { setSelUser(null); openEditUser(selUser); }}>Sửa</Btn>
            <Btn onClick={() => lockToggle(selUser)}>{selUser.isLocked ? 'Mở khoá' : 'Khoá'}</Btn>
            <Btn onClick={() => resetPw(selUser)}>Reset mật khẩu</Btn>
          </div>
        </>)}
      </DrawerShell>

      {/* User create/edit — Antd Form: validate + lỗi inline + scrollToFirstError */}
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
          <Form.Item name="roleIds" label="Vai trò" rules={[{ required: true, message: 'Chọn ít nhất 1 vai trò' }]}><Select mode="multiple" optionFilterProp="label" options={roleOptions} placeholder="Chọn vai trò" /></Form.Item>
          {userModal === 'new'
            ? <Form.Item name="initialPassword" label="Mật khẩu khởi tạo" extra="Để trống = mật khẩu mặc định hệ thống"><Input.Password /></Form.Item>
            : <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </ModalShell>

      {/* Role create/edit */}
      <ModalShell open={!!roleModal} onClose={() => setRoleModal(null)}
        title={roleModal === 'new' ? 'Thêm vai trò' : 'Sửa vai trò'} size="sm"
        footer={<><Btn onClick={() => setRoleModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitRole}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={roleF} layout="vertical" scrollToFirstError requiredMark>
          <Form.Item name="code" label="Mã vai trò" rules={[{ required: true, message: 'Nhập mã' }]}><Input disabled={roleModal === 'edit'} placeholder="vd: Nurse" /></Form.Item>
          <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Nhập tên' }]}><Input placeholder="Điều dưỡng" /></Form.Item>
          <Form.Item name="description" label="Mô tả"><Input /></Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </ModalShell>

      {/* Config edit */}
      <ModalShell open={!!cfgModal} onClose={() => setCfgModal(null)} title="Sửa cấu hình" sub={cfgModal?.configKey} size="sm"
        footer={<><Btn onClick={() => setCfgModal(null)}>Huỷ</Btn><Btn variant="primary" disabled={saving} onClick={submitCfg}>{saving ? 'Đang lưu…' : 'Lưu'}</Btn></>}>
        <Form form={cfgF} layout="vertical" scrollToFirstError>
          <div style={{ color: 'var(--t-2)', fontSize: 12, marginBottom: 8 }}>{cfgModal?.description || cfgModal?.category}</div>
          <Form.Item name="configValue" label="Giá trị" rules={[{ required: true, message: 'Nhập giá trị' }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default SystemAdminV2;
