import React, { useState } from 'react';
import { Alert, Button, Form, Input, Typography } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useAuth } from './auth';

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
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg,#e6f4f1 0%,#f7fafc 60%)', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, background: '#fff', borderRadius: 12, padding: 32,
        boxShadow: '0 8px 30px rgba(0,0,0,.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🩺</div>
          <Typography.Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
            Quản trị app người bệnh
          </Typography.Title>
          <Typography.Text type="secondary">
            Đăng nhập bằng tài khoản HIS của bạn
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
      </div>
    </div>
  );
};
