import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import TermIcon from './Icon';
import './terminal.css';
import './terminal-antd.css';

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
  { path: '/v2/emr', label: 'Hồ sơ bệnh án', icon: 'layers' },
  { path: '/v2/admin', label: 'Quản trị', icon: 'settings' },
];

const RAIL_GROUPS: Route[][] = [
  [ROUTES[0]],
  [ROUTES[1], ROUTES[2], ROUTES[3], ROUTES[4]],
  [ROUTES[6], ROUTES[7]],
  [ROUTES[8]],
  [ROUTES[5]],
  [ROUTES[9]],
];

// Full module list grouped by domain (shown in the subnav when the current
// rail button doesn't have a dedicated subnav config below). Every path here
// corresponds to a real route under /v2/*.
type ModuleGroup = { label: string; items: { path: string; label: string }[] };

const ALL_MODULES: ModuleGroup[] = [
  {
    label: 'LÂM SÀNG',
    items: [
      { path: '/v2/reception', label: 'Tiếp nhận' },
      { path: '/v2/opd', label: 'Khám ngoại trú' },
      { path: '/v2/prescription', label: 'Kê đơn' },
      { path: '/v2/ipd', label: 'Nội trú' },
      { path: '/v2/surgery', label: 'Phẫu thuật' },
      { path: '/v2/consultation', label: 'Hội chẩn' },
      { path: '/v2/emr', label: 'Hồ sơ bệnh án' },
      { path: '/v2/specialty-emr', label: 'BA Chuyên khoa' },
      { path: '/v2/follow-up', label: 'Tái khám' },
      { path: '/v2/telemedicine', label: 'Telemedicine' },
    ],
  },
  {
    label: 'CẬN LÂM SÀNG',
    items: [
      { path: '/v2/lab', label: 'Xét nghiệm' },
      { path: '/v2/lab-qc', label: 'Lab QC' },
      { path: '/v2/microbiology', label: 'Vi sinh' },
      { path: '/v2/culture-collection', label: 'Lưu chủng' },
      { path: '/v2/sample-storage', label: 'Lưu mẫu' },
      { path: '/v2/screening', label: 'Sàng lọc' },
      { path: '/v2/reagent-management', label: 'Hoá chất' },
      { path: '/v2/sample-tracking', label: 'Theo dõi mẫu' },
      { path: '/v2/pathology', label: 'Giải phẫu bệnh' },
      { path: '/v2/ivf-lab', label: 'IVF' },
      { path: '/v2/radiology', label: 'CĐHA' },
      { path: '/v2/blood-bank', label: 'Ngân hàng máu' },
    ],
  },
  {
    label: 'NHÀ THUỐC / VẬT TƯ',
    items: [
      { path: '/v2/pharmacy', label: 'Nhà thuốc' },
      { path: '/v2/hospital-pharmacy', label: 'Nhà thuốc BV' },
      { path: '/v2/medical-supply', label: 'Vật tư y tế' },
      { path: '/v2/procurement', label: 'Mua sắm' },
    ],
  },
  {
    label: 'TÀI CHÍNH / BHYT',
    items: [
      { path: '/v2/billing', label: 'Thanh toán' },
      { path: '/v2/finance', label: 'Tài chính' },
      { path: '/v2/insurance', label: 'Bảo hiểm' },
      { path: '/v2/bhxh-audit', label: 'BHXH Audit' },
    ],
  },
  {
    label: 'Y TẾ CÔNG CỘNG',
    items: [
      { path: '/v2/health-checkup', label: 'Khám sức khoẻ' },
      { path: '/v2/immunization', label: 'Tiêm chủng' },
      { path: '/v2/epidemiology', label: 'Dịch tễ' },
      { path: '/v2/school-health', label: 'Y tế học đường' },
      { path: '/v2/occupational-health', label: 'Y học lao động' },
      { path: '/v2/community-health', label: 'Y tế cộng đồng' },
      { path: '/v2/environmental-health', label: 'SK Môi trường' },
      { path: '/v2/population-health', label: 'SK Dân số' },
      { path: '/v2/reproductive-health', label: 'SK Sinh sản' },
      { path: '/v2/health-education', label: 'Giáo dục SK' },
      { path: '/v2/food-safety', label: 'An toàn thực phẩm' },
    ],
  },
  {
    label: 'CHƯƠNG TRÌNH',
    items: [
      { path: '/v2/chronic-disease', label: 'Bệnh mạn tính' },
      { path: '/v2/methadone-treatment', label: 'Methadone' },
      { path: '/v2/tb-hiv', label: 'Lao/HIV' },
      { path: '/v2/hiv-management', label: 'Quản lý HIV' },
      { path: '/v2/rehabilitation', label: 'PHCN' },
      { path: '/v2/nutrition', label: 'Dinh dưỡng' },
      { path: '/v2/mental-health', label: 'Tâm thần' },
      { path: '/v2/traditional-medicine', label: 'YHCT' },
      { path: '/v2/trauma-registry', label: 'Chấn thương' },
      { path: '/v2/medical-forensics', label: 'Giám định' },
    ],
  },
  {
    label: 'CHẤT LƯỢNG / CỔNG',
    items: [
      { path: '/v2/quality', label: 'Chất lượng' },
      { path: '/v2/infection-control', label: 'Kiểm soát NK' },
      { path: '/v2/satisfaction-survey', label: 'Khảo sát' },
      { path: '/v2/patient-portal', label: 'Cổng BN' },
      { path: '/v2/doctor-portal', label: 'Cổng BS' },
      { path: '/v2/emergency-disaster', label: 'Cấp cứu / Thảm hoạ' },
      { path: '/v2/health-exchange', label: 'HIE' },
      { path: '/v2/inter-hospital', label: 'Chia sẻ liên viện' },
    ],
  },
  {
    label: 'QUẢN TRỊ',
    items: [
      { path: '/v2/admin', label: 'Quản trị' },
      { path: '/v2/master-data', label: 'Danh mục' },
      { path: '/v2/reports', label: 'Báo cáo' },
      { path: '/v2/dashboard-3cap', label: 'Dashboard 3 cấp' },
      { path: '/v2/hr', label: 'Nhân sự' },
      { path: '/v2/equipment', label: 'Trang thiết bị' },
      { path: '/v2/asset-management', label: 'Tài sản' },
      { path: '/v2/training-research', label: 'Đào tạo & NCKH' },
      { path: '/v2/booking-management', label: 'Đặt lịch' },
      { path: '/v2/sms-management', label: 'SMS' },
      { path: '/v2/digital-signature', label: 'Ký số' },
      { path: '/v2/central-signing', label: 'Ký số TT' },
      { path: '/v2/signing-workflow', label: 'Quy trình ký' },
      { path: '/v2/endpoint-security', label: 'Bảo mật endpoint' },
      { path: '/v2/medical-record-archive', label: 'Lưu trữ HS' },
      { path: '/v2/medical-record-planning', label: 'Lập KH HS' },
      { path: '/v2/treatment-protocols', label: 'Phác đồ' },
      { path: '/v2/clinical-guidance', label: 'Hướng dẫn LS' },
      { path: '/v2/lis-config', label: 'LIS Config' },
      { path: '/v2/practice-license', label: 'Hành nghề' },
      { path: '/v2/help', label: 'Trợ giúp' },
    ],
  },
];


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

