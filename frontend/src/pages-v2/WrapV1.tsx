import React, { Suspense } from 'react';
import { Spin } from 'antd';

/**
 * Generic wrapper that renders an existing v1 (Antd) page inside the v2
 * Terminal shell. Lets every route work immediately. The Antd component tree
 * still receives theme via the top-level ConfigProvider, so styling is
 * unchanged. We only scope a light container so the page fills the terminal
 * content pane.
 *
 * As we incrementally hand-port pages to the terminal aesthetic we replace
 * `wrapV1(...)` with the native v2 page file.
 */
export const WrapV1: React.FC<{ element: React.ReactNode; title?: string }> = ({ element, title }) => (
  <div
    // Use a simple white surface so the Antd page looks like it sits on the
    // terminal content area. Full-height + scroll so long pages still scroll
    // inside the main region (the terminal shell already scrolls .content).
    style={{
      padding: 16,
      minHeight: '100%',
      background: 'var(--d-1)',
    }}
  >
    {title && (
      <div
        style={{
          marginBottom: 10,
          fontSize: 12,
          color: 'var(--t-3)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        v1 page mounted in v2 shell · {title}
      </div>
    )}
    <Suspense
      fallback={
        <div style={{ padding: 40, display: 'grid', placeItems: 'center' }}>
          <Spin size="large" />
        </div>
      }
    >
      {element}
    </Suspense>
  </div>
);

export default WrapV1;
