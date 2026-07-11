import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { storage } from '../../services/storage.service';
import TermIcon from './Icon';

/**
 * IdleLockScreen (#383) — khóa màn hình sau N phút không tương tác.
 * Máy trạm bệnh viện thường để mở → chống người ngoài xem hồ sơ bệnh nhân.
 *
 * - Theo dõi mouse/keyboard/scroll/touch; idle >= timeout → phủ overlay khóa.
 * - Mở khóa bằng mật khẩu (POST /auth/verify-password) — KHÔNG đổi JWT (chỉ khóa UI).
 * - Sai mật khẩu MAX_ATTEMPTS lần → đăng xuất hoàn toàn.
 * - Trước khi khóa dispatch `IDLE_LOCK_IMMINENT` để form auto-save draft.
 * - Timeout configurable qua localStorage `his-idle-timeout-min` (mặc định 10, tối thiểu 1).
 */
const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
const DEFAULT_TIMEOUT_MIN = 10;
const WARN_BEFORE_MS = 15 * 1000;
const CHECK_INTERVAL_MS = 5 * 1000;
const MAX_ATTEMPTS = 3;

function resolveTimeoutMs(): number {
  const raw = storage.getRaw('his-idle-timeout-min');
  const min = raw ? parseInt(raw, 10) : NaN;
  return (Number.isFinite(min) && min >= 1 ? min : DEFAULT_TIMEOUT_MIN) * 60 * 1000;
}

const IdleLockScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const [locked, setLocked] = useState(false);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const lastActivityRef = useRef<number>(Date.now());
  const warnedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutMs = resolveTimeoutMs();

  const fullName = user?.fullName || user?.username || 'Người dùng';
  const initials =
    fullName.split(' ').filter(Boolean).slice(-2).map((x) => x[0]).join('').toUpperCase().slice(0, 2) || 'U';

  const doLogout = useCallback(() => {
    logout();
    window.location.href = '/login';
  }, [logout]);

  // Theo dõi hoạt động — chỉ reset khi CHƯA khóa (khóa rồi thì hoạt động không được reset timer).
  useEffect(() => {
    const onActivity = () => {
      if (!locked) {
        lastActivityRef.current = Date.now();
        warnedRef.current = false;
      }
    };
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, onActivity));
  }, [locked]);

  // Vòng kiểm tra idle.
  useEffect(() => {
    if (locked) return;
    const id = window.setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= timeoutMs) {
        window.dispatchEvent(new CustomEvent('IDLE_LOCK_IMMINENT'));
        setLocked(true);
      } else if (idle >= timeoutMs - WARN_BEFORE_MS && !warnedRef.current) {
        warnedRef.current = true;
        window.dispatchEvent(new CustomEvent('IDLE_LOCK_IMMINENT'));
      }
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [locked, timeoutMs]);

  // Focus ô mật khẩu khi vừa khóa.
  useEffect(() => {
    if (locked) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [locked]);

  const onUnlock = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!password || verifying) return;
      if (!user?.id) { doLogout(); return; }
      setVerifying(true);
      try {
        const ok = await authApi.verifyPassword(user.id, password);
        if (ok) {
          setLocked(false);
          setPassword('');
          setAttempts(0);
          warnedRef.current = false;
          lastActivityRef.current = Date.now();
        } else {
          const n = attempts + 1;
          setAttempts(n);
          setPassword('');
          if (n >= MAX_ATTEMPTS) {
            message.error('Sai mật khẩu 3 lần — đăng xuất để bảo vệ hồ sơ');
            doLogout();
          } else {
            message.error(`Mật khẩu không đúng (${n}/${MAX_ATTEMPTS})`);
            inputRef.current?.focus();
          }
        }
      } catch {
        message.error('Xác thực thất bại — kiểm tra kết nối');
      } finally {
        setVerifying(false);
      }
    },
    [password, verifying, user, attempts, doLogout],
  );

  if (!locked) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Màn hình khóa"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2147483000,
        background: 'var(--d-1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
    >
      <form
        onSubmit={onUnlock}
        style={{
          width: 340,
          maxWidth: '90vw',
          background: 'var(--d-2)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-4)',
          padding: '28px 24px',
          textAlign: 'center',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--a-cy-bg)',
            color: 'var(--a-cy)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 12px',
            fontWeight: 700,
            fontSize: 20,
          }}
        >
          {initials}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--t-2)', fontSize: 12, marginBottom: 4 }}>
          <TermIcon name="lock" size={13} /> Màn hình đã khóa
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t-0)', marginBottom: 16 }}>{fullName}</div>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          placeholder="Nhập mật khẩu để mở khóa"
          autoComplete="current-password"
          style={{
            width: '100%',
            height: 38,
            padding: '0 12px',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-2)',
            background: 'var(--d-0)',
            color: 'var(--t-0)',
            fontSize: 13,
            marginBottom: 12,
          }}
        />
        <button
          type="submit"
          disabled={verifying || !password}
          style={{
            width: '100%',
            height: 38,
            borderRadius: 'var(--r-2)',
            background: 'var(--a-cy)',
            color: '#fff',
            fontWeight: 600,
            fontSize: 13,
            opacity: verifying || !password ? 0.6 : 1,
            cursor: verifying || !password ? 'not-allowed' : 'pointer',
          }}
        >
          {verifying ? 'Đang xác thực…' : 'Mở khóa'}
        </button>
        <button
          type="button"
          onClick={doLogout}
          style={{
            marginTop: 10,
            width: '100%',
            height: 34,
            background: 'transparent',
            color: 'var(--t-2)',
            fontSize: 12,
          }}
        >
          Đăng nhập tài khoản khác
        </button>
      </form>
    </div>
  );
};

export default IdleLockScreen;
