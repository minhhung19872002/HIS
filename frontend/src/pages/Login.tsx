import React from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined, ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;

interface LoginForm {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, otpPending, verifyOtp, resendOtp, cancelOtp } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [otpValue, setOtpValue] = React.useState('');
  const [resendCooldown, setResendCooldown] = React.useState(0);

  // Countdown timer for resend
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Start cooldown when OTP step begins
  React.useEffect(() => {
    if (otpPending) {
      setResendCooldown(30);
      setOtpValue('');
    }
  }, [otpPending]);

  const onFinish = async (values: LoginForm) => {
    setLoading(true);
    try {
      const result = await login(values);
      if (result === 'success') {
        message.success('Đăng nhập thành công!');
        navigate('/');
      } else if (result === 'otp') {
        // OTP step will be shown via otpPending state
      } else {
        message.error('Tên đăng nhập hoặc mật khẩu không đúng!');
      }
    } catch {
      message.error('Đã có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      message.warning('Vui lòng nhập đủ 6 số OTP');
      return;
    }
    setLoading(true);
    try {
      const success = await verifyOtp(otpValue);
      if (success) {
        message.success('Đăng nhập thành công!');
        navigate('/');
      } else {
        message.error('Mã OTP không đúng hoặc đã hết hạn');
        setOtpValue('');
      }
    } catch {
      message.error('Đã có lỗi xảy ra!');
    } finally {
      setLoading(false);
    }
  };

  const onResendOtp = async () => {
    const success = await resendOtp();
    if (success) {
      message.success('Đã gửi lại mã OTP');
      setResendCooldown(30);
    } else {
      message.error('Không thể gửi lại OTP. Vui lòng chờ.');
    }
  };

  // OTP verification step
  if (otpPending) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <SafetyOutlined style={{ fontSize: 48, color: '#1890ff' }} />
            <Title level={3} style={{ margin: '12px 0 4px', color: '#1890ff' }}>Xác thực OTP</Title>
            <Typography.Text type="secondary">
              <MailOutlined /> Mã xác thực đã gửi đến {otpPending.maskedEmail}
            </Typography.Text>
          </div>

          <Input.OTP
            length={6}
            value={otpValue}
            onChange={setOtpValue}
            style={{ marginBottom: 16 }}
          />

          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={onVerifyOtp}
            disabled={otpValue.length !== 6}
            style={{ marginBottom: 12 }}
          >
            Xác nhận
          </Button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={cancelOtp}
              style={{ padding: 0 }}
            >
              Quay lại
            </Button>
            <Button
              type="link"
              disabled={resendCooldown > 0}
              onClick={onResendOtp}
              style={{ padding: 0 }}
            >
              {resendCooldown > 0 ? `Gửi lại (${resendCooldown}s)` : 'Gửi lại mã'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Normal login form
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ margin: 0, color: '#1890ff' }}>HIS</Title>
          <Typography.Text type="secondary">Hệ thống thông tin bệnh viện</Typography.Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Tên đăng nhập"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Mật khẩu"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Tài khoản mặc định: admin / Admin@123
          </Typography.Text>
        </div>
      </Card>
    </div>
  );
};

export default Login;
