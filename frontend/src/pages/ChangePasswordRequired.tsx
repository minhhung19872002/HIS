import React from 'react';
import { Form, Input, Button, Card, message, Typography, Alert } from 'antd';
import { LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../components/layout/AuthLayout';
import { authApi } from '../api/auth';
import { ROUTES } from '../config/route.config';

const { Title, Text } = Typography;

/**
 * #216 TC-PERM-015 — màn BUỘC đổi mật khẩu (lần đầu / admin reset / quá hạn).
 *
 * Đặt cạnh Login.tsx vì đây là màn xác thực dùng chung (AuthLayout), không phải trang nghiệp vụ
 * v1. Trang nằm NGOÀI ProtectedRoute: ProtectedRoute đá về đây khi `user.mustChangePassword`, nên
 * trang phải tự kiểm đăng nhập để không tạo vòng lặp.
 *
 * Đây chỉ là lớp UX. Lớp chặn thật là PasswordChangeRequiredMiddleware ở server: token đang mang
 * claim buộc-đổi thì mọi /api/* khác đều 403, gõ thẳng URL hay gọi API bằng tay cũng không qua.
 *
 * Luật mật khẩu ở client CHÉP LẠI PasswordPolicy (server) để báo sớm; server vẫn kiểm độc lập và
 * câu lỗi tiếng Việt của server hiện thẳng lên form nếu client sót.
 */
interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const MIN_LENGTH = 8;

const ChangePasswordRequired: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />;

  const reason = user?.mustChangePasswordReason;
  const reasonText = reason === 'expired'
    ? 'Mật khẩu của bạn đã quá hạn sử dụng. Vui lòng đặt mật khẩu mới để tiếp tục.'
    : 'Đây là lần đăng nhập đầu tiên hoặc mật khẩu vừa được quản trị viên đặt lại. Vui lòng đặt mật khẩu của riêng bạn trước khi vào hệ thống.';

  const onFinish = async (values: ChangePasswordForm) => {
    setLoading(true);
    setServerError(null);
    try {
      await authApi.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      });
      // Server xoay SecurityStamp → token hiện tại đã chết. Ghi lý do để Login.tsx nói rõ vì sao
      // phải đăng nhập lại, rồi dọn phiên.
      // Không bắn toast ở đây: Login.tsx đọc lý do trên và hiện câu đầy đủ; hai toast chồng nhau
      // ("Đã đổi mật khẩu." + "Đã đổi mật khẩu. Vui lòng đăng nhập lại…") chỉ gây rối.
      try { sessionStorage.setItem('logout_reason', 'PASSWORD_CHANGED'); } catch { /* private-mode */ }
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const e = err as any;
      const status = e?.response?.status as number | undefined;
      const msg = e?.response?.data?.message as string | undefined;
      if (status === 400 && msg) setServerError(msg);
      else if (status === 400) setServerError('Mật khẩu hiện tại không đúng.');
      else setServerError('Không đổi được mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    logout();
    navigate(ROUTES.LOGIN, { replace: true });
  };

  return (
    <AuthLayout>
      <Card style={{ width: 460, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <SafetyOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Title level={3} style={{ margin: '12px 0 4px', color: '#1677ff' }}>Đổi mật khẩu</Title>
          <Text type="secondary">Tài khoản: <b>{user?.username}</b></Text>
        </div>

        <Alert
          type="warning"
          showIcon
          title="Bạn cần đổi mật khẩu để tiếp tục"
          description={reasonText}
          style={{ marginBottom: 16 }}
        />

        {serverError && (
          <Alert type="error" showIcon title={serverError} style={{ marginBottom: 16 }} data-testid="change-password-error" />
        )}

        <Form<ChangePasswordForm> name="changePassword" onFinish={onFinish} autoComplete="off" size="large" layout="vertical">
          <Form.Item
            name="currentPassword"
            label="Mật khẩu hiện tại"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu hiện tại' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu hiện tại" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="Mật khẩu mới"
            extra={`Tối thiểu ${MIN_LENGTH} ký tự, có cả chữ và số, khác mật khẩu hiện tại.`}
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: MIN_LENGTH, message: `Mật khẩu phải có ít nhất ${MIN_LENGTH} ký tự` },
              {
                validator: (_, v: string) =>
                  !v || (/[A-Za-z]/.test(v) && /\d/.test(v))
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu phải có cả chữ và số')),
              },
              ({ getFieldValue }) => ({
                validator: (_, v: string) =>
                  !v || v !== getFieldValue('currentPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu mới phải khác mật khẩu hiện tại')),
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu mới" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Nhập lại mật khẩu mới"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng nhập lại mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator: (_, v: string) =>
                  !v || v === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(new Error('Mật khẩu xác nhận không khớp')),
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu mới" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đổi mật khẩu
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          <Button type="link" onClick={onLogout} style={{ padding: 0 }}>Đăng xuất</Button>
        </div>
      </Card>
    </AuthLayout>
  );
};

export default ChangePasswordRequired;
