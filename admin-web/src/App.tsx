import React, { useState } from 'react';
import { Button, Layout, Menu, Typography } from 'antd';
import {
  BellOutlined, DashboardOutlined, LogoutOutlined, SearchOutlined, TeamOutlined, UserOutlined,
} from '@ant-design/icons';

import { useAuth } from './auth';
import { LoginPage } from './LoginPage';

// Năm màn dùng LẠI nguyên bản trong frontend/ của HIS qua alias `@` — một bản duy nhất, không copy.
import PatientAppDashboard from '@/modules/administration/pages/PatientAppDashboard';
import PatientAppAccounts from '@/modules/administration/pages/PatientAppAccounts';
import PatientAppFamilies from '@/modules/administration/pages/PatientAppFamilies';
import PatientAppNotifications from '@/modules/administration/pages/PatientAppNotifications';
import PatientAppLookup from '@/modules/administration/pages/PatientAppLookup';

const SCREENS = [
  { key: 'dashboard',     label: 'Bảng điều khiển', icon: <DashboardOutlined />, El: PatientAppDashboard },
  { key: 'accounts',      label: 'Tài khoản app',   icon: <UserOutlined />,      El: PatientAppAccounts },
  { key: 'families',      label: 'Nhóm gia đình',   icon: <TeamOutlined />,      El: PatientAppFamilies },
  { key: 'notifications', label: 'Thông báo',       icon: <BellOutlined />,      El: PatientAppNotifications },
  { key: 'lookup',        label: 'Tra cứu CSKH',    icon: <SearchOutlined />,    El: PatientAppLookup },
] as const;

export const App: React.FC = () => {
  const { session, logout } = useAuth();
  const [current, setCurrent] = useState<string>('dashboard');

  if (!session) return <LoginPage />;

  const Screen = SCREENS.find((s) => s.key === current)?.El ?? PatientAppDashboard;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{
        display: 'flex', alignItems: 'center', gap: 16, paddingInline: 20, background: '#0f766e',
      }}>
        <span style={{ color: '#fff', fontWeight: 600, whiteSpace: 'nowrap' }}>
          🩺 Quản trị app người bệnh
        </span>

        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[current]}
          onClick={(e) => setCurrent(e.key)}
          items={SCREENS.map((s) => ({ key: s.key, label: s.label, icon: s.icon }))}
          style={{ flex: 1, minWidth: 0, background: 'transparent' }}
        />

        <Typography.Text style={{ color: 'rgba(255,255,255,.85)', whiteSpace: 'nowrap' }}>
          {session.fullName}
        </Typography.Text>
        <Button type="text" icon={<LogoutOutlined />} onClick={logout} style={{ color: '#fff' }}>
          Thoát
        </Button>
      </Layout.Header>

      <Layout.Content style={{ padding: 16 }}>
        <Screen />
      </Layout.Content>
    </Layout>
  );
};
