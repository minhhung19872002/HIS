import React, { useCallback, useEffect, useState } from 'react';
import { Form, Input, InputNumber, Select } from 'antd';
import apiClient from '../api/client';
import {
  KpiStrip, TopTabs, StatusBadge, Ico, tk, ti, tw,
} from './_v2kit';

interface ConfigData {
  gatewayUrl?: string; tokenUrl?: string; username?: string; passwordMasked?: string;
  hasPassword: boolean; maCSKCB?: string; maDVI?: string; timeout: number; environment: string;
}

interface ConnResult { reachable: boolean; statusCode?: number; status?: string; latencyMs?: number; error?: string }
interface AuthResult { authenticated: boolean; tokenMasked?: string; statusCode?: number; body?: string; error?: string }
interface SubmitResult { success: boolean; statusCode?: number; latencyMs?: number; body?: string; error?: string }

type Tab = 'config' | 'test';
const TABS = [
  { v: 'config' as Tab, l: 'Cấu hình', ic: 'edit' },
  { v: 'test' as Tab,   l: 'Test tools', ic: 'activity' },
];

const BhxhConfigV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('config');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConfigData | null>(null);
  const [form] = Form.useForm();
  const [testXml, setTestXml] = useState('<?xml version="1.0" encoding="UTF-8"?>\n<BHXH>\n  <MA_CSKCB></MA_CSKCB>\n  <MA_DVI></MA_DVI>\n  <data></data>\n</BHXH>');
  const [testEndpoint, setTestEndpoint] = useState('');
  const [connResult, setConnResult] = useState<ConnResult | null>(null);
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ConfigData>('/bhxh-config');
      setData(data);
      form.setFieldsValue({
        gatewayUrl: data.gatewayUrl, tokenUrl: data.tokenUrl, username: data.username,
        password: '', maCSKCB: data.maCSKCB, maDVI: data.maDVI,
        timeout: data.timeout, environment: data.environment,
      });
    } catch { ti('Tải cấu hình thất bại'); }
    finally { setLoading(false); }
  }, [form]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    const v = await form.validateFields();
    try { await apiClient.post('/bhxh-config', v); tk('Đã lưu cấu hình'); load(); }
    catch { tw('Lưu thất bại'); }
  };

  const testConn = async () => {
    setTesting('conn'); setConnResult(null);
    try {
      const { data } = await apiClient.post<ConnResult>('/bhxh-config/test-connection');
      setConnResult(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setConnResult({ reachable: false, error: e?.response?.data?.message || 'Failed' }); }
    finally { setTesting(null); }
  };

  const testAuth = async () => {
    setTesting('auth'); setAuthResult(null);
    try {
      const { data } = await apiClient.post<AuthResult>('/bhxh-config/test-auth');
      setAuthResult(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setAuthResult({ authenticated: false, error: e?.response?.data?.message || 'Failed' }); }
    finally { setTesting(null); }
  };

  const testSubmit = async () => {
    setTesting('submit'); setSubmitResult(null);
    try {
      const { data } = await apiClient.post<SubmitResult>('/bhxh-config/test-submit-xml', {
        xml: testXml, endpoint: testEndpoint || undefined,
      });
      setSubmitResult(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) { setSubmitResult({ success: false, error: e?.response?.data?.message || 'Failed' }); }
    finally { setTesting(null); }
  };

  return (
    <div className="ab">
      <KpiStrip items={[
        { lbl: 'Môi trường', val: data?.environment === 'production' ? 'PROD' : 'TEST',
          sub: data?.gatewayUrl || 'Chưa cấu hình', tone: data?.environment === 'production' ? 'crit' : 'warn' },
        { lbl: 'Có mật khẩu', val: data?.hasPassword ? 'CÓ' : 'CHƯA', sub: data?.passwordMasked || '—', tone: data?.hasPassword ? 'ok' : 'warn' },
        { lbl: 'Mã CSKCB', val: data?.maCSKCB || '—', sub: 'cơ sở KCB', tone: 'info' },
        { lbl: 'Test cuối', val: connResult?.reachable ? 'OK' : authResult?.authenticated ? 'AUTH' : '—',
          sub: connResult ? `${connResult.latencyMs}ms` : 'chưa test',
          tone: connResult?.reachable || authResult?.authenticated ? 'ok' : 'warn' },
      ]} />

      <TopTabs<Tab> tab={tab} setTab={setTab} tabs={TABS} actions={
        <>
          <button className="ab-btn ghost" type="button" onClick={load}>
            <Ico name="refresh" size={12} /> Làm mới
          </button>
          {tab === 'config' && (
            <button className="ab-btn primary" type="button" onClick={save}>
              <Ico name="check" size={12} /> Lưu cấu hình
            </button>
          )}
        </>
      } />

      {tab === 'config' && (
        <div style={{ padding: 24, maxWidth: 800 }}>
          <Form form={form} layout="vertical">
            <Form.Item label="Gateway URL" name="gatewayUrl" rules={[{ required: true, type: 'url' }]}>
              <Input placeholder="https://gdbhyt.baohiemxahoi.gov.vn/api" />
            </Form.Item>
            <Form.Item label="Token / Auth URL" name="tokenUrl" rules={[{ type: 'url' }]}>
              <Input placeholder="https://gdbhyt.baohiemxahoi.gov.vn/api/token" />
            </Form.Item>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Form.Item label="Username" name="username"><Input /></Form.Item>
              <Form.Item label={`Password${data?.hasPassword ? ` (${data.passwordMasked})` : ''}`} name="password">
                <Input.Password placeholder={data?.hasPassword ? 'Để trống = giữ nguyên' : 'Nhập password'} />
              </Form.Item>
              <Form.Item label="Mã CSKCB" name="maCSKCB"><Input /></Form.Item>
              <Form.Item label="Mã đơn vị (DVI)" name="maDVI"><Input /></Form.Item>
              <Form.Item label="Timeout (giây)" name="timeout">
                <InputNumber min={5} max={300} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="Môi trường" name="environment">
                <Select options={[
                  { label: 'Sandbox / Test', value: 'sandbox' },
                  { label: 'Production', value: 'production' },
                ]} />
              </Form.Item>
            </div>
          </Form>
        </div>
      )}

      {tab === 'test' && (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>1. Test kết nối gateway</span>
            </div>
            <div style={{ padding: 14 }}>
              <button className="ab-btn primary" type="button" onClick={testConn} disabled={testing === 'conn'}>
                <Ico name="activity" size={12} /> Ping Gateway URL
              </button>
              {connResult && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <StatusBadge tone={connResult.reachable ? 'ok' : 'crit'} dot>
                    {connResult.reachable ? `✓ Kết nối OK · HTTP ${connResult.statusCode} · ${connResult.latencyMs}ms` : '✗ Không kết nối được'}
                  </StatusBadge>
                  {connResult.error && <div style={{ fontSize: 12, color: 'var(--a-rd-text)', marginTop: 6 }}>{connResult.error}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>2. Test authenticate</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 8 }}>
                Gửi POST {'{username, password, grant_type: "password"}'} tới Token URL, xem có trả access_token không.
              </div>
              <button className="ab-btn primary" type="button" onClick={testAuth} disabled={testing === 'auth'}>
                <Ico name="lock" size={12} /> Lấy access_token
              </button>
              {authResult && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <StatusBadge tone={authResult.authenticated ? 'ok' : 'crit'} dot>
                    {authResult.authenticated ? '✓ Đăng nhập thành công' : '✗ Xác thực thất bại'}
                  </StatusBadge>
                  {authResult.tokenMasked && <div style={{ fontSize: 12, marginTop: 6, fontFamily: 'var(--font-mono)' }}>Token: {authResult.tokenMasked}</div>}
                  {authResult.statusCode && <div style={{ fontSize: 12, color: 'var(--t-2)' }}>HTTP {authResult.statusCode}</div>}
                  {authResult.body && <pre style={{ maxHeight: 200, overflow: 'auto', fontSize: 11, marginTop: 6, background: 'var(--bg-1)', padding: 8 }}>{authResult.body}</pre>}
                  {authResult.error && <div style={{ fontSize: 12, color: 'var(--a-rd-text)', marginTop: 6 }}>{authResult.error}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="panel" style={{ padding: 0 }}>
            <div className="panel-h" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
              <span>3. Test submit XML (dry-run)</span>
            </div>
            <div style={{ padding: 14 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>
                  Endpoint (vd: /api/bhxh/submitXml). Để trống = gửi tới Gateway URL gốc.
                </div>
                <Input value={testEndpoint} onChange={(e) => setTestEndpoint(e.target.value)} placeholder="/api/bhxh/submitXml" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--t-2)', marginBottom: 4 }}>XML payload</div>
                <Input.TextArea rows={10} value={testXml} onChange={(e) => setTestXml(e.target.value)} style={{ fontFamily: 'monospace' }} />
              </div>
              <button className="ab-btn primary" type="button" onClick={testSubmit} disabled={testing === 'submit'}>
                <Ico name="send" size={12} /> Gửi thử
              </button>
              {submitResult && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--d-1)', border: '1px solid var(--line)', borderRadius: 4 }}>
                  <StatusBadge tone={submitResult.success ? 'ok' : 'crit'} dot>
                    {submitResult.success ? `✓ HTTP ${submitResult.statusCode} · ${submitResult.latencyMs}ms` : '✗ Submit failed'}
                  </StatusBadge>
                  {submitResult.body && <pre style={{ maxHeight: 260, overflow: 'auto', fontSize: 11, marginTop: 6, background: 'var(--bg-1)', padding: 8 }}>{submitResult.body}</pre>}
                  {submitResult.error && <div style={{ fontSize: 12, color: 'var(--a-rd-text)', marginTop: 6 }}>{submitResult.error}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BhxhConfigV2;
