/**
 * Notification service — thin wrapper over antd static message/notification.
 * Single home, #services-consolidation.
 *
 * Non-React module (dùng antd static API). `notify` = toast ngắn (message.*);
 * `notifyBox` = hộp thông báo có tiêu đề + mô tả (notification.*).
 *
 * ADDITIVE: KHÔNG migrate ~214 call-site dùng message/notification hiện có.
 */

import { message, notification } from 'antd';
import type { ReactNode } from 'react';

export const notify = {
  success(content: ReactNode, duration?: number) {
    message.success(content, duration);
  },
  error(content: ReactNode, duration?: number) {
    message.error(content, duration);
  },
  warning(content: ReactNode, duration?: number) {
    message.warning(content, duration);
  },
  info(content: ReactNode, duration?: number) {
    message.info(content, duration);
  },
  loading(content: ReactNode, duration?: number) {
    message.loading(content, duration);
  },
};

/** Hộp thông báo góc màn hình (có tiêu đề + mô tả). Pass-through antd config. */
export const notifyBox = {
  success: (config: Parameters<typeof notification.success>[0]) => notification.success(config),
  error: (config: Parameters<typeof notification.error>[0]) => notification.error(config),
  warning: (config: Parameters<typeof notification.warning>[0]) => notification.warning(config),
  info: (config: Parameters<typeof notification.info>[0]) => notification.info(config),
};
