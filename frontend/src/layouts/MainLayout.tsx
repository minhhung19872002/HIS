import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Drawer, Tooltip } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  MedicineBoxOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  IdcardOutlined,
  ExperimentOutlined,
  DollarOutlined,
  ScanOutlined,
  HeartOutlined,
  SafetyOutlined,
  DatabaseOutlined,
  BarChartOutlined,
  BankOutlined,
  VideoCameraOutlined,
  CoffeeOutlined,
  AlertOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  SolutionOutlined,
  AuditOutlined,
  MobileOutlined,
  CloudUploadOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  FolderOpenOutlined,
  CalendarOutlined,
  ScheduleOutlined,
  SafetyCertificateOutlined,
  ContainerOutlined,
  InsuranceOutlined,
  SmileOutlined,
  LaptopOutlined,
  CheckSquareOutlined,
  BugOutlined,
  InboxOutlined,
  NodeIndexOutlined,
  FilterOutlined,
  FileSearchOutlined,
  MessageOutlined,
  HomeOutlined,
  ShopOutlined,
  FileProtectOutlined,
  ReadOutlined,
  CloudOutlined,
  SwapOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ErrorBoundary from '../components/ErrorBoundary';
import NotificationBell from '../components/NotificationBell';

const { Header, Sider, Content } = Layout;

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth;
      setIsMobile(w < MOBILE_BREAKPOINT);
      setIsTablet(w >= MOBILE_BREAKPOINT && w < TABLET_BREAKPOINT);
      if (w < TABLET_BREAKPOINT) {
        setCollapsed(true);
      }
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  // Close mobile drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // Auto-open the sidebar group containing the current route
  const getOpenKeys = (): string[] => {
    const path = location.pathname;
    const groupMap: Record<string, string[]> = {
      clinical: ['/reception', '/opd', '/telemedicine', '/prescription', '/ipd', '/surgery', '/emr', '/medical-record-archive', '/medical-record-planning', '/follow-up', '/booking-management', '/treatment-protocols', '/chronic-disease', '/tb-hiv'],
      paraclinical: ['/lab', '/lab-qc', '/microbiology', '/culture-collection', '/screening', '/sample-storage', '/sample-tracking', '/reagent-management', '/radiology', '/consultation', '/blood-bank', '/pathology', '/lis-config'],
      support: ['/pharmacy', '/medical-supply', '/hospital-pharmacy', '/nutrition', '/rehabilitation'],
      finance: ['/billing', '/finance', '/insurance', '/bhxh-audit'],
      management: ['/infection-control', '/equipment', '/hr', '/quality'],
      integration: ['/health-exchange', '/emergency-disaster', '/clinical-guidance'],
      publicHealth: ['/health-checkup', '/immunization', '/epidemiology', '/school-health', '/occupational-health', '/methadone-treatment', '/food-safety', '/community-health', '/hiv-management'],
      medinetYtcc: ['/medical-forensics', '/traditional-medicine', '/reproductive-health', '/mental-health', '/environmental-health', '/trauma-registry', '/population-health', '/health-education', '/practice-license', '/inter-hospital'],
      system: ['/master-data', '/reports', '/admin', '/digital-signature', '/signing-workflow', '/patient-portal', '/doctor-portal', '/satisfaction-survey', '/sms-management', '/help'],
    };
    for (const [group, routes] of Object.entries(groupMap)) {
      if (routes.includes(path)) return [group];
    }
    return [];
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Tổng quan',
    },
    {
      key: 'clinical',
      icon: <TeamOutlined />,
      label: 'Lâm sàng',
      children: [
        { key: '/reception', icon: <IdcardOutlined />, label: 'Tiếp đón' },
        { key: '/opd', icon: <UserOutlined />, label: 'Khám bệnh' },
        { key: '/telemedicine', icon: <VideoCameraOutlined />, label: 'Khám từ xa' },
        { key: '/prescription', icon: <FileTextOutlined />, label: 'Kê đơn' },
        { key: '/ipd', icon: <HomeOutlined />, label: 'Nội trú' },
        { key: '/surgery', icon: <HeartOutlined />, label: 'Phẫu thuật' },
        { key: '/emr', icon: <FolderOpenOutlined />, label: 'Hồ sơ BA (EMR)' },
        { key: '/specialty-emr', icon: <FolderOpenOutlined />, label: 'BA Chuyên khoa' },
        { key: '/medical-record-archive', icon: <ContainerOutlined />, label: 'Lưu trữ HSBA' },
        { key: '/medical-record-planning', icon: <ScheduleOutlined />, label: 'Kế hoạch TH' },
        { key: '/follow-up', icon: <CalendarOutlined />, label: 'Tái khám' },
        { key: '/booking-management', icon: <ScheduleOutlined />, label: 'Quản lý đặt lịch' },
        { key: '/treatment-protocols', icon: <ExperimentOutlined />, label: 'Phác đồ điều trị' },
        { key: '/chronic-disease', icon: <HeartOutlined />, label: 'Bệnh mãn tính' },
        { key: '/tb-hiv', icon: <MedicineBoxOutlined />, label: 'Quản lý Lao/HIV' },
      ],
    },
    {
      key: 'paraclinical',
      icon: <ExperimentOutlined />,
      label: 'Cận lâm sàng',
      children: [
        { key: '/lab', icon: <ExperimentOutlined />, label: 'Xét nghiệm' },
        { key: '/lab-qc', icon: <CheckSquareOutlined />, label: 'QC Kiểm định' },
        { key: '/microbiology', icon: <BugOutlined />, label: 'Vi sinh' },
        { key: '/culture-collection', icon: <InboxOutlined />, label: 'Lưu chủng VS' },
        { key: '/screening', icon: <FilterOutlined />, label: 'Sàng lọc SS/TS' },
        { key: '/sample-storage', icon: <DatabaseOutlined />, label: 'Lưu trữ mẫu' },
        { key: '/sample-tracking', icon: <NodeIndexOutlined />, label: 'Theo dõi mẫu' },
        { key: '/reagent-management', icon: <MedicineBoxOutlined />, label: 'Hóa chất XN' },
        { key: '/radiology', icon: <ScanOutlined />, label: 'CĐHA' },
        { key: '/consultation', icon: <TeamOutlined />, label: 'Hội chẩn' },
        { key: '/blood-bank', icon: <HeartOutlined />, label: 'Ngân hàng máu' },
        { key: '/pathology', icon: <FileSearchOutlined />, label: 'Giải phẫu bệnh' },
        { key: '/ivf-lab', icon: <ExperimentOutlined />, label: 'Phòng Lab IVF' },
        { key: '/lis-config', icon: <SettingOutlined />, label: 'Cấu hình LIS' },
      ],
    },
    {
      key: 'support',
      icon: <MedicineBoxOutlined />,
      label: 'Hỗ trợ điều trị',
      children: [
        { key: '/pharmacy', icon: <MedicineBoxOutlined />, label: 'Nhà thuốc' },
        { key: '/hospital-pharmacy', icon: <ShopOutlined />, label: 'Nhà thuốc BV' },
        { key: '/medical-supply', icon: <ToolOutlined />, label: 'Vật tư Y tế' },
        { key: '/nutrition', icon: <CoffeeOutlined />, label: 'Dinh dưỡng' },
        { key: '/rehabilitation', icon: <ThunderboltOutlined />, label: 'VLTL/PHCN' },
      ],
    },
    {
      key: 'finance',
      icon: <DollarOutlined />,
      label: 'Tài chính',
      children: [
        { key: '/billing', icon: <DollarOutlined />, label: 'Viện phí' },
        { key: '/finance', icon: <BankOutlined />, label: 'Quản lý tài chính' },
        { key: '/insurance', icon: <SafetyOutlined />, label: 'Giám định BHYT' },
        { key: '/bhxh-audit', icon: <InsuranceOutlined />, label: 'BHXH Giám định' },
      ],
    },
    {
      key: 'management',
      icon: <ToolOutlined />,
      label: 'Quản lý',
      children: [
        { key: '/infection-control', icon: <AlertOutlined />, label: 'KSNK' },
        { key: '/equipment', icon: <ToolOutlined />, label: 'Thiết bị y tế' },
        { key: '/asset-management', icon: <DatabaseOutlined />, label: 'Tài sản - CCDC' },
        { key: '/procurement', icon: <InboxOutlined />, label: 'Đề xuất - Dự trù' },
        { key: '/hr', icon: <SolutionOutlined />, label: 'Nhân sự' },
        { key: '/training-research', icon: <ReadOutlined />, label: 'Đào tạo - NCKH' },
        { key: '/quality', icon: <AuditOutlined />, label: 'Chất lượng' },
      ],
    },
    {
      key: 'integration',
      icon: <CloudUploadOutlined />,
      label: 'Liên thông',
      children: [
        { key: '/health-exchange', icon: <CloudUploadOutlined />, label: 'Liên thông Y tế' },
        { key: '/emergency-disaster', icon: <BellOutlined />, label: 'Cấp cứu thảm họa' },
        { key: '/clinical-guidance', icon: <TeamOutlined />, label: 'Chỉ đạo tuyến' },
      ],
    },
    {
      key: 'publicHealth',
      icon: <FileProtectOutlined />,
      label: 'Y tế công cộng',
      children: [
        { key: '/health-checkup', icon: <FileProtectOutlined />, label: 'Khám sức khỏe' },
        { key: '/immunization', icon: <ExperimentOutlined />, label: 'Tiêm chủng' },
        { key: '/epidemiology', icon: <AlertOutlined />, label: 'Giám sát dịch tễ' },
        { key: '/school-health', icon: <ReadOutlined />, label: 'Y tế trường học' },
        { key: '/occupational-health', icon: <SafetyCertificateOutlined />, label: 'SK nghề nghiệp' },
        { key: '/methadone-treatment', icon: <MedicineBoxOutlined />, label: 'Methadone' },
        { key: '/food-safety', icon: <AlertOutlined />, label: 'ATVSTP' },
        { key: '/community-health', icon: <HomeOutlined />, label: 'SK cộng đồng' },
        { key: '/hiv-management', icon: <MedicineBoxOutlined />, label: 'Quản lý HIV' },
      ],
    },
    {
      key: 'medinetYtcc',
      icon: <CloudOutlined />,
      label: 'Medinet YTCC',
      children: [
        { key: '/medical-forensics', icon: <AuditOutlined />, label: 'Giám định Y khoa' },
        { key: '/traditional-medicine', icon: <ExperimentOutlined />, label: 'Y học cổ truyền' },
        { key: '/reproductive-health', icon: <HeartOutlined />, label: 'SK sinh sản' },
        { key: '/mental-health', icon: <SmileOutlined />, label: 'SK tâm thần' },
        { key: '/environmental-health', icon: <CloudOutlined />, label: 'Môi trường y tế' },
        { key: '/trauma-registry', icon: <ThunderboltOutlined />, label: 'Sổ chấn thương' },
        { key: '/population-health', icon: <TeamOutlined />, label: 'Dân số KHHGĐ' },
        { key: '/health-education', icon: <ReadOutlined />, label: 'Truyền thông GDSK' },
        { key: '/practice-license', icon: <SafetyCertificateOutlined />, label: 'Hành nghề' },
        { key: '/inter-hospital', icon: <SwapOutlined />, label: 'Liên viện' },
      ],
    },
    {
      key: 'system',
      icon: <SettingOutlined />,
      label: 'Hệ thống',
      children: [
        { key: '/master-data', icon: <DatabaseOutlined />, label: 'Danh mục' },
        { key: '/reports', icon: <BarChartOutlined />, label: 'Báo cáo' },
        { key: '/admin', icon: <SettingOutlined />, label: 'Quản trị' },
        { key: '/digital-signature', icon: <SafetyCertificateOutlined />, label: 'Chữ ký số' },
        { key: '/central-signing', icon: <SafetyCertificateOutlined />, label: 'Ký số tập trung' },
        { key: '/signing-workflow', icon: <AuditOutlined />, label: 'Trình ký' },
        { key: '/patient-portal', icon: <MobileOutlined />, label: 'Cổng bệnh nhân' },
        { key: '/doctor-portal', icon: <LaptopOutlined />, label: 'Cổng bác sĩ' },
        { key: '/satisfaction-survey', icon: <SmileOutlined />, label: 'Khảo sát hài lòng' },
        { key: '/endpoint-security', icon: <SafetyOutlined />, label: 'An toàn thông tin' },
        { key: '/sms-management', icon: <MessageOutlined />, label: 'SMS Gateway' },
        { key: '/help', icon: <QuestionCircleOutlined />, label: 'Hướng dẫn' },
      ],
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Thông tin cá nhân',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      navigate('/login');
    } else if (key === 'profile') {
      navigate('/profile');
    }
  };

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const sidebarMenu = (
    <>
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: isDark ? '1px solid #303030' : '1px solid #e8ecf0',
        background: isDark ? '#141414' : '#fff',
      }}>
        <Typography.Title level={4} style={{ color: '#0066CC', margin: 0, fontWeight: 700 }}>
          {collapsed && !isMobile ? 'HIS' : 'HIS System'}
        </Typography.Title>
      </div>
      <Menu
        theme={isDark ? 'dark' : 'light'}
        mode="inline"
        selectedKeys={[location.pathname]}
        defaultOpenKeys={getOpenKeys()}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  const contentPadding = isMobile ? 12 : isTablet ? 16 : 24;
  const contentMargin = isMobile ? '8px 4px' : isTablet ? '12px 8px' : '24px 16px';

  return (
    <Layout style={{ minHeight: '100vh', height: '100vh' }}>
      {/* Desktop/Tablet: Fixed sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          theme="light"
          breakpoint="lg"
          collapsedWidth={isTablet ? 0 : 80}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'sticky',
            top: 0,
            left: 0,
            background: isDark ? '#141414' : '#fff',
            borderRight: isDark ? '1px solid #303030' : '1px solid #e8ecf0',
          }}
        >
          {sidebarMenu}
        </Sider>
      )}

      {/* Mobile: Drawer sidebar */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          styles={{ body: { padding: 0, background: isDark ? '#141414' : '#fff' } }}
          size={250}
          closable={false}
        >
          {sidebarMenu}
        </Drawer>
      )}

      <Layout style={{ height: '100vh', overflow: 'hidden', background: isDark ? '#000000' : '#f0f2f5' }}>
        <Header style={{
          padding: isMobile ? '0 12px' : '0 24px',
          background: isDark ? '#141414' : '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isDark ? '1px solid #303030' : '1px solid #f0f0f0',
          zIndex: 10,
          flex: '0 0 64px',
        }}>
          {React.createElement(
            isMobile ? MenuUnfoldOutlined : (collapsed ? MenuUnfoldOutlined : MenuFoldOutlined),
            {
              className: 'trigger',
              onClick: () => isMobile ? setMobileDrawerOpen(true) : setCollapsed(!collapsed),
              style: { fontSize: 18, cursor: 'pointer' }
            }
          )}

          <Space size={isMobile ? 12 : 20}>
            <Tooltip title={isDark ? 'Chuyển sang sáng' : 'Chuyển sang tối'}>
              <span
                onClick={toggleTheme}
                style={{ fontSize: 18, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                data-testid="theme-toggle"
              >
                {isDark ? <SunOutlined /> : <MoonOutlined />}
              </span>
            </Tooltip>
            <NotificationBell />
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#0066CC' }} size={isMobile ? 'small' : 'default'} />
                {!isMobile && <span>{user?.fullName}</span>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{
          margin: contentMargin,
          padding: contentPadding,
          background: isDark ? '#1f1f1f' : '#fff',
          borderRadius: 8,
          overflow: 'auto',
          flex: 1,
          boxShadow: isDark ? 'none' : '0 1px 2px rgba(0,0,0,0.03)',
        }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
