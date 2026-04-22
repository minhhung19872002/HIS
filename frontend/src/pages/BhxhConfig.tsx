/**
 * BHXH Gateway configuration + test tools — N1.19.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Card, Form, Input, InputNumber, Select, Button, Space, message, Alert, Divider, Typography, Row, Col, Tabs,
} from 'antd';
import { SaveOutlined, ApiOutlined, LoginOutlined, SendOutlined, ReloadOutlined } from '@ant-design/icons';
import apiClient from '../api/client';

const { Title, Text } = Typography;

interface ConfigData {
  gatewayUrl?: string;
  tokenUrl?: string;
  username?: string;
  passwordMasked?: string;
  hasPassword: boolean;
  maCSKCB?: string;
  maDVI?: string;
  timeout: number;
  environment: string;
}

export default function BhxhConfig() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConfigData | null>(null);
  const [form] = Form.useForm();
  const [testXml, setTestXml] = useState('<?xml version="1.0" encoding="UTF-8"?>\n<BHXH>\n  <MA_CSKCB></MA_CSKCB>\n  <MA_DVI></MA_DVI>\n  <data></data>\n</BHXH>');
  const [testEndpoint, setTestEndpoint] = useState('');

  const [connResult, setConnResult] = useState<any>(null);
  const [authResult, setAuthResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ConfigData>('/bhxh-config');
      setData(data);
      form.setFieldsValue({
        gatewayUrl: data.gatewayUrl,
        tokenUrl: data.tokenUrl,
        username: data.username,
        password: '',
        maCSKCB: data.maCSKCB,
        maDVI: data.maDVI,
        timeout: data.timeout,
        environment: data.environment,
      });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Tải cấu hình thất bại');
    } finally { setLoading(false); }
  }, [form]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const v = await form.validateFields();
    try {
      await apiClient.post('/bhxh-config', v);
      message.success('Đã lưu cấu hình');
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Lưu thất bại');
    }
  };

  const testConn = async () => {
    setTesting('conn');
    setConnResult(null);
    try {
      const { data } = await apiClient.post('/bhxh-config/test-connection');
      setConnResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setConnResult({ reachable: false, error: err?.response?.data?.message || 'Failed' });
    } finally { setTesting(null); }
  };

  const testAuth = async () => {
    setTesting('auth');
    setAuthResult(null);
    try {
      const { data } = await apiClient.post('/bhxh-config/test-auth');
      setAuthResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setAuthResult({ authenticated: false, error: err?.response?.data?.message || 'Failed' });
    } finally { setTesting(null); }
  };

  const testSubmit = async () => {
    setTesting('submit');
    setSubmitResult(null);
    try {
      const { data } = await apiClient.post('/bhxh-config/test-submit-xml', {
        xml: testXml,
        endpoint: testEndpoint || undefined,
      });
      setSubmitResult(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setSubmitResult({ success: false, error: err?.response?.data?.message || 'Failed' });
    } finally { setTesting(null); }
  };

  return (
    <div>
      <Card title={<Space><ApiOutlined /> Cấu hình BHXH Gateway (N1.19)</Space>}
        extra={<Button icon={<ReloadOutlined />} onClick={load} loading={loading}>Làm mới</Button>}
      >
        <Tabs items={[
          {
            key: 'config',
            label: 'Cấu hình',
            children: (
              <Form form={form} layout="vertical" style={{ maxWidth: 760 }}>
                <Row gutter={16}>
                  <Col span={24}><Form.Item label="Gateway URL" name="gatewayUrl" rules={[{ required: true, type: 'url' }]}>
                    <Input placeholder="https://gdbhyt.baohiemxahoi.gov.vn/api" />
                  </Form.Item></Col>
                  <Col span={24}><Form.Item label="Token / Auth URL" name="tokenUrl" rules={[{ type: 'url' }]}>
                    <Input placeholder="https://gdbhyt.baohiemxahoi.gov.vn/api/token" />
                  </Form.Item></Col>
                  <Col span={12}><Form.Item label="Username" name="username"><Input /></Form.Item></Col>
                  <Col span={12}><Form.Item label={`Password${data?.hasPassword ? ` (hiện: ${data.passwordMasked})` : ''}`} name="password">
                    <Input.Password placeholder={data?.hasPassword ? 'Để trống = giữ nguyên' : 'Nhập password'} />
                  </Form.Item></Col>
                  <Col span={8}><Form.Item label="Mã CSKCB" name="maCSKCB"><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item label="Mã đơn vị (DVI)" name="maDVI"><Input /></Form.Item></Col>
                  <Col span={8}><Form.Item label="Timeout (giây)" name="timeout"><InputNumber min={5} max={300} style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={12}><Form.Item label="Môi trường" name="environment">
                    <Select options={[
                      { label: 'Sandbox / Test', value: 'sandbox' },
                      { label: 'Production', value: 'production' },
                    ]} />
                  </Form.Item></Col>
                </Row>
                <Button type="primary" icon={<SaveOutlined />} onClick={save}>Lưu cấu hình</Button>
              </Form>
            ),
          },
          {
            key: 'test',
            label: 'Test tools',
            children: (
              <>
                <Title level={5}>1. Test kết nối gateway</Title>
                <Space>
                  <Button icon={<ApiOutlined />} onClick={testConn} loading={testing === 'conn'}>
                    Ping GatewayUrl
                  </Button>
                </Space>
                {connResult && (
                  <Alert style={{ marginTop: 12 }} type={connResult.reachable ? 'success' : 'error'} showIcon
                    title={connResult.reachable ? `✓ Kết nối OK - ${connResult.statusCode} ${connResult.status} - ${connResult.latencyMs}ms` : '✗ Không kết nối được'}
                    description={connResult.error}
                  />
                )}

                <Divider />
                <Title level={5}>2. Test authenticate</Title>
                <Text type="secondary">Gửi POST {'{username, password, grant_type: "password"}'} tới TokenUrl, xem có trả access_token không.</Text>
                <br />
                <Space style={{ marginTop: 8 }}>
                  <Button icon={<LoginOutlined />} onClick={testAuth} loading={testing === 'auth'}>
                    Lấy access_token
                  </Button>
                </Space>
                {authResult && (
                  <Alert style={{ marginTop: 12 }} type={authResult.authenticated ? 'success' : 'error'} showIcon
                    title={authResult.authenticated ? `✓ Đăng nhập thành công` : '✗ Xác thực thất bại'}
                    description={<>
                      {authResult.tokenMasked && <div>Token: {authResult.tokenMasked}</div>}
                      {authResult.statusCode && <div>HTTP {authResult.statusCode}</div>}
                      {authResult.body && <pre style={{ maxHeight: 200, overflow: 'auto' }}>{authResult.body}</pre>}
                      {authResult.error && <div>Error: {authResult.error}</div>}
                    </>}
                  />
                )}

                <Divider />
                <Title level={5}>3. Test submit XML (dry-run)</Title>
                <Form layout="vertical">
                  <Form.Item label="Endpoint (vd: /api/bhxh/submitXml). Để trống = gửi tới Gateway URL gốc.">
                    <Input value={testEndpoint} onChange={e => setTestEndpoint(e.target.value)}
                      placeholder="/api/bhxh/submitXml" />
                  </Form.Item>
                  <Form.Item label="XML payload">
                    <Input.TextArea rows={10} value={testXml} onChange={e => setTestXml(e.target.value)}
                      style={{ fontFamily: 'monospace' }} />
                  </Form.Item>
                  <Button type="primary" icon={<SendOutlined />} onClick={testSubmit} loading={testing === 'submit'}>
                    Gửi thử
                  </Button>
                </Form>
                {submitResult && (
                  <Alert style={{ marginTop: 12 }} type={submitResult.success ? 'success' : 'error'} showIcon
                    title={submitResult.success ? `✓ HTTP ${submitResult.statusCode} - ${submitResult.latencyMs}ms` : '✗ Submit failed'}
                    description={<>
                      {submitResult.body && <pre style={{ maxHeight: 260, overflow: 'auto' }}>{submitResult.body}</pre>}
                      {submitResult.error && <div>Error: {submitResult.error}</div>}
                    </>}
                  />
                )}
              </>
            ),
          },
        ]} />
      </Card>
    </div>
  );
}
