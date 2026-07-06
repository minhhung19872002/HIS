/**
 * NangCap24 — Biometric Enrollment v2 (port từ mod-biometric-enrollment.jsx)
 *
 * Đăng ký vân tay WebAuthn cho bệnh nhân/người nhà.
 * Layout 2-column: BN list (380px) | Credentials panel.
 * Real WebAuthn API (Touch ID / Windows Hello / USB Fingerprint).
 */
import React, { useEffect, useState } from 'react';
import { Form, Input, Radio, Select, Button } from 'antd';
import {
  KpiStrip, DataTable, SearchBox, ModalShell, StatusBadge, ActBtn,
  DrawerShell, DrSec, DrField,
  tk, te, fmtDTg, cf,
} from './_v2kit';
import type { ColumnDef } from './_v2kit';
import TermIcon from '../layouts/terminal/Icon';
import { biometricApi } from '../api/nangcap24';
import type { BiometricCredentialDto } from '../api/nangcap24';
import apiClient from '../services/apiClient';

interface PatientDto {
  id: string;
  patientCode: string;
  fullName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
}

const DOC_TYPES: Record<string, string> = {
  cam_ket_pt: 'Cam kết phẫu thuật',
  cam_ket_tm: 'Cam kết truyền máu',
  cam_ket_dv: 'Cam kết dịch vụ',
  phieu_hen:  'Phiếu hẹn khám',
};

