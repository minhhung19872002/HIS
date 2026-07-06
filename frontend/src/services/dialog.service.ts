/**
 * Dialog service — thin wrapper over antd Modal.* confirm/info/warning.
 * Single home, #services-consolidation.
 *
 * Có sẵn default tiếng Việt (OK 'Đồng ý' / Cancel 'Hủy'); `confirmDelete` set nút
 * OK = danger + 'Xóa'. Non-React module (antd static Modal API).
 *
 * ADDITIVE: KHÔNG migrate ~39 call-site Modal.confirm hiện có.
 */

import { Modal } from 'antd';
import type { ModalFuncProps } from 'antd';
import type { ReactNode } from 'react';

export const dialog = {
  /** Hộp xác nhận chung — default OK 'Đồng ý' / Cancel 'Hủy' (ghi đè được qua opts). */
  confirm(opts: ModalFuncProps) {
    return Modal.confirm({ okText: 'Đồng ý', cancelText: 'Hủy', ...opts });
  },

  /** Xác nhận xóa — nút OK màu đỏ (danger), chữ 'Xóa'. */
  confirmDelete(opts: {
    title?: ReactNode;
    content?: ReactNode;
    onOk: () => void | Promise<void>;
  }) {
    return Modal.confirm({
      title: opts.title ?? 'Xác nhận xóa',
      content: opts.content,
      okText: 'Xóa',
      okType: 'danger',
      okButtonProps: { danger: true },
      cancelText: 'Hủy',
      onOk: opts.onOk,
    });
  },

  info(opts: ModalFuncProps) {
    return Modal.info({ okText: 'Đồng ý', ...opts });
  },

  warning(opts: ModalFuncProps) {
    return Modal.warning({ okText: 'Đồng ý', ...opts });
  },
};
