import React, { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HOSPITAL_NAME } from '../constants/hospital';
import './ModuleIndex.css';

type Card = {
  href: string;
  tag: string;
  name: string;
  desc: string;
  hot?: number;
  variant?: 'er' | 'or' | 'lab' | 'admin';
  icon: React.ReactElement;
};

type Section = {
  title: string;
  cards: Card[];
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const Icons = {
  dashboard: (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  reception: (
    <svg {...iconProps}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  opd: (
    <svg {...iconProps}>
      <path d="M4 3v5a4 4 0 0 0 8 0V3M8 13v3a4 4 0 0 0 8 0v-1" />
      <circle cx="18" cy="10" r="2" />
    </svg>
  ),
  er: (
    <svg {...iconProps}>
      <path d="M3 7h10v10H3zM13 10h5l3 4v3h-8" />
      <circle cx="7" cy="17" r="2" />
      <circle cx="17" cy="17" r="2" />
      <path d="M8 10v3M6.5 11.5h3" />
    </svg>
  ),
  patients: (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),
  emr: (
    <svg {...iconProps}>
      <path d="M4 19a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v2" />
      <path d="m2 13 1.2 6.4A2 2 0 0 0 5.2 21h13.6a2 2 0 0 0 2-1.6L22 13H2z" />
    </svg>
  ),
  ward: (
    <svg {...iconProps}>
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20" />
      <circle cx="7" cy="12" r="2" />
    </svg>
  ),
  or: (
    <svg {...iconProps}>
      <path d="m14 4 6 6-9 9-4-1-1-4 8-10z" />
      <path d="m11 8 5 5" />
    </svg>
  ),
  lab: (
    <svg {...iconProps}>
      <path d="M10 2v7.5L4.5 18A2 2 0 0 0 6 21h12a2 2 0 0 0 1.5-3L14 9.5V2" />
      <path d="M9 2h6M7 14h10" />
    </svg>
  ),
  ris: (
    <svg {...iconProps}>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M7 12h10" />
    </svg>
  ),
  pharmacy: (
    <svg {...iconProps}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  ),
  inventory: (
    <svg {...iconProps}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  ),
  billing: (
    <svg {...iconProps}>
      <path d="M4 2v20l2-2 2 2 2-2 2 2 2-2 2 2 2-2 2 2V2l-2 2-2-2-2 2-2-2-2 2-2-2-2 2-2-2Z" />
      <path d="M8 7h8M8 11h8" />
    </svg>
  ),
  schedule: (
    <svg {...iconProps}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  reports: (
    <svg {...iconProps}>
      <path d="M3 3v18h18" />
      <path d="m7 14 4-4 3 3 5-6" />
    </svg>
  ),
  admin: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
};

const SECTIONS: Section[] = [
  {
    title: 'Tiếp nhận · Lâm sàng',
    cards: [
      { href: '/v2/dashboard', tag: '01', name: 'Tổng quan', desc: 'KPI ngày · Lưu lượng · Cảnh báo', icon: Icons.dashboard },
      { href: '/v2/reception', tag: '02', name: 'Tiếp đón · Check-in', desc: 'Đăng ký · BHYT · Phát số', icon: Icons.reception },
      { href: '/v2/opd', tag: '03', name: 'Khám bệnh (OPD)', desc: 'Phòng khám · Kê đơn · Chỉ định', hot: 8, icon: Icons.opd },
      { href: '/v2/emergency-disaster', tag: '04', name: 'Cấp cứu · Triage', desc: 'ESI 1–5 · Hồi sức · Theo dõi', hot: 6, variant: 'er', icon: Icons.er },
    ],
  },
  {
    title: 'Hồ sơ bệnh nhân',
    cards: [
      { href: '/v2/reception', tag: '05', name: 'Danh sách · Tìm kiếm', desc: 'BN nội/ngoại trú · Lịch sử', icon: Icons.patients },
      { href: '/v2/emr', tag: '06', name: 'Bệnh án điện tử (EMR)', desc: 'SOAP · Vitals · Thuốc · Diễn biến', icon: Icons.emr },
      { href: '/v2/ipd', tag: '07', name: 'Nội trú · Bed map', desc: '4 khoa · 34 giường · ICU', icon: Icons.ward },
      { href: '/v2/surgery', tag: '08', name: 'Phòng mổ · Lịch OR', desc: '4 phòng · Gantt · Pre-op', variant: 'or', icon: Icons.or },
    ],
  },
  {
    title: 'Cận lâm sàng · Dược',
    cards: [
      { href: '/v2/lab', tag: '09', name: 'Xét nghiệm (LIS)', desc: 'Worklist · Máy PT · Kết quả', hot: 3, variant: 'lab', icon: Icons.lab },
      { href: '/v2/radiology', tag: '10', name: 'Chẩn đoán hình ảnh', desc: 'RIS · PACS · CT/MRI/US/CR', icon: Icons.ris },
      { href: '/v2/pharmacy', tag: '11', name: 'Dược · Kê đơn', desc: 'Rx pending · Cấp phát · TT52', icon: Icons.pharmacy },
      { href: '/v2/medical-supply', tag: '12', name: 'Kho thuốc · Vật tư', desc: 'Tồn · Hạn dùng · Đặt hàng', icon: Icons.inventory },
    ],
  },
  {
    title: 'Tài chính · Quản trị',
    cards: [
      { href: '/v2/billing', tag: '13', name: 'Viện phí · BHYT', desc: 'Hóa đơn · Giám định · Thu ngân', hot: 3, icon: Icons.billing },
      { href: '/v2/hr', tag: '14', name: 'Lịch trực · Nhân sự', desc: 'Rota tuần · Ca trực · Phân công', icon: Icons.schedule },
      { href: '/v2/reports', tag: '15', name: 'Báo cáo · Dashboard KPI', desc: 'Bộ Y tế · Quản trị · Khoa', icon: Icons.reports },
      { href: '/v2/admin', tag: '16', name: 'Hệ thống · Quản trị', desc: 'Người dùng · Vai trò · Cấu hình', variant: 'admin', icon: Icons.admin },
    ],
  },
];

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function formatToday(d: Date): string {
  const wd = WEEKDAYS[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${wd}, ${dd}/${mm}/${d.getFullYear()}`;
}

function currentShift(d: Date): string {
  const h = d.getHours();
  if (h >= 7 && h < 15) return 'Ca sáng · 07:00 → 15:00';
  if (h >= 15 && h < 23) return 'Ca chiều · 15:00 → 23:00';
  return 'Ca đêm · 23:00 → 07:00';
}

export default function ModuleIndex() {
  const { user } = useAuth();
  const fullName = user?.fullName || user?.username || 'Người dùng';

  const meta = useMemo(() => {
    const now = new Date();
    return { date: formatToday(now), shift: currentShift(now) };
  }, []);

  return (
    <div className="idx-page">
      <div className="idx-wrap">
        {/* Header */}
        <div className="idx-head">
          <div className="idx-mark">HIS</div>
          <div style={{ minWidth: 0 }}>
            <div className="idx-title">HIS Terminal — {HOSPITAL_NAME}</div>
            <div className="idx-sub">
              v4.2.1 · Hệ thống Thông tin Y tế tích hợp · Tuyến tỉnh Hạng I
            </div>
          </div>
          <div className="idx-meta">
            <div>Hôm nay · <b>{meta.date}</b></div>
            <div>{meta.shift}</div>
            <div>Phiên: <b>{fullName}</b></div>
          </div>
        </div>

        {/* Intro */}
        <div className="idx-intro">
          <div className="badge">ℹ</div>
          <div>
            <b style={{ color: '#0f172a' }}>Chỉ mục các mô-đun.</b> Mỗi thẻ mở một
            mô-đun độc lập trong giao diện chung (sidebar trái + thanh lệnh trên).
            Hệ thống dùng context bệnh nhân chung — chọn BN ở một module sẽ ghim
            trên thanh ticker khi sang module khác. Dữ liệu demo đồng bộ qua{' '}
            <code>his-data.js</code>.
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map((section) => (
          <Fragment key={section.title}>
            <div className="idx-sec-title">{section.title}</div>
            <div className="idx-grid">
              {section.cards.map((card) => (
                <Link
                  key={card.tag}
                  to={card.href}
                  className={`idx-card${card.variant ? ' ' + card.variant : ''}`}
                >
                  <div className="top">
                    <div className="ic">{card.icon}</div>
                    {card.hot ? <div className="hot">{card.hot}</div> : null}
                  </div>
                  <div className="tag">{card.tag}</div>
                  <div className="nm">{card.name}</div>
                  <div className="ds">{card.desc}</div>
                </Link>
              ))}
            </div>
          </Fragment>
        ))}

        {/* Footer */}
        <div className="idx-footer">
          <div>© 2026 · HIS Terminal v4.2.1 · {HOSPITAL_NAME}</div>
          <div>BYT-HIS-CERT-2024/1847 · ICD-10 · HL7 FHIR R4 · DICOM 3.0</div>
        </div>
      </div>
    </div>
  );
}
