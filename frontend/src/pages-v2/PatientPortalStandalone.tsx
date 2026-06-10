/**
 * R2 — Cổng bệnh nhân TỰ ĐĂNG NHẬP (standalone, KHÔNG dùng terminal shell).
 * Pattern theo InspectorPortal.tsx: login card riêng, token key riêng + ghi localStorage['token']
 * cho apiClient gắn Bearer. Token role PortalPatient → BE derive patientId từ claim (IDOR đóng phía server).
 * Flow: Đăng ký → Liên kết hồ sơ (mã BN + SĐT/CCCD/ngày sinh) → Đăng nhập → xem dữ liệu của CHÍNH MÌNH.
 */
import React, { useEffect, useState } from 'react';
import apiClient from '../api/client';

const TOKEN_KEY = 'patient_portal_token';
const INFO_KEY = 'patient_portal_account';

interface PortalAccountInfo {
  id: string;
  email?: string;
  phone?: string;
  patientId?: string;
  patientName?: string;
  status?: string;
}

interface PortalLoginResponse {
  success: boolean;
  message?: string;
  token?: string;
  account?: PortalAccountInfo;
}

const portalAuthApi = {
  login: (identifier: string, password: string) =>
    apiClient.post<PortalLoginResponse>('/portal/login', { identifier, password }).then(r => r.data),
  register: (dto: { fullName: string; email: string; phone: string; idNumber: string; dateOfBirth: string; password: string }) =>
    apiClient.post<PortalAccountInfo>('/portal/register', dto).then(r => r.data),
  linkRecord: (accountId: string, patientCode: string, verificationData: string) =>
    apiClient.post<{ success: boolean; message?: string }>('/portal/account/link-record', { accountId, patientCode, verificationData }).then(r => r.data),
  visits: () => apiClient.get<VisitRow[]>('/portal/visits').then(r => r.data),
  labResults: () => apiClient.get<LabRow[]>('/portal/lab-results').then(r => r.data),
  prescriptions: () => apiClient.get<RxRow[]>('/portal/prescriptions').then(r => r.data),
  invoices: () => apiClient.get<InvoiceRow[]>('/portal/invoices').then(r => r.data),
};

interface VisitRow { visitId: string; visitDate?: string; visitType?: string; department?: string; doctorName?: string; diagnosis?: string; summary?: string }
interface LabRow { id: string; orderCode?: string; orderDate?: string; resultDate?: string; status?: string; testCategory?: string; testItems?: { testName?: string; result?: string; unit?: string; referenceRange?: string; isAbnormal?: boolean }[] }
interface RxRow { id: string; prescriptionCode?: string; prescriptionDate?: string; doctorName?: string; diagnosis?: string; status?: string | number; items?: { medicineName?: string; quantity?: number; dosage?: string }[] }
interface InvoiceRow { id: string; invoiceCode?: string; invoiceDate?: string; totalAmount?: number; paymentStatus?: string }

const fmtDate = (s?: string) => (s ? new Date(s).toLocaleDateString('vi-VN') : '—');
const fmtMoney = (n?: number) => (typeof n === 'number' ? n.toLocaleString('vi-VN') + ' đ' : '—');

const inputStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 12px', border: '1px solid #cbd5e1',
  borderRadius: 6, fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, marginTop: 12 };
const btnStyle: React.CSSProperties = {
  width: '100%', marginTop: 18, height: 42, background: 'linear-gradient(135deg, #047857, #10b981)',
  color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(16,185,129,0.4)',
};

const PatientPortalStandalone: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [info, setInfo] = useState<PortalAccountInfo | null>(() => {
    const raw = localStorage.getItem(INFO_KEY);
    try { return raw ? (JSON.parse(raw) as PortalAccountInfo) : null; } catch { return null; }
  });

  if (!token || !info) {
    return <PortalAuth onLogin={(t, i) => { setToken(t); setInfo(i); }} />;
  }
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(INFO_KEY);
    localStorage.removeItem('token');
    setToken(null); setInfo(null);
  };
  return <PortalWorkspace info={info} onLogout={logout} />;
};

