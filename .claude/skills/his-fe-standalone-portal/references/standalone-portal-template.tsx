// TEMPLATE — HIS standalone portal (login riêng, ngoài layout chính).
// Copy vào pages-v2/<Name>Portal.tsx. Route đăng ký NGOÀI ProtectedRoute/layout trong App.tsx.
import React, { useState, useEffect } from 'react';
import { xPortal } from '../api/nangcap24';        // object api riêng cho portal

const TOKEN_KEY = 'xportal_token';                  // key RIÊNG — KHÔNG đụng 'token' của app chính

const XPortalStandalone: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const login = async () => {
    if (!username || !password) { setErr('Nhập đủ tài khoản/mật khẩu'); return; } // core-validation-pattern
    setLoading(true); setErr(null);
    try {
      const r = await xPortal.login({ username, password });
      if (r.success && r.token) { localStorage.setItem(TOKEN_KEY, r.token); setToken(r.token); }
      else setErr(r.message || 'Đăng nhập thất bại');     // core-error-loading-state: báo lỗi rõ
    } catch { setErr('Lỗi kết nối'); }
    finally { setLoading(false); }
  };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  // Chưa login → login form standalone (KHÔNG sidebar/menu app chính)
  if (!token) {
    return (
      <div data-testid="xportal-login-card" style={{ maxWidth: 360, margin: '80px auto' }}>
        <h2>CỔNG [TÊN] — Đăng nhập</h2>
        <input data-testid="xportal-username" placeholder="Tài khoản"
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-testid="xportal-password" type="password" placeholder="Mật khẩu"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: 'red' }}>{err}</div>}
        <button data-testid="xportal-login-btn" disabled={loading} onClick={login}>
          {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>
      </div>
    );
  }

  // Đã login → nội dung portal (tự render, dùng token riêng cho mọi call)
  return <XPortalContent token={token} onLogout={logout} />;
};

const XPortalContent: React.FC<{ token: string; onLogout: () => void }> = ({ token, onLogout }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    xPortal.search({ token, pageSize: 50 })
      .then((b: any) => setRows(Array.isArray(b) ? b : b?.items ?? []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [token]);
  return (
    <div style={{ padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>CỔNG [TÊN]</h2><button onClick={onLogout}>Đăng xuất</button>
      </header>
      {loading ? <div>Đang tải…</div> : rows.length === 0 ? <div>Chưa có dữ liệu</div> : (
        <table>{/* render rows */}</table>
      )}
    </div>
  );
};

export default XPortalStandalone;

/* App.tsx — đăng ký NGOÀI layout/ProtectedRoute:
   const XPortalStandalone = lazy(() => import('./pages-v2/XPortal'));
   ...
   <Route path="/x-portal" element={<XPortalStandalone />} />   // không trong group ProtectedRoute
   KHÔNG thêm vào menu TerminalLayout. */
