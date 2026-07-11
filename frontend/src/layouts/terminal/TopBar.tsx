import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Popover, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotifications } from '../../contexts/NotificationContext';
import type { NotificationDto } from '../../modules/system/api/notification';
import { useInterval } from '../../hooks/useInterval';
import TermIcon from './Icon';
import AiQueueBadge from '../../modules/radiology/components/AiQueueBadge';
import { HOSPITAL_NAME } from '../../constants/hospital';

/* Auto-extracted from TerminalLayout.tsx (#376 split) — behavior-preserving verbatim move. */

/* ==========================================================================
   Topbar — hospital crumb + command palette + clock/shift/user
   ========================================================================== */

function useClock() {
  const [now, setNow] = useState(new Date());
  useInterval(() => setNow(new Date()), 30_000);
  return now;
}

/** notificationType (Info/Warning/Error/Success) → severity class dùng cho .alert-row. */
const notifSeverityClass = (type?: string): string => {
  switch ((type || '').toLowerCase()) {
    case 'error': return 'crit';
    case 'warning': return 'warn';
    case 'success': return 'ok';
    default: return 'info';
  }
};

/** Giờ ngắn HH:mm cho dòng thông báo (từ createdAt ISO). */
const notifTime = (iso?: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const Topbar: React.FC<{ crumb: string[]; onCmdK: () => void; onSwitchLayout: () => void; onLogout: () => void }> = ({
  crumb,
  onCmdK,
  onSwitchLayout,
  onLogout,
}) => {
  const now = useClock();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark, toggleTheme, isCompact, toggleCompact } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][now.getDay()];
  const fullName = user?.fullName || user?.username || 'Administrator';
  const initials = fullName.split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase().slice(0, 2) || 'A';
  const role = user?.roles?.[0] || 'Admin';

  const onNotifClick = (n: NotificationDto) => {
    if (!n.isRead) { void markAsRead(n.id); }
    if (n.actionUrl) { navigate(n.actionUrl); }
  };

  const notifContent = (
    <div style={{ width: 320, maxHeight: 380, overflow: 'auto', margin: -12 }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)', fontSize: 12, fontWeight: 600, color: 'var(--t-0)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Thông báo</span>
        {unreadCount > 0 ? (
          <button type="button" onClick={() => void markAllAsRead()} style={{ color: 'var(--a-cy)', fontSize: 11, fontWeight: 500, background: 'none', border: 0, cursor: 'pointer' }}>
            Đánh dấu đã đọc ({unreadCount})
          </button>
        ) : (
          <span style={{ color: 'var(--t-2)', fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>0 mới</span>
        )}
      </div>
      {notifications.length === 0 ? (
        <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--t-2)', fontSize: 12 }}>Không có thông báo</div>
      ) : (
        notifications.map((n, i) => (
          <div
            key={n.id}
            className={'alert-row ' + notifSeverityClass(n.notificationType)}
            onClick={() => onNotifClick(n)}
            style={{ padding: '8px 14px', borderTop: i ? '1px solid var(--line-hair)' : 'none', cursor: n.actionUrl ? 'pointer' : 'default', opacity: n.isRead ? 0.6 : 1 }}
          >
            <div className="alert-dt">{notifTime(n.createdAt)}</div>
            <div>
              <div className="alert-who">{n.title}</div>
              <div className="alert-msg">{n.content}</div>
            </div>
          </div>
        ))
      )}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
        <Link to="/v2/admin" style={{ color: 'var(--a-cy)', fontSize: 12, fontWeight: 500 }}>Xem tất cả →</Link>
      </div>
    </div>
  );

  const userMenu: MenuProps['items'] = [
    { key: 'profile', label: <span style={{ fontSize: 12 }}>Hồ sơ · {role}</span>, disabled: true },
    { type: 'divider' },
    { key: 'admin',    label: 'Quản trị hệ thống',      onClick: () => navigate('/v2/admin') },
    { key: 'layout',   label: 'Chuyển sang Layout cũ',  onClick: onSwitchLayout },
    { key: 'help',     label: 'Trợ giúp (F1)',           onClick: () => navigate('/v2/help') },
    { type: 'divider' },
    { key: 'logout',   label: <span style={{ color: '#dc2626' }}>Đăng xuất</span>, onClick: onLogout },
  ];

  return (
    <header className="his-topbar">
      <div className="his-tb-crumb">
        <span className="hosp">
          <TermIcon name="shield" size={14} /> {HOSPITAL_NAME}
        </span>
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            <span className="slash">/</span>
            <span className={i === crumb.length - 1 ? 'here' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <button type="button" className="his-cmd" onClick={onCmdK} title="Command palette (Ctrl+K)">
        <span className="prompt">❯</span>
        <span className="hint">Tìm BN, XN, HĐ, thuốc, phòng… (mã, tên, SĐT)</span>
        <kbd>⌘</kbd><kbd>K</kbd>
      </button>
      <div className="his-tb-right">
        <div className="his-chip-shift"><span className="dot" />CA SÁNG · {hh}:{mm}</div>
        <button type="button" className="his-tb-btn" title={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'} aria-label="Đổi giao diện Sáng/Tối" onClick={toggleTheme}>
          <TermIcon name={isDark ? 'sun' : 'moon'} size={15} />
        </button>
        <button type="button" className={`his-tb-btn${isCompact ? ' on' : ''}`} title={isCompact ? 'Mật độ Thường' : 'Mật độ Gọn'} aria-label="Đổi mật độ hiển thị" aria-pressed={isCompact} onClick={toggleCompact}>
          <TermIcon name="list" size={15} />
        </button>
        <button type="button" className="his-tb-btn" title="Giao ca / Làm mới" onClick={() => window.location.reload()}>
          <TermIcon name="refresh" size={15} />
        </button>
        <button type="button" className="his-tb-btn" title="Trợ giúp (F1)" onClick={() => navigate('/v2/help')}>
          <TermIcon name="info" size={15} />
        </button>
        <AiQueueBadge />
        <Popover content={notifContent} trigger="click" placement="bottomRight" styles={{ content: { padding: 12 } }}>
          <button type="button" className="his-tb-btn" title={unreadCount > 0 ? `Thông báo (${unreadCount} mới)` : 'Thông báo'} aria-label="Thông báo">
            <TermIcon name="bell" size={15} />
            {unreadCount > 0 && <span className="dot-alert" />}
          </button>
        </Popover>
        <button type="button" className="his-tb-btn" onClick={onSwitchLayout} title="Chuyển sang Layout cũ (v1)">
          <TermIcon name="external" size={15} />
        </button>
        <div className="his-clock">
          <div>{hh}:{mm}</div>
          <div className="d">{dd}/{mo} · {wd}</div>
        </div>
        <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
          <div className="his-user" title={fullName}>
            <div className="avatar">{initials}</div>
            <div className="who">
              <span className="n">{fullName}</span>
              <span className="r">{role}</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

export { Topbar };
