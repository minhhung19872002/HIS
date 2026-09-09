import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import 'dayjs/locale/vi';

// Toàn bộ vỏ giao diện lấy thẳng của HIS — thứ tự nạp giữ y như `TerminalLayout.tsx`, vì các tệp
// sau ghi đè lên tệp trước.
//   terminal.css       biến màu gốc (--t-0, --a-cy…) + dải trái, thanh trên, dải trạng thái
//   terminal-antd.css  chỉnh Antd cho khớp vỏ
//   his-shell.css      khung `his-app` (lưới rail/topbar/main) + chế độ tối
//   ab-module.css      bộ `ab-*` mà 5 màn dùng để tạo hình; thiếu là vỡ bố cục hoàn toàn
import '@/components/layout/terminal/terminal.css';
import '@/components/layout/terminal/terminal-antd.css';
import '@/components/layout/terminal/his-shell.css';
import '@/components/layout/terminal/ab-module.css';

import { App } from './App';
import { AuthProvider } from './auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider locale={viVN}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
