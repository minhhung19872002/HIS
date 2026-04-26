import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import TermIcon from '../layouts/terminal/Icon';
import { statisticsApi } from '../api/system';
import type { HospitalDashboardDto } from '../api/system';

type ReportGroup = {
  key: string;
  title: string;
  icon: string;
  items: { code: string; name: string; desc?: string }[];
};

const GROUPS: ReportGroup[] = [
  {
    key: 'finance',
    title: 'Tài chính / Doanh thu',
    icon: 'banknote',
    items: [
      { code: 'cashier',     name: 'Báo cáo thu ngân',          desc: 'Tiền mặt, thẻ, QR, ví — theo ca / ngày' },
      { code: 'revenue-day', name: 'Doanh thu ngày',             desc: 'Tổng hợp dịch vụ + thuốc + VTYT' },
      { code: 'revenue-dept', name: 'Doanh thu theo khoa',        desc: 'Hạch toán nội bộ' },
      { code: 'debt',         name: 'Công nợ BN',                desc: 'BN còn nợ, đã quá hạn TT' },
      { code: 'refund',       name: 'Hoàn tiền',                  desc: 'Lịch sử hoàn cộng dồn' },
      { code: 'einvoice',     name: 'Hóa đơn điện tử',           desc: 'Phát hành / hủy / lỗi' },
    ],
  },
  {
    key: 'bhyt',
    title: 'BHYT / Bảo hiểm',
    icon: 'shield',
    items: [
      { code: 'bhyt-c79a',     name: 'Mẫu C79a-HD',                 desc: 'Bảng kê chi phí KCB' },
      { code: 'bhyt-80a',      name: 'Mẫu 80a-BV',                  desc: 'Tổng hợp ngày điều trị' },
      { code: 'bhyt-treatment', name: 'Loại điều trị',              desc: 'Phân theo nhóm phí' },
      { code: 'bhyt-disease',   name: 'Top bệnh ICD',               desc: 'Top 20 bệnh thường gặp' },
      { code: 'bhyt-medicine',  name: 'Top thuốc BHYT',             desc: 'Top 20 thuốc cấp BHYT' },
      { code: 'bhyt-rejected',  name: 'Hồ sơ BHYT bị từ chối',     desc: 'Lý do reject — sửa lỗi' },
    ],
  },
  {
    key: 'pharmacy',
    title: 'Dược / Kho',
    icon: 'flask',
    items: [
      { code: 'stock',          name: 'Báo cáo tồn kho',           desc: 'Theo lô · ngưỡng ATM' },
      { code: 'expiry',         name: 'Cảnh báo hạn dùng',         desc: 'Sắp hết hạn 30/60/90 ngày' },
      { code: 'usage',          name: 'Sử dụng thuốc',             desc: 'Tiêu hao theo khoa' },
      { code: 'supplier',       name: 'Mua hàng theo NCC',         desc: 'Tổng giá trị nhập' },
      { code: 'dispensing',     name: 'Phát thuốc',                desc: 'OPD vs IPD breakdown' },
    ],
  },
  {
    key: 'clinical',
    title: 'Lâm sàng',
    icon: 'activity',
    items: [
      { code: 'admissions',  name: 'Nhập / xuất viện',           desc: 'Số liệu nhập, xuất, chuyển khoa' },
      { code: 'los',         name: 'Thời gian nằm viện',          desc: 'LOS trung bình theo khoa' },
      { code: 'mortality',   name: 'Tử vong',                     desc: 'Phân loại nguyên nhân' },
      { code: 'surgery',     name: 'Phẫu thuật',                  desc: 'Theo loại / phòng mổ' },
      { code: 'diagnosis',   name: 'Chẩn đoán hàng đầu',          desc: 'Top ICD-10 toàn viện' },
    ],
  },
  {
    key: 'cls',
    title: 'CLS (LIS · RIS)',
    icon: 'microscope',
    items: [
      { code: 'lab-volume',     name: 'Sản lượng XN',              desc: 'Theo loại + máy' },
      { code: 'lab-tat',        name: 'TAT XN',                     desc: 'Thời gian xử lý trung bình' },
      { code: 'lab-abnormal',   name: 'Tỷ lệ KQ bất thường',       desc: 'Cờ H/L/HH' },
      { code: 'imaging-volume', name: 'Sản lượng CĐHA',             desc: 'Theo modality' },
    ],
  },
  {
    key: 'reconciliation',
    title: 'Đối chiếu Level 6',
    icon: 'check-square',
    items: [
      { code: 'rec-supplier',  name: 'Mua hàng NCC',                desc: 'Đối chiếu hợp đồng' },
      { code: 'rec-revenue',   name: 'Doanh thu theo HSBA',        desc: 'Đối chiếu chi tiết' },
      { code: 'rec-deptcost',  name: 'Chi phí khoa vs phí',         desc: 'Margin per dept' },
      { code: 'rec-recordcost', name: 'Tổng chi phí HSBA',         desc: 'Per-record cost' },
      { code: 'rec-bhytstd',    name: 'Phí vs chuẩn BHXH',          desc: 'Đối chiếu chuẩn' },
      { code: 'rec-orderdoc',   name: 'BS chỉ định CLS',            desc: 'Phân tích kê đơn' },
      { code: 'rec-disp-bill',  name: 'Phát thuốc vs HĐ',           desc: 'Reconcile dispense' },
      { code: 'rec-disp-std',   name: 'Phát thuốc vs chuẩn',        desc: 'Reconcile vs std' },
    ],
  },
];