const SubNav: React.FC<{ path: string; onNav: (p: string) => void }> = ({ path, onNav }) => (
  <nav className="subnav" style={{ overflowY: 'auto' }}>
    <div className="subnav-eyebrow">MODULES</div>
    <div className="subnav-title">HIS System</div>
    <div className="subnav-sub">Tất cả chức năng</div>
    <button
      type="button"
      className={'subnav-item ' + (path === '/v2/dashboard' ? 'active' : '')}
      onClick={() => onNav('/v2/dashboard')}
    >
      <span className="lbl">Tổng quan</span>
      <span className="dot-live" />
    </button>
    {ALL_MODULES.map((group, gi) => (
      <React.Fragment key={gi}>
        <div className="subnav-group">{group.label}</div>
        {group.items.map((it) => (
          <button
            key={it.path}
            type="button"
            className={'subnav-item ' + (path === it.path ? 'active' : '')}
            onClick={() => onNav(it.path)}
          >
            <span className="lbl">{it.label}</span>
          </button>
        ))}
      </React.Fragment>
    ))}
    <div className="subnav-card" style={{ marginTop: 18 }}>
      <div className="lbl">Layout mới</div>
      <div className="val">v2.0</div>
      <div className="hint">Mẫu Terminal · so sánh với v1</div>
    </div>
  </nav>
);

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
            <span className="r">{user?.roles?.[0] || 'Admin'}</span>
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
        <SubNav path={location.pathname} onNav={(p) => navigate(p)} />
        <div className="main">
          <CommandBar path={location.pathname} onSwitchLayout={onSwitchLayout} />
          <div className="content">
            {/* Inside /v2/* all Antd pages inherit the clinical-blue terminal
                theme tokens: same components, very different look (Inter font,
                tight radii, #2563eb primary, taut control height). */}
            <ConfigProvider
              theme={{
                token: {
                  colorPrimary: '#2563eb',
                  colorInfo: '#0284c7',
                  colorSuccess: '#16a34a',
                  colorWarning: '#d97706',
                  colorError: '#dc2626',
                  colorText: '#0f172a',
                  colorTextSecondary: '#334155',
                  colorTextTertiary: '#64748b',
                  colorBorder: '#e4e9f0',
                  colorBorderSecondary: '#edf1f6',
                  colorBgContainer: '#ffffff',
                  colorBgLayout: '#f7f9fc',
                  colorBgElevated: '#ffffff',
                  colorFillAlter: '#f1f5f9',
                  colorFillContent: '#f1f5f9',
                  borderRadius: 6,
                  borderRadiusLG: 8,
                  borderRadiusSM: 4,
                  controlHeight: 34,
                  controlHeightLG: 40,
                  controlHeightSM: 26,
                  fontFamily: 'Inter, "IBM Plex Sans", system-ui, sans-serif',
                  fontSize: 13,
                  fontSizeLG: 14,
                  fontSizeSM: 12,
                  fontSizeHeading1: 32,
                  fontSizeHeading2: 26,
                  fontSizeHeading3: 20,
                  fontSizeHeading4: 16,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                  boxShadowSecondary: '0 4px 12px rgba(15, 23, 42, 0.08)',
                  wireframe: false,
                },
                components: {
                  Button: {
                    primaryShadow: 'none',
                    defaultShadow: 'none',
                    dangerShadow: 'none',
                    fontWeight: 500,
                  },
                  Card: {
                    headerHeight: 44,
                    headerHeightSM: 36,
                    paddingLG: 18,
                  },
                  Table: {
                    headerBg: '#f7f9fc',
                    headerColor: '#64748b',
                    headerSplitColor: '#e4e9f0',
                    rowHoverBg: '#f7f9fc',
                    rowSelectedBg: '#eff5ff',
                    rowSelectedHoverBg: '#e5edf7',
                    borderColor: '#f1f4f9',
                    cellPaddingBlock: 10,
                    cellPaddingInline: 14,
                    cellFontSize: 13,
                  },
                  Tag: {
                    defaultBg: '#f1f5f9',
                    defaultColor: '#334155',
                  },
                  Tabs: {
                    titleFontSize: 13,
                    horizontalItemGutter: 24,
                    inkBarColor: '#2563eb',
                    itemSelectedColor: '#2563eb',
                    itemActiveColor: '#1d4ed8',
                    itemHoverColor: '#0f172a',
                  },
                  Menu: {
                    itemBg: 'transparent',
                    itemColor: '#334155',
                    itemHoverBg: '#f1f5f9',
                    itemSelectedBg: '#eff5ff',
                    itemSelectedColor: '#2563eb',
                    itemHeight: 36,
                    itemBorderRadius: 4,
                  },
                  Input: {
                    hoverBorderColor: '#bfd3fa',
                    activeBorderColor: '#2563eb',
                    activeShadow: '0 0 0 3px #eff5ff',
                  },
                  Select: {
                    optionSelectedBg: '#eff5ff',
                    optionSelectedColor: '#2563eb',
                  },
                  Statistic: {
                    titleFontSize: 11,
                    contentFontSize: 26,
                  },
                  Modal: {
                    titleFontSize: 15,
                    headerBg: '#ffffff',
                  },
                  Descriptions: {
                    titleColor: '#64748b',
                    labelBg: '#f7f9fc',
                  },
                  Drawer: {
                    fontSizeLG: 15,
                  },
                  Alert: {
                    defaultPadding: '8px 12px',
                  },
                  Segmented: {
                    itemSelectedBg: '#ffffff',
                    itemSelectedColor: '#0f172a',
                    trackBg: '#f7f9fc',
                  },
                  Form: {
                    labelColor: '#64748b',
                    labelFontSize: 12,
                  },
                },
              }}
            >
              <Outlet />
            </ConfigProvider>
          </div>
        </div>
        <StatusBar path={location.pathname} />
      </div>
    </div>
  );
};

export default TerminalLayout;
