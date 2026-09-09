import React, { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, Dropdown } from 'antd';
import type { MenuProps } from 'antd';

import { useAuth } from './auth';
import { LoginPage } from './LoginPage';

// Vỏ giao diện dùng LẠI của HIS, không dựng lại: cùng bộ CSS, cùng bộ token Antd, cùng bộ biểu
// tượng. Chép sang đây thì mỗi lần HIS đổi màu là web này ở lại phía sau — mà cả hai đứng cạnh
// nhau trên màn hình của cùng một nhân viên.
import TermIcon from '@/components/layout/terminal/Icon';
import { buildContentTheme } from '@/components/layout/terminal/contentTheme';

// Năm màn dùng LẠI nguyên bản trong frontend/ của HIS qua alias `@` — một bản duy nhất, không copy.
import PatientAppDashboard from '@/modules/administration/pages/PatientAppDashboard';
import PatientAppAccounts from '@/modules/administration/pages/PatientAppAccounts';
import PatientAppFamilies from '@/modules/administration/pages/PatientAppFamilies';
import PatientAppNotifications from '@/modules/administration/pages/PatientAppNotifications';
import PatientAppLookup from '@/modules/administration/pages/PatientAppLookup';

const SCREENS = [
  { key: 'dashboard',     short: 'TỔNG',  label: 'Bảng điều khiển', icon: 'chart',  El: PatientAppDashboard },
  { key: 'accounts',      short: 'T.KHOẢN', label: 'Tài khoản app', icon: 'user',   El: PatientAppAccounts },
  { key: 'families',      short: 'G.ĐÌNH', label: 'Nhóm gia đình',  icon: 'users',  El: PatientAppFamilies },
  { key: 'notifications', short: 'T.BÁO',  label: 'Thông báo',      icon: 'bell',   El: PatientAppNotifications },
  { key: 'lookup',        short: 'CSKH',   label: 'Tra cứu CSKH',   icon: 'search', El: PatientAppLookup },
] as const;

type ScreenKey = (typeof SCREENS)[number]['key'];

const THEME_KEY = 'patientapp_admin_theme';

/** Dải trái 64px — cùng lớp CSS `his-rail` của HIS, chỉ khác danh sách mục. */
const Rail: React.FC<{ current: ScreenKey; onPick: (key: ScreenKey) => void }> = ({ current, onPick }) => (
  <aside className="his-rail">
    <span className="his-rail-mark" title="Quản trị app hỗ trợ người bệnh">APP</span>
    {SCREENS.map((s) => (
      <button
        key={s.key}
        type="button"
        className={'his-rail-item' + (s.key === current ? ' active' : '')}
        title={s.label}
        onClick={() => onPick(s.key)}
      >
        <TermIcon name={s.icon} size={18} />
        <span className="lbl">{s.short}</span>
      </button>
    ))}
    <div className="his-rail-spacer" />
  </aside>
);

/** Thanh trên — đường dẫn bên trái, đồng hồ + người dùng bên phải, hệt HIS. */
const Topbar: React.FC<{
  crumb: string;
  fullName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}> = ({ crumb, fullName, isDark, onToggleTheme, onLogout }) => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][now.getDay()];

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const userMenu: MenuProps['items'] = [
    { key: 'who', label: fullName, disabled: true },
    { type: 'divider' },
    {
      key: 'logout',
      label: <span style={{ color: '#dc2626' }}>Đăng xuất</span>,
      onClick: onLogout,
    },
  ];

  return (
    <header className="his-topbar">
      <div className="his-tb-crumb">
        <span className="hosp">
          <TermIcon name="shield" size={14} /> App hỗ trợ người bệnh
        </span>
        <span className="slash">/</span>
        <span className="here">{crumb}</span>
      </div>
      <div className="his-tb-right">
        <button
          type="button"
          className="his-tb-btn"
          title={isDark ? 'Chế độ Sáng' : 'Chế độ Tối'}
          aria-label="Đổi giao diện Sáng/Tối"
          onClick={onToggleTheme}
        >
          <TermIcon name={isDark ? 'sun' : 'moon'} size={15} />
        </button>
        <button
          type="button"
          className="his-tb-btn"
          title="Làm mới"
          onClick={() => window.location.reload()}
        >
          <TermIcon name="refresh" size={15} />
        </button>
        <div className="his-clock">
          <div>{hh}:{mm}</div>
          <div className="d">{dd}/{mo} · {wd}</div>
        </div>
        <Dropdown menu={{ items: userMenu }} placement="bottomRight" trigger={['click']}>
          <div className="his-user" title={fullName}>
            <div className="avatar">{initials || '?'}</div>
            <div className="who">
              <span className="n">{fullName}</span>
              <span className="r">Quản trị app</span>
            </div>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};

/// Dải trạng thái dưới cùng. Chỉ nêu những gì web này THẬT SỰ biết — nó không nói chuyện với BHYT,
/// HL7 hay PACS, nên không mượn mấy ô đó của HIS để trông cho giống: một dải trạng thái báo "OK"
/// về thứ nó không hề kiểm là chỗ dựa giả.
const StatusBar: React.FC<{ moduleLabel: string }> = ({ moduleLabel }) => (
  <footer className="his-status">
    <span className="seg ok"><span className="seg-dot" /><b>APP NGƯỜI BỆNH</b></span>
    <span className="sep" />
    <span className="seg">MÀN: <b>{moduleLabel.toUpperCase()}</b></span>
    <span className="sep" />
    <span className="seg">MÁY CHỦ: <b>{window.location.host}</b></span>
    <span className="spacer" />
    <span className="seg">Dữ liệu người bệnh — thao tác đều được ghi nhật ký</span>
  </footer>
);

export const App: React.FC = () => {
  const { session, logout } = useAuth();
  const [current, setCurrent] = useState<ScreenKey>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(
    () => localStorage.getItem(THEME_KEY) === 'dark',
  );

  // HIS đặt `data-theme` trên `body`; bộ CSS dùng chung đọc đúng thuộc tính đó để lật bảng màu.
  useEffect(() => {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  const contentTheme = useMemo(() => buildContentTheme(isDark, false), [isDark]);

  // Màn đăng nhập cũng phải theo bảng màu — nhưng không có vỏ shell.
  if (!session) {
    return (
      <ConfigProvider theme={contentTheme}>
        <LoginPage />
      </ConfigProvider>
    );
  }

  const screen = SCREENS.find((s) => s.key === current) ?? SCREENS[0];
  const Screen = screen.El;

  return (
    <div className="his-terminal">
      <div className="his-app" data-band="admin" data-density="normal">
        <Rail current={current} onPick={setCurrent} />
        <Topbar
          crumb={screen.label}
          fullName={session.fullName}
          isDark={isDark}
          onToggleTheme={() => setIsDark((v) => !v)}
          onLogout={logout}
        />
        <div className="his-main">
          <div className="his-content">
            <ConfigProvider theme={contentTheme}>
              <Screen />
            </ConfigProvider>
          </div>
        </div>
      </div>
      <StatusBar moduleLabel={screen.label} />
    </div>
  );
};
