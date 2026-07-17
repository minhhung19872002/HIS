import React from 'react';
import { Link } from 'react-router-dom';

/**
 * #405: trang hiển thị khi route thuộc module thương mại CHƯA bật trong gói triển khai.
 * Khác 403 (thiếu quyền) — đây là packaging: kèm hướng dẫn nâng cấp gói.
 */
const ModuleNotEnabled: React.FC<{ resource?: string }> = ({ resource }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', gap: 12, textAlign: 'center', padding: 24,
  }}>
    <div style={{ fontSize: 40 }}>📦</div>
    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t-0)' }}>
      Module chưa kích hoạt
    </div>
    <div style={{ fontSize: 13, color: 'var(--t-2)', maxWidth: 440 }}>
      {resource ? <>Trang <b>{resource}</b> thuộc</> : 'Trang này thuộc'} module chưa có trong gói
      triển khai hiện tại. Liên hệ quản trị viên hoặc nhà cung cấp để nâng cấp gói
      (Gói Phòng khám → Gói Bệnh viện / bật module mở rộng).
    </div>
    <Link to="/v2/dashboard" style={{ color: 'var(--a-cy)', fontSize: 13 }}>← Về Tổng quan</Link>
  </div>
);

export default ModuleNotEnabled;
