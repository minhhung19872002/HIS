import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, MedicineBoxOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from './auth';

// Nền và bố cục màn chưa-đăng-nhập lấy đúng của HIS, không dựng lại.
import { AuthLayout } from '@/components/layout/AuthLayout';

/**
 * Màn đăng nhập cho nhân viên bệnh viện.
 *
 * Dùng đúng tài khoản HIS của họ — không có danh tính thứ hai để nhớ (quyết định D16).
 */
export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await login(values.username.trim(), values.password);
    } catch (e) {
      // Không phân biệt "sai tài khoản" với "sai mật khẩu": nói rõ cái nào sai là giúp người dò
      // biết tài khoản nào có thật.
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 401 ? 'Tài khoản hoặc mật khẩu không đúng.'
        : status === 403 ? 'Tài khoản này không có quyền vào trang quản trị app người bệnh.'
        : status === 503 ? 'Chưa kết nối được hệ thống bệnh viện. Vui lòng thử lại sau ít phút.'
        : 'Không đăng nhập được. Kiểm tra kết nối mạng rồi thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'linear-gradient(135deg, #1677ff, #4096ff)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <MedicineBoxOutlined style={{ fontSize: 32, color: '#fff' }} />
          </div>
          <Typography.Title level={3} style={{ margin: 0, color: '#1677ff' }}>
            App hỗ trợ người bệnh
          </Typography.Title>
          <Typography.Text type="secondary">
            Trang quản trị — đăng nhập bằng tài khoản HIS của bạn
          </Typography.Text>
        </div>

        {error && (
          <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="username"
            label="Tài khoản"
            rules={[{ required: true, message: 'Vui lòng nhập tài khoản' }]}
          >
            <Input prefix={<UserOutlined />} size="large" autoComplete="username" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} size="large" autoComplete="current-password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={loading}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </AuthLayout>
  );
};
