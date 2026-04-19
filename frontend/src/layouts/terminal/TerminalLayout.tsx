import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TermIcon from './Icon';
import './terminal.css';

type Route = {
  path: string;
  label: string;
  icon: string;
  hot?: number;
};

const ROUTES: Route[] = [
  { path: '/v2/dashboard', label: 'Tổng quan', icon: 'grid' },
  { path: '/v2/reception', label: 'Tiếp nhận', icon: 'user-plus' },
  { path: '/v2/opd', label: 'Khám ngoại trú', icon: 'stethoscope' },
  { path: '/v2/ipd', label: 'Nội trú', icon: 'bed' },
  { path: '/v2/surgery', label: 'Phẫu thuật', icon: 'scalpel' },
  { path: '/v2/billing', label: 'Thanh toán', icon: 'receipt' },
  { path: '/v2/radiology', label: 'Chẩn đoán hình ảnh', icon: 'scan' },
  { path: '/v2/lab', label: 'Xét nghiệm', icon: 'flask' },
];

const RAIL_GROUPS: Route[][] = [
  [ROUTES[0]],
  [ROUTES[1], ROUTES[2], ROUTES[3], ROUTES[4]],
  [ROUTES[6], ROUTES[7]],
  [ROUTES[5]],
];

type SubNavItem = { id: string; label: string; tag?: string; live?: boolean };
type SubNavGroup = { label: string; items: SubNavItem[] };
type SubNavData = {
  eyebrow: string;
  title: string;
  sub: string;
  groups: SubNavGroup[];
};

const SUBNAV: Record<string, SubNavData> = {
  '/v2/dashboard': {
    eyebrow: 'OVERVIEW',
    title: 'Tổng quan',
    sub: 'Ca trực · 07:00 → 15:00',
    groups: [
      {
        label: 'HÔM NAY',
        items: [
          { id: 'today', label: 'Dashboard ca trực', tag: 'LIVE', live: true },
          { id: 'alerts', label: 'Cảnh báo' },
          { id: 'kpi', label: 'KPI khoa' },
        ],
      },
      {
        label: 'LỐI TẮT',
        items: [
          { id: 'sh-rx', label: 'Đơn thuốc chờ ký' },
          { id: 'sh-lab', label: 'Kết quả lab mới' },
        ],
      },
    ],
  },
  '/v2/reception': {
    eyebrow: 'CLINICAL · REG',
    title: 'Tiếp nhận',
    sub: 'Quầy · kíp sáng',
    groups: [
      {
        label: 'LUỒNG',
        items: [
          { id: 'queue', label: 'Hàng chờ OPD', tag: 'today' },
          { id: 'new', label: 'Bệnh nhân mới' },
          { id: 'return', label: 'Tái khám' },
        ],
      },
      {
        label: 'TRA CỨU',
        items: [
          { id: 'lookup', label: 'Tra cứu BHYT' },
          { id: 'family', label: 'Hộ gia đình' },
        ],
      },
    ],
  },
  '/v2/opd': {
    eyebrow: 'CLINICAL · OPD',
    title: 'Khám ngoại trú',
    sub: 'Phòng khám hiện hành',
    groups: [
      {
        label: 'DANH SÁCH',
        items: [
          { id: 'mine', label: 'BN của tôi' },
          { id: 'all', label: 'Toàn khoa' },
          { id: 'pri', label: 'Ưu tiên' },
        ],
      },
      {
        label: 'HỒ SƠ',
        items: [
          { id: 'cur', label: 'BN đang khám' },
          { id: 'hist', label: 'Lịch sử hôm nay' },
        ],
      },
    ],
  },
};

const getSubnavFor = (path: string): SubNavData => {
  const exact = SUBNAV[path];
  if (exact) return exact;
  return {
    eyebrow: 'MODULE',
    title: path.split('/').pop() || 'HIS',
    sub: 'Bản xem trước',
    groups: [],
  };
};

const Rail: React.FC<{ path: string; onNav: (p: string) => void }> = ({ path, onNav }) => {
  const isActive = (routePath: string) => path === routePath || path.startsWith(routePath + '/');
  return (
    <aside className="rail">
      <div className="rail-mark" title="HIS System">H</div>
      {RAIL_GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="rail-group-line" />}
          {group.map((r) => (
            <button
              key={r.path}
              className={'rail-item ' + (isActive(r.path) ? 'active' : '')}
              onClick={() => onNav(r.path)}
              type="button"
            >
              <TermIcon name={r.icon} size={18} />
              {r.hot && <span className="hot">{r.hot}</span>}
              <span className="tip">{r.label}</span>
            </button>
          ))}
        </React.Fragment>
      ))}
      <div className="rail-spacer" />
      <button className="rail-item" type="button" title="Chuyển sang layout cũ">
        <TermIcon name="layers" size={18} />
        <span className="tip">Layout cũ</span>
      </button>
    </aside>
  );
};