// ─────────── Auth card (login / register / link) ───────────
const PortalAuth: React.FC<{ onLogin: (token: string, info: PortalAccountInfo) => void }> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'link'>('login');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setL] = useState(false);

  // login
  const [identifier, setIdent] = useState('');
  const [password, setPass] = useState('');
  // register
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regIdNo, setRegIdNo] = useState('');
  const [regDob, setRegDob] = useState('');
  const [regPass, setRegPass] = useState('');
  // link
  const [linkAccountId, setLinkAccountId] = useState('');
  const [linkPatientCode, setLinkPatientCode] = useState('');
  const [linkVerify, setLinkVerify] = useState('');

  const doLogin = async () => {
    setErr(''); setOk(''); setL(true);
    try {
      const r = await portalAuthApi.login(identifier.trim(), password);
      if (!r.success || !r.token || !r.account) { setErr(r.message ?? 'Đăng nhập thất bại'); return; }
      localStorage.setItem(TOKEN_KEY, r.token);
      localStorage.setItem(INFO_KEY, JSON.stringify(r.account));
      localStorage.setItem('token', r.token); // share với apiClient (pattern InspectorPortal)
      onLogin(r.token, r.account);
    } catch {
      setErr('Đăng nhập thất bại — kiểm tra kết nối');
    } finally { setL(false); }
  };

  const doRegister = async () => {
    setErr(''); setOk(''); setL(true);
    try {
      const acc = await portalAuthApi.register({
        fullName: regName.trim(), email: regEmail.trim(), phone: regPhone.trim(),
        idNumber: regIdNo.trim(), dateOfBirth: regDob || '1900-01-01', password: regPass,
      });
      setLinkAccountId(acc.id);
      setOk('Đăng ký thành công. Tiếp tục liên kết hồ sơ bệnh nhân để kích hoạt.');
      setMode('link');
    } catch {
      setErr('Đăng ký thất bại — kiểm tra lại thông tin');
    } finally { setL(false); }
  };

  const doLink = async () => {
    setErr(''); setOk(''); setL(true);
    try {
      const r = await portalAuthApi.linkRecord(linkAccountId.trim(), linkPatientCode.trim(), linkVerify.trim());
      if (!r.success) { setErr(r.message ?? 'Thông tin xác minh không khớp'); return; }
      setOk('Liên kết thành công — đăng nhập để xem hồ sơ.');
      setMode('login');
    } catch {
      setErr('Liên kết thất bại — kiểm tra lại thông tin');
    } finally { setL(false); }
  };

  const tabBtn = (m: 'login' | 'register' | 'link', label: string) => (
    <button
      onClick={() => { setMode(m); setErr(''); setOk(''); }}
      style={{
        flex: 1, height: 34, border: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
        background: mode === m ? '#047857' : '#f1f5f9', color: mode === m ? '#fff' : '#475569',
        borderRadius: 6,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="patient-portal-auth-card"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #10b981 100%)', padding: 24,
      }}
    >
      <div style={{ width: 460, background: '#fff', borderRadius: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 32px 14px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto',
            background: 'linear-gradient(135deg, #047857, #10b981)', color: '#fff',
            display: 'grid', placeItems: 'center', fontSize: 32, boxShadow: '0 8px 24px rgba(16,185,129,0.4)',
          }}>🩺</div>
          <h1 style={{ margin: '14px 0 4px', color: '#065f46', fontSize: 20 }}>CỔNG BỆNH NHÂN</h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>Tra cứu hồ sơ sức khỏe của chính bạn</div>
        </div>

        <div style={{ padding: '0 32px 26px' }}>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {tabBtn('login', 'Đăng nhập')}
            {tabBtn('register', 'Đăng ký')}
            {tabBtn('link', 'Liên kết hồ sơ')}
          </div>

          {mode === 'login' && (
            <>
              <label style={labelStyle}>Email / SĐT / Tên đăng nhập</label>
              <input data-testid="portal-identifier" value={identifier} onChange={e => setIdent(e.target.value)} placeholder="vd: email@example.com" style={inputStyle} />
              <label style={labelStyle}>Mật khẩu</label>
              <input data-testid="portal-password" type="password" value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && doLogin()} placeholder="••••••••" style={inputStyle} />
              <button data-testid="portal-login-btn" onClick={doLogin} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Đang xác thực…' : 'Đăng nhập'}
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <label style={labelStyle}>Họ tên</label>
              <input value={regName} onChange={e => setRegName(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Email</label>
              <input value={regEmail} onChange={e => setRegEmail(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Số điện thoại</label>
              <input value={regPhone} onChange={e => setRegPhone(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CCCD/CMND</label>
                  <input value={regIdNo} onChange={e => setRegIdNo(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ngày sinh</label>
                  <input type="date" value={regDob} onChange={e => setRegDob(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <label style={labelStyle}>Mật khẩu</label>
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)} style={inputStyle} />
              <button onClick={doRegister} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Đang đăng ký…' : 'Đăng ký tài khoản'}
              </button>
            </>
          )}

          {mode === 'link' && (
            <>
              <div style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                Liên kết tài khoản với hồ sơ bệnh nhân tại viện. Thông tin xác minh phải khớp
                SĐT / CCCD / ngày sinh (yyyy-mm-dd) đã đăng ký khám.
              </div>
              <label style={labelStyle}>Mã tài khoản (cấp khi đăng ký)</label>
              <input value={linkAccountId} onChange={e => setLinkAccountId(e.target.value)} placeholder="GUID tài khoản" style={inputStyle} />
              <label style={labelStyle}>Mã bệnh nhân (trên phiếu khám, vd BN2026...)</label>
              <input value={linkPatientCode} onChange={e => setLinkPatientCode(e.target.value)} style={inputStyle} />
              <label style={labelStyle}>Thông tin xác minh (SĐT / CCCD / ngày sinh yyyy-mm-dd)</label>
              <input value={linkVerify} onChange={e => setLinkVerify(e.target.value)} style={inputStyle} />
              <button onClick={doLink} disabled={loading} style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Đang liên kết…' : 'Liên kết hồ sơ'}
              </button>
            </>
          )}

          {err && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', color: '#991b1b', borderRadius: 6, fontSize: 12.5 }}>{err}</div>}
          {ok && <div style={{ marginTop: 12, padding: '8px 12px', background: '#ecfdf5', color: '#065f46', borderRadius: 6, fontSize: 12.5 }}>{ok}</div>}
        </div>

        <div style={{ background: '#f1f5f9', padding: '10px 32px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          <span>🔒 Dữ liệu chỉ hiển thị cho đúng bệnh nhân</span>
          <span>HIS Patient Portal</span>
        </div>
      </div>
    </div>
  );
};

// ─────────── Workspace ───────────
type TabKey = 'visits' | 'labs' | 'rx' | 'bills';

const PortalWorkspace: React.FC<{ info: PortalAccountInfo; onLogout: () => void }> = ({ info, onLogout }) => {
  const [tab, setTab] = useState<TabKey>('visits');
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [labs, setLabs] = useState<LabRow[]>([]);
  const [rx, setRx] = useState<RxRow[]>([]);
  const [bills, setBills] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setLoadErr('');
      try {
        // Token PortalPatient → BE tự lấy patientId từ claim, KHÔNG truyền query param
        const [v, l, p, b] = await Promise.all([
          portalAuthApi.visits().catch(() => []),
          portalAuthApi.labResults().catch(() => []),
          portalAuthApi.prescriptions().catch(() => []),
          portalAuthApi.invoices().catch(() => []),
        ]);
        if (!alive) return;
        setVisits(Array.isArray(v) ? v : []);
        setLabs(Array.isArray(l) ? l : []);
        setRx(Array.isArray(p) ? p : []);
        setBills(Array.isArray(b) ? b : []);
      } catch {
        if (alive) setLoadErr('Không tải được dữ liệu — thử đăng nhập lại');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'visits', label: 'Lịch sử khám', count: visits.length },
    { key: 'labs', label: 'KQ xét nghiệm', count: labs.length },
    { key: 'rx', label: 'Đơn thuốc', count: rx.length },
    { key: 'bills', label: 'Hóa đơn', count: bills.length },
  ];

  const thStyle: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 11.5, color: '#64748b', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap' };
  const tdStyle: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' };
  const emptyRow = (cols: number) => (
    <tr><td colSpan={cols} style={{ ...tdStyle, textAlign: 'center', color: '#94a3b8', padding: 28 }}>
      {loading ? 'Đang tải…' : 'Chưa có dữ liệu'}
    </td></tr>
  );

  return (
    <div data-testid="patient-portal-workspace" style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{
        background: 'linear-gradient(135deg, #064e3b, #047857)', color: '#fff',
        padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🩺</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>CỔNG BỆNH NHÂN</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{info.patientName || info.email} · chỉ xem hồ sơ của bạn</div>
          </div>
        </div>
        <button
          data-testid="portal-logout-btn"
          onClick={onLogout}
          style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 6, padding: '7px 16px', fontSize: 12.5, cursor: 'pointer' }}
        >
          Đăng xuất
        </button>
      </header>

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 20px' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.key}
              data-testid={`portal-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              style={{
                padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: tab === t.key ? '1px solid #047857' : '1px solid #e2e8f0',
                background: tab === t.key ? '#047857' : '#fff', color: tab === t.key ? '#fff' : '#334155',
              }}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loadErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fef2f2', color: '#991b1b', borderRadius: 8, fontSize: 13 }}>{loadErr}</div>}

        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'auto' }}>
          {tab === 'visits' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Ngày khám</th><th style={thStyle}>Loại</th><th style={thStyle}>Khoa</th>
                <th style={thStyle}>Bác sĩ</th><th style={thStyle}>Chẩn đoán</th>
              </tr></thead>
              <tbody>
                {visits.length === 0 ? emptyRow(5) : visits.map(v => (
                  <tr key={v.visitId}>
                    <td style={tdStyle}>{fmtDate(v.visitDate)}</td>
                    <td style={tdStyle}>{v.visitType || '—'}</td>
                    <td style={tdStyle}>{v.department || '—'}</td>
                    <td style={tdStyle}>{v.doctorName || '—'}</td>
                    <td style={tdStyle}>{v.diagnosis || v.summary || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'labs' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Mã phiếu</th><th style={thStyle}>Ngày chỉ định</th><th style={thStyle}>Ngày KQ</th>
                <th style={thStyle}>Trạng thái</th><th style={thStyle}>Chỉ số</th>
              </tr></thead>
              <tbody>
                {labs.length === 0 ? emptyRow(5) : labs.map(l => (
                  <tr key={l.id}>
                    <td style={tdStyle}>{l.orderCode || '—'}</td>
                    <td style={tdStyle}>{fmtDate(l.orderDate)}</td>
                    <td style={tdStyle}>{fmtDate(l.resultDate ?? undefined)}</td>
                    <td style={tdStyle}>{l.status || '—'}</td>
                    <td style={tdStyle}>
                      {(l.testItems ?? []).length === 0 ? '—' : (l.testItems ?? []).map((t, i) => (
                        <div key={i} style={{ color: t.isAbnormal ? '#cf1322' : undefined }}>
                          {t.testName}: <b>{t.result ?? '—'}</b>{t.unit ? ` ${t.unit}` : ''}{t.referenceRange ? ` (${t.referenceRange})` : ''}
                        </div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'rx' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Mã đơn</th><th style={thStyle}>Ngày kê</th><th style={thStyle}>Bác sĩ</th>
                <th style={thStyle}>Chẩn đoán</th><th style={thStyle}>Thuốc</th>
              </tr></thead>
              <tbody>
                {rx.length === 0 ? emptyRow(5) : rx.map(p => (
                  <tr key={p.id}>
                    <td style={tdStyle}>{p.prescriptionCode || '—'}</td>
                    <td style={tdStyle}>{fmtDate(p.prescriptionDate)}</td>
                    <td style={tdStyle}>{p.doctorName || '—'}</td>
                    <td style={tdStyle}>{p.diagnosis || '—'}</td>
                    <td style={tdStyle}>
                      {(p.items ?? []).length === 0 ? '—' : (p.items ?? []).map((m, i) => (
                        <div key={i}>{m.medicineName}{m.quantity ? ` ×${m.quantity}` : ''}{m.dosage ? ` — ${m.dosage}` : ''}</div>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'bills' && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={thStyle}>Mã hóa đơn</th><th style={thStyle}>Ngày</th>
                <th style={thStyle}>Số tiền</th><th style={thStyle}>Thanh toán</th>
              </tr></thead>
              <tbody>
                {bills.length === 0 ? emptyRow(4) : bills.map(b => (
                  <tr key={b.id}>
                    <td style={tdStyle}>{b.invoiceCode || '—'}</td>
                    <td style={tdStyle}>{fmtDate(b.invoiceDate)}</td>
                    <td style={tdStyle}>{fmtMoney(b.totalAmount)}</td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '2px 10px', borderRadius: 10, fontSize: 12,
                        background: b.paymentStatus === 'Paid' ? '#ecfdf5' : '#fff7ed',
                        color: b.paymentStatus === 'Paid' ? '#047857' : '#c2410c',
                      }}>
                        {b.paymentStatus === 'Paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

export default PatientPortalStandalone;
