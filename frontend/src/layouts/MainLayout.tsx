import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Space, Drawer } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
        { key: '/ipd', icon: <FileTextOutlined />, label: 'Nội trú' },
        { key: '/surgery', icon: <HeartOutlined />, label: 'Phẫu thuật' },
        { key: '/emr', icon: <FolderOpenOutlined />, label: 'Hồ sơ BA (EMR)' },
        { key: '/follow-up', icon: <CalendarOutlined />, label: 'Tái khám' },
        { key: '/booking-management', icon: <ScheduleOutlined />, label: 'Quản lý đặt lịch' },
      ],
    },
    {
      key: 'paraclinical',
      icon: <ExperimentOutlined />,
      label: 'Cận lâm sàng',
      children: [
        { key: '/lab', icon: <ExperimentOutlined />, label: 'Xét nghiệm' },
        { key: '/radiology', icon: <ScanOutlined />, label: 'CĐHA' },
        { key: '/consultation', icon: <TeamOutlined />, label: 'Hội chẩn' },
        { key: '/blood-bank', icon: <HeartOutlined />, label: 'Ngân hàng máu' },
      ],
    },
    {
      key: 'support',
      icon: <MedicineBoxOutlined />,
      label: 'Hỗ trợ điều trị',
      children: [
        { key: '/pharmacy', icon: <MedicineBoxOutlined />, label: 'Nhà thuốc' },
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
      ],
    },
    {
      key: 'management',
      icon: <ToolOutlined />,
      label: 'Quản lý',
      children: [
        { key: '/infection-control', icon: <AlertOutlined />, label: 'KSNK' },
        { key: '/equipment', icon: <ToolOutlined />, label: 'Thiết bị y tế' },
        { key: '/hr', icon: <SolutionOutlined />, label: 'Nhân sự' },
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
        { key: '/patient-portal', icon: <MobileOutlined />, label: 'Cổng bệnh nhân' },
        { key: '/sms-management', icon: <MobileOutlined />, label: 'SMS Gateway' },
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
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
          {collapsed && !isMobile ? 'HIS' : 'HIS System'}
        </Typography.Title>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  );

  const contentPadding = isMobile ? 12 : isTablet ? 16 : 24;
  const contentMargin = isMobile ? '8px 4px' : isTablet ? '12px 8px' : '24px 16px';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop/Tablet: Fixed sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="dark"
          breakpoint="lg"
          collapsedWidth={isTablet ? 0 : 80}
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
          styles={{ body: { padding: 0, background: '#001529' } }}
          width={250}
          closable={false}
        >
          {sidebarMenu}
        </Drawer>
      )}

      <Layout>
        <Header style={{
          padding: isMobile ? '0 12px' : '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
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
            <NotificationBell />
            <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} size={isMobile ? 'small' : 'default'} />
                {!isMobile && <span>{user?.fullName}</span>}
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{
          margin: contentMargin,
          padding: contentPadding,
          background: '#fff',
          borderRadius: 8,
          minHeight: 280,
          overflow: 'auto',
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
