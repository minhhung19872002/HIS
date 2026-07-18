import React, { useRef, useEffect } from 'react';
import TermIcon from '../layout/terminal/Icon';

// ── HTTP error registry ────────────────────────────────────────────────────
type Tone = 'crit' | 'warn' | 'info';
interface ErrorDef { icon: string; title: string; desc: string; tone: Tone }

const REGISTRY: Record<number, ErrorDef> = {
  400: { icon: 'alert',    title: '400 · Yêu cầu không hợp lệ',    desc: 'Dữ liệu gửi lên không hợp lệ. Vui lòng kiểm tra lại.',               tone: 'warn' },
  401: { icon: 'lock',     title: '401 · Chưa xác thực',           desc: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',                  tone: 'warn' },
  403: { icon: 'shield',   title: '403 · Không đủ quyền',          desc: 'Bạn không có quyền truy cập chức năng này.',                          tone: 'crit' },
  404: { icon: 'search',   title: '404 · Không tìm thấy',          desc: 'Trang hoặc dữ liệu bạn tìm kiếm không tồn tại.',                      tone: 'info' },
  405: { icon: 'alert',    title: '405 · Phương thức không hợp lệ', desc: 'Thao tác này không được phép.',                                       tone: 'warn' },
  408: { icon: 'clock',    title: '408 · Yêu cầu hết thời gian',   desc: 'Máy chủ không phản hồi kịp thời. Vui lòng thử lại.',                  tone: 'warn' },
  409: { icon: 'alert',    title: '409 · Xung đột dữ liệu',        desc: 'Xung đột dữ liệu xảy ra. Tải lại trang để đồng bộ.',                  tone: 'warn' },
  410: { icon: 'archive',  title: '410 · Tài nguyên đã xóa',       desc: 'Nội dung này đã bị xóa vĩnh viễn.',                                   tone: 'info' },
  413: { icon: 'upload',   title: '413 · Tệp quá lớn',             desc: 'Kích thước tệp vượt quá giới hạn cho phép.',                          tone: 'warn' },
  415: { icon: 'file',     title: '415 · Định dạng không hỗ trợ',  desc: 'Định dạng tệp này không được hệ thống chấp nhận.',                    tone: 'warn' },
  429: { icon: 'alert',    title: '429 · Quá nhiều yêu cầu',       desc: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng chờ rồi thử lại.',          tone: 'warn' },
  500: { icon: 'alert',    title: '500 · Lỗi máy chủ',             desc: 'Đã xảy ra lỗi nội bộ. Đội kỹ thuật đã được thông báo.',               tone: 'crit' },
  502: { icon: 'cloud',    title: '502 · Lỗi cổng kết nối',        desc: 'Không thể kết nối đến máy chủ phía sau. Vui lòng thử lại sau.',       tone: 'warn' },
  503: { icon: 'settings', title: '503 · Hệ thống bảo trì',        desc: 'Hệ thống đang được bảo trì. Vui lòng quay lại sau ít phút.',          tone: 'info' },
  504: { icon: 'clock',    title: '504 · Kết nối hết thời gian',   desc: 'Máy chủ không phản hồi trong thời gian chờ. Thử lại sau vài phút.',   tone: 'warn' },
};

const FALLBACK: ErrorDef = {
  icon: 'alert', title: 'Đã xảy ra lỗi', desc: 'Vui lòng thử lại hoặc liên hệ quản trị viên.', tone: 'crit',
};

const TONE_TOKEN: Record<Tone, string> = {
  crit: 'var(--s-crit)',
  warn: 'var(--s-warn)',
  info: 'var(--a-cy)',
};

// ── Props ──────────────────────────────────────────────────────────────────
export interface HttpErrorProps {
  code?: number;
  title?: string;
  desc?: string;
  variant?: 'page' | 'inline';
  onBack?: () => void;
  onRetry?: () => void;
  showBack?: boolean;
  showHome?: boolean;
  className?: string;
}

// ── Component ──────────────────────────────────────────────────────────────
export const HttpError: React.FC<HttpErrorProps> = ({
  code,
  title: titleOverride,
  desc: descOverride,
  variant = 'page',
  onBack,
  onRetry,
  showBack = variant === 'page',
  showHome = variant === 'page',
  className,
}) => {
  const def = (code ? REGISTRY[code] : undefined) ?? FALLBACK;
  const title = titleOverride ?? def.title;
  const desc  = descOverride  ?? def.desc;
  const color = TONE_TOKEN[def.tone];
  const containerRef = useRef<HTMLDivElement>(null);

  // a11y: move focus to alert container on mount so screen readers announce immediately
  useEffect(() => {
    if (variant === 'page') { containerRef.current?.focus(); }
  }, [variant]);

  const handleBack = () => {
    if (onBack) { onBack(); return; }
    if (window.history.length > 1) { window.history.back(); }
    else { window.location.href = '/'; }
  };

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        className={className}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
          background: 'var(--d-2)', borderRadius: 'var(--r-2)', color: 'var(--t-1)' }}
      >
        <span style={{ color, flexShrink: 0 }}><TermIcon name={def.icon as Parameters<typeof TermIcon>[0]['name']} size={16} /></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-0)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--t-2)', marginTop: 2 }}>{desc}</div>
        </div>
        {onRetry && (
          <button type="button" className="ab-btn ghost sm" onClick={onRetry} style={{ flexShrink: 0 }}>
            <TermIcon name="refresh" size={12} /> Thử lại
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="alert"
      aria-live="polite"
      tabIndex={-1}
      className={className}
      style={{
        height: '100%',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 32,
        textAlign: 'center',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--d-2)',
          color,
          display: 'grid',
          placeItems: 'center',
          border: `2px solid ${color}`,
        }}
      >
        <TermIcon name={def.icon as Parameters<typeof TermIcon>[0]['name']} size={32} />
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t-0)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--t-2)', maxWidth: 460, lineHeight: 1.6 }}>{desc}</div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              height: 36, padding: '0 18px', borderRadius: 'var(--r-2)',
              border: '1px solid var(--line)', background: 'var(--d-2)',
              color: 'var(--t-1)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            <TermIcon name="refresh" size={12} /> Thử lại
          </button>
        )}
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            style={{
              height: 36, padding: '0 18px', borderRadius: 'var(--r-2)',
              border: '1px solid var(--line)', background: 'var(--d-2)',
              color: 'var(--t-1)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            ← Quay lại
          </button>
        )}
        {showHome && (
          <button
            type="button"
            onClick={() => { window.location.href = '/v2/dashboard'; }}
            style={{
              height: 36, padding: '0 18px', borderRadius: 'var(--r-2)',
              background: 'var(--a-cy)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
            }}
          >
            Về Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

// ── Convenience helpers ────────────────────────────────────────────────────
/** Returns the Vietnamese message for a given HTTP status (for toasts). */
export const httpErrorMessage = (status: number): string => {
  const def = REGISTRY[status] ?? FALLBACK;
  return def.desc;
};