// ─── WebAuthn helpers ───
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
  const [creds, setCreds] = useState<BiometricCredentialDto[]>([]);
  const [search, setSearch] = useState('');
  const [selPid, setSelPid] = useState<string | null>(null);
  const [credCounts, setCredCounts] = useState<Record<string, number>>({});
  const [enrollModal, setEnrollModal] = useState(false);
  const [signModal, setSignModal] = useState(false);
  const [enrollForm] = Form.useForm();
  const [signForm] = Form.useForm();
  const [scanning, setScanning] = useState(false);
  const [selCred, setSelCred] = useState<BiometricCredentialDto | null>(null);
  const webAuthnOk = typeof window !== 'undefined' && !!window.PublicKeyCredential;

  const loadPatients = async () => {
    try {
      const r = await apiClient.get('/reception/patients/search', { params: { keyword: search || 'a', limit: 50 } });
      const items = Array.isArray(r.data) ? r.data : (r.data?.items || []);
      setPatients(items as PatientDto[]);
    } catch {
      setPatients([]);
    }
  };

  const loadCredentials = async (patientId: string) => {
    try {
      const list = await biometricApi.listCredentials(patientId);
      setCreds(list);
      setCredCounts(prev => ({ ...prev, [patientId]: list.length }));
    } catch {
      setCreds([]);
    }
  };

  useEffect(() => { loadPatients(); }, []);
  useEffect(() => { if (selPid) loadCredentials(selPid); }, [selPid]);

  const sel = patients.find(p => p.id === selPid);
  const myCreds = creds.filter(c => c.patientId === selPid);
  const activeCount = myCreds.filter(c => c.status === 'active').length;
  const revokedCount = myCreds.filter(c => c.status === 'revoked').length;
  const usageSum = myCreds.reduce((s, c) => s + c.usageCount, 0);

  const filteredPts = patients.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${p.fullName} ${p.patientCode} ${p.phoneNumber || ''}`.toLowerCase().includes(s);
  });

  const kpis = [
    { lbl: 'BN đã đăng ký', val: Object.values(credCounts).filter(c => c > 0).length, sub: `/ ${patients.length} tổng`, tone: 'ok' as const },
    { lbl: 'BN đang chọn',  val: sel?.fullName || '—' },
    { lbl: 'Credentials hoạt động', val: activeCount, tone: 'ok' as const },
    { lbl: 'Tổng lần ký vân tay',   val: usageSum, sub: 'BN đang chọn' },
    { lbl: 'Đã thu hồi', val: revokedCount, tone: 'warn' as const },
  ];

  // ─── WebAuthn register ───
  const doEnroll = async () => {
    if (!sel || !webAuthnOk) { te('WebAuthn không khả dụng'); return; }
    try {
      const v = await enrollForm.validateFields();
      setScanning(true);
      const begin = await biometricApi.beginRegister({
        patientId: sel.id,
        ownerType: v.ownerType,
        ownerName: v.ownerName,
        deviceName: v.deviceName,
      });
      const opts: PublicKeyCredentialCreationOptions = {
        challenge: b64uToBuf(begin.challenge),
        rp: { id: begin.rpId === 'localhost' ? undefined : begin.rpId, name: begin.rpName },
        user: {
          id: b64uToBuf(begin.userHandle),
          name: begin.userName,
          displayName: begin.userDisplayName,
        },
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
        timeout: 60000, attestation: 'none',
      };
      const cred = await navigator.credentials.create({ publicKey: opts }) as PublicKeyCredential | null;
      if (!cred) throw new Error('User cancelled');
      const r = cred.response as AuthenticatorAttestationResponse;
      // @ts-ignore
      const pk: ArrayBuffer | null = typeof r.getPublicKey === 'function' ? r.getPublicKey() : null;
      const result = await biometricApi.finishRegister({
        patientId: sel.id, ownerType: v.ownerType, ownerName: v.ownerName, deviceName: v.deviceName,
        credentialId: bufToB64u(cred.rawId), publicKey: pk ? bufToB64u(pk) : '',
        userHandle: begin.userHandle, clientDataJson: bufToB64u(r.clientDataJSON),
        attestationObject: bufToB64u(r.attestationObject),
      });
      tk(`Đã đăng ký vân tay cho ${result.ownerName ?? v.ownerType}`);
      setEnrollModal(false); enrollForm.resetFields();
      loadCredentials(sel.id);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown; message?: string };
      if (!err?.errorFields) te(`Đăng ký thất bại: ${err?.message ?? e}`);
    } finally { setScanning(false); }
  };

  const doSign = async () => {
    if (!sel || !webAuthnOk) return;
    try {
      const v = await signForm.validateFields();
      setScanning(true);
      const begin = await biometricApi.beginSign({ patientId: sel.id, documentType: v.documentType, documentRef: v.documentRef });
      const opts: PublicKeyCredentialRequestOptions = {
        challenge: b64uToBuf(begin.challenge),
        rpId: begin.rpId === 'localhost' ? undefined : begin.rpId,
        allowCredentials: begin.allowCredentials.map(c => ({ type: 'public-key' as const, id: b64uToBuf(c.credentialId) })),
        userVerification: 'required', timeout: 60000,
      };
      const cred = await navigator.credentials.get({ publicKey: opts }) as PublicKeyCredential | null;
      if (!cred) throw new Error('User cancelled');
      const r = cred.response as AuthenticatorAssertionResponse;
      const result = await biometricApi.finishSign({
        patientId: sel.id, credentialId: bufToB64u(cred.rawId),
        documentType: v.documentType, documentRef: v.documentRef,
        challenge: begin.challenge, clientDataJson: bufToB64u(r.clientDataJSON),
        authenticatorData: bufToB64u(r.authenticatorData), signature: bufToB64u(r.signature),
      });
      if (result.isVerified) tk(`✓ Ký thành công · ${DOC_TYPES[v.documentType] ?? v.documentType}`);
      else te(`Ký thất bại: ${result.error}`);
      setSignModal(false); signForm.resetFields();
      loadCredentials(sel.id);
    } catch (e: unknown) {
      const err = e as { errorFields?: unknown; message?: string };
      if (!err?.errorFields) te(`Ký thất bại: ${err?.message ?? e}`);
    } finally { setScanning(false); }
  };

  const revoke = (c: BiometricCredentialDto) =>
    cf(`Thu hồi credential "${c.deviceName ?? c.ownerName}"?`, async () => {
      try {
        await biometricApi.revoke(c.id);
        tk('Đã thu hồi credential');
        if (selPid) loadCredentials(selPid);
      } catch { te('Thu hồi thất bại'); }
    }, { tone: 'crit', confirm: 'Thu hồi' });

  const credCols: ColumnDef<BiometricCredentialDto>[] = [
    {
      key: 'owner', label: 'Người ký', render: c => (
        <div>
          <div style={{ fontWeight: 600 }}>{c.ownerName ?? '—'}</div>
          <StatusBadge tone={c.ownerType === 'patient' ? 'info' : 'warn'}>
            {c.ownerType === 'patient' ? 'Bệnh nhân' : 'Người nhà'}
          </StatusBadge>
        </div>
      )
    },
    {
      key: 'device', label: 'Thiết bị',
      render: c => <span style={{ fontSize: 'var(--fs-sm)' }}><TermIcon name="shield" size={11} /> {c.deviceName ?? '—'}</span>
    },
    { key: 'enrolled', label: 'Đăng ký lúc', mono: true, render: c => fmtDTg(c.enrolledAt) },
    {
      key: 'lastUsed', label: 'Lần ký cuối', mono: true,
      render: c => c.lastUsedAt ? fmtDTg(c.lastUsedAt) : <span style={{ color: 'var(--t-3)' }}>Chưa dùng</span>
    },
    { key: 'usageCount', label: 'Số lần ký', mono: true, width: 90 },
    {
      key: 'status', label: 'Trạng thái', width: 130, render: c => c.status === 'active'
        ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
        : <StatusBadge tone="crit" dot>Đã thu hồi</StatusBadge>
    },
  ];

  return (
    <div className="ab" data-testid="biometric-enrollment-page">
      <KpiStrip items={kpis} />

      {!webAuthnOk && (
        <div style={{
          padding: '10px 14px', background: 'var(--s-warn-bg)', borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--s-warn-bd)', color: 'var(--s-warn-tx)', fontSize: 12.5,
        }}>
          <TermIcon name="alert" size={13} /> <b>WebAuthn / FIDO2</b> · Cần HTTPS + Chrome/Edge/Safari mới. Trình duyệt hiện không hỗ trợ.
        </div>
      )}

      {webAuthnOk && (
        <div style={{
          padding: '10px 14px', background: 'var(--s-warn-bg)', borderTop: '1px solid var(--line)',
          borderBottom: '1px solid var(--s-warn-bd)', color: 'var(--s-warn-tx)', fontSize: 12.5,
        }}>
          <TermIcon name="alert" size={13} /> <b>WebAuthn / FIDO2</b> · Hệ thống sẽ dùng <b>Touch ID</b> · <b>Windows Hello</b> · <b>USB Fingerprint Reader</b>. Khoá riêng tư không rời thiết bị.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 0, flex: 1, minHeight: 0 }}>
        {/* Patient list */}
        <div style={{ borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: 'var(--space-10)', borderBottom: '1px solid var(--line)' }}>
            <SearchBox value={search} onChange={setSearch} placeholder="Tìm tên / mã BN / SĐT" minWidth="100%" />
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {filteredPts.map(p => {
              const isSel = p.id === selPid;
              const credCount = credCounts[p.id] ?? 0;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelPid(p.id)}
                  data-testid={`bio-patient-${p.id}`}
                  style={{
                    padding: '10px 14px', borderBottom: '1px solid var(--line-soft)',
                    background: isSel ? 'var(--c-pri-bg)' : 'transparent',
                    borderLeft: isSel ? '3px solid var(--a-cy)' : '3px solid transparent',
                    cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-6)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>{p.fullName}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>{p.patientCode}</div>
                    <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-3)' }}>{p.phoneNumber ?? ''}</div>
                  </div>
                  <div style={{ alignSelf: 'center' }}>
                    {credCount > 0
                      ? <StatusBadge tone="ok" dot>{credCount} cred</StatusBadge>
                      : <StatusBadge tone="info">chưa ĐK</StatusBadge>}
                  </div>
                </div>
              );
            })}
            {filteredPts.length === 0 && (
              <div style={{ padding: 'var(--space-40)', textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-sm)' }}>
                Không có bệnh nhân
              </div>
            )}
          </div>
        </div>

        {/* Credentials panel */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {!sel ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--t-2)', fontSize: 'var(--fs-md)' }}>
              <TermIcon name="user" size={32} /><br />Chọn 1 bệnh nhân ở danh sách trái để quản lý vân tay
            </div>
          ) : (
            <>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--line)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{sel.fullName}</div>
                  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', fontFamily: 'var(--font-mono)' }}>
                    {sel.patientCode} · {sel.phoneNumber ?? ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                  <Button size="small" disabled={activeCount === 0 || !webAuthnOk} onClick={() => { signForm.resetFields(); setSignModal(true); }}>
                    <TermIcon name="check" size={12} /> Test ký
                  </Button>
                  <Button type="primary" size="small" disabled={!webAuthnOk} onClick={() => { enrollForm.resetFields(); setEnrollModal(true); }} data-testid="enroll-btn">
                    <TermIcon name="plus" size={12} /> Đăng ký vân tay
                  </Button>
                </div>
              </div>

              <div style={{ flex: 1, overflow: 'auto' }}>
                {myCreds.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--t-2)' }}>
                    <TermIcon name="shield" size={32} />
                    <div style={{ marginTop: 'var(--space-8)', fontWeight: 600, fontSize: 14 }}>Chưa có credential</div>
                    <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>Bấm "Đăng ký vân tay" để bắt đầu quét.</div>
                  </div>
                ) : (
                  <DataTable
                    rowKey={c => c.id}
                    data={myCreds}
                    columns={credCols}
                    onRowClick={setSelCred}
                    actions={c => c.status === 'active'
                      ? <ActBtn ic="x" title="Thu hồi" tone="crit" onClick={() => revoke(c)} />
                      : null}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enroll modal */}
      <ModalShell
        open={enrollModal}
        onClose={() => { setEnrollModal(false); enrollForm.resetFields(); setScanning(false); }}
        title="Đăng ký vân tay sinh trắc học"
        size="md"
        footer={(
          <>
            <Button onClick={() => { setEnrollModal(false); enrollForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={scanning} onClick={doEnroll}>
              <TermIcon name="shield" size={12} /> {scanning ? 'Đang quét…' : 'Bắt đầu quét vân tay'}
            </Button>
          </>
        )}
      >
        <div style={{ padding: 'var(--space-18)' }}>
          <div style={{ padding: 'var(--space-12)', background: 'var(--s-info-soft)', color: 'var(--a-cy-dim)', borderRadius: 'var(--r-2)', marginBottom: 'var(--space-16)', fontSize: 12.5 }}>
            <TermIcon name="info" size={13} /> Khi bấm "Bắt đầu", trình duyệt sẽ yêu cầu Touch ID / Windows Hello / vân tay. Khoá riêng tư <b>không rời khỏi thiết bị</b>.
          </div>
          <Form form={enrollForm} layout="vertical" initialValues={{ ownerType: 'patient', ownerName: sel?.fullName ?? '' }}>
            <Form.Item name="ownerType" label="Loại người ký" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="patient" style={{ display: 'block', marginBottom: 'var(--space-6)' }}>
                  <b>Bệnh nhân</b> <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}> · Tự ký bằng vân tay</span>
                </Radio>
                <Radio value="family" style={{ display: 'block' }}>
                  <b>Người nhà</b> <span style={{ color: 'var(--t-2)', fontSize: 'var(--fs-xs)' }}> · Cho cam kết PT/truyền máu khi BN không tự ký được</span>
                </Radio>
              </Radio.Group>
            </Form.Item>
            <Form.Item name="ownerName" label="Tên người ký" rules={[{ required: true, message: 'Cần nhập tên' }]}>
              <Input placeholder="VD: Nguyễn Văn A" />
            </Form.Item>
            <Form.Item name="deviceName" label="Mô tả thiết bị" extra="Tùy chọn — gợi ý nhận diện về sau">
              <Input placeholder="VD: Touch ID iPhone, USB U.are.U 4500…" />
            </Form.Item>
            {scanning && (
              <div style={{
                padding: 'var(--space-24)', textAlign: 'center', border: '2px dashed var(--a-cy)',
                borderRadius: 'var(--r-3)', marginTop: 'var(--space-14)', background: 'var(--c-pri-bg)',
              }}>
                <div style={{ fontSize: 32 }}>👆</div>
                <div style={{ marginTop: 'var(--space-8)', fontWeight: 600, color: 'var(--a-cy)' }}>Đặt ngón tay lên cảm biến…</div>
                <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)', marginTop: 'var(--space-4)' }}>WebAuthn challenge đang xử lý</div>
              </div>
            )}
          </Form>
        </div>
      </ModalShell>

      {/* Sign test modal */}
      <ModalShell
        open={signModal}
        onClose={() => { setSignModal(false); signForm.resetFields(); setScanning(false); }}
        title="Test ký bằng vân tay"
        size="md"
        footer={(
          <>
            <Button onClick={() => { setSignModal(false); signForm.resetFields(); }}>Hủy</Button>
            <Button type="primary" loading={scanning} onClick={doSign}>
              <TermIcon name="shield" size={12} /> {scanning ? 'Đang ký…' : 'Quét vân tay để ký'}
            </Button>
          </>
        )}
      >
        <div style={{ padding: 'var(--space-18)' }}>
          <Form form={signForm} layout="vertical" initialValues={{ documentType: 'cam_ket_pt', documentRef: 'DEMO-001' }}>
            <Form.Item name="documentType" label="Loại tài liệu">
              <Select options={Object.entries(DOC_TYPES).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
            <Form.Item name="documentRef" label="Mã tham chiếu">
              <Input />
            </Form.Item>
          </Form>
          <div style={{ marginTop: 'var(--space-10)', padding: 'var(--space-10)', background: 'var(--d-1)', borderRadius: 'var(--r-2)', fontSize: 'var(--fs-sm)' }}>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-6)' }}>Credential khả dụng:</div>
            {myCreds.filter(c => c.status === 'active').map(c => (
              <div key={c.id} style={{ fontSize: 'var(--fs-xs)', color: 'var(--t-2)' }}>• {c.ownerName ?? '—'} — {c.deviceName ?? '—'}</div>
            ))}
          </div>
        </div>
      </ModalShell>

      {/* Credential detail */}
      <DrawerShell
        open={!!selCred}
        onClose={() => setSelCred(null)}
        size="md"
        title={selCred ? `Credential · ${selCred.ownerName ?? '—'}` : ''}
        sub={selCred ? (selCred.ownerType === 'patient' ? 'Bệnh nhân' : 'Người nhà') : ''}
      >
        {selCred && <>
          <DrSec title="Người ký">
            <DrField lbl="Họ tên">{selCred.ownerName ?? '—'}</DrField>
            <DrField lbl="Loại người ký">
              <StatusBadge tone={selCred.ownerType === 'patient' ? 'info' : 'warn'}>
                {selCred.ownerType === 'patient' ? 'Bệnh nhân' : 'Người nhà'}
              </StatusBadge>
            </DrField>
            <DrField lbl="Bệnh nhân">{sel?.fullName ?? '—'}</DrField>
          </DrSec>
          <DrSec title="Thiết bị">
            <DrField lbl="Thiết bị">{selCred.deviceName ?? '—'}</DrField>
            <DrField lbl="Mã credential"><span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--fs-xs)', wordBreak: 'break-all' }}>{selCred.id}</span></DrField>
          </DrSec>
          <DrSec title="Sử dụng">
            <DrField lbl="Đăng ký lúc"><span style={{ fontFamily: 'var(--font-mono)' }}>{fmtDTg(selCred.enrolledAt)}</span></DrField>
            <DrField lbl="Lần ký cuối"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCred.lastUsedAt ? fmtDTg(selCred.lastUsedAt) : 'Chưa dùng'}</span></DrField>
            <DrField lbl="Số lần ký"><span style={{ fontFamily: 'var(--font-mono)' }}>{selCred.usageCount}</span></DrField>
            <DrField lbl="Trạng thái">
              {selCred.status === 'active'
                ? <StatusBadge tone="ok" dot>Hoạt động</StatusBadge>
                : <StatusBadge tone="crit" dot>Đã thu hồi</StatusBadge>}
            </DrField>
          </DrSec>
        </>}
      </DrawerShell>
    </div>
  );
};

export default BiometricEnrollment;
