import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import 'dayjs/locale/vi';

// Bộ `_v2kit` mà 5 màn dùng được tạo hình bằng các lớp `ab-*`. Thiếu tệp này thì màn vẫn chạy
// nhưng vỡ bố cục hoàn toàn — bảng mất viền, thẻ chỉ số dính vào nhau.
import '@/components/layout/terminal/ab-module.css';

import { App } from './App';
import { AuthProvider } from './auth';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{ token: { colorPrimary: '#0f766e', borderRadius: 8 } }}
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
