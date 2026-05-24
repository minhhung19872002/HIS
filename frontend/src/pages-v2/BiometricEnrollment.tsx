import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Select, Alert, Tag, message } from 'antd';
import {
  KpiStrip, DataTable, SearchBox, ModalShell, tk, te, fmtDTg
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import { biometricApi } from '../api/nangcap24';
import type { BiometricCredentialDto } from '../api/nangcap24';
import apiClient from '../api/client';

interface PatientDto { id: string; patientCode: string; fullName: string; phoneNumber?: string; }

/**
 * WebAuthn helpers - convert between base64url and ArrayBuffer.
 */
const b64uToBuf = (b64u: string): ArrayBuffer => {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '==='.slice((b64.length + 3) % 4);
  const raw = atob(padded);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
};

const bufToB64u = (buf: ArrayBuffer): string => {
  const bytes = new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const BiometricEnrollment: React.FC = () => {
  const [patients, setPatients] = useState<PatientDto[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<BiometricCredentialDto[]>([]);
  const [search, setSearch] = useState('');
  const [enrollModal, setEnrollModal] = useState(false);
  const [signTestModal, setSignTestModal] = useState(false);
  const [form] = Form.useForm();
  const [signForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Check WebAuthn support
  const webAuthnSupported = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const loadPatients = async () => {
    try {
      // Reception patient search requires non-empty keyword - default to broad query
      const kw = search || 'a';
      const r = await apiClient.get('/reception/patients/search', { params: { keyword: kw, limit: 50 } });
      const items = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      setPatients(items);
    } catch {
      setPatients([]);
    }
  };

  const loadCredentials = async (patientId: string) => {
    try {
      const creds = await biometricApi.listCredentials(patientId);
      setCredentials(creds);
    } catch {
      setCredentials([]);
    }
  };

  useEffect(() => { loadPatients(); }, []);
  useEffect(() => { if (selectedPatientId) loadCredentials(selectedPatientId); }, [selectedPatientId]);

  const filtered = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.fullName.toLowerCase().includes(s) || p.patientCode.toLowerCase().includes(s);
  });

  const handleEnroll = async () => {
    if (!selectedPatientId || !webAuthnSupported) {
      message.error('WebAuthn không khả dụng trên trình duyệt này');
      return;
    }
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Step 1: begin
      const beginResp = await biometricApi.beginRegister({
        patientId: selectedPatientId,
        ownerType: values.ownerType,
        ownerName: values.ownerName,
        deviceName: values.deviceName,
      });

      // Step 2: navigator.credentials.create()
      const publicKeyOptions: PublicKeyCredentialCreationOptions = {
        challenge: b64uToBuf(beginResp.challenge),
        rp: { id: beginResp.rpId === 'localhost' ? undefined : beginResp.rpId, name: beginResp.rpName },
        user: {
          id: b64uToBuf(beginResp.userHandle),
          name: beginResp.userName,
          displayName: beginResp.userDisplayName,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },     // ES256
          { type: 'public-key', alg: -257 },   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60000,
        attestation: 'none',
      };

      const cred = await navigator.credentials.create({ publicKey: publicKeyOptions }) as PublicKeyCredential | null;
      if (!cred) throw new Error('User hủy đăng ký');

      const response = cred.response as AuthenticatorAttestationResponse;
      // @ts-ignore - getPublicKey is supported in modern browsers
      const publicKeyBuf: ArrayBuffer | null = typeof response.getPublicKey === 'function' ? response.getPublicKey() : null;

      // Step 3: finish
      const result = await biometricApi.finishRegister({
        patientId: selectedPatientId,
        ownerType: values.ownerType,
        ownerName: values.ownerName,
        deviceName: values.deviceName,
        credentialId: bufToB64u(cred.rawId),
        publicKey: publicKeyBuf ? bufToB64u(publicKeyBuf) : '',
        userHandle: beginResp.userHandle,
        clientDataJson: bufToB64u(response.clientDataJSON),
        attestationObject: bufToB64u(response.attestationObject),
      });

      tk(`Đã đăng ký vân tay cho ${result.ownerName ?? values.ownerType}`);
      setEnrollModal(false);
      form.resetFields();
      loadCredentials(selectedPatientId);
    } catch (e: any) {
      te(`Đăng ký thất bại: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!selectedPatientId) return;
    try {
      await biometricApi.revoke(id);
      tk('Đã thu hồi credential');
      loadCredentials(selectedPatientId);
    } catch {
      te('Thu hồi thất bại');
    }
  };

  const handleSignTest = async () => {
    if (!selectedPatientId || !webAuthnSupported) return;
    try {
      const values = await signForm.validateFields();
      setLoading(true);

      const beginResp = await biometricApi.beginSign({
        patientId: selectedPatientId,
        documentType: values.documentType,
        documentRef: values.documentRef,
      });

      const publicKeyOptions: PublicKeyCredentialRequestOptions = {
        challenge: b64uToBuf(beginResp.challenge),
        rpId: beginResp.rpId === 'localhost' ? undefined : beginResp.rpId,
        allowCredentials: beginResp.allowCredentials.map(c => ({
          type: 'public-key' as const,
          id: b64uToBuf(c.credentialId),
        })),
        userVerification: 'required',
        timeout: 60000,
      };

      const cred = await navigator.credentials.get({ publicKey: publicKeyOptions }) as PublicKeyCredential | null;
      if (!cred) throw new Error('User hủy ký');

      const response = cred.response as AuthenticatorAssertionResponse;

      const result = await biometricApi.finishSign({
        patientId: selectedPatientId,
        credentialId: bufToB64u(cred.rawId),
        documentType: values.documentType,
        documentRef: values.documentRef,
        challenge: beginResp.challenge,
        clientDataJson: bufToB64u(response.clientDataJSON),
        authenticatorData: bufToB64u(response.authenticatorData),
        signature: bufToB64u(response.signature),
      });

      if (result.isVerified) {
        tk(`Ký thành công bởi: ${result.signerName}`);
      } else {
        te(`Ký thất bại: ${result.error}`);
      }
      setSignTestModal(false);
      signForm.resetFields();
      loadCredentials(selectedPatientId);
    } catch (e: any) {
      te(`Ký thất bại: ${e?.message ?? e}`);
    } finally {
      setLoading(false);
    }
  };

  const kpis = [
    { lbl: 'Bệnh nhân đã đăng ký', val: patients.length },
    { lbl: 'BN đang chọn', val: selectedPatientId ? (patients.find(p => p.id === selectedPatientId)?.fullName ?? '') : '-' },
    { lbl: 'Credentials hoạt động', val: credentials.filter(c => c.status === 'active').length, tone: 'ok' as const },
    { lbl: 'Tổng lần ký', val: credentials.reduce((s, c) => s + c.usageCount, 0) },
  ];

  const patientCols: ColumnDef<PatientDto>[] = [
    { key: 'code', label: 'Mã BN', code: true, render: p => p.patientCode },
    { key: 'name', label: 'Họ tên', render: p => p.fullName },
    { key: 'phone', label: 'SDT', render: p => p.phoneNumber ?? '-' },
  ];

  const credCols: ColumnDef<BiometricCredentialDto>[] = [
    { key: 'owner', label: 'Người ký', render: c => (
        <>
          {c.ownerName ?? (c.ownerType === 'family' ? 'Người nhà' : 'Bệnh nhân')}
          <Tag style={{ marginLeft: 6 }} color={c.ownerType === 'patient' ? 'blue' : 'purple'}>
            {c.ownerType === 'patient' ? 'BN' : 'Người nhà'}
          </Tag>
        </>
      )
    },
    { key: 'device', label: 'Thiết bị', render: c => c.deviceName ?? '-' },
    { key: 'enrolled', label: 'Đăng ký lúc', render: c => fmtDTg(c.enrolledAt) },
    { key: 'last', label: 'Lần ký cuối', render: c => c.lastUsedAt ? fmtDTg(c.lastUsedAt) : '-' },
    { key: 'usage', label: 'Số lần ký', mono: true, render: c => `${c.usageCount}` },
    { key: 'status', label: 'Trạng thái', render: c => (
        <Tag color={c.status === 'active' ? 'green' : 'red'}>{c.status === 'active' ? 'Hoạt động' : 'Đã thu hồi'}</Tag>
      )
    },
  ];

  return (
    <div className="ab-stack">
      <KpiStrip items={kpis} />

      {!webAuthnSupported && (
        <Alert
          type="error"
          title="Trình duyệt không hỗ trợ WebAuthn"
          showIcon
          message="Cần Chrome/Edge/Safari mới + HTTPS để dùng vân tay. Touch ID / Windows Hello sẽ được sử dụng."
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div className="panel">
          <div className="panel-h">Chọn bệnh nhân</div>
          <div className="panel-body">
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / mã BN" />
            <DataTable
              columns={patientCols}
              data={filtered}
              rowKey={p => p.id}
              onRowClick={p => setSelectedPatientId(p.id)}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-h">
            Credentials sinh trắc học
            {selectedPatientId && (
              <div style={{ display: 'inline-flex', gap: 8, marginLeft: 16 }}>
                <Button type="primary" size="small" onClick={() => setEnrollModal(true)} disabled={!webAuthnSupported}>
                  + Đăng ký vân tay
                </Button>
                {credentials.length > 0 && (
                  <Button size="small" onClick={() => setSignTestModal(true)} disabled={!webAuthnSupported}>
                    Test ký
                  </Button>
                )}
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selectedPatientId ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#64748b' }}>
                Chọn 1 bệnh nhân để quản lý credentials
              </div>
            ) : (
              <DataTable
                columns={credCols}
                data={credentials}
                rowKey={c => c.id}
                actions={c => c.status === 'active' ? (
                  <button className="ab-iconbtn" onClick={() => handleRevoke(c.id)}>Thu hồi</button>
                ) : null}
              />
            )}
          </div>
        </div>
      </div>

      <ModalShell
        open={enrollModal}
        onClose={() => { setEnrollModal(false); form.resetFields(); }}
        title="Đăng ký vân tay sinh trắc học"
        footer={(
          <>
            <Button onClick={() => { setEnrollModal(false); form.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={loading} onClick={handleEnroll}>Bắt đầu quét vân tay</Button>
          </>
        )}
      >
        <Alert type="info" message="Khi bấm OK, hệ thống sẽ yêu cầu Touch ID / Windows Hello / vân tay" style={{ marginBottom: 16 }} />
        <Form form={form} layout="vertical" initialValues={{ ownerType: 'patient' }}>
          <Form.Item name="ownerType" label="Loại người ký">
            <Select options={[
              { value: 'patient', label: 'Bệnh nhân' },
              { value: 'family', label: 'Người nhà (cho cam kết phẫu thuật...)' }
            ]} />
          </Form.Item>
          <Form.Item name="ownerName" label="Tên người ký" rules={[{ required: true }]}>
            <Input placeholder="VD: Nguyễn Văn A" />
          </Form.Item>
          <Form.Item name="deviceName" label="Mô tả thiết bị">
            <Input placeholder="VD: Touch ID iPhone, USB Fingerprint Reader..." />
          </Form.Item>
        </Form>
      </ModalShell>

      <ModalShell
        open={signTestModal}
        onClose={() => { setSignTestModal(false); signForm.resetFields(); }}
        title="Test ký bằng vân tay"
        footer={(
          <>
            <Button onClick={() => { setSignTestModal(false); signForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={loading} onClick={handleSignTest}>Quét vân tay để ký</Button>
          </>
        )}
      >
        <Form form={signForm} layout="vertical" initialValues={{ documentType: 'cam_ket_pt', documentRef: 'DEMO-001' }}>
          <Form.Item name="documentType" label="Loại tài liệu">
            <Select options={[
              { value: 'cam_ket_pt', label: 'Cam kết phẫu thuật' },
              { value: 'cam_ket_tm', label: 'Cam kết truyền máu' },
              { value: 'cam_ket_dv', label: 'Cam kết dịch vụ' },
              { value: 'phieu_hen', label: 'Phiếu hẹn khám' },
            ]} />
          </Form.Item>
          <Form.Item name="documentRef" label="Mã tham chiếu">
            <Input />
          </Form.Item>
        </Form>
      </ModalShell>
    </div>
  );
};

export default BiometricEnrollment;
