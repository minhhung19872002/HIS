import React from 'react';

// ─────────────────────────── Skeleton loading (#467 P1-6) ───────────────────────────
// Thay spinner bằng khung xám shimmer giữ đúng bố cục → giảm cảm giác chờ + tránh giật layout.
// CSS `.ab-skel` (ab-module.css) — token-based, tự flip dark-mode, tôn trọng prefers-reduced-motion.

/** Thanh skeleton đơn. width/height nhận số (px) hoặc chuỗi CSS. */
export const Skel: React.FC<{ w?: number | string; h?: number | string; style?: React.CSSProperties }> = ({
  w = '100%', h = 12, style,
}) => <span className="ab-skel" style={{ width: w, height: h, ...style }} aria-hidden />;

/** Skeleton dạng bảng độc lập (ngoài DataTable — DataTable đã có prop `loading` tự render). */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 5 }) => (
  <div className="ab-skel-table" aria-busy aria-label="Đang tải dữ liệu">
    {Array.from({ length: rows }, (_, r) => (
      <div key={r} className="ab-skel-tr">
        {Array.from({ length: cols }, (_, c) => (
          <Skel key={c} w={`${[92, 70, 84, 60, 76][c % 5]}%`} h={12} />
        ))}
      </div>
    ))}
  </div>
);

/** Skeleton form chi tiết (drawer/modal đang tải): cặp label + input. */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <div className="ab-skel-form" aria-busy aria-label="Đang tải dữ liệu">
    {Array.from({ length: fields }, (_, i) => (
      <div key={i} className="ab-skel-field">
        <Skel w={`${45 + (i % 3) * 12}%`} h={10} />
        <Skel w="100%" h={28} />
      </div>
    ))}
  </div>
);

/** Skeleton thẻ KPI/dashboard card. */
export const CardSkeleton: React.FC<{ cards?: number }> = ({ cards = 4 }) => (
  <div className="ab-skel-cards" aria-busy aria-label="Đang tải dữ liệu">
    {Array.from({ length: cards }, (_, i) => (
      <div key={i} className="ab-skel-card">
        <Skel w="55%" h={10} />
        <Skel w="40%" h={22} />
        <Skel w="70%" h={10} />
      </div>
    ))}
  </div>
);
