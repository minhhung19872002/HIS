import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/system';
import type { SystemUserDto, RoleDto } from '../api/system';
import { getAuditLogs } from '../api/audit';
import type { AuditLogDto } from '../api/audit';
import TermIcon from '../layouts/terminal/Icon';

type AdminTab = 'users' | 'roles' | 'audit';

const TABS: { key: AdminTab; label: string; icon: string }[] = [
  { key: 'users', label: 'Người dùng', icon: 'users' },
  { key: 'roles', label: 'Vai trò',     icon: 'shield' },
  { key: 'audit', label: 'Nhật ký',     icon: 'list' },
];

const SystemAdminV2: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>('users');
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<SystemUserDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [audit, setAudit] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selUser, setSelUser] = useState<SystemUserDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        const r = await adminApi.getUsers(keyword || undefined);
        const list = Array.isArray(r.data) ? r.data : [];
        setUsers(list);
        if (list.length > 0 && !selUser) setSelUser(list[0]);
      } else if (tab === 'roles') {
        const r = await adminApi.getRoles(true);
        setRoles(Array.isArray(r.data) ? r.data : []);
      } else if (tab === 'audit') {
        const r = await getAuditLogs({
          fromDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
          toDate: dayjs().format('YYYY-MM-DD'),
          keyword: keyword || undefined,
          pageIndex: 1, pageSize: 100,
        });
        setAudit(Array.isArray(r.data?.items) ? r.data.items : []);
      }
    } catch {
      // empty arrays already set
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.isActive && !u.isLocked).length,
    locked: users.filter((u) => u.isLocked).length,
    rolesCount: roles.length,
  }), [users, roles]);

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '220px 1fr 360px', gap: 16, height: '100%', minHeight: 0 }}>
      {/* Sidebar tabs */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h"><span className="title">Quản trị hệ thống</span></div>
        <div className="panel-body" style={{ padding: 4 }}>
          {TABS.map((t) => (
            <div
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 2,
                background: tab === t.key ? 'var(--a-cy-bg)' : 'transparent',
                color: tab === t.key ? 'var(--a-cy)' : 'var(--t-1)',
                fontWeight: tab === t.key ? 500 : 400, fontSize: 13,
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <TermIcon name={t.icon} size={14} />{t.label}
            </div>
          ))}
        </div>
      </div>

      {/* Main table */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">{TABS.find((t) => t.key === tab)?.label}</span>
          <span className="sub">· {tab === 'users' ? users.length : tab === 'roles' ? roles.length : audit.length}</span>
          <div className="actions">
            <input
              className="input" style={{ width: 220 }}
              placeholder={tab === 'users' ? 'Tìm BS / username...' : tab === 'audit' ? 'Tìm theo username / module...' : 'Tìm vai trò...'}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            />
            <button className="btn primary" type="button" onClick={load}><TermIcon name="search" size={13} />Tìm</button>
            <button className="btn sm" type="button" onClick={() => navigate('/admin')}>
              <TermIcon name="layers" size={12} />Mở v1
            </button>
          </div>
        </div>
        <div className="panel-body">
          {loading ? <div className="ph" style={{ margin: 14 }}>Đang tải…</div>
            : tab === 'users' ? (
              users.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có người dùng</div> : (
                <table className="tbl">
                  <thead><tr><th>Username</th><th>Họ tên</th><th>Khoa</th><th>Vai trò</th><th>Email</th><th>Đăng nhập gần nhất</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className={selUser?.id === u.id ? 'sel' : ''} onClick={() => setSelUser(u)} style={{ cursor: 'pointer' }}>
                        <td className="mono">{u.username}</td>
                        <td style={{ fontWeight: 500 }}>{u.fullName}</td>
                        <td className="muted">{u.departmentName || '—'}</td>
                        <td className="muted">{u.roles?.map((r) => r.roleName).join(', ') || '—'}</td>
                        <td className="muted">{u.email || '—'}</td>
                        <td className="mono">{u.lastLoginDate ? dayjs(u.lastLoginDate).format('DD/MM HH:mm') : '—'}</td>
                        <td>
                          {u.isLocked ? <span className="chip crit">Khoá</span>
                          : u.isActive ? <span className="chip ok">Hoạt động</span>
                          : <span className="chip ghost">Tạm dừng</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )
            : tab === 'roles' ? (
              roles.length === 0 ? <div className="ph" style={{ margin: 14 }}>Không có vai trò</div> : (
                <table className="tbl">
                  <thead><tr><th>Mã</th><th>Tên vai trò</th><th>Mô tả</th><th>Trạng thái</th></tr></thead>
                  <tbody>
                    {roles.map((r) => (
                      <tr key={r.id}>
                        <td className="mono">{r.roleName}</td>
                        <td style={{ fontWeight: 500 }}>{r.roleName}</td>
                        <td className="muted">{r.description || '—'}</td>
                        <td>{r.isActive ? <span className="chip ok">Hoạt động</span> : <span className="chip ghost">Tạm dừng</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )
            : (
              audit.length === 0 ? <div className="ph" style={{ margin: 14 }}>Chưa có nhật ký 7 ngày</div> : (
                <table className="tbl">
                  <thead><tr><th>Thời gian</th><th>User</th><th>Module</th><th>Hành động</th><th>Đối tượng</th><th>HTTP</th></tr></thead>
                  <tbody>
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="mono">{dayjs(a.timestamp).format('DD/MM HH:mm:ss')}</td>
                        <td>{a.userFullName || a.username || '—'}</td>
                        <td className="muted">{a.module || '—'}</td>
                        <td className="muted">{a.action}</td>
                        <td className="muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.entityType ? `${a.entityType} ${a.entityId?.toString().slice(0, 8)}` : '—'}
                        </td>
                        <td className="mono"><span className={'chip ' + (a.responseStatusCode >= 400 ? 'crit' : a.responseStatusCode >= 300 ? 'warn' : 'ok')}>{a.responseStatusCode}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            )}
        </div>
      </div>

      {/* Right: stats + selected user */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div className="panel">
          <div className="panel-h"><span className="title">Tổng quan</span></div>
          <div className="panel-body pad">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Stat label="Tổng user" value={stats.total} />
              <Stat label="Đang hoạt động" value={stats.active} ok />
              <Stat label="Đã khoá" value={stats.locked} crit />
              <Stat label="Vai trò" value={stats.rolesCount} cy />
            </div>
          </div>
        </div>
        {tab === 'users' && (
          <div className="panel" style={{ flex: 1, minHeight: 0 }}>
            <div className="panel-h">
              <span className="title">Chi tiết user</span>
              <span className="sub">{selUser?.fullName || 'Chọn user'}</span>
            </div>
            <div className="panel-body pad">
              {!selUser ? <div className="ph">Chọn user để xem chi tiết</div> : (
                <div className="stack-sm">
                  <Field label="Username" value={<span className="mono">{selUser.username}</span>} />
                  <Field label="Họ tên" value={selUser.fullName} />
                  <Field label="Email" value={selUser.email || '—'} />
                  <Field label="SĐT" value={selUser.phoneNumber || '—'} />
                  <Field label="Mã NV" value={selUser.employeeCode || '—'} />
                  <Field label="Khoa" value={selUser.departmentName || '—'} />
                  <Field label="Vai trò" value={selUser.roles?.map((r) => r.roleName).join(', ') || '—'} />
                  <Field label="Đăng nhập gần nhất" value={selUser.lastLoginDate ? <span className="mono">{dayjs(selUser.lastLoginDate).format('DD/MM/YYYY HH:mm')}</span> : '—'} />
                  <Field label="IP đăng nhập" value={selUser.lastLoginIP ? <span className="mono">{selUser.lastLoginIP}</span> : '—'} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ label, value, warn, cy, ok, crit }) => (
  <div style={{ padding: '10px 12px', background: 'var(--d-1)', borderRadius: 8 }}>
    <div className="mono up" style={{ fontSize: 10, color: 'var(--t-3)', letterSpacing: '0.1em' }}>{label}</div>
    <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{value}</div>
  </div>
);

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div><div className="label">{label}</div><div style={{ fontSize: 13, color: 'var(--t-0)' }}>{value}</div></div>
);

export default SystemAdminV2;
