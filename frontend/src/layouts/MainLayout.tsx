import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Typography, Space } from 'antd';
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
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

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
      ],
    },
    {
      key: 'paraclinical',
      icon: <ExperimentOutlined />,
      label: 'Cận lâm sàng',
      children: [
        { key: '/lab', icon: <ExperimentOutlined />, label: 'Xét nghiệm' },
        { key: '/radiology', icon: <ScanOutlined />, label: 'CĐHA' },
        { key: '/blood-bank', icon: <HeartOutlined />, label: 'Ngân hàng máu' },
      ],
    },
    {
      key: 'support',
      icon: <MedicineBoxOutlined />,
      label: 'Hỗ trợ điều trị',
      children: [
        { key: '/pharmacy', icon: <MedicineBoxOutlined />, label: 'Nhà thuốc' },
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

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
            {collapsed ? 'HIS' : 'HIS System'}
          </Typography.Title>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)'
        }}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            className: 'trigger',
            onClick: () => setCollapsed(!collapsed),
            style: { fontSize: 18, cursor: 'pointer' }
          })}

          <Dropdown menu={{ items: userMenuItems, onClick: handleUserMenuClick }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span>{user?.fullName}</span>
            </Space>
          </Dropdown>
        </Header>
        <Content style={{
          margin: '24px 16px',
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          minHeight: 280
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
