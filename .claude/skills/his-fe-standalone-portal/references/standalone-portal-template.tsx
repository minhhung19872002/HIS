// TEMPLATE — HIS standalone portal (own login, outside the main layout).
// Copy into pages-v2/<Name>Portal.tsx. Register the route OUTSIDE ProtectedRoute/layout in App.tsx.
import React, { useState, useEffect } from 'react';
import { xPortal } from '../api/nangcap24';        // a portal-specific api object

const TOKEN_KEY = 'xportal_token';                  // a SEPARATE key — do NOT touch the main app's 'token'

const XPortalStandalone: React.FC = () => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const login = async () => {
    if (!username || !password) { setErr('Enter both username and password'); return; } // core-validation-pattern
    setLoading(true); setErr(null);
    try {
      const r = await xPortal.login({ username, password });
      if (r.success && r.token) { localStorage.setItem(TOKEN_KEY, r.token); setToken(r.token); }
      else setErr(r.message || 'Login failed');     // core-error-loading-state: clear error
    } catch { setErr('Connection error'); }
    finally { setLoading(false); }
  };
  const logout = () => { localStorage.removeItem(TOKEN_KEY); setToken(null); };

  // Not logged in → a standalone login form (NO main-app sidebar/menu)
  if (!token) {
    return (
      <div data-testid="xportal-login-card" style={{ maxWidth: 360, margin: '80px auto' }}>
        <h2>[NAME] PORTAL — Login</h2>
        <input data-testid="xportal-username" placeholder="Username"
          value={username} onChange={(e) => setUsername(e.target.value)} />
        <input data-testid="xportal-password" type="password" placeholder="Password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <div style={{ color: 'red' }}>{err}</div>}
        <button data-testid="xportal-login-btn" disabled={loading} onClick={login}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </div>
    );
  }

  // Logged in → the portal content (self-rendered, uses its own token for every call)
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
        <h2>[NAME] PORTAL</h2><button onClick={onLogout}>Log out</button>
      </header>
      {loading ? <div>Loading…</div> : rows.length === 0 ? <div>No data yet</div> : (
        <table>{/* render rows */}</table>
      )}
    </div>
  );
};

export default XPortalStandalone;

/* App.tsx — register OUTSIDE the layout/ProtectedRoute:
   const XPortalStandalone = lazy(() => import('./pages-v2/XPortal'));
   ...
   <Route path="/x-portal" element={<XPortalStandalone />} />   // not inside the ProtectedRoute group
   Do NOT add it to the TerminalLayout menu. */