const SubNav: React.FC<{ path: string }> = ({ path }) => {
  const data = getSubnavFor(path);
  return (
    <nav className="subnav">
      <div className="subnav-eyebrow">{data.eyebrow}</div>
      <div className="subnav-title">{data.title}</div>
      <div className="subnav-sub">{data.sub}</div>
      {data.groups.map((g, gi) => (
        <React.Fragment key={gi}>
          <div className="subnav-group">{g.label}</div>
          {g.items.map((it) => (
            <button
              key={it.id}
              type="button"
              className={'subnav-item ' + (it.id === data.groups[0].items[0].id ? 'active' : '')}
            >
              <span className="lbl">{it.label}</span>
              {it.live ? (
                <span className="dot-live" />
              ) : it.tag ? (
                <span className="tag">{it.tag}</span>
              ) : null}
            </button>
          ))}
        </React.Fragment>
      ))}
      <div className="subnav-spacer" />
      <div className="subnav-card">
        <div className="lbl">Layout mới</div>
        <div className="val">v2.0</div>
        <div className="hint">Mẫu Terminal · so sánh với v1</div>
      </div>
    </nav>
  );
};

const CommandBar: React.FC<{ path: string; onSwitchLayout: () => void }> = ({ path, onSwitchLayout }) => {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const i = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(i);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const here = ROUTES.find((r) => path === r.path || path.startsWith(r.path + '/'));
  const fullName = user?.fullName || 'Administrator';
  const initials = fullName
    .split(' ')
    .slice(-2)
    .map((s) => s[0])
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <header className="cmdbar">
      <div className="cmdbar-path">
        <span>his</span>
        <span className="slash">/</span>
        <span>v2</span>
        <span className="slash">/</span>
        <span className="here">{here ? here.label : ''}</span>
      </div>
      <div className="cmd">
        <span className="prompt">❯</span>
        <span className="hint">Tìm bệnh nhân, mã BN, hoặc gõ lệnh…</span>
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </div>
      <div className="cmdbar-right">
        <div className="chip-shift">
          <span className="dot" />
          CA TRỰC · {hh}:{mm}
        </div>
        <button className="topbtn" type="button" onClick={onSwitchLayout} title="Chuyển sang layout cũ">
          <TermIcon name="layers" size={14} />
          Layout cũ
        </button>
        <button className="topbtn icon" type="button" title="Thông báo">
          <TermIcon name="bell" size={15} />
        </button>
        <div className="user" title={fullName}>
          <div className="avatar">{initials.slice(0, 2) || 'AD'}</div>
          <div className="who">
            <span className="n">{fullName}</span>
            <span className="r">{user?.role || 'Admin'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

const StatusBar: React.FC<{ path: string }> = ({ path }) => (
  <footer className="statusbar">
    <span className="sb-seg ok">
      <span className="dot ok" />
      <b>ONLINE</b>
    </span>
    <span className="sep" />
    <span className="sb-seg">
      DB <b>Cloud SQL</b>
    </span>
    <span className="sep" />
    <span className="sb-seg">
      API <b>Cloud Run</b>
    </span>
    <span className="sep" />
    <span className="sb-seg">
      ROUTE · {path.replace('/v2/', '').toUpperCase() || 'ROOT'}
    </span>
    <div style={{ marginLeft: 'auto' }} />
    <span className="sb-seg">v2.0</span>
    <span className="sep" />
    <span className="sb-seg">© 2026 HIS</span>
  </footer>
);

const TerminalLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const onSwitchLayout = () => {
    // strip /v2 prefix and navigate back to v1 equivalent
    const v1 = location.pathname.replace(/^\/v2/, '') || '/';
    navigate(v1);
  };

  return (
    <div className="his-terminal">
      <div className="app">
        <Rail path={location.pathname} onNav={(p) => navigate(p)} />
        <SubNav path={location.pathname} />
        <div className="main">
          <CommandBar path={location.pathname} onSwitchLayout={onSwitchLayout} />
          <div className="content">
            <Outlet />
          </div>
        </div>
        <StatusBar path={location.pathname} />
      </div>
    </div>
  );
};

export default TerminalLayout;
