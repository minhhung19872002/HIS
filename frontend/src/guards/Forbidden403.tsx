import React from 'react';
import { useNavigate } from 'react-router-dom';
import TermIcon from '../layouts/terminal/Icon';

/**
 * Forbidden403 (#377) — trang 403 khi user không đủ quyền vào route.
 * Dùng biến theme terminal (--*) nên tự đúng light/dark.
 */
const Forbidden403: React.FC<{ resource?: string }> = ({ resource }) => {
  const navigate = useNavigate();
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'var(--s-crit-bg)',
          color: 'var(--s-crit)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <TermIcon name="lock" size={28} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t-0)' }}>403 · Không đủ quyền</div>
      <div style={{ fontSize: 13, color: 'var(--t-2)', maxWidth: 420 }}>
        Bạn không có quyền truy cập{resource ? <> chức năng <b style={{ color: 'var(--t-1)' }}>{resource}</b></> : ' chức năng này'}.
        Vui lòng liên hệ quản trị viên nếu cần cấp quyền.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            height: 36,
            padding: '0 18px',
            borderRadius: 'var(--r-2)',
            border: '1px solid var(--line)',
            background: 'var(--d-2)',
            color: 'var(--t-1)',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          ← Quay lại
        </button>
        <button
          type="button"
          onClick={() => navigate('/v2/dashboard')}
          style={{
            height: 36,
            padding: '0 18px',
            borderRadius: 'var(--r-2)',
            background: 'var(--a-cy)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Về Dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden403;
