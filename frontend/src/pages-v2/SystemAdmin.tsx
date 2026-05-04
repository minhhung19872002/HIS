import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { adminApi } from '../api/system';
import type { SystemUserDto, RoleDto } from '../api/system';
import { getAuditLogs } from '../api/audit';
import type { AuditLogDto } from '../api/audit';
import {
  KpiStrip, TopTabs, SearchBox, DataTable, DrawerShell, DrSec, DrField, StatusBadge,
  type ColumnDef, type TopTab,
} from './_v2kit';

type AdminTab = 'users' | 'roles' | 'audit';
const TABS: TopTab<AdminTab>[] = [
  { v: 'users', l: 'Người dùng', ic: 'users' },
  { v: 'roles', l: 'Vai trò',    ic: 'shield' },
  { v: 'audit', l: 'Nhật ký',    ic: 'list' },
];

const SystemAdminV2: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('users');
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<SystemUserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [audit, setAudit] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<SystemUserDto | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const r = await adminApi.getUsers(keyword || undefined);
        setUsers(Array.isArray(r.data) ? r.data : []);
      } else if (tab === 'roles') {
        const r = await adminApi.getRoles(true);
        setRoles(Array.isArray(r.data) ? r.data : []);
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
      (u.email || '').toLowerCase().includes(q));
  }, [users, keyword]);

  const filteredRoles = useMemo(() => {
    if (!keyword.trim()) return roles;
    const q = keyword.toLowerCase();
    return roles.filter((r) => r.code.toLowerCase().includes(q) || r.name.toLowerCase().includes(q));
  }, [roles, keyword]);

  const kpis = useMemo(() => [
    { lbl: 'Tổng user',       val: users.length },
    { lbl: 'Hoạt động',       val: users.filter((u) => u.isActive && !u.isLocked).length, tone: 'ok' as const },
    { lbl: 'Đã khoá',         val: users.filter((u) => u.isLocked).length, tone: 'crit' as const },
    { lbl: 'Vai trò',         val: roles.length, tone: 'info' as const },
    { lbl: 'Nhật ký 7d',      val: audit.length, tone: 'info' as const },
    { lbl: 'Lỗi 4xx/5xx',     val: audit.filter((a) => (a.responseStatusCode ?? 0) >= 400).length, tone: 'warn' as const },
  ], [users, roles, audit]);

  const userColumns: ColumnDef<SystemUserDto>[] = [
    { key: 'username',         label: 'Username',  mono: true, code: true,
      render: (u) => u.username },
    { key: 'fullName',         label: 'Họ tên',     render: (u) => u.fullName },
    { key: 'departmentName',   label: 'Khoa',       render: (u) => u.departmentName || '—' },
    { key: 'roles',            label: 'Vai trò',    render: (u) => u.roles?.map((r) => r.name).join(', ') || '—' },
    { key: 'email',            label: 'Email',      render: (u) => u.email || '—' },
    { key: 'lastLoginDate',    label: 'Lần cuối',   mono: true,
      render: (u) => u.lastLoginDate ? dayjs(u.lastLoginDate).format('DD/MM HH:mm') : '—' },
    { key: 'status',           label: 'Trạng thái',
      render: (u) => u.isLocked ? <StatusBadge tone="crit">Khoá</StatusBadge>
        : u.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
        : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];

  const roleColumns: ColumnDef<RoleDto>[] = [
    { key: 'code',        label: 'Mã',         mono: true, code: true, render: (r) => r.code },
    { key: 'name',        label: 'Tên vai trò', render: (r) => r.name },
    { key: 'description', label: 'Mô tả',       render: (r) => r.description || '—' },
    { key: 'isActive',    label: 'Trạng thái',
      render: (r) => r.isActive ? <StatusBadge tone="ok">Hoạt động</StatusBadge>
        : <StatusBadge tone="warn">Tạm dừng</StatusBadge> },
  ];

  const auditColumns: ColumnDef<AuditLogDto>[] = [
    { key: 'timestamp', label: 'Thời gian', mono: true,
      render: (a) => dayjs(a.timestamp).format('DD/MM HH:mm:ss') },
    { key: 'userFullName', label: 'User',
      render: (a) => a.userFullName || a.userName || '—' },
    { key: 'module',    label: 'Module',  render: (a) => a.module || '—' },
    { key: 'action',    label: 'Hành động', render: (a) => a.action },
    { key: 'entityType', label: 'Đối tượng',
      render: (a) => a.entityType ? `${a.entityType} ${(a.entityId || '').toString().slice(0, 8)}` : '—' },
    { key: 'responseStatusCode', label: 'HTTP',
      render: (a) => {
        const code = a.responseStatusCode ?? 0;
        const tone = code >= 400 ? 'crit' : code >= 300 ? 'warn' : 'ok';
        return <StatusBadge tone={tone}>{code || '—'}</StatusBadge>;
      } },
  ];

  return (
    <div className="ab">
      <KpiStrip items={kpis} />

      <div className="ab-tools">
        <TopTabs tab={tab} setTab={setTab} tabs={TABS} />
        <SearchBox
          value={keyword}
          onChange={setKeyword}
          placeholder={tab === 'users' ? 'Tìm BS / username…'
            : tab === 'audit' ? 'Tìm theo username / module…'
            : 'Tìm vai trò…'}
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
              <DrField lbl="Username">{selUser.username}</DrField>
              <DrField lbl="Họ tên">{selUser.fullName}</DrField>
              <DrField lbl="Email">{selUser.email || '—'}</DrField>
              <DrField lbl="SĐT">{selUser.phoneNumber || '—'}</DrField>
              <DrField lbl="Mã NV">{selUser.employeeCode || '—'}</DrField>
            </DrSec>
            <DrSec title="Tổ chức">
              <DrField lbl="Khoa">{selUser.departmentName || '—'}</DrField>
              <DrField lbl="Vai trò">{selUser.roles?.map((r) => r.name).join(', ') || '—'}</DrField>
            </DrSec>
            <DrSec title="Đăng nhập">
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
