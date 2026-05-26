import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { adminApi } from '../api/system';
import type { SystemUserDto, RoleDto, SystemConfigDto, UserSessionDto } from '../api/system';
import { getAuditLogs } from '../api/audit';
import type { AuditLogDto } from '../api/audit';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  type ColumnDef, type TopTab,
} from './_v2kit';

type AdminTab = 'users' | 'roles' | 'audit' | 'config';
const TABS: TopTab<AdminTab>[] = [
  { v: 'users',  l: 'Người dùng',      ic: 'users' },
  { v: 'roles',  l: 'Vai trò & quyền', ic: 'shield' },
  { v: 'audit',  l: 'Audit log',       ic: 'list' },
  { v: 'config', l: 'Cấu hình HT',     ic: 'settings' },
];

// `/admin/users` trả roles dạng string[]; type cũ khai RoleDto[]. Render an toàn cả 2 dạng.
function roleNames(u: SystemUserDto): string {
  const rs = (u.roles ?? []) as unknown as (string | RoleDto)[];
  const names = rs.map((r) => (typeof r === 'string' ? r : r?.name)).filter(Boolean) as string[];
  return names.length ? names.join(', ') : '—';
}
function isAdminUser(u: SystemUserDto): boolean {
  const rs = (u.roles ?? []) as unknown as (string | RoleDto)[];
  return rs.some((r) => {
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
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<SystemUserDto | null>(null);

  // Users + sessions luôn được nạp (cho KPI), không phụ thuộc tab đang xem.
  useEffect(() => {
    (async () => {
      try {
        const [u, s] = await Promise.allSettled([adminApi.getUsers(), adminApi.getActiveSessions()]);
        if (u.status === 'fulfilled') setUsers(Array.isArray(u.value.data) ? u.value.data : []);
        if (s.status === 'fulfilled') setSessions(Array.isArray(s.value.data) ? s.value.data : []);
      } catch { /* keep current */ }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const r = await adminApi.getUsers();
        setUsers(Array.isArray(r.data) ? r.data : []);
      } else if (tab === 'roles') {
        const r = await adminApi.getRoles(true);
        setRoles(Array.isArray(r.data) ? r.data : []);
      } else if (tab === 'config') {
        const r = await adminApi.getSystemConfigs();
        setConfigs(Array.isArray(r.data) ? r.data : []);
      } else {
        const r = await getAuditLogs({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          keyword: keyword || undefined,
          pageIndex: 1, pageSize: 100,
        });
        setAudit(Array.isArray(r.data?.items) ? r.data.items : []);
      }
    } catch { /* keep current */ }
    finally { setLoading(false); }
  }, [tab, keyword]);
  useEffect(() => { load(); }, [load]);

  const filteredUsers = useMemo(() => {
    if (!keyword.trim()) return users;
    const q = keyword.toLowerCase();
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.fullName.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      roleNames(u).toLowerCase().includes(q));
  }, [users, keyword]);

  const filteredRoles = useMemo(() => {
    if (!keyword.trim()) return roles;
    const q = keyword.toLowerCase();
    return roles.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [roles, keyword]);

  const filteredConfigs = useMemo(() => {
    if (!keyword.trim()) return configs;
    const q = keyword.toLowerCase();
    return configs.filter((c) =>
      c.configKey.toLowerCase().includes(q) ||
      (c.category || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q));
  }, [configs, keyword]);

  // KPI theo mock: Tổng tài khoản / Đang online / Bị khoá / Bật 2FA / Quản trị
  const kpis = useMemo(() => [
    { lbl: 'Tổng tài khoản', val: users.length },
    { lbl: 'Đang online',    val: sessions.filter((s) => s.isActive).length, tone: 'ok' as const },
    { lbl: 'Bị khoá',        val: users.filter((u) => u.isLocked).length, tone: 'crit' as const },
    { lbl: 'Bật 2FA',        val: users.filter((u) => u.isTwoFactorEnabled).length, tone: 'info' as const },
    { lbl: 'Quản trị',       val: users.filter(isAdminUser).length, tone: 'warn' as const },
  ], [users, sessions]);

  // Cột theo mock: Tài khoản | Họ tên | Vai trò | Khoa | Đăng nhập gần nhất | 2FA | Trạng thái
  const userColumns: ColumnDef<SystemUserDto>[] = [
    { key: 'username', label: 'Tài khoản', mono: true, code: true, render: (u) => u.username },
    { key: 'fullName', label: 'Họ tên', render: (u) => u.fullName },
    { key: 'roles', label: 'Vai trò', render: (u) => roleNames(u) },
    { key: 'departmentName', label: 'Khoa', render: (u) => u.departmentName || '—' },
    { key: 'lastLoginDate', label: 'Đăng nhập gần nhất', mono: true,
      render: (u) => u.lastLoginDate ? dayjs(u.lastLoginDate).format('DD/MM HH:mm') : '—' },
    { key: 'twofa', label: '2FA', width: 90,
      render: (u) => u.isTwoFactorEnabled
        ? <StatusBadge tone="ok" dot>Bật</StatusBadge>
        : <StatusBadge tone="warn" dot>Tắt</StatusBadge> },
    { key: 'status', label: 'Trạng thái', width: 120,
      render: (u) => u.isLocked ? <StatusBadge tone="crit">Khoá</StatusBadge>
        : u.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
        : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];

  const roleColumns: ColumnDef<RoleDto>[] = [
    { key: 'code', label: 'Mã', mono: true, code: true, render: (r) => r.code },
    { key: 'name', label: 'Tên vai trò', render: (r) => r.name },
    { key: 'description', label: 'Mô tả', render: (r) => r.description || '—' },
    { key: 'isActive', label: 'Trạng thái', width: 120,
      render: (r) => r.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
        : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];

  const auditColumns: ColumnDef<AuditLogDto>[] = [
    { key: 'timestamp', label: 'Thời gian', mono: true,
      render: (a) => dayjs(a.timestamp).format('DD/MM HH:mm:ss') },
    { key: 'userFullName', label: 'User', render: (a) => a.userFullName || a.userName || '—' },
    { key: 'module', label: 'Module', render: (a) => a.module || '—' },
    { key: 'action', label: 'Hành động', render: (a) => a.action },
    { key: 'entityType', label: 'Đối tượng',
      render: (a) => a.entityType ? `${a.entityType} ${(a.entityId || '').toString().slice(0, 8)}` : '—' },
    { key: 'responseStatusCode', label: 'HTTP',
      render: (a) => {
        const code = a.responseStatusCode ?? 0;
        const tone = code >= 400 ? 'crit' : code >= 300 ? 'warn' : 'ok';
        return <StatusBadge tone={tone}>{code || '—'}</StatusBadge>;
      } },
  ];

  const configColumns: ColumnDef<SystemConfigDto>[] = [
    { key: 'configKey', label: 'Khoá', mono: true, code: true, render: (c) => c.configKey },
    { key: 'configValue', label: 'Giá trị', mono: true,
      render: (c) => c.isEncrypted ? '••••••••' : (c.configValue || '—') },
    { key: 'category', label: 'Nhóm', render: (c) => c.category || '—' },
    { key: 'description', label: 'Mô tả', render: (c) => c.description || '—' },
    { key: 'dataType', label: 'Kiểu', width: 110, render: (c) => c.dataType || '—' },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <SearchBox
          value={keyword}
          onChange={setKeyword}
          placeholder={tab === 'users' ? 'Tìm tài khoản / họ tên / vai trò…'
            : tab === 'roles' ? 'Tìm vai trò…'
            : tab === 'config' ? 'Tìm khoá / nhóm cấu hình…'
            : 'Tìm theo username / module…'}
        />
        <span className="spacer" />
        <button type="button" className="ab-btn ghost" onClick={load}>Làm mới</button>
      </div>

      {tab === 'users' && (
        <DataTable<SystemUserDto>
          columns={userColumns}
          data={filteredUsers}
          rowKey={(u) => u.id || u.username}
          onRowClick={(u) => setSelUser(u)}
          empty={loading ? 'Đang tải…' : 'Không có người dùng'}
        />
      )}
      {tab === 'roles' && (
        <DataTable<RoleDto>
          columns={roleColumns}
          data={filteredRoles}
          rowKey={(r) => r.id || r.code}
          empty={loading ? 'Đang tải…' : 'Không có vai trò'}
        />
      )}
      {tab === 'audit' && (
        <DataTable<AuditLogDto>
          columns={auditColumns}
          data={audit}
          rowKey={(a) => String(a.id ?? '')}
          empty={loading ? 'Đang tải…' : 'Chưa có nhật ký 7 ngày'}
        />
      )}
      {tab === 'config' && (
        <DataTable<SystemConfigDto>
          columns={configColumns}
          data={filteredConfigs}
          rowKey={(c) => c.configKey}
          empty={loading ? 'Đang tải…' : 'Chưa có cấu hình'}
        />
      )}

      <DrawerShell
        open={!!selUser}
        onClose={() => setSelUser(null)}
        title={selUser?.fullName || ''}
        sub={selUser ? `@${selUser.username}` : ''}
        size="md"
      >
        {selUser && (
          <>
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
              <DrField lbl="Lần cuối">
                {selUser.lastLoginDate ? dayjs(selUser.lastLoginDate).format('DD/MM/YYYY HH:mm') : '—'}
              </DrField>
              <DrField lbl="IP">{selUser.lastLoginIP || '—'}</DrField>
              <DrField lbl="Trạng thái">
                {selUser.isLocked ? 'Khoá' : selUser.isActive ? 'Hoạt động' : 'Tạm dừng'}
              </DrField>
            </DrSec>
          </>
        )}
      </DrawerShell>
    </div>
  );
};

export default SystemAdminV2;