const ReportsV2: React.FC = () => {
  const navigate = useNavigate();
  const [activeGroup, setActive] = useState<string>('finance');
  const [dashboard, setDashboard] = useState<HospitalDashboardDto | null>(null);

  React.useEffect(() => {
    statisticsApi.getHospitalDashboard(dayjs().format('YYYY-MM-DD'))
      .then((r) => setDashboard(r.data))
      .catch(() => setDashboard(null));
  }, []);

  const group = GROUPS.find((g) => g.key === activeGroup) || GROUPS[0];

  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '240px 1fr 320px', gap: 16, height: '100%', minHeight: 0 }}>
      {/* Sidebar groups */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h"><span className="title">Nhóm báo cáo</span></div>
        <div className="panel-body" style={{ padding: 4 }}>
          {GROUPS.map((g) => (
            <div
              key={g.key}
              onClick={() => setActive(g.key)}
              style={{
                padding: '10px 12px', cursor: 'pointer', borderRadius: 6, marginBottom: 2,
                background: activeGroup === g.key ? 'var(--a-cy-bg)' : 'transparent',
                color: activeGroup === g.key ? 'var(--a-cy)' : 'var(--t-1)',
                fontWeight: activeGroup === g.key ? 500 : 400,
                fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <TermIcon name={g.icon} size={14} />
              <span>{g.title}</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t-3)' }}>{g.items.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reports list */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h">
          <span className="title">{group.title}</span>
          <span className="sub">· {group.items.length} báo cáo</span>
        </div>
        <div className="panel-body pad">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {group.items.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => navigate('/reports')}
                className="dashcard"
                style={{ padding: 14, cursor: 'pointer', textAlign: 'left' }}
              >
                <div className="dashcard-eyebrow"><TermIcon name="file-text" size={11} /><span>{r.code.toUpperCase()}</span></div>
                <div style={{ fontSize: 14, fontWeight: 500, marginTop: 6, color: 'var(--t-0)' }}>{r.name}</div>
                {r.desc && <div style={{ fontSize: 11, color: 'var(--t-2)', marginTop: 4, lineHeight: 1.45 }}>{r.desc}</div>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="panel" style={{ minHeight: 0 }}>
        <div className="panel-h"><span className="title">Hôm nay · {dayjs().format('DD/MM')}</span></div>
        <div className="panel-body pad">
          {!dashboard ? <div className="ph">Đang tải số liệu…</div> : (
            <div className="stack-sm">
              <Stat l="Khám ngoại trú" v={String(dashboard.outpatientCount ?? 0)} cy />
              <Stat l="Đang nội trú" v={String(dashboard.inpatientCount ?? 0)} />
              <Stat l="Cấp cứu 24h" v={String(dashboard.emergencyCount ?? 0)} crit />
              <Stat l="Phẫu thuật" v={String(dashboard.surgeryCount ?? 0)} />
              <Stat l="Tỷ lệ giường" v={`${Math.round(dashboard.bedOccupancyRate ?? 0)}%`} />
              <Stat l="Doanh thu (M₫)" v={String(Math.round((dashboard.totalRevenue ?? 0) / 1_000_000))} ok />
              <Stat l="Nhập / xuất" v={`${dashboard.admissionCount ?? 0} / ${dashboard.dischargeCount ?? 0}`} />
              <Stat l="LOS TB (ngày)" v={String(dashboard.averageStayDays ?? 0)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ l: string; v: string; warn?: boolean; cy?: boolean; ok?: boolean; crit?: boolean }> = ({ l, v, warn, cy, ok, crit }) => (
  <div style={{ padding: '8px 10px', background: 'var(--d-1)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: 12, color: 'var(--t-1)' }}>{l}</span>
    <span className="mono" style={{ fontSize: 18, fontWeight: 600, color: warn ? 'var(--s-warn)' : cy ? 'var(--a-cy)' : ok ? 'var(--s-ok)' : crit ? 'var(--s-crit)' : 'var(--t-0)' }}>{v}</span>
  </div>
);

export default ReportsV2;
