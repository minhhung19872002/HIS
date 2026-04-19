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
export const WrapV1: React.FC<{ element: React.ReactNode; title?: string }> = ({ element }) => (
  <div
    // Full-height container so the Antd page fills the terminal content pane
    // and keeps its own scroll. We intentionally don't add any chrome here
    // because the v2 shell already provides the command bar + rail + subnav.
    style={{ minHeight: '100%', background: 'var(--d-1)' }}
  >
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
