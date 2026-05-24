/**
 * NangCap24 — Inspector Portal v2 (port từ mod-inspector-portal.jsx)
 *
 * STANDALONE — Cổng giám định BHXH login riêng, KHÔNG dùng terminal shell.
 * Login: gradient #1e3a8a → #2563eb, card 460px center.
 * Workspace: top bar gradient + Card filter + Card table + Modal chi tiết HSBA.
 */
import React, { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { inspectorApi } from '../api/nangcap24';
import type { InspectorRecordListItemDto, InspectorRecordDetailDto } from '../api/nangcap24';
import TermIcon from '../layouts/terminal/Icon';

const INSPECTOR_TOKEN_KEY = 'inspector_token';
const INSPECTOR_INFO_KEY = 'inspector_info';

interface InspectorInfo {
  id: string;
  username: string;
  fullName: string;
  bhxhCode?: string;
  province?: string;
  email?: string;
}

const fmtVND = (n: number) => (n ? `${n.toLocaleString('vi-VN')} ₫` : '—');
const fmtDMY = (d?: string | null) => d ? dayjs(d).format('DD/MM/YYYY') : '—';
const fmtDT  = (d?: string | null) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';
const fmtHM  = (d?: string | Date | null) => d ? dayjs(d).format('HH:mm') : '—';

const InspectorPortal: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(INSPECTOR_TOKEN_KEY));
  const [info, setInfo] = useState<InspectorInfo | null>(() => {
    const raw = localStorage.getItem(INSPECTOR_INFO_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  if (!token || !info) {
    return <InspectorLogin onLogin={(t, i) => { setToken(t); setInfo(i); }} />;
  }
  return <InspectorWorkspace info={info} onLogout={() => {
    localStorage.removeItem(INSPECTOR_TOKEN_KEY);
    localStorage.removeItem(INSPECTOR_INFO_KEY);
    setToken(null); setInfo(null);
  }} />;
};

// ─────────── Login screen ───────────
const InspectorLogin: React.FC<{ onLogin: (token: string, info: InspectorInfo) => void }> = ({ onLogin }) => {
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [loading, setL] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setErr(null);
    if (!username || !password) { setErr('Cần nhập tài khoản & mật khẩu'); return; }
    setL(true);
    try {
      const r = await inspectorApi.login({ username, password });
      if (!r.success || !r.token || !r.inspector) {
        setErr(r.message ?? 'Đăng nhập thất bại'); return;
      }
      localStorage.setItem(INSPECTOR_TOKEN_KEY, r.token);
      localStorage.setItem(INSPECTOR_INFO_KEY, JSON.stringify(r.inspector));
      localStorage.setItem('token', r.token);    // share with apiClient
      onLogin(r.token, r.inspector);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Đăng nhập thất bại');
    } finally { setL(false); }
  };

  return (
    <div
      data-testid="inspector-login-card"
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)',
        padding: 24, position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Decorative blurs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-30%', left: '-15%', width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', pointerEvents: 'none',
      }} />

      <div style={{
        width: 460, background: '#fff', borderRadius: 14,
        boxShadow: '0 30px 80px rgba(0,0,0,0.4)', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ padding: '30px 32px 20px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, margin: '0 auto',
            background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
            color: '#fff', display: 'grid', placeItems: 'center', fontSize: 32,
            boxShadow: '0 8px 24px rgba(37,99,235,0.4)',
          }}>🛡️</div>
          <h1 style={{ margin: '16px 0 4px', color: '#1e3a8a', fontSize: 20, letterSpacing: 0.2 }}>CỔNG GIÁM ĐỊNH BHXH</h1>
          <div style={{ color: '#64748b', fontSize: 13 }}>Tra cứu Hồ sơ bệnh án điện tử</div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            BV Đa khoa Hưng Yên · v4.2.1 · Đã chứng thực CA
          </div>
        </div>

        <div style={{ padding: '10px 32px 28px' }}>
          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, marginTop: 8 }}>Tài khoản giám định viên</label>
          <input
            data-testid="inspector-username"
            value={username}
            onChange={e => setU(e.target.value)}
            placeholder="VD: inspector"
            style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, outline: 'none' }}
          />

          <label style={{ fontSize: 12, color: '#475569', display: 'block', marginBottom: 4, marginTop: 14 }}>Mật khẩu</label>
          <input
            data-testid="inspector-password"
            value={password}
            onChange={e => setP(e.target.value)}
            type="password"
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && submit()}
            style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, outline: 'none' }}
          />

          {err && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef2f2', color: '#991b1b', borderRadius: 6, fontSize: 12.5 }}>{err}</div>}

          <button
            data-testid="inspector-login-btn"
            onClick={submit}
            disabled={loading}
            style={{
              width: '100%', marginTop: 20, height: 42,
              background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
              color: '#fff', border: 0, borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37,99,235,0.4)', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>

          <div style={{ marginTop: 16, fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            Demo · inspector / Inspector@123 · Mọi tra cứu được audit theo TT 46/2018
          </div>
        </div>

        <div style={{
          background: '#f1f5f9', padding: '10px 32px',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: '#64748b', borderTop: '1px solid #e2e8f0',
        }}>
          <span>🔒 TLS 1.3 · OAuth2</span>
          <span>Audit log đầy đủ</span>
        </div>
      </div>
    </div>
  );
};

// ─────────── Workspace ───────────
const PER_WS = 12;

const InspectorWorkspace: React.FC<{ info: InspectorInfo; onLogout: () => void }> = ({ info, onLogout }) => {
  const [rows, setRows] = useState<InspectorRecordListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [keyword, setKw] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [type, setType] = useState('');
  const [page, setPg] = useState(0);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<InspectorRecordDetailDto | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await inspectorApi.searchRecords({
        keyword, fromDate: from || undefined, toDate: to || undefined,
        treatmentType: type ? Number(type) : undefined,
        pageIndex: page + 1, pageSize: PER_WS,
      });
      setRows(r.items); setTotal(r.totalCount);
    } catch {
      setRows([]); setTotal(0);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PER_WS));
  const openDetail = async (r: InspectorRecordListItemDto) => {
    try {
      const d = await inspectorApi.getRecord(r.medicalRecordId);
      setDetail(d);
    } catch { /* ignore */ }
  };

  const downloadXml = async (r: InspectorRecordListItemDto) => {
    try {
      const blob = await inspectorApi.downloadXml(r.medicalRecordId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `HSBA_${r.medicalRecordCode}.xml`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
  };

  return (
    <div data-testid="inspector-workspace" style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      {/* Top bar */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff',
        padding: '14px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 24 }}>🛡️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>CỔNG GIÁM ĐỊNH BHXH</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              {info.fullName} · {info.bhxhCode ?? ''} · {info.province ?? ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontSize: 11, opacity: 0.85, textAlign: 'right' }}>
            <div>Phiên: {fmtHM(new Date())}</div>
            <div>BV Đa khoa Hưng Yên</div>
          </div>
          <button
            onClick={onLogout}
            data-testid="inspector-logout"
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
              color: '#fff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5,
            }}
          >Đăng xuất</button>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        {/* Search card */}
        <div style={{
          background: '#fff', borderRadius: 10, padding: 18, marginBottom: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <h3 style={{ margin: '0 0 12px', color: '#1e3a8a', fontSize: 14 }}>Tìm kiếm HSBA</h3>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              data-testid="ins-search-kw"
              value={keyword}
              onChange={e => setKw(e.target.value)}
              placeholder="Mã HSBA, tên BN, số thẻ BHYT…"
              style={{ width: 320, height: 36, padding: '0 12px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, outline: 'none' }}
            />
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150, height: 36, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }} />
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150, height: 36, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }} />
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: 140, height: 36, padding: '0 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13 }}>
              <option value="">Tất cả loại</option>
              <option value="1">BHYT</option>
              <option value="2">Viện phí</option>
              <option value="3">Dịch vụ</option>
              <option value="4">Khám SK</option>
            </select>
            <button
              onClick={() => { setPg(0); load(); }}
              data-testid="ins-search-btn"
              style={{
                background: '#2563eb', color: '#fff', border: 0, padding: '0 22px',
                height: 36, borderRadius: 6, fontWeight: 600, cursor: 'pointer',
              }}
            >Tìm</button>
          </div>
        </div>

        {/* Results card */}
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <h3 style={{ margin: 0, fontSize: 14, color: '#1e3a8a' }}>Danh sách HSBA ({total})</h3>
            <div style={{ fontSize: 11, color: '#64748b' }}>📋 Mọi thao tác xem / tải đều ghi nhật ký audit</div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead style={{ background: '#f8fafc' }}>
              <tr style={{ textAlign: 'left', color: '#475569' }}>
                <th style={{ padding: '10px 12px', fontWeight: 600 }}>Mã HSBA</th>
                <th style={{ padding: '10px 12px' }}>Tên BN</th>
                <th style={{ padding: '10px 12px' }}>BHYT</th>
                <th style={{ padding: '10px 12px' }}>Khoa</th>
                <th style={{ padding: '10px 12px' }}>Vào</th>
                <th style={{ padding: '10px 12px' }}>Ra</th>
                <th style={{ padding: '10px 12px' }}>Chẩn đoán</th>
                <th style={{ padding: '10px 12px' }}>Loại</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Tổng tiền</th>
                <th style={{ padding: '10px 12px' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Đang tải…</td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Không có HSBA</td></tr>
              )}
              {!loading && rows.map(r => (
                <tr key={r.medicalRecordId} style={{ borderTop: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#1e3a8a', fontWeight: 600 }}>{r.medicalRecordCode}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {r.patientName}
                    <div style={{ fontSize: 11, color: '#64748b' }}>—</div>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>
                    {r.insuranceNumber ?? <span style={{ background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>Không BHYT</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>{r.departmentName}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{fmtDMY(r.admissionDate)}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 11 }}>{r.dischargeDate ? fmtDMY(r.dischargeDate) : '—'}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12 }}>{r.diagnosis ?? '—'}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 3, fontSize: 10.5, fontWeight: 600 }}>{r.treatmentTypeName}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 600 }}>{fmtVND(r.totalAmount)}</td>
                  <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => openDetail(r)} style={{ background: 'transparent', border: 0, color: '#2563eb', fontSize: 12, cursor: 'pointer', marginRight: 8 }}>Xem</button>
                    <button onClick={() => downloadXml(r)} style={{ background: 'transparent', border: 0, color: '#2563eb', fontSize: 12, cursor: 'pointer' }}>Tải XML</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{
            padding: '10px 18px', borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 12, color: '#64748b',
          }}>
            <span>Trang {page + 1} / {totalPages} · {total} HSBA</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPg(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 10px', cursor: page === 0 ? 'not-allowed' : 'pointer' }}>‹</button>
              <button onClick={() => setPg(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ background: 'transparent', border: '1px solid #cbd5e1', borderRadius: 4, padding: '2px 10px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer' }}>›</button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {detail && <InspectorDetail r={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

const InspectorDetail: React.FC<{ r: InspectorRecordDetailDto; onClose: () => void }> = ({ r, onClose }) => (
  <div
    onClick={onClose}
    style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 999, display: 'grid', placeItems: 'center', padding: 24 }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{ background: '#fff', borderRadius: 10, width: 'min(900px, 100%)', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 30px 80px rgba(0,0,0,0.3)' }}
    >
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1e3a8a' }}>Chi tiết HSBA {r.medicalRecordCode}</div>
          <div style={{ fontSize: 11, color: '#64748b' }}>{r.patientName} · {r.departmentName}</div>
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 0, fontSize: 20, cursor: 'pointer' }}>×</button>
      </div>
      <div style={{ padding: 18 }}>
        <h4 style={{ margin: '0 0 10px', fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>Thông tin BN</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', fontSize: 12.5, marginBottom: 16 }}>
          <div><span style={{ color: '#64748b' }}>Tên BN: </span><b>{r.patientName}</b></div>
          <div><span style={{ color: '#64748b' }}>Sinh: </span>{fmtDMY(r.patientDob)} · {r.patientGender ?? '—'}</div>
          <div><span style={{ color: '#64748b' }}>BHYT: </span><span style={{ fontFamily: 'monospace' }}>{r.insuranceNumber ?? 'Không'}</span></div>
          <div><span style={{ color: '#64748b' }}>Khoa: </span>{r.departmentName}</div>
          <div><span style={{ color: '#64748b' }}>Vào: </span>{fmtDT(r.admissionDate)}</div>
          <div><span style={{ color: '#64748b' }}>Ra: </span>{r.dischargeDate ? fmtDT(r.dischargeDate) : '—'}</div>
          {r.address && <div style={{ gridColumn: '1 / 3' }}><span style={{ color: '#64748b' }}>Địa chỉ: </span>{r.address}</div>}
          {r.admissionDiagnosis && <div style={{ gridColumn: '1 / 3' }}><span style={{ color: '#64748b' }}>CĐ vào: </span>{r.admissionDiagnosis}</div>}
          {r.finalDiagnosis && <div style={{ gridColumn: '1 / 3' }}><span style={{ color: '#64748b' }}>CĐ ra: </span>{r.finalDiagnosis}</div>}
        </div>

        <h4 style={{ margin: '10px 0', fontSize: 12, fontFamily: 'monospace', textTransform: 'uppercase', color: '#64748b' }}>Tài chính</h4>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, marginBottom: 14 }}>
          <tbody>
            <tr style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: '6px 0' }}>Tổng tiền viện phí</td><td style={{ fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>{fmtVND(r.totalAmount)}</td></tr>
            <tr style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: '6px 0' }}>BHYT chi trả</td><td style={{ fontFamily: 'monospace', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>{fmtVND(r.bhytAmount)}</td></tr>
            <tr style={{ borderTop: '1px solid #e2e8f0' }}><td style={{ padding: '6px 0' }}>BN đồng chi trả</td><td style={{ fontFamily: 'monospace', textAlign: 'right' }}>{fmtVND(r.coPayAmount)}</td></tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Dịch vụ ({r.services.length})</h4>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#0f172a', lineHeight: 1.6, maxHeight: 180, overflow: 'auto' }}>
              {r.services.slice(0, 6).map((s, i) => <div key={i}>• {s.serviceName} · {fmtVND(s.totalAmount)}</div>)}
              {r.services.length > 6 && <span style={{ color: '#94a3b8' }}>… {r.services.length - 6} mục khác</span>}
            </div>
          </div>
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>Thuốc ({r.medicines.length})</h4>
            <div style={{ background: '#f8fafc', padding: 10, borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#0f172a', lineHeight: 1.6, maxHeight: 180, overflow: 'auto' }}>
              {r.medicines.slice(0, 6).map((m, i) => <div key={i}>• {m.medicineName} · {m.quantity} {m.concentration ?? ''}</div>)}
              {r.medicines.length > 6 && <span style={{ color: '#94a3b8' }}>… {r.medicines.length - 6} thuốc khác</span>}
            </div>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>Đóng</button>
        <button style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>
          <TermIcon name="download" size={12} /> Tải XML
        </button>
        <button style={{ background: '#2563eb', color: '#fff', border: 0, padding: '6px 14px', borderRadius: 6, cursor: 'pointer' }}>
          <TermIcon name="printer" size={12} /> In
        </button>
      </div>
    </div>
  </div>
);

export default InspectorPortal;
